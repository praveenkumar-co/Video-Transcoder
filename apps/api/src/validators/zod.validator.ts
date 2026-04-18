import {z} from 'zod' ;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo'] as const;


const PresignedUrlRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.enum(ALLOWED_MIME_TYPES),
  sizeBytes: z.number().positive().max(MAX_FILE_SIZE_BYTES),
});

export default PresignedUrlRequestSchema ;

