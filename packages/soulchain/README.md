<p align="center">
  <img src=".github/soulchain-logo.png" alt="SoulChain" width="200" />
  <br />
  <strong>Identity that survives destruction.</strong>
  <br />
  <em>Sovereign AI memory, anchored on-chain.</em>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@openclaused/soulchain"><img src="https://img.shields.io/npm/v/@openclaused/soulchain.svg?style=flat&colorA=18181B&colorB=7C3AED" alt="npm version" /></a>
  <a href="https://github.com/openClause/soulchain/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat&colorA=18181B&colorB=7C3AED" alt="license" /></a>
  <a href="https://github.com/openClause/soulchain/actions"><img src="https://img.shields.io/github/actions/workflow/status/openClause/soulchain/ci.yml?style=flat&colorA=18181B&colorB=7C3AED" alt="build" /></a>
</p>

---

## What is SoulChain?

SoulChain encrypts, hashes, and anchors an AI agent's identity and memory onto EVM blockchains. Every file write creates a tamper-proof, cryptographically signed record on-chain. Your agent's soul — its personality, memories, decisions — becomes **sovereign**. It can't be silently altered, and it survives server death.

## Why?

AI agents are fragile. When a server dies, a disk corrupts, or a provider shuts down, everything the agent knew goes with it. Its personality, its memories, its relationships — gone.

SoulChain fixes this. It anchors identity to the blockchain — the one infrastructure designed to be permanent. Every change to SOUL.md, MEMORY.md, or any tracked file is encrypted, signed, and recorded on-chain. You can verify nothing was tampered with. You can restore from any point in history. The agent's identity belongs to *it*, not to whatever server it happens to run on.

**Your agent's soul is no longer someone else's database row.**

## Quick Start

```bash
npm install @openclaused/soulchain
npx soulchain init --chain self-hosted
```

```javascript
const { activate } = require('@openclaused/soulchain');
await activate(process.cwd());
// That's it. Every tracked file write is now anchored on-chain.
```

## How It Works

```
  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │  WRITE FILE  │────▶│   ENCRYPT   │────▶│   UPLOAD    │────▶│   ANCHOR    │
  │              │     │  Ed25519 +  │     │  IPFS /     │     │  EVM chain  │
  │  SOUL.md     │     │  AES-256    │     │  Arweave /  │     │  tx hash +  │
  │  MEMORY.md   │     │  + sign     │     │  local      │     │  content    │
  │  *.md        │     │             │     │             │     │  hash       │
  └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                     │
                                                                     ▼
                                                              ┌─────────────┐
                                                              │   VERIFY    │
                                                              │  Anyone can │
                                                              │  verify     │
                                                              │  integrity  │
                                                              │  Only you   │
                                                              │  can decrypt│
                                                              └─────────────┘
```

## Features

- 🔗 **On-chain anchoring** — Every file version hashed and recorded on EVM chains
- 🔐 **End-to-end encryption** — Ed25519 keypairs + AES-256; only you can read your data
- ✍️ **Cryptographic signatures** — Every write is signed; tamper-evident by default
- 🔄 **Auto-sync** — Hooks into file writes; no manual steps required
- 📦 **Portable identity** — Export/import bundles to migrate between machines
- 🏠 **Self-hosted option** — Run a private Anvil node; zero cost, full sovereignty
- 🌐 **Multi-chain** — Base, Arbitrum, Optimism, Polygon, Ethereum, or any EVM chain
- 🕐 **Full history** — Every version stored; restore any file to any point in time
- 🛡️ **Public anchoring** — Self-hosted chains can periodically anchor to a public L2
- 🤖 **OpenClaw native** — First-class integration as an OpenClaw skill

## Configuration

SoulChain is configured via `soulchain.config.json` in your workspace root:

