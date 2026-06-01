import React, { useCallback, useEffect, useRef, useState } from 'react';
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
} from './api/upload.api';
import { VideoMetaData } from './types';
import {
  ArrowRight,
  ChevronDown,
  Download,
  ExternalLink,
  FileVideo,
  FolderDown,
  Gauge,
  Globe2,
  LogOut,
  Moon,
  Music,
  Palette,
  PlayCircle,
  RefreshCw,
  Scissors,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Video,
  Wand2,
  X,
  Zap,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────
export type PageView =
  | 'home'
  | 'trial'          // Start Free Trial → GSAP dock page
  | 'compress'
  | 'download'
  | 'transcode'
  | 'ops'
  | 'clipexport'
  | 'library'
  | 'settings'
  | 'pricing'
  | 'profile'
  | 'contact'
  | 'feedback';

// Legacy compatibility export used by Dashboard.tsx
export type TabType = 'dashboard' | 'play' | 'compress' | 'gif' | 'download';


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

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || 'VF';
}

// ─── GSAP Dock Component ─────────────────────────────────────────────────────
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
}: {
  tool: typeof navTools[0];
  children: React.ReactNode;
  history: VideoMetaData[];
  historyLabel: string;
  onBack: () => void;
  onRefresh: () => void;
  selectedVideo: VideoMetaData | null;
  onSelectVideo: (v: VideoMetaData) => void;
}) {
  const Icon = tool.icon;

  const formatBytes = (b: number) => {
    if (!b) return '0 B';
    const s = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(b) / Math.log(1024));
    return `${(b / Math.pow(1024, i)).toFixed(1)} ${s[i]}`;
  };

  const displayName = (v: VideoMetaData) => {
    const n = v.originalName?.trim();
    if (!n || /^tr\.mp4$/i.test(n)) return `Asset ${v.videoId.slice(0, 6)}`;
    return n;
  };

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
        <section className="feature-page-main" style={{ maxWidth: '840px', margin: '0 auto', width: '100%' }}>
          {children}
        </section>
      </div>
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
  { key: 'compress' as PageView,    label: 'Frame Extractor',   caption: 'Extract exact matching thumbnail PNG files', icon: Sparkles, status: 'Premium' },
];

const resourcesOptions = [
  { label: 'API Documentation', caption: 'Integrate VideoForge in your scripts', icon: Globe2, url: 'https://github.com/praveenkumar-co/Video-Transcoder' },
  { label: 'FFmpeg Encoding Guide', caption: 'Best practices for web rendering', icon: SlidersHorizontal, url: 'https://ffmpeg.org/documentation.html' },
  { label: 'System Status', caption: 'Check processing cluster loads', icon: ShieldCheck, url: 'https://status.videoforge.dev' },
  { label: 'Developer Changelog', caption: 'Track recently compiled worker nodes', icon: Sparkles, url: 'https://changelog.videoforge.dev' }
];

