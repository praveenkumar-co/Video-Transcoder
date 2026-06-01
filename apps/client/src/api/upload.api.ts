import { PresignedUrlResponse } from '../types';
import { API_BASE } from './config';
import { getAuthHeaders } from './auth.api';

export async function requestPresignedUrl(
  file: File
): Promise<PresignedUrlResponse> {
  const res = await fetch(`${API_BASE}/api/upload/presigned-url`, {
    method: 'POST',
    headers: getAuthHeaders('application/json'),
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? body.message ?? `HTTP ${res.status}`);
  }

  const body = await res.json();
  return body.data as PresignedUrlResponse;
}

export async function uploadToS3(
  file: File,
  uploadUrl: string,
  onProgress: (loaded: number, total: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.timeout = 30 * 60 * 1000;
    xhr.setRequestHeader('Content-Type', file.type);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(e.loaded, e.total);
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`S3 upload failed with status ${xhr.status}`));
    });

    xhr.addEventListener('error', () => reject(
      new Error(
        'Direct S3 upload was blocked by the browser or network. Check the raw S3 bucket CORS policy allows PUT from this frontend origin and allows the Content-Type header.'
      )
    ));
    xhr.addEventListener('timeout', () => reject(new Error('Upload timed out before S3 responded')));
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

    xhr.send(file);
  });
}

export async function getVideoStatus(videoId: string): Promise<import('../types').VideoMetaData> {
  const res = await fetch(`${API_BASE}/api/upload/videos/${videoId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? body.message ?? `HTTP ${res.status}`);
  }
  const body = await res.json();
  return body.data;
}

export async function listVideos(): Promise<import('../types').VideoMetaData[]> {
  const res = await fetch(`${API_BASE}/api/upload/videos`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? body.message ?? `HTTP ${res.status}`);
  }
  const body = await res.json();
  return body.data;
}

export async function triggerTranscode(videoId: string, resolution?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/process/transcode`, {
    method: 'POST',
    headers: getAuthHeaders('application/json'),
    body: JSON.stringify({ videoId, resolution }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? body.message ?? `HTTP ${res.status}`);
  return body.data;
}

export async function triggerCompress(videoId: string, targetSizeMB: number): Promise<any> {
  const res = await fetch(`${API_BASE}/api/process/compress`, {
    method: 'POST',
    headers: getAuthHeaders('application/json'),
    body: JSON.stringify({ videoId, targetSizeMB }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? body.message ?? `HTTP ${res.status}`);
  return body.data;
}

export async function triggerConvert(videoId: string, outputFormat: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/process/convert`, {
    method: 'POST',
    headers: getAuthHeaders('application/json'),
    body: JSON.stringify({ videoId, outputFormat }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? body.message ?? `HTTP ${res.status}`);
  return body.data;
}

export async function triggerExtractAudio(videoId: string, audioFormat: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/process/extract-audio`, {
    method: 'POST',
    headers: getAuthHeaders('application/json'),
    body: JSON.stringify({ videoId, audioFormat }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? body.message ?? `HTTP ${res.status}`);
  return body.data;
}

export async function triggerTrim(videoId: string, startTime: number, endTime: number): Promise<any> {
  const res = await fetch(`${API_BASE}/api/process/trim`, {
    method: 'POST',
    headers: getAuthHeaders('application/json'),
    body: JSON.stringify({ videoId, startTime, endTime }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? body.message ?? `HTTP ${res.status}`);
  return body.data;
}

export async function triggerDownloadUrl(sourceUrl: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/process/download-url`, {
    method: 'POST',
    headers: getAuthHeaders('application/json'),
    body: JSON.stringify({ sourceUrl }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? body.message ?? `HTTP ${res.status}`);
  return body.data;
}
