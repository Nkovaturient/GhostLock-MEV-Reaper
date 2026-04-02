/**
 * server/contracts/abis.js
 *
 * Complete ABIs for all GhostLock/HolmeSwap contracts on Arbitrum Sepolia.
 * Replaces the old server/contracts/ABI.js (GhostLockIntents era).
 *
 * GhostLockLiveness: 0x056B39F4fd80C86E44D2Fc6153A3e9F3d20a2C6C
 * BatchSettlement:   0x64593911b86889F45d1CbEaF40397c4807505EB8
 * GhostLockEpochRNG: 0x6a0e6F76Db61985bCB4e31C71226Ba1B35dBbF1A
 * SolverBoard:       0x1e457f34Bdccf28258Cd30956bb6F2df614ddBEF
 * SolverRegistry:    0xE8901D9f2f262f4F09E30344aA8470eCEbc64CBD
 * PriceOracle:       0xB049f2a5E2aeEa5950675EA89d0DA79E5749fB5C
 */

// ─── GhostLockLiveness ──────────────────────────────────────────────────────────

const GHOSTLOCK_LIVENESS_ABI = [
  {
    name: 'submitIntentWithBond',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'callbackGasLimit', type: 'uint32' },
      { name: 'unlockBlock',     type: 'uint32' },
      { name: 'condition',       type: 'bytes'  },
      {
        name: 'encryptedData',
        type: 'tuple',
        components: [
          {
            name: 'u',
            type: 'tuple',
            components: [
              { name: 'x', type: 'uint256[2]' },
              { name: 'y', type: 'uint256[2]' },
            ],
          },
          { name: 'v', type: 'bytes' },
          { name: 'w', type: 'bytes' },
        ],
      },
    ],
    outputs: [
      { name: 'requestId',    type: 'uint256' },
      { name: 'requestPrice', type: 'uint256' },
    ],
  },
  {
    name: 'intents',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'requestedBy',    type: 'address' },
      { name: 'encryptedAt',    type: 'uint32'  },
      { name: 'unlockBlock',    type: 'uint32'  },
      { name: 'ct',            type: 'tuple',   components: [
        { name: 'u', type: 'tuple', components: [
          { name: 'x', type: 'uint256[2]' },
          { name: 'y', type: 'uint256[2]' },
        ]},
        { name: 'v', type: 'bytes' },
        { name: 'w', type: 'bytes' },
      ]},
      { name: 'ready',         type: 'bool'   },
      { name: 'forced',        type: 'bool'   },
      { name: 'decryptedHash', type: 'bytes32' },
      { name: 'bond',          type: 'uint256' },
      { name: 'revealDeadline',type: 'uint256' },
      { name: 'slashDeadline', type: 'uint256' },
    ],
  },
  {
    name: 'isReady',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'requestId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'verifyPlaintext',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'requestId',  type: 'uint256' },
      { name: 'plaintext', type: 'bytes'    },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getRequestIds',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    name: 'BOND_MINIMUM',
    type: 'function',
    stateMutability: 'pure',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'bountyPercent',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'revealGraceBlocks',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'slashBlocks',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'pendingRefunds',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'treasury',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'admin',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'forceReveal',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'requestId',      type: 'uint256' },
      { name: 'decryptionKey', type: 'bytes'    },
    ],
    outputs: [],
  },
  {
    name: 'slashBond',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'requestId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'claimPendingRefund',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'updateConfig',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_bountyPercent',      type: 'uint256' },
      { name: '_revealGraceBlocks', type: 'uint256' },
      { name: '_slashBlocks',       type: 'uint256' },
      { name: '_treasury',          type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'transferAdmin',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'newAdmin', type: 'address' }],
    outputs: [],
  },
  {
    name: 'acceptAdmin',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'sweepEth',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to',     type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  // Events
  {
    name: 'IntentSubmitted',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'requestId',   type: 'uint256', indexed: true  },
      { name: 'user',        type: 'address', indexed: true  },
      { name: 'unlockBlock', type: 'uint32',  indexed: false },
      { name: 'bond',        type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'IntentDecrypted',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'requestId',  type: 'uint256', indexed: true  },
      { name: 'marketId',   type: 'uint8',   indexed: true  },
      { name: 'epoch',       type: 'uint256', indexed: true  },
      { name: 'forced',     type: 'bool',    indexed: false },
      { name: 'revealer',   type: 'address', indexed: false },
      { name: 'plaintext',  type: 'bytes',   indexed: false },
    ],
  },
  {
    name: 'IntentBondSlashed',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'requestId', type: 'uint256', indexed: true  },
      { name: 'amount',    type: 'uint256', indexed: false },
      { name: 'to',        type: 'address', indexed: true  },
    ],
  },
  {
    name: 'PendingRefundCredited',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'account', type: 'address', indexed: true  },
      { name: 'amount',  type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'PendingRefundClaimed',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'account', type: 'address', indexed: true  },
      { name: 'amount',  type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'ConfigUpdated',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'bountyPercent',      type: 'uint256', indexed: false },
      { name: 'revealGraceBlocks',  type: 'uint256', indexed: false },
      { name: 'slashBlocks',        type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'AdminTransferInitiated',
    type: 'event',
    anonymous: false,
    inputs: [{ name: 'newAdmin', type: 'address', indexed: true }],
  },
  {
    name: 'AdminTransferred',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'oldAdmin', type: 'address', indexed: true },
      { name: 'newAdmin', type: 'address', indexed: true },
    ],
  },
  {
    name: 'EthSwept',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'to',     type: 'address', indexed: true  },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
]

