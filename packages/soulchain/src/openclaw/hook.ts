import * as fs from 'fs';
import * as path from 'path';
import type { SyncEngine } from '../core/index';

export class SoulchainHook {
  private engine: SyncEngine;
  private trackedPaths: Set<string>;
  private workspaceDir: string;
  private installed = false;

  // Store originals
  private originalWriteFileSync: typeof fs.writeFileSync = fs.writeFileSync;
  private originalWriteFile: typeof fs.writeFile = fs.writeFile;
  private originalPromisesWriteFile: typeof fs.promises.writeFile = fs.promises.writeFile;

  constructor(engine: SyncEngine, workspaceDir: string, trackedPaths: string[]) {
    this.engine = engine;
    this.workspaceDir = path.resolve(workspaceDir);
    this.trackedPaths = new Set(trackedPaths.map(p => path.resolve(workspaceDir, p)));
  }

  install(): void {
    if (this.installed) return;

    const self = this;
    const origSync = this.originalWriteFileSync;
    const origAsync = this.originalWriteFile;
    const origPromises = this.originalPromisesWriteFile;

    // Patch writeFileSync
    (fs as any).writeFileSync = function patchedWriteFileSync(
      file: fs.PathOrFileDescriptor,
      data: any,
      options?: fs.WriteFileOptions
    ) {
      origSync.call(fs, file, data, options);
      self.maybeIntercept(file, data);
    };

    // Patch writeFile (callback)
    (fs as any).writeFile = function patchedWriteFile(
      file: fs.PathOrFileDescriptor,
      data: any,
      optionsOrCb: any,
      cb?: any
    ) {
      const callback = typeof optionsOrCb === 'function' ? optionsOrCb : cb;
      const options = typeof optionsOrCb === 'function' ? undefined : optionsOrCb;

      const args: any[] = [file, data];
      if (options) args.push(options);
      args.push((err: any) => {
        if (!err) self.maybeIntercept(file, data);
        if (callback) callback(err);
      });
      (origAsync as any).apply(fs, args);
    };

    // Patch promises.writeFile
    (fs.promises as any).writeFile = async function patchedPromisesWriteFile(
      file: fs.PathLike | fs.promises.FileHandle,
      data: any,
      options?: any
    ) {
      await origPromises.call(fs.promises, file, data, options);
      self.maybeIntercept(file, data);
    };

    this.installed = true;
  }

  uninstall(): void {
    if (!this.installed) return;
    (fs as any).writeFileSync = this.originalWriteFileSync;
    (fs as any).writeFile = this.originalWriteFile;
    (fs.promises as any).writeFile = this.originalPromisesWriteFile;
    this.installed = false;
  }

  private maybeIntercept(file: fs.PathOrFileDescriptor | fs.PathLike | fs.promises.FileHandle, data: any): void {
    if (typeof file !== 'string') return;
    const resolved = path.resolve(file);
    if (!this.trackedPaths.has(resolved)) return;
    this.onWrite(resolved, Buffer.isBuffer(data) ? data : Buffer.from(String(data)));
  }

  private onWrite(filepath: string, data: Buffer): void {
    // Fire and forget — don't block the caller
    const relativePath = path.relative(this.workspaceDir, filepath);
    this.engine.onFileWrite(relativePath, data).catch(err => {
      console.error(`[soulchain] sync error for ${relativePath}:`, err.message);
    });
  }
}
