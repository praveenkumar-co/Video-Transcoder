
// CreationOfVideo -> updationOfVideo -> getVideo -> returnVideoDetails

import { VideoModel, VideoDocument } from '../models/video.model';
import { VideoStatus, VideoMetaData } from '../types/index';

export async function createVideoRecord(params: {
  videoId: string;
  s3Key: string;
  bucket: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<VideoDocument> {
  const video = new VideoModel({
    _id: params.videoId,
    videoId: params.videoId,
    s3Key: params.s3Key,
    bucket: params.bucket,
    originalName: params.originalName,
    mimeType: params.mimeType,
    sizeBytes: params.sizeBytes,
    status: VideoStatus.PENDING,
  });
  return video.save();
}

export async function updateVideoStatus(
  videoId: string,
  status: VideoStatus,
  masterPlaylistUrl?: string     
): Promise<VideoDocument | null> {
  const update: Record<string, unknown> = { status, updatedAt: new Date() };
  if (masterPlaylistUrl) {
    update.masterPlaylistUrl = masterPlaylistUrl;
  }
  return VideoModel.findByIdAndUpdate(
    videoId,
    update,
    { returnDocument: 'after' }
  );
}

export async function markVideoQueued(videoId: string): Promise<VideoDocument | null> {
  return VideoModel.findOneAndUpdate(
    { _id: videoId, status: VideoStatus.PENDING },
    { status: VideoStatus.QUEUED, updatedAt: new Date() },
    { returnDocument: 'after' }
  );
}

export async function getRecoverableUploadCandidates(
  pendingOlderThanMs: number,
  queuedOlderThanMs: number,
  limit = 25
): Promise<VideoDocument[]> {
  const pendingCutoff = new Date(Date.now() - pendingOlderThanMs);
  const queuedCutoff = new Date(Date.now() - queuedOlderThanMs);

  return VideoModel.find({
    $or: [
      {
        status: VideoStatus.PENDING,
        uploadedAt: { $lte: pendingCutoff },
      },
      {
        status: VideoStatus.QUEUED,
        updatedAt: { $lte: queuedCutoff },
      },
    ],
  })
    .sort({ uploadedAt: 1 })
    .limit(limit)
    .exec();
}

export async function getVideoById(videoId: string): Promise<VideoDocument | null> {
  return VideoModel.findById(videoId);
}

export function toVideoMetadata(doc: VideoDocument): VideoMetaData {
  return {
    videoId: doc.videoId,
    s3Key: doc.s3Key,
    bucket: doc.bucket,
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    status: doc.status,
    masterPlaylistUrl: doc.masterPlaylistUrl,   
    uploadedAt: doc.uploadedAt,
    updatedAt: doc.updatedAt,
  };
}
