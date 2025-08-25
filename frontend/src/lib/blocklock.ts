async function getBlocklock() {
  const mod: unknown = await import("blocklock-js");
  const anyMod = mod as { default?: unknown } & Record<string, unknown>;
  return (anyMod?.default as Record<string, unknown>) ?? (anyMod as Record<string, unknown>);
}

export type IntentPayload = {
  market: string;
  side: "buy" | "sell";
  amount: string;
  slippageBps: number;
  targetBlock: bigint;
};

export async function encryptIntent(payload: IntentPayload): Promise<`0x${string}`> {
  const { targetBlock, ...rest } = payload;
  const plaintext = new TextEncoder().encode(JSON.stringify(rest));
  const bl = (await getBlocklock()) as Record<string, unknown>;
  type EncryptFn = (args: {
    condition: { type: string; block: bigint };
    plaintext: Uint8Array;
  }) => Promise<{ ciphertext?: string } | string>;
  const fn = (bl.encrypt ?? bl.seal ?? bl.encryptPayload) as EncryptFn | undefined;
  if (!fn) {
    throw new Error("blocklock-js: encrypt function not available");
  }
  const result = await fn({
    condition: { type: "block-gte", block: targetBlock },
    plaintext,
  });
  let ct: unknown;
  if (typeof result === "string") {
    ct = result;
  } else if (typeof result === "object" && result !== null) {
    const maybe = (result as { ciphertext?: unknown }).ciphertext;
    if (typeof maybe === "string") ct = maybe;
  }
  if (typeof ct !== "string" || !ct.startsWith("0x")) {
    throw new Error("blocklock-js: invalid ciphertext format");
  }
  return ct as `0x${string}`;
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
