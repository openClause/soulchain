import type { SyncEngine, IntegrityReport, SoulchainConfig } from '../core/index';
export declare function verifyOnStartup(engine: SyncEngine, _config: SoulchainConfig): Promise<IntegrityReport>;
