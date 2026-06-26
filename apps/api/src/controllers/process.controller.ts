import { Request, Response } from 'express';
import { asyncHandler, ApiError, ApiResponse } from 'node-utils-kit';
import { QueueEvents } from 'bullmq';
import { JobType, videoQueue } from '../queues/video.queue';
import { createVideoRecord, getVideoById, updateVideoStatus } from '../services/video.service';
import { env } from '../env';
import { VideoStatus } from '../types/index';
import { v4 as uuidv4 } from 'uuid';

function mapJobTypeToLibraryType(jobType: JobType): string {
  if (jobType === 'extract-audio') return 'audio';
  if (jobType === 'download-url') return 'download';
  return jobType;
}

async function enqueueProcessJob(
  jobType: JobType,
  payload: Parameters<typeof videoQueue.add>[1]
): Promise<void> {
  await videoQueue.add(jobType, payload);
  const libType = mapJobTypeToLibraryType(jobType);
  await updateVideoStatus(payload.videoId, VideoStatus.QUEUED, undefined, libType);
}
export const transcodeVideo = asyncHandler(async (req: Request, res: Response) => {
  const { videoId, resolution } = req.body;
  if (!videoId) throw new ApiError(400, 'videoId is required');

  const video = await getVideoById(videoId);
  if (!video) throw new ApiError(404, 'Video not found');

  await enqueueProcessJob('transcode', {
    videoId,
    s3Key: video.s3Key,
    bucket: env.S3_RAW_BUCKET,
    jobType: 'transcode',
    resolution,
  });

  return res.status(202).json(
    new ApiResponse(202, { videoId, jobType: 'transcode', resolution }, 'Transcode job queued')
  );
});

export const compressVideo = asyncHandler(async (req: Request, res: Response) => {
  const { videoId, targetSizeMB, upscale } = req.body;
  if (!videoId) throw new ApiError(400, 'videoId is required');
  if (!targetSizeMB || targetSizeMB <= 0) throw new ApiError(400, 'targetSizeMB must be a positive number');

  const video = await getVideoById(videoId);
  if (!video) throw new ApiError(404, 'Video not found');

  await enqueueProcessJob('compress', {
    videoId,
    s3Key: video.s3Key,
    bucket: env.S3_RAW_BUCKET,
    jobType: 'compress',
    targetSizeMB: Number(targetSizeMB),
    upscale: Boolean(upscale),
  });

  return res.status(202).json(
    new ApiResponse(202, { videoId, jobType: 'compress', targetSizeMB, upscale: Boolean(upscale) }, 'Compress job queued')
  );
});
export const convertVideo = asyncHandler(async (req: Request, res: Response) => {
  const { videoId, outputFormat } = req.body;
  if (!videoId) throw new ApiError(400, 'videoId is required');

  const allowedFormats = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
  if (!outputFormat || !allowedFormats.includes(outputFormat)) {
    throw new ApiError(400, `outputFormat must be one of: ${allowedFormats.join(', ')}`);
  }

  const video = await getVideoById(videoId);
  if (!video) throw new ApiError(404, 'Video not found');

  await enqueueProcessJob('convert', {
    videoId,
    s3Key: video.s3Key,
    bucket: env.S3_RAW_BUCKET,
    jobType: 'convert',
    outputFormat,
  });

  return res.status(202).json(
    new ApiResponse(202, { videoId, jobType: 'convert', outputFormat }, 'Convert job queued')
  );
});

export const extractAudio = asyncHandler(async (req: Request, res: Response) => {
  const { videoId, audioFormat } = req.body;
  if (!videoId) throw new ApiError(400, 'videoId is required');

  const allowedFormats = ['mp3', 'wav', 'aac'];
  if (!audioFormat || !allowedFormats.includes(audioFormat)) {
    throw new ApiError(400, `audioFormat must be one of: ${allowedFormats.join(', ')}`);
  }

  const video = await getVideoById(videoId);
  if (!video) throw new ApiError(404, 'Video not found');

  await enqueueProcessJob('extract-audio', {
    videoId,
    s3Key: video.s3Key,
    bucket: env.S3_RAW_BUCKET,
    jobType: 'extract-audio',
    audioFormat,
  });

  return res.status(202).json(
    new ApiResponse(202, { videoId, jobType: 'extract-audio', audioFormat }, 'Audio extraction job queued')
  );
});
export const trimVideo = asyncHandler(async (req: Request, res: Response) => {
  const { videoId, startTime, endTime } = req.body;
  if (!videoId) throw new ApiError(400, 'videoId is required');
  if (startTime === undefined || endTime === undefined) {
    throw new ApiError(400, 'startTime and endTime are required (in seconds)');
  }
  if (Number(endTime) <= Number(startTime)) {
    throw new ApiError(400, 'endTime must be greater than startTime');
  }

  const video = await getVideoById(videoId);
  if (!video) throw new ApiError(404, 'Video not found');

  await enqueueProcessJob('trim', {
    videoId,
    s3Key: video.s3Key,
    bucket: env.S3_RAW_BUCKET,
    jobType: 'trim',
    startTime: Number(startTime),
    endTime: Number(endTime),
  });

  return res.status(202).json(
    new ApiResponse(202, { videoId, jobType: 'trim', startTime, endTime }, 'Trim job queued')
  );
});

