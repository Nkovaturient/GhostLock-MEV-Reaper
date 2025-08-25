"use client";
import { useAccount, useBlockNumber, useWriteContract } from "wagmi";
import { GhostLockAbi, GhostLockAddress } from "@/lib/contracts";
import { encryptIntent, type IntentPayload } from "@/lib/blocklock";
import { useToast } from "@/components/ToastProvider";

export function useSubmitIntent() {
  const { address } = useAccount();
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const { writeContractAsync } = useWriteContract();
  const { notify } = useToast();

  const submit = async (payload: IntentPayload) => {
    if (!address) throw new Error("Wallet not connected");
    // ==== Ensure targetBlock is in the future
    const current = blockNumber ?? 0n;
    if (payload.targetBlock <= current) {
      throw new Error("Target block must be greater than current block");
    }

    const encrypted = await encryptIntent(payload);
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
