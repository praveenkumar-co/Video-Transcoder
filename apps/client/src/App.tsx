import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import 'finisher-header';
import { UploadWidget } from './components/UploadWidget';
import { VideoPlayer } from './components/VideoPlayer';
import { AnimatedLogo } from './components/AnimatedLogo';
import { ContactUs } from './components/ContactUs';
import { FeedbackUs } from './components/FeedbackUs';
import { AuthOverlay } from './components/AuthOverlay';
import { getProfileAPI, signoutAPI, updateProfileAPI, getUserVideosAPI, checkUsernameAPI } from './api/auth.api';
import {
  listVideos,
  getVideoStatus,
  triggerTranscode,
  triggerCompress,
  triggerConvert,
  triggerExtractAudio,
  triggerTrim,
  triggerDownloadUrl,
  triggerThumbnail,
  deleteVideo,
  getVideoDownloadUrlAPI,
} from './api/upload.api';
import { VideoMetaData } from './types';
import { API_BASE } from './api/config';
import {
  ArrowRight,
  BarChart3,
  Bot,
  ChevronDown,
  CloudUpload,
  Download,
  ExternalLink,
  FileVideo,
  FolderDown,
  Gauge,
  Image,
  Globe2,
  Link,
  LogOut,
  Mail,
  Moon,
  Music,
  Palette,
  PlayCircle,
  RefreshCw,
  Scissors,
  Settings,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  TvMinimalPlay,
  Trash2,
  Upload,
  UsersRound,
  Video,
  Wand2,
  X,
  Zap,
  LayoutGrid,
  Minimize2,
  Clapperboard,
  AudioLines,
  Scissors as ScissorsIcon,
  ArrowDownToLine,
  Check,
  Lock,
} from 'lucide-react';
import apiIconUrl from './icons/api.svg?url';
import audioIconUrl from './icons/audio-svgrepo-com.svg?url';
import cdnIconUrl from './icons/cdn.svg?url';
import compressIconUrl from './icons/compress-svgrepo-com.svg?url';
import conversionIconUrl from './icons/conversion-svgrepo-com.svg?url';
import hlsIconUrl from './icons/Hls-Fill--Streamline-Rounded-Fill-Streamline-Material.png?url';
import mediaPipelineIconUrl from './icons/data-pipeline.svg?url';
import reviewIconUrl from './icons/review.svg?url';
import subtitlesIconUrl from './icons/player-subtitle-svgrepo-com.svg?url';
import trimIconUrl from './icons/trim-svgrepo-com.svg?url';
import videoAnalyticsIconUrl from './icons/video-player-streaming-svgrepo-com.svg?url';
import videoEditorIconUrl from './icons/Video-Edit-Cut--Streamline-Ultimate.svg?url';
import videoSummariesIconUrl from './icons/Video-Player-Movie-2--Streamline-Ultimate.svg?url';
import forgeGlowAnimationUrl from './features/messageblocksmoving-intimframe.json?url';

// ─── Types ──────────────────────────────────────────────────────────────────
export type PageView =
  | 'home'
  | 'trial'          // Start Free Trial → GSAP dock page
  | 'compress'
  | 'download'
  | 'transcode'
  | 'ops'
  | 'clipexport'
  | 'thumbnail'
  | 'library'
  | 'settings'
  | 'pricing'
  | 'profile'
  | 'contact'
  | 'feedback';

// Legacy compatibility export used by Dashboard.tsx
export type TabType = 'dashboard' | 'play' | 'compress' | 'gif' | 'download';

type CompressSourceTab = 'upload' | 'cloud' | 'url' | 'library';

interface CompressOutputRecord {
  videoId: string;
  originalName: string;
  sizeBytes: number;
  outputUrl?: string;
  targetSizeMB: number;
  upscale: boolean;
  completedAt: string;
}

type LibraryFilter = 'all' | 'compress' | 'transcode' | 'convert' | 'audio' | 'trim' | 'download';

// Generic output record for all service pages
interface ServiceOutputRecord {
  videoId: string;
  originalName: string;
  outputUrl?: string;
  masterPlaylistUrl?: string;
  sizeBytes?: number;
  jobType: string;
  extra?: Record<string, string | number | boolean>;
  queuedAt: string;
}

type ThemeMode = 'midnight' | 'daylight';

interface ProfileState {
  name: string;
  email: string;
  username?: string;
  avatarInitials: string;
  avatarUrl?: string;
  role?: 'free' | 'premium';
  signedIn: boolean;
  theme: ThemeMode;
}

// ─── Tool registry ───────────────────────────────────────────────────────────
const navTools = [
  { key: 'compress' as PageView,    label: 'Compress',      caption: 'Reduce file size',      icon: Gauge,           jobType: 'compress'   },
  { key: 'download' as PageView,    label: 'Download URL',  caption: 'Fetch public videos',   icon: FolderDown,      jobType: 'download'   },
  { key: 'transcode' as PageView,   label: 'HLS Transcode', caption: 'Upload and stream',     icon: Video,           jobType: 'transcode'  },
  { key: 'ops' as PageView,         label: 'Media Tools',   caption: 'Trim, convert, audio',  icon: SlidersHorizontal, jobType: 'ops'      },
  { key: 'clipexport' as PageView,  label: 'Clip Export',   caption: 'Export video segments', icon: Scissors,        jobType: 'trim'       },
  { key: 'thumbnail' as PageView,   label: 'Thumbnail Gen', caption: 'Generate video cover',   icon: Image,           jobType: 'thumbnail'  },
  { key: 'library' as PageView,     label: 'My Videos',     caption: 'All uploads & outputs', icon: FileVideo,       jobType: 'all'        },
  { key: 'settings' as PageView,    label: 'Settings',      caption: 'Profile and theme',     icon: Settings,        jobType: 'settings'   },
];

// Dock tool list for the "Start Free Trial" GSAP page
const dockTools = [
  { key: 'compress'   as PageView, label: 'Compress',      icon: Gauge,             emoji: '⚡' },
  { key: 'download'   as PageView, label: 'Download URL',  icon: FolderDown,        emoji: '⬇️' },
  { key: 'transcode'  as PageView, label: 'HLS Transcode', icon: Video,             emoji: '🎬' },
  { key: 'ops'        as PageView, label: 'Media Tools',   icon: SlidersHorizontal, emoji: '🎛️' },
  { key: 'clipexport' as PageView, label: 'Clip Export',   icon: Scissors,          emoji: '✂️' },
  { key: 'thumbnail'  as PageView, label: 'Thumbnail Gen', icon: Image,             emoji: '🖼️' },
  { key: 'library'    as PageView, label: 'My Videos',     icon: FileVideo,         emoji: '📁' },
  { key: 'settings'   as PageView, label: 'Settings',      icon: Settings,          emoji: '⚙️' },
];

const defaultProfile: ProfileState = {
  name: 'VideoForge User',
  email: 'user@example.com',
  avatarInitials: 'VU',
  signedIn: false,
  theme: 'daylight',
};

const marqueeApps = [
  { label: 'Compress',  imageSrc: compressIconUrl },
  { label: 'Trim', imageSrc: trimIconUrl },
  { label: 'Convert',  imageSrc: conversionIconUrl },
  { label: 'Audio', imageSrc: audioIconUrl },
  { label: 'HLS Streaming', imageSrc: hlsIconUrl },
  { label: 'Multi-Bitrate Encoding', imageSrc: videoEditorIconUrl },
  { label: 'Auto Subtitles', imageSrc: subtitlesIconUrl },
  { label: 'Video Summaries',  imageSrc: videoSummariesIconUrl },
  { label: 'Smart Cropping',  imageSrc: videoEditorIconUrl },
  { label: 'Video Analytics',  imageSrc: videoAnalyticsIconUrl },
  { label: 'CDN Delivery',  imageSrc: cdnIconUrl },
  { label: 'Developer API', imageSrc: apiIconUrl },
  { label: 'Media Pipelines', imageSrc: mediaPipelineIconUrl },
  { label: 'Content Moderation',  imageSrc: reviewIconUrl },
];

