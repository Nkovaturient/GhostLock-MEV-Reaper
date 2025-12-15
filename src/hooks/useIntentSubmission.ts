import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { ethers, Signer } from 'ethers'
import { BlocklockService, type IntentPayload } from '../lib/blocklock-service'
import { GHOSTLOCK_INTENTS_ABI } from '../lib/abis'
import { useToast } from '../stores/toastStore'
import { useEthersSigner } from './useEthers'
import { useQueryClient } from '@tanstack/react-query'
import { addRequestId } from '../stores/requestIdStore'
import { useNetworkConfig } from './useNetworkConfig'
import { useSharedBlockNumber } from './useSharedBlockNumber'

export function useIntentSubmission() {
  const queryClient = useQueryClient()
  const { address, chainId: connectedChainId } = useAccount()
  const { CONTRACT_ADDRESS, chainId: networkChainId, isSupported } = useNetworkConfig()
  
  // Use connected chain ID, fallback to network config chain ID
  const chainId = connectedChainId ? Number(connectedChainId) : (networkChainId ? Number(networkChainId) : undefined)
  
  // Use shared block number to avoid duplicate RPC calls
  const { blockNumber, isLoading: isLoadingBlockNumber } = useSharedBlockNumber()
  
  const { writeContractAsync } = useWriteContract()
  const { success, error } = useToast()
  const signer = useEthersSigner({ chainId })
  
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
  useEffect(() => {
    if (receipt && !lastRequestId && lastTxHash && chainId) {
      const requestId = extractRequestId(receipt)
      if (requestId) {
        setLastRequestId(requestId)
        if (address) {
          try { 
            addRequestId(chainId, address, requestId) 
            console.log(`[IntentSubmission] Stored request ID ${requestId} for user ${address} on chain ${chainId}`)
          } catch (e) {
            console.error('[IntentSubmission] Failed to store request ID:', e)
          }
        }
        // Trigger refresh of UserIntents table to show the new intent
        queryClient.invalidateQueries({ queryKey: ['intents-transformed'] })
        queryClient.invalidateQueries({ queryKey: ['intents-raw'] })
        queryClient.invalidateQueries({ queryKey: ['lastRequestId'] })
      }
    }
  }, [receipt, lastRequestId, lastTxHash, address, chainId, queryClient])

  const submitIntent = async (payload: Omit<IntentPayload, 'user' | 'epoch'> & { targetBlock: number }) => {
    if (!address) {
      throw new Error('Wallet not connected')
    }

    if (!chainId) {
      throw new Error('Chain ID not available. Please connect your wallet and ensure you are on a supported network.')
    }

    if (!isSupported) {
      throw new Error(`Chain ${chainId} is not supported. Please switch to Base Sepolia (84532) or Arbitrum One (42161).`)
    }

    if (!CONTRACT_ADDRESS) {
      throw new Error(`Contract address not configured for chain ${chainId}`)
    }

    if (!signer) {
      throw new Error('Signer not available')
    }

    // Get block number - try useBlockNumber first, fallback to provider
    let currentBlock: number
    if (blockNumber) {
      currentBlock = Number(blockNumber)
    } else if (signer.provider) {
      // Fallback: fetch directly from provider
      try {
        currentBlock = await signer.provider.getBlockNumber()
      } catch (providerError) {
        console.error('Failed to fetch block number from provider:', providerError)
        throw new Error('Block number not available. Please ensure you are connected to the correct network and try again.')
      }
    } else {
      throw new Error('Block number not available. Please ensure you are connected to the correct network.')
    }
    
    // Validate target block is in the future
    if (payload.targetBlock <= currentBlock) {
      throw new Error(`Target block (${payload.targetBlock}) must be greater than current block (${currentBlock})`)
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

      const blocklockService = new BlocklockService(signer, chainId)
      const ciphertextStruct = await blocklockService.encryptIntent(completePayload, payload.targetBlock)
      
      // Create condition for the unlock block (blocklock condition)
      const condition = BlocklockService.createCondition(payload.targetBlock)

      const hash = await writeContractAsync({
        chainId: chainId,
        abi: GHOSTLOCK_INTENTS_ABI,
        address: CONTRACT_ADDRESS as `0x${string}`,
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