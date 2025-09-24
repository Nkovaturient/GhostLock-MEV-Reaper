import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, useWatchContractEvent } from "wagmi";
import { ethers } from "ethers";
import { GHOSTLOCK_INTENTS_ABI } from "../lib/abis";
import { useEthersProvider, useEthersSigner } from "./useEthers";
import { CONFIG } from "../lib/config";
import { useState } from "react";

export interface tempFig{
  id: number;
  requestedBy: string;
  encryptedAt: any;
  decryptedAt: any;
  message: string;
  ready: boolean;
}

export const useExplorer = (setActiveTab?: (tab: string) => void) => {
  const signer = useEthersSigner();
  const provider = useEthersProvider();
  const { chainId } = useAccount();
  const { address } = useAccount();
  const queryClient = useQueryClient();
  
  // Track the highest request ID we've seen from events
  const [highestRequestId, setHighestRequestId] = useState<number>(0);
  const contractAddress = CONFIG.CONTRACTS.GHOSTLOCK_INTENTS;
  
  if (!contractAddress) {
    console.error("GHOSTLOCK_INTENTS contract address not configured");
    return {
      data: [],
      isLoading: false,
      error: new Error("Contract address not configured"),
      refetch: () => {},
    };
  }
  
  // Listen for IntentSubmitted events to track new intents
  useWatchContractEvent({
    chainId: CONFIG.CHAIN_ID,
    abi: GHOSTLOCK_INTENTS_ABI,
    address: contractAddress as `0x${string}`,
    eventName: 'IntentSubmitted',
    onLogs: (logs) => {
      // Update the highest request ID when new intents are submitted
      logs.forEach(log => {
        const requestId = Number(log.args.requestId);
        if (requestId > highestRequestId) {
          setHighestRequestId(requestId);
        }
      });
      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ["userRequests"] });
      console.log('IntentSubmitted event received:', logs);
    },
  });

  // Listen for IntentReady events to know when decryption is complete
  useWatchContractEvent({
    chainId: CONFIG.CHAIN_ID,
    abi: GHOSTLOCK_INTENTS_ABI,
    address: contractAddress as `0x${string}`,
    eventName: 'IntentReady',
    onLogs: (logs) => {
      // Refresh the data when an intent is ready
      queryClient.invalidateQueries({ queryKey: ["userRequests"] });
      console.log('IntentReady event received:', logs);
    },
  });
  
  const getRequests = useQuery({
    queryKey: ["userRequests", chainId, address, contractAddress],
    queryFn: async () => {
      if (setActiveTab) setActiveTab("decrypt");
      try {
        if (!signer || !provider || !chainId || !address || !contractAddress) {
          return [];
        }

        const contract = new ethers.Contract(
          contractAddress,
          GHOSTLOCK_INTENTS_ABI,
          signer
        );
        
        // If we don't have any tracked request IDs yet, return empty
        if (highestRequestId === 0) {
          return [];
        }
        
        // Fetch the last 20 intents
        const startId = Math.max(1, highestRequestId - 19);
        console.log("Fetching intents from", startId, "to", highestRequestId);
        
        const temp: tempFig[] = [];
        for (let i = startId; i <= highestRequestId; i++) {
          try {
            const intent = await contract.intents(i);
            // Check if this intent belongs to the current user
            if (intent.requestedBy.toLowerCase() === address.toLowerCase()) {
              temp.push({
                id: i,
                requestedBy: intent.requestedBy,
                encryptedAt: intent.encryptedAt,
                decryptedAt: intent.decrypted && intent.decrypted !== '0x' ? intent.encryptedAt : null,
                message: intent.decrypted && intent.decrypted !== '0x' ? 'Decrypted' : 'Encrypted',
                ready: intent.ready || false,
              });
            }
          } catch (error) {
            console.error(`Error fetching intent ${i}:`, error);
            continue;
          }
        }
        return temp;
      } catch (error) {
        console.error("Error fetching requests:", error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!signer && !!provider && !!chainId && !!address && !!contractAddress && highestRequestId > 0,
  });

  return getRequests;
};
