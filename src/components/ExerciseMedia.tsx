import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';

interface ExerciseMediaProps {
  src: string | null;
  className?: string;
  poster?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
}

export function sanitizeStorageUrl(rawUrlOrPath: string | null): string | null {
  if (!rawUrlOrPath) return null;
  if (rawUrlOrPath.startsWith('data:') || rawUrlOrPath.startsWith('blob:')) {
    return rawUrlOrPath;
  }
  // Replace literal spaces with %20 if present, without double-encoding existing %20 or URL pathnames
  if (rawUrlOrPath.includes(' ')) {
    return rawUrlOrPath.replace(/ /g, '%20');
  }
  return rawUrlOrPath;
}

export const ExerciseMedia: React.FC<ExerciseMediaProps> = ({
  src,
  className = "w-full h-full object-cover",
  poster,
  autoPlay = true,
  loop = true,
  muted = true,
  controls = false
}) => {
  const [error, setError] = useState(false);
  const [imgRetryKey, setImgRetryKey] = useState(0);
  const retryCountRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const formattedSrc = useMemo(() => sanitizeStorageUrl(src), [src]);

  // Reset error & retry counts when src changes
  useEffect(() => {
    setError(false);
    retryCountRef.current = 0;
  }, [formattedSrc]);

  if (!formattedSrc) return null;

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-bg-sub/50 gap-1.5 p-2 text-center border border-line/30 rounded-lg ${className}`}>
        <AlertCircle className="w-4 h-4 text-ember/50" />
        <span className="text-[9px] text-ink-3 font-medium uppercase leading-tight">Mídia indisponível</span>
      </div>
    );
  }

  // Detect type by extension or mimetype if available in data URI
  const cleanUrlPath = formattedSrc.split('?')[0].split('#')[0];
  const isImage = /\.(jpg|jpeg|png|webp|gif|avif|svg)$/i.test(cleanUrlPath) || formattedSrc.startsWith('data:image/');

  if (isImage) {
    const handleImgError = () => {
      if (retryCountRef.current < 2) {
        retryCountRef.current += 1;
        setTimeout(() => {
          setImgRetryKey(prev => prev + 1);
        }, 1000);
        return;
      }
      setError(true);
    };

    return (
      <img 
        key={`${formattedSrc}-${imgRetryKey}`}
        src={formattedSrc} 
        alt="Demonstração do exercício" 
        className={className}
        loading="lazy"
        onError={handleImgError}
        referrerPolicy="no-referrer"
      />
    );
  }

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    const err = video.error;

    // Code 1 = MEDIA_ERR_ABORTED (user or browser aborted fetch due to scrolling, offscreen pause, or concurrency limits).
    // This is NOT an invalid/missing media file error! Ignore completely.
    if (err && err.code === 1) {
      return;
    }

    // Retry loading up to 2 times before ever setting error state
    if (retryCountRef.current < 2) {
      retryCountRef.current += 1;
      setTimeout(() => {
        if (video && typeof video.load === 'function') {
          video.load();
        }
      }, 1000);
      return;
    }

    setError(true);
  };

  const handleCanPlay = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    if (autoPlay) {
      e.currentTarget.play().catch(() => {
        // Autoplay policy or browser pause - safe to ignore, first frame remains rendered
      });
    }
  };

  return (
    <video
      ref={videoRef}
      src={formattedSrc}
      className={className}
      poster={poster}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      controls={controls}
      playsInline
      preload="metadata"
      onCanPlay={handleCanPlay}
      onError={handleVideoError}
    />
  );
};

