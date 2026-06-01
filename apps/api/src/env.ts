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
  S3_PROCESSED_BUCKET: z.string().default('replace-with-your-processed-bucket'),
  CLOUDFRONT_DOMAIN: z.string().optional(),

  PRESIGNED_URL_EXPIRY: z.coerce.number().default(300),
  CORS_ORIGIN: z.string().optional(),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  SQS_QUEUE_URL: z.string().min(1),
  SQS_WAIT_TIME_SECONDS: z.coerce.number().default(20),
  SQS_VISIBILITY_TIMEOUT_SECONDS: z.coerce.number().default(600),
  SQS_POLL_IDLE_DELAY_MS: z.coerce.number().default(500),
  UPLOAD_RECONCILE_INTERVAL_MS: z.coerce.number().default(30_000),
  UPLOAD_RECONCILE_PENDING_AFTER_MS: z.coerce.number().default(15_000),
  UPLOAD_RECONCILE_QUEUED_AFTER_MS: z.coerce.number().default(120_000),
  
  ADMIN_EMAIL: z.string().email().default("admin@example.com"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  JWT_SECRET: z.string().default("videoforge-default-secret-key-12345"),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
}).superRefine((env, ctx) => {
  if (env.NODE_ENV !== 'production') {
    return;
  }

  if (!env.CORS_ORIGIN) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['CORS_ORIGIN'],
      message: 'CORS_ORIGIN is required in production',
    });
  }

  for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'] as const) {
    if (!env[key]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${key} is required in production so contact messages are emailed to the admin`,
      });
    }
  }
});

const parsed = EnvSchema.parse(process.env);

export const env = parsed;
