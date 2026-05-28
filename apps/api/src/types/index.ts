export type JobType =
  | 'transcode'
  | 'compress'
  | 'convert'
  | 'extract-audio'
  | 'trim'
  | 'download-url';

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
    outputUrl?: string;
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
  jobType: JobType;
  resolution?: '4K' | '1080p' | '720p' | '480p' | '360p' | '240p';
  targetSizeMB?: number;
  outputFormat?: 'mp4' | 'webm' | 'mov' | 'avi' | 'mkv';
  audioFormat?: 'mp3' | 'wav' | 'aac';
  startTime?: number;
  endTime?: number;
  sourceUrl?: string;
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