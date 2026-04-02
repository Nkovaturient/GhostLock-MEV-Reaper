/**
 * Live Pyth price feeds via Hermes REST for GhostLock and HolmeSwap UIs.
 * https://docs.pyth.network/price-feeds/core/fetch-price-updates#sdk
 */
import { useQuery } from '@tanstack/react-query'
import { PYTH_PRICE_IDS, HERMES_BASE } from '../lib/pyth-ids'

export interface PythPrice {
  price: number
  conf: number
  expo: number
  publishTime: number
  id: string
}

function parsePythPrice(parsed: { price?: { price?: string; expo?: number; conf?: string | number }; id?: string; metadata?: { publish_time?: number } }): PythPrice | null {
  const p = parsed?.price
  if (!p || p.price == null || p.expo == null) return null
  const priceNum = Number(p.price)
  const expo = Number(p.expo)
  const price = priceNum * Math.pow(10, expo)
  const conf = p.conf != null ? Number(p.conf) * Math.pow(10, expo) : 0
  return {
    price,
    conf,
    expo,
    publishTime: parsed.metadata?.publish_time ?? 0,
    id: parsed.id ?? '',
  }
}

async function fetchLatestPrices(priceIds: string[]): Promise<PythPrice[]> {
  if (priceIds.length === 0) return []
  const params = new URLSearchParams()
  priceIds.forEach((id) => params.append('ids[]', id))
  const url = `${HERMES_BASE}/v2/updates/price/latest?${params.toString()}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Hermes price fetch failed: ${res.status}`)
  const data = (await res.json()) as { parsed?: Array<{ id?: string; price?: { price?: string; expo?: number; conf?: string | number }; metadata?: { publish_time?: number } }> }
  const parsed = data?.parsed ?? []
  return parsed.map((p) => parsePythPrice(p)).filter((p): p is PythPrice => p != null)
}

const REFETCH_MS = 1000
const STALE_MS = 60_000

export function usePythPrice(priceId: string) {
  return useQuery({
    queryKey: ['pyth-price', priceId],
    queryFn: async () => {
      const list = await fetchLatestPrices([priceId])
      const p = list[0]
      if (!p) throw new Error('No price returned')
      return p
    },
    refetchInterval: REFETCH_MS,
    staleTime: STALE_MS,
    enabled: !!priceId,
  })
}

export function usePythPrices(priceIds: string[]) {
  return useQuery({
    queryKey: ['pyth-prices', priceIds.join(',')],
    queryFn: () => fetchLatestPrices(priceIds),
    refetchInterval: REFETCH_MS,
    staleTime: STALE_MS,
    enabled: priceIds.length > 0,
  })
}

export function useEthUsdPrice() {
  return usePythPrice(PYTH_PRICE_IDS.ETH_USD)
}

export function useUsdcUsdPrice() {
  return usePythPrice(PYTH_PRICE_IDS.USDC_USD)
}

export function useEthUsdcRate() {
  const { data: eth, isLoading: ethLoading } = useEthUsdPrice()
  const { data: usdc, isLoading: usdcLoading } = useUsdcUsdPrice()
  const isLoading = ethLoading || usdcLoading
  if (!eth || !usdc || usdc.price <= 0) return { rate: null, ethPrice: eth?.price ?? null, usdcPrice: usdc?.price ?? null, isLoading }
  const rate = eth.price / usdc.price
  return { rate, ethPrice: eth.price, usdcPrice: usdc.price, isLoading }
}

export { PYTH_PRICE_IDS }
