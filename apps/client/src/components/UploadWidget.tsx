import { useCallback } from 'react';
import { useUpload } from '../hooks/useUpload';

export function UploadWidget() {
  const { state, upload, reset } = useUpload();

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) upload(file);
    },
    [upload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) upload(file);
    },
    [upload]
  );

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'sans-serif' }}>
      {state.status === 'idle' && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          style={{
            border: '2px dashed #ccc',
            borderRadius: 12,
            padding: '48px 24px',
            textAlign: 'center',
            cursor: 'pointer',
          }}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <p style={{ margin: 0, color: '#555' }}>Drag & drop a video or click to select</p>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#999' }}>
            MP4, MOV, AVI — max 5 GB
          </p>
          <input
            id="file-input"
            type="file"
            accept="video/mp4,video/quicktime,video/x-msvideo"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </div>
      )}

      {state.status === 'requesting' && (
        <p style={{ textAlign: 'center', color: '#555' }}>Requesting upload URL…</p>
      )}

      {state.status === 'uploading' && (
        <div>
          <p style={{ margin: '0 0 8px', color: '#555' }}>
            Uploading… {state.progress.percentage}%
          </p>
          <div style={{ background: '#eee', borderRadius: 4, height: 8 }}>
            <div
              style={{
                width: `${state.progress.percentage}%`,
                height: '100%',
                background: '#3b82f6',
                borderRadius: 4,
                transition: 'width 0.1s',
              }}
            />
          </div>
        </div>
      )}

      {state.status === 'complete' && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#16a34a' }}>✓ Upload complete</p>
          <p style={{ fontSize: 12, color: '#999' }}>Video ID: {state.videoId}</p>
          <button onClick={reset} style={{ marginTop: 12 }}>Upload another</button>
        </div>
      )}

      {state.status === 'error' && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#dc2626' }}>{state.message}</p>
          <button onClick={reset} style={{ marginTop: 12 }}>Try again</button>
        </div>
      )}
    </div>
  );
}