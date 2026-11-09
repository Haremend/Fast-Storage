'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  RefreshCw,
  Trash2,
  Plus,
  ChevronRight,
  Loader2,
  AlertTriangle,
  X,
  Check,
  Pause,
  Play,
  RotateCw,
  Search,
} from 'lucide-react';

type Tab = 'logs' | 'schedules' | 'dlq' | 'urlgroups' | 'queues';

const TABS: { id: Tab; label: string; icon: typeof Activity }[] = [
  { id: 'logs', label: '消息日志', icon: Activity },
  { id: 'schedules', label: '定时任务', icon: RefreshCw },
  { id: 'dlq', label: '死信队列', icon: AlertTriangle },
  { id: 'urlgroups', label: 'URL Groups', icon: ChevronRight },
  { id: 'queues', label: '队列', icon: RotateCw },
];

function fmtTime(ts?: number) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function stateColor(state?: string) {
  if (!state) return 'text-slate-400';
  if (state === 'DELIVERED') return 'text-emerald-600 dark:text-emerald-400';
  if (state === 'ACTIVE' || state === 'IN_PROGRESS') return 'text-amber-500';
  if (state === 'FAILED' || state === 'ERROR') return 'text-rose-500';
  if (state === 'CREATED') return 'text-sky-500';
  return 'text-slate-400';
}

