import { Address } from 'viem'

export const CONTRACTS = {
	GHOSTLOCK_INTENTS: import.meta.env.VITE_GHOSTLOCK_INTENTS_ADDRESS as Address,
	BATCH_SETTLEMENT: import.meta.env.VITE_BATCH_SETTLEMENT_ADDRESS as Address,
	EPOCH_RNG: import.meta.env.VITE_EPOCH_RNG_ADDRESS as Address,
	MOCK_TOKEN_A: import.meta.env.VITE_MOCK_TOKEN_A_ADDRESS as Address,
	MOCK_TOKEN_B: import.meta.env.VITE_MOCK_TOKEN_B_ADDRESS as Address,
} as const

export type IntentStatus = 'Pending' | 'Ready' | 'Settled'

export interface Intent {
	id: string
	user: Address
	targetBlock: number
	encrypted: string
	status: IntentStatus
	inclusionBlock?: number
	settlementPrice?: string
	decrypted?: {
		market: string
		side: 'buy' | 'sell'
		amount: string
		limitPrice: string
		marketId: number
		epoch: number
	}
}

export interface Market {
	id: number
	name: string
	baseToken: Address
	quoteToken: Address
	baseSymbol: string
	quoteSymbol: string
}

export const MARKETS: Market[] = [
	{
		id: 0,
		name: 'ETH/USDC',
		baseToken: CONTRACTS.MOCK_TOKEN_A,
		quoteToken: CONTRACTS.MOCK_TOKEN_B,
		baseSymbol: 'ETH',
		quoteSymbol: 'USDC'
	}
]