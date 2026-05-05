import React, { useEffect, useState } from 'react';
import { UploadWidget } from './components/UploadWidget';
import { Dashboard } from './components/Dashboard';
import { listVideos } from './api/upload.api';
import { VideoMetaData } from './types';
import {
  Activity,
  CheckCircle2,
  CloudUpload,
  Download,
  Image as ImageIcon,
  LayoutDashboard,
  Menu,
  Minimize2,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export type TabType = 'dashboard' | 'play' | 'compress' | 'gif' | 'download';

function App() {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [recentVideos, setRecentVideos] = useState<VideoMetaData[]>([]);
  const [recentError, setRecentError] = useState<string | null>(null);

  const loadRecentVideos = async () => {
    try {
      const videos = await listVideos();
      setRecentVideos(videos);
      setRecentError(null);
    } catch (err) {
      setRecentError(err instanceof Error ? err.message : 'Failed to load videos');
    }
  };

  useEffect(() => {
    if (!videoId) {
      loadRecentVideos();
    }
  }, [videoId]);

  const openVideo = (id: string) => {
    setVideoId(id);
    setActiveTab('dashboard');
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'play' as const, label: 'Player', icon: PlayCircle },
    { id: 'compress' as const, label: 'Compress', icon: Minimize2 },
    { id: 'gif' as const, label: 'GIF', icon: ImageIcon },
    { id: 'download' as const, label: 'Download', icon: Download },
  ];

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="brand-section">
          <button className="menu-icon shadow-pop-tr" aria-label="Open platform menu">
            <Menu size={22} />
          </button>

          <div className="brand-copy">
            <div className="gate-brand" tabIndex={0} aria-label="Video Service">
              <span className="gate-reveal">Video Service</span>
              <span className="gate-panel gate-panel-left" aria-hidden="true" />
              <span className="gate-panel gate-panel-right" aria-hidden="true" />
            </div>
            <p>Transcode, stream, compress and export media assets.</p>
          </div>
        </div>
        
        <nav className="top-nav" aria-label="Video service navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button 
                key={item.id}
                className={`nav-link ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
                disabled={!videoId && item.id !== 'dashboard'}
              >
                <Icon size={18} /> {item.label}
              </button>
            );
          })}
        </nav>
      </header>
      
      <main className="app-main">
        {!videoId ? (
          <section className="upload-section" aria-label="Upload video">
            <div className="intro-panel">
              <div className="eyebrow">
                <Sparkles size={16} />
                Media processing console
              </div>
              <h1>Professional video operations, ready for your next service layer.</h1>
              <p>
                Upload once, then move toward HLS playback, compression, GIF creation,
                summaries, watermarking and smart downloads from the same workflow.
              </p>
              <div className="metric-row" aria-label="Platform capabilities">
                <span><CloudUpload size={16} /> Direct S3 ingest</span>
                <span><Activity size={16} /> BullMQ worker flow</span>
                <span><ShieldCheck size={16} /> CDN-ready HLS</span>
              </div>
            </div>

            <div className="glass-panel upload-panel">
              <div className="panel-heading">
                <span>New Asset</span>
                <strong>Upload Video</strong>
              </div>
              <UploadWidget onUploadComplete={(id) => {
                openVideo(id);
              }} />
            </div>

            <div className="glass-panel recent-panel">
              <div className="panel-heading">
                <span>Recent Queue</span>
                <strong>Your Videos</strong>
              </div>

              {recentError ? (
                <div className="recent-empty">
                  <p>{recentError}</p>
                  <button className="btn btn-secondary" type="button" onClick={loadRecentVideos}>
                    <RefreshCw size={18} /> Retry
                  </button>
                </div>
              ) : recentVideos.length === 0 ? (
                <div className="recent-empty">
                  <p>Uploaded videos will stay available here after queueing.</p>
                </div>
              ) : (
                <div className="recent-list">
                  {recentVideos.map((video) => (
                    <button
                      key={video.videoId}
                      className="recent-video"
                      type="button"
                      onClick={() => openVideo(video.videoId)}
                    >
                      <span className={`status-badge ${video.status.toLowerCase()}`}>
                        {video.status === 'completed' && <CheckCircle2 size={14} />}
                        {video.status}
                      </span>
                      <strong>{video.originalName}</strong>
                      <span>{formatBytes(video.sizeBytes)} • {new Date(video.uploadedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      <code>{video.videoId}</code>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : (
          <Dashboard 
            videoId={videoId} 
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onUploadNew={() => {
              setVideoId(null);
              setActiveTab('dashboard');
            }} 
          />
        )}
      </main>
    </div>
  );
}

export default App;
