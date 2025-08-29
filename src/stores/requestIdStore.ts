type StoredRequest = {
  id: number
  createdAt: number
  decrypted?: boolean
}

function key(chainId: number, address: string) {
  return `gl:requests:${chainId}:${address.toLowerCase()}`
}

export function addRequestId(chainId: number, address: string, id: number) {
  try {
    if (typeof window === 'undefined') return
    const k = key(chainId, address)
    const raw = window.localStorage.getItem(k)
    const list: StoredRequest[] = raw ? JSON.parse(raw) : []
    if (!list.some(r => r.id === id)) {
      list.unshift({ id, createdAt: Date.now() })
      window.localStorage.setItem(k, JSON.stringify(list.slice(0, 100)))
    }
  } catch {}
}

export function markDecrypted(chainId: number, address: string, id: number) {
  try {
    if (typeof window === 'undefined') return
    const k = key(chainId, address)
    const raw = window.localStorage.getItem(k)
    const list: StoredRequest[] = raw ? JSON.parse(raw) : []
    const idx = list.findIndex(r => r.id === id)
    if (idx >= 0) {
      list[idx].decrypted = true
      window.localStorage.setItem(k, JSON.stringify(list))
    }
  } catch {}
}

export function getRequestIds(chainId: number, address: string): number[] {
  try {
    if (typeof window === 'undefined') return []
    const raw = window.localStorage.getItem(key(chainId, address))
    const list: StoredRequest[] = raw ? JSON.parse(raw) : []
    return list.map(r => r.id)
  } catch {
    return []
  }
}


