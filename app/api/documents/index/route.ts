import { NextRequest, NextResponse } from 'next/server';
import { BlobService } from '@/lib/services/blob';
import { VectorService } from '@/lib/services/vector';
import { DocumentService } from '@/lib/services/documents';
import { RedisService } from '@/lib/services/redis';

const REDIS_BLOB_INDEX_KEY = 'blob:documents:index';

/**
 * POST /api/documents/index  { key: string }
 *
 * Reads a text-like file from Blob, (re)builds its semantic vector
 * entry, and returns a ready-to-use 语义检索舱 query. The documents
 * view's "转到语义检索" button calls this before navigating.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const key = typeof body?.key === 'string' ? body.key.trim() : '';
    if (!key) {
      return NextResponse.json({ success: false, error: 'key is required' }, { status: 400 });
    }

    const isText =
      /\.(md|markdown|txt|csv|json|js|ts|tsx|jsx|html|css|log|ini|ya?ml|xml)$/i.test(key) ||
      body.textLike === true;
    if (!isText) {
      return NextResponse.json(
        { success: false, error: '仅文本类文件可转为语义向量（当前文件不支持）', textLike: false },
        { status: 400 }
      );
    }

    const bytes = await BlobService.getBytes(key);
    if (!bytes) {
      return NextResponse.json({ success: false, error: '无法读取文件内容' }, { status: 404 });
    }
    const fullText = bytes.data.toString('utf-8');

    const head = await BlobService.head(key);
    const name = key.split('/').pop() || key;
    const doc = await DocumentService.getById(key);

    const vectorId = await VectorService.upsertDocument(
      {
        id: key,
        name,
        size: bytes.data.length,
        type: bytes.contentType || 'text/plain',
        blobUrl: head?.url || '',
        storageSource: head ? (BlobService.isLive() ? 'upstash-blob' : 'simulated-blob') : 'simulated-blob',
        uploadedAt: head?.uploadedAt || new Date().toISOString(),
        status: 'indexed',
        summary: doc?.summary || fullText.slice(0, 160).replace(/\n/g, ' '),
        tags: doc?.tags || ['个人'],
        fullText,
        contentSnippet: doc?.contentSnippet || fullText.slice(0, 220),
      },
      fullText
    );

    // Refresh the cached metadata + recompute duplicates/related (same as upload path)
    const index = await RedisService.get<Record<string, unknown>>(REDIS_BLOB_INDEX_KEY);
    const indexMap = index && typeof index === 'object' ? index : {};

    let duplicates: { id: string; name: string; similarity: number }[] = [];
    let related: { id: string; name: string; similarity: number }[] = [];
    const hits = await VectorService.query(fullText, 8);
    for (const hit of hits) {
      if (hit.metadata?.docId === key) continue;
      const sim = Number(hit.score);
      const target = { id: hit.metadata?.docId || '', name: hit.metadata?.name || '', similarity: sim };
      if (!target.id) continue;
      if (sim >= 0.85) duplicates.push(target);
      else if (sim >= 0.45) related.push(target);
    }
    duplicates.sort((a, b) => b.similarity - a.similarity);
    related.sort((a, b) => b.similarity - a.similarity);

    indexMap[key] = {
      ...(indexMap[key] || {}),
      vectorId,
      status: 'indexed',
      fullText,
      contentSnippet: fullText.slice(0, 220),
      duplicates,
      relatedDocs: related,
    };
    await RedisService.set(REDIS_BLOB_INDEX_KEY, indexMap, 86400 * 30);

    return NextResponse.json({
      success: true,
      vectorId,
      textLike: true,
      duplicates,
      relatedDocs: related,
      query: `${name.replace(/\.[^/.]+$/, '')} ${fullText.slice(0, 80)}`.trim().slice(0, 120),
    });
  } catch (error) {
    console.error('Index document error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '向量化失败' },
      { status: 500 }
    );
  }
}