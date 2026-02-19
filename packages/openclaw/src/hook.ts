import * as fs from 'fs';
import * as path from 'path';

// Get the mutable CommonJS fs module for monkey-patching (import * creates frozen namespace)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mutableFs: any = require('fs');
import type { SyncEngine } from '@openclaused/core';

export class SoulchainHook {
  private engine: SyncEngine;
  private trackedPaths: Set<string>;
  private workspaceDir: string;
  private installed = false;

  // Store originals — writes
  private originalWriteFileSync: typeof fs.writeFileSync = fs.writeFileSync;
  private originalWriteFile: typeof fs.writeFile = fs.writeFile;
  private originalPromisesWriteFile: typeof fs.promises.writeFile = fs.promises.writeFile;

  // Store originals — existence/stat
  private originalExistsSync: typeof fs.existsSync = fs.existsSync;
  private originalAccessSync: typeof fs.accessSync = fs.accessSync;
  private originalAccess: typeof fs.access = fs.access;
  private originalStatSync: typeof fs.statSync = fs.statSync;
  private originalStat: typeof fs.stat = fs.stat;
  private originalPromisesAccess: typeof fs.promises.access = fs.promises.access;
  private originalPromisesStat: typeof fs.promises.stat = fs.promises.stat;

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
    mutableFs.writeFileSync = function patchedWriteFileSync(
      file: fs.PathOrFileDescriptor,
      data: any,
      options?: fs.WriteFileOptions
    ) {
      origSync.call(fs, file, data, options);
      self.maybeIntercept(file, data);
    };

    // Patch writeFile (callback)
    mutableFs.writeFile = function patchedWriteFile(
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
    mutableFs.promises.writeFile = async function patchedPromisesWriteFile(
      file: fs.PathLike | fs.promises.FileHandle,
      data: any,
      options?: any
    ) {
      await origPromises.call(fs.promises, file, data, options);
      self.maybeIntercept(file, data);
    };

    // ===== EXISTENCE / STAT HOOKS =====

    mutableFs.existsSync = function patchedExistsSync(p: fs.PathLike): boolean {
      if (self.originalExistsSync.call(fs, p)) return true;
      return self.isTrackedPath(p as any);
    };

    mutableFs.accessSync = function patchedAccessSync(p: fs.PathLike, mode?: number): void {
      try {
        return self.originalAccessSync.call(fs, p, mode);
      } catch (err: any) {
        if (err?.code === 'ENOENT' && self.isTrackedPath(p as any)) return;
        throw err;
      }
    };

    mutableFs.access = function patchedAccess(p: fs.PathLike, ...args: any[]) {
      const callback = args[args.length - 1];
      const mode = args.length > 1 ? args[0] : undefined;
      const origArgs: any[] = [p];
      if (mode !== undefined) origArgs.push(mode);
      origArgs.push((err: any) => {
        if (err?.code === 'ENOENT' && self.isTrackedPath(p as any)) {
          callback(null);
        } else {
          callback(err);
        }
      });
      (self.originalAccess as any).apply(fs, origArgs);
    };

    mutableFs.statSync = function patchedStatSync(p: fs.PathLike, options?: any): any {
      try {
        return self.originalStatSync.call(fs, p, options);
      } catch (err: any) {
        if (err?.code === 'ENOENT' && self.isTrackedPath(p as any)) {
          return self.createFakeStat();
        }
        throw err;
      }
    };

    mutableFs.stat = function patchedStat(p: fs.PathLike, ...args: any[]) {
      const callback = args[args.length - 1];
      const options = args.length > 1 ? args[0] : undefined;
      const origArgs: any[] = [p];
      if (options && typeof options !== 'function') origArgs.push(options);
      origArgs.push((err: any, stats: any) => {
        if (err?.code === 'ENOENT' && self.isTrackedPath(p as any)) {
          callback(null, self.createFakeStat());
        } else {
          callback(err, stats);
        }
      });
      (self.originalStat as any).apply(fs, origArgs);
    };

    mutableFs.promises.access = async function patchedPromisesAccess(p: fs.PathLike, mode?: number): Promise<void> {
      try {
        return await self.originalPromisesAccess.call(fs.promises, p, mode);
      } catch (err: any) {
        if (err?.code === 'ENOENT' && self.isTrackedPath(p as any)) return;
        throw err;
      }
    };

    mutableFs.promises.stat = async function patchedPromisesStat(p: fs.PathLike, options?: any): Promise<any> {
      try {
        return await self.originalPromisesStat.call(fs.promises, p, options);
      } catch (err: any) {
        if (err?.code === 'ENOENT' && self.isTrackedPath(p as any)) {
          return self.createFakeStat();
        }
        throw err;
      }
    };

    this.installed = true;
  }

  private isTrackedPath(file: any): boolean {
    if (typeof file !== 'string') return false;
    const resolved = path.resolve(this.workspaceDir, file);
    return this.trackedPaths.has(resolved);
  }

  private createFakeStat(): any {
    const now = new Date();
    return {
      isFile: () => true,
      isDirectory: () => false,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isSymbolicLink: () => false,
      isFIFO: () => false,
      isSocket: () => false,
      dev: 0, ino: 0, mode: 0o100644, nlink: 1,
      uid: 1000, gid: 1000, rdev: 0, size: 1024,
      blksize: 4096, blocks: 8,
      atimeMs: now.getTime(), mtimeMs: now.getTime(),
      ctimeMs: now.getTime(), birthtimeMs: now.getTime(),
      atime: now, mtime: now, ctime: now, birthtime: now,
    };
  }

  uninstall(): void {
    if (!this.installed) return;
    mutableFs.writeFileSync = this.originalWriteFileSync;
    mutableFs.writeFile = this.originalWriteFile;
    mutableFs.promises.writeFile = this.originalPromisesWriteFile;
    mutableFs.existsSync = this.originalExistsSync;
    mutableFs.accessSync = this.originalAccessSync;
    mutableFs.access = this.originalAccess;
    mutableFs.statSync = this.originalStatSync;
    mutableFs.stat = this.originalStat;
    mutableFs.promises.access = this.originalPromisesAccess;
    mutableFs.promises.stat = this.originalPromisesStat;
    this.installed = false;
  }

  private maybeIntercept(file: fs.PathOrFileDescriptor | fs.PathLike | fs.promises.FileHandle, data: any): void {
    if (typeof file !== 'string') return;
    const resolved = path.resolve(this.workspaceDir, file);
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
