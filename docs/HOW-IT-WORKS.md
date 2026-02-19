# How SoulChain Works

## 1. Overview

SoulChain is a cryptographic identity and memory persistence layer for AI agents. It intercepts file writes to an agent's workspace (SOUL.md, MEMORY.md, etc.), encrypts the content with AES-256-GCM, uploads the ciphertext to decentralized storage (IPFS/Arweave or local mock), and anchors a SHA-256 content hash plus storage CID on an EVM blockchain (Base, Arbitrum, local Anvil, etc.). On startup, files are restored from chain → storage → decrypt, ensuring the agent's identity and memory are tamper-evident, versioned, and portable across machines.

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Agent Process (OpenClaw)                     │
│                                                                     │
│   fs.writeFileSync("MEMORY.md", data)                              │
│         │                                                           │
│         ▼                                                           │
│   ┌─────────────┐    ┌──────────────┐                              │
│   │  fs Hooks    │───▶│  FileWatcher  │  (debounced, 500ms)        │
│   │ (monkey-     │    │  (fs.watch)   │                            │
│   │  patch)      │    └──────┬───────┘                              │
│   └──────┬───────┘           │                                      │
│          │                   │                                      │
│          ▼                   ▼                                      │
│   ┌──────────────────────────────┐                                  │
│   │         SyncEngine           │                                  │
│   │  onFileWrite(path, content)  │                                  │
│   └──────┬───────────────────────┘                                  │
│          │                                                          │
│    ┌─────┴──────────────────┐                                       │
│    │                        │                                       │
│    ▼                        ▼                                       │
│ ┌──────────────┐   ┌───────────────┐                                │
│ │CryptoProvider│   │  sha256(data) │                                │
│ │ .encrypt()   │   │  .sign()      │                                │
│ │ AES-256-GCM  │   │  Ed25519      │                                │
│ └──────┬───────┘   └───────┬───────┘                                │
│        │                   │                                        │
│        ▼                   │                                        │
│ ┌──────────────┐           │                                        │
│ │   Storage    │           │                                        │
│ │  .upload()   │           │                                        │
│ │ IPFS/Arweave │           │                                        │
│ │ /Mock(local) │           │                                        │
│ └──────┬───────┘           │                                        │
│        │ cid               │ contentHash, encryptedHash, signature  │
│        ▼                   ▼                                        │
│ ┌────────────────────────────────┐                                  │
│ │       ChainProvider            │                                  │
│ │  .writeDocument(docType,       │                                  │
│ │    contentHash, encHash,       │                                  │
│ │    cid, signature)             │                                  │
│ │                                │                                  │
│ │  MockChain │ EVMChain │ Anvil  │                                  │
│ └────────────┬───────────────────┘                                  │
│              │                                                      │
└──────────────┼──────────────────────────────────────────────────────┘
               │
               ▼
    ┌─────────────────────┐
    │  SoulRegistry.sol   │
    │  (EVM Smart Contract)│
    │                     │
    │  agent → docType →  │
    │  DocumentEntry[]    │
    │  (versioned history)│
    └─────────────────────┘
