import { ChildProcess, spawn, execSync, execFileSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import type { ChainProvider } from './chain';
import { EVMChainProvider } from './chain-evm';

export interface SelfHostedConfig {
  dataDir: string;
  port: number;
  engine: 'anvil' | 'hardhat';
}

// Use the SECOND Anvil deterministic account for contract deployment
// so that the first account's nonce stays clean for EVMChainProvider operations.
const DEPLOY_PRIVATE_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'; // account[1]

// First Anvil account — used by EVMChainProvider for soul operations
export const ANVIL_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // account[0]

/**
 * Manages a local Anvil or Hardhat node for self-hosted chain operation.
 */
export class SelfHostedChain {
  private config: SelfHostedConfig;
  private process: ChildProcess | null = null;
  private _running = false;

  constructor(config: SelfHostedConfig) {
    this.config = config;
  }

  /**
   * Find the anvil binary. Searches ~/.foundry/bin, common system paths, then PATH.
   */
  private findAnvil(): string {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
    const candidates = [
      join(home, '.foundry', 'bin', 'anvil'),
      '/usr/local/bin/anvil',
      '/usr/bin/anvil',
    ];
    for (const c of candidates) {
      if (existsSync(c)) return c;
    }
    try {
      return execSync('which anvil', { encoding: 'utf-8' }).trim();
    } catch {}
    return 'anvil';
  }

  /**
   * Ensure Anvil (Foundry) is installed. If not found, auto-install it.
   * Call this before start() — typically during `soulchain init`.
   */
  async ensureAnvil(): Promise<string> {
    const existing = this.findAnvil();
    if (existsSync(existing)) return existing;

    // Try to find it via PATH
    try {
      execSync('anvil --version', { stdio: 'ignore' });
      return 'anvil';
    } catch {}

    // Not found — install Foundry
    const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
    const foundryBin = join(home, '.foundry', 'bin');

    console.log('[soulchain] Anvil not found. Installing Foundry...');

    // Step 1: Install foundryup
    try {
      execSync('curl -L https://foundry.paradigm.xyz | bash', {
        stdio: 'pipe',
        env: { ...process.env, SHELL: '/bin/bash' },
      });
    } catch (e: any) {
      throw new Error(`Failed to install foundryup: ${e.message}`);
    }

    // Step 2: Run foundryup to install anvil/forge/cast
    const foundryup = join(foundryBin, 'foundryup');
    if (!existsSync(foundryup)) {
      throw new Error(`foundryup not found at ${foundryup} after install`);
    }

    try {
      execSync(foundryup, {
        stdio: 'pipe',
        env: { ...process.env, PATH: `${foundryBin}:${process.env.PATH}` },
        timeout: 120000, // 2 min timeout for download
      });
    } catch (e: any) {
      throw new Error(`foundryup failed: ${e.message}`);
    }

    // Step 3: Verify
    const anvilPath = join(foundryBin, 'anvil');
    if (!existsSync(anvilPath)) {
      throw new Error(`Anvil not found at ${anvilPath} after foundryup`);
    }

    // Update process PATH so subsequent calls find it
    process.env.PATH = `${foundryBin}:${process.env.PATH}`;

    console.log('[soulchain] ✅ Foundry installed successfully');
    return anvilPath;
  }

  async start(): Promise<void> {
    if (this._running) return;

    const { engine, port, dataDir } = this.config;

    // Check if port is already in use (another Anvil instance)
    try {
      const res = await fetch(`http://127.0.0.1:${port}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
      });
      if (res.ok) {
        this._running = true;
        console.log(`[soulchain] Anvil already running on port ${port}`);
        return;
      }
    } catch {} // not running, proceed to spawn

    // Ensure data dir exists
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

    if (engine === 'anvil') {
      const anvilBin = this.findAnvil();
      const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
      const envPath = [join(home, '.foundry', 'bin'), process.env.PATH].filter(Boolean).join(':');
      this.process = spawn(anvilBin, [
        '--port', String(port),
        '--state', join(dataDir, 'anvil-state.json'),
      ], { stdio: 'pipe', env: { ...process.env, PATH: envPath } });
    } else {
      this.process = spawn('npx', [
        'hardhat', 'node',
        '--port', String(port),
      ], { stdio: 'pipe', cwd: dataDir });
    }

    // Wait for the node to be ready by polling the RPC endpoint
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`${engine} failed to start within 15s`)), 15000);

      this.process!.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      this.process!.on('exit', (code) => {
        if (!this._running) {
          clearTimeout(timeout);
          reject(new Error(`${engine} exited with code ${code}`));
        }
      });

      const poll = async () => {
        try {
          const resp = await fetch(`http://127.0.0.1:${port}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
          });
          if (resp.ok) {
            clearTimeout(timeout);
            this._running = true;
            resolve();
            return;
          }
        } catch {}
        setTimeout(poll, 200);
      };
      setTimeout(poll, 300);
    });
  }

  async stop(): Promise<void> {
    if (!this.process) return;
    this.process.kill('SIGTERM');
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        this.process?.kill('SIGKILL');
        resolve();
      }, 5000);
      this.process!.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
    this.process = null;
    this._running = false;
  }

  isRunning(): boolean {
    return this._running;
  }

  getRpcUrl(): string {
    return `http://127.0.0.1:${this.config.port}`;
  }

  /**
   * Deploy the SoulRegistry contract if not already deployed.
   * Uses the SECOND Anvil account for deployment to avoid nonce conflicts
   * with the first account used by EVMChainProvider.
   * Returns the contract address.
   */
  async ensureContract(): Promise<string> {
    // Check for saved contract address
    const addressFile = join(this.config.dataDir, 'contract-address.json');
    if (existsSync(addressFile)) {
      try {
        const saved = JSON.parse(readFileSync(addressFile, 'utf-8'));
        if (saved.address) {
          // Verify contract still exists at this address
          const { ethers } = await import(/* webpackIgnore: true */ 'ethers' as string);
          const provider = new ethers.JsonRpcProvider(this.getRpcUrl());
          const code = await provider.getCode(saved.address);
          if (code && code !== '0x') {
            return saved.address;
          }
        }
      } catch {}
    }

    // Load compiled artifact
    const { ethers } = await import(/* webpackIgnore: true */ 'ethers' as string);
    let artifact: { abi: any[]; bytecode: string } | undefined;

    // Try multiple locations for the artifact
    const artifactPaths = [
      resolve(__dirname, '../../artifacts/SoulRegistry.json'),
      resolve(__dirname, '../../../artifacts/SoulRegistry.json'),
      resolve(process.cwd(), 'node_modules/@openclaused/soulchain/artifacts/SoulRegistry.json'),
      resolve(process.cwd(), 'node_modules/@openclaused/core/artifacts/SoulRegistry.json'),
    ];

    for (const p of artifactPaths) {
      if (existsSync(p)) {
        artifact = JSON.parse(readFileSync(p, 'utf-8'));
        break;
      }
    }
    if (!artifact) {
      throw new Error(
        'SoulRegistry artifact not found. Searched:\n' +
        artifactPaths.map(p => `  - ${p}`).join('\n')
      );
    }

    // Deploy using SECOND Anvil account (avoids nonce collision with account[0])
    const provider = new ethers.JsonRpcProvider(this.getRpcUrl());
    const deployer = new ethers.Wallet(DEPLOY_PRIVATE_KEY, provider);

    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    const address = await contract.getAddress();

    // Persist address
    const dir = dirname(addressFile);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(addressFile, JSON.stringify({ address, deployedAt: new Date().toISOString() }, null, 2));

    return address;
  }
}