// ─── GhostLockBatchSettlement ─────────────────────────────────────────────────

const BATCH_SETTLEMENT_ABI = [
  {
    name: 'markets',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint8' }],
    outputs: [
      { name: 'base',   type: 'address' },
      { name: 'quote',  type: 'address' },
      { name: 'exists', type: 'bool'   },
    ],
  },
  {
    name: 'settledIntent',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'deposits',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '',      type: 'address' },
      { name: '',      type: 'uint8'   },
    ],
    outputs: [
      { name: 'base',  type: 'uint256' },
      { name: 'quote', type: 'uint256' },
    ],
  },
  {
    name: 'liveness',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'rng',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'oracle',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'solverBoard',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'dustTolerance',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'batchValue',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getBatchValue',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'batchId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  // User operations
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'marketId', type: 'uint8'   },
      { name: 'baseAmt',  type: 'uint256' },
      { name: 'quoteAmt', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'marketId', type: 'uint8'   },
      { name: 'baseAmt',  type: 'uint256' },
      { name: 'quoteAmt', type: 'uint256' },
    ],
    outputs: [],
  },
  // Settlement (onlySolverBoard)
  {
    name: 'settleBatch',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'payloads', type: 'tuple[]', components: [
        { name: 'requestId', type: 'uint256' },
        { name: 'plaintext',  type: 'bytes'   },
      ]},
      { name: 'epoch',         type: 'uint256' },
      { name: 'marketId',      type: 'uint8'   },
      { name: 'clearingPrice', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'executeWithRoutes',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'batchId', type: 'uint256' },
      { name: 'routes',  type: 'bytes'   },
    ],
    outputs: [],
  },
  {
    name: 'setBatchValue',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'batchId', type: 'uint256' },
      { name: 'value',   type: 'uint256' },
    ],
    outputs: [],
  },
  // Admin
  {
    name: 'addMarket',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'marketId', type: 'uint8'    },
      { name: 'base',     type: 'address'  },
      { name: 'quote',    type: 'address'  },
    ],
    outputs: [],
  },
  {
    name: 'setSolverBoard',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_solverBoard', type: 'address' }],
    outputs: [],
  },
  {
    name: 'setDustTolerance',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'tol', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'setDepositCaps',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'marketId', type: 'uint8'   },
      { name: 'capBase',   type: 'uint256' },
      { name: 'capQuote',  type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'setOracle',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_oracle', type: 'address' }],
    outputs: [],
  },
  {
    name: 'transferOwnership',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'newOwner', type: 'address' }],
    outputs: [],
  },
  {
    name: 'acceptOwnership',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  // Events
  {
    name: 'MarketAdded',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'marketId', type: 'uint8',   indexed: true  },
      { name: 'base',      type: 'address', indexed: false },
      { name: 'quote',     type: 'address', indexed: false },
    ],
  },
  {
    name: 'Deposited',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'user',     type: 'address', indexed: true  },
      { name: 'marketId', type: 'uint8',   indexed: false },
      { name: 'baseAmt',   type: 'uint256', indexed: false },
      { name: 'quoteAmt',  type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'Withdrawn',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'user',     type: 'address', indexed: true  },
      { name: 'marketId', type: 'uint8',   indexed: false },
      { name: 'baseAmt',   type: 'uint256', indexed: false },
      { name: 'quoteAmt',  type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'Settled',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'epoch',         type: 'uint256', indexed: false },
      { name: 'marketId',      type: 'uint8',   indexed: true  },
      { name: 'clearingPrice', type: 'uint256', indexed: false },
      { name: 'buyFill',        type: 'uint256', indexed: false },
      { name: 'sellFill',      type: 'uint256', indexed: false },
      { name: 'dustBuys',      type: 'uint256', indexed: false },
      { name: 'dustSells',     type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'SolverBoardSet',
    type: 'event',
    anonymous: false,
    inputs: [{ name: 'solverBoard', type: 'address', indexed: true }],
  },
  {
    name: 'DustToleranceUpdated',
    type: 'event',
    anonymous: false,
    inputs: [{ name: 'newTolerance', type: 'uint256', indexed: false }],
  },
  {
    name: 'OwnershipTransferred',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'previousOwner', type: 'address', indexed: true },
      { name: 'newOwner',     type: 'address', indexed: true },
    ],
  },
]

