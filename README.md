# SoulChain

Cryptographic identity anchoring for AI agents on EVM blockchains. Every file write is encrypted, hashed, and anchored on-chain — creating an immutable, tamper-evident record of your agent's identity and memory.

## Quick Start

```bash
npm install -g @soulchain/cli
soulchain init --chain base-sepolia
# Done. Your SOUL.md, MEMORY.md, and tracked files are now blockchain-anchored.
```

## How It Works

1. **Write** — You edit SOUL.md, MEMORY.md, or any tracked file
2. **Encrypt** — Content is encrypted with your Ed25519-derived key
3. **Upload** — Encrypted blob goes to IPFS/Arweave/local storage
4. **Anchor** — Content hash + storage CID written to an EVM smart contract
5. **Verify** — Anyone can verify integrity; only you can decrypt

## Chain Options

| Chain | Type | Cost | Notes |
|-------|------|------|-------|
| **Base** | L2 | ~$0.001/tx | Recommended — cheapest, Coinbase-backed |
| Base Sepolia | Testnet | Free | For development |
| Arbitrum One | L2 | ~$0.01/tx | Popular L2 |
| Optimism | L2 | ~$0.01/tx | OP Stack |
| Polygon | L2 | ~$0.01/tx | High throughput |
| Ethereum | L1 | ~$1-5/tx | Most secure, expensive |
| Self-hosted | Local | Free | Private Anvil/Hardhat node |
| Custom EVM | Any | Varies | Provide your own RPC URL |

```bash
soulchain init --chain base           # Production
soulchain init --chain self-hosted    # Private, zero cost
soulchain init --chain custom --rpc-url https://my-chain.example.com
```

## CLI Commands

```bash
soulchain init          # Initialize SoulChain in workspace
soulchain status        # Show sync status
soulchain verify        # Verify file integrity against chain
soulchain restore       # Restore file from chain
soulchain history       # Show version history
soulchain export        # Export portable bundle
soulchain import        # Import bundle into new workspace
```

## Packages

- `@soulchain/core` — Crypto, chain providers, sync engine
- `@soulchain/openclaw` — OpenClaw integration (hooks, watcher)
- `@soulchain/cli` — Command-line interface
- `@soulchain/contracts` — Solidity smart contracts

## License

MIT