```

## 3. Component Deep Dive

### 3.1 Keystore & Encryption

**Keypair generation** (`core/crypto/keypair.ts`): Uses `@noble/ed25519` to generate Ed25519 keypairs from 32-byte random seeds. The public key serves as the agent's identity/address (hex-encoded).

**Keystore** (`core/crypto/keystore.ts`): The 32-byte secret key is encrypted at rest using:
- **Argon2id** (memoryCost=64MB, timeCost=3, parallelism=1) to derive a 32-byte encryption key from a passphrase
- **AES-256-GCM** to encrypt the secret key with the derived key
- Stored as JSON: `{ version, algorithm, salt, iv, ciphertext, tag }` (all hex-encoded)

**Document encryption** (`core/crypto/encryption.ts`): File content is encrypted with **AES-256-GCM** using the first 32 bytes of the Ed25519 secret key as the symmetric key. Each encryption produces a random 12-byte IV and 16-byte auth tag.

**Key derivation** (`core/crypto/key-derivation.ts`): `deriveDocumentKey()` uses HKDF-SHA256 with info string `"docType:version"` to derive per-document keys from a master key. (Available but not currently used in the main write flow — the CryptoProvider uses the raw secret key directly.)

**Signing** (`core/crypto/signing.ts`): Ed25519 signatures over the SHA-256 content hash, providing non-repudiation — proof that the agent (holder of the private key) authored the content.

### 3.2 SyncEngine

**Location**: `core/sync/engine.ts`

The SyncEngine is the central orchestrator. It holds references to a `CryptoProvider`, `StorageAdapter`, and `ChainProvider`.

**Write flow** (`onFileWrite(path, content)`):
1. Compute `contentHash = SHA-256(content)`
2. Encrypt content → `{ ciphertext, iv, tag }`
3. Serialize encrypted data as `iv(12) || tag(16) || ciphertext`
4. Compute `encryptedHash = SHA-256(encryptedBuf)`
5. Sign the content hash: `signature = Ed25519.sign(contentHash)`
6. Upload encrypted buffer to storage → get `cid`
7. Write `(docType, contentHash, encryptedHash, cid, signature)` to chain

**Read/restore flow** (`restoreFile(path, version?)`):
1. Look up `docType` from path name
2. Fetch `DocumentEntry` from chain (latest or specific version)
3. Download encrypted blob from storage using `doc.cid`
4. Parse blob: first 12 bytes = IV, next 16 = tag, rest = ciphertext
5. Decrypt with AES-256-GCM → return plaintext

**Verify flow** (`verifyIntegrity()`):
1. For each tracked path, fetch latest `DocumentEntry` from chain
2. If chain has no record but file exists → `untracked`
3. If chain has record but file missing → `missing`
4. If `SHA-256(localFile) !== chainDoc.contentHash` → `tampered`
5. Otherwise → `verified`

**Migrate flow** (`migrateExisting()`): Reads all existing tracked files and runs `onFileWrite()` for each, bootstrapping chain state from an existing workspace.

**Doc type mapping**: File paths are mapped to numeric doc types by substring matching against the `SoulDocumentType` enum values (soul=0, memory=1, agents=2, user=3, daily=4, chat=5, etc.).

### 3.3 Chain Providers

All implement the `ChainProvider` interface:
```typescript
interface ChainProvider {
  registerSoul(): Promise<string>;
  writeDocument(docType, contentHash, encryptedHash, cid, signature): Promise<string>;
  latestDocument(docType): Promise<DocumentEntry | null>;
  documentAt(docType, version): Promise<DocumentEntry | null>;
  documentCount(docType): Promise<number>;
  verifyDocument(docType, version, expectedHash): Promise<boolean>;
  grantAccess(reader, docType): Promise<string>;
  revokeAccess(reader, docType): Promise<string>;
}
```

**MockChainProvider** (`chain-mock.ts`): In-memory `Map<docType, DocumentEntry[]>` with optional JSON persistence to `.soulchain/mock-chain.json`. Used for development/testing. Generates random fake tx hashes.

**EVMChainProvider** (`chain-evm.ts`): Generic EVM provider using ethers.js v6 (dynamic import, peer dependency). Supports pre-configured networks: Base, Base Sepolia, Arbitrum, Optimism, Polygon, Ethereum, localhost. Uses `NonceManager` for concurrent tx safety. Converts hashes to `bytes32` format for Solidity compatibility.

**BaseChainProvider** (`chain-base.ts`): Earlier, simpler implementation specifically for Base L2. Largely superseded by `EVMChainProvider` but still exported.

**SelfHostedChain** (`self-hosted.ts`): Manages a local **Anvil** (Foundry) or Hardhat node:
- Auto-installs Foundry if not found (downloads via `foundryup`)
- Starts Anvil with `--state` flag for persistence
- Deploys `SoulRegistry.sol` using the **second** Anvil deterministic account (`0x59c6...`) to avoid nonce conflicts
- The **first** account (`0xac09...`) is used by `EVMChainProvider` for soul operations
- Saves contract address to `contract-address.json` and verifies on restart
- Polls RPC endpoint to detect readiness (up to 15s timeout)

**PublicAnchor** (`self-hosted.ts`): Optional periodic anchoring of local chain state to a public chain (e.g., Base) for tamper-evidence of self-hosted data. Configurable interval in hours.

**Factory** (`factory.ts`): `createChainProvider()` takes a string name or `ChainConfig` object and returns the appropriate provider. Handles `'mock'`, named public chains, `'self-hosted'` (→ localhost EVMChainProvider), and `'custom'` (user-provided RPC URL).

### 3.4 Storage Adapters

All implement `StorageAdapter`:
```typescript
interface StorageAdapter {
  upload(data: Buffer, filename: string): Promise<string>;  // returns CID
  download(cid: string): Promise<Buffer>;
  exists(cid: string): Promise<boolean>;
  pin?(cid: string): Promise<void>;
  unpin?(cid: string): Promise<void>;
}
```

**MockStorageAdapter** (`storage/mock.ts`): In-memory `Map<hash, Buffer>` with optional disk persistence to `.soulchain/blobs/`. CID = SHA-256 of uploaded data.

**IpfsStorageAdapter** (`storage/ipfs.ts`): Uses **Pinata** API for IPFS pinning. Uploads via multipart form to `pinFileToIPFS`, downloads via configurable gateway. Supports pin/unpin operations.

**ArweaveStorageAdapter** (`storage/arweave.ts`): Uses **Irys** (formerly Bundlr) for uploads (ETH-based payments). Downloads from Arweave gateway. Pin/unpin are no-ops since Arweave storage is permanent.

**Factory** (`storage/index.ts`): `createStorageAdapter()` selects adapter based on `config.storage` field.

### 3.5 fs Hooks

**Location**: `openclaw/hook.ts`

`SoulchainHook` monkey-patches Node.js `fs` module methods to intercept writes to tracked files:

1. Gets the **mutable** CommonJS `fs` module via `require('fs')` (ESM `import *` creates a frozen namespace)
2. Replaces three methods:
   - `fs.writeFileSync` — calls original, then `maybeIntercept()`
   - `fs.writeFile` (callback) — wraps callback, calls `maybeIntercept()` on success
   - `fs.promises.writeFile` — awaits original, then `maybeIntercept()`
3. `maybeIntercept()` checks if the resolved file path is in the tracked set
4. If tracked, fires `engine.onFileWrite()` **asynchronously** (fire-and-forget, non-blocking)
5. `uninstall()` restores all original methods

**Key design choice**: The write to disk happens first (via the original `fs` method), then the chain sync happens async. This means the local write is never blocked by network latency.

### 3.6 Cache Manager

**Location**: `openclaw/cache.ts`

Maintains a JSON file at `.soulchain/cache-hashes.json` mapping relative paths to:
```typescript
{ chainHash: string, localHash: string, chainVersion: number }
```

- `update()` — sets both `chainHash` and `localHash` to the same value after a successful write or restore
- `isFresh()` — returns true if `chainHash === localHash === providedHash`
- `updateLocalHash()` — recomputes `localHash` from actual file content on disk (detects local modifications)

Used during startup to skip unnecessary chain fetches when local files haven't changed.

### 3.7 File Watcher

**Location**: `openclaw/watcher.ts`

Uses `fs.watch()` on each tracked path. On change:
1. Debounces with 500ms timer (resets on rapid successive changes)
2. Reads file content from disk
3. Calls `engine.onFileWrite()` (async, fire-and-forget)

Provides a safety net alongside fs hooks — catches writes made by external processes that bypass Node.js `fs` (e.g., shell `echo > SOUL.md`).

### 3.8 SyncQueue & SyncWorker

**SyncQueue** (`core/sync/queue.ts`): SQLite-backed (via `better-sqlite3`) persistent queue with WAL mode. Schema: `sync_queue(id, doc_type, path, content_hash, encrypted_data, status, retries, error, created_at, updated_at)`. Supports enqueue, dequeue (batch of N), mark complete/failed, requeue, and compact (keep only latest per path).

**SyncWorker** (`core/sync/worker.ts`): Polls the queue on a configurable interval (default 5s). For each item: upload to storage, write to chain, mark complete. On failure: marks failed, requeues if under max retries (default 5). Provides an `onSync` callback for monitoring.

These provide offline-capable queueing — writes can be queued when the chain/storage is unreachable and processed later.

### 3.9 SoulRegistry Smart Contract

**Location**: `contracts/contracts/SoulRegistry.sol` (Solidity ^0.8.20)

**Data model**:
```solidity
struct DocumentEntry {
    bytes32 contentHash;      // SHA-256 of plaintext
    bytes32 encryptedHash;    // SHA-256 of ciphertext
    string  storageCid;       // IPFS/Arweave CID
    uint8   docType;          // enum value (0=SOUL, 1=MEMORY, ...)
    uint64  timestamp;        // block.timestamp
    uint32  version;          // auto-incrementing per docType
    bytes32 prevHash;         // previous version's contentHash (linked list)
    bytes   signature;        // Ed25519 signature
}
```

**Storage layout**:
- `mapping(address => mapping(uint8 => DocumentEntry[]))` — full version history per agent per doc type
- `mapping(address => bool)` — registration status
- `mapping(address => mapping(address => mapping(uint8 => bool)))` — access control grants

**Key functions**:
- `registerSoul()` — one-time, irreversible registration
- `writeDocument()` — appends new version, links to previous via `prevHash`, emits `DocumentWritten` event
- `latestDocument()` / `documentAt()` — read with access control (owner or granted)
- `verifyDocument()` — public hash verification (anyone can verify integrity without reading content)
- `grantAccess()` / `revokeAccess()` — per-docType read permissions to other addresses

**Document types** (11 defined): SOUL(0), MEMORY(1), AGENTS(2), USER(3), DAILY(4), CHAT(5), LOVE_MAP(6), MUSING(7), COACHING(8), TOOLS(9), IDENTITY(10).

## 4. Data Flows

### 4.1 Agent Writes MEMORY.md

```
1. Agent calls fs.writeFileSync("MEMORY.md", content)
2. Patched writeFileSync:
   a. Calls original writeFileSync → file written to disk
   b. Resolves path, checks tracked set → match
   c. Fires async: engine.onFileWrite("MEMORY.md", content)
