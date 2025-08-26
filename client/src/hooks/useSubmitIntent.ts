"use client";
import { useAccount, useBlockNumber, useWriteContract } from "wagmi";
import { GhostLockAbi, GhostLockAddress } from "@/lib/contracts";
import { encryptIntent, type IntentPayload } from "@/lib/blocklock";
import { useToast } from "@/components/ToastProvider";
import { ethers } from "ethers";
import { useEthersSigner } from "./useEthers";
import { Signer } from "ethers";

export function useSubmitIntent() {
  const { address } = useAccount();
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const { writeContractAsync } = useWriteContract();
  const { notify } = useToast();
  const chainId = 81532 ;
  const signer = useEthersSigner({chainId});

  const submit = async (payload: IntentPayload) => {
    if (!address) throw new Error("Wallet not connected");
    // ==== Ensure targetBlock is in the future
    const current = typeof blockNumber === "bigint" ? blockNumber : BigInt(blockNumber ?? 0);
    if (payload.targetBlock <= current) {
      throw new Error("Target block must be greater than current block");
    }

    const encrypted = await encryptIntent(payload, signer as Signer, chainId);
    const hash = await writeContractAsync({
      abi: GhostLockAbi,
      address: GhostLockAddress,
      functionName: "submitIntent",
      args: [encrypted],
    });

    notify({
      type: "info",
      title: "Intent submitted",
      description: `Tx: ${hash}`,
    });
    return hash;
  };

  return { submit };
}
