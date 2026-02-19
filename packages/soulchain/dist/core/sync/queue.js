"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncQueue = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = require("path");
class SyncQueue {
    constructor(dbPath) {
        (0, fs_1.mkdirSync)((0, path_1.dirname)(dbPath), { recursive: true });
        this.db = new better_sqlite3_1.default(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        doc_type INTEGER NOT NULL,
        path TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        encrypted_data BLOB NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        retries INTEGER NOT NULL DEFAULT 0,
        error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    }
    enqueue(item) {
        const id = (0, crypto_1.randomUUID)();
        const now = new Date().toISOString();
        this.db.prepare(`
      INSERT INTO sync_queue (id, doc_type, path, content_hash, encrypted_data, status, retries, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?)
    `).run(id, item.docType, item.path, item.contentHash, item.encryptedData, now, now);
        return id;
    }
    dequeue(limit) {
        const now = new Date().toISOString();
        const rows = this.db.prepare(`
      SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?
    `).all(limit);
        // Mark as processing
        const updateStmt = this.db.prepare(`UPDATE sync_queue SET status = 'processing', updated_at = ? WHERE id = ?`);
        for (const row of rows) {
            updateStmt.run(now, row.id);
        }
        return rows.map(this.rowToItem);
    }
    markComplete(id) {
        this.db.prepare(`UPDATE sync_queue SET status = 'complete', updated_at = ? WHERE id = ?`)
            .run(new Date().toISOString(), id);
    }
    markFailed(id, error) {
        this.db.prepare(`
      UPDATE sync_queue SET status = 'failed', error = ?, retries = retries + 1, updated_at = ? WHERE id = ?
    `).run(error, new Date().toISOString(), id);
    }
    requeue(id) {
        this.db.prepare(`UPDATE sync_queue SET status = 'pending', updated_at = ? WHERE id = ?`)
            .run(new Date().toISOString(), id);
    }
    compact() {
        // Keep only the latest entry per path, remove older completed/failed entries
        this.db.exec(`
      DELETE FROM sync_queue WHERE id NOT IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY path ORDER BY rowid DESC) as rn
          FROM sync_queue
        ) WHERE rn = 1
      )
    `);
    }
    pending() {
        const row = this.db.prepare(`SELECT COUNT(*) as count FROM sync_queue WHERE status IN ('pending', 'processing')`).get();
        return row.count;
    }
    close() {
        this.db.close();
    }
    rowToItem(row) {
        return {
            id: row.id,
            docType: row.doc_type,
            path: row.path,
            contentHash: row.content_hash,
            encryptedData: row.encrypted_data,
            status: row.status,
            retries: row.retries,
            error: row.error ?? undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}
exports.SyncQueue = SyncQueue;
