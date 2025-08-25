"use client";
import { useUserIntents } from "@/hooks/useUserIntents";
import StatusBadge from "@/components/StatusBadge";

export default function DashboardPage() {
  const { data, isLoading, error } = useUserIntents();

  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="text-2xl font-semibold mb-4">Your Intents</h1>
      {isLoading ? <div>Loading…</div> : null}
      {error ? <div className="text-red-600">{String(error)}</div> : null}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/15 text-xs uppercase">
              <th className="py-2 pr-4">ID</th>
              <th className="py-2 pr-4">Target Block</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Inclusion</th>
              <th className="py-2 pr-4">Settlement Price</th>
              <th className="py-2 pr-4">Decrypted</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((it) => (
              <tr key={String(it.id)} className="border-b border-black/5 dark:border-white/10">
                <td className="py-2 pr-4 font-mono">{String(it.id)}</td>
                <td className="py-2 pr-4">{String(it.targetBlock)}</td>
                <td className="py-2 pr-4"><StatusBadge status={it.status} /></td>
                <td className="py-2 pr-4">{it.inclusionBlock ? String(it.inclusionBlock) : "—"}</td>
                <td className="py-2 pr-4">{it.settlementPrice ? String(it.settlementPrice) : "—"}</td>
                <td className="py-2 pr-4 text-xs font-mono whitespace-pre-wrap">
                  {it.decrypted ? JSON.stringify(it.decrypted) : "(sealed)"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
