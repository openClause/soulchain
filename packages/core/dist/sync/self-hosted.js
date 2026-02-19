"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicAnchor = exports.SelfHostedChain = void 0;
const child_process_1 = require("child_process");
const chain_evm_1 = require("./chain-evm");
/**
 * Manages a local Anvil or Hardhat node for self-hosted chain operation.
 */
class SelfHostedChain {
    config;
    process = null;
    _running = false;
    constructor(config) {
        this.config = config;
    }
    async start() {
        if (this._running)
            return;
        const { engine, port, dataDir } = this.config;
        if (engine === 'anvil') {
            this.process = (0, child_process_1.spawn)('anvil', [
                '--port', String(port),
                '--state', `${dataDir}/anvil-state.json`,
                '--silent',
            ], { stdio: 'pipe' });
        }
        else {
            this.process = (0, child_process_1.spawn)('npx', [
                'hardhat', 'node',
                '--port', String(port),
            ], { stdio: 'pipe', cwd: dataDir });
        }
        // Wait for the node to be ready
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error(`${engine} failed to start within 15s`)), 15000);
            const onData = (data) => {
                const str = data.toString();
                if (str.includes('Listening') || str.includes('Started')) {
                    clearTimeout(timeout);
                    this._running = true;
                    resolve();
                }
            };
            this.process.stdout?.on('data', onData);
            this.process.stderr?.on('data', onData);
            this.process.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
            this.process.on('exit', (code) => {
                if (!this._running) {
                    clearTimeout(timeout);
                    reject(new Error(`${engine} exited with code ${code}`));
                }
            });
        });
    }
    async stop() {
        if (!this.process)
            return;
        this.process.kill('SIGTERM');
        await new Promise((resolve) => {
            const timeout = setTimeout(() => {
                this.process?.kill('SIGKILL');
                resolve();
            }, 5000);
            this.process.on('exit', () => {
                clearTimeout(timeout);
                resolve();
            });
        });
        this.process = null;
        this._running = false;
    }
    isRunning() {
        return this._running;
    }
    getRpcUrl() {
        return `http://127.0.0.1:${this.config.port}`;
    }
    /**
     * Deploy the SoulRegistry contract if not already deployed.
     * Returns the contract address.
     */
    async ensureContract() {
        // Use ethers to deploy the contract
        const { ethers } = await Promise.resolve(`${'ethers'}`).then(s => __importStar(require(s)));
        const provider = new ethers.JsonRpcProvider(this.getRpcUrl());
        // Anvil/Hardhat provide funded accounts — use the first one
        const accounts = await provider.listAccounts();
        if (accounts.length === 0)
            throw new Error('No funded accounts on local chain');
        const signer = accounts[0];
        // Minimal SoulRegistry bytecode placeholder — in production, use compiled contract
        // For now, return a deterministic address for the deployment
        const factory = new ethers.ContractFactory([
            'function registerSoul() external returns (bool)',
            'function writeDocument(uint8,string,string,string,string) external',
            'function getLatestDocument(address,uint8) external view returns (tuple(uint8,string,string,string,string,uint256,uint256))',
            'function getDocumentAt(address,uint8,uint256) external view returns (tuple(uint8,string,string,string,string,uint256,uint256))',
            'function getDocumentCount(address,uint8) external view returns (uint256)',
            'function grantAccess(address,uint8) external',
            'function revokeAccess(address,uint8) external',
        ], '0x', // bytecode — would be actual compiled contract in production
        signer);
        // In a real scenario, this would deploy the contract
        // For now we throw a helpful message
        throw new Error('Contract deployment requires compiled SoulRegistry bytecode. ' +
            'Run `pnpm --filter @openclaused/contracts build` first, then use the artifact.');
    }
}
exports.SelfHostedChain = SelfHostedChain;
/**
 * Periodically anchors the local chain state (merkle root) to a public chain
 * for tamper-evidence without requiring constant public chain writes.
 */
class PublicAnchor {
    config;
    timer = null;
    chainProvider = null;
    constructor(config) {
        this.config = config;
    }
    /**
     * Write a merkle root / state hash to the public chain.
     * Returns the transaction hash.
     */
    async anchor(localChainState) {
        if (!this.chainProvider) {
            if (!this.config.privateKey)
                throw new Error('Private key required for public anchoring');
            this.chainProvider = new chain_evm_1.EVMChainProvider(this.config.chain, this.config.privateKey);
        }
        // Write the state hash as a special document (docType 255 = anchor)
        return this.chainProvider.writeDocument(255, localChainState, '', '', '');
    }
    /**
     * Start periodic anchoring.
     * @param getState Function that returns current local chain state hash
     */
    start(getState) {
        if (!this.config.enabled || this.timer)
            return;
        const intervalMs = this.config.intervalHours * 60 * 60 * 1000;
        this.timer = setInterval(async () => {
            if (getState) {
                try {
                    const state = await getState();
                    await this.anchor(state);
                }
                catch (err) {
                    console.error(`[soulchain] public anchor failed: ${err.message}`);
                }
            }
        }, intervalMs);
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
}
exports.PublicAnchor = PublicAnchor;
//# sourceMappingURL=self-hosted.js.map