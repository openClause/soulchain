export interface SelfHostedConfig {
    dataDir: string;
    port: number;
    engine: 'anvil' | 'hardhat';
}
/**
 * Manages a local Anvil or Hardhat node for self-hosted chain operation.
 */
export declare class SelfHostedChain {
    private config;
    private process;
    private _running;
    constructor(config: SelfHostedConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    isRunning(): boolean;
    getRpcUrl(): string;
    /**
     * Deploy the SoulRegistry contract if not already deployed.
     * Returns the contract address.
     */
    ensureContract(): Promise<string>;
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
export declare class PublicAnchor {
    private config;
    private timer;
    private chainProvider;
    constructor(config: PublicAnchorConfig);
    /**
     * Write a merkle root / state hash to the public chain.
     * Returns the transaction hash.
     */
    anchor(localChainState: string): Promise<string>;
    /**
     * Start periodic anchoring.
     * @param getState Function that returns current local chain state hash
     */
    start(getState?: () => Promise<string>): void;
    stop(): void;
}
//# sourceMappingURL=self-hosted.d.ts.map