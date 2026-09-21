import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { Asset, Transaction, User, UserRole } from '../types';
import { generateUUID } from '../utils/crypto';

export interface AuditLogEntry {
  id: string;
  action: string;
  userId?: string;
  ip?: string;
  requestId?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

class DBStore {
  private db: Database.Database;

  constructor() {
    let dbPath = ':memory:';
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      dbPath = path.join(dataDir, 'sqlite.db');
    } catch {
      dbPath = ':memory:';
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initTables();
    this.seedDefaults();
  }

  private initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'USER',
        balance_cents INTEGER NOT NULL DEFAULT 100000,
        failed_attempts INTEGER NOT NULL DEFAULT 0,
        locked_until INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        value_cents INTEGER NOT NULL,
        owner_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(owner_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        sender_id TEXT NOT NULL,
        recipient_id TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        status TEXT NOT NULL DEFAULT 'COMPLETED',
        nonce TEXT NOT NULL,
        idempotency_key TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS idempotency_records (
        key TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        response_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        user_id TEXT,
        ip TEXT,
        request_id TEXT,
        details_json TEXT,
        created_at TEXT NOT NULL
      );
    `);
  }

  public seedDefaults() {
    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM users');
    const result = countStmt.get() as { count: number };

    if (result.count === 0) {
      const passwordHash = bcrypt.hashSync('Password123!', 10);
      const now = new Date().toISOString();

      const insertUser = this.db.prepare(`
        INSERT INTO users (id, email, password_hash, name, role, balance_cents, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      insertUser.run('usr_user_1', 'user@example.com', passwordHash, 'Regular User', 'USER', 100000, now);
      insertUser.run('usr_admin_1', 'admin@example.com', passwordHash, 'System Admin', 'ADMIN', 1000000, now);
      insertUser.run('usr_digiryte_user', 'user@digiryte.com', passwordHash, 'Digiryte Standard User', 'USER', 250000, now);
      insertUser.run('usr_digiryte_admin', 'admin@digiryte.com', passwordHash, 'Digiryte Admin', 'ADMIN', 5000000, now);

      const insertAsset = this.db.prepare(`
        INSERT INTO assets (id, name, type, value_cents, owner_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      insertAsset.run('ast_1', 'Server Node Alpha', 'COMPUTE', 125000, 'usr_user_1', now);
      insertAsset.run('ast_2', 'Database Cluster Beta', 'STORAGE', 540000, 'usr_admin_1', now);
    }
  }

  // User Operations
  async createUser(data: { email: string; passwordHash: string; name: string; role?: UserRole }): Promise<User> {
    const existing = await this.findUserByEmail(data.email);
    if (existing) {
      throw new Error('User already exists');
    }

    const id = `usr_${generateUUID().substring(0, 8)}`;
    const now = new Date().toISOString();
    const role = data.role || 'USER';

    const stmt = this.db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, balance_cents, created_at)
      VALUES (?, ?, ?, ?, ?, 100000, ?)
    `);

    stmt.run(id, data.email.toLowerCase(), data.passwordHash, data.name, role, now);
    return (await this.findUserById(id))!;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
    const row = stmt.get(email.toLowerCase()) as Record<string, unknown> | undefined;
    if (!row) return null;

    return {
      id: row.id as string,
      email: row.email as string,
      passwordHash: row.password_hash as string,
      name: row.name as string,
      role: row.role as UserRole,
      createdAt: row.created_at as string,
    };
  }

  async findUserById(id: string): Promise<User | null> {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    if (!row) return null;

    return {
      id: row.id as string,
      email: row.email as string,
      passwordHash: row.password_hash as string,
      name: row.name as string,
      role: row.role as UserRole,
      createdAt: row.created_at as string,
    };
  }

  // Account Lockout Management
  async recordFailedLogin(email: string): Promise<{ locked: boolean; attempts: number }> {
    const user = await this.findUserByEmail(email);
    if (!user) return { locked: false, attempts: 0 };

    const stmt = this.db.prepare('SELECT failed_attempts, locked_until FROM users WHERE id = ?');
    const row = stmt.get(user.id) as { failed_attempts: number; locked_until: number };

    const attempts = row.failed_attempts + 1;
    let lockedUntil = row.locked_until;

    if (attempts >= 5) {
      lockedUntil = Date.now() + 15 * 60 * 1000; // Lock for 15 minutes
    }

    this.db.prepare('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?')
      .run(attempts, lockedUntil, user.id);

    return { locked: attempts >= 5, attempts };
  }

  async isAccountLocked(email: string): Promise<boolean> {
    const user = await this.findUserByEmail(email);
    if (!user) return false;

    const stmt = this.db.prepare('SELECT locked_until FROM users WHERE id = ?');
    const row = stmt.get(user.id) as { locked_until: number } | undefined;

    if (!row || !row.locked_until) return false;
    if (Date.now() > row.locked_until) {
      // Lock expired, reset
      this.db.prepare('UPDATE users SET failed_attempts = 0, locked_until = 0 WHERE id = ?').run(user.id);
      return false;
    }
    return true;
  }

  async resetLoginAttempts(userId: string): Promise<void> {
    this.db.prepare('UPDATE users SET failed_attempts = 0, locked_until = 0 WHERE id = ?').run(userId);
  }

  // Asset Operations
  async getAssets(requesterId: string, role: UserRole): Promise<Asset[]> {
    let stmt;
    if (role === 'ADMIN') {
      stmt = this.db.prepare('SELECT * FROM assets ORDER BY created_at DESC');
    } else {
      stmt = this.db.prepare('SELECT * FROM assets WHERE owner_id = ? ORDER BY created_at DESC');
    }

    const rows = (role === 'ADMIN' ? stmt.all() : stmt.all(requesterId)) as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      type: r.type as string,
      value: (r.value_cents as number) / 100,
      ownerId: r.owner_id as string,
      createdAt: r.created_at as string,
    }));
  }

  async createAsset(data: { name: string; type: string; value: number; ownerId: string }): Promise<Asset> {
    const id = `ast_${generateUUID().substring(0, 8)}`;
    const now = new Date().toISOString();
    const valueCents = Math.round(data.value * 100);

    const stmt = this.db.prepare(`
      INSERT INTO assets (id, name, type, value_cents, owner_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, data.name, data.type, valueCents, data.ownerId, now);
    return (await this.getAssetById(id))!;
  }

  async getAssetById(id: string): Promise<Asset | null> {
    const stmt = this.db.prepare('SELECT * FROM assets WHERE id = ?');
    const r = stmt.get(id) as Record<string, unknown> | undefined;
    if (!r) return null;

    return {
      id: r.id as string,
      name: r.name as string,
      type: r.type as string,
      value: (r.value_cents as number) / 100,
      ownerId: r.owner_id as string,
      createdAt: r.created_at as string,
    };
  }

  async deleteAsset(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM assets WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // Idempotency Record Check
  async getIdempotencyRecord(key: string): Promise<Record<string, unknown> | null> {
    const stmt = this.db.prepare('SELECT response_json FROM idempotency_records WHERE key = ?');
    const r = stmt.get(key) as { response_json: string } | undefined;
    if (!r) return null;
    return JSON.parse(r.response_json);
  }

  // Transaction Operations (Atomic Database Transaction & Minor Units Cents)
  async createTransaction(data: {
    senderId: string;
    recipientId: string;
    amount: number;
    currency: string;
    nonce: string;
    idempotencyKey?: string;
  }): Promise<Transaction> {
    const amountCents = Math.round(data.amount * 100);
    const now = new Date().toISOString();
    const txId = `tx_${generateUUID().substring(0, 8)}`;

    const transferTx = this.db.transaction(() => {
      // 1. Verify Sender Balance
      const senderStmt = this.db.prepare('SELECT balance_cents FROM users WHERE id = ?');
      const senderRow = senderStmt.get(data.senderId) as { balance_cents: number } | undefined;

      if (!senderRow) {
        throw new Error('Sender user account not found');
      }

      if (senderRow.balance_cents < amountCents) {
        throw new Error('INSUFFICIENT_FUNDS: Sender account balance is insufficient for this transfer');
      }

      // 2. Debit Sender Balance
      this.db.prepare('UPDATE users SET balance_cents = balance_cents - ? WHERE id = ?')
        .run(amountCents, data.senderId);

      // 3. Credit Recipient Balance (Create user record if receiver is a synthetic recipient ID)
      const recipientStmt = this.db.prepare('SELECT id FROM users WHERE id = ?');
      const recipientRow = recipientStmt.get(data.recipientId);

      if (recipientRow) {
        this.db.prepare('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?')
          .run(amountCents, data.recipientId);
      }

      // 4. Record Transaction
      const stmt = this.db.prepare(`
        INSERT INTO transactions (id, sender_id, recipient_id, amount_cents, currency, status, nonce, idempotency_key, created_at)
        VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?)
      `);

      stmt.run(txId, data.senderId, data.recipientId, amountCents, data.currency, data.nonce, data.idempotencyKey || null, now);

      const tx: Transaction = {
        id: txId,
        senderId: data.senderId,
        recipientId: data.recipientId,
        amount: data.amount,
        currency: data.currency,
        status: 'COMPLETED',
        nonce: data.nonce,
        createdAt: now,
      };

      // 5. Store Idempotency Key record if provided
      if (data.idempotencyKey) {
        this.db.prepare(`
          INSERT INTO idempotency_records (key, user_id, response_json, created_at)
          VALUES (?, ?, ?, ?)
        `).run(data.idempotencyKey, data.senderId, JSON.stringify(tx), now);
      }

      return tx;
    });

    return transferTx();
  }

  async getTransactionsForUser(userId: string, role: UserRole): Promise<Transaction[]> {
    let stmt;
    if (role === 'ADMIN') {
      stmt = this.db.prepare('SELECT * FROM transactions ORDER BY created_at DESC');
    } else {
      stmt = this.db.prepare('SELECT * FROM transactions WHERE sender_id = ? OR recipient_id = ? ORDER BY created_at DESC');
    }

    const rows = (role === 'ADMIN' ? stmt.all() : stmt.all(userId, userId)) as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      id: r.id as string,
      senderId: r.sender_id as string,
      recipientId: r.recipient_id as string,
      amount: (r.amount_cents as number) / 100,
      currency: r.currency as string,
      status: r.status as 'COMPLETED' | 'FAILED' | 'PENDING',
      nonce: r.nonce as string,
      createdAt: r.created_at as string,
    }));
  }

  // Audit Logs
  async logAuditEvent(action: string, userId?: string, ip?: string, requestId?: string, details?: Record<string, unknown>): Promise<void> {
    const id = `aud_${generateUUID().substring(0, 8)}`;
    const now = new Date().toISOString();
    const detailsJson = details ? JSON.stringify(details) : null;

    const stmt = this.db.prepare(`
      INSERT INTO audit_logs (id, action, user_id, ip, request_id, details_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, action, userId || null, ip || null, requestId || null, detailsJson, now);
  }
}

export const dbStore = new DBStore();
