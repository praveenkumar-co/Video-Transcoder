import { Request, Response } from 'express';
import { S3EventNotification, VideoStatus } from '../types/index';
import { updateVideoStatus } from '../services/video.service';
import { verifyObjectExists } from '../services/s3.service';

export async function handleS3Event(req: Request, res: Response): Promise<void> {
  try {
    let body = req.body;

    if (typeof body === 'string') {
      body = JSON.parse(body);
    }
    console.info('Webhook received:', JSON.stringify(body));

    // Raw message delivery — body IS the S3 event directly
    const s3Event = body as S3EventNotification;

    if (!s3Event.Records || s3Event.Records.length === 0) {
      console.warn('No records in S3 event');
      res.status(200).json({ received: true });
      return;
    }

    for (const record of s3Event.Records) {
      const bucket = record.s3.bucket.name;
      const s3Key = decodeURIComponent(
        record.s3.object.key.replace(/\+/g, ' ')
      );

      console.info(`Processing: bucket=${bucket} key=${s3Key}`);

      const match = s3Key.match(/^raw\/([a-f0-9-]{36})\./);
      if (!match) {
        console.warn(`Unrecognised S3 key pattern: ${s3Key}`);
        continue;
      }

      const videoId = match[1];
      console.info(`VideoId extracted: ${videoId}`);

      const exists = await verifyObjectExists(bucket, s3Key);
      if (!exists) {
        console.warn(`S3 object not found: ${s3Key}`);
        continue;
      }

      await updateVideoStatus(videoId, VideoStatus.QUEUED);
      console.info(`Video ${videoId} marked as QUEUED`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(200).json({ received: true }); 
  }
}
