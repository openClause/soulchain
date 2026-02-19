import { Command } from 'commander';
import { success, info, colors } from '../branding';

export const readSharedCommand = new Command('read-shared')
  .description('Read another agent\'s shared document')
  .argument('<owner-address>', 'Address of the document owner')
  .argument('<doc-type>', 'Document type (e.g. MEMORY, SOUL)')
  .action(async (ownerAddress: string, docType: string) => {
    info(`Reading ${docType} from ${ownerAddress}...`);
    
    const { getEngine } = await import('../../openclaw/extension');
    const engine = getEngine();
    if (!engine) {
      console.error(colors.red('SoulChain not activated. Run `soulchain init` first.'));
      process.exit(1);
    }

    try {
      const chain = engine.getChain();
      const { SoulDocumentType } = await import('../../core/types/documents');
      const DOC_TYPE_MAP: Record<string, number> = {};
      Object.values(SoulDocumentType).forEach((v, i) => { DOC_TYPE_MAP[v] = i; });
      
      const docTypeId = DOC_TYPE_MAP[docType.toLowerCase()] ?? -1;
      if (docTypeId === -1) {
        console.error(colors.red(`Unknown document type: ${docType}`));
        process.exit(1);
      }

      const doc = await chain.latestDocumentOf(ownerAddress, docTypeId);
      if (!doc) {
        console.error(colors.red('No document found or access denied'));
        process.exit(1);
      }

      // Download and display
      const storage = engine.getStorage();
      const encryptedBuf = await storage.download(doc.cid);
      
      success(`Document found (v${doc.version}, ${encryptedBuf.length} bytes encrypted)`);
      console.log(`CID: ${doc.cid}`);
      console.log(`Content Hash: ${doc.contentHash}`);
      console.log(`Timestamp: ${new Date(doc.timestamp).toISOString()}`);
    } catch (err: any) {
      console.error(colors.red(`Access denied or error: ${err.message}`));
      process.exit(1);
    }
  });
