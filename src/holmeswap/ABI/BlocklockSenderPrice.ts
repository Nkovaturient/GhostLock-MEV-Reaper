/**
 * BlocklockSender on Arbitrum Sepolia is an ERC-1967 proxy. You call the proxy:
 * https://docs.dcipher.network/networks/blocklock/ → 0xd22302849a87d5B00f13e504581BC086300DA080
 *
 * Arbiscan “Contract” ABI for that address is the proxy (getImplementation, fallback).
 * Viem still needs the *implementation* function shapes below so readContract can encode
 * calculateRequestPriceNative / getConfig; the proxy delegatecalls to the implementation.
 *
 * (HolmeSwap reads blocklock via GhostLockLiveness.blocklock() — same proxy address.)
 */

export const BlocklockSenderPriceABI = [
  {
    inputs: [
      { internalType: 'uint32', name: '_callbackGasLimit', type: 'uint32' },
    ],
    name: 'calculateRequestPriceNative',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getConfig',
    outputs: [
      { internalType: 'uint32', name: 'maxGasLimit', type: 'uint32' },
      { internalType: 'uint32', name: 'gasAfterPaymentCalculation', type: 'uint32' },
      { internalType: 'uint32', name: 'fulfillmentFlatFeeNativePPM', type: 'uint32' },
      { internalType: 'uint32', name: 'weiPerUnitGas', type: 'uint32' },
      { internalType: 'uint32', name: 'blsPairingCheckOverhead', type: 'uint32' },
      { internalType: 'uint8', name: 'nativePremiumPercentage', type: 'uint8' },
      { internalType: 'uint32', name: 'gasForCallExactCheck', type: 'uint32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const

/** ERC-1967 proxy only — use if you need getImplementation; not sufficient for readContract fee/config. */
export const BlocklockSenderProxyABI = [
  {
    inputs: [
      { internalType: 'address', name: '_implementation', type: 'address' },
      { internalType: 'bytes', name: '_data', type: 'bytes' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [{ internalType: 'address', name: 'target', type: 'address' }],
    name: 'AddressEmptyCode',
    type: 'error',
  },
  {
    inputs: [{ internalType: 'address', name: 'implementation', type: 'address' }],
    name: 'ERC1967InvalidImplementation',
    type: 'error',
  },
  { inputs: [], name: 'ERC1967NonPayable', type: 'error' },
  { inputs: [], name: 'FailedCall', type: 'error' },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: 'address', name: 'implementation', type: 'address' }],
    name: 'Upgraded',
    type: 'event',
  },
  { stateMutability: 'payable', type: 'fallback' },
  {
    inputs: [],
    name: 'getImplementation',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

export const CIPHERTEXT_ABI = {
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
} as const

export const INTENT_PAYLOAD_ABI = {
  type: 'tuple',
  components: [
    { name: 'requestId', type: 'uint256' },
    { name: 'plaintext', type: 'bytes' },
  ],
} as const

export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'transferFrom',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const