// ─── GhostLockEpochRNG ────────────────────────────────────────────────────────

const EPOCH_RNG_ABI = [
  {
    name: 'epochSeed',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'requestIdToEpoch',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'epochToRequestId',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getEpochSeed',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'epoch', type: 'uint256' }],
    outputs: [{ name: 'seed', type: 'bytes32' }],
  },
  {
    name: 'requestEpochSeed',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'epoch',            type: 'uint256' },
      { name: 'callbackGasLimit', type: 'uint32'  },
    ],
    outputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'uint256' },
    ],
  },
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'randomnessSender',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'getBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'transferOwnership',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'newOwner', type: 'address' }],
    outputs: [],
  },
  {
    name: 'acceptOwnership',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  // Events
  {
    name: 'EpochRequested',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'epoch',     type: 'uint256', indexed: true },
      { name: 'requestId', type: 'uint256', indexed: true },
    ],
  },
  {
    name: 'EpochSeedReceived',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'epoch', type: 'uint256', indexed: true },
      { name: 'seed',  type: 'bytes32', indexed: false },
    ],
  },
  {
    name: 'OwnershipTransferred',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'previousOwner', type: 'address', indexed: true },
      { name: 'newOwner',     type: 'address', indexed: true },
    ],
  },
]

// ─── SolverBoard ────────────────────────────────────────────────────────────────

