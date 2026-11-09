import { NextRequest, NextResponse } from 'next/server';
import { runVectorizationTask } from '@/lib/services/worker';

/**
 * POST /api/documents/index  { key: string }
 *
 * 手动触发向量化（文件管理里的"转到向量数据库"按钮调用）。
 * 复用与上传异步 worker 完全相同的 runVectorizationTask，消除重复逻辑；
 * 同时保证与队列消费路径的行为一致（含 dedup/related、搜索缓存失效）。
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const key = typeof body?.key === 'string' ? body.key.trim() : '';
    if (!key) {
      return NextResponse.json({ success: false, error: 'key is required' }, { status: 400 });
    }

    const isText =
      /\.(md|markdown|txt|csv|json|js|ts|tsx|jsx|html|css|log|ini|ya?ml|xml)$/i.test(key) ||
      body.textLike === true;
    if (!isText) {
      return NextResponse.json(
        { success: false, error: '仅文本类文件可转为语义向量（当前文件不支持）', textLike: false },
        { status: 400 }
      );
    }

    const result = await runVectorizationTask({ docId: key });

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.reason || '向量化失败' }, { status: 500 });
    }

    const name = key.split('/').pop() || key;
    return NextResponse.json({
      success: true,
      vectorId: result.vectorId,
      textLike: true,
      query: name.replace(/\.[^/.]+$/, ''),
    });
  } catch (error) {
    console.error('Index document error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '向量化失败' },
      { status: 500 }
    );
  }
}
