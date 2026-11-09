import { Redis } from '@upstash/redis';
import { envConfig } from '../config';
import { UserSession, RedisKeyItem, UploadedWallpaper, WallpaperConfig } from '../types';

interface CacheEntry<T> {
  value: T;
  type?: string;
  expiresAt: number | null;
  updatedAt?: string;
}

// In-memory fallback store for serverless development and instant preview
class InMemoryCacheStore {
  private store = new Map<string, CacheEntry<unknown>>();
  public hits = 0;
  public misses = 0;
  public lastPurged: string | null = null;

  constructor() {
    // Seed initial keys for demonstration
    this.seedDemoKeys();
  }

  private seedDemoKeys() {
    this.set('system:version', 'v2.4.0-serverless', 86400 * 30);
    this.set('app:name', 'Fast Storage', 86400 * 30);
    this.set('demo:counter:visitors', 1042, 86400 * 7);
    this.set('rate_limit:sample_ip_192.168.1.1', 3, 10);
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return null;
    }
    this.hits++;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds?: number): void {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, {
      value,
      type: typeof value === 'object' ? 'hash' : typeof value,
      expiresAt,
      updatedAt: new Date().toISOString(),
    });
  }

  del(key: string): boolean {
    return this.store.delete(key);
  }

  keys(pattern?: string): string[] {
    const allKeys = Array.from(this.store.keys());
    if (!pattern || pattern === '*') return allKeys;
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return allKeys.filter((k) => regex.test(k));
  }

  getDetailedKeys(pattern?: string): RedisKeyItem[] {
    const matched = this.keys(pattern);
    const now = Date.now();
    return matched.map((k) => {
      const entry = this.store.get(k)!;
      let ttl = -1;
      if (entry.expiresAt) {
        ttl = Math.max(0, Math.round((entry.expiresAt - now) / 1000));
      }
      const valStr = typeof entry.value === 'object' ? JSON.stringify(entry.value) : String(entry.value);
      return {
        key: k,
        type: (entry.type as RedisKeyItem['type']) || 'string',
        ttl,
        valuePreview: valStr.length > 80 ? valStr.slice(0, 80) + '...' : valStr,
        sizeBytes: new TextEncoder().encode(valStr).length,
        updatedAt: entry.updatedAt || new Date().toISOString(),
      };
    });
  }

  flushall(): void {
    this.store.clear();
    this.lastPurged = new Date().toISOString();
  }

  size(): number {
    return this.store.size;
  }
}

// Global singleton for in-memory fallback in dev server
const globalForCache = global as unknown as {
  inMemoryCache?: InMemoryCacheStore;
  liveRedisClient?: Redis;
};

const memoryStore = globalForCache.inMemoryCache ?? new InMemoryCacheStore();
if (process.env.NODE_ENV !== 'production') {
  globalForCache.inMemoryCache = memoryStore;
}

function getRedisClient(): Redis | null {
  if (!envConfig.hasUpstashRedis) return null;
  if (!globalForCache.liveRedisClient) {
    try {
      globalForCache.liveRedisClient = new Redis({
        url: envConfig.upstashRedisUrl,
        token: envConfig.upstashRedisToken,
      });
    } catch (err) {
      console.warn('[Redis] Failed to initialize live client:', err);
      return null;
    }
  }
  return globalForCache.liveRedisClient;
}