export const downloadFromUrl = asyncHandler(async (req: Request, res: Response) => {
  const { sourceUrl, targetSizeMB, targetJobType } = req.body;
  if (!sourceUrl) throw new ApiError(400, 'sourceUrl is required');

  try { new URL(sourceUrl); } catch {
    throw new ApiError(400, 'sourceUrl is not a valid URL');
  }

  const videoId = uuidv4();

  await createVideoRecord({
    videoId,
    s3Key: sourceUrl,
    bucket: 'external-url',
    originalName: new URL(sourceUrl).pathname.split('/').pop() || sourceUrl,
    mimeType: 'video/unknown',
    sizeBytes: 0,
    jobType: targetJobType || 'download',
  });

  await enqueueProcessJob('download-url', {
    videoId,
    s3Key: '',         
    bucket: '',
    jobType: 'download-url',
    sourceUrl,
    targetSizeMB: targetSizeMB ? Number(targetSizeMB) : undefined,
    targetJobType: targetJobType || undefined,
  });

  return res.status(202).json(
    new ApiResponse(202, { videoId, jobType: 'download-url', sourceUrl, targetJobType, targetSizeMB }, 'Download job queued')
  );
});

export const getJobStatus = asyncHandler(async (req: Request<{ videoId: string }>, res: Response) => {
  const { videoId } = req.params;
  const video = await getVideoById(videoId);
  if (!video) throw new ApiError(404, 'Job not found');

  return res.json(
    new ApiResponse(200, video, 'Job status fetched')
  );
});

export const generateThumbnail = asyncHandler(async (req: Request, res: Response) => {
  const { videoId, startTime } = req.body;
  if (!videoId) throw new ApiError(400, 'videoId is required');

  const video = await getVideoById(videoId);
  if (!video) throw new ApiError(404, 'Video not found');

  await enqueueProcessJob('thumbnail', {
    videoId,
    s3Key: video.s3Key,
    bucket: env.S3_RAW_BUCKET,
    jobType: 'thumbnail',
    startTime: startTime !== undefined ? Number(startTime) : 2,
  });

  return res.status(202).json(
    new ApiResponse(202, { videoId, jobType: 'thumbnail', startTime }, 'Thumbnail generation job queued')
  );
});

export const streamJobProgress = (req: Request, res: Response) => {
  const videoId = req.params.videoId as string;
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.write('\n');

  // Stream initial status
  getVideoById(videoId).then(video => {
    if (video) {
      res.write(`data: ${JSON.stringify({ status: video.status, progress: video.progress ?? 0, thumbnailUrl: video.thumbnailUrl, outputUrl: video.outputUrl || video.masterPlaylistUrl })}\n\n`);
    }
  }).catch(err => {
    console.error('[SSE] Failed to fetch initial video status:', err);
  });

  const queueEvents = new QueueEvents('video-transcode', {
    connection: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
    },
  });

  queueEvents.on('progress', ({ jobId, data }) => {
    if (jobId === videoId) {
      res.write(`data: ${JSON.stringify({ status: 'processing', progress: Number(data) })}\n\n`);
    }
  });

  queueEvents.on('completed', async ({ jobId }) => {
    if (jobId === videoId) {
      const latest = await getVideoById(videoId);
      res.write(`data: ${JSON.stringify({ 
        status: 'completed', 
        progress: 100, 
        thumbnailUrl: latest?.thumbnailUrl, 
        outputUrl: latest?.outputUrl || latest?.masterPlaylistUrl 
      })}\n\n`);
      res.end();
      queueEvents.close();
    }
  });

  queueEvents.on('failed', ({ jobId, failedReason }) => {
    if (jobId === videoId) {
      res.write(`data: ${JSON.stringify({ status: 'failed', progress: 0, reason: failedReason })}\n\n`);
      res.end();
      queueEvents.close();
    }
  });

  req.on('close', () => {
    queueEvents.close();
  });
};
