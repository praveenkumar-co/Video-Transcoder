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
console.log("REDIS_HOST =", process.env.REDIS_HOST);
console.log("env.REDIS_HOST =", env.REDIS_HOST);
const sqsClient = new SQSClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
  requestHandler: new NodeHttpHandler({
    requestTimeout: 15000,
    connectionTimeout: 10000,
  }),
});

async function deleteMessage(receiptHandle: string): Promise<void> {
  await sqsClient.send(
    new DeleteMessageCommand({
      QueueUrl: env.SQS_QUEUE_URL,
      ReceiptHandle: receiptHandle,
    })
  );
}
async function processMessage(body: string, receiptHandle: string): Promise<void> {
  console.log('SQS BODY:', body);
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
      const exists = await verifyObjectExists(bucket, s3Key);

      if (!exists) {
        console.warn(`[SQS] File not ready yet, skipping: ${videoId}`);
        continue;
      }
      await videoQueue.add(
        'transcode',
        { videoId, s3Key, bucket },
        { jobId: videoId }
      );
      console.log('[SQS] Job enqueued to BullMQ:', { videoId, bucket, s3Key });
    }
    await deleteMessage(receiptHandle);
  } catch (err) {
    console.error('[SQS] Failed to process SQS message:', err);
  }
}

export async function startSqsPoller(): Promise<void> {
  console.info('SQS poller started');

  const poll = async (): Promise<void> => {
    try {
      const response = await sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: env.SQS_QUEUE_URL,
          MaxNumberOfMessages: 10,
          WaitTimeSeconds: 10,
          VisibilityTimeout: 120,
        })
      );

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
      console.error('[SQS] Poll error:', err);
    } finally {
      setTimeout(poll, 2000);
    }
  };
  poll();
}
