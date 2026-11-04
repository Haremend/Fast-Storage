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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
      <div className="w-full max-w-2xl liquid-glass rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col transition-all duration-300">
        {/* 头部标题 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3 truncate">
            <div className="w-8 h-8 rounded-2xl liquid-glass-subtle flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{document.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="liquid-orb w-8 h-8 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 滚动详情 */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          {/* 元信息卡片网格 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl liquid-glass-subtle">
            <div>
              <div className="text-[11px] text-slate-400 dark:text-slate-300 uppercase font-bold font-mono">文件大小</div>
              <div className="text-slate-900 dark:text-slate-200 font-mono tabular-nums font-bold mt-0.5">{formattedSize}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 dark:text-slate-300 uppercase font-bold font-mono">存储方式</div>
              <div className="text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 flex items-center gap-1 font-bold">
                <Cloud className="w-3.5 h-3.5" />
                <span>Upstash Blob</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 dark:text-slate-300 uppercase font-bold font-mono">状态</div>
              <div className="text-slate-900 dark:text-slate-200 mt-0.5 font-bold capitalize">
                {document.status === 'indexed' ? '已向量索引' : document.status === 'unindexed' ? '未建立向量' : '处理排队中'}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 dark:text-slate-300 uppercase font-bold font-mono">Vector ID</div>
              <div className="text-purple-600 dark:text-purple-400 font-mono truncate mt-0.5 font-bold">
                {document.vectorId || '排队生成中'}
              </div>
            </div>
          </div>

          {/* 标签 */}
          {document.tags.length > 0 && (
            <div>
              <div className="text-[11px] text-slate-400 dark:text-slate-300 font-bold uppercase mb-2 font-mono">
                SEMANTIC TAGS / 语义标签
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-700 dark:text-slate-300">
                {document.tags.map((tag) => (
                  <span key={tag} className="liquid-glass-subtle px-3 py-1 rounded-full font-semibold text-[11px]">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 文档正文与提取文本预览 */}
          <div>
            <div className="text-[11px] text-slate-400 dark:text-slate-300 font-bold uppercase mb-2 flex items-center gap-1.5 font-mono">
              <Layers className="w-3.5 h-3.5 text-emerald-500" />
              <span>CONTENT PREVIEW / 文档摘要与正文提取预览</span>
            </div>
            <div className="p-4 rounded-2xl liquid-glass-subtle text-slate-800 dark:text-slate-200 leading-relaxed font-mono whitespace-pre-wrap max-h-48 overflow-y-auto text-[11px]">
              {document.fullText || document.summary || '未提取到正文文本。'}
            </div>
          </div>

          {/* 关联智能推荐 */}
          <div>
            <div className="text-[11px] text-slate-400 dark:text-slate-300 font-bold uppercase mb-2.5 flex items-center gap-1.5 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              <span>RELATED DOCUMENTS / 语义关联文档推荐 (余弦临近)</span>
            </div>
            {loadingRecs ? (
              <div className="text-slate-400 text-xs py-2">正在计算向量空间相似度...</div>
            ) : recommendations.length === 0 ? (
              <div className="text-slate-400 text-xs py-2">
                暂无强关联推荐文档。上传更多个人笔记可丰富知识网络。
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recommendations.map((rec) => (
                  <button
                    key={rec.id}
                    onClick={() => onSelectRelatedDoc(rec)}
                    className="p-3.5 text-left rounded-2xl liquid-glass-interactive group cursor-pointer"
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate">
                      {rec.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-300 line-clamp-1 mt-1">
                      {rec.summary}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-black/5 dark:border-white/10 shrink-0">
          <button
            onClick={() => {
              if (confirm(`确定永久删除文档 "${document.name}" 吗？`)) {
                onDelete(document.id);
                onClose();
              }
            }}
            className="liquid-pill flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>删除文档</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyUrl}
              className="liquid-pill flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
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
              className="liquid-pill-primary flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold shadow-md shadow-emerald-500/20"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>下载文件</span>
            </a>

            <a
              href={document.blobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="liquid-pill flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300"
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
