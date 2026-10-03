import { Lock, Dices, Users, Coins } from 'lucide-react'

export type StepKind = 'encrypt' | 'mempool' | 'ordering' | 'competing' | 'settlement'

interface StepIllustrationProps {
  kind: StepKind
  className?: string
}

export default function StepIllustration({ kind, className = '' }: StepIllustrationProps) {
  const base = 'w-8 h-8 text-holme-text-primary'
  switch (kind) {
    case 'encrypt':
      return <Lock className={`${base} ${className}`} aria-hidden />
    case 'mempool':
      return <Lock className={`${base} ${className}`} aria-hidden />
    case 'ordering':
      return <Dices className={`${base} ${className}`} aria-hidden />
    case 'competing':
      return <Users className={`${base} ${className}`} aria-hidden />
    case 'settlement':
      return <Coins className={`${base} ${className}`} aria-hidden />
    default:
      return <Lock className={`${base} ${className}`} aria-hidden />
  }
}
