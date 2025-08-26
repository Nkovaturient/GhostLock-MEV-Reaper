"use client";
import { useQuery } from "@tanstack/react-query";
import { SOLVER_API_URL } from "@/lib/networkConfig";
import type { Auction } from "@/components/AuctionTable";

export function useAuctions() {
  return useQuery<Auction[]>({
    queryKey: ["auctions"],
    queryFn: async () => {
      const res = await fetch(SOLVER_API_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch auctions");
      const data = (await res.json()) as Auction[];
      return data;
    },
    refetchInterval: 5000,
  });
}