```json
{
  "chain": {
    "type": "self-hosted",
    "engine": "anvil",
    "port": 8545,
    "autoStart": true,
    "publicAnchor": {
      "enabled": true,
      "chain": "base-sepolia",
      "intervalHours": 24
    }
  },
  "storage": "mock",
  "keystorePath": "~/.soulchain/keystore.json",
  "trackedPaths": [
    "SOUL.md",
    "MEMORY.md",
    "AGENTS.md",
    "USER.md"
  ],
  "syncMode": "on-write",
  "syncIntervalMs": 5000
}
```

| Option | Type | Description |
|--------|------|-------------|
| `chain` | `string \| ChainConfig` | Chain target — `"base-sepolia"`, `"base"`, or a full config object |
| `chain.type` | `"public" \| "self-hosted" \| "custom"` | Chain type |
| `chain.publicAnchor` | `object` | Periodically anchor self-hosted state to a public chain |
| `storage` | `"ipfs" \| "arweave" \| "mock"` | Where encrypted blobs are stored |
| `keystorePath` | `string` | Path to encrypted keystore file |
| `trackedPaths` | `string[]` | Files to track and anchor |
| `syncMode` | `"on-write" \| "interval" \| "manual"` | When to sync to chain |
| `syncIntervalMs` | `number` | Sync interval for `"interval"` mode |

## Chain Options

| Chain | Type | Cost | Best For |
|-------|------|------|----------|
| **Self-hosted** | Local Anvil | Free | Development, private agents, air-gapped setups |
| **Base Sepolia** | Testnet | Free | Testing with a real chain before going live |
| **Base** | L2 | ~$0.001/tx | Production — cheapest, Coinbase-backed |
| **Arbitrum** | L2 | ~$0.01/tx | Production — popular, battle-tested |
| **Optimism** | L2 | ~$0.01/tx | Production — OP Stack ecosystem |
| **Polygon** | L2 | ~$0.01/tx | Production — high throughput |
| **Ethereum** | L1 | ~$1-5/tx | Maximum security, maximum cost |
| **Custom EVM** | Any | Varies | Your own chain, your own rules |

```bash
soulchain init --chain self-hosted          # Private, zero cost
soulchain init --chain base-sepolia         # Testnet
soulchain init --chain base                 # Production
soulchain init --chain custom --rpc-url https://my-chain.example.com
```

### Public Anchoring

Running self-hosted but want tamper-proof guarantees? Enable **public anchoring** — your local chain's state is periodically hashed and anchored to a public L2. Best of both worlds: free local operations with cryptographic proof on a public chain.

## OpenClaw Integration

