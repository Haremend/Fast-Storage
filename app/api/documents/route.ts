import { NextRequest, NextResponse } from 'next/server';
import { DocumentService } from '@/lib/services/documents';

export async function GET(req: NextRequest) {
  try {
    // 单个文件查询（预览弹窗使用）：?key= 或 ?id=
    const singleKey = req.nextUrl.searchParams.get('key') || req.nextUrl.searchParams.get('id');
    if (singleKey) {
      const document = await DocumentService.getById(singleKey);
      if (!document) {
        return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, document });
    }

    const cursor = req.nextUrl.searchParams.get('cursor') || undefined;
    const limitParam = req.nextUrl.searchParams.get('limit');
    const prefix = req.nextUrl.searchParams.get('prefix') || undefined;
    const sortByParam = req.nextUrl.searchParams.get('sortBy');
    const orderParam = req.nextUrl.searchParams.get('order');
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    const sortBy: 'size' | 'date' | undefined =
      sortByParam === 'size' || sortByParam === 'date' ? sortByParam : undefined;
    const order: 'asc' | 'desc' | undefined =
      orderParam === 'asc' || orderParam === 'desc' ? orderParam : undefined;

    const { documents, cursor: nextCursor, hasMore, blobLive, sorted } = await DocumentService.listAll({
      cursor,
      limit: Number.isFinite(limit) ? limit : 20,
      prefix: prefix || undefined,
      sortBy,
      order,
    });

    return NextResponse.json({
      success: true,
      documents,
      cursor: nextCursor,
      hasMore,
      count: documents.length,
      blobLive,
      sorted,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to retrieve documents' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    let filename = 'document.txt';
    let mimeType = 'text/plain';
    let fileBuffer: Buffer;
    let summary: string | undefined;
    let tags: string[] = ['个人', '上传'];
    let folder: 'avatars' | 'documents' | 'wallpapers' | 'temp' = 'documents';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ success: false, error: 'No file received' }, { status: 400 });
      }

      filename = file.name;
      mimeType = file.type || 'application/octet-stream';
      const arrayBuf = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuf);

      const formSummary = formData.get('summary') as string | null;
      if (formSummary) summary = formSummary;
      const formTags = formData.get('tags') as string | null;
      if (formTags) {
        tags = formTags.split(',').map((t) => t.trim()).filter(Boolean);
      }
      const formFolder = (formData.get('folder') as string) || 'documents';
      if (['avatars', 'documents', 'wallpapers', 'temp'].includes(formFolder)) {
        folder = formFolder as 'avatars' | 'documents' | 'wallpapers' | 'temp';
      }
    } else {
      // JSON payload upload
      const body = await req.json();
      filename = body.name || 'document.md';
      mimeType = body.type || 'text/markdown';
      fileBuffer = Buffer.from(body.content || '');
      summary = body.summary;
      if (Array.isArray(body.tags)) tags = body.tags;
      if (typeof body.folder === 'string' && ['avatars', 'documents', 'wallpapers', 'temp'].includes(body.folder)) {
        folder = body.folder as 'avatars' | 'documents' | 'wallpapers' | 'temp';
      }
    }

    const { document, textLike } = await DocumentService.uploadDocument({
      name: filename,
      buffer: fileBuffer,
      contentType: mimeType,
      summary,
      tags,
      folder,
    });

    return NextResponse.json({
      success: true,
      document,
      textLike,
      duplicates: document.duplicates || [],
      relatedDocs: document.relatedDocs || [],
      message: `Document stored in Upstash Blob${textLike ? '; semantic vector built for 语义检索舱' : ''}.`,
    });
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Document upload failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // 支持批量：?key=a&key=b...（也兼容单个 ?key= 与 ?id=）
    const keys = req.nextUrl.searchParams.getAll('key');
    const idFallback = req.nextUrl.searchParams.get('id');
    const targets = keys.length > 0 ? keys : idFallback ? [idFallback] : [];

    if (targets.length === 0) {
      return NextResponse.json({ success: false, error: 'Document key is required' }, { status: 400 });
    }

    let deleted = 0;
    for (const key of targets) {
      if (await DocumentService.deleteDocument(key)) deleted += 1;
    }

    return NextResponse.json({
      success: deleted > 0,
      deleted,
      total: targets.length,
      message: `已删除 ${deleted} / ${targets.length} 个文件`,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Document deletion failed' },
      { status: 500 }
    );
  }
}
