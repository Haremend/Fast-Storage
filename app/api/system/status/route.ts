import { NextRequest, NextResponse } from 'next/server';
import { envConfig } from '@/lib/config';
import { RedisService } from '@/lib/services/redis';
import { BlobService } from '@/lib/services/blob';
import { VectorService } from '@/lib/services/vector';
import { QueueService } from '@/lib/services/queue';
import { SystemStatus } from '@/lib/types';

export async function GET() {
  const cacheStats = RedisService.getStats();

  const [redisTest, blobTest, vectorTest, qstashTest] = await Promise.all([
    RedisService.testConnection(),
    BlobService.testConnection(),
    VectorService.testConnection(),
    QueueService.testConnection(),
  ]);

  const status: SystemStatus = {
    redisConnected: redisTest.connected,
    redisType: RedisService.isLive() ? 'live' : 'mock',
    blobConnected: blobTest.connected,
    blobType: BlobService.isLive() ? 'live' : 'mock',
    vectorConnected: vectorTest.connected,
    vectorType: VectorService.isLive() ? 'live' : 'mock',
    qstashConnected: qstashTest.connected,
    qstashType: QueueService.isLive() ? 'live' : 'mock',
    isVercel: envConfig.isVercel,
    cacheStats,
  };

  return NextResponse.json({
    success: true,
    status,
    diagnostics: {
      redis: redisTest,
      blob: blobTest,
      vector: vectorTest,
      qstash: qstashTest,
    },
    environment: {
      isVercel: envConfig.isVercel,
      appUrl: envConfig.appUrl,
      hasBlobKey: envConfig.hasUpstashBlob,
      hasRedisKey: envConfig.hasUpstashRedis,
      hasVectorKey: envConfig.hasUpstashVector,
      hasQStashKey: envConfig.hasQStash,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action;

    if (action === 'test_connections') {
      const [redis, blob, vector, qstash] = await Promise.all([
        RedisService.testConnection(),
        BlobService.testConnection(),
        VectorService.testConnection(),
        QueueService.testConnection(),
      ]);

      return NextResponse.json({
        success: true,
        diagnostics: { redis, blob, vector, qstash },
        status: {
          redisConnected: redis.connected,
          redisType: RedisService.isLive() ? 'live' : 'mock',
          blobConnected: blob.connected,
          blobType: BlobService.isLive() ? 'live' : 'mock',
          vectorConnected: vector.connected,
          vectorType: VectorService.isLive() ? 'live' : 'mock',
          qstashConnected: qstash.connected,
          qstashType: QueueService.isLive() ? 'live' : 'mock',
          isVercel: envConfig.isVercel,
          cacheStats: RedisService.getStats(),
        },
      });
    }

    if (action === 'purge_cache') {
      await RedisService.flushall();
      await QueueService.enqueue({
        taskType: 'purge_cache',
        docName: '全局缓存刷新 (Cache Flush)',
      });
      return NextResponse.json({
        success: true,
        message: 'Redis 全局缓存已清空，所有过期与旧键已成功失效。',
        cacheStats: RedisService.getStats(),
      });
    }

    return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '操作失败' },
      { status: 500 }
    );
  }
}
