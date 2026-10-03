
interface IconProps {
  className?: string
  animate?: boolean
}

// Lock icon for encrypting step
export function LockIcon3D({ className = '', animate = false }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id="lock-body-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C5E3F6" />
          <stop offset="100%" stopColor="#A8D8EA" />
        </linearGradient>
        <linearGradient id="lock-shackle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE66D" />
          <stop offset="100%" stopColor="#FFD93D" />
        </linearGradient>
        <filter id="lock-shadow" x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="3" stdDeviation="2" floodOpacity="0.15" />
        </filter>
      </defs>
      
      {/* Lock body */}
      <rect 
        x="12" y="22" width="24" height="20" rx="4" 
        fill="url(#lock-body-grad)" 
        stroke="#94a3b8" 
        strokeWidth="1"
        filter="url(#lock-shadow)"
        className={animate ? 'animate-holme-lock-click' : ''}
      />
      
      {/* Shackle */}
      <path 
        d="M17 22v-6a7 7 0 0114 0v6" 
        stroke="url(#lock-shackle-grad)" 
        strokeWidth="4" 
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Keyhole */}
      <circle cx="24" cy="30" r="3" fill="#2C3E50" />
      <rect x="22.5" y="30" width="3" height="6" rx="1" fill="#2C3E50" />
      
      {/* Sparkle effect */}
      <circle cx="32" cy="18" r="1.5" fill="#FFD93D" opacity="0.8" />
      <circle cx="35" cy="22" r="1" fill="#FFD93D" opacity="0.6" />
    </svg>
  )
}

// Cage with lock for mempool lockdown
export function CageLockIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 56 48" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id="cage-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
      </defs>
      
      {/* Cage bars */}
      <rect x="8" y="8" width="40" height="32" rx="4" fill="none" stroke="url(#cage-grad)" strokeWidth="2" />
      <line x1="16" y1="8" x2="16" y2="40" stroke="#94a3b8" strokeWidth="2" />
      <line x1="24" y1="8" x2="24" y2="40" stroke="#94a3b8" strokeWidth="2" />
      <line x1="32" y1="8" x2="32" y2="40" stroke="#94a3b8" strokeWidth="2" />
      <line x1="40" y1="8" x2="40" y2="40" stroke="#94a3b8" strokeWidth="2" />
      
      {/* Lock inside */}
      <rect x="21" y="18" width="14" height="12" rx="2" fill="#A8D8EA" stroke="#2C3E50" strokeWidth="0.8" />
      <path d="M24 18v-3a4 4 0 018 0v3" stroke="#FFD93D" strokeWidth="2" fill="none" />
      <circle cx="28" cy="24" r="1.5" fill="#2C3E50" />
    </svg>
  )
}

// Dice for randomized ordering
export function DiceIcon3D({ className = '', animate = false }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={`${className} ${animate ? 'animate-holme-dice-roll' : ''}`} aria-hidden>
      <defs>
        <linearGradient id="dice-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A8E6CF" />
          <stop offset="100%" stopColor="#88D4AB" />
        </linearGradient>
        <filter id="dice-shadow" x="-10%" y="-5%" width="120%" height="120%">
          <feDropShadow dx="2" dy="3" stdDeviation="2" floodOpacity="0.2" />
        </filter>
      </defs>
      
      {/* Dice body - isometric style */}
      <rect x="8" y="8" width="32" height="32" rx="6" fill="url(#dice-grad)" stroke="#64748b" strokeWidth="1" filter="url(#dice-shadow)" />
      
      {/* Dots */}
      <circle cx="16" cy="16" r="3" fill="#2C3E50" />
      <circle cx="32" cy="16" r="3" fill="#2C3E50" />
      <circle cx="24" cy="24" r="3" fill="#2C3E50" />
      <circle cx="16" cy="32" r="3" fill="#2C3E50" />
      <circle cx="32" cy="32" r="3" fill="#2C3E50" />
    </svg>
  )
}

