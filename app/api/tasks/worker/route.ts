import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { envConfig } from '@/lib/config';
import { runVectorizationTask } from '@/lib/services/worker';

/**
 * POST /api/tasks/worker
 *
 * QStash 消费端：收到队列消息后异步执行向量化任务。
 * live 模式由 QStash 通过签名验证调用；本地 mock 由 queue.ts 的
 * setTimeout 直接调用 runVectorizationTask（不走本路由）。
 *
 * 期望 body: { taskId: string, payload: { taskType, docId, docName, data } }
 */
export async function POST(req: NextRequest) {
  // 1. 验签（live 模式才有签名头；mock 不会走这个路由）
  if (envConfig.hasQStash && envConfig.qstashSigningKey) {
    const signature = req.headers.get('upstash-signature');
    if (signature) {
      try {
        const bodyText = await req.text();
        const receiver = new Receiver({
          currentSigningKey: envConfig.qstashSigningKey,
        });
        const ok = await receiver.verify({
          signature,
          body: bodyText,
          url: `${envConfig.appUrl}/api/tasks/worker`,
        });
        if (!ok) {
          return NextResponse.json({ success: false, error: '签名验证失败' }, { status: 401 });
        }
        const payload = JSON.parse(bodyText);
        return await handleTask(payload);
      } catch (err) {
        console.error('[worker] 签名验证/解析失败:', err);
        return NextResponse.json({ success: false, error: '验证失败' }, { status: 401 });
      }
    }
  }

  // 无签名头（本地调试直连）
  try {
    const body = await req.json();
    return await handleTask(body);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'worker 处理失败' },
      { status: 500 }
    );
  }
}

async function handleTask(body: {
  taskId?: string;
  payload?: { taskType?: string; docId?: string; docName?: string; data?: { text?: string } };
}) {
  const payload = body.payload || (body as unknown as { taskType?: string; docId?: string; docName?: string; data?: { text?: string } });
  const docId = payload.docId;
  if (!docId) {
    return NextResponse.json({ success: false, error: 'docId 缺失' }, { status: 400 });
  }

  try {
    const result = await runVectorizationTask({
      taskId: body.taskId,
      docId,
      docName: payload.docName,
      data: payload.data,
    });
    return NextResponse.json({ success: result.ok, ...result });
  } catch (err) {
    console.error('[worker] 向量化任务失败:', err);
    // 返回非 2xx 让 QStash 自动重试
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : '向量化失败' },
      { status: 500 }
    );
  }
}
