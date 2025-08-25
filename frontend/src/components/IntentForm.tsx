"use client";
import { useState } from "react";
import { useBlockNumber } from "wagmi";
import { useSubmitIntent } from "@/hooks/useSubmitIntent";
import type { IntentPayload } from "@/lib/blocklock";

export default function IntentForm() {
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const { submit } = useSubmitIntent();

  const [market, setMarket] = useState("ETH/USDC");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("0.1");
  const [slippageBps, setSlippageBps] = useState(50);
  const [targetOffset, setTargetOffset] = useState(20); // blocks from now
  const [isSubmitting, setSubmitting] = useState(false);
  const [tx, setTx] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof blockNumber !== "bigint") return;
    setSubmitting(true);
    try {
  const payload: IntentPayload = {
        market,
        side,
        amount,
        slippageBps,
        targetBlock: blockNumber + BigInt(targetOffset),
  };
  const hash = await submit(payload);
      setTx(hash as string);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm opacity-80">Market</span>
          <select
            className="rounded-md border border-black/10 dark:border-white/15 bg-background px-3 py-2"
            value={market}
            onChange={(e) => setMarket(e.target.value)}
          >
            <option>ETH/USDC</option>
            <option>WBTC/USDC</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm opacity-80">Side</span>
          <select
            className="rounded-md border border-black/10 dark:border-white/15 bg-background px-3 py-2"
            value={side}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setSide(e.target.value === "sell" ? "sell" : "buy")
            }
          >
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm opacity-80">Amount</span>
          <input
            type="text"
            inputMode="decimal"
            className="rounded-md border border-black/10 dark:border-white/15 bg-background px-3 py-2"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm opacity-80">Slippage (bps)</span>
          <input
            type="number"
            className="rounded-md border border-black/10 dark:border-white/15 bg-background px-3 py-2"
            value={slippageBps}
            onChange={(e) => setSlippageBps(Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm opacity-80">Target Offset (blocks)</span>
          <input
            type="number"
            className="rounded-md border border-black/10 dark:border-white/15 bg-background px-3 py-2"
            value={targetOffset}
            onChange={(e) => setTargetOffset(Number(e.target.value))}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-foreground text-background px-4 py-2 disabled:opacity-60"
      >
        {isSubmitting ? "Submitting…" : "Submit Intent"}
      </button>

      {tx && (
        <div className="text-sm opacity-80">
          Submitted. Tx: <span className="font-mono">{tx}</span>
        </div>
      )}
    </form>
  );
}
