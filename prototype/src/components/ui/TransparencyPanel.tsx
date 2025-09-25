import React from "react";

type Props = {
  gasEstimate: number | null;
  slippage: number | null;
  unlockBlock: number | null;
  decryptionETA: number | null; // seconds
  avgBlockTime?: number;
  inclusionSec?: number;
};

export default function TransparencyPanel({ gasEstimate, slippage, unlockBlock, decryptionETA, avgBlockTime, inclusionSec }: Props) {
  return (
    <div className="glass-effect p-4 rounded-lg text-sm">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-ghost-300 text-xs">Estimated gas</div>
          <div className="font-medium">{gasEstimate ? `${gasEstimate} ETH` : "—"}</div>
        </div>
        <div>
          <div className="text-ghost-300 text-xs">Estimated slippage</div>
          <div className="font-medium">{slippage !== null ? `${(slippage * 100).toFixed(2)}%` : "—"}</div>
        </div>

        <div>
          <div className="text-ghost-300 text-xs">Unlock block</div>
          <div className="font-medium">{unlockBlock ?? "—"}</div>
        </div>
        <div>
          <div className="text-ghost-300 text-xs">Decryption ETA</div>
          <div className="font-medium">{decryptionETA ? `${Math.round(decryptionETA)} s` : "—"}</div>
        </div>
      </div>

      <div className="mt-3 text-xs text-ghost-400">
        Values are estimates based on live chain data. Decryption & settlement are triggered at epoch boundaries — final timing depends on network conditions and epoch configuration.
      </div>
    </div>
  );
}
