'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  FileText,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  Sparkles,
  Cloud,
  Layers,
  Download,
} from 'lucide-react';
import { DocumentItem } from '@/lib/types';

interface DocumentPreviewModalProps {
  document: DocumentItem | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onSelectRelatedDoc: (doc: DocumentItem) => void;
}

export function DocumentPreviewModal({
  document,
  onClose,
  onDelete,
  onSelectRelatedDoc,
}: DocumentPreviewModalProps) {
  const [recommendations, setRecommendations] = useState<DocumentItem[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!document) return;
    let isSubscribed = true;

    const fetchRecs = async () => {
      try {
        const res = await fetch(`/api/documents/recommend?docId=${document.id}`);
        const data = await res.json();
        if (isSubscribed && data.success && data.recommendations) {
          setRecommendations(data.recommendations);
        }
      } catch (err) {
        console.warn('获取关联推荐失败:', err);
      } finally {
        if (isSubscribed) setLoadingRecs(false);
      }
    };

    fetchRecs();

    return () => {
      isSubscribed = false;
    };
  }, [document]);

  if (!document) return null;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(document.blobUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedSize =
    document.size > 1024 * 1024
      ? `${(document.size / (1024 * 1024)).toFixed(2)} MB`
      : `${(document.size / 1024).toFixed(1)} KB`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* 头部标题 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{document.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ios-press"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 滚动详情 */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          {/* 元信息卡片网格 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
            <div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 uppercase font-semibold">文件大小</div>
              <div className="text-slate-900 dark:text-slate-200 font-mono tabular-nums font-semibold mt-0.5">{formattedSize}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 uppercase font-semibold">存储方式</div>
              <div className="text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 flex items-center gap-1 font-semibold">
                <Cloud className="w-3 h-3" />
                <span>Upstash Blob</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 uppercase font-semibold">状态</div>
              <div className="text-slate-900 dark:text-slate-200 mt-0.5 font-semibold capitalize">
                {document.status === 'indexed' ? '已向量索引' : '处理排队中'}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 uppercase font-semibold">Vector ID</div>
              <div className="text-purple-600 dark:text-purple-400 font-mono truncate mt-0.5 font-semibold">
                {document.vectorId || '排队生成中'}
              </div>
            </div>
          </div>

          {/* 标签 */}
          {document.tags.length > 0 && (
            <div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold uppercase mb-1.5">
                语义标签
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-700 dark:text-slate-300">
                {document.tags.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-medium text-[11px]">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 文档正文与提取文本预览 */}
          <div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold uppercase mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>文档摘要与正文提取预览</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed font-mono whitespace-pre-wrap max-h-48 overflow-y-auto text-[11px]">
              {document.fullText || document.summary || '未提取到正文文本。'}
            </div>
          </div>

          {/* 关联智能推荐 */}
          <div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold uppercase mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              <span>语义关联文档推荐（Upstash Vector 余弦临近）</span>
            </div>
            {loadingRecs ? (
              <div className="text-slate-400 text-xs py-2">正在计算向量空间相似度...</div>
            ) : recommendations.length === 0 ? (
              <div className="text-slate-400 text-xs py-2">
                暂无强关联推荐文档。上传更多个人笔记可丰富知识网络。
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {recommendations.map((rec) => (
                  <button
                    key={rec.id}
                    onClick={() => onSelectRelatedDoc(rec)}
                    className="p-3 text-left rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500/50 hover:bg-emerald-50/20 dark:hover:bg-slate-800/40 transition-all group ios-press"
                  >
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate">
                      {rec.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-1">
                      {rec.summary}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 shrink-0">
          <button
            onClick={() => {
              if (confirm(`确定永久删除文档 "${document.name}" 吗？`)) {
                onDelete(document.id);
                onClose();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors ios-press"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>删除文档</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors ios-press"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>已复制直链!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>复制直链</span>
                </>
              )}
            </button>

            <a
              href={`/api/documents/download?id=${encodeURIComponent(document.id)}`}
              download={document.name}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-400 rounded-xl shadow-xs transition-colors ios-press"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>下载文件</span>
            </a>

            <a
              href={document.blobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors ios-press"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>浏览器打开</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
