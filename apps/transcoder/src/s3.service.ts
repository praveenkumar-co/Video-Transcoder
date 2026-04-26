
import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { createReadStream } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function downloadFromS3(
  bucket: string, 
  key: string,
  localPath: string
): Promise<void> {
  console.info(`[downloadFromS3] Fetching s3://${bucket}/${key}`);
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  
  try {
    const response = await s3Client.send(command);
    console.info(`[downloadFromS3] S3 response received, piping to ${localPath}`);
    
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    
    if (!response.Body) {
      throw new Error('No body in S3 response');
    }

    return new Promise((resolve, reject) => {
      // We import createWriteStream dynamically or rely on it from 'fs' if added
      const { createWriteStream } = require('fs');
      const writable = createWriteStream(localPath);
      const readable = response.Body as any;

      readable.pipe(writable);

      readable.on('error', (err: any) => { console.error('Readable error', err); reject(err); });
      writable.on('error', (err: any) => { console.error('Writable error', err); reject(err); });
      writable.on('finish', () => {
        console.info(`Downloaded: ${key} → ${localPath}`);
        resolve();
      });
    });
  } catch (err) {
    console.error("Error in downloadFromS3 s3Client.send", err);
    throw err;
  }
}
export async function uploadDirectoryToS3(
  localDir: string,
  bucket: string,
  s3Prefix: string
): Promise<void> {
  console.info(`[uploadDirectoryToS3] Scanning directory: ${localDir}`);
  const files = await getAllFiles(localDir);
  console.info(`[uploadDirectoryToS3] Found ${files.length} file(s) to upload — uploading in parallel`);

  const CONCURRENCY = 10;
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (filePath) => {
        const relativePath = path.relative(localDir, filePath);
        const s3Key = `${s3Prefix}/${relativePath}`.replace(/\\/g, '/');
        const contentType = getContentType(filePath);
        const upload = new Upload({
          client: s3Client,
          params: {
            Bucket: bucket,
            Key: s3Key,
            Body: createReadStream(filePath),
            ContentType: contentType,
            // HLS segments are immutable — cache aggressively
            CacheControl: filePath.endsWith('.ts')
              ? 'max-age=31536000'
              : 'max-age=0, no-cache',
          },
        });
        await upload.done();
        console.info(`[uploadDirectoryToS3] Uploaded: ${s3Key}`);
      })
    );
    console.info(`[uploadDirectoryToS3] Batch ${Math.floor(i / CONCURRENCY) + 1} done (${Math.min(i + CONCURRENCY, files.length)}/${files.length})`);
  }
}
 
export async function getVideoDurationFromS3(
  bucket: string,
  key: string
): Promise<number> {
  console.info(`[getVideoDurationFromS3] Fetching metadata for s3://${bucket}/${key}`);
  const command = new HeadObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3Client.send(command);
  const duration = response.Metadata?.['duration'];
  return duration ? parseFloat(duration) : 0;
}

async function getAllFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getAllFiles(fullPath)));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function getContentType(filePath: string): string {
  if (filePath.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl';
  if (filePath.endsWith('.ts')) return 'video/mp2t';
  return 'application/octet-stream';
}