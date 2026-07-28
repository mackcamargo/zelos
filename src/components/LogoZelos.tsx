import React from 'react';

interface LogoZelosProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  center?: boolean;
  className?: string;
}

export default function LogoZelos({ size = 'sm', center = false, className = '' }: LogoZelosProps) {
  const alignmentClass = center ? 'justify-center' : 'justify-start';
  
  const sizes = {
    xs: 'w-16',
    sm: 'w-24',
    md: 'w-32',
    lg: 'w-48',
    xl: 'w-64'
  };

  return (
    <div className={`flex items-center select-none ${alignmentClass} ${className}`}>
      <img 
        src="/zelos_logo_orange.png" 
        alt="Zelos Personal" 
        className={`${sizes[size]} h-auto`}
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
