import bcrypt from 'bcryptjs';
import { Asset, Transaction, User, UserRole } from '../types';
import { generateUUID } from '../utils/crypto';

class DBStore {
  private users: Map<string, User> = new Map();
  private assets: Map<string, Asset> = new Map();
  private transactions: Map<string, Transaction> = new Map();

  constructor() {
    this.seedDefaults();
  }

  public seedDefaults() {
    this.users.clear();
    this.assets.clear();
    this.transactions.clear();

    const passwordHash = bcrypt.hashSync('Password123!', 10);

    const user1: User = {
      id: 'usr_user_1',
      email: 'user@example.com',
      passwordHash,
      name: 'Regular User',
      role: 'USER',
      createdAt: new Date().toISOString(),
    };

    const admin1: User = {
      id: 'usr_admin_1',
      email: 'admin@example.com',
      passwordHash,
      name: 'System Admin',
      role: 'ADMIN',
      createdAt: new Date().toISOString(),
    };

    this.users.set(user1.id, user1);
    this.users.set(admin1.id, admin1);

    const asset1: Asset = {
      id: 'ast_1',
      name: 'Server Node Alpha',
      type: 'COMPUTE',
      value: 1250.00,
      ownerId: user1.id,
      createdAt: new Date().toISOString(),
    };

    const asset2: Asset = {
      id: 'ast_2',
      name: 'Database Cluster Beta',
      type: 'STORAGE',
      value: 5400.00,
      ownerId: admin1.id,
      createdAt: new Date().toISOString(),
    };

    this.assets.set(asset1.id, asset1);
    this.assets.set(asset2.id, asset2);
  }

  // User Operations
  async createUser(data: { email: string; passwordHash: string; name: string; role?: UserRole }): Promise<User> {
    const existing = Array.from(this.users.values()).find((u) => u.email.toLowerCase() === data.email.toLowerCase());
    if (existing) {
      throw new Error('User already exists');
    }

    const user: User = {
      id: `usr_${generateUUID().substring(0, 8)}`,
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      name: data.name,
      role: data.role || 'USER',
      createdAt: new Date().toISOString(),
    };

    this.users.set(user.id, user);
    return user;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const user = Array.from(this.users.values()).find((u) => u.email.toLowerCase() === email.toLowerCase());
    return user || null;
  }

  async findUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  // Asset Operations
  async getAssets(requesterId: string, role: UserRole): Promise<Asset[]> {
    const all = Array.from(this.assets.values());
    if (role === 'ADMIN') {
      return all;
    }
    return all.filter((a) => a.ownerId === requesterId);
  }

  async createAsset(data: { name: string; type: string; value: number; ownerId: string }): Promise<Asset> {
    const asset: Asset = {
      id: `ast_${generateUUID().substring(0, 8)}`,
      name: data.name,
      type: data.type,
      value: data.value,
      ownerId: data.ownerId,
      createdAt: new Date().toISOString(),
    };
    this.assets.set(asset.id, asset);
    return asset;
  }

  async getAssetById(id: string): Promise<Asset | null> {
    return this.assets.get(id) || null;
  }

  async deleteAsset(id: string): Promise<boolean> {
    return this.assets.delete(id);
  }

  // Transaction Operations
  async createTransaction(data: { senderId: string; recipientId: string; amount: number; currency: string; nonce: string }): Promise<Transaction> {
    const transaction: Transaction = {
      id: `tx_${generateUUID().substring(0, 8)}`,
      senderId: data.senderId,
      recipientId: data.recipientId,
      amount: data.amount,
      currency: data.currency,
      status: 'COMPLETED',
      nonce: data.nonce,
      createdAt: new Date().toISOString(),
    };
    this.transactions.set(transaction.id, transaction);
    return transaction;
  }

  async getTransactionsForUser(userId: string, role: UserRole): Promise<Transaction[]> {
    const all = Array.from(this.transactions.values());
    if (role === 'ADMIN') return all;
    return all.filter((t) => t.senderId === userId || t.recipientId === userId);
  }
}

export const dbStore = new DBStore();
