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
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    const { documents, cursor: nextCursor, hasMore, blobLive } = await DocumentService.listAll({
      cursor,
      limit: Number.isFinite(limit) ? limit : 20,
      prefix: prefix || undefined,
    });

    return NextResponse.json({
      success: true,
      documents,
      cursor: nextCursor,
      hasMore,
      count: documents.length,
      blobLive,
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
    } else {
      // JSON payload upload
      const body = await req.json();
      filename = body.name || 'document.md';
      mimeType = body.type || 'text/markdown';
      fileBuffer = Buffer.from(body.content || '');
      summary = body.summary;
      if (Array.isArray(body.tags)) tags = body.tags;
    }

    const { document, textLike } = await DocumentService.uploadDocument({
      name: filename,
      buffer: fileBuffer,
      contentType: mimeType,
      summary,
      tags,
    });

    return NextResponse.json({
      success: true,
      document,
      textLike,
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
    const key = req.nextUrl.searchParams.get('key') || req.nextUrl.searchParams.get('id');
    if (!key) {
      return NextResponse.json({ success: false, error: 'Document key is required' }, { status: 400 });
    }

    const success = await DocumentService.deleteDocument(key);
    return NextResponse.json({
      success,
      message: success ? 'Document deleted from Blob, Vector index, and metadata cache' : 'Document not found',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Document deletion failed' },
      { status: 500 }
    );
  }
}
