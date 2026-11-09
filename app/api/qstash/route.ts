import { NextRequest, NextResponse } from 'next/server';
import { QueueService } from '@/lib/services/queue';

/**
 * QStash 资源 CRUD（Navicat 风格）
 *
 *   GET    /api/qstash?resource=logs|schedules|dlq|urlgroups|queues&cursor=
 *   POST   /api/qstash  { resource, action, ... }   新增/操作（create_schedule / publish / retry_dlq / create_urlgroup）
 *   PATCH  /api/qstash  { resource, id, action: pause|resume }  暂停/恢复定时任务或队列
 *   DELETE /api/qstash?resource=&id=...               单条/批量删除（重复 id 参数）
 */

export async function GET(req: NextRequest) {
  try {
    const resource = req.nextUrl.searchParams.get('resource') || 'logs';
    const cursor = req.nextUrl.searchParams.get('cursor') || undefined;

    switch (resource) {
      case 'logs': {
        const data = await QueueService.listLogs(cursor);
        return NextResponse.json({ success: true, ...data });
      }
      case 'schedules': {
        const data = await QueueService.listSchedules();
        return NextResponse.json({ success: true, ...data });
      }
      case 'dlq': {
        const data = await QueueService.listDLQ(cursor);
        return NextResponse.json({ success: true, ...data });
      }
      case 'urlgroups': {
        const data = await QueueService.listUrlGroups();
        return NextResponse.json({ success: true, ...data });
      }
      case 'queues': {
        const data = await QueueService.listQueues();
        return NextResponse.json({ success: true, ...data });
      }
      default:
        return NextResponse.json({ success: false, error: `未知资源: ${resource}` }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '查询失败' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const resource = body.resource;
    const action = body.action;

    // 新增定时任务
    if (resource === 'schedules' && action === 'create') {
      if (!body.destination || !body.cron) {
        return NextResponse.json({ success: false, error: 'destination 和 cron 必填' }, { status: 400 });
      }
      const res = await QueueService.createSchedule({
        destination: body.destination,
        cron: body.cron,
        body: body.body,
        method: body.method,
        retries: body.retries,
      });
      if (res.error) return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      return NextResponse.json({ success: true, scheduleId: res.scheduleId, live: res.live });
    }

    // 发布消息
    if (resource === 'messages' && action === 'publish') {
      if (!body.url) {
        return NextResponse.json({ success: false, error: 'url 必填' }, { status: 400 });
      }
      const res = await QueueService.publishRaw({
        url: body.url,
        body: body.body,
        method: body.method,
        headers: body.headers,
        retries: body.retries,
        delay: body.delay,
      });
      if (res.error) return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      return NextResponse.json({ success: true, messageId: res.messageId, live: res.live });
    }

    // 新建 URL Group
    if (resource === 'urlgroups' && action === 'create') {
      if (!body.name || !Array.isArray(body.endpoints)) {
        return NextResponse.json({ success: false, error: 'name 和 endpoints 必填' }, { status: 400 });
      }
      const res = await QueueService.createUrlGroup(body.name, body.endpoints);
      if (res.error) return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      return NextResponse.json({ success: true, live: res.live });
    }

    // DLQ 重试
    if (resource === 'dlq' && action === 'retry') {
      if (!Array.isArray(body.dlqIds) || body.dlqIds.length === 0) {
        return NextResponse.json({ success: false, error: 'dlqIds 必填' }, { status: 400 });
      }
      const res = await QueueService.retryDLQ(body.dlqIds);
      return NextResponse.json({ success: res.ok, live: res.live });
    }

    // 消息取消
    if (resource === 'messages' && action === 'cancel') {
      if (!Array.isArray(body.messageIds) || body.messageIds.length === 0) {
        return NextResponse.json({ success: false, error: 'messageIds 必填' }, { status: 400 });
      }
      const res = await QueueService.cancelMessages(body.messageIds);
      return NextResponse.json({ success: true, cancelled: res.cancelled, live: res.live });
    }

    return NextResponse.json({ success: false, error: `未知操作: ${resource}/${action}` }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '操作失败' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { resource, id, action } = body;
    if (!id) return NextResponse.json({ success: false, error: 'id 必填' }, { status: 400 });

    if (resource === 'schedules') {
      if (action === 'pause') {
        const res = await QueueService.pauseSchedule(id);
        return NextResponse.json({ success: res.ok });
      }
      if (action === 'resume') {
        const res = await QueueService.resumeSchedule(id);
        return NextResponse.json({ success: res.ok });
      }
    }

    return NextResponse.json({ success: false, error: `未知 pause/resume 操作` }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '操作失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const resource = req.nextUrl.searchParams.get('resource') || '';
    const ids = req.nextUrl.searchParams.getAll('id');

    if (ids.length === 0) {
      return NextResponse.json({ success: false, error: 'id 必填' }, { status: 400 });
    }

    switch (resource) {
      case 'schedules': {
        let ok = 0;
        for (const id of ids) {
          const res = await QueueService.deleteSchedule(id);
          if (res.ok) ok++;
        }
        return NextResponse.json({ success: ok > 0, deleted: ok, total: ids.length });
      }
      case 'dlq': {
        const res = await QueueService.deleteDLQ(ids);
        return NextResponse.json({ success: true, deleted: res.deleted, live: res.live });
      }
      case 'urlgroups': {
        let ok = 0;
        for (const id of ids) {
          const res = await QueueService.deleteUrlGroup(id);
          if (res.ok) ok++;
        }
        return NextResponse.json({ success: ok > 0, deleted: ok, total: ids.length });
      }
      case 'queues': {
        let ok = 0;
        for (const id of ids) {
          const res = await QueueService.deleteQueue(id);
          if (res.ok) ok++;
        }
        return NextResponse.json({ success: ok > 0, deleted: ok, total: ids.length });
      }
      case 'messages': {
        const res = await QueueService.cancelMessages(ids);
        return NextResponse.json({ success: true, cancelled: res.cancelled, live: res.live });
      }
      default:
        return NextResponse.json({ success: false, error: `未知资源: ${resource}` }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '删除失败' },
      { status: 500 }
    );
  }
}
