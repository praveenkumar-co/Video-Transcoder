import { Request, Response } from 'express';
import { ApiError } from 'node-utils-kit';
import { S3EventNotification, VideoStatus } from '../types/index';
import { updateVideoStatus } from '../services/video.service';
import { verifyObjectExists } from '../services/s3.service';

async function handleSubscriptionConfirmation(body: Record<string, unknown>): Promise<void> {
  const subscribeUrl = body['SubscribeURL'] as string;
  if (!subscribeUrl) {
    throw new ApiError(400, 'Missing SubscribeURL');
  }
  const response = await fetch(subscribeUrl);
  if (!response.ok) {
    throw new ApiError(500, 'SNS subscription confirmation failed');
  }
  console.info('SNS subscription confirmed');
}
export async function handleS3Event(req: Request, res: Response): Promise<void> {
  const messageType = req.headers['x-amz-sns-message-type'] as string;
  //  Always respond immediately (SNS requirement)
  res.status(200).json({ received: true });

  try {
    if (messageType === 'SubscriptionConfirmation') {
      await handleSubscriptionConfirmation(req.body as Record<string, unknown>);
      return;
    }
    if (messageType !== 'Notification') return;
    const snsMessage = req.body as { Message: string };
    const s3Event = JSON.parse(snsMessage.Message) as S3EventNotification;
    for (const record of s3Event.record) {
      const bucket = record.s3.bucket.name;
      const s3Key = decodeURIComponent(
        record.s3.object.key.replace(/\+/g, ' ')
      );
      const match = s3Key.match(/^raw\/([a-f0-9-]{36})\./);
      if (!match) {
        console.warn(`Unrecognised S3 key pattern: ${s3Key}`);
        continue;
      }
      const videoId = match[1];
      // after matching and verifying and updating VideoStatus
      const exists = await verifyObjectExists(bucket, s3Key);
      if (!exists) {
        console.warn(`S3 object not found: ${s3Key}`);
        continue;
      }
      await updateVideoStatus(videoId, VideoStatus.QUEUED);
      console.info(`Video ${videoId} marked as QUEUED`);
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
  }
}