import React, { useEffect, useState } from 'react';
import { VideoMetaData } from '../types';
import { getVideoStatus } from '../api/upload.api';
import { VideoPlayer } from './VideoPlayer';
import { ArrowLeft, RefreshCw, FileText, Download, PlayCircle, Loader2, CheckCircle2, AlertTriangle, Minimize2, Image as ImageIcon, Zap, Activity } from 'lucide-react';
import { TabType } from '../App';

interface DashboardProps {
  videoId: string;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onUploadNew: () => void;
}

export function Dashboard({ videoId, activeTab, onTabChange, onUploadNew }: DashboardProps) {
  const [video, setVideo] = useState<VideoMetaData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const data = await getVideoStatus(videoId);
      setVideo(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll every 5 seconds if not complete/failed
    const interval = setInterval(() => {
      setVideo((prev) => {
        if (!prev || (prev.status !== 'completed' && prev.status !== 'failed')) {
          fetchStatus();
        }
        return prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [videoId]);

  if (error) {
    return (
      <div className="glass-panel animate-slide-up" style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
        <AlertTriangle size={48} color="var(--danger-color)" style={{ marginBottom: '1rem' }} />
        <h2 style={{ color: 'var(--danger-color)' }}>Error Loading Video</h2>
        <p>{error}</p>
        <div className="action-buttons" style={{ justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={onUploadNew}>
            <ArrowLeft size={18} /> Back to Upload
          </button>
          <button className="btn btn-primary" onClick={fetchStatus}>
            <RefreshCw size={18} /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="glass-panel centered-message animate-fade-in" style={{ maxWidth: 600, margin: '0 auto' }}>
        <Loader2 className="pulse-anim" size={32} color="var(--accent-color)" />
        <p>Syncing video details...</p>
      </div>
    );
  }

  const isCompleted = video.status === 'completed';
  const statusLabel = video.status.replace('-', ' ');
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'play':
        return (
          <div className="glass-panel">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', fontWeight: 600 }}>
              <div style={{ background: 'rgba(45, 212, 191, 0.14)', padding: '0.5rem', borderRadius: '8px' }}>
                <PlayCircle color="var(--accent-color)" size={24} />
              </div>
              Stream Preview
            </h2>
            {isCompleted && video.masterPlaylistUrl ? (
              <VideoPlayer url={video.masterPlaylistUrl} />
            ) : (
              <div className="centered-message" style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <Activity size={48} color="var(--warning-color)" className="pulse-anim" style={{ marginBottom: '1rem' }} />
                <h3>Processing in Progress</h3>
                <p>The streaming playlist is being compiled. Please wait for completion.</p>
              </div>
            )}
          </div>
        );

      case 'compress':
        return (
          <div className="glass-panel centered-message">
            <Minimize2 size={64} color="var(--accent-color)" style={{ marginBottom: '1rem', opacity: 0.8 }} />
            <h2>Smart Compression</h2>
            <p style={{ maxWidth: 450, fontSize: '1.1rem' }}>
              The compression job surface is reserved for the next worker capability.
            </p>
            <button className="btn btn-primary" disabled style={{ marginTop: '1.5rem' }}>
              <Zap size={18} /> Coming Next
            </button>
          </div>
        );

      case 'gif':
        return (
          <div className="glass-panel centered-message">
            <ImageIcon size={64} color="var(--accent-color)" style={{ marginBottom: '1rem', opacity: 0.8 }} />
            <h2>GIF Producer</h2>
            <p style={{ maxWidth: 450, fontSize: '1.1rem' }}>
              This tab will create optimized GIF exports from selected start and end timestamps.
            </p>
            <button className="btn btn-primary" disabled style={{ marginTop: '1.5rem' }}>
              <ImageIcon size={18} /> Coming Next
            </button>
          </div>
        );

      case 'download':
        return (
          <div className="glass-panel">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', fontWeight: 600 }}>
              <div style={{ background: 'rgba(45, 212, 191, 0.14)', padding: '0.5rem', borderRadius: '8px' }}>
                <Download color="var(--accent-color)" size={24} />
              </div>
              Export & Download
            </h2>
            {!isCompleted ? (
              <div className="centered-message" style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p>Assets are compiling. Exports will be available upon completion.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                <div className="feature-card">
                  <div>
                    <h3 style={{ marginBottom: '0.4rem', fontSize: '1.2rem', color: 'var(--text-primary)' }}>HLS Master Playlist</h3>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Adaptive bitrate streaming index (.m3u8) ready for CDN distribution.</p>
                  </div>
                  <button className="btn btn-primary" onClick={() => video.masterPlaylistUrl && window.open(video.masterPlaylistUrl, '_blank')}>
                    <Download size={18} /> Download Asset
                  </button>
                </div>
                <div className="feature-card" style={{ opacity: 0.7 }}>
                  <div>
                    <h3 style={{ marginBottom: '0.4rem', fontSize: '1.2rem', color: 'var(--text-primary)' }}>Original Source</h3>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>The pristine, raw uploaded video file.</p>
                  </div>
                  <button className="btn btn-secondary" disabled>
                    Archived
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 'dashboard':
      default:
        return (
          <div className="dashboard-grid">
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}>
                  <div style={{ background: 'rgba(45, 212, 191, 0.14)', padding: '0.5rem', borderRadius: '8px' }}>
                    <Activity color="var(--accent-color)" size={20} />
                  </div>
                  Task Monitor
                </h2>
                <span className={`status-badge ${video.status.toLowerCase()}`}>
                  {video.status === 'completed' && <CheckCircle2 size={16} style={{ marginRight: '0.4rem' }} />}
                  {video.status === 'processing' && <RefreshCw size={16} className="pulse-anim" style={{ marginRight: '0.4rem' }} />}
                  {statusLabel}
                </span>
              </div>

              <div className="video-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                {video.status === 'failed' ? (
                  <>
                    <AlertTriangle size={56} color="var(--danger-color)" />
                    <p style={{ marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Encoding Pipeline Failed</p>
                  </>
                ) : isCompleted ? (
                  <>
                    <div style={{ background: 'rgba(34, 197, 94, 0.12)', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem' }}>
                      <CheckCircle2 size={56} color="var(--success-color)" />
                    </div>
                    <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Processing completed successfully</p>
                    <button className="btn btn-primary" style={{ marginTop: '2rem' }} onClick={() => onTabChange('play')}>
                      <PlayCircle size={18} /> Launch Player
                    </button>
                  </>
                ) : (
                  <>
                    <Loader2 size={56} color="var(--accent-color)" className="pulse-anim" />
                    <p style={{ marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                      Worker is preparing adaptive streaming assets...
                    </p>
                  </>
                )}
              </div>

              <div className="action-buttons" style={{ marginTop: '2rem' }}>
                <button className="btn btn-secondary" onClick={onUploadNew} style={{ width: '100%' }}>
                  <ArrowLeft size={18} /> Queue New Video
                </button>
              </div>
            </div>

            <div className="glass-panel">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', fontWeight: 600 }}>
                <div style={{ background: 'rgba(45, 212, 191, 0.14)', padding: '0.5rem', borderRadius: '8px' }}>
                  <FileText color="var(--accent-color)" size={20} />
                </div>
                Metadata
              </h2>
              
              <div className="detail-item">
                <div className="detail-label">Source Filename</div>
                <div className="detail-value">{video.originalName}</div>
              </div>
              
              <div className="detail-item">
                <div className="detail-label">Asset Identifier (UUID)</div>
                <div className="detail-value" style={{ fontSize: '0.9rem', fontFamily: 'monospace', color: 'var(--accent-color)' }}>
                  {video.videoId}
                </div>
              </div>
              
              <div className="detail-item">
                <div className="detail-label">Payload Size</div>
                <div className="detail-value">{formatBytes(video.sizeBytes)}</div>
              </div>
              
              <div className="detail-item">
                <div className="detail-label">Ingestion Timestamp</div>
                <div className="detail-value">{new Date(video.uploadedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' })}</div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="dashboard-wrapper">
      {renderContent()}
    </div>
  );
}
