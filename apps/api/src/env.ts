import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),

  MONGODB_URI: z.string().min(1), 

  AWS_REGION: z.string(),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  S3_RAW_BUCKET: z.string(),
  S3_PROCESSED_BUCKET: z.string().default('video-transcoder-processed'),

  PRESIGNED_URL_EXPIRY: z.coerce.number().default(300),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  SQS_QUEUE_URL: z.string().min(1),
  SQS_WAIT_TIME_SECONDS: z.coerce.number().default(20),
  SQS_VISIBILITY_TIMEOUT_SECONDS: z.coerce.number().default(600),
  SQS_POLL_IDLE_DELAY_MS: z.coerce.number().default(500),
  UPLOAD_RECONCILE_INTERVAL_MS: z.coerce.number().default(30_000),
  UPLOAD_RECONCILE_PENDING_AFTER_MS: z.coerce.number().default(15_000),
  UPLOAD_RECONCILE_QUEUED_AFTER_MS: z.coerce.number().default(120_000),
  
});

const parsed = EnvSchema.parse(process.env);

export const env = parsed;
