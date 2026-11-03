'use client';

import React, { useState } from 'react';
import {
  FolderArchive,
  Search,
  FileText,
  Trash2,
  ExternalLink,
  Sparkles,
  Plus,
  RefreshCw,
  Download,
  Copy,
  Check,
  Cloud,
} from 'lucide-react';
import { DocumentItem } from '@/lib/types';

interface DocumentsViewProps {
  documents: DocumentItem[];
  onSelectDocument: (doc: DocumentItem) => void;
  onDeleteDocument: (id: string) => void;
  onOpenUpload: () => void;
  onTriggerSemanticSearch: (query: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function DocumentsView({
  documents,
  onSelectDocument,
  onDeleteDocument,
  onOpenUpload,
  onTriggerSemanticSearch,
  onRefresh,
  isLoading,
}: DocumentsViewProps) {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filterTabs = [
    { id: 'all', label: '全部文件' },
    { id: 'markdown', label: 'Markdown 笔记 (.md)' },
    { id: 'pdf', label: 'PDF 文档' },
    { id: 'text', label: '纯文本 (.txt)' },
  ];

  const handleCopyLink = (doc: DocumentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    // Use full absolute URL if public or relative blob raw link
    const link = doc.blobUrl.startsWith('http')
      ? doc.blobUrl
      : `${window.location.origin}${doc.blobUrl}`;

    navigator.clipboard.writeText(link);
    setCopiedId(doc.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (doc: DocumentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const downloadUrl = `/api/documents/download?id=${encodeURIComponent(doc.id)}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = doc.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filteredDocs = documents.filter((doc) => {
    if (filterType === 'markdown' && !doc.name.endsWith('.md') && doc.type !== 'text/markdown') {
      return false;
    }
    if (filterType === 'pdf' && !doc.name.endsWith('.pdf') && doc.type !== 'application/pdf') {
      return false;
    }
    if (filterType === 'text' && !doc.name.endsWith('.txt') && doc.type !== 'text/plain') {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchesName = doc.name.toLowerCase().includes(q);
      const matchesSummary = doc.summary.toLowerCase().includes(q);
      const matchesTags = doc.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchesName && !matchesSummary && !matchesTags) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 头部与操作栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FolderArchive className="w-5 h-5 text-emerald-500" />
            <span>个人云端文档管理</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            文件安全存储于 Upstash Blob，具备真实的二进制下载与公开 CDN 直链分发能力。
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 ios-glass hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all ios-press"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>刷新</span>
          </button>
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] rounded-xl shadow-md shadow-emerald-500/20 transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>上传新文档</span>
          </button>
        </div>
      </div>

      {/* iOS 风格筛选器与搜索 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-1.5 rounded-2xl ios-glass">
        {/* iOS 分段控件 */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-black/5 dark:bg-white/5 rounded-xl">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                filterType === tab.id
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 搜索框 */}
        <div className="relative md:w-72 px-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="按标题或标签快速过滤..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white/60 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-all"
          />
        </div>
      </div>

      {/* 文档列表表格 */}
      <div className="rounded-3xl ios-glass overflow-hidden shadow-xs border border-white/60 dark:border-white/10">
        <div className="grid grid-cols-12 px-6 py-3.5 border-b border-black/5 dark:border-white/5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          <div className="col-span-6 sm:col-span-5">文件名与摘要</div>
          <div className="hidden sm:block sm:col-span-2">语义标签</div>
          <div className="col-span-3 sm:col-span-2 text-right sm:text-left">大小 / 日期</div>
          <div className="hidden sm:block sm:col-span-1">Vector 状态</div>
          <div className="col-span-3 sm:col-span-2 text-right">操作与直链</div>
        </div>

        {filteredDocs.length === 0 ? (
          <div className="p-12 text-center">
            <FolderArchive className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">暂无文档记录</div>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              上传您的个人笔记、PDF 资料或技术方案，文件将存储于 Upstash Blob 并建立向量语义索引。
            </p>
            <button
              onClick={onOpenUpload}
              className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-400 rounded-xl transition-all inline-flex items-center gap-1.5 ios-press"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>上传第一篇文档</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {filteredDocs.map((doc) => {
              const formattedSize =
                doc.size > 1024 * 1024
                  ? `${(doc.size / (1024 * 1024)).toFixed(1)} MB`
                  : `${(doc.size / 1024).toFixed(1)} KB`;
              const formattedDate = new Date(doc.uploadedAt).toLocaleDateString('zh-CN', {
                month: 'numeric',
                day: 'numeric',
              });

              return (
                <div
                  key={doc.id}
                  className="grid grid-cols-12 items-center px-6 py-3.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group text-xs"
                >
                  {/* 文档名称与摘要 */}
                  <div
                    onClick={() => onSelectDocument(doc)}
                    className="col-span-6 sm:col-span-5 flex items-start gap-3 cursor-pointer min-w-0 pr-2"
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                        {doc.name}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {doc.summary}
                      </div>
                    </div>
                  </div>

                  {/* 标签 */}
                  <div className="hidden sm:flex sm:col-span-2 items-center gap-1.5 text-[11px] text-slate-500 truncate">
                    {doc.tags.slice(0, 2).map((tag, idx) => (
                      <span key={tag}>
                        {idx > 0 && <span className="text-slate-300 dark:text-slate-700 mr-1.5">·</span>}
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* 大小与日期 */}
                  <div className="col-span-3 sm:col-span-2 text-right sm:text-left text-[11px] font-mono tabular-nums text-slate-500">
                    <div>{formattedSize}</div>
                    <div className="text-slate-400">{formattedDate}</div>
                  </div>

                  {/* 向量状态 */}
                  <div className="hidden sm:block sm:col-span-1 text-[11px] font-mono">
                    {doc.status === 'indexed' ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">已索引</span>
                    ) : (
                      <span className="text-amber-500 flex items-center gap-1 font-medium">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>排队中</span>
                      </span>
                    )}
                  </div>

                  {/* 操作区：下载、复制直链、相似检索、删除 */}
                  <div className="col-span-3 sm:col-span-2 flex items-center justify-end gap-1">
                    {/* 二进制真实下载 */}
                    <button
                      onClick={(e) => handleDownload(doc, e)}
                      title="真实文件下载 (Binary Download)"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors ios-press"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {/* 复制 Public Download 直链 */}
                    <button
                      onClick={(e) => handleCopyLink(doc, e)}
                      title="复制公开下载直链 (Public Download Link)"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-500/10 transition-colors ios-press"
                    >
                      {copiedId === doc.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* 语义相似推荐检索 */}
                    <button
                      onClick={() => onTriggerSemanticSearch(doc.name.replace(/\.[^/.]+$/, ''))}
                      title="查找语义相似文档"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-500/10 transition-colors ios-press"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>

                    {/* 删除文档 */}
                    <button
                      onClick={() => {
                        if (confirm(`确定删除文档 "${doc.name}" 吗？`)) onDeleteDocument(doc.id);
                      }}
                      title="删除文档"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors ios-press"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
