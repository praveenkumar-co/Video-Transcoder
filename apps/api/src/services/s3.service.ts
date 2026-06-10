import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { env } from "../env";
import { Readable } from 'stream';

import { NodeHttpHandler } from '@smithy/node-http-handler';
import { Agent as HttpsAgent } from 'https';

const s3Client = new S3Client({ 
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
  requestHandler: new NodeHttpHandler({
    httpsAgent: new HttpsAgent({
      keepAlive: true,
      family: 4,
    }),
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
  } catch (err: any) {
    const statusCode = err?.$metadata?.httpStatusCode;
    const code = err?.name ?? err?.Code;

    if (statusCode === 404 || code === 'NotFound' || code === 'NoSuchKey') {
      return false;
    }

    console.error(`[S3] Failed to verify s3://${bucket}/${key}:`, err);
    throw err;
  }
}

export async function generatePresignedDownloadUrl(
  bucket: string,
  key: string,
  fileName: string
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(fileName)}"`,
  });

  return getSignedUrl(s3Client, command, {
    expiresIn: 3600, 
  });
}

export async function getS3ObjectContent(
  bucket: string,
  key: string
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3Client.send(command);
  const stream = response.Body as Readable;
  return new Promise((resolve, reject) => {
    let chunks = '';
    stream.on('data', (chunk) => {
      chunks += chunk.toString();
    });
    stream.on('end', () => resolve(chunks));
    stream.on('error', reject);
  });
}