const SOLVER_BOARD_ABI = [
  {
    name: 'getBatch',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'batchId', type: 'uint256' }],
    outputs: [
      { name: 'batchId',             type: 'uint256' },
      { name: 'finalizedBlock',      type: 'uint256' },
      { name: 'biddingDeadline',     type: 'uint256' },
      { name: 'settlementDeadline',  type: 'uint256' },
      { name: 'winningSolver',        type: 'address' },
      { name: 'winningBid',          type: 'uint256' },
      { name: 'settled',            type: 'bool'   },
      { name: 'expired',            type: 'bool'   },
    ],
  },
  {
    name: 'bids',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '',      type: 'uint256' },
      { name: '',      type: 'address' },
    ],
    outputs: [
      { name: 'solver',        type: 'address'  },
      { name: 'totalSurplus', type: 'uint256'  },
      { name: 'routeHash',    type: 'bytes32'  },
      { name: 'timestamp',    type: 'uint256'  },
      { name: 'executed',     type: 'bool'    },
      { name: 'slashed',      type: 'bool'    },
    ],
  },
  {
    name: 'getBatchBidders',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'batchId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    name: 'isBiddingOpen',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'batchId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'hasBid',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'batchId', type: 'uint256' },
      { name: 'solver',  type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'BIDDING_WINDOW_BLOCKS',
    type: 'function',
    stateMutability: 'pure',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'WINNER_SELECTION_BUFFER_BLOCKS',
    type: 'function',
    stateMutability: 'pure',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'SETTLEMENT_WINDOW_BLOCKS',
    type: 'function',
    stateMutability: 'pure',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'MIN_SURPLUS_BPS',
    type: 'function',
    stateMutability: 'pure',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'slashAmountFailure',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'slashAmountExpiry',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'winnerKeeper',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'solverRegistry',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'batchSettlement',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  // Admin
  {
    name: 'setSlashAmounts',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'failure', type: 'uint256' },
      { name: 'expiry',  type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'registerBatchValue',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'batchId', type: 'uint256' },
      { name: 'value',   type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'setWinnerKeeper',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'k', type: 'address' }],
    outputs: [],
  },
  {
    name: 'transferOwnership',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'newOwner', type: 'address' }],
    outputs: [],
  },
  {
    name: 'acceptOwnership',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  // Batch ops
  {
    name: 'publishBatch',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'batchId', type: 'uint256' }],
    outputs: [],
  },
  // Solver ops
  {
    name: 'submitBid',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'batchId',      type: 'uint256' },
      { name: 'totalSurplus', type: 'uint256' },
      { name: 'routeHash',    type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'selectWinner',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'batchId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'executeSettlement',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'batchId', type: 'uint256' },
      { name: 'routes',  type: 'bytes'   },
    ],
    outputs: [],
  },
  {
    name: 'expireBatch',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'batchId', type: 'uint256' }],
    outputs: [],
  },
  // Events
  {
    name: 'BatchPublished',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'batchId',         type: 'uint256', indexed: true },
      { name: 'finalizedBlock',  type: 'uint256', indexed: false },
      { name: 'biddingDeadline', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'BidSubmitted',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'batchId',  type: 'uint256', indexed: true },
      { name: 'solver',   type: 'address', indexed: true },
      { name: 'surplus',  type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'WinnerSelected',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'batchId',  type: 'uint256', indexed: true },
      { name: 'solver',   type: 'address', indexed: true },
      { name: 'surplus',  type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'SettlementExecuted',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'batchId',  type: 'uint256', indexed: true },
      { name: 'solver',   type: 'address', indexed: true },
      { name: 'success',  type: 'bool',   indexed: false },
    ],
  },
  {
    name: 'SettlementFailed',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'batchId',  type: 'uint256', indexed: true },
      { name: 'solver',   type: 'address', indexed: true },
      { name: 'reason',   type: 'string',  indexed: false },
    ],
  },
  {
    name: 'BatchExpired',
    type: 'event',
    anonymous: false,
    inputs: [{ name: 'batchId', type: 'uint256', indexed: true }],
  },
  {
    name: 'SlashAmountsUpdated',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'failure', type: 'uint256', indexed: false },
      { name: 'expiry',  type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'WinnerKeeperSet',
    type: 'event',
    anonymous: false,
    inputs: [{ name: 'keeper', type: 'address', indexed: true }],
  },
  {
    name: 'OwnershipTransferred',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'previousOwner', type: 'address', indexed: true },
      { name: 'newOwner',     type: 'address', indexed: true },
    ],
  },
]

