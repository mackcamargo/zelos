import React from 'react';

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
  if (!src) return null;

  // Detect type by extension or mimetype if available in data URI
  const isImage = /\.(jpg|jpeg|png|webp|gif|avif|svg)$/i.test(src) || src.startsWith('data:image/');
  
  if (isImage) {
    return (
      <img 
        src={src} 
        alt="Demonstração do exercício" 
        className={className}
        loading="lazy"
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
    />
  );
};
