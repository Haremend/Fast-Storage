'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  FolderArchive,
  Search,
  FileText,
  Trash2,
  Sparkles,
  Plus,
  RefreshCw,
  Download,
  Copy,
  Check,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { DocumentItem } from '@/lib/types';

interface DocumentsViewProps {
  onSelectDocument: (doc: DocumentItem) => void;
  onOpenUpload: () => void;
  onTriggerSemanticSearch: (query: string) => void;
}

const PAGE_SIZE = 20;

const isTextLike = (doc: DocumentItem) =>
  doc.type?.startsWith('text/') ||
  /\.(md|markdown|txt|csv|json|js|ts|tsx|jsx|html|css|log|ini|ya?ml|xml)$/i.test(doc.name);

export function DocumentsView({
  onSelectDocument,
  onOpenUpload,
  onTriggerSemanticSearch,
}: DocumentsViewProps) {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [indexingKey, setIndexingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filterTabs = [
    { id: 'all', label: '全部文件' },
    { id: 'markdown', label: 'Markdown (.md)' },
    { id: 'pdf', label: 'PDF 资料' },
    { id: 'text', label: '纯文本 (.txt)' },
  ];

  const fetchPage = useCallback(async (reset: boolean) => {
    if (reset) {
      setIsLoading(true);
      setError(null);
    } else {
      setIsLoadingMore(true);
    }
    try {
      const url = new URL('/api/documents', window.location.origin);
      url.searchParams.set('limit', String(PAGE_SIZE));
      const currentCursor = reset ? null : cursor;
      if (currentCursor) url.searchParams.set('cursor', currentCursor);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '加载文件列表失败');
      }

      const next: DocumentItem[] = Array.isArray(data.documents) ? data.documents : [];
      setDocs((prev) => (reset ? next : [...prev, ...next]));
      setCursor(data.cursor ?? null);
      setHasMore(Boolean(data.hasMore));
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      if (reset) setIsLoading(false);
      else setIsLoadingMore(false);
    }
  }, [cursor]);

  useEffect(() => {
    let active = true;
    const ac = new AbortController();
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const url = new URL('/api/documents', window.location.origin);
        url.searchParams.set('limit', String(PAGE_SIZE));
        const res = await fetch(url.toString(), { signal: ac.signal });
        const data = await res.json();
        if (!active) return;
        if (!res.ok || !data.success) throw new Error(data.error || '加载文件列表失败');
        setDocs(Array.isArray(data.documents) ? data.documents : []);
        setCursor(data.cursor ?? null);
        setHasMore(Boolean(data.hasMore));
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
      ac.abort();
    };
  }, []);

  const handleDelete = async (doc: DocumentItem) => {
    if (!confirm(`确定从 Upstash Blob 永久删除 "${doc.name}" 吗？`)) return;
    try {
      const res = await fetch(`/api/documents?key=${encodeURIComponent(doc.id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || '删除失败');
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleCopyLink = (doc: DocumentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = doc.blobUrl?.startsWith('http')
      ? doc.blobUrl
      : `${window.location.origin}${doc.blobUrl || `/api/documents/download?key=${encodeURIComponent(doc.id)}`}`;
    navigator.clipboard.writeText(link);
    setCopiedId(doc.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (doc: DocumentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = `/api/documents/download?key=${encodeURIComponent(doc.id)}`;
    a.download = doc.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleIndexAndSearch = async (doc: DocumentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setIndexingKey(doc.id);
    setError(null);
    try {
      const res = await fetch('/api/documents/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: doc.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '向量化失败');
      }
      // Mark as indexed locally, then jump to 语义检索舱 with the prepared query
      setDocs((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, status: 'indexed', vectorId: data.vectorId || d.vectorId } : d))
      );
      onTriggerSemanticSearch(data.query || doc.name.replace(/\.[^/.]+$/, ''));
    } catch (err) {
      setError(err instanceof Error ? err.message : '向量化失败');
    } finally {
      setIndexingKey(null);
    }
  };

  const filteredDocs = docs.filter((doc) => {
    if (filterType === 'markdown' && !doc.name.toLowerCase().endsWith('.md')) return false;
    if (filterType === 'pdf' && !doc.name.toLowerCase().endsWith('.pdf')) return false;
    if (filterType === 'text' && !doc.name.toLowerCase().endsWith('.txt')) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      if (!doc.name.toLowerCase().includes(q) && !doc.summary.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 头部与操作栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl liquid-glass-subtle flex items-center justify-center">
              <FolderArchive className="w-4 h-4 text-emerald-500" />
            </div>
            <span>个人云端文档</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
            直接读取 Upstash Blob 存储桶中的全部文件，支持上传、删除、复制公开下载直链，文本文件可一键转为语义向量。
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchPage(true)}
            disabled={isLoading}
            className="liquid-pill flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>刷新</span>
          </button>
          <button
            onClick={onOpenUpload}
            className="liquid-pill-primary flex items-center gap-1.5 px-4 py-2 text-xs font-bold shadow-md shadow-black/25 transition-all cursor-pointer whitespace-nowrap text-black"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>上传新文档</span>
          </button>
        </div>
      </div>

      {/* 筛选器与搜索 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-2 rounded-2xl liquid-glass">
        <div className="flex items-center gap-1 overflow-x-auto p-1 rounded-full liquid-glass-subtle scrollbar-hide">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-4 py-1.5 text-xs font-bold rounded-full whitespace-nowrap transition-all cursor-pointer ${
                filterType === tab.id
                  ? 'liquid-pill-primary shadow-xs text-black'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative md:w-80 px-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="按文件名或摘要过滤已加载文件..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl liquid-input text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>
      </div>

      {error && (
        <div className="text-xs text-rose-300 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 font-medium">
          {error}
        </div>
      )}

      {/* 文档列表 */}
      <div className="rounded-3xl liquid-glass overflow-hidden shadow-md">
        <div className="grid grid-cols-12 px-6 py-3.5 border-b border-black/5 dark:border-white/10 text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider font-mono">
          <div className="col-span-6 sm:col-span-5">文件名与摘要</div>
          <div className="hidden sm:block sm:col-span-2">类型</div>
          <div className="col-span-3 sm:col-span-2 text-right sm:text-left">大小 / 日期</div>
          <div className="hidden sm:block sm:col-span-1">向量</div>
          <div className="col-span-3 sm:col-span-2 text-right">操作与直链</div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-300 flex flex-col items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
            <span>正在从 Upstash Blob 读取文件列表...</span>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl liquid-glass-subtle flex items-center justify-center mx-auto mb-3">
              <FolderArchive className="w-7 h-7 text-slate-400" />
            </div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {docs.length === 0 ? 'Upstash Blob 存储桶暂无文件' : '当前筛选下无匹配文件'}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 max-w-sm mx-auto leading-relaxed">
              {docs.length === 0
                ? '上传您的第一份文件，将直接持久化至 Upstash Blob 云端对象存储。'
                : '尝试切换筛选条件或清空搜索关键词。'}
            </p>
            {docs.length === 0 && (
              <button
                onClick={onOpenUpload}
                className="mt-5 liquid-pill-primary px-5 py-2.5 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/25"
              >
                <Plus className="w-4 h-4" />
                <span>上传第一份文件</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-black/5 dark:divide-white/10">
            {filteredDocs.map((doc) => {
              const formattedSize =
                doc.size > 1024 * 1024
                  ? `${(doc.size / (1024 * 1024)).toFixed(1)} MB`
                  : `${(doc.size / 1024).toFixed(1)} KB`;
              const formattedDate = new Date(doc.uploadedAt).toLocaleDateString('zh-CN', {
                month: 'numeric',
                day: 'numeric',
              });
              const textLike = isTextLike(doc);

              return (
                <div
                  key={doc.id}
                  className="grid grid-cols-12 items-center px-6 py-4 hover:bg-white/40 dark:hover:bg-white/5 transition-colors group text-xs"
                >
                  {/* 文件名与摘要 */}
                  <div
                    onClick={() => onSelectDocument(doc)}
                    className="col-span-6 sm:col-span-5 flex items-start gap-3.5 cursor-pointer min-w-0 pr-2"
                  >
                    <div className="w-9 h-9 rounded-2xl liquid-glass-subtle text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                        {doc.name}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate mt-0.5">
                        {doc.summary}
                      </div>
                    </div>
                  </div>

                  {/* 类型 */}
                  <div className="hidden sm:flex sm:col-span-2 items-center">
                    <span className="liquid-glass-subtle px-2 py-0.5 rounded-md text-[10px] font-medium text-slate-700 dark:text-slate-200">
                      {(doc.type || 'file').split('/').pop() || 'file'}
                    </span>
                  </div>

                  {/* 大小与日期 */}
                  <div className="col-span-3 sm:col-span-2 text-right sm:text-left text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-300">
                    <div className="font-semibold">{formattedSize}</div>
                    <div className="text-slate-500 dark:text-slate-300 text-[10px]">{formattedDate}</div>
                  </div>

                  {/* 向量状态 */}
                  <div className="hidden sm:block sm:col-span-1 text-[11px] font-mono">
                    {doc.status === 'indexed' ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>已索引</span>
                      </span>
                    ) : textLike ? (
                      <span className="text-amber-500 font-medium">待索引</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </div>

                  {/* 操作区 */}
                  <div className="col-span-3 sm:col-span-2 flex items-center justify-end gap-1.5">
                    {/* 转到语义检索（仅文本文件） */}
                    {textLike && (
                      <button
                        onClick={(e) => handleIndexAndSearch(doc, e)}
                        disabled={indexingKey === doc.id}
                        title="转为语义向量并跳转到语义检索舱"
                        className="liquid-orb w-8 h-8 text-slate-600 dark:text-slate-300 hover:text-purple-600 cursor-pointer disabled:opacity-50"
                      >
                        {indexingKey === doc.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}

                    {/* 下载 */}
                    <button
                      onClick={(e) => handleDownload(doc, e)}
                      title="真实文件下载 (Binary Download)"
                      className="liquid-orb w-8 h-8 text-slate-600 dark:text-slate-300 hover:text-emerald-600 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {/* 复制公开下载直链 */}
                    <button
                      onClick={(e) => handleCopyLink(doc, e)}
                      title="复制公开下载直链 (Public Download Link)"
                      className="liquid-orb w-8 h-8 text-slate-600 dark:text-slate-300 hover:text-sky-600 cursor-pointer"
                    >
                      {copiedId === doc.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* 删除 */}
                    <button
                      onClick={() => handleDelete(doc)}
                      title="从 Upstash Blob 永久删除"
                      className="liquid-orb w-8 h-8 text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 加载更多 */}
        {hasMore && !isLoading && filteredDocs.length > 0 && (
          <div className="p-4 border-t border-black/5 dark:border-white/10 flex justify-center">
            <button
              onClick={() => fetchPage(false)}
              disabled={isLoadingMore}
              className="liquid-pill flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              {isLoadingMore ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
              <span>{isLoadingMore ? '加载中...' : '加载更多文件'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