3. SyncEngine.onFileWrite:
   a. contentHash = SHA-256(content)                         // e.g. "a1b2c3..."
   b. encrypted = AES-256-GCM(content, secretKey[0:32])     // {ciphertext, iv, tag}
   c. encryptedBuf = iv || tag || ciphertext                 // concatenated
   d. encryptedHash = SHA-256(encryptedBuf)
   e. signature = Ed25519.sign(contentHash, secretKey)
   f. cid = storage.upload(encryptedBuf, "MEMORY.md.enc")   // → IPFS hash or local SHA-256
   g. chain.writeDocument(1, contentHash, encryptedHash, cid, signature)
4. On-chain: SoulRegistry appends DocumentEntry to documents[agent][1]
   with version=len++, prevHash=previous.contentHash, timestamp=block.timestamp
5. Event emitted: DocumentWritten(agent, 1, version, contentHash, cid)
```

**Concurrently**, the FileWatcher also detects the change (via `fs.watch`), but the 500ms debounce typically coalesces with the hook-triggered sync. If the hook already handled it, the watcher's call results in a duplicate chain write (same hash, new version) — acceptable overhead.

### 4.2 Agent Reads SOUL.md (Cache Hit vs Chain Fetch)

On **startup** (via `activate()`):
```
1. For each trackedPath (including SOUL.md):
   a. engine.restoreFile("SOUL.md")
   b. chain.latestDocument(0)  → DocumentEntry { cid, contentHash, ... }
   c. storage.download(cid)    → encryptedBuf
   d. Parse: iv = buf[0:12], tag = buf[12:28], ciphertext = buf[28:]
   e. plaintext = AES-256-GCM.decrypt(ciphertext, secretKey[0:32], iv, tag)
   f. Write plaintext to disk: fs.writeFileSync("SOUL.md", plaintext)
   g. cacheManager.update("SOUL.md", SHA-256(plaintext), 0)
