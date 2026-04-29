

import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { env } from "../env";

import { NodeHttpHandler } from '@smithy/node-http-handler';

const s3Client = new S3Client({ 
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
  requestHandler: new NodeHttpHandler({
    requestTimeout: 15000,
    connectionTimeout: 5000,
  }),
});

export interface GeneratePresignedUrlParams {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface PresignedUrlResult {
  uploadUrl: string;
  videoId: string;
  s3Key: string;
  expiresIn: number;
}

export async function generatePresignedUploadUrl(
  params: GeneratePresignedUrlParams
): Promise<PresignedUrlResult> {
  const videoId = randomUUID();
  const extension = params.fileName.split('.').pop() ?? 'mp4';
  const s3Key = `raw/${videoId}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: env.S3_RAW_BUCKET,
    Key: s3Key,
    ContentType: params.mimeType,
    Metadata: {
      originalName: encodeURIComponent(params.fileName),
      videoId,
    },
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: env.PRESIGNED_URL_EXPIRY,
  });

  return {
    uploadUrl,
    videoId,
    s3Key,
    expiresIn: env.PRESIGNED_URL_EXPIRY,
  };
}
export async function verifyObjectExists(
  bucket: string,
  key: string
): Promise<boolean> {
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}