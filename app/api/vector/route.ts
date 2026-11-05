import { NextRequest, NextResponse } from 'next/server';
import { VectorService } from '@/lib/services/vector';

/**
 * Navicat-style vector DB CRUD endpoint.
 *
 *   GET    /api/vector?cursor=&limit=   list records (default 10/page)
 *   POST   /api/vector                  upsert a record { id?, data, metadata }
 *   PATCH  /api/vector                  update metadata only { id, metadata }
 *   DELETE /api/vector?id=              delete one record
 *   DELETE /api/vector?reset=true       wipe the whole index
 */

export async function GET(req: NextRequest) {
  try {
    const cursor = req.nextUrl.searchParams.get('cursor') || undefined;
    const limitParam = req.nextUrl.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    const { vectors, nextCursor, hasMore } = await VectorService.listAll({
      cursor,
      limit: Number.isFinite(limit) ? limit : 10,
    });

    return NextResponse.json({
      success: true,
      vectors,
      cursor: nextCursor,
      hasMore,
      count: vectors.length,
      live: VectorService.isLive(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to list vectors' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = typeof body?.data === 'string' ? body.data.trim() : '';
    if (!data) {
      return NextResponse.json(
        { success: false, error: '文本内容 (data) 不能为空 — 向量库需要它来生成向量' },
        { status: 400 }
      );
    }
    const id =
      typeof body?.id === 'string' && body.id.trim()
        ? body.id.trim()
        : `vec_manual_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const metadata =
      body?.metadata && typeof body.metadata === 'object' ? (body.metadata as Record<string, unknown>) : {};

    const resultId = await VectorService.upsertRaw({ id, data, metadata });
    return NextResponse.json({ success: true, id: resultId });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to upsert vector' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const id = typeof body?.id === 'string' ? body.id.trim() : '';
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }
    const metadata =
      body?.metadata && typeof body.metadata === 'object' ? (body.metadata as Record<string, unknown>) : {};

    const ok = await VectorService.updateMetadata(id, metadata);
    return NextResponse.json({ success: ok, id });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update vector' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (req.nextUrl.searchParams.get('reset') === 'true') {
      const ok = await VectorService.clear();
      return NextResponse.json({ success: ok, reset: true });
    }

    // 支持批量：?id=a&id=b...
    const ids = req.nextUrl.searchParams.getAll('id');
    if (ids.length === 0) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    for (const id of ids) {
      await VectorService.delete(id);
    }
    return NextResponse.json({ success: true, deleted: ids.length, ids });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete vector' },
      { status: 500 }
    );
  }
}
