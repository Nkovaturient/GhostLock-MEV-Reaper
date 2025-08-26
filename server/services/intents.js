import { ethers } from "ethers";
import IntentAbi from "../abi/GhostLockIntents.json"; // abi path
import { DecodedIntent } from "../domain/types"; // needs setup as per intents specs

export async function fetchReadyIntents(
  provider, intentsAddr, requestIds) {
  const c = new ethers.Contract(intentsAddr, IntentAbi, provider);
  const out = [];
  for (const id of requestIds) {
    const res = await c.intents(id);
    const ready = res[4]; // ready
    if (!ready) continue;
    const decBytes = res[5]; // bytes decrypted
    const [user, side, amount, limitPrice, marketId, epoch] =
      ethers.AbiCoder.defaultAbiCoder().decode(
        ["address","uint8","uint256","uint256","uint8","uint256"],
        decBytes
      );
    out.push({
      id,
      dec: {
        user,
        side: Number(side),
        amount: BigInt(amount),
        limitPrice: BigInt(limitPrice),
        marketId: Number(marketId),
        epoch: BigInt(epoch)
      }
    });
  }
  return out;
}
