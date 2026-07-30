import React, { useState } from 'react';
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

  if (!src) return null;

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-bg-sub/50 gap-1.5 p-2 text-center border border-line/30 rounded-lg ${className}`}>
        <AlertCircle className="w-4 h-4 text-ember/50" />
        <span className="text-[9px] text-ink-3 font-medium uppercase leading-tight">Mídia indisponível</span>
      </div>
    );
  }

  // Detect type by extension or mimetype if available in data URI
  const isImage = /\.(jpg|jpeg|png|webp|gif|avif|svg)$/i.test(src) || src.startsWith('data:image/');
  
  if (isImage) {
    return (
      <img 
        src={src} 
        alt="Demonstração do exercício" 
        className={className}
        loading="lazy"
        onError={() => setError(true)}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <video
      src={src}
      className={className}
      poster={poster}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      controls={controls}
      playsInline
      preload="metadata"
      onError={() => setError(true)}
    />
  );
};
