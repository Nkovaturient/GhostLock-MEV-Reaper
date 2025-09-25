import React, { useEffect, useState } from "react";
import { useEthersProvider } from "../../../../src/hooks/useEthers";
import {  computeSafetyMarginBlocks, alignToEpoch } from "./chain-utils";
import TransparencyPanel from "../ui/TransparencyPanel";
import { getSwapQuote } from "./dex-quote";
import Button from "../../../../src/components/ui/Button";
import { CHAIN_IDS } from "./token-list";
import { ethers } from "ethers";

type TokenSelect = { symbol: string; address?: string; decimals?: number };

export default function DynamicIntentForm() {
  const provider = useEthersProvider();
  const [fromToken, _setFromToken] = useState<TokenSelect>({ symbol: "ETH" });
  const [toToken, _setToToken] = useState<TokenSelect>({ symbol: "USDC" });
  const [amount, setAmount] = useState<string>("0.01");
  const [network, setNetwork] = useState<string>("base-sepolia");
  const [avgBlockTime, setAvgBlockTime] = useState<number>(12);
  const [inclusionSec, setInclusionSec] = useState<number>(20);
  const [_safetyBlocks, setSafetyBlocks] = useState<number>(4);
  const [unlockBlock, setUnlockBlock] = useState<number>(0);
  const [estimatedReceiveAmt, setEstimatedReceiveAmount] = useState<string | null>(null);
  const [decryptionETA, setDecryptionETA] = useState<number>(0);
  const [slippage, setSlippage] = useState<number | null>(null);
  const [gasEstimate, setGasEstimate] = useState<number | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // recompute on user amount or network change
  useEffect(() => {
    let cancelled = false;
    async function compute() {
      setLoadingPreview(true);
      try {
        const avgBt = 2;
        if (cancelled) return;
        setAvgBlockTime(avgBt);

        const incl = avgBt + 16; //
        if (cancelled) return;
        setInclusionSec(incl);

        const safety = computeSafetyMarginBlocks(incl, avgBt, 2);
        setSafetyBlocks(safety);

        if (!provider) {
          setUnlockBlock(0);
          return;
        }

        const currentBlock = await provider.getBlockNumber();
        let unlock = currentBlock + safety;
        unlock = alignToEpoch(unlock, 12);
        setUnlockBlock(unlock);

        setDecryptionETA(Math.round((unlock - currentBlock) * avgBt));

        // get swap quote (your function must return slippage and gasEstimate)
        try {
            const quote = await getSwapQuote(CHAIN_IDS.BASE_SEPOLIA, fromToken.symbol, toToken.symbol, amount);
            if (!cancelled) {
              setSlippage(quote.slippageEstimate);
              setGasEstimate(quote.estimatedGas ? Number(ethers.formatUnits(quote.estimatedGas || 0, "gwei")) : null); // optional conversion
              setEstimatedReceiveAmount(quote.toTokenAmountHuman);
            }
          } catch (qerr) {
            console.warn("quote fetch failed", qerr);
            if (!cancelled) {
              setSlippage(null);
              setGasEstimate(null);
              setEstimatedReceiveAmount('');
            }
          }
      } catch (err) {
        console.error("EnhancedIntentForm compute error", err);
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    }
    compute();
    return () => { cancelled = true; };
  }, [amount, fromToken, toToken, provider, network]);

  async function onSwapClicked() {
    // First step: show confirmation modal (UI) — then submit encrypted intent & on-chain call
    // We'll only implement a demo flow: call a submitIntent function in your SDK
    try {
      // show the confirm modal (you implement)
      console.log("Submitting intent: ", { fromToken, toToken, amount, unlockBlock });
      // TODO: call blocklock + contract submit flow
      // await submitEncryptedIntent({ fromToken, toToken, amount, unlockBlock });
      alert("This demo triggers the encrypted submit flow (implement submitEncryptedIntent).");
    } catch (e) {
      console.error("submit failed", e);
      alert("Submit failed: " + String(e));
    }
  }

  return (
    <div className="max-w-xl mx-auto p-4">
      <div className="glass-effect rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Swap</h3>
          <div>
            <select value={network} onChange={(e) => setNetwork(e.target.value)} className="bg-transparent">
              <option value="base-sepolia">Base Sepolia</option>
              <option value="base-mainnet">Base Mainnet</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-ghost-400">From</label>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-3 bg-ghost-800 rounded-md" />
              <div className="mt-2 text-sm text-ghost-300">{fromToken.symbol}</div>
            </div>
            <div className="w-28 flex flex-col justify-center items-center">
              <button className="rounded-full p-2 bg-primary-500 text-white">⇅</button>
            </div>
            <div className="flex-1">
              <label className="text-xs text-ghost-400">To</label>
              <input value={estimatedReceiveAmt ?? ""} readOnly className="w-full p-3 bg-ghost-900 rounded-md" placeholder="Estimated" />
              <div className="mt-2 text-sm text-ghost-300">{toToken.symbol}</div>
            </div>
          </div>

          <div className="mt-2">
            <Button onClick={onSwapClicked} size="lg" className="w-full" disabled={loadingPreview}>
              {loadingPreview ? "Calculating..." : "Swap"}
            </Button>
          </div>

          <div className="mt-4">
            <TransparencyPanel
              gasEstimate={gasEstimate}
              slippage={slippage}
              unlockBlock={unlockBlock}
              decryptionETA={decryptionETA}
              avgBlockTime={avgBlockTime}
              inclusionSec={inclusionSec}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
