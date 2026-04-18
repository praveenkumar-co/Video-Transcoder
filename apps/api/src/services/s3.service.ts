// Flow : Connection of S3 Client + Creation of interface to used in function
// interface -> function -> input -> outputByFunction -> verifyservicetocheckIfVideo Is uplaoded or not 


import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { ApiError } from "node-utils-kit";
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { env } from "../env";

const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
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
// this run when webhook gets events from SNS then verifyObjectExists exist 
// there to check that uploaded to that AWS S3 actually existed or not in that system

export async function verifyObjectExists(
  bucket: string,
  key: string
): Promise<boolean> {
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    throw new ApiError(404, "File not found in S3");
  }
}