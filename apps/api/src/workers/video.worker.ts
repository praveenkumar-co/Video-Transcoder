import { QueueEvents } from 'bullmq';
import { env } from '../env';
import { updateVideoStatus } from '../services/video.service';
import { VideoStatus } from '../types/index';

export function startVideoWorker(): void {
  const queueEvents = new QueueEvents('video-transcode', {
    connection: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
    },
  });

  queueEvents.on('active', async ({ jobId }) => {
    console.info(`Job ${jobId} is active (processing)`);
    await updateVideoStatus(jobId, VideoStatus.PROCESSING);
  });
  queueEvents.on('completed', async ({ jobId }) => {
    console.info(`Job ${jobId} completed`);
    await updateVideoStatus(jobId, VideoStatus.COMPLETED);
  });

  queueEvents.on('failed', async ({ jobId, failedReason }) => {
    console.error(`Job ${jobId} failed:`, failedReason);
    await updateVideoStatus(jobId, VideoStatus.FAILED);
  });

  console.info('BullMQ QueueEvents listener started (monitoring transcoder jobs)');
}