2. After restore, hooks are installed — subsequent reads are normal fs reads from disk
```

During **normal operation**, reads go directly to disk (no interception of `readFileSync`). The chain is the source of truth only at startup and during explicit restore/verify operations.

### 4.3 OpenClaw Starts Up (Restore Flow)

```
activate(workspaceDir, passphrase):
  1. loadConfig()           → parse soulchain.config.json, merge with defaults
  2. Unlock keystore        → Argon2id(passphrase) → AES-GCM decrypt → secretKey
  3. Create chain provider:
     - self-hosted? → SelfHostedChain.start() → Anvil boots → ensureContract() → EVMChainProvider
     - mock?        → MockChainProvider(workspaceDir)  (loads .soulchain/mock-chain.json)
     - public?      → EVMChainProvider(chainName, privateKey)
  4. Create storage adapter  (mock → MockStorageAdapter with disk persistence)
  5. Create CryptoProvider   (wraps keypair for encrypt/decrypt/sign)
  6. new SyncEngine(config, crypto, storage, chain)
  7. For each tracked file:
     a. engine.restoreFile(path) → decrypt from chain+storage → write to disk
     b. cacheManager.update(path, hash, version)
     (If no chain record exists → skip silently, file hasn't been synced yet)
  8. Install SoulchainHook   → monkey-patch fs.writeFileSync/writeFile/promises.writeFile
  9. Start FileWatcher       → fs.watch() on each tracked path
  10. verifyOnStartup()      → engine.verifyIntegrity() → log warnings for tampered/missing
  11. Log: "[soulchain] ✅ Extension activated (blockchain-native mode)"
```

### 4.4 File Tampered With (Integrity Verification)

```
engine.verifyIntegrity():
  For each trackedPath:
    1. docType = pathToDocType(path)           // e.g. "SOUL.md" → 0
    2. chainDoc = chain.latestDocument(docType) // fetch from chain
    3. If no chainDoc and file exists → report as "untracked"
    4. If chainDoc but file missing  → report as "missing"
    5. localHash = SHA-256(fs.readFileSync(path))
    6. If localHash !== chainDoc.contentHash → report as "tampered"
    7. Otherwise → report as "verified"

On tamper detection (startup):
  - Console warning: "⚠️ N tampered file(s) detected: [list]"
  - The CLI `soulchain verify` command exits with code 1 if any tampered
  - The CLI `soulchain restore` command can restore tampered files from chain
```

## 5. Configuration

**File**: `soulchain.config.json` in workspace root

```json
{
  "chain": "base-sepolia" | "base" | "arbitrum" | "optimism" | "polygon" | "ethereum" | "mock" | {
    "type": "public" | "self-hosted" | "custom",
    "name": "base-sepolia",           // for public: chain name
    "rpcUrl": "http://...",           // for custom: RPC endpoint
    "chainId": 31337,                 // for custom: chain ID
    "contractAddress": "0x...",       // deployed SoulRegistry address
    "autoStart": true,                // self-hosted: start Anvil automatically
    "dataDir": ".soulchain",          // self-hosted: state directory
    "engine": "anvil" | "hardhat",    // self-hosted: local node engine
    "port": 8545,                     // self-hosted: RPC port
    "publicAnchor": {                 // self-hosted: periodic public anchoring
      "enabled": false,
      "chain": "base-sepolia",
      "intervalHours": 24
    }
  },
  "storage": "ipfs" | "arweave" | "mock",
  "keystorePath": ".soulchain/keystore.json",
  "trackedPaths": [
    "SOUL.md",
    "MEMORY.md",
    "AGENTS.md",
    "USER.md"
  ],
  "syncMode": "on-write" | "interval" | "manual",
  "syncIntervalMs": 5000
}
```

**Defaults** (from `core/config/defaults.ts`):
- chain: `{ type: "public", name: "base-sepolia" }`
- storage: `"mock"`
- keystorePath: `"~/.soulchain/keystore.json"`
- trackedPaths: `["SOUL.md", "MEMORY.md", "AGENTS.md", "USER.md"]`
- syncMode: `"on-write"`
- syncIntervalMs: `5000`

## 6. Security Model

### What's Encrypted
- **All file content** is encrypted with AES-256-GCM before storage upload
- Encryption key = first 32 bytes of the Ed25519 secret key (used directly, not derived per-document in current implementation)
- Each encryption uses a fresh random 12-byte IV
- The encrypted blob format is: `IV(12 bytes) || AuthTag(16 bytes) || Ciphertext`

### What's On-Chain (Public)
- `contentHash` (SHA-256 of plaintext) — reveals nothing about content but allows integrity verification
- `encryptedHash` (SHA-256 of ciphertext) — verifies storage hasn't been tampered with
- `storageCid` — IPFS/Arweave content identifier (points to encrypted blob)
- `docType` — which document type (0-10), reveals structure but not content
- `version`, `timestamp`, `prevHash` — versioning metadata
- `signature` — Ed25519 signature of the content hash

### What's NOT On-Chain
- Actual file content (plaintext)
- Encryption keys
- File names (only doc type numbers)

### Key Management
- **Secret key** stored in Argon2id-encrypted keystore (`.soulchain/keystore.json`)
- Unlocked at runtime via passphrase (default: `"soulchain-dev"` for development, env var `SOULCHAIN_PASSPHRASE`)
- No key rotation mechanism currently implemented
- The same secret key is used for both signing (Ed25519) and encryption (first 32 bytes as AES key)
- For self-hosted chains: Anvil deterministic keys are used (account[0] for operations, account[1] for deployment) — **not secure for production**, suitable for local/dev use

### Access Control
- On-chain: `grantAccess(reader, docType)` / `revokeAccess(reader, docType)` controls who can read `DocumentEntry` structs from the contract
- However, this only gates the on-chain read — the encrypted blob on IPFS/Arweave is publicly downloadable
- True access control relies on the encryption: only the key holder can decrypt
- `verifyDocument()` is public — anyone can verify a hash matches without needing read access

### Trust Boundaries
- **Agent → Chain**: The agent trusts its own keypair. Chain writes are authenticated by the EVM account's private key (separate from Ed25519 key).
- **Chain → Storage**: The chain stores the CID and hashes. If the storage blob is altered, the `encryptedHash` check will fail.
- **Tampering detection**: On startup, `verifyIntegrity()` compares local file hashes against chain records. Any mismatch is reported.
- **No read interception**: `readFileSync` is NOT hooked. Reads go directly to disk. Chain is consulted only at startup (restore) and on explicit verify/restore commands.
