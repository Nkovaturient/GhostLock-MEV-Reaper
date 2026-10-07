/** Server API root (e.g. http://localhost:4800/api). No secrets in the browser. */
export function getServerApiBase(): string {
  const explicit = import.meta.env.VITE_API_BASE_URL as string | undefined
  if (explicit?.trim()) {
    return explicit.replace(/\/$/, '')
  }

  const solverUrl = import.meta.env.VITE_SOLVER_API_URL as string | undefined
  if (solverUrl?.trim()) {
    const trimmed = solverUrl.replace(/\/$/, '')
    if (trimmed.endsWith('/api/auctions')) {
      return trimmed.slice(0, -'/auctions'.length)
    }
    if (trimmed.endsWith('/auctions')) {
      return trimmed.replace(/\/auctions$/, '')
    }
    return trimmed
  }

  return 'http://localhost:4800/api'
}
