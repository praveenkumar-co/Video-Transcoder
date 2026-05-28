import { Request, Response } from 'express';
import { asyncHandler, ApiError, ApiResponse } from 'node-utils-kit';
import { JobType, videoQueue } from '../queues/video.queue';
import { createVideoRecord, getVideoById, updateVideoStatus } from '../services/video.service';
import { env } from '../env';
import { VideoStatus } from '../types/index';
import { v4 as uuidv4 } from 'uuid';

async function enqueueProcessJob(
  jobType: JobType,
  payload: Parameters<typeof videoQueue.add>[1]
): Promise<void> {
  await videoQueue.add(jobType, payload);
  await updateVideoStatus(payload.videoId, VideoStatus.QUEUED);
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
  const { videoId, targetSizeMB } = req.body;
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
  });

  return res.status(202).json(
    new ApiResponse(202, { videoId, jobType: 'compress', targetSizeMB }, 'Compress job queued')
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
  const { sourceUrl } = req.body;
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
  });

  await enqueueProcessJob('download-url', {
    videoId,
    s3Key: '',         
    bucket: '',
    jobType: 'download-url',
    sourceUrl,
  });

  return res.status(202).json(
    new ApiResponse(202, { videoId, jobType: 'download-url', sourceUrl }, 'Download job queued')
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
