import * as fs from 'fs';
import * as path from 'path';
import type { SoulchainConfig, SyncEngine } from '../core/index';

export class FileWatcher {
  private config: SoulchainConfig;
  private engine: SyncEngine;
  private workspaceDir: string;
  private watchers: fs.FSWatcher[] = [];
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private debounceMs = 500;

  constructor(config: SoulchainConfig, engine: SyncEngine, workspaceDir: string) {
    this.config = config;
    this.engine = engine;
    this.workspaceDir = path.resolve(workspaceDir);
  }

  start(): void {
    for (const trackedPath of this.config.trackedPaths) {
      const resolved = path.resolve(this.workspaceDir, trackedPath);
      try {
        const watcher = fs.watch(resolved, (_event) => {
          this.handleChange(trackedPath, resolved);
        });
        this.watchers.push(watcher);
      } catch {
        // File may not exist yet — that's fine
      }
    }
  }

  stop(): void {
    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  private handleChange(relativePath: string, absolutePath: string): void {
    // Debounce
    const existing = this.debounceTimers.get(relativePath);
    if (existing) clearTimeout(existing);

    this.debounceTimers.set(relativePath, setTimeout(() => {
      this.debounceTimers.delete(relativePath);
      try {
        const content = fs.readFileSync(absolutePath);
        this.engine.onFileWrite(relativePath, content).catch(err => {
          console.error(`[soulchain] watcher sync error for ${relativePath}:`, err.message);
        });
      } catch {
        // File may have been deleted
      }
    }, this.debounceMs));
  }
}
