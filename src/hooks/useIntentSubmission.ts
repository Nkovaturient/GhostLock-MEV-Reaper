import { useState } from 'react'
import { useAccount, useBlockNumber, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { ethers, Signer } from 'ethers'
import { BlocklockService, type IntentPayload } from '@/lib/blocklock-service'
import { GHOSTLOCK_INTENTS_ABI } from '@/lib/abis'
import { CONFIG } from '@/lib/config'
import { useToast } from '@/stores/toastStore'
import { useEthersSigner } from './useEthers'
import { useQueryClient } from '@tanstack/react-query'
import { addRequestId } from '@/stores/requestIdStore'

export function useIntentSubmission() {
  const queryClient = useQueryClient()
  const { address } = useAccount()
  const { data: blockNumber } = useBlockNumber({ watch: true })
  const { writeContractAsync } = useWriteContract()
  const { success, error } = useToast()
  const chainId = CONFIG.CHAIN_ID;
  const signer = useEthersSigner({chainId})
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastTxHash, setLastTxHash] = useState<string | null>(null)
  const [lastRequestId, setLastRequestId] = useState<number | null>(null)

  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: lastTxHash as `0x${string}` | undefined,
  })

  // Extract requestId from transaction receipt when available
  const extractRequestId = (receipt: any) => {
    if (!receipt?.logs) return null
    
    const iface = new ethers.Interface(GHOSTLOCK_INTENTS_ABI)
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log)
        if (parsed?.name === 'IntentSubmitted') {
          return Number(parsed.args.requestId)
        }
      } catch (e) {
        console.log(`Couldnt fetch RequestID`)
      }
    }
    return null
  }

  // Update requestId when receipt is available and trigger table refresh
  if (receipt && !lastRequestId) {
    const requestId = extractRequestId(receipt)
    if (requestId) {
      setLastRequestId(requestId)
      if (address) {
        try { addRequestId(chainId, address, requestId) } catch {}
      }
      // Trigger refresh of UserIntents table to show the new intent
      queryClient.invalidateQueries({ queryKey: ['intents-transformed'] })
      queryClient.invalidateQueries({ queryKey: ['lastRequestId'] })
    }
}

  const submitIntent = async (payload: Omit<IntentPayload, 'user' | 'epoch'> & { targetBlock: number }) => {
    if (!address) {
      throw new Error('Wallet not connected')
    }

    if (!blockNumber) {
      throw new Error('Block number not available')
    }

    const currentBlock = Number(blockNumber)
    
    // Validate target block is in the future
    if (payload.targetBlock <= currentBlock) {
      throw new Error('Target block must be greater than current block')
    }

    setIsSubmitting(true)
    
    try {
      // Calculate epoch for the target block
      const epoch = BlocklockService.getTargetEpoch(payload.targetBlock)
      
      // Create complete payload with user and epoch
      const completePayload: IntentPayload = {
        ...payload,
        user: address,
        epoch
      }

      const blocklockService = new BlocklockService(signer as Signer, chainId)
      const ciphertextStruct = await blocklockService.encryptIntent(completePayload, payload.targetBlock)
      
      // Create condition for the unlock block (blocklock condition)
      const condition = BlocklockService.createCondition(payload.targetBlock)

      // 1) Simulate to fetch dynamic price. Prefer value: 0; on revert, retry with a small placeholder value.
      // let quotedPrice: bigint | null = null
      // try {
      //   const contract = new ethers.Contract(
      //     CONFIG.CONTRACTS.GHOSTLOCK_INTENTS as string,
      //     GHOSTLOCK_INTENTS_ABI as any,
      //     (signer as Signer)
      //   )
      //   const result0 = await contract.submitEncryptedIntentWithDirectFunding.staticCall(
      //     700000,
      //     payload.targetBlock,
      //     condition,
      //     ciphertextStruct,
      //     { value: 0n }
      //   )
      //   // Expecting tuple [requestId, price]
      //   if (Array.isArray(result0) && result0.length >= 2) {
      //     quotedPrice = BigInt(result0[1])
      //   }
      // } catch {
      //   try {
      //     const contract = new ethers.Contract(
      //       CONFIG.CONTRACTS.GHOSTLOCK_INTENTS as string,
      //       GHOSTLOCK_INTENTS_ABI as any,
      //       (signer as Signer)
      //     )
      //     const result = await contract.submitEncryptedIntentWithDirectFunding.staticCall(
      //       700000,
      //       payload.targetBlock,
      //       condition,
      //       ciphertextStruct,
      //       { value: ethers.parseEther('0.1') }
      //     )
      //     if (Array.isArray(result) && result.length >= 2) {
      //       quotedPrice = BigInt(result[1])
      //     }
      //   } catch (e) {
      //     console.error('Simulation failed:', e)
      //   }
      // }

      // if (!quotedPrice || quotedPrice <= 0n) {
      //   throw new Error('Failed to quote blocklock price')
      // }

      // 2) Send the real write with exact quoted price
      const hash = await writeContractAsync({
        chainId: chainId,
        abi: GHOSTLOCK_INTENTS_ABI,
        address: CONFIG.CONTRACTS.GHOSTLOCK_INTENTS as `0x${string}`,
        functionName: 'submitEncryptedIntentWithDirectFunding',
        args: [
          700000, // callbackGasLimit - sufficient for blocklock callback
          payload.targetBlock,
          condition as `0x${string}`,
          ciphertextStruct as any
        ],
        value: ethers.parseEther('0.001') // Funding for callback
      })

      setLastTxHash(hash)
      setLastRequestId(null)
      
      success(
        'Intent Submitted Successfully',
        `Your ${payload.side} order has been encrypted and submitted. Transaction: ${hash.slice(0, 10)}...`
      )
      
      return hash
    } catch (err) {
      console.error('Intent submission error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      error('Failed to Submit Intent', errorMessage)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    submitIntent,
    isSubmitting,
    isConfirming,
    lastTxHash,
    lastRequestId,
    receipt
  }
}