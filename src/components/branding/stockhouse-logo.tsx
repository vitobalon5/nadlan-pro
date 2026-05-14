'use client';

import * as React from 'react';

interface Props {
  className?: string;
}

/**
 * StockHouse - Premium Real Estate Logo
 * Full luxury project rendering with twin boutique buildings,
 * pool, palm trees, cars and figures.
 * 
 * Use as hero element at the top of pages.
 */
export function StockHouseLogo({ className = '' }: Props) {
  return (
    <div className={`w-full ${className}`}>
      <svg
        viewBox="0 0 680 540"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
        role="img"
        aria-label="StockHouse - Premium Real Estate"
      >
        <title>StockHouse - Premium Real Estate</title>

        <g stroke="currentColor" fill="none" className="text-foreground">
          {/* Sun */}
          <circle cx="100" cy="55" r="22" strokeWidth="0.6" />
          <g strokeWidth="0.4">
            <line x1="100" y1="20" x2="100" y2="28" />
            <line x1="100" y1="82" x2="100" y2="90" />
            <line x1="65" y1="55" x2="73" y2="55" />
            <line x1="127" y1="55" x2="135" y2="55" />
            <line x1="75" y1="30" x2="80" y2="35" />
            <line x1="120" y1="80" x2="125" y2="85" />
            <line x1="125" y1="30" x2="120" y2="35" />
            <line x1="80" y1="80" x2="75" y2="85" />
          </g>

          {/* Clouds */}
          <g strokeWidth="0.5" fill="none">
            <path d="M 180 45 Q 220 40 260 45 Q 280 47 290 50" />
            <path d="M 480 60 Q 520 55 560 60 Q 590 62 605 65" />
            <path d="M 380 35 Q 410 32 440 35 Q 460 37 470 40" />
          </g>

          {/* Buildings */}
          <g transform="translate(195, 130)">
            {/* Left building */}
            <g stroke="currentColor" fill="none">
              <polygon points="0,20 60,0 120,20" strokeWidth="2" />
              <rect x="0" y="20" width="120" height="240" strokeWidth="2" />

              <g strokeWidth="1">
                <line x1="0" y1="60" x2="120" y2="60" />
                <line x1="0" y1="100" x2="120" y2="100" />
                <line x1="0" y1="140" x2="120" y2="140" />
                <line x1="0" y1="180" x2="120" y2="180" />
                <line x1="0" y1="220" x2="120" y2="220" />
                <line x1="40" y1="20" x2="40" y2="260" />
                <line x1="80" y1="20" x2="80" y2="260" />
              </g>

              <g strokeWidth="0.6">
                <rect x="6" y="26" width="28" height="28" />
                <line x1="20" y1="26" x2="20" y2="54" />
                <line x1="6" y1="40" x2="34" y2="40" />
                <rect x="46" y="26" width="28" height="28" />
                <line x1="60" y1="26" x2="60" y2="54" />
                <line x1="46" y1="40" x2="74" y2="40" />
                <rect x="86" y="26" width="28" height="28" />
                <line x1="100" y1="26" x2="100" y2="54" />
                <line x1="86" y1="40" x2="114" y2="40" />

                <rect x="6" y="66" width="28" height="28" />
                <line x1="20" y1="66" x2="20" y2="94" />
                <line x1="6" y1="80" x2="34" y2="80" />
                <rect x="46" y="66" width="28" height="28" />
                <line x1="60" y1="66" x2="60" y2="94" />
                <line x1="46" y1="80" x2="74" y2="80" />
                <rect x="86" y="66" width="28" height="28" />
                <line x1="100" y1="66" x2="100" y2="94" />
                <line x1="86" y1="80" x2="114" y2="80" />

                <rect x="6" y="106" width="28" height="28" />
                <line x1="20" y1="106" x2="20" y2="134" />
                <line x1="6" y1="120" x2="34" y2="120" />
                <rect x="46" y="106" width="28" height="28" />
                <line x1="60" y1="106" x2="60" y2="134" />
                <line x1="46" y1="120" x2="74" y2="120" />
                <rect x="86" y="106" width="28" height="28" />
                <line x1="100" y1="106" x2="100" y2="134" />
                <line x1="86" y1="120" x2="114" y2="120" />

                <rect x="6" y="146" width="28" height="28" />
                <line x1="20" y1="146" x2="20" y2="174" />
                <line x1="6" y1="160" x2="34" y2="160" />
                <rect x="46" y="146" width="28" height="28" />
                <line x1="60" y1="146" x2="60" y2="174" />
                <line x1="46" y1="160" x2="74" y2="160" />
                <rect x="86" y="146" width="28" height="28" />
                <line x1="100" y1="146" x2="100" y2="174" />
                <line x1="86" y1="160" x2="114" y2="160" />

                <rect x="6" y="186" width="28" height="28" />
                <line x1="20" y1="186" x2="20" y2="214" />
                <line x1="6" y1="200" x2="34" y2="200" />
                <rect x="46" y="186" width="28" height="28" />
                <line x1="60" y1="186" x2="60" y2="214" />
                <line x1="46" y1="200" x2="74" y2="200" />
                <rect x="86" y="186" width="28" height="28" />
                <line x1="100" y1="186" x2="100" y2="214" />
                <line x1="86" y1="200" x2="114" y2="200" />

                <rect x="6" y="226" width="28" height="28" />
                <line x1="20" y1="226" x2="20" y2="254" />
                <line x1="6" y1="240" x2="34" y2="240" />
                <rect x="86" y="226" width="28" height="28" />
                <line x1="100" y1="226" x2="100" y2="254" />
                <line x1="86" y1="240" x2="114" y2="240" />
              </g>

              {/* Balconies left */}
              <g strokeWidth="1">
                <rect x="-12" y="68" width="12" height="22" />
                <line x1="-12" y1="74" x2="0" y2="74" strokeWidth="0.4" />
                <line x1="-12" y1="80" x2="0" y2="80" strokeWidth="0.4" />
                <line x1="-12" y1="86" x2="0" y2="86" strokeWidth="0.4" />

                <rect x="-12" y="148" width="12" height="22" />
                <line x1="-12" y1="154" x2="0" y2="154" strokeWidth="0.4" />
                <line x1="-12" y1="160" x2="0" y2="160" strokeWidth="0.4" />
                <line x1="-12" y1="166" x2="0" y2="166" strokeWidth="0.4" />

                <rect x="-12" y="228" width="12" height="22" />
                <line x1="-12" y1="234" x2="0" y2="234" strokeWidth="0.4" />
                <line x1="-12" y1="240" x2="0" y2="240" strokeWidth="0.4" />
                <line x1="-12" y1="246" x2="0" y2="246" strokeWidth="0.4" />
              </g>

              <rect x="48" y="220" width="24" height="40" strokeWidth="1.5" />
              <line x1="60" y1="225" x2="60" y2="255" strokeWidth="0.6" />
              <circle cx="66" cy="240" r="0.8" fill="currentColor" />
            </g>

            {/* Right building */}
            <g transform="translate(160, 0)" stroke="currentColor" fill="none">
              <polygon points="0,20 60,0 120,20" strokeWidth="2" />
              <rect x="0" y="20" width="120" height="240" strokeWidth="2" />

              <g strokeWidth="1">
                <line x1="0" y1="60" x2="120" y2="60" />
                <line x1="0" y1="100" x2="120" y2="100" />
                <line x1="0" y1="140" x2="120" y2="140" />
                <line x1="0" y1="180" x2="120" y2="180" />
                <line x1="0" y1="220" x2="120" y2="220" />
                <line x1="40" y1="20" x2="40" y2="260" />
                <line x1="80" y1="20" x2="80" y2="260" />
              </g>

              <g strokeWidth="0.6">
                <rect x="6" y="26" width="28" height="28" />
                <line x1="20" y1="26" x2="20" y2="54" />
                <line x1="6" y1="40" x2="34" y2="40" />
                <rect x="46" y="26" width="28" height="28" />
                <line x1="60" y1="26" x2="60" y2="54" />
                <line x1="46" y1="40" x2="74" y2="40" />
                <rect x="86" y="26" width="28" height="28" />
                <line x1="100" y1="26" x2="100" y2="54" />
                <line x1="86" y1="40" x2="114" y2="40" />

                <rect x="6" y="66" width="28" height="28" />
                <line x1="20" y1="66" x2="20" y2="94" />
                <line x1="6" y1="80" x2="34" y2="80" />
                <rect x="46" y="66" width="28" height="28" />
                <line x1="60" y1="66" x2="60" y2="94" />
                <line x1="46" y1="80" x2="74" y2="80" />
                <rect x="86" y="66" width="28" height="28" />
                <line x1="100" y1="66" x2="100" y2="94" />
                <line x1="86" y1="80" x2="114" y2="80" />

                <rect x="6" y="106" width="28" height="28" />
                <line x1="20" y1="106" x2="20" y2="134" />
                <line x1="6" y1="120" x2="34" y2="120" />
                <rect x="46" y="106" width="28" height="28" />
                <line x1="60" y1="106" x2="60" y2="134" />
                <line x1="46" y1="120" x2="74" y2="120" />
                <rect x="86" y="106" width="28" height="28" />
                <line x1="100" y1="106" x2="100" y2="134" />
                <line x1="86" y1="120" x2="114" y2="120" />

                <rect x="6" y="146" width="28" height="28" />
                <line x1="20" y1="146" x2="20" y2="174" />
                <line x1="6" y1="160" x2="34" y2="160" />
                <rect x="46" y="146" width="28" height="28" />
                <line x1="60" y1="146" x2="60" y2="174" />
                <line x1="46" y1="160" x2="74" y2="160" />
                <rect x="86" y="146" width="28" height="28" />
                <line x1="100" y1="146" x2="100" y2="174" />
                <line x1="86" y1="160" x2="114" y2="160" />

                <rect x="6" y="186" width="28" height="28" />
                <line x1="20" y1="186" x2="20" y2="214" />
                <line x1="6" y1="200" x2="34" y2="200" />
                <rect x="46" y="186" width="28" height="28" />
                <line x1="60" y1="186" x2="60" y2="214" />
                <line x1="46" y1="200" x2="74" y2="200" />
                <rect x="86" y="186" width="28" height="28" />
                <line x1="100" y1="186" x2="100" y2="214" />
                <line x1="86" y1="200" x2="114" y2="200" />

                <rect x="6" y="226" width="28" height="28" />
                <line x1="20" y1="226" x2="20" y2="254" />
                <line x1="6" y1="240" x2="34" y2="240" />
                <rect x="86" y="226" width="28" height="28" />
                <line x1="100" y1="226" x2="100" y2="254" />
                <line x1="86" y1="240" x2="114" y2="240" />
              </g>

              {/* Balconies right */}
              <g strokeWidth="1">
                <rect x="120" y="68" width="12" height="22" />
                <line x1="120" y1="74" x2="132" y2="74" strokeWidth="0.4" />
                <line x1="120" y1="80" x2="132" y2="80" strokeWidth="0.4" />
                <line x1="120" y1="86" x2="132" y2="86" strokeWidth="0.4" />

                <rect x="120" y="148" width="12" height="22" />
                <line x1="120" y1="154" x2="132" y2="154" strokeWidth="0.4" />
                <line x1="120" y1="160" x2="132" y2="160" strokeWidth="0.4" />
                <line x1="120" y1="166" x2="132" y2="166" strokeWidth="0.4" />

                <rect x="120" y="228" width="12" height="22" />
                <line x1="120" y1="234" x2="132" y2="234" strokeWidth="0.4" />
                <line x1="120" y1="240" x2="132" y2="240" strokeWidth="0.4" />
                <line x1="120" y1="246" x2="132" y2="246" strokeWidth="0.4" />
              </g>

              <rect x="48" y="220" width="24" height="40" strokeWidth="1.5" />
              <line x1="60" y1="225" x2="60" y2="255" strokeWidth="0.6" />
              <circle cx="66" cy="240" r="0.8" fill="currentColor" />
            </g>

            {/* Bridge */}
            <g stroke="currentColor" fill="none">
              <line x1="120" y1="20" x2="160" y2="20" strokeWidth="2" />
              <line x1="120" y1="260" x2="160" y2="260" strokeWidth="2" />

              <g strokeWidth="1">
                <line x1="120" y1="60" x2="160" y2="60" />
                <line x1="120" y1="100" x2="160" y2="100" />
                <line x1="120" y1="140" x2="160" y2="140" />
                <line x1="120" y1="180" x2="160" y2="180" />
                <line x1="120" y1="220" x2="160" y2="220" />
              </g>

              <g strokeWidth="0.6">
                <rect x="128" y="26" width="24" height="28" />
                <line x1="140" y1="26" x2="140" y2="54" />
                <rect x="128" y="66" width="24" height="28" />
                <line x1="140" y1="66" x2="140" y2="94" />
                <rect x="128" y="106" width="24" height="28" />
                <line x1="140" y1="106" x2="140" y2="134" />
                <rect x="128" y="146" width="24" height="28" />
                <line x1="140" y1="146" x2="140" y2="174" />
                <rect x="128" y="186" width="24" height="28" />
                <line x1="140" y1="186" x2="140" y2="214" />
                <rect x="128" y="226" width="24" height="28" />
                <line x1="140" y1="226" x2="140" y2="254" />
              </g>
            </g>
          </g>

          {/* Ground line */}
          <line x1="40" y1="390" x2="640" y2="390" strokeWidth="2.5" />

          {/* Pool */}
          <g strokeWidth="0.6">
            <ellipse cx="340" cy="455" rx="80" ry="22" strokeWidth="1.2" />
            <ellipse cx="340" cy="455" rx="65" ry="14" strokeWidth="0.4" />
            <ellipse cx="340" cy="455" rx="45" ry="8" strokeWidth="0.4" />

            <line x1="295" y1="448" x2="300" y2="446" strokeWidth="0.4" />
            <line x1="310" y1="460" x2="315" y2="458" strokeWidth="0.4" />
            <line x1="365" y1="450" x2="370" y2="448" strokeWidth="0.4" />
            <line x1="350" y1="462" x2="355" y2="460" strokeWidth="0.4" />
            <line x1="325" y1="445" x2="330" y2="443" strokeWidth="0.4" />

            <rect x="262" y="445" width="6" height="2" strokeWidth="0.4" />
            <rect x="262" y="450" width="6" height="2" strokeWidth="0.4" />
            <rect x="262" y="455" width="6" height="2" strokeWidth="0.4" />

            <rect x="412" y="445" width="6" height="2" strokeWidth="0.4" />
            <rect x="412" y="450" width="6" height="2" strokeWidth="0.4" />
            <rect x="412" y="455" width="6" height="2" strokeWidth="0.4" />
          </g>

          {/* Cars left */}
          <g strokeWidth="0.6">
            <path d="M 180 460 Q 250 458 280 458" strokeWidth="0.8" />
            <path d="M 180 472 Q 250 470 280 470" strokeWidth="0.8" />
            <line x1="190" y1="460" x2="190" y2="472" strokeWidth="0.3" />
            <line x1="210" y1="460" x2="210" y2="472" strokeWidth="0.3" />
            <line x1="230" y1="460" x2="230" y2="472" strokeWidth="0.3" />
            <line x1="250" y1="460" x2="250" y2="472" strokeWidth="0.3" />

            <g transform="translate(195, 478)">
              <rect x="0" y="0" width="22" height="10" strokeWidth="0.8" rx="2" />
              <rect x="3" y="-3" width="16" height="5" strokeWidth="0.7" rx="1" />
              <circle cx="5" cy="11" r="2" strokeWidth="0.6" />
              <circle cx="17" cy="11" r="2" strokeWidth="0.6" />
              <line x1="3" y1="2" x2="19" y2="2" strokeWidth="0.3" />
            </g>

            <g transform="translate(235, 478)">
              <rect x="0" y="0" width="20" height="10" strokeWidth="0.8" rx="2" />
              <rect x="2" y="-3" width="14" height="5" strokeWidth="0.7" rx="1" />
              <circle cx="4" cy="11" r="2" strokeWidth="0.6" />
              <circle cx="15" cy="11" r="2" strokeWidth="0.6" />
              <line x1="2" y1="2" x2="17" y2="2" strokeWidth="0.3" />
            </g>

            {/* Cars right */}
            <path d="M 400 460 Q 470 458 500 458" strokeWidth="0.8" />
            <path d="M 400 472 Q 470 470 500 470" strokeWidth="0.8" />
            <line x1="420" y1="460" x2="420" y2="472" strokeWidth="0.3" />
            <line x1="440" y1="460" x2="440" y2="472" strokeWidth="0.3" />
            <line x1="460" y1="460" x2="460" y2="472" strokeWidth="0.3" />
            <line x1="480" y1="460" x2="480" y2="472" strokeWidth="0.3" />

            <g transform="translate(425, 478)">
              <rect x="0" y="0" width="22" height="10" strokeWidth="0.8" rx="2" />
              <rect x="3" y="-3" width="16" height="5" strokeWidth="0.7" rx="1" />
              <circle cx="5" cy="11" r="2" strokeWidth="0.6" />
              <circle cx="17" cy="11" r="2" strokeWidth="0.6" />
              <line x1="3" y1="2" x2="19" y2="2" strokeWidth="0.3" />
            </g>

            <g transform="translate(465, 478)">
              <rect x="0" y="0" width="20" height="10" strokeWidth="0.8" rx="2" />
              <rect x="2" y="-3" width="14" height="5" strokeWidth="0.7" rx="1" />
              <circle cx="4" cy="11" r="2" strokeWidth="0.6" />
              <circle cx="15" cy="11" r="2" strokeWidth="0.6" />
              <line x1="2" y1="2" x2="17" y2="2" strokeWidth="0.3" />
            </g>
          </g>

          {/* Palm trees */}
          <g strokeWidth="0.7" fill="none">
            <g transform="translate(80, 320)">
              <rect x="-2" y="0" width="4" height="80" strokeWidth="0.6" />
              <line x1="0" y1="20" x2="0" y2="80" strokeWidth="0.3" />

              <ellipse cx="0" cy="-5" rx="20" ry="6" strokeWidth="0.6" transform="rotate(-15, 0, -5)" />
              <ellipse cx="0" cy="0" rx="22" ry="5" strokeWidth="0.6" transform="rotate(15, 0, 0)" />
              <ellipse cx="-5" cy="-10" rx="18" ry="5" strokeWidth="0.6" transform="rotate(-40, -5, -10)" />
              <ellipse cx="5" cy="-10" rx="18" ry="5" strokeWidth="0.6" transform="rotate(40, 5, -10)" />
              <ellipse cx="0" cy="-15" rx="15" ry="4" strokeWidth="0.6" transform="rotate(0, 0, -15)" />
            </g>

            <g transform="translate(620, 320)">
              <rect x="-2" y="0" width="4" height="80" strokeWidth="0.6" />
              <line x1="0" y1="20" x2="0" y2="80" strokeWidth="0.3" />

              <ellipse cx="0" cy="-5" rx="20" ry="6" strokeWidth="0.6" transform="rotate(-15, 0, -5)" />
              <ellipse cx="0" cy="0" rx="22" ry="5" strokeWidth="0.6" transform="rotate(15, 0, 0)" />
              <ellipse cx="-5" cy="-10" rx="18" ry="5" strokeWidth="0.6" transform="rotate(-40, -5, -10)" />
              <ellipse cx="5" cy="-10" rx="18" ry="5" strokeWidth="0.6" transform="rotate(40, 5, -10)" />
              <ellipse cx="0" cy="-15" rx="15" ry="4" strokeWidth="0.6" transform="rotate(0, 0, -15)" />
            </g>
          </g>

          {/* People */}
          <g strokeWidth="0.7">
            <g transform="translate(155, 370)">
              <circle cx="0" cy="0" r="2.5" strokeWidth="0.7" fill="none" />
              <line x1="0" y1="2.5" x2="0" y2="14" strokeWidth="0.7" />
              <line x1="0" y1="6" x2="-3" y2="10" strokeWidth="0.7" />
              <line x1="0" y1="6" x2="3" y2="10" strokeWidth="0.7" />
              <line x1="0" y1="14" x2="-2" y2="20" strokeWidth="0.7" />
              <line x1="0" y1="14" x2="2" y2="20" strokeWidth="0.7" />
            </g>

            <g transform="translate(165, 372)">
              <circle cx="0" cy="0" r="2.5" strokeWidth="0.7" fill="none" />
              <line x1="0" y1="2.5" x2="0" y2="14" strokeWidth="0.7" />
              <line x1="0" y1="8" x2="4" y2="11" strokeWidth="0.7" />
              <line x1="0" y1="14" x2="-2" y2="20" strokeWidth="0.7" />
              <line x1="0" y1="14" x2="2" y2="20" strokeWidth="0.7" />
            </g>

            <g transform="translate(525, 372)">
              <circle cx="0" cy="0" r="2.5" strokeWidth="0.7" fill="none" />
              <line x1="0" y1="2.5" x2="0" y2="14" strokeWidth="0.7" />
              <line x1="0" y1="6" x2="-3" y2="10" strokeWidth="0.7" />
              <line x1="0" y1="14" x2="-2" y2="20" strokeWidth="0.7" />
              <line x1="0" y1="14" x2="2" y2="20" strokeWidth="0.7" />
            </g>
          </g>

          {/* Lanterns */}
          <g strokeWidth="0.6">
            <g transform="translate(120, 405)">
              <line x1="0" y1="0" x2="0" y2="-18" strokeWidth="0.6" />
              <circle cx="0" cy="-22" r="3" strokeWidth="0.6" />
            </g>

            <g transform="translate(580, 405)">
              <line x1="0" y1="0" x2="0" y2="-18" strokeWidth="0.6" />
              <circle cx="0" cy="-22" r="3" strokeWidth="0.6" />
            </g>

            <g transform="translate(50, 405)">
              <line x1="0" y1="0" x2="0" y2="-18" strokeWidth="0.6" />
              <circle cx="0" cy="-22" r="3" strokeWidth="0.6" />
            </g>

            <g transform="translate(650, 405)">
              <line x1="0" y1="0" x2="0" y2="-18" strokeWidth="0.6" />
              <circle cx="0" cy="-22" r="3" strokeWidth="0.6" />
            </g>
          </g>
        </g>

        {/* Text */}
        <text
          x="340"
          y="500"
          textAnchor="middle"
          fontFamily="Courier New, monospace"
          fontSize="32"
          fontWeight="700"
          fill="currentColor"
          letterSpacing="3"
          className="text-foreground"
        >
          StockHouse
        </text>
        <text
          x="340"
          y="525"
          textAnchor="middle"
          fontFamily="Courier New, monospace"
          fontSize="10"
          fill="currentColor"
          letterSpacing="4"
          className="text-foreground"
        >
          — PREMIUM REAL ESTATE —
        </text>
      </svg>
    </div>
  );
}
