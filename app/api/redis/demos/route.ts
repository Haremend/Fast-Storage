import { NextRequest, NextResponse } from 'next/server';
import { RedisService } from '@/lib/services/redis';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action;

    // Demo 1: Rate Limiting
    if (action === 'test_ratelimit') {
      const clientId = body.clientId || 'demo_user_client';
      const limit = Number(body.limit) || 5;
      const windowSeconds = Number(body.windowSeconds) || 10;

      const result = await RedisService.rateLimitDemo(clientId, limit, windowSeconds);

      return NextResponse.json({
        success: result.success,
        remaining: result.remaining,
        limit,
        resetInSeconds: result.resetInSeconds,
        message: result.success
          ? `请求通过！剩余额度: ${result.remaining}/${limit}`
          : `已触发限流！请求过于频繁，请等待 ${result.resetInSeconds} 秒后重试`,
      });
    }

    // Demo 2: Atomic Counter
    if (action === 'increment_counter') {
      const counterKey = body.counterKey || 'demo:counter:visitors';
      const newValue = await RedisService.incrementCounter(counterKey);

      return NextResponse.json({
        success: true,
        counterKey,
        value: newValue,
        message: `Redis 原子 INCR 累加成功，当前值: ${newValue}`,
      });
    }

    // Demo 3: TTL Cache Demo
    if (action === 'set_ttl_cache') {
      const tempKey = body.key || `cache:temp:${Date.now()}`;
      const tempVal = body.value || '这是一条 15 秒过期的临时缓存数据';
      const ttl = Number(body.ttl) || 15;

      await RedisService.set(tempKey, tempVal, ttl);

      return NextResponse.json({
        success: true,
        key: tempKey,
        ttl,
        message: `临时缓存已写入 Redis，将在 ${ttl} 秒后自动过期消除`,
      });
    }

    return NextResponse.json({ success: false, error: '未知的实验操作' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '演示操作执行异常' },
      { status: 500 }
    );
  }
}
