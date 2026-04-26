import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { emitProgress } from './progress';
import dotenv from 'dotenv';
import { number } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const FFMPEG_PATH = process.env.FFMPEG_PATH || '/usr/bin/ffmpeg';
const FFPROBE_PATH = process.env.FFPROBE_PATH || '/usr/bin/ffprobe';

try {
  execSync(`${FFMPEG_PATH} -version`, { stdio: 'ignore' });
  execSync(`${FFPROBE_PATH} -version`, { stdio: 'ignore' });
} catch {
  throw new Error(
    `[transcoder] FFmpeg or FFprobe not found!\n  ffmpeg: ${FFMPEG_PATH}\n  ffprobe: ${FFPROBE_PATH}\n  Set FFMPEG_PATH / FFPROBE_PATH env vars if they are in a different location.`
  );
}

ffmpeg.setFfmpegPath(FFMPEG_PATH);
ffmpeg.setFfprobePath(FFPROBE_PATH);

export interface TranscodeOptions {
  videoId: string;
  inputPath: string;
  outputDir: string;
}

export interface TranscodeResult {
  masterPlaylistPath: string;
  resolutions: string[];
  durationMs: number;
}

export async function getVideoDuration(inputPath: string): Promise<number> {
  const { duration } = await probeVideo(inputPath);
  return duration;
}

interface VideoProbeResult {
  duration: number;
  width: number;
  height: number;
}
async function probeVideo(inputPath: string): Promise<VideoProbeResult> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);
      const stream = metadata.streams.find((s) => s.codec_type === 'video');
      if (!stream?.width || !stream?.height) {
        throw new Error(
          `[probeVideo] No valid video stream found in: ${inputPath}`
        );
      }
      resolve({
        duration: metadata.format.duration ?? 0,
        width: stream.width,
        height: stream.height,
      });
    });
  });
}
interface Resolution {
  name: string;
  width: number;
  height: number;
  videoBitrate: string;
  audioBitrate: string;
}

const RESOLUTION_LADDER: Resolution[] = [
  { name: '1080p', width: 1920, height: 1080, videoBitrate: '5000k', audioBitrate: '192k' },
  { name: '720p', width: 1280, height: 720, videoBitrate: '2800k', audioBitrate: '128k' },
  { name: '360p', width: 640, height: 360, videoBitrate: '800k', audioBitrate: '96k' },
];

export async function transcode(options: TranscodeOptions): Promise<TranscodeResult> {
  const { videoId, inputPath, outputDir } = options;

  await fs.mkdir(outputDir, { recursive: true });
  const { duration: totalDuration, width, height } = await probeVideo(inputPath);
  const inputRes = { width, height };
  const targetResolutions = RESOLUTION_LADDER.filter(
    (r) => r.height <= inputRes.height
  );

  if (targetResolutions.length === 0) {
    targetResolutions.push(RESOLUTION_LADDER[RESOLUTION_LADDER.length - 1]);
  }
  console.info(
    `Transcoding ${videoId}: ${inputRes.width}x${inputRes.height} → ` +
    targetResolutions.map((r) => r.name).join(', ')
  );

  const splitCount = targetResolutions.length;
  const splitLabels = targetResolutions.map((_, i) => `[v${i + 1}]`).join('');
  const scaleFilters = targetResolutions
    .map((r, i) => `[v${i + 1}]scale=${r.width}:${r.height}[v${i + 1}out]`)
    .join('; ');

  const filterComplex = `[0:v]split=${splitCount}${splitLabels}; ${scaleFilters}`;

  return new Promise((resolve, reject) => {
    const jobStart = Date.now();

    let command = ffmpeg(inputPath).outputOptions([
      '-filter_complex', filterComplex,
    ]);

    const MAX_FFMPEG_THREADS = 1;
    targetResolutions.forEach((r, i) => {
      command = command
        .outputOptions([
          `-map [v${i + 1}out]`,
          `-map 0:a`,
          `-c:v:${i} libx264`,
          `-preset veryfast`,           
          `-threads ${MAX_FFMPEG_THREADS}`,
          `-b:v:${i} ${r.videoBitrate}`,
          `-c:a:${i} aac`,
          `-b:a:${i} ${r.audioBitrate}`,
        ]);
    });

    const varStreamMap = targetResolutions
      .map((_, i) => `v:${i},a:${i}`)
      .join(' ');

    const masterPlaylistPath = path.join(outputDir, 'master.m3u8');

    command
      .format('hls')
      .outputOptions([
        `-var_stream_map`, varStreamMap,
        `-master_pl_name`, 'master.m3u8',
        `-hls_time`, '6',
        `-hls_list_size`, '0',
        `-hls_segment_filename`, `${outputDir}/%v/seg_%03d.ts`,
      ])
      .output(`${outputDir}/%v/index.m3u8`)
      .on('progress', (progress) => {
        const currentTime = progress.timemark
          ? timeToSeconds(progress.timemark)
          : 0;
        const percentage =
          totalDuration > 0
            ? Math.min((currentTime / totalDuration) * 100, 100)
            : progress.percent ?? 0;

        emitProgress({ videoId, percentage, currentTime, totalDuration });
      })
      .on('end', () => {
        const durationMs = Date.now() - jobStart;
        console.info(
          `[transcoder] ${videoId} completed in ${(durationMs / 1000).toFixed(1)}s | ` +
          `resolutions: ${targetResolutions.map((r) => r.name).join(', ')}`
        );

        resolve({
          masterPlaylistPath,
          resolutions: targetResolutions.map((r) => r.name),
          durationMs,
        });
      })
      .on('error', (err) => {
        console.error(`FFmpeg error for ${videoId}:`, err);
        reject(err);
      })
      .run();
  });
}

function timeToSeconds(timemark: string): number {
  const parts = timemark.split(':').map(parseFloat);
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}
