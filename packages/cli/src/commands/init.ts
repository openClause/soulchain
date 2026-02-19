import { Command } from 'commander';
import { initSoulchain } from '@soulchain/openclaw';
import type { InitOptions } from '@soulchain/openclaw';
import { printLogo, success, info, progressBar, colors } from '../branding';

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

export const initCommand = new Command('init')
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
        console.log(`  ${colors.purple(c.name.padEnd(15))} ${colors.dim(c.label)}`);
      }
      return;
    }

    printLogo();
    console.log(info('Initializing SoulChain...'));
    console.log('');

    const workspaceDir = process.cwd();

    let chainConfig: any;
    if (opts.chain === 'self-hosted') {
      chainConfig = {
        type: 'self-hosted' as const,
        port: parseInt(opts.port, 10),
        engine: opts.engine,
        autoStart: true,
        contractAddress: opts.contract,
      };
    } else if (opts.chain === 'custom') {
      if (!opts.rpcUrl) {
        console.error(colors.red('❌ Custom chain requires --rpc-url'));
        process.exit(1);
      }
      chainConfig = {
        type: 'custom' as const,
        rpcUrl: opts.rpcUrl,
        chainId: opts.chainId ? parseInt(opts.chainId, 10) : undefined,
        contractAddress: opts.contract,
      };
    } else {
      chainConfig = opts.chain;
    }

    const options: InitOptions = {
      chain: chainConfig,
      storage: opts.storage,
      passphrase: opts.passphrase,
      autoMigrate: opts.migrate !== false,
    };

    console.log(`  ▸ Generating Ed25519 keypair...       ${progressBar(1, 1)} ${colors.green('✅')}`);

    const result = await initSoulchain(workspaceDir, options);

    console.log(`  ▸ Creating encrypted keystore...      ${progressBar(1, 1)} ${colors.green('✅')}`);
    console.log(`  ▸ Registering soul on chain...         ${progressBar(1, 1)} ${colors.green('✅')} ${colors.dim('tx: ' + (result.registrationTx || '').slice(0, 10) + '...')}`);

    if (result.migration) {
      const m = result.migration;
      console.log(`  ▸ Scanning workspace...               ${progressBar(m.filesFound, m.filesFound)} ${colors.cyan(m.filesFound + ' files found')}`);
      console.log(`  ▸ Migrating to chain...               ${progressBar(m.filesUploaded, m.filesFound)} ${colors.cyan(m.filesUploaded + '/' + m.filesFound)}`);
      if (m.filesFailed.length > 0) {
        console.log(colors.yellow(`    ⚠️  Failed: ${m.filesFailed.join(', ')}`));
      }
    }

    console.log('');
    console.log(success('Soul secured.'));
    console.log('');
    console.log(`  📍 ${colors.dim('Address:')}    ${colors.purple(result.address)}`);
    console.log(`  🔗 ${colors.dim('Chain:')}      ${colors.cyan(String(opts.chain))}`);
    console.log(`  📦 ${colors.dim('Storage:')}    ${colors.cyan(String(opts.storage))}`);
    console.log(`  🔐 ${colors.dim('Keystore:')}   ${colors.cyan(result.keystorePath)}`);
    if (result.migration) {
      console.log(`  📂 ${colors.dim('Tracked:')}    ${colors.green(result.migration.filesUploaded + ' files')}`);
    }
    console.log('');
  });
