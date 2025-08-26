import { Address } from 'viem'

// Contract addresses - replace with actual deployed addresses
export const CONTRACTS = {
  GHOSTLOCK_INTENTS: import.meta.env.VITE_GHOSTLOCK_INTENTS_ADDRESS as Address || '0x0000000000000000000000000000000000000000',
  BATCH_SETTLEMENT: import.meta.env.VITE_BATCH_SETTLEMENT_ADDRESS as Address || '0x0000000000000000000000000000000000000000',
  EPOCH_RNG: import.meta.env.VITE_EPOCH_RNG_ADDRESS as Address || '0x0000000000000000000000000000000000000000',
  MOCK_TOKEN_A: import.meta.env.VITE_MOCK_TOKEN_A_ADDRESS as Address || '0x0000000000000000000000000000000000000000',
  MOCK_TOKEN_B: import.meta.env.VITE_MOCK_TOKEN_B_ADDRESS as Address || '0x0000000000000000000000000000000000000000',
} as const

// Contract ABIs
export const GHOSTLOCK_INTENTS_ABI = [
  {
    type: 'function',
    name: 'submitEncryptedIntentWithDirectFunding',
    stateMutability: 'payable',
    inputs: [
      { name: 'callbackGasLimit', type: 'uint32' },
      { name: 'unlockBlock', type: 'uint32' },
      { name: 'condition', type: 'bytes' },
      { name: 'encryptedData', type: 'tuple', components: [
        { name: 'data', type: 'bytes' },
        { name: 'commitment', type: 'bytes32' }
      ]}
    ],
    outputs: [
      { name: 'requestId', type: 'uint256' },
      { name: 'price', type: 'uint256' }
    ]
  },
  {
    type: 'function',
    name: 'intents',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'requestedBy', type: 'address' },
      { name: 'encryptedAt', type: 'uint32' },
      { name: 'unlockBlock', type: 'uint32' },
      { name: 'ready', type: 'bool' },
      { name: 'decrypted', type: 'bytes' }
    ]
  },
  {
    type: 'event',
    name: 'IntentSubmitted',
    inputs: [
      { name: 'requestId', type: 'uint256', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'unlockBlock', type: 'uint32', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'IntentReady',
    inputs: [
      { name: 'requestId', type: 'uint256', indexed: true }
    ]
  }
] as const

export const BATCH_SETTLEMENT_ABI = [
  {
    type: 'function',
    name: 'addMarket',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'marketId', type: 'uint8' },
      { name: 'base', type: 'address' },
      { name: 'quote', type: 'address' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'deposit',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'marketId', type: 'uint8' },
      { name: 'baseAmt', type: 'uint256' },
      { name: 'quoteAmt', type: 'uint256' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'settleBatch',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'requestIds', type: 'uint256[]' },
      { name: 'epoch', type: 'uint256' },
      { name: 'marketId', type: 'uint8' },
      { name: 'clearingPrice', type: 'uint256' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'withdraw',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'marketId', type: 'uint8' },
      { name: 'baseAmt', type: 'uint256' },
      { name: 'quoteAmt', type: 'uint256' }
    ],
    outputs: []
  },
  {
    type: 'event',
    name: 'Settled',
    inputs: [
      { name: 'epoch', type: 'uint256', indexed: false },
      { name: 'marketId', type: 'uint8', indexed: false },
      { name: 'clearingPrice', type: 'uint256', indexed: false },
      { name: 'buyFill', type: 'uint256', indexed: false },
      { name: 'sellFill', type: 'uint256', indexed: false }
    ]
  }
] as const

export const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  }
] as const

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