"use client";
import { useAccount, useReadContract, useBlockNumber } from "wagmi";
import { GhostLockAbi, GhostLockAddress, statusFromUint } from "@/lib/contracts";
import { tryDecryptIntent, type IntentPayload } from "@/lib/blocklock";
import { useQuery } from "@tanstack/react-query";

export type UserIntent = {
  id: bigint;
  user: `0x${string}`;
  targetBlock: bigint;
  encrypted: `0x${string}`;
  status: "Pending" | "Ready" | "Settled";
  inclusionBlock: bigint;
  settlementPrice: bigint;
  decrypted?: IntentPayload | null;
};

type RawIntent = {
  id: bigint;
  user: `0x${string}`;
  targetBlock: bigint;
  encrypted: `0x${string}`;
  status: number;
  inclusionBlock: bigint;
  settlementPrice: bigint;
};

export function useUserIntents() {
  const { address } = useAccount();
  const { data: currentBlock } = useBlockNumber({ watch: true });

  const { data: intents, isLoading: isLoadingRead, error: errorRead } = useReadContract({
    abi: GhostLockAbi,
    address: GhostLockAddress,
    functionName: "getUserIntents",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 5000,
      select(data) {
        const arr = Array.from(data as ReadonlyArray<RawIntent>);
        return arr.map((t) => ({
          id: t.id,
          user: t.user,
          targetBlock: t.targetBlock,
          encrypted: t.encrypted,
          status: statusFromUint(Number(t.status)),
          inclusionBlock: t.inclusionBlock,
          settlementPrice: t.settlementPrice,
        })) as UserIntent[];
      },
    },
  });

  const decryptQ = useQuery({
    queryKey: ["intents-decrypted", address, intents, currentBlock],
    enabled: !!intents && typeof currentBlock === "bigint",
    queryFn: async () => {
      const list = (intents as UserIntent[]) ?? [];
      const results = await Promise.all(
        list.map(async (it: UserIntent) => ({
          ...it,
          decrypted: await tryDecryptIntent(it.encrypted, currentBlock as bigint),
        }))
      );
      return results as UserIntent[];
    },
    refetchInterval: 5000,
  });

  return {
    isLoading: isLoadingRead || decryptQ.isLoading,
    error: errorRead || decryptQ.error,
    data: decryptQ.data ?? intents ?? [],
  };
}