// Solver robots/characters
export function SolverIcon({ number, winner = false, className = '' }: { number: number; winner?: boolean; className?: string }) {
  const colors = ['#A8E6CF', '#C5E3F6', '#FFD93D']
  const color = colors[(number - 1) % 3]
  
  return (
    <svg viewBox="0 0 32 40" fill="none" className={className} aria-hidden>
      <defs>
        <filter id={`solver-glow-${number}`} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation={winner ? "3" : "1"} floodColor={winner ? "#6BCF7F" : "transparent"} />
        </filter>
      </defs>
      
      {/* Robot body */}
      <rect x="6" y="14" width="20" height="18" rx="4" fill={color} stroke="#2C3E50" strokeWidth="0.8" filter={`url(#solver-glow-${number})`} />
      
      {/* Head */}
      <rect x="8" y="4" width="16" height="12" rx="3" fill={color} stroke="#2C3E50" strokeWidth="0.8" />
      
      {/* Eyes */}
      <circle cx="12" cy="10" r="2" fill="#2C3E50" />
      <circle cx="20" cy="10" r="2" fill="#2C3E50" />
      
      {/* Antenna */}
      <line x1="16" y1="4" x2="16" y2="0" stroke="#2C3E50" strokeWidth="1" />
      <circle cx="16" cy="0" r="2" fill={winner ? "#6BCF7F" : "#94a3b8"} />
      
      {/* Number badge */}
      <circle cx="16" cy="22" r="5" fill="#2C3E50" />
      <text x="16" y="25" textAnchor="middle" fontSize="7" fill="white" fontWeight="bold">{number}</text>
      
      {/* Winner crown */}
      {winner && (
        <path d="M10 2L13 -2 16 1 19 -2 22 2" stroke="#FFD93D" strokeWidth="1.5" fill="none" />
      )}
    </svg>
  )
}

// Coin stack for settlement
export function CoinStackIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id="coin-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6BCF7F" />
          <stop offset="100%" stopColor="#4CAF50" />
        </linearGradient>
      </defs>
      
      {/* Coin stack */}
      <ellipse cx="24" cy="36" rx="14" ry="4" fill="#4CAF50" />
      <ellipse cx="24" cy="32" rx="14" ry="4" fill="url(#coin-grad)" stroke="#2C3E50" strokeWidth="0.5" />
      <ellipse cx="24" cy="28" rx="14" ry="4" fill="url(#coin-grad)" stroke="#2C3E50" strokeWidth="0.5" />
      <ellipse cx="24" cy="24" rx="14" ry="4" fill="url(#coin-grad)" stroke="#2C3E50" strokeWidth="0.5" />
      <ellipse cx="24" cy="20" rx="14" ry="4" fill="url(#coin-grad)" stroke="#2C3E50" strokeWidth="0.5" />
      
      {/* Checkmark */}
      <circle cx="36" cy="12" r="8" fill="#6BCF7F" stroke="#2C3E50" strokeWidth="0.8" />
      <path d="M32 12l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

// Ghost with megaphone for encrypted intent
export function GhostMegaphoneIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 80 64" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id="ghost-mega-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C5E3F6" />
          <stop offset="100%" stopColor="#A8D8EA" />
        </linearGradient>
        <filter id="ghost-mega-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.1" />
        </filter>
      </defs>
      
      {/* Ghost body */}
      <path
        d="M30 16c-10 0-16 8-16 18v10c0 3 2 4 4 4h4v6l5-6 5 6v-6h4c2 0 4-1 4-4V34c0-10-6-18-16-18h6z"
        fill="url(#ghost-mega-grad)"
        stroke="#94a3b8"
        strokeWidth="1"
        filter="url(#ghost-mega-shadow)"
      />
      
      {/* Eyes */}
      <ellipse cx="24" cy="28" rx="3" ry="3.5" fill="#2C3E50" />
      <ellipse cx="36" cy="28" rx="3" ry="3.5" fill="#2C3E50" />
      <ellipse cx="25" cy="27" rx="1" ry="1.2" fill="white" />
      <ellipse cx="37" cy="27" rx="1" ry="1.2" fill="white" />
      
      {/* Lock held */}
      <rect x="26" y="38" width="8" height="7" rx="1.5" fill="#FFD93D" stroke="#2C3E50" strokeWidth="0.6" />
      <path d="M28 38v-2a2 2 0 014 0v2" stroke="#2C3E50" strokeWidth="0.8" fill="none" />
      
      {/* Speech bubble */}
      <path
        d="M52 8h16c2 0 4 2 4 4v12c0 2-2 4-4 4h-4l-4 6-4-6h-4c-2 0-4-2-4-4V12c0-2 2-4 4-4z"
        fill="white"
        stroke="#A8E6CF"
        strokeWidth="1"
      />
      <text x="60" y="20" textAnchor="middle" fontSize="6" fontWeight="600" fill="#2C3E50">Bots can't</text>
      <text x="60" y="27" textAnchor="middle" fontSize="6" fontWeight="600" fill="#2C3E50">read it!</text>
    </svg>
  )
}
