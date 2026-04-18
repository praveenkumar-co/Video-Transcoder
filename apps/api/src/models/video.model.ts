import mongoose, { Schema, Document, Model } from 'mongoose';
import { VideoStatus, VideoMetaData } from '../types/index';

export interface VideoDocument extends VideoMetaData, Document { }

const VideoSchema = new Schema<VideoDocument>(
  {
    s3Key:
    {
      type: String,
      required: true,
      index: true
    },
    bucket:
    {
      type: String,
      required: true
    },
    originalName:
    {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    videoId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sizeBytes: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: Object.values(VideoStatus),
      default: VideoStatus.PENDING,
      required: true,
      index: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
  },
  {
    timestamps: {
      createdAt: 'uploadedAt',
      updatedAt: 'updatedAt'
    },
    versionKey: false,
  }
);

export const VideoModel: Model<VideoDocument> = mongoose.model<VideoDocument>(
  'Video',
  VideoSchema
);