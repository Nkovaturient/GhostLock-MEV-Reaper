declare module "blocklock-js" {
  export function encrypt(args: {
    condition: { type: "block-gte"; block: bigint };
    plaintext: Uint8Array;
  }): Promise<{ ciphertext: `0x${string}` }>

  export function decrypt(args: {
    ciphertext: `0x${string}`;
    currentBlock: bigint;
  }): Promise<{
    plaintext: Uint8Array;
    condition: { type: "block-gte"; block: bigint };
  }>;
}
