import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface VideoPlayerProps {
  url: string;
  preferredResolution?: string;
  onResolutionChange?: (resolutionName: string, levelIndex: number, playlistUrl: string) => void;
}

export function VideoPlayer({ url, preferredResolution, onResolutionChange }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [levels, setLevels] = useState<{ index: number; height: number; name: string }[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 = Auto
  const hlsRef = useRef<Hls | null>(null);

  const onResolutionChangeRef = useRef(onResolutionChange);
  useEffect(() => {
    onResolutionChangeRef.current = onResolutionChange;
  }, [onResolutionChange]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | undefined;
    const isHls = url.toLowerCase().includes('.m3u8');

    if (isHls && Hls.isSupported()) {
      hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
      });
      hlsRef.current = hls;
      
      hls.loadSource(url);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Parse available levels (resolutions)
        const parsedLevels = hls!.levels.map((level, index) => ({
          index,
          height: level.height,
          name: `${level.height}p`,
        }));
        // Sort from high to low
        const sorted = [...parsedLevels].sort((a, b) => b.height - a.height);
        setLevels(sorted);

        // Lock to preferred resolution if provided
        let initialLevel = -1;
        if (preferredResolution) {
          const targetHeight = parseInt(preferredResolution);
          const levelIndex = hls!.levels.findIndex(l => l.height === targetHeight);
          if (levelIndex !== -1) {
            hls!.startLevel = levelIndex;
            hls!.currentLevel = levelIndex;
            hls!.nextLevel = levelIndex;
            initialLevel = levelIndex;
            setCurrentLevel(levelIndex);
          }
        }

        if (onResolutionChangeRef.current) {
          const matchedLvl = sorted.find(l => l.index === initialLevel);
          const name = matchedLvl ? matchedLvl.name : 'Auto';
          const playUrl = initialLevel === -1 ? url : url.replace('master.m3u8', `${initialLevel}/index.m3u8`);
          onResolutionChangeRef.current(name, initialLevel, playUrl);
        }
        
        video.play().catch(e => console.log('Autoplay prevented', e));
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error('HLS error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls?.recoverMediaError();
              break;
            default:
              hls?.destroy();
              break;
          }
        }
      });
    } 
    // Safari / native HLS
    else if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      if (onResolutionChangeRef.current) {
        onResolutionChangeRef.current('Original', -1, url);
      }
      video.play().catch(e => console.log('Autoplay prevented', e));
    }
    // Native HTML5 video player (MP4, WebM, etc.)
    else {
      setLevels([]);
      setCurrentLevel(-1);
      video.src = url;
      if (onResolutionChangeRef.current) {
        onResolutionChangeRef.current('Original', -1, url);
      }
      video.play().catch(e => console.log('Autoplay prevented', e));
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
      hlsRef.current = null;
    };
  }, [url, preferredResolution]);

  const handleLevelChange = (levelIndex: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex; 
      hlsRef.current.nextLevel = levelIndex; // Force immediate switch/buffer flush
      setCurrentLevel(levelIndex);

      if (onResolutionChangeRef.current) {
        const lvl = levels.find(l => l.index === levelIndex);
        const name = lvl ? lvl.name : 'Auto';
        const playUrl = levelIndex === -1 ? url : url.replace('master.m3u8', `${levelIndex}/index.m3u8`);
        onResolutionChangeRef.current(name, levelIndex, playUrl);
      }
    }
  };

  return (
    <div className="video-player-wrapper">
      <div className="video-container" style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
        <video
          ref={videoRef}
          className="video-player"
          controls
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>
      
      {levels.length > 0 && (
        <div className="quality-selector" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
          <span className="quality-label" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Quality:</span>
          <button 
            className={`quality-btn ${currentLevel === -1 ? 'active' : ''}`}
            onClick={() => handleLevelChange(-1)}
            style={{
              padding: '4px 10px',
              fontSize: '0.75rem',
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              background: currentLevel === -1 ? 'var(--accent-color)' : 'transparent',
              color: currentLevel === -1 ? '#fff' : 'var(--text-color)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontWeight: 500
            }}
          >
            Auto
          </button>
          {levels.map((lvl) => (
            <button
              key={lvl.index}
              className={`quality-btn ${currentLevel === lvl.index ? 'active' : ''}`}
              onClick={() => handleLevelChange(lvl.index)}
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                borderRadius: '20px',
                border: '1px solid var(--border-color)',
                background: currentLevel === lvl.index ? 'var(--accent-color)' : 'transparent',
                color: currentLevel === lvl.index ? '#fff' : 'var(--text-color)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: 500
              }}
            >
              {lvl.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
