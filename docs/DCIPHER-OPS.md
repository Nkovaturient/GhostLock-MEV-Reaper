# dcipher / blocklock operations (GhostLock + HolmeSwap)

GhostLock encrypts swap intents with [blocklock-js](https://github.com/randa-mu/blocklock-js). Reveal is performed on-chain by [blocklock-agent](https://github.com/randa-mu/dcipher/tree/main/bin/blocklock-agent) calling `GhostLockLiveness`. Epoch ordering uses [randomness-agent](https://github.com/randa-mu/dcipher/tree/main/bin/randomness-agent) and `GhostLockEpochRNG`.

This repo does **not** run dcipher nodes. You deploy infrastructure contracts and operate agents separately, then point env vars at your addresses.

## 1. Committee (ADKG)

From a checkout of [dcipher](https://github.com/randa-mu/dcipher):

```bash
cargo build --release -p adkg-cli
adkg-cli new-scheme --app-name dcipher --scheme-out scheme.toml
# Each operator:
adkg-cli generate --scheme scheme.toml --priv-out longterm.priv --pub-out longterm.pub
# Coordinator builds group.toml (n, t, t_reconstruction, start_time, nodes[])
# All operators at start_time:
adkg-cli run --scheme scheme.toml --group group.toml --priv longterm.priv \
  --id <NODE_ID> --listen-address "/ip4/0.0.0.0/tcp/7777" \
  --transcript-out adkg.transcript --priv-out keyshare.priv --pub-out keyshare.pub
```

Build `committee.toml` for agents: map ADKG `node_pks` → `members[].bls_pk`, your share → `secret_key`, `signing_threshold = t_reconstruction + 1`. See `bin/blocklock-agent/README.md`.

Export the IBE public key for the frontend (`VITE_BLOCKLOCK_IBE_PUBLIC_KEY` in `.env`) as JSON:

```json
{"x":{"c0":"...","c1":"..."},"y":{"c0":"...","c1":"..."}}
```

Use `adkg-cli transmogrify` when converting keys for Solidity deploy scripts in blocklock-solidity.

## 2. Deploy infrastructure contracts (per chain)

Pin a release tag; do not fork unless required.

| Chain | Chain ID | Repos |
|-------|----------|--------|
| Arbitrum Sepolia | 421614 | [blocklock-solidity](https://github.com/randa-mu/blocklock-solidity), [randomness-solidity](https://github.com/randa-mu/randomness-solidity) |
| Arbitrum One | 42161 | Same, with mainnet sender addresses |

Record after deploy:

- BlocklockSender (proxy)
- DecryptionSender
- RandomnessSender
- Signature sender (randomness stack)

## 3. Deploy / wire GhostLock (this repo)

See [contracts/README.md](../contracts/README.md). Set in `contracts/.env`:

- `BLOCKLOCK_SENDER_ARB_SEPOLIA` / `RANDOMNESS_SENDER_ARB_SEPOLIA` (Sepolia)
- Use mainnet addresses in the same vars when deploying to 42161

```bash
cd contracts
forge script script/Deploy.s.sol:Deploy --rpc-url "$RPC_URL" --broadcast -vvvv
```

Copy printed addresses into `.env` / `VITE_ARBITRUM_*` (see [.env.example](../.env.example)).

Fund **GhostLockLiveness** and **GhostLockEpochRNG** with native ETH on each chain.

## 4. Run agents

**Blocklock** (fulfills decrypt → `_onBlocklockReceived`):

```bash
cargo run -p blocklock-agent --example blocklock -- \
  --committee-config ./committee.toml \
  --rpc-url wss://<arb-sepolia-wss> \
  --chain-id 421614 \
  --tx-private-key "$OPERATOR_TX_KEY" \
  --libp2p-key "$LIBP2P_KEY" \
  --blocklock-sender-addr "$BLOCKLOCK_SENDER" \
  --decryption-sender-addr "$DECRYPTION_SENDER"
```

**Randomness** (epoch seeds):

```bash
cargo run -p randomness-agent --example randomness -- \
  --committee-config ./committee.toml \
  --rpc-url wss://<arb-sepolia-wss> \
  --tx-private-key "$OPERATOR_TX_KEY" \
  --libp2p-key "$LIBP2P_KEY" \
  --signature-sender-addr "$SIG_SENDER" \
  --randomness-sender-addr "$RANDOMNESS_SENDER"
```

Run redundant instances; monitor health ports and agent logs.

## 5. Frontend / app env

| Variable | Purpose |
|----------|---------|
| `VITE_ARBITRUM_SEPOLIA_GHOSTLOCK_LIVENESS_ADDRESS` | HolmeSwap submit target |
| `VITE_BLOCKLOCK_IBE_PUBLIC_KEY` | Client encrypt (your committee) |
| `VITE_BLOCKLOCK_NETWORK_CHAIN_ID` | Optional: force blocklock-js profile (e.g. `421614` on wallet `42161`) |
| `VITE_BLOCKLOCK_SENDER_ARB_SEPOLIA` | Display / gas hints only |

Start app: `npm run dev` → `/holmeswap` on Arbitrum Sepolia.

## 6. E2E verification (Arbitrum Sepolia)

1. Wallet on chain `421614`, funded with Arb Sepolia ETH.
2. HolmeSwap: submit intent → tx confirms on `GhostLockLiveness`.
3. After unlock block (~100 blocks): `IntentDecrypted` event on Arbiscan.
4. If callback slow: UI may `forceReveal` using key from `fetchDecryptionKeyBytes`.
5. Solver/server indexes events and runs batch settlement (see [server/ARCHITECTURE.md](../server/ARCHITECTURE.md)).

## Randamu legacy

Previously used hosted agents and senders (e.g. Sepolia BlocklockSender `0xd223…`). Self-hosted committee keys **must** match your deployed senders and `VITE_BLOCKLOCK_IBE_PUBLIC_KEY`; Randamu contracts alone are insufficient if their agents are offline.
