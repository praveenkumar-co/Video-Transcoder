import { PresignedUrlResponse } from '../types';

const API_BASE =
  import.meta.env.VITE_API_URL ?? 'https://localhost:8443';

export async function requestPresignedUrl(
  file: File
): Promise<PresignedUrlResponse> {
  const res = await fetch(`${API_BASE}/api/upload/presigned-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  const res = await fetch(`${API_BASE}/api/upload/videos/${videoId}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? body.message ?? `HTTP ${res.status}`);
  }
  const body = await res.json();
  return body.data;
}

export async function listVideos(): Promise<import('../types').VideoMetaData[]> {
  const res = await fetch(`${API_BASE}/api/upload/videos`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? body.message ?? `HTTP ${res.status}`);
  }
  const body = await res.json();
  return body.data;
}