export interface PublicAnchorConfig {
  enabled: boolean;
  chain: string;
  intervalHours: number;
  privateKey?: string;
  contractAddress?: string;
}

/**
 * Periodically anchors the local chain state (merkle root) to a public chain
 * for tamper-evidence without requiring constant public chain writes.
 */
export class PublicAnchor {
  private config: PublicAnchorConfig;
  private timer: ReturnType<typeof setInterval> | null = null;
  private chainProvider: EVMChainProvider | null = null;

  constructor(config: PublicAnchorConfig) {
    this.config = config;
  }

  async anchor(localChainState: string): Promise<string> {
    if (!this.chainProvider) {
      if (!this.config.privateKey) throw new Error('Private key required for public anchoring');
      this.chainProvider = new EVMChainProvider(this.config.chain, this.config.privateKey);
    }
    return this.chainProvider.writeDocument(255, localChainState, '', '', '');
  }

  start(getState?: () => Promise<string>): void {
    if (!this.config.enabled || this.timer) return;
    const intervalMs = this.config.intervalHours * 60 * 60 * 1000;
    this.timer = setInterval(async () => {
      if (getState) {
        try {
          const state = await getState();
          await this.anchor(state);
        } catch (err: any) {
          console.error(`[soulchain] public anchor failed: ${err.message}`);
        }
      }
    }, intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
