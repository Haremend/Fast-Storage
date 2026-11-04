import { DocumentItem, SearchResultItem } from '../types';
import { BlobService } from './blob';
import { RedisService } from './redis';
import { VectorService } from './vector';
import { QueueService } from './queue';

const REDIS_DOCS_KEY = 'cache:documents:all';

// Seed documents in Chinese for realistic initial demonstration
const INITIAL_SEED_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc_upstash_architecture',
    name: 'Serverless-无服务器架构设计指南.md',
    size: 28400,
    type: 'text/markdown',
    blobUrl: 'https://blob.upstash.com/documents/Serverless-无服务器架构设计指南.md',
    storageSource: 'upstash-blob',
    uploadedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    status: 'indexed',
    summary: '面向 Vercel 的模块化解耦无服务器架构指南，集成 Upstash Redis、Vector、QStash 和 Blob 存储方案。',
    tags: ['系统架构', 'Serverless', 'Vercel', 'Upstash'],
    vectorId: 'vec_doc_upstash_architecture',
    contentSnippet: 'Serverless 架构在 Vercel 等 Serverless 环境下需避免长连接 TCP 耗尽。通过 Upstash 基于 HTTP REST 的通信机制，冷启动延迟降低至 15ms 以内，结合 QStash 消息队列提供自动重试机制。',
    fullText: `Fast Storage 个人云端存储与向量智能架构指南：
1. 对象存储层：利用 Upstash Blob 实现用户头像与私有文档的高速云端存取与 CDN 加速。
2. 语义智能检索：基于 Upstash Vector 内置 Dense Embedding 向量模型，无需额外配置 OpenAI 即可实现中文与英文语义搜索。
3. 异步任务编排：采用 QStash 实现背景异步处理，解耦文档上传响应与耗时的向量嵌入。
4. 全局缓存与状态：借助 Upstash Redis REST 协议维护分布式用户会话状态并提供纳秒级查询缓存。`,
  },
  {
    id: 'doc_vector_embeddings',
    name: 'Vector-语义智能检索与数学原理.pdf',
    size: 94200,
    type: 'application/pdf',
    blobUrl: 'https://blob.upstash.com/documents/Vector-语义智能检索与数学原理.pdf',
    storageSource: 'upstash-blob',
    uploadedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    status: 'indexed',
    summary: '高维向量空间映射、余弦相似度计算与近似最近邻检索算法在个人知识库中的应用详解。',
    tags: ['向量检索', '机器学习', '余弦相似度', 'Embeddings'],
    vectorId: 'vec_doc_vector_embeddings',
    contentSnippet: '稠密向量嵌入技术将非结构化文档投射至多维语义流形。概念距离通过余弦相似度 Cosine = (A · B) / (||A|| ||B||) 量化，支持根据内容理解进行跨文档智能关联推荐。',
    fullText: `向量嵌入与语义推荐原理：
当用户输入非精确关键词（例如"如何优化查询缓存延迟"）时，传统数据库 LIKE 搜索无法匹配。向量模型将自然语言转化为稠密高维向量。通过在 Upstash Vector 索引中快速检索最近邻节点，系统能理解深层语意并实时计算相似度得分。`,
  },
  {
    id: 'doc_vercel_deployment',
    name: 'Vercel-生产部署环境最佳实践清单.md',
    size: 14200,
    type: 'text/markdown',
    blobUrl: 'https://blob.upstash.com/documents/Vercel-生产部署环境最佳实践清单.md',
    storageSource: 'upstash-blob',
    uploadedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    status: 'indexed',
    summary: 'Next.js 15 App Router 部署至 Vercel Serverless 及 Edge 运行时环境的关键注意项与环境配置规范。',
    tags: ['Vercel部署', '运维部署', '无服务器', 'NextJS'],
    vectorId: 'vec_doc_vercel_deployment',
    contentSnippet: 'Vercel Serverless Functions 具备短暂执行生命周期与无状态文件系统。持久化文件必须存入 Upstash Blob，全局会话与分布式锁须委托至 Upstash Redis。',
    fullText: `Vercel 部署检查规范：
- 在 Vercel 项目控制台中配置环境变量：UPSTASH_BLOB_TOKEN、UPSTASH_REDIS_REST_URL、UPSTASH_REDIS_REST_TOKEN、UPSTASH_VECTOR_REST_URL、UPSTASH_VECTOR_REST_TOKEN、QSTASH_TOKEN。
- 绝不在 Lambda 本地磁盘做持久写操作。
- 采用无状态 HTTP REST 请求池规避 TCP 连接耗尽。
- 开启 Edge 和 Node.js 适配运行时。`,
  },
  {
    id: 'doc_personal_notes',
    name: '2026-年度技术规划与演进备忘录.txt',
    size: 8900,
    type: 'text/plain',
    blobUrl: 'https://blob.upstash.com/documents/2026-年度技术规划与演进备忘录.txt',
    storageSource: 'upstash-blob',
    uploadedAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    status: 'indexed',
    summary: '个人技术架构路线图，聚焦高并发文档吞吐、分布式缓存一致性与智能向量推荐。',
    tags: ['技术规划', '路线图', '产品策略'],
    vectorId: 'vec_doc_personal_notes',
    contentSnippet: '下半年核心技术里程碑：借助 QStash 异步队列支撑万级文档并发入库；优化 Redis 缓存策略使 p99 延迟低于 5ms；全面开启文档向量距离的自动化跨篇章知识关联。',
    fullText: `技术演进目标：
1. 弹性吞吐：通过 QStash 异步工作队列消除上传阻塞。
2. 极低延迟：Redis 全局缓存用户会话与热门语义检索结果。
3. 智能关联：Upstash Vector 语义推荐引擎在用户阅读任意文档时自动呈现最相似的个人知识储备。`,
  },
];

