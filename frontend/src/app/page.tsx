export default function Home() {
  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-3xl font-semibold mb-3">GhostLock: MEV Reaper</h1>
      <p className="opacity-80 mb-8">
        Privacy-preserving intents with VRF ordering and batch auctions on Base Sepolia.
      </p>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <a className="underline" href="/submit-intent">Submit Intent</a>
        </li>
        <li>
          <a className="underline" href="/dashboard">Dashboard</a>
        </li>
        <li>
          <a className="underline" href="/auction-explorer">Auction Explorer</a>
        </li>
      </ul>
    </div>
  );
}
