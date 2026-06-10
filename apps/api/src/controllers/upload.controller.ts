import { Request, Response } from "express";
import PresignedUrlRequestSchema from '../validators/zod.validator';
import { asyncHandler, ApiError, ApiResponse } from 'node-utils-kit';
import { generatePresignedUploadUrl, generatePresignedDownloadUrl, getS3ObjectContent, verifyObjectExists } from '../services/s3.service';
import { createVideoRecord, getVideoById, listRecentVideos, toVideoMetadata, deleteVideoRecord } from '../services/video.service';
import { env } from '../env';

export const requestPresignedUrl = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = PresignedUrlRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, 'Invalid request data');
    }
    const { fileName, mimeType, sizeBytes } = parsed.data;
    const presigned = await generatePresignedUploadUrl({
      fileName,
      mimeType,
      sizeBytes,
    });
    await createVideoRecord({
      videoId: presigned.videoId,
      s3Key: presigned.s3Key, 
      bucket: env.S3_RAW_BUCKET,
      originalName: fileName,
      mimeType,
      sizeBytes,
    });
    return res.status(201).json(
      new ApiResponse(201, presigned, 'Upload URL generated')
    );
  }
);
export const getVideoStatus = asyncHandler(
  async (req: Request<{ videoId: string }>, res: Response) => {
    const { videoId } = req.params;
    const video = await getVideoById(videoId);
    if (!video) {
      throw new ApiError(404, 'Video not found');
    }
    return res.json(
      new ApiResponse(200, toVideoMetadata(video), 'Video fetched')
    );
  }
);

export const listVideos = asyncHandler(
  async (_req: Request, res: Response) => {
    const videos = await listRecentVideos();
    return res.json(
      new ApiResponse(200, videos.map(toVideoMetadata), 'Videos fetched')
    );
  }
);

export const deleteVideo = asyncHandler(
  async (req: Request<{ videoId: string }>, res: Response) => {
    const { videoId } = req.params;
    const deleted = await deleteVideoRecord(videoId);
    if (!deleted) {
      throw new ApiError(404, 'Video not found');
    }
    return res.json(
      new ApiResponse(200, null, 'Video deleted successfully')
    );
  }
);

export const getVideoDownloadUrl = asyncHandler(
  async (req: Request<{ videoId: string }>, res: Response) => {
    const { videoId } = req.params;
    const { resolution } = req.query as { resolution?: string };

    const video = await getVideoById(videoId);
    if (!video) {
      throw new ApiError(404, 'Video not found');
    }

    const isHls = video.jobType === 'transcode' || !!video.masterPlaylistUrl;
    const candidates: Array<{ bucket: string; key: string }> = [];

    // ── 1. HLS: try per-resolution MP4 (modern workers write video.mp4) ──────
    if (isHls) {
      let folder = '0'; // folder 0 = highest quality by convention

      if (resolution && resolution.toLowerCase() !== 'auto') {
        try {
          const masterKey = `processed/${videoId}/master.m3u8`;
          const masterContent = await getS3ObjectContent(env.S3_PROCESSED_BUCKET, masterKey);
          const lines = masterContent.split('\n');
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('RESOLUTION=')) {
              const match = line.match(/RESOLUTION=\d+x(\d+)/);
              if (match && resolution.toLowerCase().includes(match[1])) {
                const nextLine = lines[i + 1]?.trim();
                if (nextLine) {
                  const parsedFolder = nextLine.split('/')[0];
                  if (parsedFolder) { folder = parsedFolder; break; }
                }
              }
            }
          }
        } catch (err) {
          console.warn(`[Download] Failed to parse master.m3u8, using folder 0:`, err);
        }
      }

      // Try the modern processed MP4 path first
      candidates.push({ bucket: env.S3_PROCESSED_BUCKET, key: `processed/${videoId}/${folder}/video.mp4` });
    }

    // ── 2. Non-HLS: outputUrl-derived key ────────────────────────────────────
    if (!isHls && video.outputUrl) {
      const idx = video.outputUrl.indexOf('processed/');
      let key = '';
      if (idx !== -1) {
        key = video.outputUrl.substring(idx);
      } else {
        try { key = new URL(video.outputUrl).pathname.substring(1); } catch { key = video.outputUrl; }
      }
      if (key) candidates.push({ bucket: env.S3_PROCESSED_BUCKET, key });
    }

    // ── 3. Fallback: raw original upload (always exists right after upload) ──
    if (video.s3Key) {
      candidates.push({ bucket: env.S3_RAW_BUCKET, key: video.s3Key });
    }

    if (candidates.length === 0) {
      throw new ApiError(400, 'This video has no downloadable file.');
    }

    // Walk candidates and use the first one that exists on S3
    let chosenBucket = '';
    let chosenKey = '';
    for (const { bucket, key } of candidates) {
      const exists = await verifyObjectExists(bucket, key);
      if (exists) { chosenBucket = bucket; chosenKey = key; break; }
    }

    if (!chosenKey) {
      throw new ApiError(404, 'No downloadable file found. The video may still be processing or was stored in an older format.');
    }

    const downloadUrl = await generatePresignedDownloadUrl(
      chosenBucket,
      chosenKey,
      video.originalName || 'video'
    );

    return res.json(
      new ApiResponse(200, { downloadUrl }, 'Download URL generated')
    );
  }
);
