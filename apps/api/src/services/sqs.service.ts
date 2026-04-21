import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs';
import { env } from '../env';
import { videoQueue } from '../queues/video.queue';
import { S3EventNotification } from '../types/index';

const sqsClient = new SQSClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});
async function processMessage(body: string, receiptHandle: string): Promise<void> {
  try {
    const snsEnvelope = JSON.parse(body) as { Message: string };
    const s3Event = JSON.parse(snsEnvelope.Message) as S3EventNotification;
    for (const record of s3Event.Records) {
      const bucket = record.s3.bucket.name;
      const s3Key = decodeURIComponent(
        record.s3.object.key.replace(/\+/g, ' ')
      );
      const match = s3Key.match(/^raw\/([a-f0-9-]{36})\./);
      if (!match) {
        console.warn(`Unrecognised S3 key: ${s3Key}`);
        continue;
      }
      const videoId = match[1];
      await videoQueue.add(
        'transcode',
        { videoId, s3Key, bucket },
        { jobId: videoId }
      );

      console.info(`Job enqueued: ${videoId}`);
    }
    await sqsClient.send(
      new DeleteMessageCommand({
        QueueUrl: env.SQS_QUEUE_URL,
        ReceiptHandle: receiptHandle,
      })
    );
  } catch (err) {
    console.error('Failed to process SQS message:', err);
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
          WaitTimeSeconds: 20, 
          VisibilityTimeout: 60,
        })
      );

      const messages = response.Messages ?? [];

      await Promise.all(
        messages.map((msg) =>
          processMessage(msg.Body!, msg.ReceiptHandle!)
        )
      );
    } catch (err) {
      console.error('SQS poll error:', err);
    } finally {
     setTimeout(poll, 5000);
    }
  };
  poll();
}