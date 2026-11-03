import { NextRequest, NextResponse } from 'next/server';
import { BlobService } from '@/lib/services/blob';
import { RedisService } from '@/lib/services/redis';
import { QueueService } from '@/lib/services/queue';

const DEFAULT_SESSION_ID = 'user_alex_morgan_01';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const sessionId = (formData.get('sessionId') as string) || DEFAULT_SESSION_ID;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate image format
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'File must be an image (PNG, JPG, WebP, GIF)' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Upload to Upstash Blob
    const blobResult = await BlobService.put({
      filename: file.name,
      data: buffer,
      contentType: file.type,
      folder: 'avatars',
    });

    // 2. Update user session in Redis
    const updatedSession = await RedisService.updateSessionAvatar(sessionId, blobResult.url);

    // 3. Dispatch background avatar sync task to QStash
    await QueueService.enqueue({
      taskType: 'avatar_sync',
      docName: file.name,
      data: { avatarUrl: blobResult.url, sessionId },
    });

    return NextResponse.json({
      success: true,
      avatarUrl: blobResult.url,
      storageSource: blobResult.source,
      session: updatedSession,
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Avatar upload failed' },
      { status: 500 }
    );
  }
}
