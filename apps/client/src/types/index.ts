export interface PresignedUrlResponse{
    uploadUrl: string;
    videoId: string;
    s3Key: string;
    expiresIn: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export type UploadState =
  | { status: 'idle' }
  | { status: 'requesting' }
  | { status: 'uploading'; progress: UploadProgress }
  | { status: 'complete'; videoId: string }
  | { status: 'error'; message: string };

export interface VideoMetaData {
  videoId: string;
  s3Key: string;
  bucket: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
  masterPlaylistUrl?: string;
  outputUrl?: string;
  uploadedAt: string;
  updatedAt: string;
}