export function TaskQueueView() {
  const [tab, setTab] = useState<Tab>('logs');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [live, setLive] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const fetchPage = useCallback(
    async (reset: boolean) => {
      if (reset) setIsLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const url = new URL('/api/qstash', window.location.origin);
        url.searchParams.set('resource', tab);
        const cur = reset ? undefined : cursor;
        if (cur) url.searchParams.set('cursor', cur);
        const res = await fetch(url.toString());
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || '查询失败');

        const list: Record<string, unknown>[] =
          data.logs || data.schedules || data.messages || data.groups || data.queues || [];
        setRows((prev) => (reset ? list : [...prev, ...list]));
        setCursor(data.cursor ?? null);
        setHasMore(Boolean(data.cursor));
        setLive(data.live ?? false);
      } catch (err) {
        setError(err instanceof Error ? err.message : '查询失败');
      } finally {
        if (reset) setIsLoading(false);
        else setLoadingMore(false);
      }
    },
    [tab, cursor]
  );

  useEffect(() => {
    let active = true;
    const ac = new AbortController();
    (async () => {
      setIsLoading(true);
      setError(null);
      setSelected(new Set());
      try {
        const url = new URL('/api/qstash', window.location.origin);
        url.searchParams.set('resource', tab);
        const res = await fetch(url.toString(), { signal: ac.signal });
        const data = await res.json();
        if (!active) return;
        if (!res.ok || !data.success) throw new Error(data.error || '查询失败');
        const list: Record<string, unknown>[] =
          data.logs || data.schedules || data.messages || data.groups || data.queues || [];
        setRows(list);
        setCursor(data.cursor ?? null);
        setHasMore(Boolean(data.cursor));
        setLive(data.live ?? false);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : '查询失败');
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
      ac.abort();
    };
  }, [tab]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const rowId = (row: Record<string, unknown>): string =>
    String(row.messageId || row.scheduleId || row.dlqId || row.name || row.id || '');

  const allVisibleSelected = rows.length > 0 && rows.every((r) => selected.has(rowId(r)));
  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) rows.forEach((r) => next.delete(rowId(r)));
      else rows.forEach((r) => next.add(rowId(r)));
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const resourceMap: Record<Tab, string> = {
      logs: 'messages',
      schedules: 'schedules',
      dlq: 'dlq',
      urlgroups: 'urlgroups',
      queues: 'queues',
    };
    if (!confirm(`确定删除选中的 ${ids.length} 条记录吗？此操作不可撤销。`)) return;
    setBulkDeleting(true);
    setError(null);
    try {
      const qs = ids.map((id) => `id=${encodeURIComponent(id)}`).join('&');
      const res = await fetch(`/api/qstash?resource=${resourceMap[tab]}&${qs}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || '删除失败');
      const removed = new Set(ids);
      setRows((prev) => prev.filter((r) => !removed.has(rowId(r))));
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setBulkDeleting(false);
    }
  };

  const singleAction = async (row: Record<string, unknown>, action: string) => {
    setError(null);
    try {
      if (action === 'delete') {
        const id = rowId(row);
        const resourceMap: Record<Tab, string> = {
          logs: 'messages',
          schedules: 'schedules',
          dlq: 'dlq',
          urlgroups: 'urlgroups',
          queues: 'queues',
        };
        if (!confirm(`确定删除 "${id}" 吗？`)) return;
        const res = await fetch(
          `/api/qstash?resource=${resourceMap[tab]}&id=${encodeURIComponent(id)}`,
          { method: 'DELETE' }
        );
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || '删除失败');
        setRows((prev) => prev.filter((r) => rowId(r) !== id));
        return;
      }

      // DLQ 重试
      if (action === 'retry') {
        const res = await fetch('/api/qstash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resource: 'dlq', action: 'retry', dlqIds: [row.dlqId] }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || '重试失败');
        setRows((prev) => prev.filter((r) => rowId(r) !== rowId(row)));
        return;
      }

      // 暂停/恢复 定时任务
      if (action === 'pause' || action === 'resume') {
        const res = await fetch('/api/qstash', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resource: 'schedules', id: row.scheduleId, action }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || '操作失败');
        setRows((prev) =>
          prev.map((r) =>
            rowId(r) === rowId(row)
              ? { ...r, isPaused: action === 'pause' }
              : r
          )
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    }
  };

  const showCreateButton = tab === 'schedules' || tab === 'urlgroups';

  // —— 列定义 ——
  const renderColumns = () => {
    switch (tab) {
      case 'logs':
        return (
          <>
            <th className="col-span-2 text-left">消息 ID / 状态</th>
            <th className="col-span-3 text-left">URL</th>
            <th className="col-span-2 text-left">时间</th>
            <th className="col-span-1 text-left">错误</th>
            <th className="col-span-1 text-right">操作</th>
          </>
        );
      case 'schedules':
        return (
          <>
            <th className="col-span-2 text-left">Schedule ID</th>
            <th className="col-span-2 text-left">目标</th>
            <th className="col-span-2 text-left">Cron</th>
            <th className="col-span-1 text-left">状态</th>
            <th className="col-span-1 text-left">创建时间</th>
            <th className="col-span-2 text-right">操作</th>
          </>
        );
      case 'dlq':
        return (
          <>
            <th className="col-span-2 text-left">DLQ ID</th>
            <th className="col-span-3 text-left">URL</th>
            <th className="col-span-1 text-left">状态码</th>
            <th className="col-span-2 text-left">响应</th>
            <th className="col-span-2 text-right">操作</th>
          </>
        );
      case 'urlgroups':
        return (
          <>
            <th className="col-span-3 text-left">名称</th>
            <th className="col-span-5 text-left">Endpoints</th>
            <th className="col-span-2 text-right">操作</th>
          </>
        );
      case 'queues':
        return (
          <>
            <th className="col-span-3 text-left">名称</th>
            <th className="col-span-1 text-left">并发</th>
            <th className="col-span-1 text-left">积压</th>
            <th className="col-span-2 text-left">状态</th>
            <th className="col-span-2 text-right">操作</th>
          </>
        );
    }
  };

  const renderRow = (row: Record<string, unknown>) => {
    const id = rowId(row);
    const checked = selected.has(id);
    const cellCls = 'px-4 py-3 text-xs text-slate-700 dark:text-slate-300 truncate';

    if (tab === 'logs') {
      return (
        <tr key={id} className={checked ? 'bg-rose-500/10' : 'hover:bg-white/40 dark:hover:bg-white/5'}>
          <td className="px-4 py-3 text-xs">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={checked} onChange={() => toggleSelect(id)} className="w-3.5 h-3.5 accent-rose-500 cursor-pointer" />
              <div className="min-w-0">
                <div className="font-mono text-slate-900 dark:text-white truncate" title={String(row.messageId)}>{String(row.messageId).slice(0, 24)}…</div>
                <div className={`font-bold ${stateColor(String(row.state))}`}>{String(row.state)}</div>
              </div>
            </div>
          </td>
          <td className={cellCls} title={String(row.url)}>{String(row.url).slice(0, 50)}</td>
          <td className={cellCls}>{fmtTime(Number(row.time))}</td>
          <td className={cellCls}>{row.error ? String(row.error).slice(0, 40) : '—'}</td>
          <td className="px-4 py-3 text-right">
            <button onClick={() => singleAction(row, 'delete')} title="取消消息" className="liquid-orb w-7 h-7 text-slate-400 hover:text-rose-500 cursor-pointer">
              <Trash2 className="w-3 h-3" />
            </button>
          </td>
        </tr>
      );
    }

    if (tab === 'schedules') {
      const paused = Boolean(row.isPaused);
      return (
        <tr key={id} className={checked ? 'bg-rose-500/10' : 'hover:bg-white/40 dark:hover:bg-white/5'}>
          <td className="px-4 py-3 text-xs">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={checked} onChange={() => toggleSelect(id)} className="w-3.5 h-3.5 accent-rose-500 cursor-pointer" />
              <span className="font-mono text-slate-900 dark:text-white truncate" title={String(row.scheduleId)}>{String(row.scheduleId).slice(0, 24)}…</span>
            </div>
          </td>
          <td className={cellCls} title={String(row.destination)}>{String(row.destination).slice(0, 40)}</td>
          <td className="font-mono text-xs px-4 py-3 text-slate-700 dark:text-slate-300">{String(row.cron)}</td>
          <td className="px-4 py-3 text-xs">
            <span className={paused ? 'text-amber-500 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>
              {paused ? '已暂停' : '运行中'}
            </span>
          </td>
          <td className={cellCls}>{fmtTime(Number(row.createdAt))}</td>
          <td className="px-4 py-3 text-right">
            <div className="flex items-center justify-end gap-1">
              <button onClick={() => singleAction(row, paused ? 'resume' : 'pause')} title={paused ? '恢复' : '暂停'} className="liquid-orb w-7 h-7 text-slate-600 dark:text-slate-300 hover:text-amber-500 cursor-pointer">
                {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
              </button>
              <button onClick={() => singleAction(row, 'delete')} title="删除" className="liquid-orb w-7 h-7 text-slate-400 hover:text-rose-500 cursor-pointer">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </td>
        </tr>
      );
    }

    if (tab === 'dlq') {
      return (
        <tr key={id} className={checked ? 'bg-rose-500/10' : 'hover:bg-white/40 dark:hover:bg-white/5'}>
          <td className="px-4 py-3 text-xs">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={checked} onChange={() => toggleSelect(id)} className="w-3.5 h-3.5 accent-rose-500 cursor-pointer" />
              <span className="font-mono text-slate-900 dark:text-white truncate" title={String(row.dlqId)}>{String(row.dlqId).slice(0, 24)}…</span>
            </div>
          </td>
          <td className={cellCls} title={String(row.url)}>{String(row.url).slice(0, 50)}</td>
          <td className="px-4 py-3 text-xs font-mono">
            <span className={row.responseStatus ? 'text-rose-500 font-bold' : 'text-slate-400'}>{String(row.responseStatus || '—')}</span>
          </td>
          <td className={cellCls} title={String(row.responseBody)}>{row.responseBody ? String(row.responseBody).slice(0, 40) : '—'}</td>
          <td className="px-4 py-3 text-right">
            <div className="flex items-center justify-end gap-1">
              <button onClick={() => singleAction(row, 'retry')} title="重试" className="liquid-orb w-7 h-7 text-slate-600 dark:text-slate-300 hover:text-emerald-500 cursor-pointer">
                <RotateCw className="w-3 h-3" />
              </button>
              <button onClick={() => singleAction(row, 'delete')} title="删除" className="liquid-orb w-7 h-7 text-slate-400 hover:text-rose-500 cursor-pointer">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </td>
        </tr>
      );
    }

    if (tab === 'urlgroups') {
      const endpoints = Array.isArray(row.endpoints) ? (row.endpoints as { url: string }[]) : [];
      return (
        <tr key={id} className={checked ? 'bg-rose-500/10' : 'hover:bg-white/40 dark:hover:bg-white/5'}>
          <td className="px-4 py-3 text-xs">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={checked} onChange={() => toggleSelect(id)} className="w-3.5 h-3.5 accent-rose-500 cursor-pointer" />
              <span className="font-bold text-slate-900 dark:text-white">{String(row.name)}</span>
            </div>
          </td>
          <td className={cellCls}>
            {endpoints.length > 0 ? (
              <span className="font-mono">{endpoints.map((e) => e.url).join(', ').slice(0, 60)}</span>
            ) : '—'}
          </td>
          <td className="px-4 py-3 text-right">
            <button onClick={() => singleAction(row, 'delete')} title="删除" className="liquid-orb w-7 h-7 text-slate-400 hover:text-rose-500 cursor-pointer">
              <Trash2 className="w-3 h-3" />
            </button>
          </td>
        </tr>
      );
    }

    // queues
    const paused = Boolean(row.paused);
    return (
      <tr key={id} className={checked ? 'bg-rose-500/10' : 'hover:bg-white/40 dark:hover:bg-white/5'}>
        <td className="px-4 py-3 text-xs">
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={checked} onChange={() => toggleSelect(id)} className="w-3.5 h-3.5 accent-rose-500 cursor-pointer" />
            <span className="font-bold text-slate-900 dark:text-white">{String(row.name)}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-xs font-mono text-slate-700 dark:text-slate-300">{String(row.parallelism)}</td>
        <td className="px-4 py-3 text-xs font-mono text-slate-700 dark:text-slate-300">{String(row.lag)}</td>
        <td className="px-4 py-3 text-xs">
          <span className={paused ? 'text-amber-500 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>
            {paused ? '已暂停' : '运行中'}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <button onClick={() => singleAction(row, 'delete')} title="删除" className="liquid-orb w-7 h-7 text-slate-400 hover:text-rose-500 cursor-pointer">
            <Trash2 className="w-3 h-3" />
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl liquid-glass-subtle flex items-center justify-center">
              <Activity className="w-4 h-4 text-amber-500" />
            </div>
            <span>QStash 消息队列</span>
            {live !== null && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${live ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/15' : 'text-slate-500 bg-slate-500/10'}`}>
                {live ? 'LIVE' : '本地模拟'}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
            管理 Upstash QStash 的消息日志、定时任务、死信队列、URL Groups 和队列。支持列表、删除、暂停/恢复、重试、新增。
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {showCreateButton && (
            <button
              onClick={() => setShowCreate(true)}
              className="liquid-pill-primary flex items-center gap-1.5 px-4 py-2 text-xs font-bold shadow-md shadow-black/25 cursor-pointer whitespace-nowrap text-black"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{tab === 'schedules' ? '新增定时任务' : '新建 URL Group'}</span>
            </button>
          )}
          <button
            onClick={() => fetchPage(true)}
            disabled={isLoading}
            className="liquid-pill flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>刷新</span>
          </button>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex items-center gap-1 overflow-x-auto p-1 rounded-full liquid-glass-subtle scrollbar-hide w-fit">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 text-xs font-bold rounded-full whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                tab === t.id
                  ? 'liquid-pill-primary shadow-xs text-black'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="text-xs text-rose-300 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* 批量操作栏 */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-2xl liquid-glass border border-rose-500/30">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            已选中 {selected.size} 条
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelected(new Set())} disabled={bulkDeleting} className="liquid-pill px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
              取消选择
            </button>
            <button onClick={handleBulkDelete} disabled={bulkDeleting} className="liquid-pill flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 border-rose-500/40 hover:bg-rose-500/10 cursor-pointer disabled:opacity-40">
              {bulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>{bulkDeleting ? '删除中...' : `删除选中 (${selected.size})`}</span>
            </button>
          </div>
        </div>
      )}

      {/* 数据表 */}
      <div className="rounded-3xl liquid-glass overflow-hidden shadow-md">
        <table className="w-full">
          <thead>
            <tr className="border-b border-black/5 dark:border-white/10 text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider font-mono">
              {renderColumns()}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="p-12 text-center">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-500 mx-auto mb-2" />
                  <span className="text-xs text-slate-500 dark:text-slate-300">正在查询 QStash...</span>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-12 text-center">
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {live === false ? 'QStash 未连接（本地模拟模式）' : '暂无记录'}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
                    {live === false ? '配置 QSTASH_TOKEN 环境变量后即可管理真实 QStash 资源。' : '切换其他标签页查看其他资源。'}
                  </p>
                </td>
              </tr>
            ) : (
              rows.map((row) => renderRow(row))
            )}
          </tbody>
        </table>

        {hasMore && !isLoading && rows.length > 0 && (
          <div className="p-4 border-t border-black/5 dark:border-white/10 flex justify-center">
            <button
              onClick={() => fetchPage(false)}
              disabled={loadingMore}
              className="liquid-pill flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-40"
            >
              {loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span>{loadingMore ? '查询中...' : '加载下一页'}</span>
            </button>
          </div>
        )}
      </div>

      {/* 新增弹窗 */}
      {showCreate && <CreateModal tab={tab} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchPage(true); }} />}
    </div>
  );
}

