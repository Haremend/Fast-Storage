import { DocumentItem, SearchResultItem } from '../types';
import { BlobService } from './blob';
import { RedisService } from './redis';
import { VectorService } from './vector';

const REDIS_BLOB_INDEX_KEY = 'blob:documents:index';

/**
 * Blob index cache: key → document metadata.
 * The authoritative file list always comes from Upstash Blob (`listAll`);
 * this cache only supplies rich metadata (summary/tags/fullText/status)
 * for files uploaded through this app, so the list stays fast.
 * Live-mode files that were not uploaded here are still listed, just with
 * minimal derived metadata.
 */

function nameFromKey(key: string): string {
  const last = key.split('/').pop() || key;
  // Blob keys are stamped `${folder}/${ts}-name` on upload; strip the timestamp prefix
  return last.replace(/^\d+-/, '') || key;
}

function guessContentType(name: string): string {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const map: Record<string, string> = {
    md: 'text/markdown',
    markdown: 'text/markdown',
    txt: 'text/plain',
    pdf: 'application/pdf',
    json: 'application/json',
    js: 'text/javascript',
    ts: 'text/typescript',
    tsx: 'text/tsx',
    jsx: 'text/jsx',
    html: 'text/html',
    css: 'text/css',
    csv: 'text/csv',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
  };
  return map[ext] || 'application/octet-stream';
}

function isTextLike(doc: DocumentItem): boolean {
  return (
    doc.type?.startsWith('text/') ||
    /\.(md|markdown|txt|csv|json|js|ts|tsx|jsx|html|css|log|ini|ya?ml|xml)$/i.test(doc.name)
  );
}

