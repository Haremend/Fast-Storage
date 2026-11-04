import { NextRequest, NextResponse } from 'next/server';
import { BlobService } from '@/lib/services/blob';
import { RedisService } from '@/lib/services/redis';
import { UploadedWallpaper, WallpaperConfig } from '@/lib/types';

// GET: Retrieve wallpaper history and active config from Upstash
export async function GET() {
  try {
    const [wallpapers, activeConfig] = await Promise.all([
      RedisService.getWallpaperHistory(),
      RedisService.getActiveWallpaperConfig(),
    ]);

    return NextResponse.json({
      success: true,
      wallpapers: wallpapers || [],
      activeConfig: activeConfig || null,
      blobLive: BlobService.isLive(),
    });
  } catch (error) {
    console.error('Failed to get wallpapers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve wallpapers' },
      { status: 500 }
    );
  }
}

// POST: Upload wallpaper image to Upstash Blob OR update active wallpaper config
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // Case 1: JSON body (e.g. set active wallpaper)
    if (contentType.includes('application/json')) {
      const body = await req.json();
      if (body.action === 'set_active' && body.config) {
        await RedisService.setActiveWallpaperConfig(body.config);
        return NextResponse.json({
          success: true,
          activeConfig: body.config,
        });
      }
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    // Case 2: Multipart Form Data (Upload to Upstash Blob)
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const dimPercent = parseInt((formData.get('dimPercent') as string) || '0', 10);

    if (!file) {
      return NextResponse.json(
        { success: false, error: '未提供图片文件' },
        { status: 400 }
      );
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: '只允许上传图片格式 (PNG, JPG, WebP, GIF, AVIF)' },
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
      folder: 'wallpapers',
    });

    const newWallpaper: UploadedWallpaper = {
      id: `wp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: file.name,
      url: blobResult.url,
      key: blobResult.key,
      size: blobResult.size,
      uploadedAt: new Date().toISOString(),
      source: blobResult.source,
    };

    // 2. Persist in Upstash Redis Wallpaper History
    await RedisService.saveWallpaperToHistory(newWallpaper);

    // 3. Set as currently active wallpaper in Redis
    const newActiveConfig: WallpaperConfig = {
      type: 'custom',
      presetId: 'dark-purple-default',
      customDataUrl: blobResult.url,
      customKey: blobResult.key,
      dimPercent: isNaN(dimPercent) ? 0 : dimPercent,
    };
    await RedisService.setActiveWallpaperConfig(newActiveConfig);

    return NextResponse.json({
      success: true,
      wallpaper: newWallpaper,
      activeConfig: newActiveConfig,
      storageSource: blobResult.source,
      message: blobResult.source === 'upstash-blob'
        ? '已成功持久化上传至 Upstash Blob 云端存储'
        : '已成功暂存于云端存储池并建立历史索引',
    });
  } catch (error) {
    console.error('Wallpaper upload error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '壁纸上传失败' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a wallpaper from Upstash Blob and Redis history
export async function DELETE(req: NextRequest) {
  try {
    const key = req.nextUrl.searchParams.get('key');
    const id = req.nextUrl.searchParams.get('id');

    if (!key && !id) {
      return NextResponse.json({ success: false, error: '缺少 key 或 id' }, { status: 400 });
    }

    if (key) {
      await BlobService.delete(key);
    }

    await RedisService.removeWallpaperFromHistory(key || id || '');

    // Check if active wallpaper was deleted
    const active = await RedisService.getActiveWallpaperConfig();
    if (active?.customKey === key || active?.customDataUrl?.includes(encodeURIComponent(key || ''))) {
      const resetConfig: WallpaperConfig = {
        type: 'preset',
        presetId: 'dark-purple-default',
        customDataUrl: null,
        customKey: null,
        dimPercent: 0,
      };
      await RedisService.setActiveWallpaperConfig(resetConfig);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete wallpaper:', error);
    return NextResponse.json(
      { success: false, error: '删除壁纸失败' },
      { status: 500 }
    );
  }
}
