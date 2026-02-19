import { SyncEngine } from '../core/index';
export declare function activate(workspaceDir: string, passphrase?: string): Promise<void>;
export declare function deactivate(): Promise<void>;
export declare function getEngine(): SyncEngine | null;