export const DocumentService = {
  /**
   * List all files from Upstash Blob, enriched with cached metadata.
   * Supports cursor-based pagination (`cursor` + `limit`) and an optional
   * `prefix` to scope the listing to a remote folder (e.g. "documents/",
   * "wallpapers/", "avatars/"). When omitted, every folder is listed.
   */
  async listAll(options: { cursor?: string; limit?: number; prefix?: string } = {}): Promise<{
    documents: DocumentItem[];
    cursor: string | null;
    hasMore: boolean;
    count: number;
    blobLive: boolean;
  }> {
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);

    const page = await BlobService.listAll({
      cursor: options.cursor,
      limit,
      prefix: options.prefix,
    });

    // Load cached metadata (single Redis round-trip) to enrich the page
    const index = await RedisService.get<Record<string, Partial<DocumentItem>>>(REDIS_BLOB_INDEX_KEY);
    const indexMap = index && typeof index === 'object' ? index : {};

    const documents: DocumentItem[] = page.items.map((item) => {
      const name = nameFromKey(item.key);
      const cached = indexMap[item.key];
      return {
        id: item.key,
        name,
        size: item.size,
        type: cached?.type || item.contentType || guessContentType(name),
        blobUrl:
          item.url ||
          `/api/documents/download?key=${encodeURIComponent(item.key)}`,
        storageSource: BlobService.isLive() ? 'upstash-blob' : 'simulated-blob',
        uploadedAt: item.uploadedAt,
        status: cached?.status || (cached ? 'indexed' : 'unindexed'),
        summary:
          cached?.summary ||
          `${name} 格式文件 · ${(item.size / 1024).toFixed(1)} KB`,
        tags: cached?.tags?.length ? cached.tags : ['个人'],
        vectorId: cached?.vectorId,
        contentSnippet: cached?.contentSnippet,
        fullText: cached?.fullText,
        duplicates: cached?.duplicates,
        relatedDocs: cached?.relatedDocs,
      };
    });

    return {
      documents,
      cursor: page.cursor,
      hasMore: page.hasMore,
      count: documents.length,
      blobLive: BlobService.isLive(),
    };
  },

  async getById(key: string): Promise<DocumentItem | null> {
    const head = await BlobService.head(key);
    if (!head) return null;
    const index = await RedisService.get<Record<string, Partial<DocumentItem>>>(REDIS_BLOB_INDEX_KEY);
    const cached = index?.[key];
    const name = nameFromKey(key);
    return {
      id: key,
      name,
      size: head.size,
      type: cached?.type || head.contentType,
      blobUrl: head.url || `/api/documents/download?key=${encodeURIComponent(key)}`,
      storageSource: BlobService.isLive() ? 'upstash-blob' : 'simulated-blob',
      uploadedAt: head.uploadedAt,
      status: cached?.status || (cached ? 'indexed' : 'unindexed'),
      summary: cached?.summary || `${name} 格式文件`,
      tags: cached?.tags?.length ? cached.tags : ['个人'],
      vectorId: cached?.vectorId,
      contentSnippet: cached?.contentSnippet,
      fullText: cached?.fullText,
      duplicates: cached?.duplicates,
      relatedDocs: cached?.relatedDocs,
    };
  },

  async uploadDocument(options: {
    name: string;
    buffer: Buffer;
    contentType: string;
    summary?: string;
    tags?: string[];
    folder?: 'avatars' | 'documents' | 'wallpapers' | 'temp';
  }): Promise<{ document: DocumentItem; taskId: string; textLike: boolean }> {
    const { name, buffer, contentType, tags = ['个人', '上传'], folder = 'documents' } = options;

    // 1. Store in Upstash Blob (按用户选择的分类存放)
    const blobResult = await BlobService.put({
      filename: name,
      data: buffer,
      contentType,
      folder,
    });

    const textLike = contentType.startsWith('text/') || /\.md|\.txt|\.csv|\.json$/i.test(name);
    const fullText = textLike ? buffer.toString('utf-8') : '';
    const summary = options.summary || (textLike ? fullText.slice(0, 160).replace(/\n/g, ' ') + '...' : `已上传文件: ${name}`);

    const doc: DocumentItem = {
      id: blobResult.key,
      name,
      size: blobResult.size,
      type: contentType,
      blobUrl: blobResult.url,
      storageSource: blobResult.source,
      uploadedAt: new Date().toISOString(),
      status: 'processing',
      summary,
      tags,
      fullText: fullText || undefined,
    };

    // 2. Register metadata in the Redis index
    const index = await RedisService.get<Record<string, Partial<DocumentItem>>>(REDIS_BLOB_INDEX_KEY);
    const indexMap: Record<string, Partial<DocumentItem>> =
      index && typeof index === 'object' ? index : {};

    // 3. Build the semantic vector synchronously so the file is immediately
    //    usable for dedup / recommendations / search.
    const vectorId = await VectorService.upsertDocument(doc, fullText || doc.summary);
    doc.vectorId = vectorId;
    doc.status = 'indexed';

    // 4. Immediately find the most similar existing documents (upstash
    //    built-in embedding → cosine). Thresholds: ≥ 0.85 likely dup,
    //    ≥ 0.45 related. Store on the document + Redis index.
    let duplicates: { id: string; name: string; similarity: number }[] = [];
    let related: { id: string; name: string; similarity: number }[] = [];
    if (fullText) {
      const hits = await VectorService.query(fullText, 8);
      for (const hit of hits) {
        if (hit.metadata?.docId === doc.id) continue;
        const sim = Number(hit.score);
        const target = { id: hit.metadata?.docId || '', name: hit.metadata?.name || '', similarity: sim };
        if (!target.id) continue;
        if (sim >= 0.85) duplicates.push(target);
        else if (sim >= 0.45) related.push(target);
      }
      duplicates.sort((a, b) => b.similarity - a.similarity);
      related.sort((a, b) => b.similarity - a.similarity);
      doc.duplicates = duplicates;
      doc.relatedDocs = related;
    }

    indexMap[doc.id] = {
      type: contentType,
      summary,
      tags,
      fullText: doc.fullText,
      status: 'indexed',
      vectorId: doc.vectorId,
      duplicates,
      relatedDocs: related,
    };
    await RedisService.set(REDIS_BLOB_INDEX_KEY, indexMap, 86400 * 30);

    return { document: doc, taskId: `vec_${vectorId}`, textLike };
  },

  async searchSemantic(queryText: string): Promise<{
    results: SearchResultItem[];
    recommendations: DocumentItem[];
    query: string;
    totalMatched: number;
    latencyMs: number;
  }> {
    const startTime = Date.now();

    // Cache search results in Redis for rapid repeated queries (TTL: 5 mins)
    const cacheKey = `search:cache:${encodeURIComponent(queryText.trim().toLowerCase())}`;
    const cached = await RedisService.get<{
      results: SearchResultItem[];
      recommendations: DocumentItem[];
      query: string;
      totalMatched: number;
      latencyMs: number;
    }>(cacheKey);
    if (cached) return cached;

    const vectorHits = await VectorService.query(queryText, 8);
    const results: SearchResultItem[] = [];
    const index = await RedisService.get<Record<string, Partial<DocumentItem>>>(REDIS_BLOB_INDEX_KEY);
    const indexMap = index && typeof index === 'object' ? index : {};

    for (const hit of vectorHits) {
      const meta = hit.metadata;
      const docKey = meta?.docId;
      if (!docKey) continue;

      // Rebuild the document from vector metadata so results survive cold starts
      const cachedMeta = indexMap[docKey];
      const doc: DocumentItem = {
        id: docKey,
        name: meta?.name || nameFromKey(docKey),
        size: meta?.size || cachedMeta?.size || 0,
        type: meta?.type || cachedMeta?.type || 'application/octet-stream',
        blobUrl: meta?.blobUrl || cachedMeta?.blobUrl || '',
        storageSource: BlobService.isLive() ? 'upstash-blob' : 'simulated-blob',
        uploadedAt: meta?.uploadedAt || cachedMeta?.uploadedAt || new Date().toISOString(),
        status: 'indexed',
        summary: meta?.summary || cachedMeta?.summary || meta?.snippet || '',
        tags: meta?.tags?.length ? meta.tags : cachedMeta?.tags || [],
        vectorId: hit.id,
        contentSnippet: meta?.snippet,
        fullText: cachedMeta?.fullText,
      };

      results.push({
        document: doc,
        score: hit.score,
        matchedSnippet: meta?.snippet || doc.summary,
        matchedConcepts: doc.tags,
      });
    }

    // Recommendations: nearest neighbors of the top result (by docId)
    let recommendations: DocumentItem[] = [];
    if (results.length > 0) {
      const topDocId = results[0].document.id;
      const recHits = await VectorService.getRecommendations(topDocId, 3);
      for (const rec of recHits) {
        const recDoc = await this.getById(rec.metadata?.docId || '');
        if (recDoc) recommendations.push(recDoc);
      }
    }

    const responsePayload = {
      results,
      recommendations,
      query: queryText,
      totalMatched: results.length,
      latencyMs: Date.now() - startTime,
    };

    await RedisService.set(cacheKey, responsePayload, 300);
    return responsePayload;
  },

  /** Delete: remove the Blob object, its vector entry, and index metadata. */
  async deleteDocument(key: string): Promise<boolean> {
    const head = await BlobService.head(key);
    if (!head) return false;

    const doc = await this.getById(key);
    if (doc?.vectorId) {
      await VectorService.delete(doc.vectorId);
    }

    const deleted = await BlobService.delete(key);
    if (!deleted) return false;

    const index = await RedisService.get<Record<string, Partial<DocumentItem>>>(REDIS_BLOB_INDEX_KEY);
    if (index && typeof index === 'object' && key in index) {
      delete index[key];
      await RedisService.set(REDIS_BLOB_INDEX_KEY, index, 86400 * 30);
    }

    return true;
  },

  /**
   * Build a semantic search query for a document's content.
   * Used by the "转到语义检索" button on text-like files:
   * feeds the document name + first content snippet into 语义检索舱.
   */
  async buildSemanticQuery(doc: DocumentItem): Promise<string> {
    if (isTextLike(doc)) {
      const seed = [doc.name.replace(/\.[^/.]+$/, ''), doc.contentSnippet || doc.summary || doc.name]
        .filter(Boolean)
        .join(' ');
      return seed.slice(0, 120);
    }
    return doc.name.replace(/\.[^/.]+$/, '');
  },
};
