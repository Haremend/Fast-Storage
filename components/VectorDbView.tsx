'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Check,
  X,
  Rows3,
  FileText,
} from 'lucide-react';

interface VectorRecord {
  id: string;
  data?: string;
  metadata?: Record<string, unknown>;
}

export function VectorDbView() {
  const [rows, setRows] = useState<VectorRecord[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [live, setLive] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 编辑/新增表单
  const [editOpen, setEditOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState('');
  const [editData, setEditData] = useState('');
  const [editMeta, setEditMeta] = useState('{}');
  const [metaInvalid, setMetaInvalid] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchPage = useCallback(
    async (reset: boolean) => {
      if (reset) setIsLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const url = new URL('/api/vector', window.location.origin);
        url.searchParams.set('limit', '10');
        const cur = reset ? undefined : cursor;
        if (cur) url.searchParams.set('cursor', cur);
        const res = await fetch(url.toString());
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || '查询向量库失败');

        const next: VectorRecord[] = Array.isArray(data.vectors) ? data.vectors : [];
        setRows((prev) => (reset ? next : [...prev, ...next]));
        setCursor(data.cursor ?? null);
        setHasMore(Boolean(data.hasMore));
        if (typeof data.live === 'boolean') setLive(data.live);
      } catch (err) {
        setError(err instanceof Error ? err.message : '查询失败');
      } finally {
        if (reset) setIsLoading(false);
        else setLoadingMore(false);
      }
    },
    [cursor]
  );

  useEffect(() => {
    let active = true;
    const ac = new AbortController();
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const url = new URL('/api/vector', window.location.origin);
        url.searchParams.set('limit', '10');
        const res = await fetch(url.toString(), { signal: ac.signal });
        const data = await res.json();
        if (!active) return;
        if (!res.ok || !data.success) throw new Error(data.error || '查询向量库失败');
        setRows(Array.isArray(data.vectors) ? data.vectors : []);
        setCursor(data.cursor ?? null);
        setHasMore(Boolean(data.hasMore));
        if (typeof data.live === 'boolean') setLive(data.live);
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
  }, []);

  const filteredRows = rows.filter((row) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [row.id, row.data || '', row.metadata ? JSON.stringify(row.metadata) : '']
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  const openCreate = () => {
    setIsEditing(false);
    setEditId('');
    setEditData('');
    setEditMeta('{}');
    setMetaInvalid(false);
    setError(null);
    setEditOpen(true);
  };

  const openEdit = (row: VectorRecord) => {
    setIsEditing(true);
    setEditId(row.id);
    setEditData(row.data || '');
    setEditMeta(row.metadata ? JSON.stringify(row.metadata, null, 2) : '{}');
    setMetaInvalid(false);
    setError(null);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setMetaInvalid(false);
  };

  const save = async () => {
    if (!editData.trim()) {
      setError('文本内容 (data) 不能为空 — 向量库需要它来生成向量。');
      return;
    }
    let metadata: Record<string, unknown> = {};
    if (editMeta.trim() && editMeta.trim() !== '{}') {
      try {
        metadata = JSON.parse(editMeta);
      } catch {
        setMetaInvalid(true);
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/vector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editId || undefined, data: editData, metadata }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || '保存失败');
      setEditOpen(false);
      await fetchPage(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (row: VectorRecord) => {
    if (!confirm(`确定从向量库中删除这条记录吗？\n\nid: ${row.id}\n文本: ${(row.data || '').slice(0, 60)}...`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/vector?id=${encodeURIComponent(row.id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || '删除失败');
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  const resetAll = async () => {
    if (!confirm('确定清空整个向量库吗？\n\n此操作不可撤销，将删除所有向量记录。')) return;
    setError(null);
    try {
      const res = await fetch('/api/vector?reset=true', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || '清空失败');
      setRows([]);
      setCursor(null);
      setHasMore(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '清空失败');
    }
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl liquid-glass-subtle flex items-center justify-center">
              <Database className="w-4 h-4 text-purple-500" />
            </div>
            <span>Upstash Vector 数据表</span>
            {live !== null && (
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  live ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/15' : 'text-slate-500 bg-slate-500/10'
                }`}
              >
                {live ? 'LIVE' : '本地模拟'}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
            以数据库表方式浏览、新增、修改、删除向量记录。每条记录 = 一段文本 + 一个高维向量 + 任意元数据。
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={openCreate}
            className="liquid-pill-primary flex items-center gap-1.5 px-4 py-2 text-xs font-bold shadow-md shadow-black/25 transition-all cursor-pointer whitespace-nowrap text-black"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>新增记录</span>
          </button>
          <button
            onClick={resetAll}
            title="清空整张表"
            className="liquid-orb w-9 h-9 text-slate-400 hover:text-rose-500 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-2 rounded-2xl liquid-glass">
        <div className="relative md:w-96 px-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="按 id / 文本 / 元数据过滤已加载记录..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl liquid-input text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>
        <div className="flex items-center gap-2 px-1">
          <span className="text-[11px] text-slate-500 dark:text-slate-300 font-mono">
            已加载 {rows.length} · 显示 {filteredRows.length}
          </span>
          <button
            onClick={() => fetchPage(true)}
            disabled={isLoading}
            className="liquid-pill flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>重新查询</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="text-xs text-rose-300 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* 数据表 */}
      <div className="rounded-3xl liquid-glass overflow-hidden shadow-md">
        <div className="grid grid-cols-12 px-5 py-3.5 border-b border-black/5 dark:border-white/10 text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider font-mono">
          <div className="col-span-3">ID</div>
          <div className="col-span-6 sm:col-span-4">文本内容 (data)</div>
          <div className="hidden sm:block sm:col-span-2">元数据 (metadata)</div>
          <div className="col-span-3 text-right">操作</div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-300 flex flex-col items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
            <span>正在查询向量库...</span>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl liquid-glass-subtle flex items-center justify-center mx-auto mb-3">
              <Rows3 className="w-7 h-7 text-slate-400" />
            </div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {rows.length === 0 ? '向量库中暂无记录' : '当前过滤条件下无匹配记录'}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 max-w-sm mx-auto leading-relaxed">
              {rows.length === 0
                ? '点击右上角「新增记录」手动写入一条，或上传文本文件后自动写入。'
                : '试试清空搜索关键词。'}
            </p>
            {rows.length === 0 && (
              <button
                onClick={openCreate}
                className="mt-5 liquid-pill-primary px-5 py-2.5 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-md shadow-purple-500/25"
              >
                <Plus className="w-4 h-4" />
                <span>新增第一条记录</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-black/5 dark:divide-white/10">
            {filteredRows.map((row) => (
              <div key={row.id} className="grid grid-cols-12 items-start px-5 py-4 hover:bg-white/40 dark:hover:bg-white/5 transition-colors text-xs">
                <div className="col-span-3 pr-3 min-w-0">
                  <div className="font-mono font-semibold text-slate-900 dark:text-white truncate" title={row.id}>
                    {row.id}
                  </div>
                </div>

                <div className="col-span-6 sm:col-span-4 pr-3 min-w-0">
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <FileText className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="line-clamp-2 break-words leading-relaxed">
                      {row.data || '(无文本内容)'}
                    </span>
                  </div>
                </div>

                <div className="hidden sm:block sm:col-span-2 pr-3 min-w-0">
                  {row.metadata && Object.keys(row.metadata).length > 0 ? (
                    <div className="font-mono text-[10px] text-slate-500 dark:text-slate-300 line-clamp-2 break-words">
                      {JSON.stringify(row.metadata)}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 font-mono">—</div>
                  )}
                </div>

                <div className="col-span-3 flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => openEdit(row)}
                    title="修改"
                    className="liquid-orb w-8 h-8 text-slate-600 dark:text-slate-300 hover:text-emerald-600 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteRow(row)}
                    title="删除"
                    className="liquid-orb w-8 h-8 text-slate-400 hover:text-rose-500 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {hasMore && !isLoading && filteredRows.length > 0 && (
          <div className="p-4 border-t border-black/5 dark:border-white/10 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-300 font-mono">
              每页 10 条 · 已加载 {rows.length} 条
            </span>
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

      {/* 新增 / 修改 记录弹窗 */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xl">
          <div className="w-full max-w-2xl liquid-glass rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-2xl liquid-glass-subtle flex items-center justify-center text-purple-600 dark:text-purple-400">
                  {isEditing ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isEditing ? '修改向量记录' : '新增向量记录'}
                </h3>
              </div>
              <button onClick={closeEdit} className="liquid-orb w-8 h-8 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {isEditing ? '记录 ID (主键，不可改)' : '记录 ID (留空自动生成)'}
                </label>
                <input
                  type="text"
                  value={editId}
                  onChange={(e) => !isEditing && setEditId(e.target.value)}
                  readOnly={isEditing}
                  placeholder="自动: vec_manual_xxxx"
                  className="w-full px-3.5 py-2 rounded-xl liquid-input font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  文本内容 (data) — 用于生成向量
                </label>
                <textarea
                  rows={8}
                  value={editData}
                  onChange={(e) => setEditData(e.target.value)}
                  placeholder="输入要向量化的文本..."
                  className="w-full px-3.5 py-2 rounded-xl liquid-input font-mono leading-relaxed"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  元数据 metadata (JSON，可选)
                </label>
                <textarea
                  rows={6}
                  value={editMeta}
                  onChange={(e) => {
                    setEditMeta(e.target.value);
                    if (metaInvalid) {
                      try { JSON.parse(e.target.value); setMetaInvalid(false); } catch { /* keep */ }
                    }
                  }}
                  className={`w-full px-3.5 py-2 rounded-xl liquid-input font-mono leading-relaxed ${metaInvalid ? 'border-rose-400' : ''}`}
                />
                {metaInvalid && (
                  <div className="text-rose-400 text-[11px] mt-1">JSON 格式不正确，请检查引号与括号。</div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-black/5 dark:border-white/10">
                <button onClick={closeEdit} disabled={saving} className="liquid-pill px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                  取消
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="liquid-pill-primary px-5 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-purple-500/20 cursor-pointer disabled:opacity-40"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{isEditing ? '保存修改' : '插入记录'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