function CreateModal({ tab, onClose, onCreated }: { tab: Tab; onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // schedule 字段
  const [destination, setDestination] = useState('');
  const [cron, setCron] = useState('*/5 * * * *');
  const [body, setBody] = useState('');

  // urlgroup 字段
  const [groupName, setGroupName] = useState('');
  const [endpoints, setEndpoints] = useState('');

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (tab === 'schedules') {
        if (!destination || !cron) { setError('destination 和 cron 必填'); setSaving(false); return; }
        const res = await fetch('/api/qstash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resource: 'schedules', action: 'create', destination, cron, body }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || '创建失败');
      } else if (tab === 'urlgroups') {
        if (!groupName || !endpoints) { setError('名称和 endpoints 必填'); setSaving(false); return; }
        const epList = endpoints.split('\n').map((u) => u.trim()).filter(Boolean).map((u) => ({ url: u }));
        const res = await fetch('/api/qstash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resource: 'urlgroups', action: 'create', name: groupName, endpoints: epList }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || '创建失败');
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
      <div className="w-full max-w-lg liquid-glass rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/10">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {tab === 'schedules' ? '新增定时任务' : '新建 URL Group'}
          </h3>
          <button onClick={onClose} className="liquid-orb w-8 h-8 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4 text-xs">
          {tab === 'schedules' ? (
            <>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">目标 URL</label>
                <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="https://example.com/webhook" className="w-full px-3.5 py-2 rounded-xl liquid-input font-mono" />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Cron 表达式</label>
                <input type="text" value={cron} onChange={(e) => setCron(e.target.value)} placeholder="*/5 * * * *" className="w-full px-3.5 py-2 rounded-xl liquid-input font-mono" />
                <p className="text-[11px] text-slate-400 mt-1">每 5 分钟触发一次示例：*/5 * * * *</p>
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">消息体（可选）</label>
                <textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="{}" className="w-full px-3.5 py-2 rounded-xl liquid-input font-mono" />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">URL Group 名称</label>
                <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="my-group" className="w-full px-3.5 py-2 rounded-xl liquid-input font-mono" />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Endpoints（每行一个 URL）</label>
                <textarea rows={4} value={endpoints} onChange={(e) => setEndpoints(e.target.value)} placeholder={'https://a.com/hook\nhttps://b.com/hook'} className="w-full px-3.5 py-2 rounded-xl liquid-input font-mono" />
              </div>
            </>
          )}
          {error && <div className="text-rose-400 text-[11px]">{error}</div>}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-black/5 dark:border-white/10">
            <button onClick={onClose} disabled={saving} className="liquid-pill px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">取消</button>
            <button onClick={save} disabled={saving} className="liquid-pill-primary px-5 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-40">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>{saving ? '创建中...' : '创建'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
