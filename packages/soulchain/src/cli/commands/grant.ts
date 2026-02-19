import { Command } from 'commander';
import { success, info, colors } from '../branding';

export const grantCommand = new Command('grant')
  .description('Grant another agent access to specific document types')
  .argument('<reader-address>', 'Address of the agent to grant access to')
  .requiredOption('--docs <types>', 'Comma-separated document types (e.g. MEMORY,AGENTS)')
  .action(async (readerAddress: string, opts: { docs: string }) => {
    const docTypes = opts.docs.split(',').map(d => d.trim());
    info(`Granting ${readerAddress} access to: ${docTypes.join(', ')}`);
    
    // Load engine from workspace
    const { getEngine } = await import('../../openclaw/extension');
    const engine = getEngine();
    if (!engine) {
      console.error(colors.red('SoulChain not activated. Run `soulchain init` first.'));
      process.exit(1);
    }

    const chain = engine.getChain();
    const { SoulDocumentType } = await import('../../core/types/documents');
    
    const DOC_TYPE_MAP: Record<string, number> = {};
    Object.values(SoulDocumentType).forEach((v, i) => { DOC_TYPE_MAP[v] = i; });

    for (const docType of docTypes) {
      const docTypeId = DOC_TYPE_MAP[docType.toLowerCase()] ?? -1;
      if (docTypeId === -1) {
        console.error(colors.red(`Unknown document type: ${docType}`));
        continue;
      }
      const txHash = await chain.grantAccess(readerAddress, docTypeId);
      success(`Granted ${docType} access → tx: ${txHash.slice(0, 16)}...`);
    }
    
    success('Access granted successfully');
  });
