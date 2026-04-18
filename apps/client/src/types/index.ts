export interface PresignedUrlResponse{
    uploadUrl: string;
    videoId: string;
    s3Key: string;
    exporiresIn: number;
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
  