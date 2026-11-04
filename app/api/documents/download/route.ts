import { NextRequest, NextResponse } from 'next/server';
import { DocumentService } from '@/lib/services/documents';
import { BlobService } from '@/lib/services/blob';

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return new NextResponse('缺少文档 ID', { status: 400 });
    }

    const doc = await DocumentService.getById(id);
    if (!doc) {
      return new NextResponse('文档不存在', { status: 404 });
    }

    let fileBuffer: Buffer | Uint8Array;

    // Check if stored in simulated bucket
    const localBlob = await BlobService.get(doc.blobUrl.replace('/api/blob/raw?key=', ''));
    if (localBlob) {
      fileBuffer = new Uint8Array(localBlob.data);
    } else if (doc.fullText) {
      fileBuffer = new TextEncoder().encode(doc.fullText);
    } else {
      fileBuffer = new TextEncoder().encode(`Fast Storage Document: ${doc.name}\n\n${doc.summary}`);
    }

    // Set proper headers to trigger browser attachment download
    return new Response(fileBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': doc.type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.name)}"; filename*=UTF-8''${encodeURIComponent(doc.name)}`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return new NextResponse('下载处理异常', { status: 500 });
  }
}
