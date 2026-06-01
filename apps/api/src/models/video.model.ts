import mongoose, { Schema } from 'mongoose';
import { VideoStatus, VideoMetaData } from '../types/index';

export interface VideoDocument extends VideoMetaData {
  _id: string;
  userId?: string;
}

const VideoSchema = new Schema<VideoDocument>(
  {
    _id: {
      type: String, 
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    videoId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
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
    masterPlaylistUrl: {
      type: String,   
    },
    outputUrl: {
      type: String,
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

export const VideoModel = mongoose.model<VideoDocument>(
  'Video',
  VideoSchema
);