'use client';

import * as React from 'react';

interface Props {
  className?: string;
}

/**
 * StockHouse Mini Logo
 * Compact version with just the twin buildings (no pool/trees/cars).
 * Designed to fit in sidebars, headers, and small spaces.
 * 
 * Recommended size: 32x32px to 48x48px
 */
export function StockHouseMiniLogo({ className = '' }: Props) {
  return (
    <svg
      viewBox="0 0 200 220"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="StockHouse"
    >
      <title>StockHouse</title>

      <g stroke="currentColor" fill="none">
        {/* Left building */}
        <g>
          {/* Roof */}
          <polygon points="10,30 40,15 70,30" strokeWidth="2.5" />
          {/* Body */}
          <rect x="10" y="30" width="60" height="160" strokeWidth="2.5" />

          {/* Floor lines */}
          <g strokeWidth="1.2">
            <line x1="10" y1="55" x2="70" y2="55" />
            <line x1="10" y1="80" x2="70" y2="80" />
            <line x1="10" y1="105" x2="70" y2="105" />
            <line x1="10" y1="130" x2="70" y2="130" />
            <line x1="10" y1="155" x2="70" y2="155" />
          </g>

          {/* Vertical column lines */}
          <g strokeWidth="1.2">
            <line x1="30" y1="30" x2="30" y2="190" />
            <line x1="50" y1="30" x2="50" y2="190" />
          </g>

          {/* Windows - simplified with just cross marks */}
          <g strokeWidth="0.8">
            <line x1="20" y1="42" x2="20" y2="45" />
            <line x1="40" y1="42" x2="40" y2="45" />
            <line x1="60" y1="42" x2="60" y2="45" />
            <line x1="20" y1="67" x2="20" y2="70" />
            <line x1="40" y1="67" x2="40" y2="70" />
            <line x1="60" y1="67" x2="60" y2="70" />
            <line x1="20" y1="92" x2="20" y2="95" />
            <line x1="40" y1="92" x2="40" y2="95" />
            <line x1="60" y1="92" x2="60" y2="95" />
            <line x1="20" y1="117" x2="20" y2="120" />
            <line x1="40" y1="117" x2="40" y2="120" />
            <line x1="60" y1="117" x2="60" y2="120" />
            <line x1="20" y1="142" x2="20" y2="145" />
            <line x1="40" y1="142" x2="40" y2="145" />
            <line x1="60" y1="142" x2="60" y2="145" />
          </g>

          {/* Door */}
          <rect x="32" y="165" width="16" height="25" strokeWidth="1.5" />
        </g>

        {/* Right building */}
        <g transform="translate(100, 0)">
          <polygon points="10,30 40,15 70,30" strokeWidth="2.5" />
          <rect x="10" y="30" width="60" height="160" strokeWidth="2.5" />

          <g strokeWidth="1.2">
            <line x1="10" y1="55" x2="70" y2="55" />
            <line x1="10" y1="80" x2="70" y2="80" />
            <line x1="10" y1="105" x2="70" y2="105" />
            <line x1="10" y1="130" x2="70" y2="130" />
            <line x1="10" y1="155" x2="70" y2="155" />
          </g>

          <g strokeWidth="1.2">
            <line x1="30" y1="30" x2="30" y2="190" />
            <line x1="50" y1="30" x2="50" y2="190" />
          </g>

          <g strokeWidth="0.8">
            <line x1="20" y1="42" x2="20" y2="45" />
            <line x1="40" y1="42" x2="40" y2="45" />
            <line x1="60" y1="42" x2="60" y2="45" />
            <line x1="20" y1="67" x2="20" y2="70" />
            <line x1="40" y1="67" x2="40" y2="70" />
            <line x1="60" y1="67" x2="60" y2="70" />
            <line x1="20" y1="92" x2="20" y2="95" />
            <line x1="40" y1="92" x2="40" y2="95" />
            <line x1="60" y1="92" x2="60" y2="95" />
            <line x1="20" y1="117" x2="20" y2="120" />
            <line x1="40" y1="117" x2="40" y2="120" />
            <line x1="60" y1="117" x2="60" y2="120" />
            <line x1="20" y1="142" x2="20" y2="145" />
            <line x1="40" y1="142" x2="40" y2="145" />
            <line x1="60" y1="142" x2="60" y2="145" />
          </g>

          <rect x="32" y="165" width="16" height="25" strokeWidth="1.5" />
        </g>

        {/* Bridge between buildings */}
        <g>
          <line x1="70" y1="30" x2="110" y2="30" strokeWidth="2.5" />
          <line x1="70" y1="190" x2="110" y2="190" strokeWidth="2.5" />

          <g strokeWidth="1.2">
            <line x1="70" y1="55" x2="110" y2="55" />
            <line x1="70" y1="80" x2="110" y2="80" />
            <line x1="70" y1="105" x2="110" y2="105" />
            <line x1="70" y1="130" x2="110" y2="130" />
            <line x1="70" y1="155" x2="110" y2="155" />
          </g>

          <line x1="90" y1="30" x2="90" y2="190" strokeWidth="1.2" />
        </g>

        {/* Ground line */}
        <line x1="0" y1="190" x2="180" y2="190" strokeWidth="2.5" />
      </g>
    </svg>
  );
}
