import { Worker, Job } from 'bullmq';
import { env } from '../env';
import { VideoJob } from '../queues/video.queue';
import { updateVideoStatus } from '../services/video.service';
import { VideoStatus } from '../types/index';

export function startVideoWorker(): void {
  const worker = new Worker<VideoJob>(
    'video-transcode',
    async (job: Job<VideoJob>) => {
      const { videoId, s3Key, bucket } = job.data;
      console.info(` Processing job: ${videoId}`);

      await updateVideoStatus(videoId, VideoStatus.PROCESSING);
      console.info(`Video details: bucket=${bucket} key=${s3Key}`);

      await new Promise((resolve) => setTimeout(resolve, 2000));
      await updateVideoStatus(videoId, VideoStatus.COMPLETED);

      console.info(`Job completed: ${videoId}`);
    },
    {
      connection: {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
      },
      concurrency: 3, 
    }
  );
  worker.on('completed', (job) => {
    console.info(`Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
  });

  console.info('BullMQ worker started');
}