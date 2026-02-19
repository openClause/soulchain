"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChainProvider = createChainProvider;
const chain_mock_1 = require("./chain-mock");
const chain_evm_1 = require("./chain-evm");
/**
 * Create a ChainProvider from a SoulchainConfig chain field.
 * Accepts a string name (e.g. 'base-sepolia', 'mock') or a full ChainConfig object.
 */
function createChainProvider(chain, privateKey) {
    // Simple string form
    if (typeof chain === 'string') {
        if (chain === 'mock')
            return new chain_mock_1.MockChainProvider();
        if (chain in chain_evm_1.CHAINS)
            return new chain_evm_1.EVMChainProvider(chain, privateKey);
        throw new Error(`Unknown chain: ${chain}`);
    }
    // Full config object
    const config = chain;
    if (config.type === 'self-hosted') {
        // Self-hosted uses localhost EVM provider
        const rpcUrl = config.rpcUrl ?? `http://127.0.0.1:${config.port ?? 8545}`;
        return new chain_evm_1.EVMChainProvider({
            name: config.name ?? 'Self-hosted',
            rpcUrl,
            chainId: config.chainId ?? 31337,
            contractAddress: config.contractAddress,
            privateKey,
        });
    }
    if (config.type === 'custom') {
        if (!config.rpcUrl)
            throw new Error('Custom chain requires rpcUrl');
        return new chain_evm_1.EVMChainProvider({
            name: config.name ?? 'Custom',
            rpcUrl: config.rpcUrl,
            chainId: config.chainId ?? 1,
            contractAddress: config.contractAddress,
            privateKey,
        });
    }
    // type === 'public'
    const chainName = config.name ?? 'base-sepolia';
    if (chainName in chain_evm_1.CHAINS) {
        const preset = chain_evm_1.CHAINS[chainName];
        return new chain_evm_1.EVMChainProvider({
            ...preset,
            contractAddress: config.contractAddress ?? preset.contractAddress,
            privateKey,
        });
    }
    throw new Error(`Unknown public chain: ${chainName}`);
}
//# sourceMappingURL=factory.js.map