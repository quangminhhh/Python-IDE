import * as React from "react";

interface PythonLogoProps {
  className?: string;
  size?: number;
}

export function PythonLogo({ className = "", size = 24 }: PythonLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Python logo simplified and clean */}
      <defs>
        <linearGradient id="python-blue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3776ab" />
          <stop offset="100%" stopColor="#306998" />
        </linearGradient>
        <linearGradient id="python-yellow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffd43b" />
          <stop offset="100%" stopColor="#ffe873" />
        </linearGradient>
      </defs>

      {/* Top part (yellow) */}
      <path
        d="M12 2C8.5 2 7 3.5 7 6v3h5v1H6c-1.5 0-3 1-3 3v4c0 1.5 1.5 3 3 3h2v-2c0-1.5 1.5-3 3-3h6c1.5 0 3-1.5 3-3V6c0-2.5-1.5-4-5-4h-3z"
        fill="url(#python-yellow)"
      />

      {/* Bottom part (blue) */}
      <path
        d="M12 22c3.5 0 5-1.5 5-4v-3h-5v-1h6c1.5 0 3-1 3-3V7c0-1.5-1.5-3-3-3h-2v2c0 1.5-1.5 3-3 3H7c-1.5 0-3 1.5-3 3v6c0 2.5 1.5 4 5 4h3z"
        fill="url(#python-blue)"
      />

      {/* Eyes */}
      <circle cx="9.5" cy="6.5" r="1" fill="#ffffff" />
      <circle cx="14.5" cy="17.5" r="1" fill="#ffffff" />
    </svg>
  );
}
