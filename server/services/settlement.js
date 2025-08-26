//settlement--continue modifications

import { ethers } from "ethers";
import SettlementAbi from "../abi/GhostLockBatchSettlement.json"; //contract ABI path

export async function settleBatchTx(signer, settlementAddr, requestIds, epoch, marketId, clearingPrice) {
  const c = new ethers.Contract(settlementAddr, SettlementAbi, signer);
  const tx = await c.settleBatch(
    requestIds,
    epoch,
    marketId,
    clearingPrice,
    { gasLimit: 8_000_000 } // tune for your chain
  );
  return tx.wait();
}
