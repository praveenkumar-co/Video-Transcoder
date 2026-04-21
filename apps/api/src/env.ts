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

  PRESIGNED_URL_EXPIRY: z.coerce.number().default(300),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  SQS_QUEUE_URL: z.string().min(1),
  
});

const parsed = EnvSchema.parse(process.env);

export const env = parsed;