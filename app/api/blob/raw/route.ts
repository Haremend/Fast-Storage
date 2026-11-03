import { NextRequest, NextResponse } from 'next/server';
import { BlobService } from '@/lib/services/blob';

export async function GET(req: NextRequest) {
  try {
    const key = req.nextUrl.searchParams.get('key');
    if (!key) {
      return new NextResponse('Key is required', { status: 400 });
    }

    const stored = await BlobService.get(key);
    if (!stored) {
      return new NextResponse('Blob not found', { status: 404 });
    }

    return new NextResponse(new Uint8Array(stored.data), {
      headers: {
        'Content-Type': stored.contentType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${key.split('/').pop()}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    return new NextResponse('Internal server error', { status: 500 });
  }
}