// Global documents map
const globalForDocs = global as unknown as {
  documentsStore?: Map<string, DocumentItem>;
  initializedSeed?: boolean;
};

const docsMap = globalForDocs.documentsStore ?? new Map<string, DocumentItem>();
if (process.env.NODE_ENV !== 'production') {
  globalForDocs.documentsStore = docsMap;
}

// Ensure seed docs are indexed into Vector engine on boot
async function ensureSeedIndexed() {
  if (globalForDocs.initializedSeed) return;
  globalForDocs.initializedSeed = true;

  for (const doc of INITIAL_SEED_DOCUMENTS) {
    if (!docsMap.has(doc.id)) {
      docsMap.set(doc.id, doc);
      await VectorService.upsertDocument(doc, doc.fullText);
    }
  }
}

// Trigger initial seed
ensureSeedIndexed().catch(console.error);

export const DocumentService = {
  async getAll(): Promise<DocumentItem[]> {
    await ensureSeedIndexed();

    // Check Redis cache first
    const cached = await RedisService.get<DocumentItem[]>(REDIS_DOCS_KEY);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }

    // Cache miss: read from store and cache in Redis (TTL: 1 hour)
    const list = Array.from(docsMap.values()).sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
    await RedisService.set(REDIS_DOCS_KEY, list, 3600);
    return list;
  },

  async getById(id: string): Promise<DocumentItem | null> {
    await ensureSeedIndexed();
    return docsMap.get(id) || null;
  },

  async uploadDocument(options: {
    name: string;
    buffer: Buffer;
    contentType: string;
    summary?: string;
    tags?: string[];
  }): Promise<{ document: DocumentItem; taskId: string }> {
    await ensureSeedIndexed();

    const { name, buffer, contentType, tags = ['个人', '上传'] } = options;
    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // 1. Store in Upstash Blob
    const blobResult = await BlobService.put({
      filename: name,
      data: buffer,
      contentType,
      folder: 'documents',
    });

    const isText = contentType.startsWith('text/') || name.endsWith('.md') || name.endsWith('.txt');
    const fullText = isText ? buffer.toString('utf-8') : `${name} 格式文件上传`;
    const summary = options.summary || (isText ? fullText.slice(0, 160).replace(/\n/g, ' ') + '...' : `已上传文件: ${name}`);

    const newDoc: DocumentItem = {
      id: docId,
      name,
      size: buffer.length,
      type: contentType,
      blobUrl: blobResult.url,
      storageSource: blobResult.source,
      uploadedAt: new Date().toISOString(),
      status: 'processing', // Will become 'indexed' once QStash task runs
      summary,
      tags,
      fullText,
    };

    docsMap.set(docId, newDoc);

    // Invalidate Redis cache
    await RedisService.del(REDIS_DOCS_KEY);

    // 2. Dispatch async ingestion & vector embedding task to QStash
    const queueTask = await QueueService.enqueue({
      taskType: 'extract_and_embed',
      docId,
      docName: name,
      data: { text: fullText },
    });

    return {
      document: newDoc,
      taskId: queueTask.id,
    };
  },

  async markAsIndexed(docId: string): Promise<void> {
    const doc = docsMap.get(docId);
    if (!doc) return;

    // Vectorize and index into Upstash Vector
    const vectorId = await VectorService.upsertDocument(doc, doc.fullText);
    doc.status = 'indexed';
    doc.vectorId = vectorId;
    docsMap.set(docId, doc);

    // Refresh Redis cache
    await RedisService.del(REDIS_DOCS_KEY);
  },

  async searchSemantic(queryText: string): Promise<{
    results: SearchResultItem[];
    recommendations: DocumentItem[];
    query: string;
    totalMatched: number;
    latencyMs: number;
  }> {
    const startTime = Date.now();
    await ensureSeedIndexed();

    // Cache search results in Redis for rapid repeated queries (TTL: 5 mins)
    const cacheKey = `search:cache:${encodeURIComponent(queryText.trim().toLowerCase())}`;
    const cached = await RedisService.get<{
      results: SearchResultItem[];
      recommendations: DocumentItem[];
      query: string;
      totalMatched: number;
      latencyMs: number;
    }>(cacheKey);

    if (cached) {
      return cached;
    }

    const vectorHits = await VectorService.query(queryText, 8);
    const results: SearchResultItem[] = [];

    for (const hit of vectorHits) {
      const doc = hit.metadata?.docId ? docsMap.get(hit.metadata.docId) : null;
      if (doc) {
        results.push({
          document: doc,
          score: hit.score,
          matchedSnippet: hit.metadata?.snippet || doc.summary,
          matchedConcepts: doc.tags,
        });
      }
    }

    // Generate intelligent recommendations based on top result
    let recommendations: DocumentItem[] = [];
    if (results.length > 0) {
      const topDocId = results[0].document.id;
      const recHits = await VectorService.getRecommendations(topDocId, 3);
      recommendations = recHits
        .map((r) => docsMap.get(r.metadata?.docId || ''))
        .filter((d): d is DocumentItem => Boolean(d));
    }

    const responsePayload = {
      results,
      recommendations,
      query: queryText,
      totalMatched: results.length,
      latencyMs: Date.now() - startTime,
    };

    // Cache in Redis
    await RedisService.set(cacheKey, responsePayload, 300);

    return responsePayload;
  },

  async deleteDocument(id: string): Promise<boolean> {
    const doc = docsMap.get(id);
    if (!doc) return false;

    if (doc.vectorId) {
      await VectorService.delete(doc.vectorId);
    }
    docsMap.delete(id);
    await RedisService.del(REDIS_DOCS_KEY);
    return true;
  },
};
