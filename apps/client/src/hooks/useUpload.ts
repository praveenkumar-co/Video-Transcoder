import { useState, useCallback } from 'react';
import { requestPresignedUrl, uploadToS3 } from '../api/upload.api';
import { UploadState } from '../types';

const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024 * 1024; 

export function useUpload() {
  const [state, setState] = useState<UploadState>({ status: 'idle' });

  const upload = useCallback(async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setState({ status: 'error', message: 'Unsupported file type. Use MP4, MOV, or AVI.' });
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setState({ status: 'error', message: 'File exceeds 5 GB limit.' });
      return;
    }

    try {
      setState({ status: 'requesting' });

      const presigned = await requestPresignedUrl(file);

      setState({
        status: 'uploading',
        progress: { loaded: 0, total: file.size, percentage: 0 },
      });

      await uploadToS3(file, presigned.uploadUrl, (loaded, total) => {
        setState({
          status: 'uploading',
          progress: { loaded, total, percentage: Math.round((loaded / total) * 100) },
        });
      });

      setState({ status: 'complete', videoId: presigned.videoId });
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Upload failed',
      });
    }
  }, []);

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, upload, reset };
}