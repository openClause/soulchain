import { ChildProcess, spawn } from 'child_process';
import type { ChainProvider } from './chain';
import { EVMChainProvider } from './chain-evm';

export interface SelfHostedConfig {
  dataDir: string;
  port: number;
  engine: 'anvil' | 'hardhat';
}

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

  async start(): Promise<void> {
    if (this._running) return;

    const { engine, port, dataDir } = this.config;

    if (engine === 'anvil') {
      this.process = spawn('anvil', [
        '--port', String(port),
        '--state', `${dataDir}/anvil-state.json`,
        '--silent',
      ], { stdio: 'pipe' });
    } else {
      this.process = spawn('npx', [
        'hardhat', 'node',
        '--port', String(port),
      ], { stdio: 'pipe', cwd: dataDir });
    }

    // Wait for the node to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`${engine} failed to start within 15s`)), 15000);

      const onData = (data: Buffer) => {
        const str = data.toString();
        if (str.includes('Listening') || str.includes('Started')) {
          clearTimeout(timeout);
          this._running = true;
          resolve();
        }
      };

      this.process!.stdout?.on('data', onData);
      this.process!.stderr?.on('data', onData);

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
   * Returns the contract address.
   */
  async ensureContract(): Promise<string> {
    // Use ethers to deploy the contract
    const { ethers } = await import(/* webpackIgnore: true */ 'ethers' as string);
    const provider = new ethers.JsonRpcProvider(this.getRpcUrl());
    // Anvil/Hardhat provide funded accounts — use the first one
    const accounts = await provider.listAccounts();
    if (accounts.length === 0) throw new Error('No funded accounts on local chain');
    const signer = accounts[0];

    // Minimal SoulRegistry bytecode placeholder — in production, use compiled contract
    // For now, return a deterministic address for the deployment
    const factory = new ethers.ContractFactory(
      [
        'function registerSoul() external returns (bool)',
        'function writeDocument(uint8,string,string,string,string) external',
        'function getLatestDocument(address,uint8) external view returns (tuple(uint8,string,string,string,string,uint256,uint256))',
        'function getDocumentAt(address,uint8,uint256) external view returns (tuple(uint8,string,string,string,string,uint256,uint256))',
        'function getDocumentCount(address,uint8) external view returns (uint256)',
        'function grantAccess(address,uint8) external',
        'function revokeAccess(address,uint8) external',
      ],
      '0x', // bytecode — would be actual compiled contract in production
      signer
    );

    // In a real scenario, this would deploy the contract
    // For now we throw a helpful message
    throw new Error(
      'Contract deployment requires compiled SoulRegistry bytecode. ' +
      'Run `pnpm --filter @soulchain/contracts build` first, then use the artifact.'
    );
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

  /**
   * Write a merkle root / state hash to the public chain.
   * Returns the transaction hash.
   */
  async anchor(localChainState: string): Promise<string> {
    if (!this.chainProvider) {
      if (!this.config.privateKey) throw new Error('Private key required for public anchoring');
      this.chainProvider = new EVMChainProvider(this.config.chain, this.config.privateKey);
    }
    // Write the state hash as a special document (docType 255 = anchor)
    return this.chainProvider.writeDocument(255, localChainState, '', '', '');
  }

  /**
   * Start periodic anchoring.
   * @param getState Function that returns current local chain state hash
   */
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
