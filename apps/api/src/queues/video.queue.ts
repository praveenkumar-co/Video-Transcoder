import { Queue } from 'bullmq';
import { env } from '../env';

export interface VideoJob {
  videoId: string;
  s3Key: string;
  bucket: string;
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