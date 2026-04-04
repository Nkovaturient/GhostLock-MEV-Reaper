/**
 * IntentProofRow.tsx
 *
 * Shared presentational component for displaying intent verification data:
 * - Truncated monospace value
 * - Copy button
 * - Optional external link to explorer
 */
import React from 'react'
import { Copy, ExternalLink } from 'lucide-react'
import { cn } from '../../lib/utils'

interface IntentProofRowProps {
  /** Label shown before the value (e.g., "Request ID", "Transaction") */
  label: string
  /** The full value to display (will be truncated) */
  value: string | number
  /** Optional copy value (defaults to `value` converted to string) */
  copyValue?: string
  /** Optional external link URL */
  href?: string | null
  /** Whether the row is loading (shows skeleton) */
  isLoading?: boolean
  /** Additional classes for the container */
  className?: string
}

function truncate(value: string, head = 6, tail = 4): string {
  if (value.length <= head + tail + 3) return value
  return `${value.slice(0, head)}...${value.slice(-tail)}`
}

export default function IntentProofRow({
  label,
  value,
  copyValue,
  href,
  isLoading = false,
  className,
}: IntentProofRowProps) {
  const displayValue = typeof value === 'number' ? String(value) : value
  const toCopy = copyValue ?? displayValue
  const truncated = displayValue.startsWith('0x') && displayValue.length > 12
    ? truncate(displayValue)
    : displayValue

  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(toCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore clipboard errors
    }
  }

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2 text-xs', className)}>
        <span className="text-muted-foreground">{label}:</span>
        <span className="inline-block w-24 h-3 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-2 text-xs min-w-0', className)}>
      <span className="text-muted-foreground shrink-0">{label}: </span>
      <span
        className={cn(
          'font-mono text-foreground truncate',
          displayValue.startsWith('0x') && 'text-[10px] sm:text-xs'
        )}
        title={displayValue}
      >
        {truncated}
      </span>

      <button
        onClick={handleCopy}
        className="p-1 rounded hover:bg-muted/70 transition-colors shrink-0"
        title="Copy to clipboard"
        type="button"
      >
        {copied ? (
          <span className="text-[10px] text-holme-green-success font-medium">Copied</span>
        ) : (
          <Copy className="w-3 h-3 text-muted-foreground" />
        )}
      </button>

      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 rounded hover:bg-muted/70 transition-colors shrink-0"
          title="View on explorer"
        >
          <ExternalLink className="w-3 h-3 text-muted-foreground" />
        </a>
      )}
    </div>
  )
}
