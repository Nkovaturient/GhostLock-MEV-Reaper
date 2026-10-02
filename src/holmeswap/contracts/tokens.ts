/**
 * Token registry for HolmeSwap.
 * Native ETH needs no address — useBalance handles it with account address only.
 * ERC-20s need a contract address per chain.
 *
 * USDC: Circle canonical addresses — https://developers.circle.com/stablecoins/usdc-contract-addresses
 * Override per chain via VITE_ARBITRUM_SEPOLIA_USDC_ADDRESS / VITE_MOCK_USDC_ADDRESS in .env
 */

export interface TokenConfig {
    symbol: string
    name: string
    decimals: number
    /** undefined = native ETH */
    addresses: Partial<Record<number, `0x${string}`>>
    logoColor: string   // Tailwind background colour for the icon pill
    textColor: string
}

// Chain IDs
export const CHAIN = {
    BASE_SEPOLIA: 84532,
    BASE: 8453,
    ARB_ONE: 42161,
    ARB_SEPOLIA: 421614,
} as const

/** Circle-issued USDC (not mainnet address on Sepolia). */
const USDC_ADDRESSES: Partial<Record<number, `0x${string}`>> = {
    [CHAIN.ARB_ONE]: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    [CHAIN.ARB_SEPOLIA]: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    [CHAIN.BASE]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    [CHAIN.BASE_SEPOLIA]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
}

const BTC_ADDRESSES: Partial<Record<number, `0x${string}`>> = {
    [CHAIN.BASE]: '0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b',
    [CHAIN.ARB_ONE]: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
}

export const TOKEN_LIST: TokenConfig[] = [
    {
        symbol: 'ETH',
        name: 'Ether',
        decimals: 18,
        addresses: {},
        logoColor: 'bg-indigo-500',
        textColor: 'text-indigo-100',
    },
    {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        addresses: {
            ...USDC_ADDRESSES,
        },
        logoColor: 'bg-blue-500',
        textColor: 'text-blue-100',
    },
    {
        symbol: 'BTC',
        name: 'Bitcoin (WBTC)',
        decimals: 8,
        addresses: BTC_ADDRESSES,
        logoColor: 'bg-orange-500',
        textColor: 'text-orange-100',
    },
    {
        symbol: 'ERE',
        name: 'ERE Token',
        decimals: 18,
        addresses: {},
        logoColor: 'bg-emerald-500',
        textColor: 'text-emerald-100',
    },
]

const listMap = Object.fromEntries(TOKEN_LIST.map(t => [t.symbol, t])) as Record<string, TokenConfig>

export const TOKEN_MAP: Record<string, TokenConfig> = {
    ...listMap,
    WBTC: listMap.BTC,
}

/** Get ERC-20 address for a token on a given chain. Returns undefined for native ETH or unmapped tokens. */
export function getTokenAddress(symbol: string, chainId: number): `0x${string}` | undefined {
    const key = symbol.toUpperCase()
    if (key === 'USDC') {
        const sepoliaOverride = import.meta.env.VITE_ARBITRUM_SEPOLIA_USDC_ADDRESS
        const oneOverride = import.meta.env.VITE_ARBITRUM_ONE_USDC_ADDRESS
        const mockOverride = import.meta.env.VITE_MOCK_USDC_ADDRESS
        if (chainId === CHAIN.ARB_SEPOLIA && sepoliaOverride) {
            return sepoliaOverride as `0x${string}`
        }
        if (chainId === CHAIN.ARB_ONE && oneOverride) {
            return oneOverride as `0x${string}`
        }
        if (mockOverride) {
            return mockOverride as `0x${string}`
        }
    }
    const cfg = TOKEN_MAP[key]
    return cfg?.addresses[chainId]
}

/** True when the token is native ETH (no ERC-20 address needed) */
export function isNativeToken(symbol: string): boolean {
    return symbol === 'ETH'
}