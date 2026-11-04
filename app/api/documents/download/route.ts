import { NextRequest, NextResponse } from 'next/server';
import { BlobService } from '@/lib/services/blob';

export async function GET(req: NextRequest) {
  try {
    const key = req.nextUrl.searchParams.get('key') || req.nextUrl.searchParams.get('id');
    if (!key) {
      return new NextResponse('缺少文件 Key', { status: 400 });
    }

    const head = await BlobService.head(key);
    if (!head) {
      return new NextResponse('文件不存在', { status: 404 });
    }

    const bytes = await BlobService.getBytes(key);
    if (!bytes) {
      return new NextResponse('文件读取失败', { status: 500 });
    }

    const name = key.split('/').pop() || key;
    return new Response(new Uint8Array(bytes.data), {
      headers: {
        'Content-Type': bytes.contentType || 'application/octet-stream',
        'Content-Length': String(bytes.data.length),
        'Content-Disposition': `attachment; filename="${name.replace(/[^\w.\-]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name)}`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return new NextResponse('下载处理异常', { status: 500 });
  }
}