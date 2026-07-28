import React from 'react';

interface LogoZelosProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  center?: boolean;
  className?: string;
}

export default function LogoZelos({ size = 'sm', center = false, className = '' }: LogoZelosProps) {
  const alignmentClass = center ? 'items-center text-center' : 'items-start text-left';
  
  // Size-specific styles for ZELOS and Personal text elements
  let zelosSizeClass = 'text-xl sm:text-2xl';
  let personalSizeClass = 'text-[10px] mt-[3px] tracking-[0.2em]';

  switch (size) {
    case 'xs':
      zelosSizeClass = 'text-[16px]';
      personalSizeClass = 'text-[8px] mt-[2px] tracking-[0.18em]';
      break;
    case 'sm':
      zelosSizeClass = 'text-xl sm:text-2xl';
      personalSizeClass = 'text-[10px] mt-[3px] tracking-[0.2em]';
      break;
    case 'md':
      zelosSizeClass = 'text-2xl';
      personalSizeClass = 'text-[11px] mt-[3px] tracking-[0.2em]';
      break;
    case 'lg':
      zelosSizeClass = 'text-[28px]';
      personalSizeClass = 'text-[12px] mt-[4px] tracking-[0.22em]';
      break;
    case 'xl':
      zelosSizeClass = 'text-5xl';
      personalSizeClass = 'text-[16px] mt-[6px] tracking-[0.24em]';
      break;
  }

  return (
    <div className={`flex flex-col leading-none select-none ${alignmentClass} ${className}`}>
      <span className={`font-display font-black tracking-tight leading-none text-ink ${zelosSizeClass}`}>
        ZE<span className="text-[#F26A1B]">LOS</span>
      </span>
      <span className={`font-sans font-bold text-[#F26A1B] uppercase leading-none ${personalSizeClass}`}>
        Personal
      </span>
    </div>
  );
}
