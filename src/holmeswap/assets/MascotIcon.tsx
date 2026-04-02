import React from 'react'

interface MascotIconProps {
  className?: string
}

export default function MascotIcon({ className = '' }: MascotIconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="HolmeSwap mascot"
    >
      <defs>
        <linearGradient id="ghost-body-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C5E3F6" />
          <stop offset="100%" stopColor="#A8E6CF" />
        </linearGradient>
        <linearGradient id="lock-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD93D" />
          <stop offset="100%" stopColor="#FFB84D" />
        </linearGradient>
        <filter id="ghost-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.15" />
        </filter>
      </defs>
      
      {/* Ghost body */}
      <path
        d="M24 6C15 6 10 12 10 20v10c0 2 1 3 2.5 3h3v4l4-4 4 4v-4h3c1.5 0 2.5-1 2.5-3V20c0-8-5-14-14-14h8z"
        fill="url(#ghost-body-grad)"
        stroke="#94a3b8"
        strokeWidth="1"
        filter="url(#ghost-shadow)"
      />
      
      {/* Eyes */}
      <ellipse cx="18" cy="18" rx="3" ry="3.5" fill="#2C3E50" />
      <ellipse cx="30" cy="18" rx="3" ry="3.5" fill="#2C3E50" />
      <ellipse cx="19" cy="17" rx="1" ry="1.2" fill="white" />
      <ellipse cx="31" cy="17" rx="1" ry="1.2" fill="white" />
      
      {/* Lock on chest */}
      <rect x="20" y="26" width="8" height="7" rx="1.5" fill="url(#lock-grad)" stroke="#2C3E50" strokeWidth="0.8" />
      <path d="M21.5 26v-2.5a2.5 2.5 0 015 0v2.5" stroke="#2C3E50" strokeWidth="1" fill="none" />
      <circle cx="24" cy="29" r="1" fill="#2C3E50" />
    </svg>
  )
}
