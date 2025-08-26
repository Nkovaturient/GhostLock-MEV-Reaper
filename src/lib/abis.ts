// Contract ABIs for GhostLock: MEV Reaper
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
    type: 'function',
    name: 'getUserIntents',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      {
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'user', type: 'address' },
          { name: 'targetBlock', type: 'uint256' },
          { name: 'encrypted', type: 'bytes' },
          { name: 'status', type: 'uint8' },
          { name: 'inclusionBlock', type: 'uint256' },
          { name: 'settlementPrice', type: 'uint256' },
        ],
        name: '',
        type: 'tuple[]',
      },
    ],
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
    type: 'function',
    name: 'deposits',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'marketId', type: 'uint8' }
    ],
    outputs: [
      { name: 'base', type: 'uint256' },
      { name: 'quote', type: 'uint256' }
    ]
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

export const EPOCH_RNG_ABI = [
  {
    type: 'function',
    name: 'requestEpochSeed',
    stateMutability: 'payable',
    inputs: [
      { name: 'epoch', type: 'uint256' },
      { name: 'callbackGasLimit', type: 'uint32' }
    ],
    outputs: [
      { name: 'requestID', type: 'uint256' },
      { name: 'requestPrice', type: 'uint256' }
    ]
  },
  {
    type: 'function',
    name: 'epochSeed',
    stateMutability: 'view',
    inputs: [{ name: 'epoch', type: 'uint256' }],
    outputs: [{ name: 'seed', type: 'bytes32' }]
  },
  {
    type: 'event',
    name: 'EpochRequested',
    inputs: [
      { name: 'epoch', type: 'uint256', indexed: true },
      { name: 'requestId', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'EpochSeed',
    inputs: [
      { name: 'epoch', type: 'uint256', indexed: true },
      { name: 'seed', type: 'bytes32', indexed: false }
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
  },
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }]
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }]
  }
] as const