import { Command } from 'commander';
import { success, info, colors } from '../branding';

export const registerChildCommand = new Command('register-child')
  .description('Register a child agent under the current agent')
  .argument('<child-address>', 'Address of the child agent')
  .action(async (childAddress: string) => {
    info(`Registering child agent: ${childAddress}`);
    
    const { getEngine } = await import('../../openclaw/extension');
    const engine = getEngine();
    if (!engine) {
      console.error(colors.red('SoulChain not activated. Run `soulchain init` first.'));
      process.exit(1);
    }

    const txHash = await engine.registerChild(childAddress);
    success(`Child registered → tx: ${txHash.slice(0, 16)}...`);
  });
