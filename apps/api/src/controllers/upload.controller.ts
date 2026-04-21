import { Request, Response } from "express";
import PresignedUrlRequestSchema from '../validators/zod.validator';
import { asyncHandler, ApiError, ApiResponse } from 'node-utils-kit';
import { generatePresignedUploadUrl } from '../services/s3.service';
import { createVideoRecord, getVideoById, toVideoMetadata } from '../services/video.service';
import { env } from '../env';

export const requestPresignedUrl = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = PresignedUrlRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, 'Invalid request data');
    }
    const { fileName, mimeType, sizeBytes } = parsed.data;
    const presigned = await generatePresignedUploadUrl({
      fileName,
      mimeType,
      sizeBytes,
    });
    console.log("STEP 1: before DB insert");
    await createVideoRecord({
      videoId: presigned.videoId,
      s3Key: presigned.s3Key, 
      bucket: env.S3_RAW_BUCKET,
      originalName: fileName,
      mimeType,
      sizeBytes,
    });
    console.log("STEP 1: after DB insert");
    return res.status(201).json(
      new ApiResponse(201, presigned, 'Upload URL generated')
    );
  }
);
export const getVideoStatus = asyncHandler(
  async (req: Request<{ videoId: string }>, res: Response) => {
    const { videoId } = req.params;
    const video = await getVideoById(videoId);
    if (!video) {
      throw new ApiError(404, 'Video not found');
    }
    return res.json(
      new ApiResponse(200, toVideoMetadata(video), 'Video fetched')
    );
  }
);