// ─── SolverRegistry ────────────────────────────────────────────────────────────

const SOLVER_REGISTRY_ABI = [
  {
    name: 'MIN_BOND',
    type: 'function',
    stateMutability: 'pure',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'solvers',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [
      { name: 'solverAddress',      type: 'address'  },
      { name: 'bondAmount',        type: 'uint256'  },
      { name: 'reputation',        type: 'uint256'  },
      { name: 'totalSettled',      type: 'uint256'  },
      { name: 'failureCount',      type: 'uint256'  },
      { name: 'unbondRequestTime', type: 'uint256'  },
      { name: 'isActive',          type: 'bool'    },
      { name: 'endpointUrl',       type: 'string'   },
    ],
  },
  {
    name: 'isEligibleSolver',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'solver', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getActiveSolvers',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    name: 'getSolver',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'solver', type: 'address' }],
    outputs: [
      { name: 'solverAddress',      type: 'address'  },
      { name: 'bondAmount',        type: 'uint256'  },
      { name: 'reputation',        type: 'uint256'  },
      { name: 'totalSettled',      type: 'uint256'  },
      { name: 'failureCount',      type: 'uint256'  },
      { name: 'unbondRequestTime', type: 'uint256'  },
      { name: 'isActive',          type: 'bool'    },
      { name: 'endpointUrl',       type: 'string'   },
    ],
  },
  {
    name: 'authorizedCaller',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  // Solver ops
  {
    name: 'registerSolver',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'endpointUrl', type: 'string' }],
    outputs: [],
  },
  {
    name: 'increaseBond',
    type: 'function',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'requestUnbond',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'withdrawBond',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  // Authorized caller ops (SolverBoard only)
  {
    name: 'slashSolver',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'solver', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'reason',  type: 'string'  },
    ],
    outputs: [],
  },
  {
    name: 'recordSettlement',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'solver',  type: 'address' },
      { name: 'success', type: 'bool'    },
    ],
    outputs: [],
  },
  // Admin
  {
    name: 'setAuthorizedCaller',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'caller', type: 'address' }],
    outputs: [],
  },
  {
    name: 'executeAuthorizedCallerChange',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'transferOwnership',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'newOwner', type: 'address' }],
    outputs: [],
  },
  {
    name: 'acceptOwnership',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  // Events
  {
    name: 'SolverRegistered',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'solver',      type: 'address', indexed: true },
      { name: 'bond',        type: 'uint256', indexed: false },
      { name: 'endpointUrl', type: 'string',  indexed: false },
    ],
  },
  {
    name: 'SolverDeregistered',
    type: 'event',
    anonymous: false,
    inputs: [{ name: 'solver', type: 'address', indexed: true }],
  },
  {
    name: 'BondIncreased',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'solver', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'UnbondRequested',
    type: 'event',
    anonymous: false,
    inputs: [{ name: 'solver', type: 'address', indexed: true }],
  },
  {
    name: 'BondWithdrawn',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'solver', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'SolverSlashed',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'solver', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'reason', type: 'string',  indexed: false },
    ],
  },
  {
    name: 'ReputationUpdated',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'solver',        type: 'address', indexed: true },
      { name: 'newReputation', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'SettlementRecorded',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'solver',  type: 'address', indexed: true },
      { name: 'success', type: 'bool',   indexed: false },
    ],
  },
  {
    name: 'AuthorizedCallerSet',
    type: 'event',
    anonymous: false,
    inputs: [{ name: 'caller', type: 'address', indexed: true }],
  },
  {
    name: 'AuthorizedCallerChangeScheduled',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'caller',        type: 'address', indexed: true },
      { name: 'effectiveTime',  type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'OwnershipTransferred',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'previousOwner', type: 'address', indexed: true },
      { name: 'newOwner',     type: 'address', indexed: true },
    ],
  },
]

