/**
 * Maps raw wallet / viem / encoding errors to user-facing swap messages.
 */
export function formatSwapError(raw: unknown): { message: string; field: 'amount' | 'oracle' | 'wallet' | 'network' | 'general' } {
  const msg =
    (raw as { shortMessage?: string })?.shortMessage ??
    (raw instanceof Error ? raw.message : String(raw ?? 'Unknown error'))

  const lower = msg.toLowerCase()

  if (lower.includes('nan') && lower.includes('bigint')) {
    return {
      field: 'amount',
      message: 'Could not encode this swap for encryption. Refresh the page and try again.',
    }
  }

  if (lower.includes('drand unlock round') || lower.includes('unlock round')) {
    return {
      field: 'general',
      message: 'Could not schedule intent decryption time. Try again in a moment.',
    }
  }

  if (lower.includes('invalid fixednumber') || lower.includes('parseunits') || lower.includes('underflow')) {
    return {
      field: 'amount',
      message: 'Amount or limit price could not be encoded. Adjust the amount slightly and retry.',
    }
  }

  if (lower.includes('user rejected') || lower.includes('user denied')) {
    return {
      field: 'wallet',
      message: 'Transaction cancelled in your wallet.',
    }
  }

  if (lower.includes('insufficient funds') || lower.includes('insufficient balance')) {
    return {
      field: 'amount',
      message: 'Insufficient balance for this swap and bond.',
    }
  }

  if (lower.includes('oracle') || lower.includes('price feed') || lower.includes('invalid price')) {
    return {
      field: 'oracle',
      message: 'Live oracle price is unavailable. Wait for a valid quote or try again.',
    }
  }

  if (lower.includes('unsupported pair') || lower.includes('invalid amount')) {
    return {
      field: 'amount',
      message: 'This token pair or amount cannot be encoded as an intent.',
    }
  }

  if (lower.includes('network') || lower.includes('fetch') || lower.includes('timeout')) {
    return {
      field: 'network',
      message: 'Network error — check your connection and try again.',
    }
  }

  if (lower.includes('wait for a valid oracle')) {
    return { field: 'oracle', message: msg }
  }

  if (lower.includes('wallet not connected')) {
    return { field: 'wallet', message: 'Connect your wallet to submit an intent.' }
  }

  return {
    field: 'general',
    message: msg.length > 160 ? `${msg.slice(0, 157)}…` : msg,
  }
}