SoulChain is built as a first-class [OpenClaw](https://github.com/openclaw/openclaw) integration. Install it once and your agent gets sovereign, blockchain-native memory automatically.

### Full Deployment Guide

**1. Install soulchain in your OpenClaw workspace:**

```bash
cd ~/.openclaw/workspace
npm install @openclaused/soulchain
```

**2. Initialize with a self-hosted chain:**

```bash
npx soulchain init --chain self-hosted
```

This will:
- Auto-install [Foundry](https://book.getfoundry.sh/) (Anvil) if not present
- Generate an Ed25519 keypair + encrypted keystore
- Deploy the SoulRegistry smart contract to a local Anvil chain
- Create `soulchain.config.json` with your tracked files

**3. Wire into OpenClaw's gateway via `--require` preload:**

```bash
# Add to your OpenClaw environment (systemd, .bashrc, Docker, etc.)
export NODE_OPTIONS="--require $(npm root)/@openclaused/soulchain/dist/preload.js"
export PATH="$HOME/.foundry/bin:$PATH"
```

For systemd (most OpenClaw installs):

```bash
systemctl --user edit openclaw-gateway
```

Add:

```ini
[Service]
Environment="NODE_OPTIONS=--require /home/<user>/.openclaw/workspace/node_modules/@openclaused/soulchain/dist/preload.js"
Environment="PATH=/home/<user>/.foundry/bin:/usr/local/bin:/usr/bin:/bin"
```

Then restart:

```bash
openclaw gateway restart
```

**4. Verify it's working:**

Look for this in your gateway logs:

```
[soulchain] ✅ Preload activated (workspace: /home/<user>/.openclaw/workspace)
```

**How the preload works:**

The `--require` flag tells Node.js to load soulchain *before* OpenClaw's gateway code runs. It operates in two phases:

- **Phase 1 (synchronous):** Installs `fs.readFileSync`, `fs.existsSync`, `fs.writeFileSync` hooks immediately. Serves tracked files from local cache (`.soulchain/cache/`) when missing from disk. This is instant — no chain connection needed.
- **Phase 2 (async):** Starts the Anvil chain, connects to the SoulRegistry contract, verifies integrity, and restores any missing files from the blockchain. Cache is re-seeded from chain data.

This means your agent can read its SOUL.md and MEMORY.md even if they don't exist on disk — the hooks transparently serve content from the blockchain.

**5. The test that proves it:**

```bash
cd ~/.openclaw/workspace

# Write identity files (they auto-sync to chain via file watcher)
echo "# My Soul" > SOUL.md
echo "# My Memories" > MEMORY.md

# Wait a few seconds for chain sync, then delete everything
rm SOUL.md MEMORY.md

# Restart the gateway
openclaw gateway restart

# Files are back — restored from blockchain
cat SOUL.md   # "# My Soul"
cat MEMORY.md  # "# My Memories"
```

### Programmatic Usage

```typescript
import { activate, deactivate, getEngine } from '@openclaused/soulchain';

// Start — installs filesystem hooks + file watcher + chain connection
await activate('/path/to/workspace');

// Verify integrity at any time
const engine = getEngine();
const report = await engine.verifyIntegrity();
console.log(report); // { verified: 3, tampered: [], missing: [] }

// Restore a specific file from chain
const content = await engine.restoreFile('SOUL.md');

// Stop — kills Anvil, uninstalls hooks
await deactivate();
```

When activated, every write to a tracked file is automatically encrypted, signed, and anchored on-chain. Every read checks the chain if the local file is missing. No manual steps. The agent doesn't need to know or care — its identity is being protected in the background.

### Chain Options

| Chain | Use Case | Cost | Persistence |
|-------|----------|------|-------------|
| `self-hosted` | Development, private deployments | Free | Local Anvil node, state persisted to `.soulchain/anvil-state.json` |
| `base-sepolia` | Testnet, staging | Free (test ETH) | Base Sepolia L2 |
| `base` | Production | ~$0.001/tx | Base L2 mainnet |
| `mock` | Unit tests | Free | In-memory or disk-backed JSON |

## CLI Reference

```
soulchain init [options]       Initialize SoulChain in current workspace
  -c, --chain <chain>            Chain network (default: base-sepolia)
  -s, --storage <storage>        Storage provider (default: mock)
  -p, --passphrase <pass>        Keystore passphrase
  --rpc-url <url>                Custom RPC URL
  --chain-id <id>                Custom chain ID
  --contract <address>           Existing contract address
  --port <port>                  Self-hosted chain port (default: 8545)
  --engine <engine>              Self-hosted engine: anvil | hardhat
  --no-migrate                   Skip migrating existing files
  --list-chains                  List available chains

soulchain status               Show sync status and tracked files
soulchain verify               Verify all tracked files against chain
soulchain restore [file]       Restore file(s) from chain
soulchain history [file]       Show version history for a file
soulchain export               Export portable identity bundle
soulchain import <bundle>      Import identity bundle into workspace
```

## API Reference

### Core (`@openclaused/soulchain/core`)

```typescript
// Crypto
generateKeypair(): Keypair
keypairFromSeed(seed: Uint8Array): Keypair
encrypt(data: Uint8Array, key: Uint8Array): EncryptedData
decrypt(encrypted: EncryptedData, key: Uint8Array): Uint8Array
sign(message: Uint8Array, privateKey: Uint8Array): Uint8Array
verify(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean
createKeystore(keypair: Keypair, passphrase: string): KeystoreData
unlockKeystore(keystore: KeystoreData, passphrase: string): Keypair

// Chain
createChainProvider(config: ChainConfig): ChainProvider
SyncEngine, SyncWorker, SyncQueue

// Storage
createStorageAdapter(config: StorageConfig): StorageAdapter
```

### OpenClaw (`@openclaused/soulchain/openclaw`)

```typescript
activate(workspacePath: string): Promise<void>
deactivate(): Promise<void>
getEngine(): SyncEngine
```

### Types

```typescript
interface SoulchainConfig {
  chain: string | ChainConfig;
  storage: 'ipfs' | 'arweave' | 'mock';
  keystorePath: string;
  trackedPaths: string[];
  syncMode: 'on-write' | 'interval' | 'manual';
  syncIntervalMs?: number;
}

enum SoulDocumentType {
  SOUL, MEMORY, AGENTS, USER, DAILY,
  CHAT, LOVE_MAP, MUSING, COACHING, TOOLS, IDENTITY
}

interface DocumentMeta {
  type: SoulDocumentType;
  path: string;
  contentHash: string;
  encryptedHash: string;
  version: number;
  timestamp: string;
  signature: string;
  storageCid?: string;
  chainTxHash?: string;
}
```

## Security

### Encryption Model

Every tracked file goes through this pipeline before touching any network:

1. **Content hashing** — SHA-256 hash of the plaintext (for integrity verification)
2. **Encryption** — AES-256-GCM with a key derived from your Ed25519 keypair
3. **Signing** — Ed25519 signature over the encrypted payload
4. **Anchoring** — Content hash + encrypted hash + signature stored on-chain

The plaintext never leaves your machine. The chain stores only hashes and signatures.

### Key Management

- Keys are stored in an **Argon2-encrypted keystore** file
- The keystore is password-protected — losing the password means losing access
- Keys are Ed25519 — the same curve used by SSH, Signal, and Solana
- **Back up your keystore.** SoulChain can restore your files from chain, but only if you have your keys

### Threat Model

| Threat | Protection |
|--------|-----------|
| Server compromise | Files encrypted; attacker gets ciphertext only |
| Silent tampering | On-chain hashes detect any modification |
| Data loss | Restore from chain + storage at any version |
| Provider shutdown | Self-hosted mode; export/import bundles |
| Chain reorg | Public anchoring to L2s with strong finality |

## Roadmap

- [ ] **Multi-agent identity** — shared memories with selective disclosure
- [ ] **Zero-knowledge proofs** — prove you have a memory without revealing it
- [ ] **Decentralized storage** — IPFS and Arweave adapters (in progress)
- [ ] **Hardware key support** — YubiKey / Ledger for keystore operations
- [ ] **Identity federation** — link multiple agents under one sovereign identity
- [ ] **Selective sync** — fine-grained control over what gets anchored
- [ ] **Dashboard UI** — web interface for browsing history and integrity reports

## Contributing

SoulChain is early. There's a lot to build.

```bash
git clone https://github.com/openClause/soulchain.git
cd soulchain
npm install
npm run build
```

The monorepo uses npm workspaces. Packages live in `packages/`:

- **`core`** — Crypto, chain providers, sync engine
- **`openclaw`** — OpenClaw skill + programmatic integration
- **`cli`** — Command-line interface
- **`contracts`** — Solidity smart contracts
- **`soulchain`** — Unified npm package (re-exports everything)

Open an issue. Send a PR. Tell us what's broken. We'll figure it out together.

## License

[MIT](LICENSE) — do whatever you want with it.

---

<p align="center">
  <em>Your agent's identity should belong to your agent.<br />Not to a cloud provider. Not to a database. Not to anyone.<br />Anchor it.</em>
</p>