// ─── Main App ────────────────────────────────────────────────────────────────
function App() {
  const [page, setPage] = useState<PageView>('home');
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState(false);
  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isResourcesDropdownOpen, setIsResourcesDropdownOpen] = useState(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState<'general' | 'videos' | 'appearance' | 'storage' | 'billing' | 'api' | 'security' | 'integrations'>('general');
  const [revolverActiveIndex, setRevolverActiveIndex] = useState(0);

  const [allVideos, setAllVideos] = useState<VideoMetaData[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoMetaData | null>(null);

  const [compressSize, setCompressSize] = useState(25);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [transcodeResolution, setTranscodeResolution] = useState<'4K' | '1080p' | '720p' | '480p' | '360p' | '240p'>('1080p');
  const [convertFormat, setConvertFormat] = useState<'mp4' | 'webm' | 'mov' | 'avi' | 'mkv'>('mp4');
  const [audioFormat, setAudioFormat] = useState<'mp3' | 'wav' | 'aac'>('mp3');
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(30);
  const [googleEmail, setGoogleEmail] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

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

  useEffect(() => {
    document.documentElement.dataset.theme = 'daylight';
    localStorage.setItem('videoforge-profile', JSON.stringify({ ...profile, theme: 'daylight' }));
  }, [profile]);

  useEffect(() => {

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
      if (typeof (window as any).FinisherHeader !== 'undefined') {
        try { // header (for other subpages with smaller top headers)
          // @ts-ignore
          new (window as any).FinisherHeader({ ...config, className: 'finisher-header-top' });
        } catch (e) { /* ignore if that container doesn't exist */ }

        try { // unified header + hero container (for home page)
          // @ts-ignore
          new (window as any).FinisherHeader({ ...config, className: 'finisher-header' });
        } catch (e) { /* ignore if that container doesn't exist */ }
      }
    } catch (err) {
      console.error("FinisherHeader initialization error:", err);
    }
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
    const id = setInterval(async () => {
      try {
        const v = await getVideoStatus(selectedVideo.videoId);
        setSelectedVideo(v);
        loadVideos();
      } catch {}
    }, 3000);
    return () => clearInterval(id);
  }, [selectedVideo]);

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
    if (!n || /^tr\.mp4$/i.test(n)) return `Asset ${v.videoId.slice(0, 6)}`;
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
    try {
      showStatus('Queuing compression…', 'info');
      await triggerCompress(videoId, compressSize);
      showStatus('Compression queued.', 'success');
      loadVideos();
    } catch (e: any) { showStatus(e.message || 'Failed', 'error'); }
  };

  const handleDownload = async () => {
    if (!downloadUrl) return showStatus('Enter a URL first.', 'error');
    try {
      showStatus('Queuing download…', 'info');
      await triggerDownloadUrl(downloadUrl);
      showStatus('Download queued.', 'success');
      setDownloadUrl('');
      loadVideos();
    } catch (e: any) { showStatus(e.message || 'Failed', 'error'); }
  };

  const handleTranscode = async (videoId: string) => {
    try {
      showStatus('Queuing HLS transcode…', 'info');
      await triggerTranscode(videoId, transcodeResolution);
      showStatus('Transcode queued.', 'success');
      loadVideos();
    } catch (e: any) { showStatus(e.message || 'Failed', 'error'); }
  };

  const handleConvert = async (videoId: string) => {
    try {
      showStatus('Queuing conversion…', 'info');
      await triggerConvert(videoId, convertFormat);
      showStatus('Conversion queued.', 'success');
      loadVideos();
    } catch (e: any) { showStatus(e.message || 'Failed', 'error'); }
  };

  const handleExtractAudio = async (videoId: string) => {
    try {
      showStatus('Queuing audio extraction…', 'info');
      await triggerExtractAudio(videoId, audioFormat);
      showStatus('Audio extraction queued.', 'success');
      loadVideos();
    } catch (e: any) { showStatus(e.message || 'Failed', 'error'); }
  };

  const handleTrim = async (videoId: string) => {
    try {
      showStatus('Queuing trim job…', 'info');
      await triggerTrim(videoId, trimStart, trimEnd);
      showStatus('Trim queued.', 'success');
      loadVideos();
    } catch (e: any) { showStatus(e.message || 'Failed', 'error'); }
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
    const img = new Image();
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


  const renderSelectedSource = (emptyText = 'Go to My Videos and select a source first.') => (
    <div className="selected-source-box">
      {selectedVideo ? (
        <div className="selected-val">
          <strong>{displayVideoName(selectedVideo)}</strong>
          <span>{formatBytes(selectedVideo.sizeBytes)} · {selectedVideo.videoId}</span>
        </div>
      ) : (
        <span className="placeholder">{emptyText}</span>
      )}
    </div>
  );

  // ─── FEATURE PAGES ──────────────────────────────────────────────────────────

  if (page === 'compress') {
    const tool = navTools.find(t => t.key === 'compress')!;
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
        >
          <div className="tool-form">
            <div className="form-head">
              <h3>Compress Video</h3>
              <p>Set a target file size and queue compression against your selected source video.</p>
            </div>
            <div className="form-body">
              <label className="input-group">
                <span>Source Video</span>
                {renderSelectedSource()}
              </label>
              <label className="input-group">
                <span>Target Size</span>
                <div className="size-slider-row">
                  <input type="range" min="5" max="150" value={compressSize} onChange={e => setCompressSize(+e.target.value)} className="orange-slider-input" />
                  <strong className="orange-stat">{compressSize} MB</strong>
                </div>
              </label>
              <button className="btn-trigger salmon-color-btn" disabled={!selectedVideo} onClick={() => selectedVideo && handleCompress(selectedVideo.videoId)}>
                <Gauge size={16} /> Start Compression
              </button>
            </div>
          </div>
          {statusMessage && <div className={`page-toast ${statusMessage.type}`}><Sparkles size={14} />{statusMessage.text}</div>}
        </FeaturePage>
      </div>
    );
  }

  if (page === 'download') {
    const tool = navTools.find(t => t.key === 'download')!;
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
        >
          <div className="tool-form">
            <div className="form-head">
              <h3>Download from URL</h3>
              <p>Paste a public video URL. The worker fetches and queues it through your pipeline.</p>
            </div>
            <div className="form-body">
              <label className="input-group">
                <span>Public Video URL</span>
                <input className="text-input" type="url" placeholder="https://www.youtube.com/watch?v=..." value={downloadUrl} onChange={e => setDownloadUrl(e.target.value)} />
              </label>
              <button className="btn-trigger success" onClick={handleDownload}>
                <Download size={16} /> Fetch Video
              </button>
            </div>
          </div>
          {statusMessage && <div className={`page-toast ${statusMessage.type}`}><Sparkles size={14} />{statusMessage.text}</div>}
        </FeaturePage>
      </div>
    );
  }

  if (page === 'transcode') {
    const tool = navTools.find(t => t.key === 'transcode')!;
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
        >
          <div className="tool-form">
            <div className="form-head">
              <h3>Upload & HLS Transcode</h3>
              <p>Upload a raw file and produce HLS output for streaming and CDN delivery.</p>
            </div>
            <div className="form-body">
              <UploadWidget onUploadComplete={async id => {
                showStatus('Upload complete.', 'success');
                try { const v = await getVideoStatus(id); setSelectedVideo(v); loadVideos(); } catch {}
              }} />
              {selectedVideo && (
                <div className="op-sub-panel">
                  <h4>Target Resolution</h4>
                  <div className="resolution-pills">
                    {(['4K', '1080p', '720p', '480p', '360p', '240p'] as const).map(r => (
                      <button key={r} className={`pill-btn ${transcodeResolution === r ? 'active' : ''}`} onClick={() => setTranscodeResolution(r)}>{r}</button>
                    ))}
                  </div>
                  <button className="btn-trigger violet" onClick={() => handleTranscode(selectedVideo.videoId)}>
                    <Video size={16} /> Start HLS Transcode
                  </button>
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
        >
          <div className="tool-form">
            <div className="form-head">
              <h3>Media Tools</h3>
              <p>Convert formats, extract audio tracks, and trim clips from your selected source.</p>
            </div>
            <div className="form-body">
              <label className="input-group"><span>Source Video</span>{renderSelectedSource('Choose a video from My Videos first.')}</label>
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
          {statusMessage && <div className={`page-toast ${statusMessage.type}`}><Sparkles size={14} />{statusMessage.text}</div>}
        </FeaturePage>
      </div>
    );
  }

  if (page === 'clipexport') {
    const tool = navTools.find(t => t.key === 'clipexport')!;
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
        >
          <div className="tool-form">
            <div className="form-head">
              <h3>Clip Export</h3>
              <p>Extract specific segments from uploaded videos without quality loss.</p>
            </div>
            <div className="form-body">
              <label className="input-group"><span>Source Video</span>{renderSelectedSource('Select a video from My Videos to clip first.')}</label>
              <div className="op-sub-panel">
                <h4>Segment Timestamps</h4>
                <div className="trim-inputs">
                  <label><span>Start time (seconds)</span><input type="number" className="text-input sm" min="0" value={trimStart} onChange={e => setTrimStart(+e.target.value)} /></label>
                  <label><span>End time (seconds)</span><input type="number" className="text-input sm" min="1" value={trimEnd} onChange={e => setTrimEnd(+e.target.value)} /></label>
                </div>
                <button className="btn-trigger" style={{ background: 'var(--accent-color)', color: 'white', marginTop: '1rem' }} disabled={!selectedVideo} onClick={() => selectedVideo && handleTrim(selectedVideo.videoId)}>
                  <Scissors size={14} /> Cut & Export Clip
                </button>
              </div>
            </div>
          </div>
          {statusMessage && <div className={`page-toast ${statusMessage.type}`}><Sparkles size={14} />{statusMessage.text}</div>}
        </FeaturePage>
      </div>
    );
  }

  if (page === 'library') {
    const tool = navTools.find(t => t.key === 'library')!;
    return (
      <div className="app-shell droplane-bg">
        <FeaturePage
          tool={tool}
          history={allVideos}
          historyLabel="All Videos"
          onBack={goHome}
          onRefresh={loadVideos}
          selectedVideo={selectedVideo}
          onSelectVideo={setSelectedVideo}
        >
          <div className="tool-form">
            <div className="form-head">
              <h3>My Videos</h3>
              <p>All your uploads, downloads, and processed outputs. Click a video to select it for other tools.</p>
            </div>
            <div className="video-library-grid">
              {allVideos.map(v => (
                <div 
                  key={v.videoId} 
                  className={`video-card ${selectedVideo?.videoId === v.videoId ? 'active' : ''}`} 
                  onClick={() => setSelectedVideo(v)}
                >
                  <div className="video-card-preview-container">
                    {(v.outputUrl || v.masterPlaylistUrl) ? (
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
                        <FileVideo size={40} className="placeholder-svg" />
                      </div>
                    )}
                    <div className="video-card-overlay">
                      <PlayCircle size={38} className="play-icon" />
                    </div>
                    {v.status && (
                      <span className={`video-card-status-badge ${v.status}`}>
                        {v.status === 'completed' ? 'Ready' : v.status === 'failed' ? 'Error' : 'Processing'}
                      </span>
                    )}
                  </div>
                  
                  <div className="video-meta">
                    <strong className="video-title" title={displayVideoName(v)}>{displayVideoName(v)}</strong>
                    <div className="video-specs">
                      <span>{v.status === 'completed' ? '1080p' : '---'}</span>
                      <span className="dot">•</span>
                      <span>{formatBytes(v.sizeBytes)}</span>
                      <span className="dot">•</span>
                      <span>{new Date(v.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
      { key: 'storage' as const, label: 'Storage & Cache', icon: FolderDown, desc: 'Local caches & S3' },
      { key: 'billing' as const, label: 'Billing & Plans', icon: ShieldCheck, desc: 'Subscription details' },
      { key: 'api' as const, label: 'API Credentials', icon: Zap, desc: 'Tokens & webhooks' },
      { key: 'security' as const, label: 'Security & Access', icon: ShieldCheck, desc: 'MFA keys' },
      { key: 'integrations' as const, label: 'Integrations', icon: Globe2, desc: 'Linked developer apps' }
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
                  <div className="settings-fields-card" style={{ background: 'transparent', border: 'none', padding: 0 }}>
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
                            <div className="video-card-preview-container">
                              {(v.outputUrl || v.masterPlaylistUrl) ? (
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
                              {v.status && (
                                <span className={`video-card-status-badge ${v.status}`}>
                                  {v.status === 'completed' ? 'Ready' : v.status === 'failed' ? 'Error' : 'Processing'}
                                </span>
                              )}
                            </div>
                            <div className="video-meta">
                              <strong className="video-title" style={{ fontSize: '13px' }} title={displayVideoName(v)}>{displayVideoName(v)}</strong>
                              <div className="video-specs" style={{ fontSize: '11px' }}>
                                <span>{v.status === 'completed' ? '1080p' : '---'}</span>
                                <span className="dot">•</span>
                                <span>{formatBytes(v.sizeBytes)}</span>
                              </div>
                            </div>
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

              {settingsActiveTab === 'storage' && (
                <div className="settings-tab-panel animate-slide-up">
                  <div className="form-head">
                    <h3>Storage & Cache Allocation</h3>
                    <p>Manage raw assets and direct-upload boundaries.</p>
                  </div>
                  <div className="settings-fields-card">
                    <div className="status-indicator-box">
                      <div className="sib-stat">
                        <span>Total S3 Space Allocated</span>
                        <strong>10 GB (Standard Free Trial)</strong>
                      </div>
                      <div className="sib-bar-outer"><div className="sib-bar-inner" style={{ width: '4%' }}></div></div>
                      <span className="sib-caption">400 MB used of 10 GB limit</span>
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

              {settingsActiveTab === 'security' && (
                <div className="settings-tab-panel animate-slide-up">
                  <div className="form-head">
                    <h3>Session Security & Access Keys</h3>
                    <p>Configure passwordless multi-factor keys.</p>
                  </div>
                  <div className="settings-fields-card">
                    <button className="btn-trigger" style={{ width: 'fit-content' }}>Enable Multi-Factor (MFA)</button>
                  </div>
                </div>
              )}

              {settingsActiveTab === 'integrations' && (
                <div className="settings-tab-panel animate-slide-up">
                  <div className="form-head">
                    <h3>Connected Developer Apps</h3>
                    <p>Link your processing queues to standard video sites.</p>
                  </div>
                  <div className="settings-fields-card">
                    <div style={{ display: 'grid', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                        <strong>Amazon S3 Bucket</strong>
                        <span style={{ color: 'var(--success-color)', fontSize: '12px', fontWeight: 'bold' }}>CONNECTED</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                        <strong>Vimeo Publisher</strong>
                        <button className="btn-trigger" style={{ padding: '4px 10px', fontSize: '11px' }}>Connect</button>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                        <strong>Frame.io Review Space</strong>
                        <button className="btn-trigger" style={{ padding: '4px 10px', fontSize: '11px' }}>Connect</button>
                      </div>
                    </div>
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
          {navTools.map(tool => {
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
