import { Queue } from 'bullmq';
import { env } from '../env';

export type JobType =
  | 'transcode'
  | 'compress'
  | 'convert'
  | 'extract-audio'
  | 'trim'
  | 'download-url'
  | 'thumbnail';

export interface VideoJob {
  videoId: string;
  s3Key: string;
  bucket: string;
  jobType: JobType;
  resolution?: '4K' | '1080p' | '720p' | '480p' | '360p' | '240p';
  targetSizeMB?: number;
  outputFormat?: 'mp4' | 'webm' | 'mov' | 'avi' | 'mkv';
  audioFormat?: 'mp3' | 'wav' | 'aac';
  startTime?: number;
  endTime?: number;
  sourceUrl?: string;
  upscale?: boolean;
}

export const videoQueue = new Queue<VideoJob>('video-transcode', {
  connection: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

console.info('BullMQ queue initialized');