// ─── PriceOracle ───────────────────────────────────────────────────────────────

const PRICE_ORACLE_ABI = [
  {
    name: 'pyth',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'chainlinkFeeds',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'pythPriceIds',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'tokenDecimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'getLatestPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [
      { name: 'price',      type: 'uint256' },
      { name: 'confidence', type: 'uint256' },
      { name: 'timestamp',  type: 'uint256' },
      { name: 'source',    type: 'string'  },
    ],
  },
  {
    name: 'getPythPriceUnsafe',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [
      { name: 'price',      type: 'uint256' },
      { name: 'confidence', type: 'uint256' },
      { name: 'timestamp',  type: 'uint256' },
      { name: 'source',    type: 'string'  },
    ],
  },
  {
    name: 'getChainlinkPriceUnsafe',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [
      { name: 'price',      type: 'uint256' },
      { name: 'confidence', type: 'uint256' },
      { name: 'timestamp',  type: 'uint256' },
      { name: 'source',    type: 'string'  },
    ],
  },
  {
    name: 'validateClearingPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'base',           type: 'address'  },
      { name: 'quote',          type: 'address'  },
      { name: 'clearingPrice', type: 'uint256'  },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'STALENESS_THRESHOLD',
    type: 'function',
    stateMutability: 'pure',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'MAX_CONFIDENCE_BPS',
    type: 'function',
    stateMutability: 'pure',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'MAX_DEVIATION_BPS',
    type: 'function',
    stateMutability: 'pure',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // Admin
  {
    name: 'addPriceFeed',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token',         type: 'address' },
      { name: 'chainlinkFeed', type: 'address' },
      { name: 'pythPriceId',   type: 'bytes32' },
      { name: 'decimals',      type: 'uint8'   },
    ],
    outputs: [],
  },
  {
    name: 'updateFeed',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token',         type: 'address' },
      { name: 'chainlinkFeed', type: 'address' },
      { name: 'pythPriceId',   type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'updatePythPrice',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'priceUpdateData', type: 'bytes[]' },
      { name: 'token',         type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'transferOwnership',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'newOwner', type: 'address' }],
    outputs: [],
  },
  {
    name: 'acceptOwnership',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  // Events
  {
    name: 'PriceFeedAdded',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'token',          type: 'address', indexed: true  },
      { name: 'chainlinkFeed',  type: 'address', indexed: false },
      { name: 'pythPriceId',    type: 'bytes32',  indexed: false },
      { name: 'decimals',       type: 'uint8',    indexed: false },
    ],
  },
  {
    name: 'PriceFeedUpdated',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'token',         type: 'address', indexed: true  },
      { name: 'chainlinkFeed', type: 'address', indexed: false },
      { name: 'pythPriceId',   type: 'bytes32',  indexed: false },
    ],
  },
  {
    name: 'PriceUpdated',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'token',     type: 'address', indexed: true  },
      { name: 'price',     type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
      { name: 'source',   type: 'string',  indexed: false },
    ],
  },
  {
    name: 'OwnershipTransferred',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'previousOwner', type: 'address', indexed: true },
      { name: 'newOwner',     type: 'address', indexed: true },
    ],
  },
]

// ─── ERC20 ─────────────────────────────────────────────────────────────────────

const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'transferFrom', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
]

module.exports = {
  GHOSTLOCK_LIVENESS_ABI,
  BATCH_SETTLEMENT_ABI,
  EPOCH_RNG_ABI,
  SOLVER_BOARD_ABI,
  SOLVER_REGISTRY_ABI,
  PRICE_ORACLE_ABI,
  ERC20_ABI,
}
