import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs';
import { env } from '../env';
import { videoQueue } from '../queues/video.queue';
import { S3EventNotification } from '../types/index';
import { verifyObjectExists } from '../services/s3.service';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import {
  getRecoverableUploadCandidates,
  getVideoById,
  markVideoQueued,
} from './video.service';
import { VideoStatus } from '../types/index';

const sqsClient = new SQSClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
  requestHandler: new NodeHttpHandler({
    requestTimeout: Math.max(env.SQS_WAIT_TIME_SECONDS * 1000 + 5000, 30_000),
    connectionTimeout: 10000,
    throwOnRequestTimeout: true,
  }),
});

type EnqueueSource = 'sqs' | 'reconcile';
type EnqueueResult = 'queued' | 'already-handled' | 'not-ready' | 'discarded';

async function deleteMessage(receiptHandle: string): Promise<void> {
  await sqsClient.send(
    new DeleteMessageCommand({
      QueueUrl: env.SQS_QUEUE_URL,
      ReceiptHandle: receiptHandle,
    })
  );
}

async function enqueueTranscodeJob(params: {
  videoId: string;
  bucket: string;
  s3Key: string;
  source: EnqueueSource;
}): Promise<EnqueueResult> {
  const { videoId, bucket, s3Key, source } = params;
  const video = await getVideoById(videoId);

  if (!video) {
    console.warn(`[${source}] No DB record for ${videoId}, discarding event`);
    return 'discarded';
  }

  if (video.status === VideoStatus.QUEUED) {
    const existingJob = await videoQueue.getJob(videoId);

    if (source !== 'reconcile' || existingJob) {
      console.info(`[${source}] ${videoId} already ${video.status}, skipping enqueue`);
      return 'already-handled';
    }

    console.warn(`[reconcile] ${videoId} is queued in DB but missing in Redis; re-enqueueing`);
  } else if (
    video.status === VideoStatus.PROCESSING ||
    video.status === VideoStatus.COMPLETED ||
    video.status === VideoStatus.FAILED
  ) {
    console.info(`[${source}] ${videoId} already ${video.status}, skipping enqueue`);
    return 'already-handled';
  }

  const exists = await verifyObjectExists(bucket, s3Key);
  if (!exists) {
    if (source === 'sqs') {
      console.warn(`[SQS] Object not visible yet, keeping message for retry: s3://${bucket}/${s3Key}`);
    }
    return 'not-ready';
  }

  await videoQueue.add(
    'transcode',
    { videoId, s3Key, bucket },
    { jobId: videoId }
  );
  await markVideoQueued(videoId);
  console.log(`[${source}] Job enqueued to BullMQ:`, { videoId, bucket, s3Key });

  return 'queued';
}

async function processMessage(body: string, receiptHandle: string): Promise<void> {
  let s3Event: S3EventNotification;
  try {
    const parsed = JSON.parse(body);
    if (parsed.Message) {
      s3Event = JSON.parse(parsed.Message);
    } else {
      s3Event = parsed;
    }
  } catch {
    console.warn('[SQS] Invalid message, deleting');
    await deleteMessage(receiptHandle);
    return;
  }
  if (!s3Event || !Array.isArray((s3Event as any).Records)) {
    console.warn('[SQS] Skipping non-S3 message:', body);
    await deleteMessage(receiptHandle);
    return;
  }
  try {
    let shouldDelete = true;

    for (const record of s3Event.Records) {
      const bucket = record.s3.bucket.name;
      const s3Key = decodeURIComponent(
        record.s3.object.key.replace(/\+/g, ' ')
      );
      const match = s3Key.match(/^raw\/([a-f0-9-]{36})\./);
      if (!match) {
        console.warn(`[SQS] Unrecognised S3 key, skipping: ${s3Key}`);
        continue;
      }
      const videoId = match[1];  
      const result = await enqueueTranscodeJob({
        videoId,
        bucket,
        s3Key,
        source: 'sqs',
      });

      if (result === 'not-ready') {
        shouldDelete = false;
      }
    }

    if (shouldDelete) {
      await deleteMessage(receiptHandle);
    } else {
      console.warn('[SQS] Message left on queue so S3 visibility can be retried');
    }
  } catch (err) {
    console.error('[SQS] Failed to process SQS message; message will be retried:', err);
  }
}

export async function startSqsPoller(): Promise<void> {
  console.info('SQS poller started');
  let consecutiveErrors = 0;

  const poll = async (): Promise<void> => {
    try {
      const response = await sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: env.SQS_QUEUE_URL,
          MaxNumberOfMessages: 10,
          WaitTimeSeconds: env.SQS_WAIT_TIME_SECONDS,
          VisibilityTimeout: env.SQS_VISIBILITY_TIMEOUT_SECONDS,
        })
      );
      consecutiveErrors = 0;

      const messages = response.Messages ?? [];
      if (messages.length > 0) {
        console.info(`[SQS] Received ${messages.length} message(s)`);
      }
      await Promise.all(
        messages.map((msg) =>
          processMessage(msg.Body!, msg.ReceiptHandle!)
        )
      );
    } catch (err) {
      consecutiveErrors += 1;
      console.error('[SQS] Poll error:', err);
    } finally {
      const backoffMs = Math.min(
        env.SQS_POLL_IDLE_DELAY_MS * 2 ** consecutiveErrors,
        30_000
      );
      setTimeout(poll, consecutiveErrors === 0 ? env.SQS_POLL_IDLE_DELAY_MS : backoffMs);
    }
  };
  poll();
}

export async function startUploadReconciler(): Promise<void> {
  console.info('Upload reconciler started');

  const reconcile = async (): Promise<void> => {
    try {
      const candidates = await getRecoverableUploadCandidates(
        env.UPLOAD_RECONCILE_PENDING_AFTER_MS,
        env.UPLOAD_RECONCILE_QUEUED_AFTER_MS
      );

      if (candidates.length > 0) {
        console.info(`[reconcile] Checking ${candidates.length} pending upload(s)`);
      }

      for (const video of candidates) {
        await enqueueTranscodeJob({
          videoId: video.videoId,
          bucket: video.bucket,
          s3Key: video.s3Key,
          source: 'reconcile',
        });
      }
    } catch (err) {
      console.error('[reconcile] Failed to scan pending uploads:', err);
    } finally {
      setTimeout(reconcile, env.UPLOAD_RECONCILE_INTERVAL_MS);
    }
  };
  reconcile();
}
