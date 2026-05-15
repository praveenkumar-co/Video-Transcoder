import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface VideoPlayerProps {
  url: string;
}

export function VideoPlayer({ url }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | undefined;

    if (Hls.isSupported()) {
      hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
      });
      
      hls.loadSource(url);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Optional: auto-play when manifest is parsed
        // video.play().catch(e => console.log('Autoplay prevented', e));
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
    // For Safari which has native HLS support
    else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [url]);

  return (
    <div className="video-container">
      <video
        ref={videoRef}
        className="video-player"
        controls
        playsInline
      />
    </div>
  );
}
