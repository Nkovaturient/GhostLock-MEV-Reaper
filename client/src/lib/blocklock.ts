async function getBlocklock() {
    const mod: unknown = await import("blocklock-js");
    const anyMod = mod as { default?: unknown } & Record<string, unknown>;
    return (anyMod?.default as Record<string, unknown>) ?? (anyMod as Record<string, unknown>);
  }
import { Blocklock, encodeCiphertextToSolidity, encodeCondition } from "blocklock-js";
import { ethers } from "ethers";
  
  export type IntentPayload = {
    market: string;
    side: "buy" | "sell";
    amount: string;
    slippageBps: number;
    targetBlock: bigint;
  };
  
  export async function encryptIntent(
    payload: IntentPayload,
    signer: ethers.Signer,
    chainId: number
  ): Promise<`0x${string}`> {
    const { targetBlock, ...rest } = payload;
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const msgBytes = abiCoder.encode([
      "string",
      "string",
      "string",
      "uint256",
    ], [rest.market, rest.side, rest.amount, rest.slippageBps]);
    const encodedMessage = ethers.getBytes(msgBytes);
  
    // Create Blocklock instance
    const blocklockjs = Blocklock.createFromChainId(signer, chainId);
    const cipherMessage = await blocklockjs.encrypt(encodedMessage, targetBlock);
    let ciphertext: string;
    if (typeof cipherMessage === "string") {
      ciphertext = cipherMessage;
    } else if (cipherMessage instanceof Uint8Array) {
      ciphertext = ethers.hexlify(cipherMessage);
    } else {
      throw new Error("blocklock-js: invalid ciphertext output");
    }
    if (!ciphertext.startsWith("0x")) {
      throw new Error("blocklock-js: invalid ciphertext format");
    }
    return ciphertext as `0x${string}`;
  }
  
  export async function tryDecryptIntent(
    ciphertext: `0x${string}`,
    currentBlock: bigint
  ): Promise<IntentPayload | null> {
    try {
    const bl = (await getBlocklock()) as Record<string, unknown>;
    type DecryptOutput = { plaintext?: Uint8Array; condition?: { block?: bigint } } | Uint8Array | string;
    type DecryptFn = (args: { ciphertext: `0x${string}`; currentBlock: bigint }) => Promise<DecryptOutput>;
    const fn = (bl.decrypt ?? bl.open ?? bl.decryptPayload) as DecryptFn | undefined;
      if (!fn) return null;
      const out = await fn({ ciphertext, currentBlock });
      let bytes: Uint8Array | null = null;
      let revealedBlock: bigint | null = null;
  
      if (out instanceof Uint8Array) {
        bytes = out;
      } else if (typeof out === "string") {
        bytes = new TextEncoder().encode(out);
      } else if (out && typeof out === "object") {
        const obj = out as { plaintext?: unknown; condition?: { block?: unknown } };
        if (obj.plaintext instanceof Uint8Array) {
          bytes = obj.plaintext;
        } else if (typeof obj.plaintext === "string") {
          bytes = new TextEncoder().encode(obj.plaintext);
        }
        const maybeBlock = obj.condition?.block;
        if (typeof maybeBlock === "bigint") revealedBlock = maybeBlock;
        else if (typeof maybeBlock === "number") revealedBlock = BigInt(maybeBlock);
        else if (typeof maybeBlock === "string" && /^\d+$/.test(maybeBlock))
          revealedBlock = BigInt(maybeBlock);
      }
  
      if (!bytes) return null;
      const json = new TextDecoder().decode(bytes);
      const data = JSON.parse(json) as Omit<IntentPayload, "targetBlock">;
      return { ...data, targetBlock: revealedBlock ?? currentBlock };
    } catch {
      return null;
    }
  }
  