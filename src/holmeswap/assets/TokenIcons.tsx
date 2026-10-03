
interface IconProps {
  className?: string
}

export function EthIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-label="ETH">
      <defs>
        <linearGradient id="eth-grad-1" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#627EEA" />
          <stop offset="100%" stopColor="#3C5BDB" />
        </linearGradient>
        <linearGradient id="eth-grad-2" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#8299EE" />
          <stop offset="100%" stopColor="#627EEA" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill="url(#eth-grad-1)" />
      <path d="M16 4L9 16l7 4 7-4-7-12z" fill="url(#eth-grad-2)" opacity="0.9" />
      <path d="M16 22l-7-4 7 10 7-10-7 4z" fill="white" opacity="0.8" />
      <path d="M16 4v18l7-4-7-14z" fill="white" opacity="0.3" />
    </svg>
  )
}

export function BtcIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-label="BTC">
      <defs>
        <linearGradient id="btc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F7931A" />
          <stop offset="100%" stopColor="#E2761B" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill="url(#btc-grad)" />
      <path
        d="M21.3 14.1c.2-1.4-.8-2-2.2-2.5l.5-1.9-1.2-.3-.5 1.8c-.3-.1-.6-.2-.9-.2l.5-1.8-1.2-.3-.5 1.9c-.3-.1-.5-.2-.7-.2v-.1l-1.7-.4-.3 1.2s.9.2.9.2c.5.1.6.4.5.7l-.6 2.2c0 0 .1 0 .2.1h-.2l-.8 3.1c-.1.2-.3.5-.8.4 0 0-.9-.2-.9-.2l-.6 1.4 1.6.4c.3.1.6.2.9.3l-.5 2 1.2.3.5-1.9c.3.1.6.2.9.2l-.5 1.9 1.2.3.5-2c2.1.8 3.5.5 4.1-1.2.5-1.4 0-2.2-1-2.7.7-.2 1.3-.7 1.4-1.8zm-2.5 3.9c-.4 1.5-3.1.7-3.9.5l.7-2.6c.8.2 3.4.7 3.2 2.1zm.4-3.9c-.3 1.4-2.6.7-3.3.5l.6-2.4c.7.2 3 1 2.7 1.9z"
        fill="white"
      />
    </svg>
  )
}

export function UsdcIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-label="USDC">
      <defs>
        <linearGradient id="usdc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2775CA" />
          <stop offset="100%" stopColor="#1A5DAB" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill="url(#usdc-grad)" />
      <path
        d="M20.5 18.5c0-2-1.2-2.7-3.6-3-.8-.1-1.4-.3-1.4-.8s.4-.8 1.2-.8c.7 0 1.1.2 1.3.7.1.2.3.3.5.3h.8c.3 0 .5-.2.5-.5v-.1c-.2-1-.9-1.8-2-2V11c0-.3-.2-.5-.5-.5h-.6c-.3 0-.5.2-.5.5v1.2c-1.5.2-2.5 1.2-2.5 2.5 0 1.9 1.2 2.6 3.6 2.9.9.2 1.4.4 1.4.9s-.5.9-1.3.9c-.9 0-1.3-.3-1.5-.9-.1-.2-.3-.3-.5-.3h-.8c-.3 0-.5.2-.5.5v.1c.2 1.1 1 1.9 2.2 2.1V21c0 .3.2.5.5.5h.6c.3 0 .5-.2.5-.5v-1.2c1.5-.3 2.5-1.2 2.5-2.6z"
        fill="white"
      />
    </svg>
  )
}

export function EreIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-label="ERE">
      <defs>
        <linearGradient id="ere-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A8E6CF" />
          <stop offset="100%" stopColor="#6BCF7F" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill="url(#ere-grad)" />
      <text x="16" y="20" textAnchor="middle" fontSize="10" fontWeight="bold" fill="white">ERE</text>
    </svg>
  )
}

export function getTokenIcon(symbol: string, className = 'w-7 h-7') {
  switch (symbol.toUpperCase()) {
    case 'ETH':
      return <EthIcon className={className} />
    case 'USDC':
      return <UsdcIcon className={className} />
    case 'BTC':
    case 'WBTC':
      return <BtcIcon className={className} />
    case 'ERE':
      return <EreIcon className={className} />
    default:
      return (
        <div className={`${className} rounded-full bg-holme-ghost-blue flex items-center justify-center text-xs font-bold text-holme-text-primary`}>
          {symbol.slice(0, 1)}
        </div>
      )
  }
}
