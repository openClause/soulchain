"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCommand = void 0;
const commander_1 = require("commander");
const openclaw_1 = require("@soulchain/openclaw");
const branding_1 = require("../branding");
const CHAIN_CHOICES = [
    { name: 'base', label: 'Base (recommended — cheapest, Coinbase-backed)' },
    { name: 'base-sepolia', label: 'Base Sepolia (testnet)' },
    { name: 'arbitrum', label: 'Arbitrum One' },
    { name: 'optimism', label: 'Optimism' },
    { name: 'polygon', label: 'Polygon' },
    { name: 'ethereum', label: 'Ethereum L1 (expensive)' },
    { name: 'self-hosted', label: 'Self-hosted (private, zero cost)' },
    { name: 'custom', label: 'Custom EVM (provide RPC URL)' },
];
exports.initCommand = new commander_1.Command('init')
    .description('Initialize SoulChain in current workspace')
    .option('-c, --chain <chain>', 'blockchain network (base, base-sepolia, arbitrum, optimism, polygon, ethereum, self-hosted, custom)', 'base-sepolia')
    .option('-s, --storage <storage>', 'storage provider', 'mock')
    .option('-p, --passphrase <passphrase>', 'keystore passphrase')
    .option('--rpc-url <url>', 'custom RPC URL (for custom chain)')
    .option('--chain-id <id>', 'custom chain ID')
    .option('--contract <address>', 'existing contract address')
    .option('--port <port>', 'self-hosted chain port', '8545')
    .option('--engine <engine>', 'self-hosted engine (anvil or hardhat)', 'anvil')
    .option('--no-migrate', 'skip migrating existing files')
    .option('--list-chains', 'list available chains')
    .action(async (opts) => {
    if (opts.listChains) {
        console.log('Available chains:');
        for (const c of CHAIN_CHOICES) {
            console.log(`  ${branding_1.colors.purple(c.name.padEnd(15))} ${branding_1.colors.dim(c.label)}`);
        }
        return;
    }
    (0, branding_1.printLogo)();
    console.log((0, branding_1.info)('Initializing SoulChain...'));
    console.log('');
    const workspaceDir = process.cwd();
    let chainConfig;
    if (opts.chain === 'self-hosted') {
        chainConfig = {
            type: 'self-hosted',
            port: parseInt(opts.port, 10),
            engine: opts.engine,
            autoStart: true,
            contractAddress: opts.contract,
        };
    }
    else if (opts.chain === 'custom') {
        if (!opts.rpcUrl) {
            console.error(branding_1.colors.red('❌ Custom chain requires --rpc-url'));
            process.exit(1);
        }
        chainConfig = {
            type: 'custom',
            rpcUrl: opts.rpcUrl,
            chainId: opts.chainId ? parseInt(opts.chainId, 10) : undefined,
            contractAddress: opts.contract,
        };
    }
    else {
        chainConfig = opts.chain;
    }
    const options = {
        chain: chainConfig,
        storage: opts.storage,
        passphrase: opts.passphrase,
        autoMigrate: opts.migrate !== false,
    };
    console.log(`  ▸ Generating Ed25519 keypair...       ${(0, branding_1.progressBar)(1, 1)} ${branding_1.colors.green('✅')}`);
    const result = await (0, openclaw_1.initSoulchain)(workspaceDir, options);
    console.log(`  ▸ Creating encrypted keystore...      ${(0, branding_1.progressBar)(1, 1)} ${branding_1.colors.green('✅')}`);
    console.log(`  ▸ Registering soul on chain...         ${(0, branding_1.progressBar)(1, 1)} ${branding_1.colors.green('✅')} ${branding_1.colors.dim('tx: ' + (result.registrationTx || '').slice(0, 10) + '...')}`);
    if (result.migration) {
        const m = result.migration;
        console.log(`  ▸ Scanning workspace...               ${(0, branding_1.progressBar)(m.filesFound, m.filesFound)} ${branding_1.colors.cyan(m.filesFound + ' files found')}`);
        console.log(`  ▸ Migrating to chain...               ${(0, branding_1.progressBar)(m.filesUploaded, m.filesFound)} ${branding_1.colors.cyan(m.filesUploaded + '/' + m.filesFound)}`);
        if (m.filesFailed.length > 0) {
            console.log(branding_1.colors.yellow(`    ⚠️  Failed: ${m.filesFailed.join(', ')}`));
        }
    }
    console.log('');
    console.log((0, branding_1.success)('Soul secured.'));
    console.log('');
    console.log(`  📍 ${branding_1.colors.dim('Address:')}    ${branding_1.colors.purple(result.address)}`);
    console.log(`  🔗 ${branding_1.colors.dim('Chain:')}      ${branding_1.colors.cyan(String(opts.chain))}`);
    console.log(`  📦 ${branding_1.colors.dim('Storage:')}    ${branding_1.colors.cyan(String(opts.storage))}`);
    console.log(`  🔐 ${branding_1.colors.dim('Keystore:')}   ${branding_1.colors.cyan(result.keystorePath)}`);
    if (result.migration) {
        console.log(`  📂 ${branding_1.colors.dim('Tracked:')}    ${branding_1.colors.green(result.migration.filesUploaded + ' files')}`);
    }
    console.log('');
});
//# sourceMappingURL=init.js.map