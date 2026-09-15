import React from 'react';

interface InfinityLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  glow?: boolean;
}

export const InfinityLogo: React.FC<InfinityLogoProps> = ({ 
  className = '', 
  size = 'md',
  glow = true
}) => {
  const sizeMap = {
    sm: { box: 'w-8 h-8 rounded-lg', svg: 'w-5' },
    md: { box: 'w-11 h-11 rounded-xl', svg: 'w-7' },
    lg: { box: 'w-14 h-14 rounded-2xl', svg: 'w-9' },
    xl: { box: 'w-20 h-20 rounded-3xl', svg: 'w-14' }
  };

  const currentSize = sizeMap[size];

  return (
    <div
      id="brand-infinity-emblem"
      className={`relative ${currentSize.box} bg-gradient-to-b from-zinc-900 via-[#0d120f] to-black p-0.5 border border-emerald-500/40 flex items-center justify-center overflow-hidden transition-all duration-300 ${
        glow ? 'shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_30px_rgba(16,185,129,0.45)] hover:border-emerald-400' : ''
      } ${className}`}
    >
      {/* Top specular edge highlight */}
      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-400/90 to-transparent" />
      
      {/* Ambient inner radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.2),transparent_70%)] pointer-events-none" />

      {/* Vector Infinity Lemniscate */}
      <svg
        viewBox="0 0 44 26"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${currentSize.svg} h-auto relative z-10 drop-shadow-[0_0_6px_rgba(16,185,129,0.65)]`}
        aria-label="Infinity Logo"
      >
        <defs>
          <linearGradient id="infMainGrad" x1="2" y1="13" x2="42" y2="13" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="35%" stopColor="#34D399" />
            <stop offset="65%" stopColor="#6EE7B7" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="infAccentGrad" x1="18" y1="8" x2="28" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#A7F3D0" />
            <stop offset="50%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
          <radialGradient id="infCenterGlow" cx="22" cy="13" r="7" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#A7F3D0" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Center power intersection aura */}
        <circle cx="22" cy="13" r="5" fill="url(#infCenterGlow)" />

        {/* Master continuous athletic ribbon */}
        <path
          d="M 22 13 C 26 7.5 30 4 35 4 C 40 4 43 7.8 43 13 C 43 18.2 40 22 35 22 C 30 22 26 18.5 22 13 C 18 7.5 14 4 9 4 C 4 4 1 7.8 1 13 C 1 18.2 4 22 9 22 C 14 22 18 18.5 22 13 Z"
          stroke="url(#infMainGrad)"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 3D Interlocking Overlap */}
        <path
          d="M 18 8 C 20.3 10.8 22 13 22 13 C 23.7 15.2 26 18.2 28.5 20.5"
          stroke="url(#infAccentGrad)"
          strokeWidth="3.6"
          strokeLinecap="round"
        />

        {/* Dynamic center apex spark */}
        <circle cx="22" cy="13" r="1.3" fill="#FFFFFF" />
      </svg>
    </div>
  );
};
