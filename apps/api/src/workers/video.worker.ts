import { QueueEvents } from 'bullmq';
import { env } from '../env';
import { updateVideoStatus } from '../services/video.service';
import { VideoStatus } from '../types/index';
import { videoQueue } from '../queues/video.queue';

async function getVideoIdForJob(jobId: string): Promise<string> {
  const job = await videoQueue.getJob(jobId);
  const videoId = job?.data?.videoId;

  if (videoId) {
    return videoId;
  }

  console.warn(`[BullMQ] Could not load job data for ${jobId}; falling back to job id`);
  return jobId;
}

export function startVideoWorker(): void {
  const queueEvents = new QueueEvents('video-transcode', {
    connection: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
    },
  });
  queueEvents.on('active', async ({ jobId }) => {
    console.info(`[BullMQ] Job ${jobId} is active (processing)`);
    await updateVideoStatus(await getVideoIdForJob(jobId), VideoStatus.PROCESSING);
  });

  queueEvents.on('completed', async ({ jobId }) => {
    console.info(`[BullMQ] Job ${jobId} completed`);
    await updateVideoStatus(await getVideoIdForJob(jobId), VideoStatus.COMPLETED);
  });

  queueEvents.on('failed', async ({ jobId, failedReason }) => {
    console.error(`[BullMQ] Job ${jobId} failed:`, failedReason);
    await updateVideoStatus(await getVideoIdForJob(jobId), VideoStatus.FAILED);
  });

  queueEvents.on('error', (error) => {
    console.error('[BullMQ] QueueEvents error:', error);
  });
  console.info('BullMQ QueueEvents listener started (monitoring transcoder jobs)');
} 