function createDefaultServiceImageSrc(color: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
      <rect width="72" height="72" rx="18" fill="${color}"/>
      <circle cx="53" cy="18" r="14" fill="rgba(255,255,255,0.2)"/>
      <circle cx="18" cy="54" r="16" fill="rgba(0,0,0,0.11)"/>
      <path d="M22 24h28v24H22z" rx="7" fill="rgba(255,255,255,0.2)"/>
      <path d="M32 29l15 7-15 7V29z" fill="#ffffff"/>
    </svg>
  `;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function AppIconMarquee() {
  const duplicatedApps = [...marqueeApps, ...marqueeApps];

  return (
    <section className="app-icon-marquee-section" aria-label="VideoForge app tools">
      <div className="app-icon-marquee-container">
        <div className="app-icon-marquee-track">
          {duplicatedApps.map((app, index) => (
            <div className="app-icon-wrapper" key={`${app.label}-${index}`}>
              <div className="app-icon-box" style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}>
                <img
                  src={app.imageSrc || createDefaultServiceImageSrc('#3b82f6')}
                  alt={`${app.label} service`}
                />
              </div>
              <span className="app-icon-label">{app.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || 'VU';
}

function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  } else {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'absolute';
    textArea.style.opacity = '0';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, 99999);
    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        return Promise.resolve();
      } else {
        window.prompt("Copy this share link:", text);
        return Promise.resolve();
      }
    } catch (err) {
      if (document.body.contains(textArea)) {
        document.body.removeChild(textArea);
      }
      window.prompt("Copy this share link:", text);
      return Promise.resolve();
    }
  }
}

function formatRelativeTime(dateInput: string | Date): string {
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return 'unknown date';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'unknown date';
  }
}

function triggerBlobDownload(
  url: string,
  originalName?: string,
  showStatusCallback?: (text: string, type?: 'success' | 'error' | 'info') => void
) {
  let downloadUrl = url;
  if (url.toLowerCase().includes('.m3u8')) {
    if (url.endsWith('index.m3u8')) {
      downloadUrl = url.replace('index.m3u8', 'video.mp4');
    } else if (url.endsWith('master.m3u8')) {
      downloadUrl = url.replace('master.m3u8', '0/video.mp4');
    } else {
      const lastSlash = url.lastIndexOf('/');
      downloadUrl = url.substring(0, lastSlash) + '/video.mp4';
    }
  }

  if (showStatusCallback) {
    showStatusCallback('Preparing download...', 'info');
  }

  fetch(downloadUrl)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.blob();
    })
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      
      let filename = 'video.mp4';
      if (originalName) {
        const cleanName = originalName.replace(/[^a-zA-Z0-9_-]/g, '_');
        filename = `${cleanName}.mp4`;
      } else {
        filename = downloadUrl.split('/').pop() || 'video.mp4';
        if (!filename.endsWith('.mp4')) filename += '.mp4';
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      if (showStatusCallback) {
        showStatusCallback('Download started!', 'success');
      }
    })
    .catch((err) => {
      console.warn('Fetch download failed:', err);
      const is403 = err?.message?.includes('HTTP 403');
      if (is403) {
        if (showStatusCallback) {
          showStatusCallback('MP4 not found on S3. (Older transcodes lack MP4s — please re-transcode).', 'error');
        }
      } else {
        if (showStatusCallback) {
          showStatusCallback('CORS restriction or network issue. Opening file in new tab...', 'info');
        }
        window.open(downloadUrl, '_blank');
      }
    });
}

declare const gsap: any;

function GsapDock({ onSelectTool }: { onSelectTool: (key: PageView) => void }) {
  const dockRef = useRef<HTMLUListElement>(null);
  const itemsRef = useRef<HTMLLIElement[]>([]);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

  const MIN = 56;
  const MAX = 130;
  const BOUND = MIN * Math.PI;

  useEffect(() => {
    const dock = dockRef.current;
    if (!dock || !itemsRef.current.length) return;
    if (typeof gsap === 'undefined') return;

    gsap.set(itemsRef.current, { transformOrigin: '50% 120%', height: 52 });
    gsap.set(dock, { position: 'relative', height: 72 });

    // Entry animation — items pop in from below
    gsap.from(itemsRef.current, {
      duration: 0.7,
      y: 80,
      opacity: 0,
      scale: 0.5,
      stagger: 0.06,
      ease: 'back.out(1.8)',
    });

    const handleMove = (e: MouseEvent) => {
      const first = itemsRef.current[0];
      if (!first) return;
      const offset = dock.getBoundingClientRect().left + first.offsetLeft;
      updateIcons(e.clientX - offset);
    };

    const handleLeave = () => {
      gsap.to(itemsRef.current, { duration: 0.35, scale: 1, x: 0, ease: 'power2.out' });
      setHoveredLabel(null);
    };

    dock.addEventListener('mousemove', handleMove);
    dock.addEventListener('mouseleave', handleLeave);
    return () => {
      dock.removeEventListener('mousemove', handleMove);
      dock.removeEventListener('mouseleave', handleLeave);
    };
  }, []);

  function updateIcons(pointer: number) {
    itemsRef.current.forEach((icon, i) => {
      const distance = i * MIN + MIN / 2 - pointer;
      let x = 0, scale = 1;
      if (-BOUND < distance && distance < BOUND) {
        const rad = (distance / MIN) * 0.5;
        scale = 1 + (MAX / MIN - 1) * Math.cos(rad);
        x = 2 * (MAX - MIN) * Math.sin(rad);
      } else {
        x = (-BOUND < distance ? 2 : -2) * (MAX - MIN);
      }
      gsap.to(icon, { duration: 0.25, x, scale, ease: 'power2.out' });
    });
  }

  return (
    <div className="gsap-dock-wrapper">
      {hoveredLabel && <div className="dock-label-tooltip">{hoveredLabel}</div>}
      <ul className="gsap-dock-toolbar" ref={dockRef}>
        {dockTools.map((tool, i) => {
          const Icon = tool.icon;
          return (
            <li
              key={tool.key}
              className="gsap-dock-item"
              ref={el => { if (el) itemsRef.current[i] = el; }}
              onMouseEnter={() => setHoveredLabel(tool.label)}
              onMouseLeave={() => setHoveredLabel(null)}
              onClick={() => onSelectTool(tool.key)}
            >
              <button className="gsap-dock-btn" aria-label={tool.label}>
                <span className="dock-icon-inner">
                  <Icon size={24} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Service Action Bar ─────────────────────────────────────────────────────
function ServiceActionBar({
  outputUrl,
  outputStatus,
  videoName,
  onView,
  onShare,
  onDownload,
}: {
  outputUrl?: string | null;
  outputStatus?: string;
  videoName?: string;
  onView: () => void;
  onShare: () => void;
  onDownload?: () => void;
}) {
  const canAct = !!outputUrl && outputStatus === 'completed';
  const isProcessing = outputStatus === 'processing' || outputStatus === 'queued';

  return (
    <div className="service-action-bar">
      <div className="sab-left">
        <span className="sab-label">
          {isProcessing ? (
            <><RefreshCw size={12} className="pulse-anim" /> Processing…</>
          ) : canAct ? (
            <><PlayCircle size={12} /> {videoName || 'Output ready'}</>
          ) : (
            <><FileVideo size={12} /> Run a job to unlock actions</>
          )}
        </span>
      </div>
      <div className="sab-actions">
        {/* View */}
        <button
          className={`sab-btn view ${canAct ? '' : 'disabled'}`}
          disabled={!canAct}
          onClick={onView}
          title="Watch output video"
        >
          <PlayCircle size={14} />
          View
        </button>

        {/* Download */}
        <button
          className={`sab-btn download ${canAct ? '' : 'disabled'}`}
          disabled={!canAct}
          onClick={onDownload}
          title="Download output file"
        >
          <Download size={14} />
          Download
        </button>

        {/* Share */}
        <button
          className={`sab-btn share ${canAct ? '' : 'disabled'}`}
          disabled={!canAct}
          onClick={onShare}
          title="Copy link to clipboard"
        >
          <Share2 size={14} />
          Share
        </button>
      </div>
    </div>
  );
}

function extractVideoIdFromUrl(url: string): string | null {
  const match = url.match(/\/processed\/([a-f0-9-]{36})\//i);
  return match ? match[1] : null;
}

// ─── Social Share Dropdown ────────────────────────────────────────────────────
function ShareDropdown({
  shareUrl,
  videoTitle,
  onCopied,
}: {
  shareUrl: string;
  videoTitle?: string;
  onCopied?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const title = encodeURIComponent(videoTitle || 'Check out this video');
  const encodedUrl = encodeURIComponent(shareUrl);

  const shareOptions = [
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      color: '#25D366',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12.004 0C5.374 0 0 5.373 0 12c0 2.117.554 4.107 1.523 5.832L.057 23.887l6.209-1.63A11.935 11.935 0 0012.004 24C18.629 24 24 18.627 24 12S18.629 0 12.004 0zm0 21.818a9.818 9.818 0 01-5.002-1.37l-.36-.214-3.685.967.983-3.596-.235-.368A9.82 9.82 0 012.18 12c0-5.42 4.404-9.818 9.824-9.818 5.42 0 9.818 4.398 9.818 9.818 0 5.42-4.398 9.818-9.818 9.818z"/>
        </svg>
      ),
      href: `https://wa.me/?text=${title}%0A${encodedUrl}`,
    },
    {
      id: 'twitter',
      label: 'X (Twitter)',
      color: '#000000',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      href: `https://twitter.com/intent/tweet?text=${title}&url=${encodedUrl}`,
    },
    {
      id: 'email',
      label: 'Email',
      color: '#6366f1',
      icon: <Mail size={15} />,
      href: `mailto:?subject=${title}&body=Watch%20this%20video%3A%0A${encodedUrl}`,
    },
  ];

  const handleCopy = () => {
    copyToClipboard(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (onCopied) onCopied();
      setOpen(false);
    });
  };

  return (
    <div className="share-dropdown-wrap" ref={ref}>
      <button
        className="modal-action-btn share-trigger"
        onClick={() => setOpen(o => !o)}
        title="Share this video"
      >
        <Share2 size={14} /> Share
      </button>
      {open && (
        <div className="share-dropdown-menu">
          <div className="share-dropdown-header">Share via</div>
          {shareOptions.map(opt => (
            <a
              key={opt.id}
              href={opt.href}
              target="_blank"
              rel="noopener noreferrer"
              className="share-option"
              onClick={() => setOpen(false)}
            >
              <span className="share-option-icon" style={{ color: opt.color }}>
                {opt.icon}
              </span>
              <span>{opt.label}</span>
            </a>
          ))}
          <hr className="share-divider" />
          <button className="share-option copy" onClick={handleCopy}>
            <span className="share-option-icon">
              {copied ? <Check size={15} color="#22c55e" /> : <Link size={15} />}
            </span>
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function VideoPlayModalInner({
  url,
  video,
  preferredResolution,
  onClose,
  onDeleteVideo,
  showStatus,
  activeSection,
  onDownloadVideo,
}: {
  url: string;
  video: VideoMetaData | null;
  preferredResolution?: string;
  onClose: () => void;
  onDeleteVideo?: (videoId: string, section?: string) => Promise<void>;
  showStatus?: (text: string, type?: 'success' | 'error' | 'info') => void;
  activeSection?: string;
  onDownloadVideo?: (videoId: string, originalName?: string, resolution?: string) => void;
}) {
  const [currentPlayUrl, setCurrentPlayUrl] = useState(url);
  const [currentResName, setCurrentResName] = useState(preferredResolution || 'Auto');

  const handleResChange = useCallback((name: string, index: number, playUrl: string) => {
    setCurrentPlayUrl(playUrl);
    setCurrentResName(name);
  }, []);

  const handleShare = () => {
    copyToClipboard(currentPlayUrl)
      .then(() => {
        if (showStatus) showStatus('Link copied to clipboard!', 'success');
      })
      .catch(() => {
        if (showStatus) showStatus('Failed to copy link', 'error');
      });
  };

  const handleDownload = () => {
    const vidId = video?.videoId || extractVideoIdFromUrl(currentPlayUrl);
    if (vidId && onDownloadVideo) {
      onDownloadVideo(vidId, video?.originalName, currentResName);
    } else {
      triggerBlobDownload(currentPlayUrl, video?.originalName, showStatus);
    }
  };

  const handleDelete = async () => {
    const vidId = video?.videoId || extractVideoIdFromUrl(currentPlayUrl);
    if (!vidId || !onDeleteVideo) return;
    const isIsolated = activeSection && activeSection !== 'all';
    const originalName = video?.originalName || 'this video';
    const confirmMsg = isIsolated
      ? `Are you sure you want to remove "${originalName}" from the ${activeSection} section? (It will still remain in All Videos)`
      : `Are you sure you want to delete "${originalName}" permanently from all sections?`;
    if (window.confirm(confirmMsg)) {
      try {
        await onDeleteVideo(vidId, activeSection);
        onClose();
        if (showStatus) {
          showStatus(isIsolated ? 'Removed from this section.' : 'Video deleted permanently.', 'success');
        }
      } catch (err: any) {
        if (showStatus) showStatus(err.message || 'Failed to delete video', 'error');
      }
    }
  };

  const formatBytes = (b: number) => {
    if (!b) return '0 B';
    const s = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(b) / Math.log(1024));
    return `${(b / Math.pow(1024, i)).toFixed(1)} ${s[i]}`;
  };

  const hasDeleteTarget = !!video || !!extractVideoIdFromUrl(currentPlayUrl);

  return (
    <>
      <VideoPlayer 
        url={url} 
        preferredResolution={preferredResolution} 
        onResolutionChange={handleResChange} 
      />
      <div className="video-modal-control-bar">
        <div className="video-modal-info">
          <div className="video-modal-title" title={video?.originalName}>
            {video?.originalName || 'Playing Video'}
          </div>
          <div className="video-modal-meta">
            {video?.sizeBytes ? <span>{formatBytes(video.sizeBytes)}</span> : null}
            {video?.sizeBytes ? <span className="dot">•</span> : null}
            <span>Playing: <span className="video-modal-res-badge">{currentResName}</span></span>
          </div>
        </div>
        <div className="video-modal-actions">
          <ShareDropdown
            shareUrl={currentPlayUrl}
            videoTitle={video?.originalName}
            onCopied={() => showStatus && showStatus('Link copied!', 'success')}
          />
          <button className="modal-action-btn primary" onClick={handleDownload} title="Download resolution file/playlist">
            <Download size={14} /> Download
          </button>
          {hasDeleteTarget && onDeleteVideo && (
            <button className="modal-action-btn danger" onClick={handleDelete} title="Delete video permanently">
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Feature Page Wrapper ─────────────────────────────────────────────────────
function FeaturePage({
  tool,
  children,
  history,
  historyLabel,
  onBack,
  onRefresh,
  selectedVideo,
  onSelectVideo,
  activePlayUrl,
  setActivePlayUrl,
  activePlayResolution,
  activePlayVideo,
  setActivePlayVideo,
  onDeleteVideo,
  showStatus,
  onDownloadVideo,
  fullWidth,
}: {
  tool: typeof navTools[0];
  children: React.ReactNode;
  history: VideoMetaData[];
  historyLabel: string;
  onBack: () => void;
  onRefresh: () => void;
  selectedVideo: VideoMetaData | null;
  onSelectVideo: (v: VideoMetaData | null) => void;
  activePlayUrl?: string | null;
  setActivePlayUrl?: (url: string | null) => void;
  activePlayResolution?: string;
  activePlayVideo?: VideoMetaData | null;
  setActivePlayVideo?: (video: VideoMetaData | null) => void;
  onDeleteVideo?: (videoId: string) => Promise<void>;
  showStatus?: (text: string, type?: 'success' | 'error' | 'info') => void;
  onDownloadVideo?: (videoId: string, originalName?: string, resolution?: string) => void;
  fullWidth?: boolean;
}) {
  const Icon = tool.icon;

  return (
    <div className="feature-page animate-page-in">
      {/* Feature Page Header */}
      <header className="feature-page-header">
        <button className="feature-back-btn" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <div className="feature-page-title">
          <span className="feature-page-icon"><Icon size={18} /></span>
          <strong>{tool.label}</strong>
          <span className="feature-page-caption">{tool.caption}</span>
        </div>
      </header>

      <div className="feature-page-body">
        {/* Left: Tool Form */}
        <section className="feature-page-main" style={{ maxWidth: fullWidth ? '1140px' : '840px', margin: '0 auto', width: '100%' }}>
          {children}
        </section>
      </div>

      {/* VIDEO MODAL OVERLAY */}
      {activePlayUrl && setActivePlayUrl && createPortal(
        <div className="video-modal-overlay" onClick={() => { setActivePlayUrl(null); if (setActivePlayVideo) setActivePlayVideo(null); }}>
          <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="video-modal-close" onClick={() => { setActivePlayUrl(null); if (setActivePlayVideo) setActivePlayVideo(null); }}>×</button>
            <div className="video-modal-body">
              <VideoPlayModalInner
                url={activePlayUrl}
                video={activePlayVideo || null}
                preferredResolution={activePlayResolution}
                onClose={() => { setActivePlayUrl(null); if (setActivePlayVideo) setActivePlayVideo(null); }}
                onDeleteVideo={onDeleteVideo}
                showStatus={showStatus}
                onDownloadVideo={onDownloadVideo}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
// ─── Video Selector Search Bar Component ──────────────────────────────────────
function VideoSelector({
  allVideos,
  selectedVideo,
  onSelectVideo,
  placeholder = "Search video by name...",
  onDeleteVideo
}: {
  allVideos: VideoMetaData[];
  selectedVideo: VideoMetaData | null;
  onSelectVideo: (v: VideoMetaData | null) => void;
  placeholder?: string;
  onDeleteVideo?: (videoId: string) => Promise<void> | void;
}) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = allVideos.filter(v => 
    v.originalName?.toLowerCase().includes(search.toLowerCase()) ||
    v.videoId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={wrapperRef} className="video-selector-container" style={{ position: 'relative', width: '100%' }}>
      <div className="video-selector-input-wrapper" style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          className="text-input"
          placeholder={placeholder}
          value={selectedVideo ? selectedVideo.originalName : search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (selectedVideo) {
              onSelectVideo(null); // Clear selection if typing
            }
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          style={{ paddingRight: selectedVideo ? '40px' : '12px' }}
        />
        {selectedVideo && (
          <button 
            className="btn btn-secondary" 
            type="button"
            style={{ padding: '0 14px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
            onClick={() => {
              onSelectVideo(null);
              setSearch('');
            }}
          >
            Clear Selected
          </button>
        )}
      </div>

      {isOpen && !selectedVideo && (
        <div 
          className="video-selector-dropdown" 
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'var(--card-bg, #fff)',
            border: '1px solid var(--border-color, rgba(0,0,0,0.1))',
            borderRadius: '8px',
            maxHeight: '220px',
            overflowY: 'auto',
            zIndex: 150,
            marginTop: '4px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
          }}
        >
          {filtered.length > 0 ? (
            filtered.map(v => (
              <div
                key={v.videoId}
                className="video-selector-item"
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border-color, rgba(0,0,0,0.05))',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'background 0.15s'
                }}
                onClick={() => {
                  onSelectVideo(v);
                  setIsOpen(false);
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left', flex: 1, minWidth: 0 }}>
                  <div style={{ width: '40px', height: '24px', borderRadius: '4px', background: '#121212', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {v.thumbnailUrl ? (
                      <img src={v.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <FileVideo size={12} style={{ color: 'rgba(255,255,255,0.4)' }} />
                    )}
                  </div>
                  <div style={{ display: 'grid', minWidth: 0 }}>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-color, #0f172a)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.originalName}</strong>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      {new Date(v.uploadedAt).toLocaleDateString()} · {v.sizeBytes && v.sizeBytes > 0 ? (v.sizeBytes / (1024*1024)).toFixed(1) : '0.0'} MB
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                  <span className={`stat-tag ${v.status}`} style={{ fontSize: '0.65rem' }}>
                    {v.status}
                  </span>
                  {onDeleteVideo && (
                    <button
                      type="button"
                      title="Delete Video"
                      style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                      onMouseOver={(e) => (e.currentTarget.style.color = '#ef4444')}
                      onMouseOut={(e) => (e.currentTarget.style.color = '#94a3b8')}
                      onClick={async () => {
                        if (window.confirm(`Are you sure you want to delete "${v.originalName || 'this video'}"?`)) {
                          await onDeleteVideo(v.videoId);
                        }
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '14px', fontSize: '0.85rem', color: '#64748b', textAlign: 'center' }}>
              No videos found
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ─── Dropdown Options ────────────────────────────────────────────────────────
const toolsMegaOptions = [
  { key: 'compress' as PageView,    label: 'Video Compressor',  caption: 'Target direct-size and bitrate reduction', icon: Gauge, status: 'Active' },
  { key: 'transcode' as PageView,   label: 'HLS Master Transcode', caption: 'Generate streaming indices & TS chunks', icon: Video, status: 'Active' },
  { key: 'ops' as PageView,         label: 'Format Converter',  caption: 'Export as MP4, WebM, MOV, AVI, MKV', icon: SlidersHorizontal, status: 'Active' },
  { key: 'ops' as PageView,         label: 'Audio Extractor',   caption: 'Separate high-fidelity MP3 or WAV tracks', icon: Music, status: 'Active' },
  { key: 'clipexport' as PageView,  label: 'Clip Export & Trim', caption: 'Extract segments and clips from tracks', icon: Scissors, status: 'Active' },
  { key: 'compress' as PageView,    label: 'AI Subtitles & Captions', caption: 'Automated high-accuracy whisper translation', icon: Wand2, status: 'Premium' },
  { key: 'compress' as PageView,    label: 'Video Watermarking', caption: 'Inject custom corporate branding overlays', icon: ShieldCheck, status: 'Premium' },
  { key: 'thumbnail' as PageView,   label: 'Thumbnail Generator', caption: 'Extract custom thumbnail images from video', icon: Image, status: 'Active' },
];

const resourcesOptions = [
  { label: 'API Documentation', caption: 'Integrate VideoForge in your scripts', icon: Globe2, url: 'https://github.com/praveenkumar-co/Video-Transcoder' },
  { label: 'FFmpeg Encoding Guide', caption: 'Best practices for web rendering', icon: SlidersHorizontal, url: 'https://ffmpeg.org/documentation.html' },
  { label: 'System Status', caption: 'Check processing cluster loads', icon: ShieldCheck, url: 'https://status.videoforge.dev' },
  { label: 'Developer Changelog', caption: 'Track recently compiled worker nodes', icon: Sparkles, url: 'https://changelog.videoforge.dev' }
];

// ─── Main App ────────────────────────────────────────────────────────────────
function App() {
  const [page, setPage] = useState<PageView>(() => {
    try {
      const saved = localStorage.getItem('vf-current-page');
      const validPages: PageView[] = [
        'home', 'trial', 'compress', 'download', 'transcode', 
        'ops', 'clipexport', 'thumbnail', 'library', 'settings', 
        'pricing', 'profile', 'contact', 'feedback'
      ];
      return saved && validPages.includes(saved as PageView) ? (saved as PageView) : 'home';
    } catch {
      return 'home';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('vf-current-page', page);
    } catch (e) {
      console.error('Failed to save page state:', e);
    }
  }, [page]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-wrapper')) {
        setIsToolsDropdownOpen(false);
        setIsResourcesDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState(false);
  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const finisherCleanupsRef = useRef<(() => void)[]>([]);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isResourcesDropdownOpen, setIsResourcesDropdownOpen] = useState(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState<'general' | 'videos' | 'appearance' | 'storage' | 'billing' | 'api' | 'security' | 'integrations'>('general');
  const [revolverActiveIndex, setRevolverActiveIndex] = useState(0);

  const [allVideos, setAllVideos] = useState<VideoMetaData[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoMetaData | null>(null);
  const [activePlayUrl, _setActivePlayUrl] = useState<string | null>(null);
  const [activePlayResolution, setActivePlayResolution] = useState<string | undefined>(undefined);
  const [activePlayVideo, setActivePlayVideo] = useState<VideoMetaData | null>(null);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [hiddenSectionVideos, setHiddenSectionVideos] = useState<Record<string, string[]>>(() => {
    try {
      const stored = localStorage.getItem('vf-hidden-section-videos');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const hideVideoFromSection = (videoId: string, section: string) => {
    setHiddenSectionVideos(prev => {
      const updated = { ...prev };
      const existing = updated[videoId] || [];
      if (!existing.includes(section)) {
        updated[videoId] = [...existing, section];
      }
      localStorage.setItem('vf-hidden-section-videos', JSON.stringify(updated));
      return updated;
    });
  };

  const setActivePlayUrl = (url: string | null) => {
    _setActivePlayUrl(url);
    if (!url) {
      setActivePlayVideo(null);
    } else {
      const match = allVideos.find(v => v.outputUrl === url || v.masterPlaylistUrl === url);
      setActivePlayVideo(match || null);
    }
  };

  const [compressSize, setCompressSize] = useState(25);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [transcodeResolution, setTranscodeResolution] = useState<string>('Auto');
  const [transcodeSourceTab, setTranscodeSourceTab] = useState<'upload' | 'cloud' | 'url' | 'library'>('upload');
  const [transcodeUrlInput, setTranscodeUrlInput] = useState('');
  const [transcodeIsProcessing, setTranscodeIsProcessing] = useState(false);
  const [convertFormat, setConvertFormat] = useState<'mp4' | 'webm' | 'mov' | 'avi' | 'mkv'>('mp4');
  const [audioFormat, setAudioFormat] = useState<'mp3' | 'wav' | 'aac'>('mp3');
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(30);
  const [thumbnailOffset, setThumbnailOffset] = useState(2);
  const [thumbnailIsProcessing, setThumbnailIsProcessing] = useState(false);
  const [thumbnailSourceTab, setThumbnailSourceTab] = useState<'upload' | 'cloud' | 'url' | 'library'>('upload');
  const [thumbnailUrlInput, setThumbnailUrlInput] = useState('');
  const [showThumbnailShareOptions, setShowThumbnailShareOptions] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // ─── Compress page state ────────────────────────────────────────────────────
  const [compressSourceTab, setCompressSourceTab] = useState<CompressSourceTab>('upload');
  const [compressUrlInput, setCompressUrlInput] = useState('');
  const [compressAiUpscale, setCompressAiUpscale] = useState(false);
  const [compressIsProcessing, setCompressIsProcessing] = useState(false);
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [showTcDownloadOptions, setShowTcDownloadOptions] = useState(false);
  const [showTcShareOptions, setShowTcShareOptions] = useState(false);
  const [showOpsShareOptions, setShowOpsShareOptions] = useState(false);
  const [showTrimShareOptions, setShowTrimShareOptions] = useState(false);
  const [shareUrlForModal, setShareUrlForModal] = useState<string | null>(null);
  const [compressOutputRecord, setCompressOutputRecord] = useState<CompressOutputRecord | null>(() => {
    try { const s = localStorage.getItem('vf-compress-output'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [thumbnailOutputRecord, setThumbnailOutputRecord] = useState<ServiceOutputRecord | null>(() => {
    try { const s = localStorage.getItem('vf-thumbnail-output'); return s ? JSON.parse(s) : null; } catch { return null; }
  });

  const hasStartedCompression = !!compressOutputRecord || compressIsProcessing;

  useEffect(() => {
    if (hasStartedCompression && compressSize < 25) {
      setCompressSize(25);
    }
  }, [hasStartedCompression, compressSize]);

  // ─── Per-page output records (persist across reloads) ─────────────────────
  const [transcodeOutputRecord, setTranscodeOutputRecord] = useState<ServiceOutputRecord | null>(() => {
    try { const s = localStorage.getItem('vf-transcode-output'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [convertOutputRecord, setConvertOutputRecord] = useState<ServiceOutputRecord | null>(() => {
    try { const s = localStorage.getItem('vf-convert-output'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [audioOutputRecord, setAudioOutputRecord] = useState<ServiceOutputRecord | null>(() => {
    try { const s = localStorage.getItem('vf-audio-output'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [trimOutputRecord, setTrimOutputRecord] = useState<ServiceOutputRecord | null>(() => {
    try { const s = localStorage.getItem('vf-trim-output'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [downloadOutputRecord, setDownloadOutputRecord] = useState<ServiceOutputRecord | null>(() => {
    try { const s = localStorage.getItem('vf-download-output'); return s ? JSON.parse(s) : null; } catch { return null; }
  });

  // ─── Library filter state ────────────────────────────────────────────────────
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>('all');


  const [profile, setProfile] = useState<ProfileState>(() => {
    const s = localStorage.getItem('videoforge-profile');
    const parsed = s ? JSON.parse(s) : {};
    return { ...defaultProfile, ...parsed, theme: 'daylight' };
  });

  // ─── Settings CRUD & Username validation state ──────────────────────────────
  const [settingsName, setSettingsName] = useState('');
  const [settingsUsername, setSettingsUsername] = useState('');
  const [settingsUsernameAvailable, setSettingsUsernameAvailable] = useState<boolean | null | 'checking'>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [userVideos, setUserVideos] = useState<VideoMetaData[]>([]);
  const [loadingUserVideos, setLoadingUserVideos] = useState(false);


  // ─── Data fetching ──────────────────────────────────────────────────────────
  const loadVideos = async () => {
    try { setAllVideos(await listVideos()); } catch {}
  };

  const handleDeleteVideo = async (videoId: string, section?: string) => {
    if (section && section !== 'all') {
      hideVideoFromSection(videoId, section);
    } else {
      await deleteVideo(videoId);
      if (selectedVideo?.videoId === videoId) setSelectedVideo(null);
      if (activePlayVideo?.videoId === videoId) {
        setActivePlayVideo(null);
        _setActivePlayUrl(null);
      }
      await loadVideos();
    }
  };

  useEffect(() => {
    document.documentElement.dataset.theme = 'daylight';
    localStorage.setItem('videoforge-profile', JSON.stringify({ ...profile, theme: 'daylight' }));
  }, [profile]);

  useEffect(() => {
    if (document.querySelector('script[data-videoforge-dotlottie]')) return;

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@dotlottie/player-component@latest/dist/dotlottie-player.mjs';
    script.type = 'module';
    script.dataset.videoforgeDotlottie = 'true';
    document.head.appendChild(script);
  }, []);
  useEffect(() => {
    try {
      // @ts-ignore
      const FinisherHeaderClass = (window as any).FinisherHeader;
      if (typeof FinisherHeaderClass !== 'undefined' && FinisherHeaderClass.prototype) {
        const proto = FinisherHeaderClass.prototype;
        
        // Patch gr to return a dummy element instead of throwing if elements are missing
        if (!proto.gr || !proto.gr.__patched) {
          const patchedGr = function(t: any) {
            try {
              const i = document.getElementsByClassName(t || "finisher-header");
              if (!i || !i.length) {
                return document.createElement('div');
              }
              return i[0];
            } catch {
              return document.createElement('div');
            }
          };
          (patchedGr as any).__patched = true;
          Object.defineProperty(proto, 'gr', {
            value: patchedGr,
            writable: true,
            configurable: true
          });
        }

        // Patch an to stop requestAnimationFrame loop when the canvas is unmounted
        if (!proto.an || !proto.an.__patched) {
          const originalAn = proto.an;
          const patchedAn = function(this: any) {
            if (this.c && !this.c.isConnected) {
              return;
            }
            if (originalAn) {
              originalAn.call(this);
            }
          };
          (patchedAn as any).__patched = true;
          Object.defineProperty(proto, 'an', {
            value: patchedAn,
            writable: true,
            configurable: true
          });
        }
      }
    } catch (e) {
      console.warn("Failed to patch FinisherHeader prototype:", e);
    }
  }, []);


  useEffect(() => {
    // Clean up previous event listeners
    finisherCleanupsRef.current.forEach(cleanup => {
      try {
        cleanup();
      } catch (e) { /* ignore */ }
    });
    finisherCleanupsRef.current = [];

    // Remove existing canvases from any finisher containers we manage
    const selectors = ['.finisher-header', '.finisher-header-top'];
    selectors.forEach(sel => {
      const el = document.querySelector(sel);
      if (el) {
        const existingCanvases = el.querySelectorAll('canvas');
        existingCanvases.forEach(c => c.remove());
      }
    });

    const config = {
      "count": 6,
      "size": { "min": 1100, "max": 1300, "pulse": 0 },
      "speed": { "x": { "min": 0.1, "max": 0.3 }, "y": { "min": 0.1, "max": 0.3 } },
      "colors": { "background": "#9138e5", "particles": ["#6bd6ff", "#ffcb57", "#ff333d"] },
      "blending": "overlay",
      "opacity": { "center": 1, "edge": 0.1 },
      "skew": -2,
      "shapes": ["c"]
    };

    try {
      // @ts-ignore
      const FinisherHeaderClass = (window as any).FinisherHeader;
      if (typeof FinisherHeaderClass !== 'undefined') {
        const originalAddEventListener = window.addEventListener;
        const captured: { type: string; listener: any; options: any }[] = [];

        // Temporarily intercept window.addEventListener to capture the resize listener registered by FinisherHeader constructor
        window.addEventListener = function(type: string, listener: any, options?: any) {
          if (type === 'resize') {
            captured.push({ type, listener, options });
          }
          return originalAddEventListener.call(this, type, listener, options);
        };

        if (document.querySelector('.finisher-header-top')) {
          try {
            // @ts-ignore
            new FinisherHeaderClass({ ...config, className: 'finisher-header-top' });
          } catch (e) { /* ignore */ }
        }

        if (document.querySelector('.finisher-header')) {
          try {
            // @ts-ignore
            new FinisherHeaderClass({ ...config, className: 'finisher-header' });
          } catch (e) { /* ignore */ }
        }

        // Restore window.addEventListener
        window.addEventListener = originalAddEventListener;

        // Save cleanup function for captured listeners
        if (captured.length > 0) {
          finisherCleanupsRef.current.push(() => {
            captured.forEach(({ type, listener, options }) => {
              window.removeEventListener(type, listener, options);
            });
          });
        }
      }
    } catch (err) {
      console.error("FinisherHeader initialization error:", err);
    }

    return () => {
      finisherCleanupsRef.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (e) { /* ignore */ }
      });
      finisherCleanupsRef.current = [];
    };
  }, [page]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await getProfileAPI();
        const user = response.user;
        const displayName = user.username || user.name;
        setProfile(prev => ({
          ...prev,
          name: user.name,
          email: user.email,
          username: user.username,
          avatarInitials: getInitials(displayName),
          // Only replace the stored avatar if the backend actually returned one;
          // otherwise keep whatever was loaded from localStorage so it survives reloads.
          avatarUrl: user.avatarUrl || prev.avatarUrl,
          role: user.role,
          signedIn: true,
          theme: 'daylight'
        }));
      } catch (err) {
        console.log("No active authentication session found:", err);
        setProfile(prev => ({ ...prev, signedIn: false }));
      }
    };
    checkAuth();
  }, []);

  // ─── General Settings fields sync ──────────────────────────────────────────
  useEffect(() => {
    if (page === 'settings') {
      setSettingsName(profile.name || '');
      setSettingsUsername(profile.username || '');
      setSettingsUsernameAvailable(null);
    }
  }, [page, profile.name, profile.username]);

  // ─── Real-time debounced username validation ───────────────────────────────
  useEffect(() => {
    if (!settingsUsername) {
      setSettingsUsernameAvailable(null);
      return;
    }
    
    const cleaned = settingsUsername.trim().toLowerCase();
    
    // If it matches their existing username, it is available (no check needed)
    if (cleaned === (profile.username || '').toLowerCase()) {
      setSettingsUsernameAvailable(null);
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,15}$/.test(cleaned)) {
      setSettingsUsernameAvailable(false);
      return;
    }

    setSettingsUsernameAvailable('checking');
    
    const debounceId = setTimeout(async () => {
      try {
        const available = await checkUsernameAPI(cleaned);
        setSettingsUsernameAvailable(available);
      } catch (err) {
        setSettingsUsernameAvailable(false);
      }
    }, 400);

    return () => clearTimeout(debounceId);
  }, [settingsUsername, profile.username]);

  // ─── Fetch user secure videos in Settings ──────────────────────────────────
  useEffect(() => {
    if (page === 'settings' && settingsActiveTab === 'videos') {
      const fetchUserVideos = async () => {
        setLoadingUserVideos(true);
        try {
          const videos = await getUserVideosAPI();
          setUserVideos(videos);
        } catch (err) {
          console.error("Failed to load user videos:", err);
        } finally {
          setLoadingUserVideos(false);
        }
      };
      fetchUserVideos();
    }
  }, [page, settingsActiveTab]);


  useEffect(() => {
    if (!profile.signedIn) return;
    loadVideos();
    const id = setInterval(loadVideos, 6000);
    return () => clearInterval(id);
  }, [profile.signedIn]);

  useEffect(() => {
    if (!selectedVideo || ['completed', 'failed'].includes(selectedVideo.status)) return;
    
    const token = localStorage.getItem('videoforge-token');
    const eventSource = new EventSource(`${API_BASE}/api/process/status/${selectedVideo.videoId}/live?token=${encodeURIComponent(token || '')}`, {
      withCredentials: true
    });
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        setSelectedVideo(prev => prev ? {
          ...prev,
          status: data.status,
          progress: data.progress,
          thumbnailUrl: data.thumbnailUrl,
          outputUrl: data.outputUrl,
        } : null);

        setAllVideos(prev => prev.map(v => v.videoId === selectedVideo.videoId ? {
          ...v,
          status: data.status,
          progress: data.progress,
          thumbnailUrl: data.thumbnailUrl,
          outputUrl: data.outputUrl,
        } : v));

        if (data.status === 'completed' || data.status === 'failed') {
          eventSource.close();
          loadVideos();
        }
      } catch (err) {
        console.error('[SSE] Failed to parse event:', err);
      }
    };

    eventSource.onerror = (err) => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [selectedVideo?.videoId, selectedVideo?.status]);

  // GSAP: VideoForge heading character animation
  useEffect(() => {
    if (page === 'home' || page === 'trial') {
      const chars = document.querySelectorAll('.vf-char');
      if (chars.length === 0) return;
      const ctx = gsap.context(() => {
        gsap.from('.vf-char', {
          y: 120,
          opacity: 0,
          rotateX: -90,
          stagger: 0.03,
          duration: 1,
          ease: 'expo.out',
        });
      });
      return () => ctx.revert();
    }
  }, [page]);

  // GSAP: Logo sparks floating + scale pulse glow animation
  useEffect(() => {
    const sparks = document.querySelectorAll('.logo-spark');
    const centerMark = document.querySelectorAll('.vf-center-mark');
    if (sparks.length === 0 && centerMark.length === 0) return;

    const ctx = gsap.context(() => {
      // Floating vertical loop for all small logo-sparks
      if (sparks.length > 0) {
        gsap.to('.logo-spark', {
          y: -5,
          duration: 2,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        });
      }

      if (page === 'home' && centerMark.length > 0) {
        // Floating loop for central mark
        gsap.to('.vf-center-mark', {
          y: -8,
          duration: 2.5,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        });

        // Glow pulse and rotation pulse for central mark
        gsap.to('.vf-center-mark', {
          scale: 1.05,
          rotation: 4,
          filter: 'drop-shadow(0 0 20px rgba(249, 115, 22, 0.7))',
          duration: 2,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        });
      }
    });
    return () => ctx.revert();
  }, [page]);

  // GSAP: Interactive Mouse Parallax Effect on Hero Dashboard
  useEffect(() => {
    if (page !== 'home') return;

    const hero = document.querySelector('.hero-section');
    if (!hero) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = hero.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      // Subtle parallax factors
      if (document.querySelector('.vf-center-mark')) {
        gsap.to('.vf-center-mark', {
          x: x * 0.04,
          y: y * 0.04 - 4, // Floating center offset
          duration: 0.6,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      }

      if (document.querySelector('.hero-card-one')) {
        gsap.to('.hero-card-one', {
          x: x * -0.05,
          y: y * -0.05,
          duration: 0.7,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      }

      if (document.querySelector('.hero-card-two')) {
        gsap.to('.hero-card-two', {
          x: x * 0.06,
          y: y * 0.06,
          duration: 0.7,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      }

      if (document.querySelector('.hero-card-three')) {
        gsap.to('.hero-card-three', {
          x: x * -0.04,
          y: y * -0.04,
          duration: 0.7,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      }

      if (document.querySelector('.hero-card-four')) {
        gsap.to('.hero-card-four', {
          x: x * 0.05,
          y: y * 0.05,
          duration: 0.7,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      }
    };

    const handleMouseLeave = () => {
      // Smoothly reset all elements back to original states
      const elementsToReset: string[] = [];
      if (document.querySelector('.vf-center-mark')) elementsToReset.push('.vf-center-mark');
      
      const cards = ['.hero-card', '.hero-card-one', '.hero-card-two', '.hero-card-three', '.hero-card-four'];
      cards.forEach(card => {
        if (document.querySelector(card)) elementsToReset.push(card);
      });

      if (elementsToReset.length > 0) {
        gsap.to(elementsToReset, {
          x: 0,
          y: 0,
          duration: 0.9,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      }
    };

    hero.addEventListener('mousemove', handleMouseMove as any);
    hero.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      hero.removeEventListener('mousemove', handleMouseMove as any);
      hero.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [page]);

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const showStatus = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleDownloadVideo = async (videoId: string, originalName?: string, resolution?: string) => {
    showStatus('Preparing secure download...', 'info');
    try {
      const downloadUrl = await getVideoDownloadUrlAPI(videoId, resolution);
      showStatus('Downloading file... Please wait.', 'info');
      
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Failed to download file from secure storage');
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      
      const cleanName = originalName 
        ? originalName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, '_')
        : 'video';
      const resSuffix = resolution && resolution !== 'auto' ? `_${resolution}` : '';
      
      let ext = 'mp4';
      try {
        const urlObj = new URL(downloadUrl);
        const pathname = urlObj.pathname;
        const lastDotIndex = pathname.lastIndexOf('.');
        if (lastDotIndex !== -1) {
          const parsedExt = pathname.substring(lastDotIndex + 1);
          if (parsedExt && !parsedExt.includes('/')) {
            ext = parsedExt;
          }
        }
      } catch (e) {
        console.warn('Failed to parse extension from download URL, defaulting to mp4', e);
      }
      
      link.download = `${cleanName}${resSuffix}.${ext}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      showStatus('Download completed!', 'success');
    } catch (err: any) {
      console.error('Secure Blob download failed, trying direct link:', err);
      try {
        const directUrl = await getVideoDownloadUrlAPI(videoId, resolution);
        window.open(directUrl, '_blank');
        showStatus('Opening video link in new tab...', 'info');
      } catch (fallbackErr) {
        showStatus(err.message || 'Failed to prepare download', 'error');
      }
    }
  };

  const goTo = (p: PageView) => {
    setPage(p);
    setIsLeftDrawerOpen(false);
    setIsToolsDropdownOpen(false);
  };

  const goHome = () => {
    setPage('home');
    setIsLeftDrawerOpen(false);
    setIsToolsDropdownOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatBytes = (b: number) => {
    if (!b) return '0 B';
    const s = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(b) / Math.log(1024));
    return `${(b / Math.pow(1024, i)).toFixed(1)} ${s[i]}`;
  };

  const displayVideoName = (v: VideoMetaData) => {
    const n = v.originalName?.trim();
    if (!n || /^tr\.mp4$/i.test(n) || /^watch$/i.test(n)) return `Asset ${v.videoId.slice(0, 6)}`;
    return n;
  };

  // ─── Feature-filtered history ────────────────────────────────────────────────
  // Since we track jobType in the backend, filter by jobType field if available.
  // Fallback: all completed videos for "library"
  const historyFor = (jobType: string) => {
    if (jobType === 'all') return allVideos;
    if (jobType === 'settings') return [];
    // If the video has a jobType field, filter. Otherwise show all for non-library pages.
    return allVideos.filter((v: any) => {
      if (v.jobType) return v.jobType === jobType;
      return true; // show all when no jobType tag yet
    });
  };

  // ─── Action handlers ─────────────────────────────────────────────────────────
  const handleCompress = async (videoId: string) => {
    if (selectedVideo) {
      const sizeInMB = selectedVideo.sizeBytes / (1024 * 1024);
      if (selectedVideo.sizeBytes < 30 * 1024 * 1024) {
        showStatus('This video is too small to be compressed (less than 30 MB). Please try another larger video!', 'error');
        return;
      }
      if (sizeInMB <= compressSize) {
        showStatus(`This video (${sizeInMB.toFixed(1)} MB) is already smaller than or equal to the target size (${compressSize} MB). Please select a smaller target size or another video!`, 'error');
        return;
      }
    }
    try {
      setCompressIsProcessing(true);
      showStatus('Queuing compression…', 'info');
      const result = await triggerCompress(videoId, compressSize, compressAiUpscale);
      showStatus('Compression queued! Output will appear on the right when ready.', 'success');
      // Save a pending output record so the right panel shows progress
      const record: CompressOutputRecord = {
        videoId: result?.videoId ?? videoId,
        originalName: selectedVideo?.originalName ?? 'Compressed Video',
        sizeBytes: selectedVideo?.sizeBytes ?? 0,
        outputUrl: result?.outputUrl,
        targetSizeMB: compressSize,
        upscale: compressAiUpscale,
        completedAt: new Date().toISOString(),
      };
      setCompressOutputRecord(record);
      localStorage.setItem('vf-compress-output', JSON.stringify(record));
      loadVideos();
    } catch (e: any) { showStatus(e.message || 'Failed', 'error'); }
    finally { setCompressIsProcessing(false); }
  };

  const handleCompressFromUrl = async () => {
    if (!compressUrlInput.trim()) { showStatus('Please enter a video URL.', 'error'); return; }
    try {
      setCompressIsProcessing(true);
      showStatus('Fetching video from URL and queuing compression…', 'info');
      // First download the URL video, then it lands in allVideos and we compress it
      const dlResult = await triggerDownloadUrl(compressUrlInput.trim());
      showStatus('Video fetched! Compression will start automatically once downloaded.', 'success');
      setCompressUrlInput('');
      loadVideos();
    } catch (e: any) { showStatus(e.message || 'Failed', 'error'); }
    finally { setCompressIsProcessing(false); }
  };

  const handleDownload = async () => {
    if (!downloadUrl) return showStatus('Enter a URL first.', 'error');
    try {
      showStatus('Queuing download…', 'info');
      const result = await triggerDownloadUrl(downloadUrl);
      showStatus('Download queued! It will appear in your library when ready.', 'success');
      const record: ServiceOutputRecord = {
        videoId: result?.videoId ?? 'pending',
        originalName: downloadUrl.split('/').pop() || 'Downloaded Video',
        outputUrl: result?.outputUrl,
        jobType: 'download',
        extra: { sourceUrl: downloadUrl },
        queuedAt: new Date().toISOString(),
      };
      setDownloadOutputRecord(record);
      localStorage.setItem('vf-download-output', JSON.stringify(record));
      setDownloadUrl('');
      loadVideos();
    } catch (e: any) { showStatus(e.message || 'Failed', 'error'); }
  };

  const handleTranscode = async (videoId: string) => {
    try {
      setTranscodeIsProcessing(true);
      showStatus('Queuing HLS transcode…', 'info');
      const resParam = transcodeResolution === 'Auto' ? undefined : transcodeResolution;
      const result = await triggerTranscode(videoId, resParam);
      showStatus('Transcode queued! Output will appear when ready.', 'success');
      const record: ServiceOutputRecord = {
        videoId: result?.videoId ?? videoId,
        originalName: selectedVideo?.originalName ?? 'Transcoded Video',
        masterPlaylistUrl: result?.masterPlaylistUrl,
        sizeBytes: selectedVideo?.sizeBytes,
        jobType: 'transcode',
        extra: { resolution: transcodeResolution },
        queuedAt: new Date().toISOString(),
      };
      setTranscodeOutputRecord(record);
      localStorage.setItem('vf-transcode-output', JSON.stringify(record));
      loadVideos();
    } catch (e: any) { showStatus(e.message || 'Failed', 'error'); }
    finally { setTranscodeIsProcessing(false); }
  };

  const handleTranscodeFromUrl = async () => {
    if (!transcodeUrlInput.trim()) { showStatus('Please enter a video URL.', 'error'); return; }
    try {
      setTranscodeIsProcessing(true);
      showStatus('Fetching video from URL and queuing transcode…', 'info');
      const result = await triggerDownloadUrl(transcodeUrlInput.trim());
      showStatus('Video fetched and HLS transcode queued! Output will appear when ready.', 'success');
      const record: ServiceOutputRecord = {
        videoId: result?.videoId ?? 'pending',
        originalName: transcodeUrlInput.split('/').pop() || 'Downloaded Video',
        masterPlaylistUrl: result?.masterPlaylistUrl,
        jobType: 'download-url',
        queuedAt: new Date().toISOString(),
      };
      setTranscodeOutputRecord(record);
      localStorage.setItem('vf-transcode-output', JSON.stringify(record));
      setTranscodeUrlInput('');
      loadVideos();
    } catch (e: any) { showStatus(e.message || 'Failed', 'error'); }
    finally { setTranscodeIsProcessing(false); }
  };

  const handleConvert = async (videoId: string) => {
    try {
      showStatus('Queuing conversion…', 'info');
      const result = await triggerConvert(videoId, convertFormat);
      showStatus('Conversion queued! Output will appear when ready.', 'success');
      const record: ServiceOutputRecord = {
        videoId: result?.videoId ?? videoId,
        originalName: selectedVideo?.originalName ?? 'Converted Video',
        outputUrl: result?.outputUrl,
        sizeBytes: selectedVideo?.sizeBytes,
        jobType: 'convert',
        extra: { format: convertFormat },
        queuedAt: new Date().toISOString(),
      };
      setConvertOutputRecord(record);
      localStorage.setItem('vf-convert-output', JSON.stringify(record));
      loadVideos();
    } catch (e: any) { showStatus(e.message || 'Failed', 'error'); }
  };

  const handleExtractAudio = async (videoId: string) => {
    try {
      showStatus('Queuing audio extraction…', 'info');
      const result = await triggerExtractAudio(videoId, audioFormat);
      showStatus('Audio extraction queued! Output will appear when ready.', 'success');
      const record: ServiceOutputRecord = {
        videoId: result?.videoId ?? videoId,
        originalName: selectedVideo?.originalName ?? 'Audio Track',
        outputUrl: result?.outputUrl,
        sizeBytes: selectedVideo?.sizeBytes,
        jobType: 'audio',
        extra: { audioFormat },
        queuedAt: new Date().toISOString(),
      };
      setAudioOutputRecord(record);
      localStorage.setItem('vf-audio-output', JSON.stringify(record));
      loadVideos();
    } catch (e: any) { showStatus(e.message || 'Failed', 'error'); }
  };

  const handleTrim = async (videoId: string) => {
    try {
      showStatus('Queuing trim job…', 'info');
      const result = await triggerTrim(videoId, trimStart, trimEnd);
      showStatus('Clip queued! Output will appear when ready.', 'success');
      const record: ServiceOutputRecord = {
        videoId: result?.videoId ?? videoId,
        originalName: selectedVideo?.originalName ?? 'Clipped Video',
        outputUrl: result?.outputUrl,
        sizeBytes: selectedVideo?.sizeBytes,
        jobType: 'trim',
        extra: { startTime: trimStart, endTime: trimEnd },
        queuedAt: new Date().toISOString(),
      };
      setTrimOutputRecord(record);
      localStorage.setItem('vf-trim-output', JSON.stringify(record));
      loadVideos();
    } catch (e: any) { showStatus(e.message || 'Failed', 'error'); }
  };

  const handleGenerateThumbnail = async (videoId: string) => {
    try {
      setThumbnailIsProcessing(true);
      showStatus('Queuing thumbnail extraction job…', 'info');
      const result = await triggerThumbnail(videoId, thumbnailOffset);
      showStatus('Thumbnail extraction queued! Output will appear when ready.', 'success');
      const record: ServiceOutputRecord = {
        videoId: result?.videoId ?? videoId,
        originalName: selectedVideo?.originalName ?? 'Video Thumbnail',
        outputUrl: result?.outputUrl,
        sizeBytes: selectedVideo?.sizeBytes,
        jobType: 'thumbnail',
        extra: { offset: thumbnailOffset },
        queuedAt: new Date().toISOString(),
      };
      setThumbnailOutputRecord(record);
      localStorage.setItem('vf-thumbnail-output', JSON.stringify(record));
      loadVideos();
    } catch (e: any) { showStatus(e.message || 'Failed', 'error'); }
    finally { setThumbnailIsProcessing(false); }
  };

  const signInWithGoogle = () => {
    if (!googleEmail.includes('@')) { showStatus('Enter your Google email.', 'error'); return; }
    const name = googleEmail.split('@')[0].replace(/[._-]+/g, ' ');
    const displayName = name.replace(/\b\w/g, l => l.toUpperCase());
    setProfile({ ...profile, name: displayName, email: googleEmail, avatarInitials: getInitials(displayName), signedIn: true });
    setIsAuthOpen(false);
    showStatus('Signed in.', 'success');
  };

  const handleSignOut = async () => {
    try {
      await signoutAPI();
    } catch (e) {
      console.error("Signout API error:", e);
    }
    setProfile(defaultProfile);
    setIsProfileOpen(false);
    setIsLeftDrawerOpen(false);
    showStatus('Signed out successfully!', 'success');
  };

  const handleProfileImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected if needed
    e.target.value = '';

    // Resize + compress the image in a canvas before converting to base64.
    // This keeps the payload small enough for the backend body limit and localStorage.
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      const MAX = 300; // max dimension in px
      let { width, height } = img;
      if (width > height) {
        if (width > MAX) { height = Math.round((height * MAX) / width); width = MAX; }
      } else {
        if (height > MAX) { width = Math.round((width * MAX) / height); height = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      const base64 = canvas.toDataURL('image/jpeg', 0.7);

      // Apply locally right away so the UI feels instant
      setProfile(prev => ({ ...prev, avatarUrl: base64 }));

      // Persist to backend
      try {
        const res = await updateProfileAPI({ avatarUrl: base64 });
        if (res.user && res.user.avatarUrl) {
          setProfile(prev => ({ ...prev, avatarUrl: res.user.avatarUrl }));
        }
        showStatus('Avatar updated successfully!', 'success');
      } catch (err: any) {
        // Backend sync failed but local avatar is already set & saved to localStorage
        showStatus('Avatar saved locally (sync failed)', 'error');
      }
    };
    img.src = objectUrl;
  }, []);

  const handleSaveProfile = async () => {
    setSettingsSaving(true);
    try {
      const cleanUsername = settingsUsername.trim().toLowerCase();
      
      // Validation if changed
      if (cleanUsername && cleanUsername !== (profile.username || '')) {
        if (!/^[a-zA-Z0-9_]{3,15}$/.test(cleanUsername)) {
          throw new Error('Username must be 3-15 alphanumeric characters or underscores');
        }
        if (settingsUsernameAvailable === false) {
          throw new Error('Username is already taken');
        }
      }

      const response = await updateProfileAPI({
        name: settingsName.trim() || undefined,
        username: cleanUsername || undefined,
      });

      const updatedUser = response.user;
      const displayName = updatedUser.username || updatedUser.name;
      
      setProfile(prev => ({
        ...prev,
        name: updatedUser.name,
        username: updatedUser.username,
        email: updatedUser.email,
        avatarUrl: updatedUser.avatarUrl,
        avatarInitials: getInitials(displayName),
      }));

      showStatus('Profile updated successfully!', 'success');
    } catch (err: any) {
      showStatus(err.message || 'Failed to update profile', 'error');
    } finally {
      setSettingsSaving(false);
    }
  };


  // ─── FEATURE PAGES ──────────────────────────────────────────────────────────

  if (page === 'compress') {
    const tool = navTools.find(t => t.key === 'compress')!;

    const cloudProviders = [
      { id: 'gdrive', label: 'Google Drive', subtitle: 'Google Workspace', color: '#4285F4', sampleUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
      { id: 'dropbox', label: 'Dropbox', subtitle: 'Dropbox Cloud', color: '#0061FF', sampleUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' },
      { id: 'onedrive', label: 'OneDrive', subtitle: 'Microsoft 365', color: '#0078D4', sampleUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
      { id: 'box', label: 'Box', subtitle: 'Box Personal/Enterprise', color: '#0061D5', sampleUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4' },
    ];

    // Find the matching video in allVideos for updated outputUrl
    const liveOutputVideo = compressOutputRecord
      ? allVideos.find(v => v.videoId === compressOutputRecord.videoId)
      : null;
    const outputUrl = liveOutputVideo?.outputUrl || compressOutputRecord?.outputUrl;
    const outputStatus = liveOutputVideo?.status;

    return (
      <div className="app-shell droplane-bg">
        <FeaturePage
          tool={tool}
          history={historyFor('compress')}
          historyLabel="Compression History"
          onBack={goHome}
          onRefresh={loadVideos}
          selectedVideo={selectedVideo}
          onSelectVideo={setSelectedVideo}
          activePlayUrl={activePlayUrl}
          setActivePlayUrl={setActivePlayUrl}
          activePlayResolution={activePlayResolution}
          activePlayVideo={activePlayVideo}
          setActivePlayVideo={setActivePlayVideo}
          onDeleteVideo={handleDeleteVideo}
          onDownloadVideo={handleDownloadVideo}
          showStatus={showStatus}
          fullWidth
        >
          {/* Cloud Import Modal */}
          {showCloudModal && (
            <div className="cloud-modal-backdrop" onClick={() => setShowCloudModal(false)}>
              <div className="cloud-modal-panel" onClick={e => e.stopPropagation()}>
                <div className="cloud-modal-header">
                  <h3>Import from Cloud Storage</h3>
                  <button className="cloud-modal-close" onClick={() => setShowCloudModal(false)}><X size={16} /></button>
                </div>
                <p className="cloud-modal-desc">Select a cloud provider and authorize VideoForge to pull your video directly — no manual download needed.</p>
                <div className="cloud-provider-grid">
                  {cloudProviders.map(p => (
                    <div
                      key={p.id}
                      className="cloud-provider-card-v2"
                    >
                      <div className="cloud-provider-header-v2">
                        <div className="cloud-provider-info-v2">
                          <span className="cloud-provider-label-v2">{p.label}</span>
                          <span className="cloud-provider-subtitle-v2">{p.subtitle}</span>
                        </div>
                        <span className="cloud-provider-dot-v2" style={{ backgroundColor: p.color, color: p.color }} />
                      </div>
                      <div className="cloud-provider-status-v2">
                        <span className="status-indicator-dot" />
                        Ready to connect
                      </div>
                      <button
                        className="cloud-provider-connect-btn"
                        style={{ '--hover-bg': p.color } as React.CSSProperties}
                        onClick={async () => {
                          setShowCloudModal(false);
                          setCompressSourceTab('upload');
                          showStatus(`Connecting to ${p.label}... Select a file from your laptop.`, 'info');
                          setTimeout(() => {
                            document.getElementById('file-input')?.click();
                          }, 150);
                        }}
                      >
                        Connect & Import
                      </button>
                    </div>
                  ))}
                </div>
                <div className="cloud-modal-note">
                  <ShieldCheck size={13} /> OAuth authorization is required. No passwords stored.
                </div>
              </div>
            </div>
          )}

          {/* Share & QR Code Modal */}
          {shareUrlForModal && (
            <div className="cloud-modal-backdrop" onClick={() => setShareUrlForModal(null)}>
              <div className="cloud-modal-panel share-qr-panel" onClick={e => e.stopPropagation()}>
                <div className="cloud-modal-header">
                  <h3>Share & QR Code</h3>
                  <button className="cloud-modal-close" onClick={() => setShareUrlForModal(null)}><X size={16} /></button>
                </div>
                <p className="cloud-modal-desc">Copy the link or scan the QR code to instantly download the compressed video onto your smartphone.</p>
                
                <div className="share-url-container">
                  <input type="text" className="text-input share-url-input" readOnly value={shareUrlForModal} />
                  <button 
                    className="btn-trigger copy-share-btn"
                    onClick={() => {
                      copyToClipboard(shareUrlForModal)
                        .then(() => showStatus('Link copied to clipboard!', 'success'))
                        .catch(() => showStatus('Failed to copy link', 'error'));
                    }}
                  >
                    Copy
                  </button>
                </div>

                <div className="qr-code-section">
                  <div className="qr-code-wrapper">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareUrlForModal)}&color=0f172a&bgcolor=ffffff`}
                      alt="QR Code"
                      className="qr-code-image"
                    />
                  </div>
                  <div className="qr-code-info">
                    <h4>Scan to Download</h4>
                    <p>Open your smartphone camera and point it at the QR code to instantly download the video file.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="compress-split-layout">
            {/* ── LEFT PANEL: Inputs ── */}
            <div className="compress-left-panel">
              <div className="form-head" style={{ marginBottom: '20px' }}>
                <h2 className="form-breathe-heading">Video Compressor</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Reduce file size with target MB constraints, AI upscaling, or fetch directly from the web.
                </p>
              </div>

              {/* Source Tabs */}
              <div className="compress-source-tabs">
                {([
                  { id: 'upload' as CompressSourceTab, label: 'Upload File', icon: Upload },
                  { id: 'cloud' as CompressSourceTab, label: 'Cloud Import', icon: CloudUpload },
                  { id: 'url' as CompressSourceTab, label: 'Paste URL', icon: Link },
                  { id: 'library' as CompressSourceTab, label: 'My Library', icon: FileVideo },
                ] as {id: CompressSourceTab; label: string; icon: any}[]).map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      className={`compress-tab-btn ${compressSourceTab === tab.id ? 'active' : ''}`}
                      onClick={() => {
                        setCompressSourceTab(tab.id);
                        if (tab.id === 'cloud') setShowCloudModal(true);
                      }}
                    >
                      <Icon size={14} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content */}
              <div className="compress-tab-content">
                {compressSourceTab === 'upload' && (
                  <div className="compress-upload-zone">
                    <UploadWidget onUploadComplete={async id => {
                      showStatus('Upload complete! Video selected for compression.', 'success');
                      try {
                        const videos = await listVideos();
                        setAllVideos(videos);
                        const match = videos.find(v => v.videoId === id);
                        if (match) {
                          setSelectedVideo(match);
                        }
                      } catch (err) {
                        loadVideos();
                      }
                      setCompressSourceTab('library');
                    }} />
                    <div className="presign-info-strip">
                      <ShieldCheck size={13} style={{ color: 'var(--success-color)' }} />
                      <span><strong>Pre-Signed URL Upload</strong> — Your browser uploads directly to S3. Our servers never touch your raw video file.</span>
                    </div>
                  </div>
                )}

                {compressSourceTab === 'cloud' && (
                  <div className="compress-cloud-tab">
                    <div className="cloud-tab-illustration">
                      <CloudUpload size={40} style={{ color: 'var(--accent-color)', opacity: 0.7 }} />
                      <h4>Connect a Cloud Provider</h4>
                      <p>Pull videos from Google Drive, Dropbox, OneDrive, or Box using secure OAuth.</p>
                      <button className="btn-trigger" onClick={() => setShowCloudModal(true)}>
                        <CloudUpload size={14} /> Choose Cloud Provider
                      </button>
                    </div>
                    {compressUrlInput && (
                      <div className="cloud-url-preview">
                        <Link size={12} /> Imported: <code>{compressUrlInput.slice(0, 60)}…</code>
                        <button className="cloud-url-clear" onClick={() => setCompressUrlInput('')}><X size={11} /></button>
                      </div>
                    )}
                  </div>
                )}

                {compressSourceTab === 'url' && (
                  <div className="compress-url-tab">
                    <label className="input-group">
                      <span>Video URL (direct link or YouTube/Vimeo)</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="url"
                          className="text-input"
                          placeholder="https://youtube.com/watch?v=... or direct .mp4 link"
                          value={compressUrlInput}
                          onChange={e => setCompressUrlInput(e.target.value)}
                        />
                        <button
                          className="btn-trigger salmon-color-btn"
                          style={{ whiteSpace: 'nowrap', padding: '0 16px' }}
                          disabled={!compressUrlInput.trim() || compressIsProcessing}
                          onClick={handleCompressFromUrl}
                        >
                          {compressIsProcessing ? <RefreshCw size={14} className="pulse-anim" /> : <Download size={14} />}
                          Fetch & Compress
                        </button>
                      </div>
                    </label>
                    <div className="url-tab-note">
                      <Globe2 size={12} /> Paste any public video link — we'll fetch, store, and compress it without requiring a manual download.
                    </div>
                  </div>
                )}

                {compressSourceTab === 'library' && (
                  <div className="compress-library-tab">
                    <label className="input-group">
                      <span>Select from Your Library</span>
                      <VideoSelector
                        allVideos={allVideos}
                        selectedVideo={selectedVideo}
                        onSelectVideo={setSelectedVideo}
                        placeholder="Search video to compress..."
                        onDeleteVideo={handleDeleteVideo}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Common Settings */}
              <div className="compress-settings-section">
                <div className="compress-setting-row">
                  <label className="input-group" style={{ marginBottom: 0 }}>
                    <span>Target Output Size</span>
                    <div className="size-slider-row">
                      <input
                        type="range"
                        min={hasStartedCompression ? 25 : 5}
                        max="500"
                        value={compressSize}
                        onChange={e => setCompressSize(Math.max(hasStartedCompression ? 25 : 5, +e.target.value))}
                        className="orange-slider-input"
                      />
                      <strong className="orange-stat">{compressSize} MB</strong>
                    </div>
                  </label>
                </div>

                {/* AI Enhancement Toggle */}
                <div className="ai-upscale-toggle-row">
                  <div className="ai-toggle-info">
                    <div className="ai-toggle-title">
                      <Sparkles size={15} style={{ color: '#a855f7' }} />
                      <strong>AI 4K Upscaling</strong>
                      <span className="premium-tag">PRO</span>
                    </div>
                    <p className="ai-toggle-desc">Increase resolution (e.g. 1080p → 4K) while compressing. Perfect for restoring older footage.</p>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={compressAiUpscale} onChange={e => setCompressAiUpscale(e.target.checked)} />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <button
                  className="btn-trigger salmon-color-btn compress-action-btn"
                  disabled={
                    compressIsProcessing ||
                    (compressSourceTab !== 'url' && !selectedVideo) ||
                    (compressSourceTab === 'url' && !compressUrlInput.trim())
                  }
                  onClick={() => {
                    if (compressSourceTab === 'url') {
                      handleCompressFromUrl();
                    } else if (selectedVideo) {
                      handleCompress(selectedVideo.videoId);
                    }
                  }}
                >
                  {compressIsProcessing
                    ? <><RefreshCw size={16} className="pulse-anim" /> Processing…</>
                    : <><Gauge size={16} /> Start Compression</>}
                </button>
              </div>

              {statusMessage && <div className={`page-toast ${statusMessage.type}`}><Sparkles size={14} />{statusMessage.text}</div>}
            </div>

            {/* ── RIGHT PANEL: Output ── */}
            <div className="compress-right-panel">
              <div className="compress-output-header">
                <strong>Output</strong>
                <span className="compress-output-subtitle">Your compressed video appears here</span>
              </div>

              {!compressOutputRecord ? (
                <div className="compress-output-empty">
                  <div className="compress-output-empty-icon">
                    <Gauge size={36} style={{ opacity: 0.3 }} />
                  </div>
                  <p>No output yet. Run a compression to see your result here.</p>
                  <span>Results persist across page reloads until you compress a new video.</span>
                </div>
              ) : (
                <div className="compress-output-card">
                  <div className="coc-status-bar">
                    {outputStatus === 'completed' ? (
                      <span className="coc-badge completed">✓ Completed</span>
                    ) : outputStatus === 'failed' ? (
                      <span className="coc-badge failed">✗ Failed</span>
                    ) : (
                      <span className="coc-badge processing">
                        <RefreshCw size={11} className="pulse-anim" /> Processing…
                      </span>
                    )}
                    <button
                      className="coc-clear-btn"
                      onClick={() => {
                        setCompressOutputRecord(null);
                        localStorage.removeItem('vf-compress-output');
                      }}
                    >
                      <X size={12} /> Clear
                    </button>
                  </div>

                  <div className="coc-preview">
                    {outputUrl ? (
                      <video src={outputUrl} className="coc-preview-video" controls playsInline />
                    ) : (
                      <div className="coc-preview-placeholder">
                        <FileVideo size={32} style={{ opacity: 0.4 }} />
                        {outputStatus === 'processing' || outputStatus === 'queued' ? (
                          <span>Compressing video… <RefreshCw size={12} className="pulse-anim" /></span>
                        ) : (
                          <span>Preview will appear when ready</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="coc-actions">
                    <button
                      className="coc-action-btn download"
                      disabled={!outputUrl}
                      onClick={() => {
                        const vidId = liveOutputVideo?.videoId || (outputUrl ? extractVideoIdFromUrl(outputUrl) : null);
                        if (vidId) {
                          handleDownloadVideo(vidId, liveOutputVideo?.originalName || compressOutputRecord?.originalName);
                        }
                      }}
                      style={!outputUrl ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                    >
                      <Download size={13} /> Download
                    </button>
                    <button
                      className="coc-action-btn view"
                      disabled={!outputUrl}
                      onClick={() => outputUrl && setActivePlayUrl(outputUrl)}
                    >
                      <PlayCircle size={13} /> View
                    </button>
                    <button
                      className="coc-action-btn share"
                      disabled={!outputUrl}
                      onClick={() => {
                        if (outputUrl) {
                          setShareUrlForModal(outputUrl);
                        }
                      }}
                    >
                      <Share2 size={13} /> Share
                    </button>
                  </div>

                  <div className="coc-meta">
                    <strong className="coc-name" title={compressOutputRecord.originalName}>
                      {compressOutputRecord.originalName}
                    </strong>
                    <div className="coc-specs">
                      <span>Target: {compressOutputRecord.targetSizeMB} MB</span>
                      <span className="dot">•</span>
                      <span>Original: {(compressOutputRecord.sizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
                      {compressOutputRecord.upscale && <><span className="dot">•</span><span style={{ color: '#a855f7' }}>4K AI</span></>}
                    </div>
                    <div className="coc-date">Queued: {new Date(compressOutputRecord.completedAt).toLocaleString()}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </FeaturePage>
      </div>
    );
  }



  if (page === 'download') {
    const tool = navTools.find(t => t.key === 'download')!;
    // Resolve live status from allVideos for the output record
    const dlLiveVideo = downloadOutputRecord
      ? allVideos.find(v => v.videoId === downloadOutputRecord.videoId)
      : null;
    const dlOutputUrl = dlLiveVideo?.masterPlaylistUrl || dlLiveVideo?.outputUrl || downloadOutputRecord?.outputUrl;
    const dlOutputStatus = dlLiveVideo?.status ?? (downloadOutputRecord ? 'queued' : undefined);

    const isCompleted = dlOutputStatus === 'completed';
    const isProcessing = dlOutputStatus === 'processing' || dlOutputStatus === 'queued';
    const isFailed = dlOutputStatus === 'failed';
    const hasJob = !!downloadOutputRecord;

    const handleShareChannel = (channel: 'whatsapp' | 'email' | 'twitter' | 'copy') => {
      if (!dlOutputUrl) return;
      const shareData = {
        title: dlLiveVideo?.originalName || downloadOutputRecord?.originalName || 'Shared Video',
        text: 'Check out this video:',
        url: dlOutputUrl
      };

      if (channel === 'copy') {
        copyToClipboard(dlOutputUrl)
          .then(() => showStatus('Link copied to clipboard!', 'success'))
          .catch(() => showStatus('Failed to copy link', 'error'));
        return;
      }

      if (navigator.share) {
        navigator.share(shareData)
          .then(() => showStatus('Shared successfully!', 'success'))
          .catch((err) => {
            if (err.name !== 'AbortError') {
              fallbackShare(channel);
            }
          });
      } else {
        fallbackShare(channel);
      }
    };

    const fallbackShare = (channel: 'whatsapp' | 'email' | 'twitter') => {
      if (!dlOutputUrl) return;
      const title = dlLiveVideo?.originalName || downloadOutputRecord?.originalName || 'Shared Video';
      if (channel === 'whatsapp') {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(title + ': ' + dlOutputUrl)}`, '_blank');
      } else if (channel === 'email') {
        window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent('Here is the link to the video: ' + dlOutputUrl)}`, '_self');
      } else if (channel === 'twitter') {
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(dlOutputUrl)}&text=${encodeURIComponent('Check out ' + title)}`, '_blank');
      }
    };

    return (
      <div className="app-shell droplane-bg">
        <FeaturePage
          tool={tool}
          history={historyFor('download')}
          historyLabel="Download History"
          onBack={goHome}
          onRefresh={loadVideos}
          selectedVideo={selectedVideo}
          onSelectVideo={setSelectedVideo}
          activePlayUrl={activePlayUrl}
          setActivePlayUrl={setActivePlayUrl}
          activePlayResolution={activePlayResolution}
          activePlayVideo={activePlayVideo}
          setActivePlayVideo={setActivePlayVideo}
          onDeleteVideo={handleDeleteVideo}
          onDownloadVideo={handleDownloadVideo}
          showStatus={showStatus}
          fullWidth={true}
        >
          <div className="download-page-layout">
            {/* Left Column: Download URL Form */}
            <div className="download-left-col">
              <div className="tool-form download-url-form">
                <div className="form-head">
                  <h3>Download from URL</h3>
                  <p>Paste a public video URL. The worker fetches and queues it through your pipeline.</p>
                </div>
                <div className="form-body">
                  <label className="input-group">
                    <span>Public Video URL</span>
                    <input
                      className="text-input"
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={downloadUrl}
                      onChange={e => setDownloadUrl(e.target.value)}
                    />
                  </label>
                  <button className="btn-fetch-video" onClick={handleDownload}>
                    <Download size={15} /> Fetch Video
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Actions / Status Column */}
            <div className="download-right-col">
              {/* Status Card */}
              <div className={`download-status-card ${isCompleted ? 'completed' : isProcessing ? 'processing' : isFailed ? 'failed' : 'idle'}`}>
                <div className="status-header">
                  {isCompleted ? (
                    <div className="status-indicator">
                      <span className="green-tick-circle">
                        <Check size={16} strokeWidth={3} />
                      </span>
                      <span className="status-text">Ready</span>
                    </div>
                  ) : isProcessing ? (
                    <div className="status-indicator">
                      <RefreshCw size={16} className="pulse-anim text-orange" />
                      <span className="status-text text-orange">Processing video...</span>
                    </div>
                  ) : isFailed ? (
                    <div className="status-indicator">
                      <X size={16} className="text-red" />
                      <span className="status-text text-red">Processing failed</span>
                    </div>
                  ) : (
                    <div className="status-indicator">
                      <Lock size={16} />
                      <span className="status-text">Run a job to unlock actions</span>
                    </div>
                  )}
                </div>
                {dlLiveVideo?.originalName && (
                  <div className="status-video-title">
                    {dlLiveVideo.originalName}
                  </div>
                )}
              </div>

              {/* Vertical Action Column */}
              <div className="download-actions-stack">
                {/* VIEW BUTTON */}
                <button
                  className={`download-action-btn view-btn ${isCompleted ? 'active' : 'disabled'}`}
                  disabled={!isCompleted}
                  onClick={() => {
                    if (isCompleted && dlOutputUrl) {
                      setActivePlayUrl(dlOutputUrl);
                      setActivePlayVideo(dlLiveVideo || null);
                    }
                  }}
                >
                  <PlayCircle size={18} />
                  <span>View Video</span>
                </button>

                {/* DOWNLOAD BUTTON */}
                <div className="download-action-group">
                  <button
                    className={`download-action-btn download-btn ${isCompleted ? 'active' : 'disabled'} ${showDownloadOptions ? 'expanded' : ''}`}
                    disabled={!isCompleted}
                    onClick={() => {
                      if (isCompleted) {
                        setShowDownloadOptions(!showDownloadOptions);
                        setShowShareOptions(false);
                      }
                    }}
                  >
                    <Download size={18} />
                    <span>Download Options</span>
                    <ChevronDown size={16} className={`arrow-icon ${showDownloadOptions ? 'rotated' : ''}`} />
                  </button>
                  {isCompleted && showDownloadOptions && (
                    <div className="download-sub-panel animate-slide-down">
                      <div className="sub-panel-title">Select Quality</div>
                      <div className="resolution-options-list">
                        {[
                          { resolution: '1080p', label: '1080p (Full HD)' },
                          { resolution: '720p', label: '720p (HD)' },
                          { resolution: '480p', label: '480p (SD)' },
                          { resolution: '360p', label: '360p (Low)' },
                          { resolution: 'auto', label: 'Original Quality' },
                        ].map((opt) => (
                          <button
                            key={opt.resolution}
                            className="resolution-item-btn"
                            onClick={() => {
                              if (dlLiveVideo?.videoId) {
                                handleDownloadVideo(
                                  dlLiveVideo.videoId,
                                  dlLiveVideo.originalName || downloadOutputRecord?.originalName,
                                  opt.resolution
                                );
                              }
                            }}
                          >
                            <ArrowDownToLine size={14} />
                            <span>{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* SHARE BUTTON */}
                <div className="download-action-group">
                  <button
                    className={`download-action-btn share-btn ${isCompleted ? 'active' : 'disabled'} ${showShareOptions ? 'expanded' : ''}`}
                    disabled={!isCompleted}
                    onClick={() => {
                      if (isCompleted) {
                        setShowShareOptions(!showShareOptions);
                        setShowDownloadOptions(false);
                      }
                    }}
                  >
                    <Share2 size={18} />
                    <span>Share Video</span>
                    <ChevronDown size={16} className={`arrow-icon ${showShareOptions ? 'rotated' : ''}`} />
                  </button>
                  {isCompleted && showShareOptions && (
                    <div className="download-sub-panel animate-slide-down">
                      <div className="sub-panel-title">Share Via</div>
                      <div className="share-channels-list">
                        <button
                          className="share-item-btn whatsapp"
                          onClick={() => handleShareChannel('whatsapp')}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.725 1.45 5.502.003 9.961-4.45 9.964-9.948.002-2.661-1.025-5.163-2.894-7.036-1.87-1.873-4.364-2.903-7.027-2.904-5.509 0-9.97 4.458-9.973 9.956-.001 1.705.474 3.371 1.378 4.821l-.958 3.498 3.593-.942zm12.33-6.24c-.302-.152-1.79-.883-2.067-.984-.278-.102-.48-.152-.68.152-.2.304-.775.984-.95 1.186-.175.203-.35.229-.652.077-.302-.152-1.276-.47-2.43-1.499-.899-.802-1.505-1.792-1.68-2.097-.175-.304-.019-.469.133-.62.136-.135.302-.354.454-.53.152-.177.203-.304.304-.508.102-.203.05-.381-.025-.533-.075-.152-.68-1.642-.932-2.25-.246-.592-.497-.51-.68-.52-.176-.01-.377-.01-.58-.01-.202 0-.53.076-.807.381-.277.304-1.057 1.034-1.057 2.522 0 1.488 1.083 2.923 1.233 3.126.151.203 2.133 3.257 5.168 4.566.72.311 1.282.497 1.72.637.723.23 1.382.197 1.902.12.58-.087 1.79-.731 2.042-1.44.252-.708.252-1.314.177-1.44-.075-.127-.278-.203-.58-.354z"/></svg>
                          <span>WhatsApp</span>
                        </button>
                        <button
                          className="share-item-btn email"
                          onClick={() => handleShareChannel('email')}
                        >
                          <Mail size={14} />
                          <span>Email</span>
                        </button>
                        <button
                          className="share-item-btn twitter"
                          onClick={() => handleShareChannel('twitter')}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                          <span>Twitter / X</span>
                        </button>
                        <button
                          className="share-item-btn copy"
                          onClick={() => handleShareChannel('copy')}
                        >
                          <Link size={14} />
                          <span>Copy Link</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {statusMessage && <div className={`page-toast ${statusMessage.type}`}><Sparkles size={14} />{statusMessage.text}</div>}
        </FeaturePage>
      </div>
    );
  }

  if (page === 'transcode') {
    const tool = navTools.find(t => t.key === 'transcode')!;
    
    // Find matched video for live updates
    const liveV = transcodeOutputRecord
      ? allVideos.find(v => v.videoId === transcodeOutputRecord.videoId)
      : null;
    const tcUrl = liveV?.masterPlaylistUrl || liveV?.outputUrl || transcodeOutputRecord?.masterPlaylistUrl || transcodeOutputRecord?.outputUrl;
    const tcStatus = liveV?.status ?? (transcodeOutputRecord ? 'queued' : undefined);
    
    const isCompleted = tcStatus === 'completed';
    const isProcessing = tcStatus === 'processing' || tcStatus === 'queued';
    const isFailed = tcStatus === 'failed';

    const handleShareChannel = (channel: 'whatsapp' | 'email' | 'twitter' | 'copy') => {
      if (!tcUrl) return;
      const title = transcodeOutputRecord?.originalName || 'Transcoded Video';
      if (channel === 'copy') {
        copyToClipboard(tcUrl)
          .then(() => showStatus('Link copied to clipboard!', 'success'))
          .catch(() => showStatus('Failed to copy link', 'error'));
      } else if (channel === 'whatsapp') {
        window.open(`https://wa.me/?text=${encodeURIComponent(title + '\n' + tcUrl)}`, '_blank');
      } else if (channel === 'email') {
        window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent('Here is the HLS stream link: ' + tcUrl)}`, '_self');
      } else if (channel === 'twitter') {
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(tcUrl)}&text=${encodeURIComponent('Check out ' + title)}`, '_blank');
      }
    };

    return (
      <div className="app-shell droplane-bg">
        <FeaturePage
          tool={tool}
          history={historyFor('transcode')}
          historyLabel="Transcode History"
          onBack={goHome}
          onRefresh={loadVideos}
          selectedVideo={selectedVideo}
          onSelectVideo={setSelectedVideo}
          activePlayUrl={activePlayUrl}
          setActivePlayUrl={setActivePlayUrl}
          activePlayResolution={activePlayResolution}
          activePlayVideo={activePlayVideo}
          setActivePlayVideo={setActivePlayVideo}
          onDeleteVideo={handleDeleteVideo}
          onDownloadVideo={handleDownloadVideo}
          showStatus={showStatus}
          fullWidth
        >
          <div className="compress-split-layout">
            {/* ── LEFT PANEL: Inputs ── */}
            <div className="compress-left-panel">
              <div className="form-head" style={{ marginBottom: '20px' }}>
                <h2 className="form-breathe-heading">HLS Transcoder</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Convert videos to adaptive HLS streams (HTTP Live Streaming) with multi-bitrate playlists.
                </p>
              </div>

              {/* Source Tabs */}
              <div className="compress-source-tabs">
                {([
                  { id: 'upload' as const, label: 'Upload File', icon: Upload },
                  { id: 'cloud' as const, label: 'Cloud Import', icon: CloudUpload },
                  { id: 'url' as const, label: 'Paste URL', icon: Link },
                  { id: 'library' as const, label: 'My Library', icon: FileVideo },
                ]).map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      className={`compress-tab-btn ${transcodeSourceTab === tab.id ? 'active' : ''}`}
                      onClick={() => {
                        setTranscodeSourceTab(tab.id);
                        if (tab.id === 'cloud') setShowCloudModal(true);
                      }}
                    >
                      <Icon size={14} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content */}
              <div className="compress-tab-content">
                {transcodeSourceTab === 'upload' && (
                  <div className="compress-upload-zone">
                    <UploadWidget onUploadComplete={async id => {
                      showStatus('Upload complete! Video selected for HLS transcoding.', 'success');
                      try {
                        const videos = await listVideos();
                        setAllVideos(videos);
                        const match = videos.find(v => v.videoId === id);
                        if (match) {
                          setSelectedVideo(match);
                        }
                      } catch (err) {
                        loadVideos();
                      }
                      setTranscodeSourceTab('library');
                    }} />
                    <div className="presign-info-strip">
                      <ShieldCheck size={13} style={{ color: 'var(--success-color)' }} />
                      <span><strong>Pre-Signed URL Upload</strong> — Direct upload to S3 from your browser. Safest and fastest upload route.</span>
                    </div>
                  </div>
                )}

                {transcodeSourceTab === 'cloud' && (
                  <div className="compress-cloud-tab">
                    <div className="cloud-tab-illustration">
                      <CloudUpload size={40} style={{ color: 'var(--accent-color)', opacity: 0.7 }} />
                      <h4>Connect a Cloud Provider</h4>
                      <p>Pull videos from Google Drive, Dropbox, OneDrive, or Box using secure OAuth.</p>
                      <button className="btn-trigger" onClick={() => setShowCloudModal(true)}>
                        <CloudUpload size={14} /> Choose Cloud Provider
                      </button>
                    </div>
                    {transcodeUrlInput && (
                      <div className="cloud-url-preview">
                        <Link size={12} /> Imported: <code>{transcodeUrlInput.slice(0, 60)}…</code>
                        <button className="cloud-url-clear" onClick={() => setTranscodeUrlInput('')}><X size={11} /></button>
                      </div>
                    )}
                  </div>
                )}

                {transcodeSourceTab === 'url' && (
                  <div className="compress-url-tab">
                    <label className="input-group">
                      <span>Video URL (direct link or YouTube/Vimeo)</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="url"
                          className="text-input"
                          placeholder="https://youtube.com/watch?v=... or direct HLS / MP4 link"
                          value={transcodeUrlInput}
                          onChange={e => setTranscodeUrlInput(e.target.value)}
                        />
                        <button
                          className="btn-trigger salmon-color-btn"
                          style={{ whiteSpace: 'nowrap', padding: '0 16px' }}
                          disabled={!transcodeUrlInput.trim() || transcodeIsProcessing}
                          onClick={handleTranscodeFromUrl}
                        >
                          {transcodeIsProcessing ? <RefreshCw size={14} className="pulse-anim" /> : <Download size={14} />}
                          Fetch & Transcode
                        </button>
                      </div>
                    </label>
                    <div className="url-tab-note">
                      <Globe2 size={12} /> Paste any public video link — we'll fetch, store, and transcode it to HLS without requiring local downloads.
                    </div>
                  </div>
                )}

                {transcodeSourceTab === 'library' && (
                  <div className="compress-library-tab">
                    <label className="input-group">
                      <span>Select from Your Library</span>
                      <VideoSelector
                        allVideos={allVideos}
                        selectedVideo={selectedVideo}
                        onSelectVideo={setSelectedVideo}
                        placeholder="Search video to transcode..."
                        onDeleteVideo={handleDeleteVideo}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Settings */}
              <div className="compress-settings-section">
                <div className="compress-setting-row">
                  <label className="input-group" style={{ marginBottom: 0 }}>
                    <span>Target Resolution / Quality</span>
                    <select
                      className="select-input"
                      value={transcodeResolution}
                      onChange={e => setTranscodeResolution(e.target.value)}
                      style={{ width: '100%', marginTop: '6px' }}
                    >
                      <option value="Auto">Auto (Adaptive Multi-Bitrate HLS)</option>
                      <option value="1080p">1080p (Full HD)</option>
                      <option value="720p">720p (HD)</option>
                      <option value="480p">480p (SD)</option>
                      <option value="360p">360p (SD)</option>
                    </select>
                  </label>
                </div>

                <button
                  className="btn-trigger salmon-color-btn compress-action-btn"
                  disabled={
                    transcodeIsProcessing ||
                    (transcodeSourceTab !== 'url' && !selectedVideo) ||
                    (transcodeSourceTab === 'url' && !transcodeUrlInput.trim())
                  }
                  onClick={() => {
                    if (transcodeSourceTab === 'url') {
                      handleTranscodeFromUrl();
                    } else if (selectedVideo) {
                      handleTranscode(selectedVideo.videoId);
                    }
                  }}
                >
                  {transcodeIsProcessing
                    ? <><RefreshCw size={16} className="pulse-anim" /> Processing…</>
                    : <><Video size={16} /> Start HLS Transcode</>}
                </button>
              </div>
            </div>

            {/* ── RIGHT PANEL: Output ── */}
            <div className="compress-right-panel">
              <div className="compress-output-header">
                <strong>Output</strong>
                <span className="compress-output-subtitle">Your adaptive HLS playlist appears here</span>
              </div>

              {!transcodeOutputRecord ? (
                <div className="compress-output-empty">
                  <div className="compress-output-empty-icon">
                    <Video size={36} style={{ opacity: 0.3 }} />
                  </div>
                  <p>No output yet. Run an HLS Transcode to see your adaptive stream result here.</p>
                  <span>Results persist across page reloads until you transcode a new video.</span>
                </div>
              ) : (
                <div className="compress-output-card">
                  <div className="coc-status-bar">
                    {tcStatus === 'completed' ? (
                      <span className="coc-badge completed">✓ Completed</span>
                    ) : tcStatus === 'failed' ? (
                      <span className="coc-badge failed">✗ Failed</span>
                    ) : (
                      <span className="coc-badge processing">
                        <RefreshCw size={11} className="pulse-anim" /> Processing…
                      </span>
                    )}
                    <button
                      className="coc-clear-btn"
                      onClick={() => {
                        setTranscodeOutputRecord(null);
                        localStorage.removeItem('vf-transcode-output');
                      }}
                    >
                      <X size={12} /> Clear
                    </button>
                  </div>

                  <div className="coc-preview">
                    {tcUrl ? (
                      <div className="transcode-preview-player-wrapper" style={{ width: '100%', height: '100%', borderRadius: '6px', overflow: 'hidden' }}>
                        <VideoPlayer url={tcUrl} />
                      </div>
                    ) : (
                      <div className="coc-preview-placeholder">
                        <FileVideo size={32} style={{ opacity: 0.4 }} />
                        {isProcessing ? (
                          <span>Transcoding video… <RefreshCw size={12} className="pulse-anim" /></span>
                        ) : (
                          <span>Preview will appear when ready</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="coc-actions-container" style={{ position: 'relative' }}>
                    <div className="coc-actions">
                      <button
                        className="coc-action-btn download"
                        disabled={!tcUrl}
                        onClick={() => {
                          setShowTcDownloadOptions(!showTcDownloadOptions);
                          setShowTcShareOptions(false);
                        }}
                        style={!tcUrl ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                      >
                        <Download size={13} /> Download <ChevronDown size={12} />
                      </button>
                      <button
                        className="coc-action-btn view"
                        disabled={!tcUrl}
                        onClick={() => tcUrl && setActivePlayUrl(tcUrl)}
                      >
                        <PlayCircle size={13} /> View
                      </button>
                      <button
                        className="coc-action-btn share"
                        disabled={!tcUrl}
                        onClick={() => {
                          setShowTcShareOptions(!showTcShareOptions);
                          setShowTcDownloadOptions(false);
                        }}
                      >
                        <Share2 size={13} /> Share <ChevronDown size={12} />
                      </button>
                    </div>

                    {/* Quality download dropdown menu */}
                    {showTcDownloadOptions && tcUrl && (
                      <div className="share-dropdown-menu tc-download-dropdown" style={{ left: 0, right: 'auto', bottom: 'calc(100% + 10px)' }}>
                        <div className="share-dropdown-header">
                          Select Download Resolution
                        </div>
                        {([
                          { key: 'auto', label: 'Adaptive (Auto)' },
                          { key: '1080p', label: '1080p Full HD' },
                          { key: '720p', label: '720p HD' },
                          { key: '480p', label: '480p SD' },
                          { key: '360p', label: '360p SD' }
                        ]).map(res => (
                          <button
                            key={res.key}
                            className="share-option"
                            onClick={() => {
                              const vidId = liveV?.videoId || (tcUrl ? extractVideoIdFromUrl(tcUrl) : null);
                              if (vidId) {
                                handleDownloadVideo(vidId, liveV?.originalName || transcodeOutputRecord?.originalName, res.key);
                              }
                              setShowTcDownloadOptions(false);
                            }}
                          >
                            <span className="share-option-icon"><Download size={13} /></span>
                            <span>{res.label}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Share channels dropdown menu */}
                    {showTcShareOptions && tcUrl && (
                      <div className="share-dropdown-menu tc-share-dropdown" style={{ bottom: 'calc(100% + 10px)' }}>
                        <div className="share-dropdown-header">Share Video</div>
                        <button
                          className="share-option"
                          onClick={() => {
                            handleShareChannel('whatsapp');
                            setShowTcShareOptions(false);
                          }}
                        >
                          <span className="share-option-icon">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.456L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.403.002 9.803-4.392 9.806-9.799.002-2.62-1.012-5.082-2.859-6.932C16.378 2.025 13.926.995 12.01.995c-5.402 0-9.802 4.394-9.806 9.801-.001 1.57.489 3.106 1.419 4.47l-.988 3.613 3.738-.979zM17.07 14.86c-.273-.136-1.616-.797-1.866-.888-.25-.091-.432-.136-.614.136-.182.273-.705.888-.864 1.07-.159.182-.318.205-.591.069-.273-.136-1.152-.424-2.194-1.353-.811-.723-1.358-1.617-1.517-1.89-.159-.273-.017-.42.12-.556.123-.122.273-.318.409-.477.136-.159.182-.273.273-.455.091-.182.046-.341-.023-.477-.069-.136-.614-1.477-.841-2.023-.222-.536-.464-.463-.637-.472-.164-.008-.353-.01-.54-.01-.188 0-.494.07-.753.353-.259.282-.99 1.07-.99 2.61s1.122 3.028 1.277 3.238c.155.21 2.207 3.37 5.348 4.723.748.322 1.332.514 1.787.659.751.238 1.436.205 1.977.124.603-.09 1.866-.763 2.128-1.463.261-.7.261-1.3.182-1.428-.078-.127-.273-.205-.546-.341z"/></svg>
                          </span>
                          <span>WhatsApp</span>
                        </button>
                        <button
                          className="share-option"
                          onClick={() => {
                            handleShareChannel('email');
                            setShowTcShareOptions(false);
                          }}
                        >
                          <span className="share-option-icon"><Mail size={13} /></span>
                          <span>Email</span>
                        </button>
                        <button
                          className="share-option"
                          onClick={() => {
                            handleShareChannel('twitter');
                            setShowTcShareOptions(false);
                          }}
                        >
                          <span className="share-option-icon">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                          </span>
                          <span>Twitter / X</span>
                        </button>
                        <button
                          className="share-option"
                          onClick={() => {
                            handleShareChannel('copy');
                            setShowTcShareOptions(false);
                          }}
                        >
                          <span className="share-option-icon"><Link size={13} /></span>
                          <span>Copy Link</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="coc-meta">
                    <strong className="coc-name" title={transcodeOutputRecord.originalName}>
                      {transcodeOutputRecord.originalName}
                    </strong>
                    <div className="coc-specs">
                      <span>Target: {transcodeOutputRecord.extra?.resolution || 'Auto'}</span>
                      {transcodeOutputRecord.sizeBytes ? (
                        <>
                          <span className="dot">•</span>
                          <span>Original: {(transcodeOutputRecord.sizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
                        </>
                      ) : null}
                    </div>
                    <div className="coc-date">Queued: {new Date(transcodeOutputRecord.queuedAt).toLocaleString()}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          {statusMessage && <div className={`page-toast ${statusMessage.type}`}><Sparkles size={14} />{statusMessage.text}</div>}
        </FeaturePage>
      </div>
    );
  }

  if (page === 'ops') {
    const tool = navTools.find(t => t.key === 'ops')!;
    const latest = [convertOutputRecord, audioOutputRecord, trimOutputRecord]
      .filter(Boolean)
      .sort((a, b) => new Date(b!.queuedAt).getTime() - new Date(a!.queuedAt).getTime())[0];
    
    const liveV = latest
      ? allVideos.find(v => v.videoId === latest.videoId)
      : null;
    const opUrl = liveV?.outputUrl || latest?.outputUrl;
    const opStatus = liveV?.status ?? (latest ? 'queued' : undefined);
    
    const isCompleted = opStatus === 'completed';
    const isProcessing = opStatus === 'processing' || opStatus === 'queued';
    const isFailed = opStatus === 'failed';

    const handleShareChannel = (channel: 'whatsapp' | 'email' | 'twitter' | 'copy') => {
      if (!opUrl) return;
      const title = latest?.originalName || 'Processed Media';
      if (channel === 'copy') {
        copyToClipboard(opUrl)
          .then(() => showStatus('Link copied to clipboard!', 'success'))
          .catch(() => showStatus('Failed to copy link', 'error'));
      } else if (channel === 'whatsapp') {
        window.open(`https://wa.me/?text=${encodeURIComponent(title + '\n' + opUrl)}`, '_blank');
      } else if (channel === 'email') {
        window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent('Here is the processed media file link: ' + opUrl)}`, '_self');
      } else if (channel === 'twitter') {
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(opUrl)}&text=${encodeURIComponent('Check out ' + title)}`, '_blank');
      }
    };

    return (
      <div className="app-shell droplane-bg">
        <FeaturePage
          tool={tool}
          history={historyFor('ops')}
          historyLabel="Media Tools History"
          onBack={goHome}
          onRefresh={loadVideos}
          selectedVideo={selectedVideo}
          onSelectVideo={setSelectedVideo}
          activePlayUrl={activePlayUrl}
          setActivePlayUrl={setActivePlayUrl}
          activePlayResolution={activePlayResolution}
          activePlayVideo={activePlayVideo}
          setActivePlayVideo={setActivePlayVideo}
          onDeleteVideo={handleDeleteVideo}
          onDownloadVideo={handleDownloadVideo}
          showStatus={showStatus}
          fullWidth
        >
          <div className="compress-split-layout">
            {/* ── LEFT PANEL: Control Inputs ── */}
            <div className="compress-left-panel">
              <div className="tool-form" style={{ background: 'transparent', border: 'none', padding: 0, backdropFilter: 'none', boxShadow: 'none' }}>
                <div className="form-head">
                  <h3>Media Tools</h3>
                  <p>Convert formats, extract audio tracks, and trim clips from your selected source.</p>
                </div>
                <div className="form-body">
                  <label className="input-group">
                    <span>Source Video</span>
                    <VideoSelector 
                      allVideos={allVideos} 
                      selectedVideo={selectedVideo} 
                      onSelectVideo={setSelectedVideo} 
                      placeholder="Search video to process..."
                      onDeleteVideo={handleDeleteVideo}
                    />
                  </label>
                  <div className="op-sub-panel">
                    <h4>Format Conversion</h4>
                    <div className="op-row">
                      <select className="select-input" value={convertFormat} onChange={e => setConvertFormat(e.target.value as any)}>
                        <option value="mp4">MP4 (.mp4)</option>
                        <option value="webm">WebM (.webm)</option>
                        <option value="mov">MOV (.mov)</option>
                        <option value="avi">AVI (.avi)</option>
                        <option value="mkv">MKV (.mkv)</option>
                      </select>
                      <button className="btn-op" disabled={!selectedVideo} onClick={() => selectedVideo && handleConvert(selectedVideo.videoId)}>Convert</button>
                    </div>
                  </div>
                  <div className="op-sub-panel">
                    <h4>Audio Extraction</h4>
                    <div className="op-row">
                      <select className="select-input" value={audioFormat} onChange={e => setAudioFormat(e.target.value as any)}>
                        <option value="mp3">MP3 (.mp3)</option>
                        <option value="wav">WAV (.wav)</option>
                        <option value="aac">AAC (.aac)</option>
                      </select>
                      <button className="btn-op" disabled={!selectedVideo} onClick={() => selectedVideo && handleExtractAudio(selectedVideo.videoId)}><Music size={14} /> Extract</button>
                    </div>
                  </div>
                  <div className="op-sub-panel">
                    <h4>Trim Clip</h4>
                    <div className="trim-inputs">
                      <label><span>Start (s)</span><input type="number" className="text-input sm" min="0" value={trimStart} onChange={e => setTrimStart(+e.target.value)} /></label>
                      <label><span>End (s)</span><input type="number" className="text-input sm" min="1" value={trimEnd} onChange={e => setTrimEnd(+e.target.value)} /></label>
                    </div>
                    <button className="btn-op full" disabled={!selectedVideo} onClick={() => selectedVideo && handleTrim(selectedVideo.videoId)}><Scissors size={14} /> Export Clip</button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT PANEL: Output ── */}
            <div className="compress-right-panel">
              <div className="compress-output-header">
                <strong>Output</strong>
                <span className="compress-output-subtitle">Your processed media file appears here</span>
              </div>

              {!latest ? (
                <div className="compress-output-empty">
                  <div className="compress-output-empty-icon">
                    <SlidersHorizontal size={36} style={{ opacity: 0.3 }} />
                  </div>
                  <p>No output yet. Run format conversion, audio extraction, or trim clip to see results here.</p>
                  <span>Results persist across page reloads until you run a new operation.</span>
                </div>
              ) : (
                <div className="compress-output-card">
                  <div className="coc-status-bar">
                    {isCompleted ? (
                      <span className="coc-badge completed">✓ Completed</span>
                    ) : isFailed ? (
                      <span className="coc-badge failed">✗ Failed</span>
                    ) : (
                      <span className="coc-badge processing">
                        <RefreshCw size={11} className="pulse-anim" /> Processing…
                      </span>
                    )}
                    <button
                      className="coc-clear-btn"
                      onClick={() => {
                        if (latest.jobType === 'convert') {
                          setConvertOutputRecord(null);
                          localStorage.removeItem('vf-convert-output');
                        } else if (latest.jobType === 'audio') {
                          setAudioOutputRecord(null);
                          localStorage.removeItem('vf-audio-output');
                        } else if (latest.jobType === 'trim') {
                          setTrimOutputRecord(null);
                          localStorage.removeItem('vf-trim-output');
                        }
                      }}
                    >
                      <X size={12} /> Clear
                    </button>
                  </div>

                  <div className="coc-preview">
                    {opUrl ? (
                      latest.jobType === 'audio' ? (
                        <div className="audio-preview-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', background: '#0f172a', padding: '24px' }}>
                          <Music size={48} style={{ color: 'var(--accent-color)', opacity: 0.8 }} />
                          <audio src={opUrl} controls style={{ width: '100%' }} />
                        </div>
                      ) : (
                        <div className="transcode-preview-player-wrapper" style={{ width: '100%', height: '100%', borderRadius: '6px', overflow: 'hidden' }}>
                          <VideoPlayer url={opUrl} />
                        </div>
                      )
                    ) : (
                      <div className="coc-preview-placeholder">
                        {latest.jobType === 'audio' ? <Music size={32} style={{ opacity: 0.4 }} /> : <FileVideo size={32} style={{ opacity: 0.4 }} />}
                        {isProcessing ? (
                          <span>Processing media… <RefreshCw size={12} className="pulse-anim" /></span>
                        ) : (
                          <span>Preview will appear when ready</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="coc-actions-container" style={{ position: 'relative' }}>
                    <div className="coc-actions">
                      <button
                        className="coc-action-btn download"
                        disabled={!opUrl}
                        onClick={() => {
                          if (latest.videoId) {
                            handleDownloadVideo(latest.videoId, liveV?.originalName || latest.originalName);
                          }
                        }}
                        style={!opUrl ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                      >
                        <Download size={13} /> Download
                      </button>
                      {latest.jobType !== 'audio' && (
                        <button
                          className="coc-action-btn view"
                          disabled={!opUrl}
                          onClick={() => opUrl && setActivePlayUrl(opUrl)}
                        >
                          <PlayCircle size={13} /> View
                        </button>
                      )}
                      <button
                        className="coc-action-btn share"
                        disabled={!opUrl}
                        onClick={() => {
                          setShowOpsShareOptions(!showOpsShareOptions);
                        }}
                      >
                        <Share2 size={13} /> Share <ChevronDown size={12} />
                      </button>
                    </div>

                    {/* Share channels dropdown menu */}
                    {showOpsShareOptions && opUrl && (
                      <div className="share-dropdown-menu tc-share-dropdown" style={{ bottom: 'calc(100% + 10px)' }}>
                        <div className="share-dropdown-header">Share Media</div>
                        <button
                          className="share-option"
                          onClick={() => {
                            handleShareChannel('whatsapp');
                            setShowOpsShareOptions(false);
                          }}
                        >
                          <span className="share-option-icon">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.456L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.403.002 9.803-4.392 9.806-9.799.002-2.62-1.012-5.082-2.859-6.932C16.378 2.025 13.926.995 12.01.995c-5.402 0-9.802 4.394-9.806 9.801-.001 1.57.489 3.106 1.419 4.47l-.988 3.613 3.738-.979zM17.07 14.86c-.273-.136-1.616-.797-1.866-.888-.25-.091-.432-.136-.614.136-.182.273-.705.888-.864 1.07-.159.182-.318.205-.591.069-.273-.136-1.152-.424-2.194-1.353-.811-.723-1.358-1.617-1.517-1.89-.159-.273-.017-.42.12-.556.123-.122.273-.318.409-.477.136-.159.182-.273.273-.455.091-.182.046-.341-.023-.477-.069-.136-.614-1.477-.841-2.023-.222-.536-.464-.463-.637-.472-.164-.008-.353-.01-.54-.01-.188 0-.494.07-.753.353-.259.282-.99 1.07-.99 2.61s1.122 3.028 1.277 3.238c.155.21 2.207 3.37 5.348 4.723.748.322 1.332.514 1.787.659.751.238 1.436.205 1.977.124.603-.09 1.866-.763 2.128-1.463.261-.7.261-1.3.182-1.428-.078-.127-.273-.205-.546-.341z"/></svg>
                          </span>
                          <span>WhatsApp</span>
                        </button>
                        <button
                          className="share-option"
                          onClick={() => {
                            handleShareChannel('email');
                            setShowOpsShareOptions(false);
                          }}
                        >
                          <span className="share-option-icon"><Mail size={13} /></span>
                          <span>Email</span>
                        </button>
                        <button
                          className="share-option"
                          onClick={() => {
                            handleShareChannel('twitter');
                            setShowOpsShareOptions(false);
                          }}
                        >
                          <span className="share-option-icon">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                          </span>
                          <span>Twitter / X</span>
                        </button>
                        <button
                          className="share-option"
                          onClick={() => {
                            handleShareChannel('copy');
                            setShowOpsShareOptions(false);
                          }}
                        >
                          <span className="share-option-icon"><Link size={13} /></span>
                          <span>Copy Link</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="coc-meta">
                    <strong className="coc-name" title={latest.originalName}>
                      {latest.originalName}
                    </strong>
                    <div className="coc-specs">
                      <span>Type: {latest.jobType === 'audio' ? 'Audio Extraction' : latest.jobType === 'convert' ? `Format Conversion (${String(latest.extra?.format || 'Converted').toUpperCase()})` : 'Trimmed Clip'}</span>
                      {latest.sizeBytes ? (
                        <>
                          <span className="dot">•</span>
                          <span>Original: {(latest.sizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
                        </>
                      ) : null}
                    </div>
                    <div className="coc-date">Queued: {new Date(latest.queuedAt).toLocaleString()}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          {statusMessage && <div className={`page-toast ${statusMessage.type}`}><Sparkles size={14} />{statusMessage.text}</div>}
        </FeaturePage>
      </div>
    );
  }

  if (page === 'clipexport') {
    const tool = navTools.find(t => t.key === 'clipexport')!;
    const liveV = trimOutputRecord ? allVideos.find(v => v.videoId === trimOutputRecord.videoId) : null;
    const trimUrl = liveV?.outputUrl || trimOutputRecord?.outputUrl;
    const trimStatus = liveV?.status ?? (trimOutputRecord ? 'queued' : undefined);
    
    const isCompleted = trimStatus === 'completed';
    const isProcessing = trimStatus === 'processing' || trimStatus === 'queued';
    const isFailed = trimStatus === 'failed';

    const handleShareChannel = (channel: 'whatsapp' | 'email' | 'twitter' | 'copy') => {
      if (!trimUrl) return;
      const title = trimOutputRecord?.originalName || 'Trimmed Clip';
      if (channel === 'copy') {
        copyToClipboard(trimUrl)
          .then(() => showStatus('Link copied to clipboard!', 'success'))
          .catch(() => showStatus('Failed to copy link', 'error'));
      } else if (channel === 'whatsapp') {
        window.open(`https://wa.me/?text=${encodeURIComponent(title + '\n' + trimUrl)}`, '_blank');
      } else if (channel === 'email') {
        window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent('Here is the trimmed clip link: ' + trimUrl)}`, '_self');
      } else if (channel === 'twitter') {
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(trimUrl)}&text=${encodeURIComponent('Check out ' + title)}`, '_blank');
      }
    };

    return (
      <div className="app-shell droplane-bg">
        <FeaturePage
          tool={tool}
          history={historyFor('trim')}
          historyLabel="Clip Export History"
          onBack={goHome}
          onRefresh={loadVideos}
          selectedVideo={selectedVideo}
          onSelectVideo={setSelectedVideo}
          activePlayUrl={activePlayUrl}
          setActivePlayUrl={setActivePlayUrl}
          activePlayResolution={activePlayResolution}
          activePlayVideo={activePlayVideo}
          setActivePlayVideo={setActivePlayVideo}
          onDeleteVideo={handleDeleteVideo}
          onDownloadVideo={handleDownloadVideo}
          showStatus={showStatus}
          fullWidth
        >
          <div className="compress-split-layout">
            {/* ── LEFT PANEL: Control Inputs ── */}
            <div className="compress-left-panel">
              <div className="tool-form" style={{ background: 'transparent', border: 'none', padding: 0, backdropFilter: 'none', boxShadow: 'none' }}>
                <div className="form-head">
                  <h3>Clip Export</h3>
                  <p>Extract specific segments from uploaded videos without quality loss.</p>
                </div>
                <div className="form-body">
                  <label className="input-group">
                    <span>Source Video</span>
                    <VideoSelector 
                      allVideos={allVideos} 
                      selectedVideo={selectedVideo} 
                      onSelectVideo={setSelectedVideo} 
                      placeholder="Search video to clip..."
                      onDeleteVideo={handleDeleteVideo}
                    />
                  </label>
                  <div className="op-sub-panel">
                    <h4>Segment Timestamps</h4>
                    <div className="trim-inputs">
                      <label><span>Start time (seconds)</span><input type="number" className="text-input sm" min="0" value={trimStart} onChange={e => setTrimStart(+e.target.value)} /></label>
                      <label><span>End time (seconds)</span><input type="number" className="text-input sm" min="1" value={trimEnd} onChange={e => setTrimEnd(+e.target.value)} /></label>
                    </div>
                    <button className="btn-trigger" style={{ background: 'var(--accent-color)', color: 'white', marginTop: '1rem', width: '100%', justifyContent: 'center' }} disabled={!selectedVideo} onClick={() => selectedVideo && handleTrim(selectedVideo.videoId)}>
                      <Scissors size={14} /> Cut & Export Clip
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT PANEL: Output ── */}
            <div className="compress-right-panel">
              <div className="compress-output-header">
                <strong>Output</strong>
                <span className="compress-output-subtitle">Your trimmed clip appears here</span>
              </div>

              {!trimOutputRecord ? (
                <div className="compress-output-empty">
                  <div className="compress-output-empty-icon">
                    <Scissors size={36} style={{ opacity: 0.3 }} />
                  </div>
                  <p>No output yet. Cut and export a clip to see your result here.</p>
                  <span>Results persist across page reloads until you export a new clip.</span>
                </div>
              ) : (
                <div className="compress-output-card">
                  <div className="coc-status-bar">
                    {isCompleted ? (
                      <span className="coc-badge completed">✓ Completed</span>
                    ) : isFailed ? (
                      <span className="coc-badge failed">✗ Failed</span>
                    ) : (
                      <span className="coc-badge processing">
                        <RefreshCw size={11} className="pulse-anim" /> Processing…
                      </span>
                    )}
                    <button
                      className="coc-clear-btn"
                      onClick={() => {
                        setTrimOutputRecord(null);
                        localStorage.removeItem('vf-trim-output');
                      }}
                    >
                      <X size={12} /> Clear
                    </button>
                  </div>

                  <div className="coc-preview">
                    {trimUrl ? (
                      <div className="transcode-preview-player-wrapper" style={{ width: '100%', height: '100%', borderRadius: '6px', overflow: 'hidden' }}>
                        <VideoPlayer url={trimUrl} />
                      </div>
                    ) : (
                      <div className="coc-preview-placeholder">
                        <FileVideo size={32} style={{ opacity: 0.4 }} />
                        {isProcessing ? (
                          <span>Processing clip… <RefreshCw size={12} className="pulse-anim" /></span>
                        ) : (
                          <span>Preview will appear when ready</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="coc-actions-container" style={{ position: 'relative' }}>
                    <div className="coc-actions">
                      <button
                        className="coc-action-btn download"
                        disabled={!trimUrl}
                        onClick={() => {
                          const vidId = liveV?.videoId || (trimUrl ? extractVideoIdFromUrl(trimUrl) : null);
                          if (vidId) {
                            handleDownloadVideo(vidId, liveV?.originalName || trimOutputRecord?.originalName);
                          }
                        }}
                        style={!trimUrl ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                      >
                        <Download size={13} /> Download
                      </button>
                      <button
                        className="coc-action-btn view"
                        disabled={!trimUrl}
                        onClick={() => trimUrl && setActivePlayUrl(trimUrl)}
                      >
                        <PlayCircle size={13} /> View
                      </button>
                      <button
                        className="coc-action-btn share"
                        disabled={!trimUrl}
                        onClick={() => {
                          setShowTrimShareOptions(!showTrimShareOptions);
                        }}
                      >
                        <Share2 size={13} /> Share <ChevronDown size={12} />
                      </button>
                    </div>

                    {/* Share channels dropdown menu */}
                    {showTrimShareOptions && trimUrl && (
                      <div className="share-dropdown-menu tc-share-dropdown" style={{ bottom: 'calc(100% + 10px)' }}>
                        <div className="share-dropdown-header">Share Clip</div>
                        <button
                          className="share-option"
                          onClick={() => {
                            handleShareChannel('whatsapp');
                            setShowTrimShareOptions(false);
                          }}
                        >
                          <span className="share-option-icon">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.456L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.403.002 9.803-4.392 9.806-9.799.002-2.62-1.012-5.082-2.859-6.932C16.378 2.025 13.926.995 12.01.995c-5.402 0-9.802 4.394-9.806 9.801-.001 1.57.489 3.106 1.419 4.47l-.988 3.613 3.738-.979zM17.07 14.86c-.273-.136-1.616-.797-1.866-.888-.25-.091-.432-.136-.614.136-.182.273-.705.888-.864 1.07-.159.182-.318.205-.591.069-.273-.136-1.152-.424-2.194-1.353-.811-.723-1.358-1.617-1.517-1.89-.159-.273-.017-.42.12-.556.123-.122.273-.318.409-.477.136-.159.182-.273.273-.455.091-.182.046-.341-.023-.477-.069-.136-.614-1.477-.841-2.023-.222-.536-.464-.463-.637-.472-.164-.008-.353-.01-.54-.01-.188 0-.494.07-.753.353-.259.282-.99 1.07-.99 2.61s1.122 3.028 1.277 3.238c.155.21 2.207 3.37 5.348 4.723.748.322 1.332.514 1.787.659.751.238 1.436.205 1.977.124.603-.09 1.866-.763 2.128-1.463.261-.7.261-1.3.182-1.428-.078-.127-.273-.205-.546-.341z"/></svg>
                          </span>
                          <span>WhatsApp</span>
                        </button>
                        <button
                          className="share-option"
                          onClick={() => {
                            handleShareChannel('email');
                            setShowTrimShareOptions(false);
                          }}
                        >
                          <span className="share-option-icon"><Mail size={13} /></span>
                          <span>Email</span>
                        </button>
                        <button
                          className="share-option"
                          onClick={() => {
                            handleShareChannel('twitter');
                            setShowTrimShareOptions(false);
                          }}
                        >
                          <span className="share-option-icon">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                          </span>
                          <span>Twitter / X</span>
                        </button>
                        <button
                          className="share-option"
                          onClick={() => {
                            handleShareChannel('copy');
                            setShowTrimShareOptions(false);
                          }}
                        >
                          <span className="share-option-icon"><Link size={13} /></span>
                          <span>Copy Link</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="coc-meta">
                    <strong className="coc-name" title={trimOutputRecord.originalName}>
                      {trimOutputRecord.originalName}
                    </strong>
                    <div className="coc-specs">
                      <span>Type: Trimmed Clip</span>
                      <span>•</span>
                      <span>Duration: {trimOutputRecord.extra?.startTime !== undefined && trimOutputRecord.extra?.endTime !== undefined ? `${Number(trimOutputRecord.extra.endTime) - Number(trimOutputRecord.extra.startTime)}s` : 'Unknown'} ({trimOutputRecord.extra?.startTime}s - {trimOutputRecord.extra?.endTime}s)</span>
                      {trimOutputRecord.sizeBytes ? (
                        <>
                          <span className="dot">•</span>
                          <span>Original: {(trimOutputRecord.sizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
                        </>
                      ) : null}
                    </div>
                    <div className="coc-date">Queued: {new Date(trimOutputRecord.queuedAt).toLocaleString()}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          {statusMessage && <div className={`page-toast ${statusMessage.type}`}><Sparkles size={14} />{statusMessage.text}</div>}
        </FeaturePage>
      </div>
    );
  }

  if (page === 'thumbnail') {
    const tool = navTools.find(t => t.key === 'thumbnail')!;
    const liveV = thumbnailOutputRecord ? allVideos.find(v => v.videoId === thumbnailOutputRecord.videoId) : null;
    const thumbnailUrl = liveV?.outputUrl || liveV?.thumbnailUrl || thumbnailOutputRecord?.outputUrl;
    const thumbnailStatus = liveV?.status ?? (thumbnailOutputRecord ? 'queued' : undefined);
    
    const isCompleted = thumbnailStatus === 'completed';
    const isProcessing = thumbnailStatus === 'processing' || thumbnailStatus === 'queued';
    const isFailed = thumbnailStatus === 'failed';

    const handleShareChannel = (channel: 'whatsapp' | 'email' | 'twitter' | 'copy') => {
      if (!thumbnailUrl) return;
      const title = thumbnailOutputRecord?.originalName || 'Video Thumbnail';
      if (channel === 'copy') {
        copyToClipboard(thumbnailUrl)
          .then(() => showStatus('Link copied to clipboard!', 'success'))
          .catch(() => showStatus('Failed to copy link', 'error'));
      } else if (channel === 'whatsapp') {
        window.open(`https://wa.me/?text=${encodeURIComponent(title + '\n' + thumbnailUrl)}`, '_blank');
      } else if (channel === 'email') {
        window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent('Here is the video thumbnail link: ' + thumbnailUrl)}`, '_self');
      } else if (channel === 'twitter') {
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(thumbnailUrl)}&text=${encodeURIComponent('Check out ' + title)}`, '_blank');
      }
    };

    return (
      <div className="app-shell droplane-bg">
        <FeaturePage
          tool={tool}
          history={historyFor('thumbnail')}
          historyLabel="Thumbnail History"
          onBack={goHome}
          onRefresh={loadVideos}
          selectedVideo={selectedVideo}
          onSelectVideo={setSelectedVideo}
          activePlayUrl={activePlayUrl}
          setActivePlayUrl={setActivePlayUrl}
          activePlayResolution={activePlayResolution}
          activePlayVideo={activePlayVideo}
          setActivePlayVideo={setActivePlayVideo}
          onDeleteVideo={handleDeleteVideo}
          onDownloadVideo={handleDownloadVideo}
          showStatus={showStatus}
          fullWidth
        >
          <div className="compress-split-layout">
            <div className="compress-left-panel">
              <div className="tool-form" style={{ background: 'transparent', border: 'none', padding: 0, backdropFilter: 'none', boxShadow: 'none' }}>
                <div className="form-head">
                  <h3>Thumbnail Generator</h3>
                  <p>Extract custom, high-quality thumbnails from your video assets at any timestamp.</p>
                </div>
                
                <div className="compress-source-tabs" style={{ marginBottom: '20px' }}>
                  {([
                    { id: 'upload' as const, label: 'Upload File', icon: Upload },
                    { id: 'cloud' as const, label: 'Cloud Import', icon: CloudUpload },
                    { id: 'url' as const, label: 'Paste URL', icon: Link },
                    { id: 'library' as const, label: 'My Library', icon: FileVideo },
                  ]).map(tab => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        className={`compress-tab-btn ${thumbnailSourceTab === tab.id ? 'active' : ''}`}
                        onClick={() => {
                          setThumbnailSourceTab(tab.id);
                          if (tab.id === 'cloud') setShowCloudModal(true);
                        }}
                      >
                        <Icon size={14} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <div className="compress-tab-content">
                  {thumbnailSourceTab === 'upload' && (
                    <div className="compress-upload-zone">
                      <UploadWidget onUploadComplete={async id => {
                        showStatus('Upload complete! Video selected for thumbnail generation.', 'success');
                        try {
                          const videos = await listVideos();
                          setAllVideos(videos);
                          const match = videos.find(v => v.videoId === id);
                          if (match) {
                            setSelectedVideo(match);
                          }
                        } catch (err) {
                          loadVideos();
                        }
                        setThumbnailSourceTab('library');
                      }} />
                      <div className="presign-info-strip">
                        <ShieldCheck size={13} style={{ color: 'var(--success-color)' }} />
                        <span><strong>Pre-Signed URL Upload</strong> — Direct upload to S3 from your browser.</span>
                      </div>
                    </div>
                  )}

                  {thumbnailSourceTab === 'cloud' && (
                    <div className="compress-cloud-tab">
                      <div className="cloud-tab-illustration">
                        <CloudUpload size={40} style={{ color: 'var(--accent-color)', opacity: 0.7 }} />
                        <h4>Connect a Cloud Provider</h4>
                        <p>Import videos from Google Drive, Dropbox, or OneDrive using secure OAuth.</p>
                        <button className="btn-trigger" onClick={() => setShowCloudModal(true)}>
                          <CloudUpload size={14} /> Choose Cloud Provider
                        </button>
                      </div>
                    </div>
                  )}

                  {thumbnailSourceTab === 'url' && (
                    <div className="compress-url-tab">
                      <label className="input-group">
                        <span>Video URL</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="url"
                            className="text-input"
                            placeholder="https://youtube.com/watch?v=... or direct video link"
                            value={thumbnailUrlInput}
                            onChange={e => thumbnailUrlInput === undefined ? '' : setThumbnailUrlInput(e.target.value)}
                          />
                          <button
                            className="btn-trigger salmon-color-btn"
                            style={{ whiteSpace: 'nowrap', padding: '0 16px' }}
                            disabled={!thumbnailUrlInput.trim() || thumbnailIsProcessing}
                            onClick={async () => {
                              if (!thumbnailUrlInput.trim()) return;
                              try {
                                setThumbnailIsProcessing(true);
                                showStatus('Fetching video from URL...', 'info');
                                const result = await triggerDownloadUrl(thumbnailUrlInput.trim());
                                showStatus('Video fetched! Select timestamp below to generate thumbnail.', 'success');
                                loadVideos();
                                setThumbnailUrlInput('');
                                setThumbnailSourceTab('library');
                              } catch (err: any) {
                                showStatus(err.message || 'Failed to fetch', 'error');
                              } finally {
                                setThumbnailIsProcessing(false);
                              }
                            }}
                          >
                            {thumbnailIsProcessing ? <RefreshCw size={14} className="pulse-anim" /> : <Download size={14} />}
                            Fetch Video
                          </button>
                        </div>
                      </label>
                    </div>
                  )}

                  {thumbnailSourceTab === 'library' && (
                    <div className="compress-library-tab">
                      <label className="input-group">
                        <span>Source Video</span>
                        <VideoSelector 
                          allVideos={allVideos} 
                          selectedVideo={selectedVideo} 
                          onSelectVideo={setSelectedVideo} 
                          placeholder="Search video to capture..."
                          onDeleteVideo={handleDeleteVideo}
                        />
                      </label>
                      
                      <div className="op-sub-panel" style={{ marginTop: '20px' }}>
                        <h4>Extraction Offset</h4>
                        <div className="trim-inputs" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <label>
                            <span>Capture Timestamp (seconds)</span>
                            <input 
                              type="number" 
                              className="text-input sm" 
                              min="0" 
                              value={thumbnailOffset} 
                              onChange={e => setThumbnailOffset(Math.max(0, +e.target.value))} 
                            />
                          </label>
                        </div>
                        <button 
                          className="btn-trigger" 
                          style={{ background: 'var(--accent-color)', color: 'white', marginTop: '1.5rem', width: '100%', justifyContent: 'center' }} 
                          disabled={!selectedVideo || thumbnailIsProcessing} 
                          onClick={() => selectedVideo && handleGenerateThumbnail(selectedVideo.videoId)}
                        >
                          <Image size={14} /> Extract & Generate Cover
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="compress-right-panel">
              <div className="compress-output-header">
                <strong>Output</strong>
                <span className="compress-output-subtitle">Your generated thumbnail appears here</span>
              </div>

              {!thumbnailOutputRecord ? (
                <div className="compress-output-empty">
                  <div className="compress-output-empty-icon">
                    <Image size={36} style={{ opacity: 0.3 }} />
                  </div>
                  <p>No output yet. Select a video, set a timestamp, and extract the thumbnail.</p>
                </div>
              ) : (
                <div className="compress-output-card">
                  <div className="coc-status-bar">
                    {isCompleted ? (
                      <span className="coc-badge completed">✓ Completed</span>
                    ) : isFailed ? (
                      <span className="coc-badge failed">✗ Failed</span>
                    ) : (
                      <span className="coc-badge processing">
                        <RefreshCw size={11} className="pulse-anim" /> Processing… {liveV?.progress || 0}%
                      </span>
                    )}
                    <button
                      className="coc-clear-btn"
                      onClick={() => {
                        setThumbnailOutputRecord(null);
                        localStorage.removeItem('vf-thumbnail-output');
                      }}
                    >
                      <X size={12} /> Clear
                    </button>
                  </div>

                  <div className="coc-preview" style={{ background: '#121212', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '8px' }}>
                    {thumbnailUrl ? (
                      <img 
                        src={thumbnailUrl} 
                        alt="Extracted Thumbnail" 
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <div className="coc-preview-placeholder" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                        <Image size={32} style={{ opacity: 0.4 }} />
                        {isProcessing ? (
                          <span>Generating thumbnail... {liveV?.progress || 0}%</span>
                        ) : (
                          <span>Thumbnail preview will appear here</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="coc-actions-container" style={{ position: 'relative', marginTop: '16px' }}>
                    <div className="coc-actions" style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="coc-action-btn download"
                        disabled={!thumbnailUrl}
                        onClick={() => {
                          if (thumbnailUrl) {
                            window.open(thumbnailUrl, '_blank');
                          }
                        }}
                        style={{ flex: 1, padding: '8px 16px', borderRadius: '6px', background: 'var(--accent-color)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: thumbnailUrl ? 'pointer' : 'not-allowed', opacity: thumbnailUrl ? 1 : 0.5 }}
                      >
                        <Download size={13} /> Open Image
                      </button>
                      <button
                        className="coc-action-btn share"
                        disabled={!thumbnailUrl}
                        onClick={() => setShowThumbnailShareOptions(!showThumbnailShareOptions)}
                        style={{ padding: '8px 16px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-color)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '6px', cursor: thumbnailUrl ? 'pointer' : 'not-allowed', opacity: thumbnailUrl ? 1 : 0.5 }}
                      >
                        <Share2 size={13} /> Share <ChevronDown size={12} />
                      </button>
                    </div>

                    {showThumbnailShareOptions && thumbnailUrl && (
                      <div className="share-dropdown-menu tc-share-dropdown" style={{ bottom: 'calc(100% + 10px)' }}>
                        <div className="share-dropdown-header">Share Cover</div>
                        <button className="share-option" onClick={() => { handleShareChannel('whatsapp'); setShowThumbnailShareOptions(false); }}><span className="share-option-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.456L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.403.002 9.803-4.392 9.806-9.799.002-2.62-1.012-5.082-2.859-6.932C16.378 2.025 13.926.995 12.01.995c-5.402 0-9.802 4.394-9.806 9.801-.001 1.57.489 3.106 1.419 4.47l-.988 3.613 3.738-.979zM17.07 14.86c-.273-.136-1.616-.797-1.866-.888-.25-.091-.432-.136-.614.136-.182.273-.705.888-.864 1.07-.159.182-.318.205-.591.069-.273-.136-1.152-.424-2.194-1.353-.811-.723-1.358-1.617-1.517-1.89-.159-.273-.017-.42.12-.556.123-.122.273-.318.409-.477.136-.159.182-.273.273-.455.091-.182.046-.341-.023-.477-.069-.136-.614-1.477-.841-2.023-.222-.536-.464-.463-.637-.472-.164-.008-.353-.01-.54-.01-.188 0-.494.07-.753.353-.259.282-.99 1.07-.99 2.61s1.122 3.028 1.277 3.238c.155.21 2.207 3.37 5.348 4.723.748.322 1.332.514 1.787.659.751.238 1.436.205 1.977.124.603-.09 1.866-.763 2.128-1.463.261-.7.261-1.3.182-1.428-.078-.127-.273-.205-.546-.341z"/></svg></span>WhatsApp</button>
                        <button className="share-option" onClick={() => { handleShareChannel('email'); setShowThumbnailShareOptions(false); }}><span className="share-option-icon"><Mail size={13} /></span>Email</button>
                        <button className="share-option" onClick={() => { handleShareChannel('twitter'); setShowThumbnailShareOptions(false); }}><span className="share-option-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></span>Twitter / X</button>
                        <button className="share-option" onClick={() => { handleShareChannel('copy'); setShowThumbnailShareOptions(false); }}><span className="share-option-icon"><Link size={13} /></span>Copy Link</button>
                      </div>
                    )}
                  </div>

                  <div className="coc-meta" style={{ marginTop: '12px' }}>
                    <strong className="coc-name" title={thumbnailOutputRecord.originalName}>
                      {thumbnailOutputRecord.originalName}
                    </strong>
                    <div className="coc-specs">
                      <span>Type: Video Thumbnail</span>
                      <span>•</span>
                      <span>Capture Time: {thumbnailOutputRecord.extra?.offset || 2}s</span>
                    </div>
                    <div className="coc-date">Queued: {new Date(thumbnailOutputRecord.queuedAt).toLocaleString()}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          {statusMessage && <div className={`page-toast ${statusMessage.type}`}><Sparkles size={14} />{statusMessage.text}</div>}
        </FeaturePage>
      </div>
    );
  }

  if (page === 'library') {
    const tool = navTools.find(t => t.key === 'library')!;
    const libraryFilterTabs: { id: LibraryFilter; label: string; icon: React.ElementType; jobType: string }[] = [
      { id: 'all',       label: 'All Videos',      icon: LayoutGrid,      jobType: 'all'       },
      { id: 'compress',  label: 'Compressed',       icon: Minimize2,       jobType: 'compress'  },
      { id: 'transcode', label: 'Transcoded',       icon: Clapperboard,    jobType: 'transcode' },
      { id: 'convert',   label: 'Converted',        icon: SlidersHorizontal, jobType: 'convert' },
      { id: 'audio',     label: 'Audio',            icon: AudioLines,      jobType: 'audio'     },
      { id: 'trim',      label: 'Trimmed Clips',    icon: ScissorsIcon,    jobType: 'trim'      },
      { id: 'download',  label: 'Downloaded',       icon: ArrowDownToLine, jobType: 'download'  },
    ];

    const filteredLibraryVideos = libraryFilter === 'all'
      ? allVideos
      : allVideos.filter((v: any) => {
          if (v.jobType) return v.jobType === libraryFilter;
          return false; // strict: only show when jobType matches
        }).filter((v: any) => {
          // respect section-hidden videos
          const hidden = hiddenSectionVideos[v.videoId];
          if (hidden && hidden.includes(libraryFilter)) return false;
          return true;
        });

    return (
      <div className="app-shell droplane-bg library-page-shell">
        <FeaturePage
          tool={tool}
          history={allVideos}
          historyLabel="All Videos"
          onBack={goHome}
          onRefresh={loadVideos}
          selectedVideo={selectedVideo}
          onSelectVideo={setSelectedVideo}
          activePlayUrl={activePlayUrl}
          setActivePlayUrl={setActivePlayUrl}
          activePlayResolution={activePlayResolution}
          activePlayVideo={activePlayVideo}
          setActivePlayVideo={setActivePlayVideo}
          onDeleteVideo={handleDeleteVideo}
          onDownloadVideo={handleDownloadVideo}
          showStatus={showStatus}
          fullWidth
        >
          {/* Library Page Header */}
          <div className="lib-page-header">
            <div className="lib-page-header-text">
              <h2 className="lib-page-title">My Videos</h2>
              <p className="lib-page-subtitle">All your uploads, downloads, and processed outputs.</p>
            </div>
            <div className="lib-page-stats">
              <div className="lib-stat-chip">
                <span className="lib-stat-num">{allVideos.length}</span>
                <span className="lib-stat-label">Total</span>
              </div>
              <div className="lib-stat-chip">
                <span className="lib-stat-num">{allVideos.filter((v: any) => v.status === 'completed').length}</span>
                <span className="lib-stat-label">Ready</span>
              </div>
            </div>
          </div>

          {/* Professional Flat Tab Navigation + divider */}
          <div className="lib-tab-bar-wrapper">
            <div className="lib-tab-nav" role="tablist">
              {libraryFilterTabs.map(tab => {
                const TabIcon = tab.icon;
                const count = tab.id === 'all'
                  ? allVideos.length
                  : allVideos.filter((v: any) => v.jobType === tab.id).length;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={libraryFilter === tab.id}
                    className={`lib-tab-btn ${libraryFilter === tab.id ? 'active' : ''}`}
                    onClick={() => setLibraryFilter(tab.id)}
                  >
                    <TabIcon size={14} className="lib-tab-icon" />
                    <span className="lib-tab-label">{tab.label}</span>
                    {count > 0 && <span className="lib-tab-count">{count}</span>}
                  </button>
                );
              })}
            </div>
            <hr className="lib-tab-divider" />
          </div>

          {statusMessage && <div className={`page-toast ${statusMessage.type}`}><Sparkles size={14} />{statusMessage.text}</div>}

          <div className="tool-form">
            {filteredLibraryVideos.length === 0 ? (
              <div className="library-empty-state">
                <div className="library-empty-icon">
                  <FileVideo size={48} style={{ opacity: 0.35 }} />
                </div>
                <h4>
                  {libraryFilter === 'all' ? 'No Videos Yet' : `No ${libraryFilterTabs.find(p => p.id === libraryFilter)?.label} Videos`}
                </h4>
                <p>
                  {libraryFilter === 'all'
                    ? 'Upload or process a video to build your library.'
                    : `You haven't used the ${libraryFilterTabs.find(p => p.id === libraryFilter)?.label.toLowerCase()} service yet. Head to that tool to get started!`}
                </p>
                {libraryFilter !== 'all' && (
                  <button className="btn-trigger" style={{ marginTop: '16px' }} onClick={() => setLibraryFilter('all')}>
                    View All Videos
                  </button>
                )}
              </div>
            ) : (
              <div className="video-library-grid">
                {filteredLibraryVideos.map(v => (
                  <div 
                    key={v.videoId} 
                    className={`video-card ${selectedVideo?.videoId === v.videoId ? 'active' : ''}`} 
                    onClick={() => {
                      setSelectedVideo(v);
                      if (v.status === 'completed') {
                        setActivePlayUrl(v.outputUrl || v.masterPlaylistUrl || null);
                        setActivePlayResolution(undefined);
                      }
                    }}
                  >
                    <div className="video-card-main-content">
                      <div className="video-card-preview-container">
                        {v.thumbnailUrl ? (
                          <img 
                            src={v.thumbnailUrl} 
                            alt={v.originalName} 
                            className="video-card-thumbnail animate-fade-in" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (v.outputUrl && v.outputUrl.endsWith('.mp4')) ? (
                          <video 
                            src={v.outputUrl} 
                            className="video-card-player" 
                            muted 
                            playsInline 
                            preload="metadata" 
                            onMouseOver={e => (e.target as HTMLVideoElement).play()} 
                            onMouseOut={e => (e.target as HTMLVideoElement).pause()} 
                          />
                        ) : (
                          <div className="video-card-placeholder-icon">
                            <FileVideo size={40} className="placeholder-svg" />
                          </div>
                        )}
                        <div className="video-card-overlay">
                          <PlayCircle size={38} className="play-icon" />
                        </div>
                      </div>
                      
                      <div className="video-meta">
                        <strong className="video-title" title={displayVideoName(v)}>{displayVideoName(v)}</strong>
                        
                        <div className="video-specs" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {v.status === 'completed' ? (
                              <span className="video-card-status-inline completed">Ready</span>
                            ) : (
                              <span className={`video-card-status-inline ${v.status}`}>
                                {v.status === 'failed' ? 'Error' : 'Processing'}
                              </span>
                            )}
                            <span>{v.sizeBytes && v.sizeBytes > 0 ? formatBytes(v.sizeBytes) : ''}</span>
                          </div>
                          <span>{formatRelativeTime(v.uploadedAt)}</span>
                        </div>

                        {(v.status === 'processing' || v.status === 'queued') && (
                          <div className="video-card-progress-bar-wrapper" style={{ width: '100%', marginTop: '6px', marginBottom: '8px' }}>
                            <div className="progress-bar-outer" style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div 
                                className="progress-bar-inner" 
                                style={{ 
                                  width: `${v.progress || 0}%`, 
                                  height: '100%', 
                                  background: 'var(--accent-color)', 
                                  transition: 'width 0.4s ease' 
                                }} 
                              />
                            </div>
                            <div className="progress-bar-label" style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
                              <span>{v.status === 'queued' ? 'Queued...' : 'Processing...'}</span>
                              <span>{v.progress || 0}%</span>
                            </div>
                          </div>
                        )}

                        {v.status === 'completed' && (
                          <div className="video-card-qualities-wrapper" onClick={(e) => e.stopPropagation()}>
                            <span className="video-card-qualities-label">Available Resolutions:</span>
                            <div className="video-card-qualities">
                              {v.masterPlaylistUrl ? (
                                // HLS Resolutions
                                (['1080p', '720p', '480p', '360p'] as const).map((res) => (
                                  <button
                                    key={res}
                                    className="card-quality-btn"
                                    onClick={() => {
                                      setActivePlayUrl(v.masterPlaylistUrl!);
                                      setActivePlayResolution(res);
                                    }}
                                  >
                                    {res}
                                  </button>
                                ))
                              ) : (
                                // MP4 Output
                                <button
                                  className="card-quality-btn primary"
                                  onClick={() => {
                                    setActivePlayUrl(v.outputUrl || v.masterPlaylistUrl || null);
                                    setActivePlayResolution(undefined);
                                  }}
                                >
                                  Play MP4
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {v.status === 'completed' ? (
                      <div className="video-card-actions-sidebar" onClick={(e) => e.stopPropagation()}>
                        <button 
                          className="video-card-action-btn share"
                          title="Copy Share Link"
                          onClick={() => {
                            const shareUrl = v.outputUrl || v.masterPlaylistUrl || '';
                            copyToClipboard(shareUrl)
                              .then(() => showStatus('Link copied to clipboard!', 'success'))
                              .catch(() => showStatus('Failed to copy link', 'error'));
                          }}
                        >
                          <Share2 size={12} />
                          <span>Share</span>
                        </button>
                        <button 
                          className="video-card-action-btn download"
                          title="Download Video"
                          onClick={() => {
                            if (v.videoId) {
                              handleDownloadVideo(v.videoId, v.originalName);
                            }
                          }}
                        >
                          <Download size={12} />
                          <span>Download</span>
                        </button>
                        <button 
                          className="video-card-action-btn delete-btn-row"
                          title="Delete Video"
                          onClick={async () => {
                            if (window.confirm(`Are you sure you want to delete "${v.originalName || 'this video'}"?`)) {
                              await handleDeleteVideo(v.videoId);
                            }
                          }}
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    ) : (
                      <div className="video-card-actions-sidebar non-completed" onClick={(e) => e.stopPropagation()}>
                        <button 
                          className="video-card-action-btn delete-btn-row"
                          title="Delete Video"
                          onClick={async () => {
                            if (window.confirm(`Are you sure you want to delete "${v.originalName || 'this video'}"?`)) {
                              await handleDeleteVideo(v.videoId);
                            }
                          }}
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </FeaturePage>
      </div>
    );
  }

  if (page === 'pricing') {
    return (
      <div className="app-shell droplane-bg">
        <header className="home-header finisher-header-top">
          <button className="header-logo" onClick={goHome}>
            <span className="logo-text-animated wave-text">
              {'VideoForge'.split('').map((c, i) => (
                <span key={i} style={{ animationDelay: `${i * 0.15}s` }}>
                  {c}
                </span>
              ))}
            </span>
          </button>
          <div className="header-actions">
            <button className="btn-signin" onClick={goHome}>Back to Console</button>
          </div>
        </header>

        <main className="pricing-main animate-slide-up">
          <div className="pricing-header">
            <span className="hero-eyebrow"><Sparkles size={13} /> Transparent Pricing</span>
            <h2>Choose the perfect workspace tier</h2>
            <p>Unlock high-performance multi-rung streaming, bulk asset processing, and cloud pipeline integrations.</p>
          </div>

          <div className="pricing-cards-container">
            {/* Starter */}
            <div className="pricing-card-box">
              <div className="pc-tier">Starter</div>
              <div className="pc-price"><strong>$0</strong><span>/ forever</span></div>
              <p className="pc-desc">Great for quick testing and small clips.</p>
              <ul className="pc-features">
                <li><span>✓</span> 480p Transcoding max</li>
                <li><span>✓</span> 10 GB S3 Cache Allocation</li>
                <li><span>✓</span> Single thread worker</li>
                <li><span>✓</span> Standard trimming/conversions</li>
              </ul>
              <button className="btn-trigger" style={{ marginTop: '20px' }} onClick={goHome}>Start Testing</button>
            </div>

            {/* Pro (Highlighted) */}
            <div className="pricing-card-box highlighted">
              <div className="pc-popular-badge">MOST POPULAR</div>
              <div className="pc-tier">Professional</div>
              <div className="pc-price"><strong>$29</strong><span>/ month</span></div>
              <p className="pc-desc">For serious editors, product managers & creators.</p>
              <ul className="pc-features">
                <li><span>✓</span> 1080p/4K HLS streaming</li>
                <li><span>✓</span> 150 GB secure storage</li>
                <li><span>✓</span> Multi-threaded concurrent processing</li>
                <li><span>✓</span> Custom Watermarks & subtitle extraction</li>
                <li><span>✓</span> Integrations with Vimeo & Frame.io</li>
              </ul>
              <button className="btn-trigger success" style={{ marginTop: '20px' }} onClick={() => alert('Subscription initialized!')}>Upgrade to Pro</button>
            </div>

            {/* Studio */}
            <div className="pricing-card-box">
              <div className="pc-tier">Studio Enterprise</div>
              <div className="pc-price"><strong>$99</strong><span>/ month</span></div>
              <p className="pc-desc">High volume API integrations & scaling pipelines.</p>
              <ul className="pc-features">
                <li><span>✓</span> Full unrestricted API access</li>
                <li><span>✓</span> 1 TB high-speed S3 allocation</li>
                <li><span>✓</span> Dedicated cloud pipeline queue</li>
                <li><span>✓</span> SLA guarantees & custom webhook events</li>
                <li><span>✓</span> 24/7 dedicated support team</li>
              </ul>
              <button className="btn-trigger violet" style={{ marginTop: '20px' }} onClick={() => alert('Enterprise contact initialized!')}>Contact Sales</button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (page === 'settings') {
    const tool = navTools.find(t => t.key === 'settings')!;
    
    const sidebarTabs = [
      { key: 'general' as const, label: 'General', icon: SlidersHorizontal, desc: 'Manage display details' },
      { key: 'videos' as const, label: 'My Videos', icon: FileVideo, desc: 'Your secure videos' },
      { key: 'billing' as const, label: 'Billing & Plans', icon: ShieldCheck, desc: 'Subscription details' },
      { key: 'api' as const, label: 'API Credentials', icon: Zap, desc: 'Tokens & webhooks' }
    ];

    return (
      <div className="app-shell droplane-bg">
        <FeaturePage
          tool={tool}
          history={[]}
          historyLabel=""
          onBack={goHome}
          onRefresh={loadVideos}
          selectedVideo={null}
          onSelectVideo={() => {}}
          activePlayVideo={activePlayVideo}
          setActivePlayVideo={setActivePlayVideo}
          onDeleteVideo={handleDeleteVideo}
          onDownloadVideo={handleDownloadVideo}
          showStatus={showStatus}
          fullWidth
        >
          <div className="settings-sidebar-layout animate-slide-up">
            {/* Sidebar List */}
            <aside className="settings-aside">
              <div className="aside-head">
                <h3>Console Control</h3>
                <p>Configure your workspace environment</p>
              </div>
              <div className="aside-tabs-list">
                {sidebarTabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = settingsActiveTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      className={`aside-tab-btn ${isActive ? 'active' : ''}`}
                      onClick={() => setSettingsActiveTab(tab.key)}
                    >
                      <Icon size={16} className="aside-tab-icon" />
                      <div className="aside-tab-info">
                        <strong>{tab.label}</strong>
                        <span>{tab.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Right Content Panel */}
            <div className="settings-main-content">
              {settingsActiveTab === 'general' && (
                <div className="settings-tab-panel animate-slide-up">
                  <div className="form-head">
                    <h3>General Settings</h3>
                    <p>Manage your account identity details.</p>
                  </div>
                  <div className="settings-fields-card">
                    <label className="input-group">
                      <span>Display Name</span>
                      <input 
                        className="text-input" 
                        value={settingsName} 
                        onChange={e => setSettingsName(e.target.value)} 
                      />
                    </label>
                    <label className="input-group">
                      <span>Email Address</span>
                      <input className="text-input" value={profile.email || ''} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                    </label>
                    <label className="input-group">
                      <span>Username</span>
                      <input 
                        className="text-input" 
                        value={settingsUsername} 
                        placeholder="Choose a unique username"
                        onChange={e => setSettingsUsername(e.target.value)} 
                      />
                      {settingsUsername.trim().toLowerCase() !== (profile.username || '') && (
                        <div style={{ marginTop: '6px', fontSize: '12px', fontWeight: 500 }}>
                          {settingsUsernameAvailable === 'checking' && (
                            <span style={{ color: 'var(--warning-color)' }}>Checking username availability...</span>
                          )}
                          {settingsUsernameAvailable === true && (
                            <span style={{ color: 'var(--success-color)' }}>✓ Username is available!</span>
                          )}
                          {settingsUsernameAvailable === false && (
                            <span style={{ color: 'var(--danger-color)' }}>✗ Username is taken or invalid (3-15 chars, letters/numbers/_)</span>
                          )}
                        </div>
                      )}
                    </label>
                    <label className="input-group">
                      <span>Profile Image</span>
                      <input className="text-input file-input" type="file" accept="image/*" onChange={handleProfileImageUpload} />
                    </label>

                    <button 
                      className="btn btn-primary" 
                      onClick={handleSaveProfile} 
                      disabled={settingsSaving || (settingsUsername.trim().toLowerCase() !== (profile.username || '') && (settingsUsernameAvailable === 'checking' || settingsUsernameAvailable === false))}
                      style={{ marginTop: '1.5rem', width: 'fit-content', padding: '10px 24px', background: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      {settingsSaving ? 'Saving...' : 'Save Profile Settings'}
                    </button>
                  </div>
                </div>
              )}

              {settingsActiveTab === 'videos' && (
                <div className="settings-tab-panel animate-slide-up">
                  <div className="form-head">
                    <h3>My Processed Videos</h3>
                    <p>All transcode and download assets linked exclusively to your account.</p>
                  </div>
                  <div className="settings-fields-card">
                    {loadingUserVideos ? (
                      <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
                        <RefreshCw className="pulse-anim" style={{ margin: '0 auto 12px' }} />
                        <span>Fetching secure assets...</span>
                      </div>
                    ) : userVideos.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.08)' }}>
                        <FileVideo size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px', opacity: 0.6 }} />
                        <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>No Private Videos Found</h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Start transcoding or downloading to build your secure library.</p>
                      </div>
                    ) : (
                      <div className="video-library-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', display: 'grid' }}>
                        {userVideos.map(v => (
                          <div 
                            key={v.videoId} 
                            className={`video-card ${selectedVideo?.videoId === v.videoId ? 'active' : ''}`}
                            onClick={() => { setSelectedVideo(v); goHome(); }}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="video-card-main-content">
                              <div className="video-card-preview-container">
                                {v.thumbnailUrl ? (
                                  <img 
                                    src={v.thumbnailUrl} 
                                    alt={v.originalName} 
                                    className="video-card-thumbnail animate-fade-in" 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                ) : (v.outputUrl || v.masterPlaylistUrl) ? (
                                  <video 
                                    src={v.outputUrl || v.masterPlaylistUrl} 
                                    className="video-card-player" 
                                    muted 
                                    playsInline 
                                    preload="metadata" 
                                    onMouseOver={e => (e.target as HTMLVideoElement).play()} 
                                    onMouseOut={e => (e.target as HTMLVideoElement).pause()} 
                                  />
                                ) : (
                                  <div className="video-card-placeholder-icon">
                                    <FileVideo size={36} className="placeholder-svg" />
                                  </div>
                                )}
                                <div className="video-card-overlay">
                                  <PlayCircle size={32} className="play-icon" />
                                </div>
                              </div>
                              <div className="video-meta">
                                <strong className="video-title" style={{ fontSize: '13px' }} title={displayVideoName(v)}>{displayVideoName(v)}</strong>
                                
                                <div className="video-specs" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', fontSize: '11px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {v.status === 'completed' ? (
                                      <span className="video-card-status-inline completed" style={{ fontSize: '9px', padding: '2px 5px' }}>Ready</span>
                                    ) : (
                                      <span className={`video-card-status-inline ${v.status}`} style={{ fontSize: '9px', padding: '2px 5px' }}>
                                        {v.status === 'failed' ? 'Error' : 'Processing'}
                                      </span>
                                    )}
                                    <span>{v.sizeBytes && v.sizeBytes > 0 ? formatBytes(v.sizeBytes) : ''}</span>
                                  </div>
                                  <span>{formatRelativeTime(v.uploadedAt)}</span>
                                </div>

                                {(v.status === 'processing' || v.status === 'queued') && (
                                  <div className="video-card-progress-bar-wrapper" style={{ width: '100%', marginTop: '6px', marginBottom: '8px' }}>
                                    <div className="progress-bar-outer" style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                                      <div 
                                        className="progress-bar-inner" 
                                        style={{ 
                                          width: `${v.progress || 0}%`, 
                                          height: '100%', 
                                          background: 'var(--accent-color)', 
                                          transition: 'width 0.4s ease' 
                                        }} 
                                      />
                                    </div>
                                    <div className="progress-bar-label" style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
                                      <span>{v.status === 'queued' ? 'Queued...' : 'Processing...'}</span>
                                      <span>{v.progress || 0}%</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {v.status === 'completed' ? (
                              <div className="video-card-actions-sidebar" onClick={(e) => e.stopPropagation()}>
                                <button 
                                  className="video-card-action-btn share"
                                  title="Copy Share Link"
                                  style={{ padding: '4px 8px', fontSize: '10px' }}
                                  onClick={() => {
                                    const shareUrl = v.outputUrl || v.masterPlaylistUrl;
                                    if (shareUrl) {
                                      copyToClipboard(shareUrl)
                                        .then(() => showStatus('Link copied to clipboard!', 'success'))
                                        .catch(() => showStatus('Failed to copy link', 'error'));
                                    }
                                  }}
                                >
                                  <Share2 size={10} />
                                  <span>Share</span>
                                </button>
                                <button 
                                  className="video-card-action-btn download"
                                  title="Download Video"
                                  style={{ padding: '4px 8px', fontSize: '10px' }}
                                  onClick={() => {
                                    if (v.videoId) {
                                      handleDownloadVideo(v.videoId, v.originalName);
                                    }
                                  }}
                                >
                                  <Download size={10} />
                                  <span>Download</span>
                                </button>
                                <button 
                                  className="video-card-action-btn delete-btn-row"
                                  title="Delete Video"
                                  style={{ padding: '4px 8px', fontSize: '10px' }}
                                  onClick={async () => {
                                    if (window.confirm(`Are you sure you want to delete "${v.originalName || 'this video'}"?`)) {
                                      await handleDeleteVideo(v.videoId);
                                    }
                                  }}
                                >
                                  <Trash2 size={10} />
                                  <span>Delete</span>
                                </button>
                              </div>
                            ) : (
                              <div className="video-card-actions-sidebar non-completed" onClick={(e) => e.stopPropagation()}>
                                <button 
                                  className="video-card-action-btn delete-btn-row"
                                  title="Delete Video"
                                  style={{ padding: '4px 8px', fontSize: '10px' }}
                                  onClick={async () => {
                                    if (window.confirm(`Are you sure you want to delete "${v.originalName || 'this video'}"?`)) {
                                      await handleDeleteVideo(v.videoId);
                                    }
                                  }}
                                >
                                  <Trash2 size={10} />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {settingsActiveTab === 'appearance' && (
                <div className="settings-tab-panel animate-slide-up">
                  <div className="form-head">
                    <h3>Appearance & Interface</h3>
                    <p>Customize how VideoForge looks and behaves.</p>
                  </div>
                  <div className="settings-fields-card">
                    <span>Theme Interface</span>
                    <div className="theme-toggle">
                      <button 
                        className={profile.theme === 'midnight' ? 'active' : ''} 
                        onClick={() => setProfile({ ...profile, theme: 'midnight' })}
                      >
                        <Moon size={16} /> Midnight (Dark)
                      </button>
                      <button 
                        className={profile.theme === 'daylight' ? 'active' : ''} 
                        onClick={() => setProfile({ ...profile, theme: 'daylight' })}
                      >
                        <Sun size={16} /> Daylight (Light Warm)
                      </button>
                    </div>
                    <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      Droplane warm radial background works best in Daylight. Midnight is optimized for deep low-light rooms.
                    </div>
                  </div>
                </div>
              )}

              {settingsActiveTab === 'billing' && (
                <div className="settings-tab-panel animate-slide-up">
                  <div className="form-head">
                    <h3>Billing & Active Plan</h3>
                    <p>Manage payments and subscription terms.</p>
                  </div>
                  <div className="settings-fields-card">
                    <div className="sib-stat">
                      <span>Current Subscription</span>
                      <strong style={{ color: 'var(--accent-color)', fontSize: '18px' }}>Free Tier Trial</strong>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                      Your trial has 14 days remaining. Upgrade to Pro for high-performance HLS multi-rung transcoding and unlimited uploads.
                    </p>
                    <button className="btn-trigger success" style={{ marginTop: '16px', width: 'fit-content' }} onClick={() => goTo('pricing')}>
                      View Upgrade Plans
                    </button>
                  </div>
                </div>
              )}

              {settingsActiveTab === 'api' && (
                <div className="settings-tab-panel animate-slide-up">
                  <div className="form-head">
                    <h3>Programmatic API Webhooks</h3>
                    <p>Create credentials to process videos via cURL or custom jobs.</p>
                  </div>
                  <div className="settings-fields-card">
                    <div className="api-key-box">
                      <code>vf_live_839a8cdbc948b8ca819284cfad</code>
                      <button className="btn-trigger" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => alert('API Key copied to clipboard!')}>Copy</button>
                    </div>
                    <span className="sib-caption">Keep this key private! It grants full read/write access to your VideoForge library.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </FeaturePage>
      </div>
    );
  }

  if (page === 'profile') {
    const tool = navTools.find(t => t.key === 'settings')!;
    return (
      <div className="app-shell droplane-bg">
        <FeaturePage
          tool={{ ...tool, label: 'My Profile', caption: 'Manage your account' }}
          history={[]}
          historyLabel=""
          onBack={goHome}
          onRefresh={loadVideos}
          selectedVideo={null}
          onSelectVideo={() => {}}
          activePlayVideo={activePlayVideo}
          setActivePlayVideo={setActivePlayVideo}
          onDeleteVideo={handleDeleteVideo}
          onDownloadVideo={handleDownloadVideo}
          showStatus={showStatus}
        >
          <div className="tool-form">
            <div className="form-head"><h3>My Profile</h3><p>Your account identity and session details.</p></div>
            <div className="settings-panel">
              <div className="profile-details-visual">
                <div className="visual-avatar">{profile.avatarInitials}</div>
                <div className="visual-details">
                  <strong>{profile.name}</strong>
                  <span>{profile.email || 'Not signed in'}</span>
                </div>
              </div>

              <button className="btn-trigger" style={{ background: '#ef4444' }} onClick={() => { setProfile(defaultProfile); goHome(); }}>
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>
        </FeaturePage>
      </div>
    );
  }

  // ─── START FREE TRIAL PAGE — GSAP Dock ──────────────────────────────────────
  if (page === 'trial') {
    const revolverTools = [
      { key: 'compress' as PageView,    label: 'Compress Video',  icon: Gauge,             desc: 'Reduce file sizes with target MB constraints.', color: 'var(--accent-color)', emoji: '⚡' },
      { key: 'transcode' as PageView,   label: 'HLS Transcoder',  icon: Video,             desc: 'Generate adaptively streaming HLS playlists.', color: 'var(--cyan-color)', emoji: '🎬' },
      { key: 'ops' as PageView,         label: 'Format Converter',icon: SlidersHorizontal, desc: 'Re-encode tracks to MP4, WebM, MOV, and AVI.', color: 'var(--violet-color)', emoji: '🎛️' },
      { key: 'ops' as PageView,         label: 'Audio Extractor', icon: Music,             desc: 'Extract clean MP3/WAV tracks from video files.', color: '#ec4899', emoji: '🎵' },
      { key: 'clipexport' as PageView,  label: 'Clip Exporter',   icon: Scissors,          desc: 'Segment files into quick high-fidelity clips.', color: 'var(--success-color)', emoji: '✂️' },
      { key: 'library' as PageView,     label: 'My Video Assets', icon: FileVideo,         desc: 'Check completed and running transcoding files.', color: '#3b82f6', emoji: '📁' },
      { key: 'settings' as PageView,    label: 'Console Settings',icon: Settings,          desc: 'Setup credentials, themes, and developer keys.', color: '#6b7280', emoji: '⚙️' },
    ];

    return (
      <div className="trial-page droplane-bg" style={{ display: 'grid', placeContent: 'center', minHeight: '100vh', overflow: 'hidden' }}>
        <button className="trial-back-btn" onClick={goHome} style={{ zIndex: 100 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>

        <div className="revolver-wrapper animate-page-in">
          <div className="revolver-container">
            {/* Circular Orbit Ring */}
            <div className="revolver-orbit">
              {revolverTools.map((tool, i) => {
                const Icon = tool.icon;
                const angle = (i - revolverActiveIndex) * (360 / revolverTools.length);
                const isActive = i === revolverActiveIndex;
                
                return (
                  <button
                    key={tool.label}
                    className={`revolver-node ${isActive ? 'active' : ''}`}
                    style={{
                      transform: `rotate(${angle}deg) translate(152px) rotate(${-angle}deg)`,
                      border: `2px solid ${isActive ? tool.color : 'rgba(0, 0, 0, 0.08)'}`,
                      boxShadow: isActive ? `0 10px 24px rgba(0, 0, 0, 0.08)` : 'none'
                    }}
                    onClick={() => setRevolverActiveIndex(i)}
                  >
                    <span className="revolver-node-emoji">{tool.emoji}</span>
                    <Icon size={18} className="revolver-node-icon" style={{ color: isActive ? tool.color : '#94a3b8' }} />
                  </button>
                );
              })}
            </div>

            {/* Central console glass reactor */}
            <div className="revolver-console-center">
              <div className="rcc-glow-mesh" style={{ background: `radial-gradient(circle, ${revolverTools[revolverActiveIndex].color} 0%, transparent 70%)` }} />
              <div className="rcc-content">
                <span className="rcc-active-emoji">{revolverTools[revolverActiveIndex].emoji}</span>
                <h4>{revolverTools[revolverActiveIndex].label}</h4>
                <p>{revolverTools[revolverActiveIndex].desc}</p>
                <button 
                  className="btn-trigger success" 
                  style={{ 
                    marginTop: '16px', 
                    background: revolverTools[revolverActiveIndex].color, 
                    boxShadow: `0 8px 20px rgba(0, 0, 0, 0.1)`,
                    width: 'fit-content',
                    fontSize: '12px'
                  }}
                  onClick={() => goTo(revolverTools[revolverActiveIndex].key)}
                >
                  Open Tool Console
                </button>
              </div>
            </div>
          </div>

          <div className="trial-gsap-dock-panel">
            <GsapDock onSelectTool={goTo} />
          </div>
        </div>
      </div>
    );
  }

  // ─── HOME PAGE ───────────────────────────────────────────────────────────────
  return (
    <>
      <div className={`app-shell droplane-bg ${!profile.signedIn ? 'vf-main-shell-blur' : ''}`}>

      <div className="colorful-hero-wrap finisher-header">
        {/* HEADER */}
        <header className="home-header">
          <div className="header-brand-wrap" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="header-logo" onClick={goHome} aria-label="VideoForge home">
              <span className="logo-text-animated wave-text">
                {'VideoForge'.split('').map((c, i) => (
                  <span key={i} style={{ animationDelay: `${i * 0.2}s` }}>
                    {c}
                  </span>
                ))}
              </span>
            </button>
          <button 
            className={`sidebar-menu-trigger-btn header-trigger-btn ${isLeftDrawerOpen ? 'active' : ''}`}
            onClick={() => setIsLeftDrawerOpen(!isLeftDrawerOpen)}
            aria-label="Toggle drawer"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px' }}
          >
            <div className="hamburger-lines">
              <span className="hline" />
              <span className="hline" />
              <span className="hline" />
            </div>
          </button>
        </div>

        <nav className="header-links" aria-label="Primary">
          {/* Tools Mega Dropdown */}
          <div className="dropdown-wrapper">
            <button
              className={`blob-btn link-item cinzel-font ${isToolsDropdownOpen ? 'active' : ''}`}
              onClick={() => {
                setIsToolsDropdownOpen(!isToolsDropdownOpen);
                setIsResourcesDropdownOpen(false);
              }}
            >
              Tools <ChevronDown size={14} />
            </button>
            {isToolsDropdownOpen && (
              <div className="tools-mega-dropdown-menu animate-slide-up">
                <div className="mega-menu-grid">
                  {toolsMegaOptions.map(tool => {
                    const Icon = tool.icon;
                    return (
                      <button 
                        key={tool.label} 
                        className="mega-dropdown-item" 
                        onClick={() => {
                          if (tool.status === 'Premium') {
                            alert('This is a Professional premium tool. Please upgrade to pricing to unlock!');
                            goTo('pricing');
                          } else {
                            goTo(tool.key);
                          }
                          setIsToolsDropdownOpen(false);
                        }}
                      >
                        <span className={`mega-item-icon ${tool.status.toLowerCase()}`}><Icon size={18} /></span>
                        <div className="mega-item-label">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong>{tool.label}</strong>
                            {tool.status === 'Premium' && <span className="premium-tag">PRO</span>}
                          </div>
                          <span>{tool.caption}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Resources Dropdown */}
          <div className="dropdown-wrapper">
            <button
              className={`blob-btn link-item cinzel-font ${isResourcesDropdownOpen ? 'active' : ''}`}
              onClick={() => {
                setIsResourcesDropdownOpen(!isResourcesDropdownOpen);
                setIsToolsDropdownOpen(false);
              }}
            >
              Resources <ChevronDown size={14} />
            </button>
            {isResourcesDropdownOpen && (
              <div className="tools-dropdown-menu animate-slide-up" style={{ zIndex: 300 }}>
                {resourcesOptions.map(res => (
                  <a 
                    key={res.label} 
                    href={res.url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="dropdown-item" 
                    style={{ display: 'flex', gap: '10px', alignItems: 'center' }}
                  >
                    <span className="dropdown-item-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent-color)', padding: '6px', borderRadius: '6px', display: 'grid', placeItems: 'center' }}>
                      <res.icon size={15} />
                    </span>
                    <div className="dropdown-item-label" style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                      <strong style={{ fontSize: '12px', fontWeight: 600 }}>{res.label}</strong>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>{res.caption}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          <button className="blob-btn link-item cinzel-font" onClick={() => goTo('pricing')}>
            Pricing
          </button>
        </nav>

        <div className="header-actions">
          <div className="header-profile-btn" style={{ cursor: 'default' }}>
            {/* Hidden file input driven by ref — avoids label-click bubbling that unmounts the page */}
            <input
              ref={avatarFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfileImageUpload}
              style={{ display: 'none' }}
            />
            <div
              className="header-profile-avatar"
              style={{ cursor: 'pointer', position: 'relative' }}
              title="Upload profile picture"
              role="button"
              tabIndex={0}
              onClick={e => { e.stopPropagation(); avatarFileInputRef.current?.click(); }}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); avatarFileInputRef.current?.click(); } }}
            >
              {profile.avatarUrl ? <img src={profile.avatarUrl} alt="Avatar" /> : <span>{profile.avatarInitials}</span>}
            </div>
            <button className="header-profile-name-btn" onClick={() => goTo('settings')} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', outline: 'none', boxShadow: 'none' }}>
              <span className="header-profile-name">{profile.name}</span>
            </button>
          </div>
        </div>
      </header>

      {/* SIDEBAR OVERLAY (click outside to close) */}
      {isLeftDrawerOpen && (
        <div className="drawer-backdrop" onClick={() => setIsLeftDrawerOpen(false)} />
      )}

      {/* SIDEBAR DRAWER — slides in from left */}
      <aside className={`left-side-drawer-panel ${isLeftDrawerOpen ? 'open' : ''}`}>
        <div className="drawer-header" style={{ justifyContent: 'flex-end', borderBottom: 'none', marginBottom: '12px' }}>
          <button className="btn-close-drawer" onClick={() => setIsLeftDrawerOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="drawer-nav-list">
          {navTools.filter(t => t.key !== 'clipexport').map(tool => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.key}
                className="drawer-nav-btn"
                onClick={() => goTo(tool.key)}
              >
                <span className="btn-icon"><Icon size={16} /></span>
                <span className="btn-label">
                  <strong>{tool.label}</strong>
                  <span>{tool.caption}</span>
                </span>
              </button>
            );
          })}
        </div>
        {/* Bottom: only Settings & Profile — three right-side items removed */}
        {/* Sidebar Drawer Footer: High-fidelity User & Session Card */}
        <div className="drawer-user-identity-card">
          <div className="duic-user-info">
            <div className="duic-avatar">
              {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : <span>{profile.avatarInitials}</span>}
            </div>
            <div className="duic-meta">
              <strong>{profile.name}</strong>
              <span>{profile.email || 'Not signed in'}</span>
            </div>
          </div>
          
          <div className="duic-actions-grid">
            <button className="duic-btn" onClick={() => { goTo('settings'); setIsLeftDrawerOpen(false); }}>
              <Settings size={13} /> Settings
            </button>
            <button className="duic-btn" onClick={() => {
              if (profile.signedIn) {
                handleSignOut();
              } else {
                setIsAuthOpen(true);
              }
            }}>
              <LogOut size={13} /> {profile.signedIn ? 'Sign Out' : 'Sign In'}
            </button>
          </div>
        </div>
      </aside>

        {/* HERO SECTION */}
        <section className="hero-section">
          <div className="hero-copy">
            <div className="masking-container">
              <h1 className="masked-text vf-heading">
                Process your next<br />winning video in seconds
              </h1>
            </div>
            <p>
              Upload, compress, trim, convert, extract audio, and
              <span className="slanted-right-text">
                keep every finished asset inside your private VideoForge library.
              </span>
            </p>
            <div className="hero-cta-group" style={{ zIndex: 12 }}>
              <button className="button button-item" onClick={() => goTo('trial')}>
                <span className="button-bg">
                  <span className="button-bg-layers">
                    <span className="button-bg-layer button-bg-layer-1 -purple"></span>
                    <span className="button-bg-layer button-bg-layer-2 -turquoise"></span>
                    <span className="button-bg-layer button-bg-layer-3 -yellow"></span>
                  </span>
                </span>
                <span className="button-inner">
                  <span className="button-inner-static" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Start Free Trial <ArrowRight size={18} /></span>
                  <span className="button-inner-hover" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Start Free Trial <ArrowRight size={18} /></span>
                </span>
              </button>
            </div>
          </div>
        </section>
      </div>

      <AppIconMarquee />

      {/* MAIN HOME */}
      <main>
        <section className="platform-section">
          <h2>VideoForge products</h2>
          <p className="section-copy">Every tool you need to cover video uploads, compression, audio extraction, clipping, and delivery in one account.</p>
          <div className="platform-grid">
            <button onClick={() => goTo('compress')} className="feature-tile">
              <Gauge size={22} />
              <strong>Millions of smaller files</strong>
              <span>Target file size in MB with your existing worker job.</span>
            </button>
            <button onClick={() => goTo('ops')} className="feature-tile">
              <Scissors size={22} />
              <strong>Track every export</strong>
              <span>Convert formats, extract audio, and trim clips from a selected source.</span>
            </button>
            <button onClick={() => goTo('library')} className="feature-tile">
              <FolderDown size={22} />
              <strong>My Videos</strong>
              <span>Completed downloads and processed outputs grouped in your library.</span>
            </button>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="vf-footer finisher-header-footer">
        {/* Background Glow */}
        <div className="vf-footer-bg"></div>

        {/* Main Footer */}
        <div className="vf-footer-main">
          {/* Left */}
          <div className="vf-footer-brand">
            <div className="vf-logo" onClick={goHome} style={{ cursor: 'pointer' }}>
              <span className="logo-text-animated wave-text" style={{ fontSize: '26px' }}>
                {'VideoForge'.split('').map((c, i) => (
                  <span key={i} style={{ animationDelay: `${i * 0.2}s` }}>
                    {c}
                  </span>
                ))}
              </span>
            </div>
            <p>
              Enterprise-grade video transcoding infrastructure
              optimized for speed, scalability, and global delivery.
            </p>
          </div>

          {/* Links */}
          <div className="vf-footer-links">
            <div className="vf-column">
              <h4>PRODUCT</h4>
              <button onClick={() => setIsLeftDrawerOpen(true)}>Features</button>
              <button onClick={() => goTo('pricing')}>Pricing</button>
              <button onClick={() => { goTo('settings'); setSettingsActiveTab('api'); }}>API</button>
            </div>

            <div className="vf-column">
              <h4>DEVELOPERS</h4>
              <button onClick={goHome}>Documentation</button>
              <button onClick={goHome}>SDKs</button>
              <button onClick={goHome}>Status</button>
            </div>

            <div className="vf-column">
              <h4>COMPANY</h4>
              <button onClick={goHome}>About</button>
              <button onClick={() => goTo('contact')}>Contact</button>
              <button onClick={() => goTo('feedback')}>Feedback</button>
            </div>

            <div className="vf-column">
              <h4>LEGAL</h4>
              <button onClick={goHome}>Privacy</button>
              <button onClick={goHome}>Terms</button>
              <button onClick={() => { goTo('settings'); setSettingsActiveTab('security'); }}>Security</button>
            </div>
          </div>

          {/* CTA */}
          <div className="vf-footer-cta">
            <button className="animated-button" onClick={() => goTo('contact')}>
              <svg xmlns="http://www.w3.org/2000/svg" className="arr-2" viewBox="0 0 24 24">
                <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
              </svg>
              <span className="text">Contact Us</span>
              <span className="circle"></span>
              <svg xmlns="http://www.w3.org/2000/svg" className="arr-1" viewBox="0 0 24 24">
                <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
              </svg>
            </button>
            <button className="animated-button feedback-btn" onClick={() => goTo('feedback')}>
              <svg xmlns="http://www.w3.org/2000/svg" className="arr-2" viewBox="0 0 24 24">
                <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
              </svg>
              <span className="text">Feedback</span>
              <span className="circle"></span>
              <svg xmlns="http://www.w3.org/2000/svg" className="arr-1" viewBox="0 0 24 24">
                <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Bottom */}
        <div className="vf-footer-bottom">
          <div className="vf-copyright">
            <p>© 2026 VideoForge. All rights reserved.</p>
            <span>Powering the future of video.</span>
          </div>

          <div className="vf-socials" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <a href="https://www.linkedin.com/in/praveen/" target="_blank" rel="noreferrer" title="Twitter / X">𝕏</a>
            <a href="https://www.linkedin.com/in/praveen/" target="_blank" rel="noreferrer" title="LinkedIn">in</a>
            <a href="https://www.linkedin.com/in/praveen/" target="_blank" rel="noreferrer" title="Facebook">f</a>
            <a href="https://github.com/praveenkumar-co" target="_blank" rel="noreferrer" title="GitHub">git</a>
          </div>
        </div>
      </footer>

      {/* AUTH MODAL */}
      {isAuthOpen && (
        <div className="modal-backdrop">
          <div className="account-modal">
            <button className="modal-close" onClick={() => setIsAuthOpen(false)}><X size={18} /></button>
            <div className="google-wordmark"><span>G</span></div>
            <h3>Sign in</h3>
            <p>Use your Google Account to continue to VideoForge.</p>
            <input className="google-email-input" type="email" placeholder="Email or phone" value={googleEmail} onChange={e => setGoogleEmail(e.target.value)} />
            <button className="google-account" onClick={() => setGoogleEmail('user@example.com')}>
              <span>U</span><div><strong>VideoForge User</strong><small>user@example.com</small></div>
            </button>
            <button className="google-btn" onClick={signInWithGoogle}>Continue</button>
          </div>
        </div>
      )}

      {/* PROFILE PANEL */}
      {isProfileOpen && (
        <div className="profile-panel">
          <button className="modal-close" onClick={() => setIsProfileOpen(false)}><X size={18} /></button>
          <div className="profile-hero">
            <label className="profile-avatar">
              {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : <span>{profile.avatarInitials}</span>}
              <input type="file" accept="image/*" onChange={handleProfileImageUpload} />
            </label>
            <strong>{profile.name}</strong>
            <span>{profile.email || 'Not signed in'}</span>
          </div>
          <button onClick={() => { goTo('library'); setIsProfileOpen(false); }}><FileVideo size={16} /> My Videos</button>
          <button onClick={() => { goTo('settings'); setIsProfileOpen(false); }}><Palette size={16} /> Profile Settings</button>
          <button onClick={handleSignOut}><LogOut size={16} /> Sign Out</button>
        </div>
      )}

      {/* CONTACT MODAL OVERLAY */}
      {page === 'contact' && (
        <ContactUs onClose={() => setPage('home')} />
      )}

      {/* FEEDBACK MODAL OVERLAY */}
      {page === 'feedback' && (
        <FeedbackUs onClose={() => setPage('home')} profile={profile} />
      )}



      {/* SVG gooey filter for header blob-buttons */}
      <svg xmlns="http://www.w3.org/2000/svg" version="1.1" style={{ display: 'none' }}>
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="10" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 21 -7" result="goo" />
            <feBlend in2="goo" in="SourceGraphic" result="mix" />
          </filter>
        </defs>
      </svg>
    </div>

    {!profile.signedIn && (
      <AuthOverlay
        onAuthSuccess={(user) => {
          const displayName = user.username || user.name;
          setProfile({
            name: user.name || displayName,
            email: user.email,
            username: user.username,
            avatarInitials: getInitials(displayName),
            avatarUrl: user.avatarUrl || '',
            role: user.role || 'free',
            signedIn: true,
            theme: 'daylight'
          });
          loadVideos();
        }}
      />
    )}
  </>
);
}

export default App;
