import { useState } from 'react'
import { useAccount, useBlockNumber, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { ethers } from 'ethers'
import { BlocklockService, type IntentPayload } from '@/lib/blocklock-service'
import { GHOSTLOCK_INTENTS_ABI } from '@/lib/abis'
import { CONFIG } from '@/lib/config'
import { useToast } from '@/stores/toastStore'
import { useEthersSigner } from './useEthers'

export function useIntentSubmission() {
  const { address } = useAccount()
  const { data: blockNumber } = useBlockNumber({ watch: true })
  const { writeContractAsync } = useWriteContract()
  const { success, error } = useToast()
  const signer = useEthersSigner()
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastTxHash, setLastTxHash] = useState<string | null>(null)

  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: lastTxHash as `0x${string}` | undefined,
  })

  const submitIntent = async (payload: Omit<IntentPayload, 'user' | 'epoch'> & { targetBlock: number }) => {
    if (!address || !signer) {
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

      // Initialize blocklock service
      const blocklockService = new BlocklockService(signer, CONFIG.CHAIN_ID)
      
      // Encrypt the intent
      const encryptedData = await blocklockService.encryptIntent(completePayload, payload.targetBlock)
      
      // Create condition for the unlock block
      const condition = BlocklockService.createCondition(payload.targetBlock)
      
      // Prepare ciphertext structure for contract
      const ciphertextStruct = {
        data: encryptedData,
        commitment: ethers.keccak256(encryptedData)
      }

      // Submit to contract
      const hash = await writeContractAsync({
        abi: GHOSTLOCK_INTENTS_ABI,
        address: CONFIG.CONTRACTS.GHOSTLOCK_INTENTS as `0x${string}`,
        functionName: 'submitEncryptedIntentWithDirectFunding',
        args: [
          200000, // callbackGasLimit
          payload.targetBlock,
          condition as `0x${string}`,
          ciphertextStruct
        ],
        value: ethers.parseEther('0.01') // Funding for callback
      })

      setLastTxHash(hash)
      
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
    isSubmitting: isSubmitting || isConfirming,
    lastTxHash,
    receipt
  }
}