export const RedisService = {
  isLive(): boolean {
    return Boolean(envConfig.hasUpstashRedis && getRedisClient());
  },

  async testConnection(): Promise<{ connected: boolean; latencyMs: number; message: string }> {
    const client = getRedisClient();
    if (!client) {
      return {
        connected: false,
        latencyMs: 0,
        message: '未检测到 UPSTASH_REDIS_REST_URL 与 TOKEN，使用本地内存高速缓存',
      };
    }
    const start = Date.now();
    try {
      await client.ping();
      return {
        connected: true,
        latencyMs: Date.now() - start,
        message: 'Upstash Redis 云端连接正常 (PONG)',
      };
    } catch (err) {
      return {
        connected: false,
        latencyMs: Date.now() - start,
        message: err instanceof Error ? err.message : '连接失败',
      };
    }
  },

  async get<T>(key: string): Promise<T | null> {
    const client = getRedisClient();
    if (client) {
      try {
        const val = await client.get<T>(key);
        if (val !== null && val !== undefined) {
          memoryStore.hits++;
          return val;
        }
        memoryStore.misses++;
        return null;
      } catch (err) {
        console.warn(`[Redis] Error getting key ${key}, falling back to memory:`, err);
      }
    }
    return memoryStore.get<T>(key);
  },

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const client = getRedisClient();
    if (client) {
      try {
        if (ttlSeconds && ttlSeconds > 0) {
          await client.set(key, value, { ex: ttlSeconds });
        } else {
          await client.set(key, value);
        }
      } catch (err) {
        console.warn(`[Redis] Error setting key ${key}:`, err);
      }
    }
    memoryStore.set(key, value, ttlSeconds);
  },

  async del(key: string): Promise<boolean> {
    const client = getRedisClient();
    if (client) {
      try {
        await client.del(key);
      } catch (err) {
        console.warn(`[Redis] Error deleting key ${key}:`, err);
      }
    }
    return memoryStore.del(key);
  },

  async flushall(): Promise<void> {
    const client = getRedisClient();
    if (client) {
      try {
        await client.flushall();
      } catch (err) {
        console.warn('[Redis] Error flushing database:', err);
      }
    }
    memoryStore.flushall();
  },

  getStats() {
    const total = memoryStore.hits + memoryStore.misses;
    const ratio = total > 0 ? ((memoryStore.hits / total) * 100).toFixed(1) + '%' : '100.0%';
    return {
      keysCount: memoryStore.size(),
      hitCount: memoryStore.hits,
      missCount: memoryStore.misses,
      hitRatio: ratio,
      lastPurgedAt: memoryStore.lastPurged,
    };
  },

  // Key-Value Space Browser
  async listKeysWithDetails(pattern = '*'): Promise<RedisKeyItem[]> {
    const client = getRedisClient();
    if (client) {
      try {
        const keys = await client.keys(pattern);
        const results: RedisKeyItem[] = [];
        for (const k of keys.slice(0, 50)) {
          const type = (await client.type(k)) as RedisKeyItem['type'];
          const ttl = await client.ttl(k);
          const rawVal = await client.get(k);
          const valStr = typeof rawVal === 'object' ? JSON.stringify(rawVal) : String(rawVal ?? '');
          results.push({
            key: k,
            type: type || 'string',
            ttl: ttl ?? -1,
            valuePreview: valStr.length > 80 ? valStr.slice(0, 80) + '...' : valStr,
            sizeBytes: new TextEncoder().encode(valStr).length,
            updatedAt: new Date().toISOString(),
          });
        }
        return results;
      } catch (err) {
        console.warn('[Redis] Failed to list keys from live client, using memory:', err);
      }
    }
    return memoryStore.getDetailedKeys(pattern);
  },

  async getRedisInfo(): Promise<{
    usedMemory: string;
    totalKeys: number;
    uptime: string;
    serverType: string;
  }> {
    const isLive = this.isLive();
    return {
      usedMemory: isLive ? '1.42 MB' : `${(memoryStore.size() * 0.4 + 0.1).toFixed(2)} KB`,
      totalKeys: memoryStore.size(),
      uptime: '99.99%',
      serverType: isLive ? 'Upstash Redis Cloud (Serverless REST)' : 'Local In-Memory Cache Engine',
    };
  },

  // Classic Redis Demos
  // Demo 1: Rate Limiter (Token Bucket / Sliding Window in seconds)
  async rateLimitDemo(identifier: string, limit = 5, windowSeconds = 10): Promise<{
    success: boolean;
    current: number;
    limit: number;
    remaining: number;
    resetInSeconds: number;
  }> {
    const key = `ratelimit:demo:${identifier}`;
    const client = getRedisClient();

    if (client) {
      try {
        const count = await client.incr(key);
        if (count === 1) {
          await client.expire(key, windowSeconds);
        }
        const ttl = await client.ttl(key);
        const remaining = Math.max(0, limit - count);
        return {
          success: count <= limit,
          current: count,
          limit,
          remaining,
          resetInSeconds: Math.max(0, ttl),
        };
      } catch (err) {
        console.warn('[Redis] Live rate limit failed, using local:', err);
      }
    }

    // Local rate limit logic
    const current = (memoryStore.get<number>(key) || 0) + 1;
    if (current === 1) {
      memoryStore.set(key, 1, windowSeconds);
    } else {
      memoryStore.set(key, current);
    }
    const remaining = Math.max(0, limit - current);
    return {
      success: current <= limit,
      current,
      limit,
      remaining,
      resetInSeconds: windowSeconds,
    };
  },

  // Demo 2: Distributed Atomic Counter
  async incrementCounter(counterKey = 'demo:counter:visitors'): Promise<number> {
    const client = getRedisClient();
    if (client) {
      try {
        return await client.incr(counterKey);
      } catch (err) {
        console.warn('[Redis] Live incr failed, using local:', err);
      }
    }
    const val = (memoryStore.get<number>(counterKey) || 1042) + 1;
    memoryStore.set(counterKey, val, 86400 * 30);
    return val;
  },

  // Session & Authentication
  async getSession(sessionId: string): Promise<UserSession | null> {
    return this.get<UserSession>(`session:${sessionId}`);
  },

  async setSession(session: UserSession, ttlSeconds = 86400 * 7): Promise<void> {
    await this.set(`session:${session.id}`, session, ttlSeconds);
  },

  async updateSessionAvatar(sessionId: string, avatarUrl: string): Promise<UserSession | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;
    session.avatarUrl = avatarUrl;
    session.lastActive = new Date().toISOString();
    await this.setSession(session);
    return session;
  },

  async setAuthSession(token: string, username: string): Promise<void> {
    await this.set(`auth:session:${token}`, { username, loginTime: new Date().toISOString() }, 86400 * 7);
  },

  async getAuthSession(token: string): Promise<{ username: string; loginTime: string } | null> {
    return this.get<{ username: string; loginTime: string }>(`auth:session:${token}`);
  },

  async removeAuthSession(token: string): Promise<void> {
    await this.del(`auth:session:${token}`);
  },

  /** Delete all keys matching a glob pattern (e.g. "search:cache:*"). */
  async deleteByPattern(pattern: string): Promise<number> {
    const client = getRedisClient();
    if (client) {
      try {
        const keys = await client.keys(pattern);
        if (keys.length === 0) return 0;
        await client.del(...keys);
        return keys.length;
      } catch (err) {
        console.warn(`[Redis] deleteByPattern(${pattern}) failed:`, err);
        return 0;
      }
    }
    const keys = memoryStore.keys(pattern);
    keys.forEach((k) => memoryStore.del(k));
    return keys.length;
  },

  // Wallpapers Management in Upstash Redis
  async getWallpaperHistory(): Promise<UploadedWallpaper[]> {
    const list = await this.get<UploadedWallpaper[]>('app:wallpapers:history');
    return Array.isArray(list) ? list : [];
  },

  async saveWallpaperToHistory(wallpaper: UploadedWallpaper): Promise<void> {
    const current = await this.getWallpaperHistory();
    const filtered = current.filter((w) => w.key !== wallpaper.key && w.id !== wallpaper.id);
    const updated = [wallpaper, ...filtered].slice(0, 30);
    await this.set('app:wallpapers:history', updated);
  },

  async removeWallpaperFromHistory(idOrKey: string): Promise<boolean> {
    const current = await this.getWallpaperHistory();
    const updated = current.filter((w) => w.id !== idOrKey && w.key !== idOrKey);
    await this.set('app:wallpapers:history', updated);
    return true;
  },

  async getActiveWallpaperConfig(): Promise<WallpaperConfig | null> {
    return this.get<WallpaperConfig>('app:wallpaper:active');
  },

  async setActiveWallpaperConfig(config: WallpaperConfig): Promise<void> {
    await this.set('app:wallpaper:active', config);
  },
};
