"use client";
import AuctionTable from "@/components/AuctionTable";
import { useAuctions } from "@/hooks/useAuctions";

export default function AuctionExplorerPage() {
  const { data, isLoading, error } = useAuctions();
  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="text-2xl font-semibold mb-4">Auction Explorer</h1>
      {isLoading ? <div>Loading…</div> : null}
      {error ? <div className="text-red-600">{String(error)}</div> : null}
      {data ? <AuctionTable auctions={data} /> : null}
    </div>
  );
}
