'use client';

import * as React from 'react';

interface Props {
  className?: string;
}

/**
 * StockHouse Watermark - Building Pattern Background
 *
 * Subtle repeating pattern of minimalist building outlines.
 * Used as a page background to reinforce the StockHouse brand.
 *
 * - Pattern of 4 buildings tiles seamlessly
 * - Rotated -8deg for a dynamic feel
 * - Primary color (#5b49c0) with low opacity
 * - Radial fade in the center keeps focus on content
 * - pointer-events-none + fixed + z-0 = never interferes with UI
 */
export function StockHouseWatermark({ className = '' }: Props) {
  return (
    <div
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden select-none ${className}`}
      aria-hidden="true"
    >
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern
            id="stockhouse-buildings-pattern"
            x="0"
            y="0"
            width="170"
            height="170"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-8)"
          >
            <g
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
              opacity="0.18"
              className="text-[hsl(var(--primary-600))]"
            >
              {/* Building 1 - narrow tall */}
              <rect x="20" y="40" width="22" height="80" />
              <line x1="26" y1="55" x2="36" y2="55" strokeWidth="0.5" />
              <line x1="26" y1="70" x2="36" y2="70" strokeWidth="0.5" />
              <line x1="26" y1="85" x2="36" y2="85" strokeWidth="0.5" />
              <line x1="26" y1="100" x2="36" y2="100" strokeWidth="0.5" />

              {/* Building 2 - tallest */}
              <rect x="48" y="20" width="26" height="100" />
              <line x1="55" y1="35" x2="67" y2="35" strokeWidth="0.5" />
              <line x1="55" y1="50" x2="67" y2="50" strokeWidth="0.5" />
              <line x1="55" y1="65" x2="67" y2="65" strokeWidth="0.5" />
              <line x1="55" y1="80" x2="67" y2="80" strokeWidth="0.5" />
              <line x1="55" y1="95" x2="67" y2="95" strokeWidth="0.5" />

              {/* Building 3 - short wide */}
              <rect x="80" y="55" width="20" height="65" />
              <line x1="85" y1="70" x2="95" y2="70" strokeWidth="0.5" />
              <line x1="85" y1="85" x2="95" y2="85" strokeWidth="0.5" />
              <line x1="85" y1="100" x2="95" y2="100" strokeWidth="0.5" />

              {/* Building 4 - medium */}
              <rect x="115" y="35" width="24" height="85" />
              <line x1="121" y1="50" x2="133" y2="50" strokeWidth="0.5" />
              <line x1="121" y1="65" x2="133" y2="65" strokeWidth="0.5" />
              <line x1="121" y1="80" x2="133" y2="80" strokeWidth="0.5" />
              <line x1="121" y1="95" x2="133" y2="95" strokeWidth="0.5" />

              {/* Ground line */}
              <line x1="0" y1="120" x2="170" y2="120" strokeWidth="0.7" />
            </g>
          </pattern>

          {/* Radial gradient to fade the pattern around the center -
              keeps the main content area cleaner */}
          <radialGradient id="stockhouse-center-fade" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--background))" stopOpacity="0.85" />
            <stop offset="50%" stopColor="hsl(var(--background))" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(var(--background))" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Layer 1: Buildings pattern */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="url(#stockhouse-buildings-pattern)"
        />

        {/* Layer 2: Center fade for content readability */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="url(#stockhouse-center-fade)"
        />
      </svg>
    </div>
  );
}
