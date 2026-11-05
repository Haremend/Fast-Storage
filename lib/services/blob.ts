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

export interface BlobListItem {
  key: string;
  url: string;
  size: number;
  uploadedAt: string;
  contentType?: string;
}

export interface BlobHeadInfo {
  key: string;
  url: string;
  size: number;
  uploadedAt: string;
  contentType: string;
}

export interface BlobListPage {
  items: BlobListItem[];
  cursor: string | null;
  hasMore: boolean;
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

async function getBucket() {
  const { Bucket } = await import('@upstash/blob');
  return new Bucket({ token: envConfig.upstashBlobToken });
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
      const bucket = await getBucket();
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
    // 仅剔除路径不安全字符（斜杠、反斜杠、控制符、保留符号），
    // 保留中文/日文等 Unicode，避免中文文件名被替换成下划线。
    const sanitizedName =
      filename
        .replace(/[\/\\:*?"<>|\x00-\x1f]/g, '_')
        .replace(/^\.+/, '')
        .trim() || 'file';
    const key = `${folder}/${Date.now()}-${sanitizedName}`;
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const size = buffer.length;

    // Live Upstash Blob
    if (envConfig.hasUpstashBlob) {
      try {
        const bucket = await getBucket();
        const res = await bucket.put(key, buffer, { contentType });

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

  /**
   * List blobs with cursor-based pagination.
   * Live mode delegates to Upstash Blob `list({ prefix, limit, cursor })`,
   * whose cursor is opaque and undefined on the last page.
   */
  async listAll(options: { cursor?: string; limit?: number; prefix?: string } = {}): Promise<BlobListPage> {
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);

    if (envConfig.hasUpstashBlob) {
      try {
        const bucket = await getBucket();
        const page = await bucket.list({
          prefix: options.prefix,
          limit,
          cursor: options.cursor,
        });
        const items: BlobListItem[] = page.blobs.map((blob) => ({
          key: blob.path,
          url: blob.url || '',
          size: blob.size,
          uploadedAt:
            blob.uploadedAt instanceof Date
              ? blob.uploadedAt.toISOString()
              : new Date(blob.uploadedAt).toISOString(),
        }));
        const cursor = page.cursor ?? null;
        return { items, cursor, hasMore: cursor !== null };
      } catch (err) {
        console.warn('[Upstash Blob] Live list failed, using local bucket:', err);
      }
    }

    // Simulated bucket: offset-encoded cursor, newest first
    let all = Array.from(simulatedBucket.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (options.prefix) {
      all = all.filter((item) => item.key.startsWith(options.prefix!));
    }
    const offset = options.cursor ? Math.max(0, parseInt(options.cursor, 10) || 0) : 0;
    const pageItems = all.slice(offset, offset + limit);
    const nextOffset = offset + pageItems.length;
    const hasMore = nextOffset < all.length;

    return {
      items: pageItems.map((item) => ({
        key: item.key,
        url: item.url,
        size: item.size,
        uploadedAt: item.createdAt,
        contentType: item.contentType,
      })),
      cursor: hasMore ? String(nextOffset) : null,
      hasMore,
    };
  },

  async head(key: string): Promise<BlobHeadInfo | null> {
    if (envConfig.hasUpstashBlob) {
      try {
        const bucket = await getBucket();
        const info = await bucket.info(key);
        if (!info) return null;
        return {
          key,
          url: info.url || '',
          size: info.size,
          uploadedAt:
            info.uploadedAt instanceof Date
              ? info.uploadedAt.toISOString()
              : new Date(info.uploadedAt).toISOString(),
          contentType: info.contentType || 'application/octet-stream',
        };
      } catch (err) {
        console.warn(`[Upstash Blob] info failed for ${key}:`, err);
        return null;
      }
    }

    const stored = simulatedBucket.get(key);
    if (!stored) return null;
    return {
      key,
      url: stored.url,
      size: stored.size,
      uploadedAt: stored.createdAt,
      contentType: stored.contentType,
    };
  },

  async getBytes(key: string): Promise<{ data: Buffer; contentType: string } | null> {
    if (envConfig.hasUpstashBlob) {
      try {
        const bucket = await getBucket();
        const download = await bucket.get(key);
        const buffer = Buffer.from(await new Response(download.body).arrayBuffer());
        return {
          data: buffer,
          contentType: download.contentType || 'application/octet-stream',
        };
      } catch (err) {
        console.warn(`[Upstash Blob] get failed for ${key}:`, err);
        return null;
      }
    }

    const stored = simulatedBucket.get(key);
    return stored ? { data: stored.data, contentType: stored.contentType } : null;
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
        const bucket = await getBucket();
        await bucket.del(key);
        return true;
      } catch (err) {
        console.warn(`[Upstash Blob] Delete error for key ${key}:`, err);
        return false;
      }
    }
    return simulatedBucket.delete(key);
  },
};
