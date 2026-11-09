import { BlobService } from './blob';
import { VectorService } from './vector';
import { RedisService } from './redis';
import { getDocIndex, setDocIndex } from './docIndex';
import { DocumentItem } from '../types';

/**
 * mock 模式（无 Upstash Vector 凭证）的向量库是进程内 Map，冷启动后会
 * 清空导致 dedup/related 失效。此函数在向量化前从 Redis 索引找回
 * 有 fullText 的文档并重建向量索引（只执行一次）。
 */
let warmedOnce = false;
async function ensureLocalIndexWarmed(): Promise<void> {
  if (warmedOnce || VectorService.isLive()) return;
  warmedOnce = true;
  const index = await getDocIndex();
  for (const [key, meta] of Object.entries(index)) {
    if (!meta.fullText || VectorService.getCount() > Object.keys(index).length) break;
    const doc: DocumentItem = {
      id: key,
      name: key.includes('/') ? key.split('/').pop() || key : key,
      size: meta.size || 0,
      type: meta.type || 'text/plain',
      blobUrl: meta.blobUrl || '',
      storageSource: 'simulated-blob',
      uploadedAt: meta.uploadedAt || new Date().toISOString(),
      status: 'indexed',
      summary: meta.summary || '',
      tags: meta.tags || [],
      fullText: meta.fullText,
    };
    try {
      await VectorService.upsertDocument(doc, meta.fullText);
    } catch (err) {
      console.warn(`[worker] warm vector failed for ${key}:`, err);
    }
  }
}

/**
 * 异步向量化任务的统一处理逻辑——既被 QStash worker 路由（live）
 * 调用，也被本地 mock 的 setTimeout 处理器调用。
 *
 * 输入 payload：
 *   - docId: Upstash Blob 的 key（= DocumentItem.id）
 *   - data.text: 可选的全文（上传时已从 buffer 解出，避免 worker 再读一次）
 *
 * 流程：读 Blob → 向量化 → 查相似 → 更新 Redis 索引元数据。
 */
export async function runVectorizationTask(payload: {
  taskId?: string;
  docId: string;
  docName?: string;
  data?: { text?: string };
}): Promise<{ ok: boolean; vectorId?: string; reason?: string }> {
  const { docId } = payload;
  if (!docId) return { ok: false, reason: 'docId 缺失' };

  // 1. 拿到上传时写入的缓存元数据（summary/tags/type/原始全文等）
  const index = await getDocIndex();
  const cached = index[docId];
  if (!cached) {
    return { ok: false, reason: '文档元数据不存在（可能未通过上传通道写入）' };
  }

  // 2. 决定向量化用的文本：优先用 payload 带来的全文，其次用缓存的 fullText，
  //    再退到 Blob 里读一遍（worker 可能跨实例冷启动后缓存丢失）
  let fullText = payload.data?.text || cached.fullText || '';
  if (!fullText) {
    const bytes = await BlobService.getBytes(docId);
    if (bytes) {
      const isText =
        (cached.type || '').startsWith('text/') ||
        /\.(md|markdown|txt|csv|json|js|ts|tsx|jsx|html|css|log)$/i.test(docId);
      if (isText) fullText = bytes.data.toString('utf-8');
    }
  }

  // 非文本文件：直接标记为 indexed（没有向量，但不再处于 processing）
  if (!fullText) {
    index[docId] = { ...cached, status: 'indexed' };
    await setDocIndex(index);
    return { ok: true, reason: '非文本文件，无需向量化' };
  }

  // 3. 向量化（upsert）：用 Blob 元数据 + 缓存元数据组装一个完整 DocumentItem
  const head = await BlobService.head(docId);
  const name = docId.includes('/') ? docId.split('/').pop() || docId : docId;
  const doc: DocumentItem = {
    id: docId,
    name,
    size: head?.size || cached.size || 0,
    type: cached.type || head?.contentType || 'text/plain',
    blobUrl: head?.url || cached.blobUrl || '',
    storageSource: 'upstash-blob',
    uploadedAt: head?.uploadedAt || cached.uploadedAt || new Date().toISOString(),
    status: 'indexed',
    summary: cached.summary || fullText.slice(0, 160).replace(/\n/g, ' '),
    tags: cached.tags?.length ? cached.tags : ['个人'],
    fullText,
  };

  const vectorId = await VectorService.upsertDocument(doc, fullText);

  // 4. 查相似：≥ 0.85 疑似重复，≥ 0.45 相关。mock 冷启动先恢复本地向量索引
  await ensureLocalIndexWarmed();
  let duplicates: { id: string; name: string; similarity: number }[] = [];
  let related: { id: string; name: string; similarity: number }[] = [];
  const hits = await VectorService.query(fullText, 8);
  for (const hit of hits) {
    if (hit.metadata?.docId === docId) continue;
    const sim = Number(hit.score);
    const target = { id: hit.metadata?.docId || '', name: hit.metadata?.name || '', similarity: sim };
    if (!target.id) continue;
    if (sim >= 0.85) duplicates.push(target);
    else if (sim >= 0.45) related.push(target);
  }
  duplicates.sort((a, b) => b.similarity - a.similarity);
  related.sort((a, b) => b.similarity - a.similarity);

  // 5. 写回索引：标记 indexed + 写入 vectorId / 重复 / 相关 / 正文片段
  index[docId] = {
    ...cached,
    status: 'indexed',
    vectorId,
    duplicates,
    relatedDocs: related,
    fullText,
    contentSnippet: fullText.slice(0, 220),
  };
  await setDocIndex(index);

  // 6. 新文档已可被搜索：失效旧的搜索缓存
  await RedisService.deleteByPattern('search:cache:*').catch(() => {});

  return { ok: true, vectorId };
}
