
export enum VideoStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
export interface VideoMetaData{
    videoId : string ;
    s3Key : string ;
    bucket : string ;
    originalName : string ;
    mimeType : string ;
    sizeBytes : number ;
    status : VideoStatus ;
    masterPlaylistUrl?: string;   
    uploadedAt: Date;
    updatedAt: Date; 
}

export interface PresignedUrlRequest{
    fileName : string;
    mimeType : string ;
    sizeBytes : number ;
}

export interface PresignedUrlResponse {
     uploadUrl : string ;
     s3Key : string ;
     videoId : string ;
     ExpiresIn : number ;
}

export interface S3EventRecord {
  s3: {
    bucket: { name: string };
    object: { key: string; size: number };
  };
}

export interface S3EventNotification {
    Records : S3EventRecord[]; 
}
export interface TranscodeJob {
  videoId: string;
  s3Key: string;
  bucket: string;

  outputFormats: ('1080p' | '720p' | '360p')[];
}
export interface TranscodeProgress {
    videoId : string ;
    progress : number ;
}

export interface OutputVideo{
    resolution : string ;
    url : string ;
    sizeBytes : number ;
}

export interface TranscodeResult {
  videoId: string;
  outputs: OutputVideo[];
  duration: number;
}

export interface TranscodeError {
  videoId: string;
  reason: string;
}
