export type Auction = {
  id: string;
  market: string;
  clearingPrice: string;
  intents: number;
  settlementBlock: number;
  aiPrice?: string;
};

export default function AuctionTable({ auctions }: { auctions: Auction[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-black/10 dark:border-white/15 text-xs uppercase">
            <th className="py-2 pr-4">Auction ID</th>
            <th className="py-2 pr-4">Market</th>
            <th className="py-2 pr-4">Clearing Price</th>
            <th className="py-2 pr-4">AI Price</th>
            <th className="py-2 pr-4">Intents</th>
            <th className="py-2 pr-4">Settlement Block</th>
          </tr>
        </thead>
        <tbody>
          {auctions.map((a) => (
            <tr key={a.id} className="border-b border-black/5 dark:border-white/10">
              <td className="py-2 pr-4 font-mono">{a.id}</td>
              <td className="py-2 pr-4">{a.market}</td>
              <td className="py-2 pr-4 font-mono">{a.clearingPrice}</td>
              <td className="py-2 pr-4 font-mono opacity-80">{a.aiPrice ?? "—"}</td>
              <td className="py-2 pr-4">{a.intents}</td>
              <td className="py-2 pr-4">{a.settlementBlock}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
