import { NextRequest, NextResponse } from 'next/server';
import { QueueService } from '@/lib/services/queue';

export async function GET() {
  try {
    const tasks = QueueService.getTasks();
    const stats = {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === 'pending').length,
      processing: tasks.filter((t) => t.status === 'processing').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      failed: tasks.filter((t) => t.status === 'failed').length,
      isLive: QueueService.isLive(),
    };

    return NextResponse.json({
      success: true,
      tasks,
      stats,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch queue tasks' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action;

    if (action === 'retry' && body.taskId) {
      const task = QueueService.retryTask(body.taskId);
      return NextResponse.json({ success: true, task });
    }

    if (action === 'clear_completed') {
      QueueService.clearCompleted();
      return NextResponse.json({ success: true, tasks: QueueService.getTasks() });
    }

    if (action === 'enqueue_custom') {
      const task = await QueueService.enqueue({
        taskType: body.taskType || 'generate_summary',
        docId: body.docId,
        docName: body.docName,
        data: body.data,
      });
      return NextResponse.json({ success: true, task });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Task action failed' },
      { status: 500 }
    );
  }
}
