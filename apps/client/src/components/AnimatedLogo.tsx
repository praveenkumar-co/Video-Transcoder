import React from 'react';

export function AnimatedLogo() {
  return (
    <div className="vf-logo-wrap">
      <div className="vf-logo-glow" />
      <svg className="vf-logo-svg" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="zapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Outer glowing hexagonal border */}
        <path 
          d="M100 20 L160 55 L160 125 L100 160 L40 125 L40 55 Z" 
          fill="url(#bgGrad)" 
          stroke="rgba(249, 115, 22, 0.3)" 
          strokeWidth="3" 
          className="vf-logo-polygon"
        />
        
        {/* Concentric rotating dash ring */}
        <circle 
          cx="100" 
          cy="90" 
          r="52" 
          stroke="rgba(249, 115, 22, 0.2)" 
          strokeWidth="1.5" 
          strokeDasharray="6 8" 
          className="vf-logo-ring"
        />
        
        {/* Central Zap mark with radial glow */}
        <path 
          d="M115 48 L65 105 L95 105 L85 142 L135 85 L105 85 Z" 
          fill="url(#zapGrad)" 
          filter="url(#glow)" 
          className="vf-logo-zap"
        />
      </svg>
    </div>
  );
}
