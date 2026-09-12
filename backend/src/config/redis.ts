import Redis from 'ioredis';
import { env } from './env';

interface CacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: 'EX', durationSeconds?: number): Promise<'OK' | null>;
  setnx(key: string, value: string, ttlSeconds: number): Promise<boolean>;
  del(key: string): Promise<number>;
  isRedisConnected(): boolean;
}

class InMemoryCacheStore implements CacheStore {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, mode?: 'EX', durationSeconds?: number): Promise<'OK'> {
    const expiresAt = mode === 'EX' && durationSeconds ? Date.now() + durationSeconds * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async setnx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const existing = await this.get(key);
    if (existing !== null) {
      return false; // Key already exists
    }
    await this.set(key, value, 'EX', ttlSeconds);
    return true; // Successfully set
  }

  async del(key: string): Promise<number> {
    const deleted = this.store.delete(key);
    return deleted ? 1 : 0;
  }

  isRedisConnected(): boolean {
    return false;
  }
}

class RedisCacheStore implements CacheStore {
  private client: Redis | null = null;
  private fallbackMemoryStore = new InMemoryCacheStore();
  private usingFallback = false;

  constructor() {
    try {
      this.client = new Redis(env.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        connectTimeout: 2000,
        retryStrategy: (times) => {
          if (times > 2) {
            console.warn('⚠️ Redis connection failed. Falling back to internal memory cache.');
            this.usingFallback = true;
            return null; // Stop retrying
          }
          return 500;
        },
      });

      this.client.on('error', (err) => {
        if (!this.usingFallback) {
          console.warn('⚠️ Redis error encountered:', err.message);
          this.usingFallback = true;
        }
      });
    } catch {
      this.usingFallback = true;
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.usingFallback || !this.client) {
      return this.fallbackMemoryStore.get(key);
    }
    try {
      return await this.client.get(key);
    } catch {
      this.usingFallback = true;
      return this.fallbackMemoryStore.get(key);
    }
  }

  async set(key: string, value: string, mode?: 'EX', durationSeconds?: number): Promise<'OK' | null> {
    if (this.usingFallback || !this.client) {
      return this.fallbackMemoryStore.set(key, value, mode, durationSeconds);
    }
    try {
      if (mode === 'EX' && durationSeconds) {
        return await this.client.set(key, value, 'EX', durationSeconds);
      }
      return await this.client.set(key, value);
    } catch {
      this.usingFallback = true;
      return this.fallbackMemoryStore.set(key, value, mode, durationSeconds);
    }
  }

  async setnx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    if (this.usingFallback || !this.client) {
      return this.fallbackMemoryStore.setnx(key, value, ttlSeconds);
    }
    try {
      // SET key value EX ttlSeconds NX returns "OK" if key set, null if key exists
      const res = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
      return res === 'OK';
    } catch {
      this.usingFallback = true;
      return this.fallbackMemoryStore.setnx(key, value, ttlSeconds);
    }
  }

  async del(key: string): Promise<number> {
    if (this.usingFallback || !this.client) {
      return this.fallbackMemoryStore.del(key);
    }
    try {
      return await this.client.del(key);
    } catch {
      this.usingFallback = true;
      return this.fallbackMemoryStore.del(key);
    }
  }

  isRedisConnected(): boolean {
    return !this.usingFallback && this.client !== null && this.client.status === 'ready';
  }
}

export const redisStore: CacheStore = new RedisCacheStore();
