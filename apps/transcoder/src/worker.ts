import { Worker, Job } from 'bullmq';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { VideoJob } from './types';
import { downloadFromS3, uploadDirectoryToS3 } from './s3.service';
import { transcode } from './transcoder';
import { onProgress, clearProgress } from './progress';
interface VideoDoc {
  _id: string;
  status: string;
  masterPlaylistUrl?: string;
  updatedAt?: Date;
}

function videosCollection() {
  return mongoose.connection.collection<VideoDoc>('videos');
}

async function connectMongo() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.info('[worker] MongoDB connected');
  }
}

async function markCompleted(videoId: string, masterPlaylistUrl: string) {
  await videosCollection().updateOne(
    { _id: videoId },
    { $set: { status: 'completed', masterPlaylistUrl, updatedAt: new Date() } }
  );
  console.info(`[${videoId}] DB updated — status: completed, masterPlaylistUrl set`);
}

async function markFailed(videoId: string, reason: string) {
  await videosCollection().updateOne(
    { _id: videoId },
    { $set: { status: 'failed', updatedAt: new Date() } }
  );
  console.error(`[${videoId}] DB updated — status: failed. Reason: ${reason}`);
}
const REDIS_CONNECTION = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379'),
};

const worker = new Worker<VideoJob>(
  'video-transcode',
  async (job: Job<VideoJob>) => {
    await connectMongo();

    console.log('[worker] Initialising job...');
    const { videoId, s3Key, bucket } = job.data;
    console.log(`[worker] Picked job:`, job.data);
    const tmpDir = path.join(os.tmpdir(), `transcode-${videoId}`);
    const inputPath = path.join(tmpDir, 'input.mp4');
    const outputDir = path.join(tmpDir, 'out');
    console.log(`[worker] Temp dir: ${tmpDir}`);

    try {
      await fs.mkdir(tmpDir, { recursive: true });
      console.info(`[${videoId}] Downloading from S3...`);
      await job.updateProgress(5);
      await downloadFromS3(bucket, s3Key, inputPath);

      console.info(`[${videoId}] Starting FFmpeg...`);
      await job.updateProgress(10);

      onProgress(videoId, (progress) => {
        job.updateProgress(10 + Math.floor(progress.percentage * 0.8));
      });

      const result = await transcode({ videoId, inputPath, outputDir });

      clearProgress(videoId);

      console.info(`[${videoId}] Uploading HLS output...`);
      await job.updateProgress(90);

      const processedBucket = process.env.S3_PROCESSED_BUCKET!;
      const s3OutputPrefix = `processed/${videoId}`;

      await uploadDirectoryToS3(outputDir, processedBucket, s3OutputPrefix);

      await job.updateProgress(100);

      const masterPlaylistUrl = `https://${process.env.CLOUDFRONT_DOMAIN}/${s3OutputPrefix}/master.m3u8`;
      await markCompleted(videoId, masterPlaylistUrl);

      console.info(`[${videoId}] Done. Resolutions: ${result.resolutions.join(', ')}`);

      return {
        videoId,
        masterPlaylistUrl,
        resolutions: result.resolutions,
      };
    } catch (err: any) {
      await markFailed(videoId, err?.message ?? 'unknown error');
      throw err;
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
      console.info(`[${videoId}] Tmp cleaned up`);
    }
  },
  {
    connection: REDIS_CONNECTION,
    concurrency: 1,
  }
);

worker.on('completed', (job) => {
  console.info(`Job completed: ${job.id}`);
});

worker.on('failed', (job, err) => {
  console.error(`Job failed: ${job?.id}`, err.message);
});

console.info('Transcoder worker started');
