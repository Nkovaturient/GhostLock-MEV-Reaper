// // In prototype/src/hooks/useContract.ts
// import { useAccount } from 'wagmi'
// import { CONFIG, NETWORKS } from '../lib/config'
// import { useReadContract, useWriteContract } from 'wagmi'
// import { useMemo } from 'react'
// import { Address, erc20Abi } from 'viem'

// export function useNetworkConfig() {
//   const chainId
//   return useMemo(() => {
//     if (!chainId) return CONFIG // Default to Base Sepolia
//     return Object.values(NETWORKS).find(n => n.chainId === chain.id) || CONFIG
//   }, [chainId])
// }

// export function useTokenContract(tokenAddress?: string) {
//   const { address } = useAccount()
//   const network = useNetworkConfig()

//   const { data: balance, refetch: refetchBalance } = useReadContract({
//     address: tokenAddress as `0x${string}`,
//     abi: erc20Abi,
//     functionName: 'balanceOf',
//     args: [address as `0x${string}`],
//     enabled: !!address && !!tokenAddress,
//     chainId: network.chainId,
//   })

//   const { write: approve, isPending: isApproving } = useWriteContract({
//     address: tokenAddress as `0x${string}`,
//     abi: erc20Abi,
//     functionName: 'approve',
//   })

//   return {
//     balance,
//     refetchBalance,
//     approve,
//     isApproving,
//   }
// }

// export function useGhostLockContract() {
//   const network = useNetworkConfig()
  
//   const { data: lastRequestId, refetch: refetchLastRequestId } = useReadContract({
//     address: network.contracts.GHOSTLOCK_INTENTS as `0x${string}`,
//     abi: [
//       {
//         inputs: [],
//         name: 'lastRequestId',
//         outputs: [{ name: '', type: 'uint256' }],
//         stateMutability: 'view',
//         type: 'function',
//       },
//     ],
//     functionName: 'lastRequestId',
//     chainId: network.chainId,
//   })

//   // Add other contract interactions as needed

//   return {
//     lastRequestId,
//     refetchLastRequestId,
//     // Add other contract methods
//   }
// }