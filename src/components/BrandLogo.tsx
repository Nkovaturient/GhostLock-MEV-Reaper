import { cn } from '../lib/utils'
import { glLogo } from '../holmeswap/assets/index'

interface BrandLogoProps {
  className?: string
}

export default function BrandLogo({ className }: BrandLogoProps) {
  return (
    <span
      className={cn(
        'relative block h-10 w-10 sm:h-11 sm:w-11 shrink-0 overflow-hidden rounded-[11px] sm:rounded-xl',
        'ring-1 ring-white/50 shadow-[0_2px_10px_rgba(30,80,160,0.12)]',
        className,
      )}
    >
      <img
        src={glLogo}
        alt="GhostLock"
        width={44}
        height={44}
        decoding="async"
        draggable={false}
        className="h-full w-full scale-[1.42] object-cover object-[center_42%] select-none"
      />
    </span>
  )
}
