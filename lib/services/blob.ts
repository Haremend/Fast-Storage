import { envConfig } from '../config';

export interface UploadOptions {
  filename: string;
  data: Buffer | string;
  contentType: string;
  folder?: 'avatars' | 'documents' | 'wallpapers' | 'temp';
}

export interface BlobResult {
  url: string;
  key: string;
  size: number;
  contentType: string;
  source: 'upstash-blob' | 'simulated-blob';
}

interface StoredBlob {
  key: string;
  data: Buffer;
  contentType: string;
  size: number;
  url: string;
  createdAt: string;
}

// Global in-memory storage for local preview/sandbox
const globalForBlob = global as unknown as {
  simulatedBlobBucket?: Map<string, StoredBlob>;
};

const simulatedBucket = globalForBlob.simulatedBlobBucket ?? new Map<string, StoredBlob>();
if (process.env.NODE_ENV !== 'production') {
  globalForBlob.simulatedBlobBucket = simulatedBucket;
}

export const BlobService = {
  isLive(): boolean {
    return envConfig.hasUpstashBlob;
  },

  async testConnection(): Promise<{ connected: boolean; latencyMs: number; message: string }> {
    if (!envConfig.hasUpstashBlob) {
      return {
        connected: false,
        latencyMs: 0,
        message: '未检测到 UPSTASH_BLOB_TOKEN，使用本地模拟对象存储',
      };
    }
    const start = Date.now();
    try {
      const { Bucket } = await import('@upstash/blob');
      const bucket = new Bucket({ token: envConfig.upstashBlobToken });
      await bucket.list({ limit: 1 });
      return {
        connected: true,
        latencyMs: Date.now() - start,
        message: 'Upstash Blob 云端存储桶已连接 (Bucket Active)',
      };
    } catch (err) {
      return {
        connected: false,
        latencyMs: Date.now() - start,
        message: err instanceof Error ? err.message : '连接失败',
      };
    }
  },

  async put(options: UploadOptions): Promise<BlobResult> {
    const { filename, data, contentType, folder = 'documents' } = options;
    const sanitizedName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${folder}/${Date.now()}-${sanitizedName}`;
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const size = buffer.length;

    // Live Upstash Blob
    if (envConfig.hasUpstashBlob) {
      try {
        const { Bucket } = await import('@upstash/blob');
        const bucket = new Bucket({ token: envConfig.upstashBlobToken });
        const res = await bucket.put(key, buffer, {
          contentType,
        });

        return {
          url: res.url || `https://blob.upstash.com/${key}`,
          key,
          size,
          contentType,
          source: 'upstash-blob',
        };
      } catch (err) {
        console.warn('[Upstash Blob] Failed live upload, using fallback:', err);
      }
    }

    // Simulated Blob with dedicated HTTP API route or base64 fallback
    let url = `/api/blob/raw?key=${encodeURIComponent(key)}`;
    if (contentType.startsWith('image/') && folder !== 'wallpapers') {
      const base64 = buffer.toString('base64');
      url = `data:${contentType};base64,${base64}`;
    }

    const storedItem: StoredBlob = {
      key,
      data: buffer,
      contentType,
      size,
      url,
      createdAt: new Date().toISOString(),
    };
    simulatedBucket.set(key, storedItem);

    return {
      url,
      key,
      size,
      contentType,
      source: 'simulated-blob',
    };
  },

  async get(key: string): Promise<StoredBlob | null> {
    if (simulatedBucket.has(key)) {
      return simulatedBucket.get(key)!;
    }
    return null;
  },

  async delete(key: string): Promise<boolean> {
    if (envConfig.hasUpstashBlob) {
      try {
        const { Bucket } = await import('@upstash/blob');
        const bucket = new Bucket({ token: envConfig.upstashBlobToken });
        await bucket.del(key);
        return true;
      } catch (err) {
        console.warn(`[Upstash Blob] Delete error for key ${key}:`, err);
      }
    }
    return simulatedBucket.delete(key);
  },

  async list(prefix = ''): Promise<{ key: string; size: number; url: string }[]> {
    const results: { key: string; size: number; url: string }[] = [];
    simulatedBucket.forEach((val, k) => {
      if (!prefix || k.startsWith(prefix)) {
        results.push({ key: k, size: val.size, url: val.url });
      }
    });
    return results;
  },
};
