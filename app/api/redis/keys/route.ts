import { NextRequest, NextResponse } from 'next/server';
import { RedisService } from '@/lib/services/redis';

export async function GET(req: NextRequest) {
  try {
    const pattern = req.nextUrl.searchParams.get('pattern') || '*';
    const [keys, info, stats] = await Promise.all([
      RedisService.listKeysWithDetails(pattern),
      RedisService.getRedisInfo(),
      Promise.resolve(RedisService.getStats()),
    ]);

    return NextResponse.json({
      success: true,
      keys,
      info,
      stats,
      isLive: RedisService.isLive(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '获取 Redis 键失败' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { key, value, ttl } = await req.json();
    if (!key || key.trim() === '') {
      return NextResponse.json({ success: false, error: '键名 key 不能为空' }, { status: 400 });
    }

    const ttlSeconds = typeof ttl === 'number' && ttl > 0 ? ttl : undefined;

    // Parse JSON if possible for rich structures
    let parsedValue = value;
    try {
      if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
        parsedValue = JSON.parse(value);
      }
    } catch {
      parsedValue = value;
    }

    await RedisService.set(key.trim(), parsedValue, ttlSeconds);

    return NextResponse.json({
      success: true,
      message: `键 "${key}" 已成功保存至 Redis`,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '保存失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const key = req.nextUrl.searchParams.get('key');
    if (!key) {
      return NextResponse.json({ success: false, error: '缺少待删除的 key' }, { status: 400 });
    }

    const deleted = await RedisService.del(key);
    return NextResponse.json({
      success: deleted,
      message: `键 "${key}" 已从 Redis 中删除`,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '删除失败' },
      { status: 500 }
    );
  }
}
