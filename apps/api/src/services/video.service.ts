
// CreationOfVideo -> updationOfVideo -> getVideo -> returnVideoDetails

import { VideoModel, VideoDocument } from '../models/video.model';
import { VideoStatus, VideoMetaData } from '../types/index';
import { env } from '../env';

export async function createVideoRecord(params: {
  videoId: string;
  s3Key: string;
  bucket: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  jobType?: string;
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
    jobType: params.jobType,
  });
  return video.save();
}

export async function updateVideoStatus(
  videoId: string,
  status: VideoStatus,
  masterPlaylistUrl?: string,
  jobType?: string
): Promise<VideoDocument | null> {
  const update: Record<string, unknown> = { status, updatedAt: new Date() };
  if (masterPlaylistUrl) {
    update.masterPlaylistUrl = masterPlaylistUrl;
  }
  if (jobType) {
    update.jobType = jobType;
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

export async function listRecentVideos(limit = 100): Promise<VideoDocument[]> {
  return VideoModel.find()
    .sort({ updatedAt: -1, uploadedAt: -1 })
    .limit(limit)
    .exec();
}

function getPlayableMasterPlaylistUrl(doc: VideoDocument): string | undefined {
  const isHls = doc.jobType === 'transcode' || doc.jobType === 'download-url' || !!doc.masterPlaylistUrl;
  if (!isHls) {
    return undefined;
  }

  if (doc.status !== VideoStatus.COMPLETED) {
    return doc.masterPlaylistUrl;
  }

  if (env.CLOUDFRONT_DOMAIN) {
    return `https://${env.CLOUDFRONT_DOMAIN}/processed/${doc.videoId}/master.m3u8`;
  }

  return `https://${env.S3_PROCESSED_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/processed/${doc.videoId}/master.m3u8`;
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
    masterPlaylistUrl: getPlayableMasterPlaylistUrl(doc),
    outputUrl: doc.outputUrl,
    thumbnailUrl: doc.thumbnailUrl,
    progress: doc.progress,
    jobType: doc.jobType,
    resolutions: doc.resolutions,
    uploadedAt: doc.uploadedAt,
    updatedAt: doc.updatedAt,
  };
}

export async function deleteVideoRecord(videoId: string): Promise<VideoDocument | null> {
  return VideoModel.findByIdAndDelete(videoId);
}
