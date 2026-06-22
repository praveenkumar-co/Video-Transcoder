import React, { useCallback, useEffect } from 'react';
import { useUpload } from '../hooks/useUpload';
import { UploadCloud, CheckCircle2, AlertCircle, FileVideo, Loader2, RotateCcw } from 'lucide-react';

interface UploadWidgetProps {
  onUploadComplete?: (videoId: string) => void;
}

export function UploadWidget({ onUploadComplete }: UploadWidgetProps) {
  const { state, upload, reset } = useUpload();

  useEffect(() => {
    if (state.status === 'complete' && state.videoId && onUploadComplete) {
      // Let user see completion for a second before navigating
      const timer = setTimeout(() => onUploadComplete(state.videoId!), 1500);
      return () => clearTimeout(timer);
    }
  }, [state, onUploadComplete]);

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
    <div className="upload-widget">
      {state.status === 'idle' && (
        <div
          className="upload-zone"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <div className="upload-icon">
            <div className="upload-icon-shell">
              <UploadCloud size={48} strokeWidth={1.7} />
            </div>
          </div>
          <p className="upload-title">Drop a source video here</p>
          <p className="upload-subtitle">MP4, MOV or AVI - up to 5 GB</p>
          <button className="btn btn-primary upload-action" type="button">
            <UploadCloud size={18} /> Select Video
          </button>
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
        <div className="centered-message">
          <div className="state-icon-shell">
            <Loader2 className="pulse-anim" size={40} color="var(--accent-color)" />
          </div>
          <p>Preparing secure upload...</p>
        </div>
      )}

      {state.status === 'uploading' && (
        <div className="progress-container">
          <div className="progress-shell">
            <div className="progress-icon-shell">
              <FileVideo size={32} color="var(--accent-color)" />
            </div>
            <div className="progress-body">
              <div className="progress-header">
                <span>Uploading source asset</span>
                <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>{state.progress.percentage}%</span>
              </div>
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${state.progress.percentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {state.status === 'complete' && (
        <div className="centered-message">
          <div className="state-icon-shell success">
            <CheckCircle2 size={56} color="var(--success-color)" />
          </div>
          <p className="state-title success">
            Upload complete
          </p>
          <p className="upload-subtitle">
            Opening the processing dashboard...
          </p>
        </div>
      )}

      {state.status === 'error' && (
        <div className="centered-message">
          <div className="state-icon-shell danger">
            <AlertCircle size={56} color="var(--danger-color)" />
          </div>
          <p className="state-title danger">{state.message}</p>
          <button className="btn btn-secondary" onClick={reset} style={{ marginTop: '1.5rem' }}>
            <RotateCcw size={18} /> Try Again
          </button>
        </div>
      )}
    </div>
  );
}

  
// Instant QR Code Sharing: Generate a temporary QR code for the compressed video so users can scan it and instantly download the smaller video onto their smartphones. 
