'use client';

import React, { useState } from 'react';
import { X, Upload, FileText, Check, RefreshCw, Tag, AlignLeft, Sparkles } from 'lucide-react';
import { DocumentItem } from '@/lib/types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentUploaded: (doc: DocumentItem) => void;
}

export function UploadModal({
  isOpen,
  onClose,
  onDocumentUploaded,
}: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState('个人文档, 架构设计');
  const [summary, setSummary] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ message: string; taskId: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 快速文本编辑模式
  const [isTextMode, setIsTextMode] = useState(false);
  const [textDocName, setTextDocName] = useState('Serverless边缘计算笔记.md');
  const [textContent, setTextContent] = useState(
    `# Upstash Redis 与 Serverless 全局缓存最佳实践

在 Vercel 等 Serverless 环境中处理高并发：
1. 采用 QStash 异步队列缓冲长期耗时的向量嵌入任务。
2. 将非结构化文本通过 Upstash Vector 建立稠密高维向量。
3. 查询结果在 Upstash Redis 中以 5 分钟 TTL 缓存，实现亚毫秒极速响应。
4. 每当有新文档入库时，主动通知 Redis 清理或失效过时键值。`
  );

  if (!isOpen) return null;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setErrorMessage(null);
    setSuccessInfo(null);

    try {
      let res: Response;

      if (isTextMode) {
        // 直接上传文本 / Markdown 内容
        res = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: textDocName,
            content: textContent,
            type: 'text/markdown',
            summary: summary || textContent.slice(0, 140).replace(/\n/g, ' '),
            tags: tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
          }),
        });
      } else {
        if (!file) {
          throw new Error('请选择或拖拽待上传的文件。');
        }

        const formData = new FormData();
        formData.append('file', file);
        if (summary) formData.append('summary', summary);
        if (tags) formData.append('tags', tags);

        res = await fetch('/api/documents', {
          method: 'POST',
          body: formData,
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '上传文档至 Upstash Blob 失败');
      }

      onDocumentUploaded(data.document);
      setSuccessInfo({
        message: '文档已安全存入 Upstash Blob！QStash 异步向量索引任务已排入队列。',
        taskId: data.taskId,
      });

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">上传文档至云端存储</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ios-press"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 模式切换 */}
        <div className="px-6 pt-4 pb-1 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsTextMode(false)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
              !isTextMode
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            本地文件上传 (PDF, MD, TXT)
          </button>
          <button
            type="button"
            onClick={() => setIsTextMode(true)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
              isTextMode
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>在线 Markdown / 笔记编辑</span>
          </button>
        </div>

        <form onSubmit={handleUpload} className="p-6 space-y-4">
          {!isTextMode ? (
            /* 拖拽上传区域 */
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`p-6 rounded-2xl border-2 border-dashed text-center transition-all ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 bg-slate-50/60 dark:bg-slate-950/60'
              }`}
            >
              <input
                type="file"
                id="doc-file-input"
                onChange={(e) => {
                  if (e.target.files?.[0]) setFile(e.target.files[0]);
                }}
                className="hidden"
              />
              <label htmlFor="doc-file-input" className="cursor-pointer block">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2">
                  <Upload className="w-6 h-6 stroke-[2.2]" />
                </div>
                {file ? (
                  <div className="text-xs text-slate-900 dark:text-white font-semibold truncate max-w-xs mx-auto">
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </div>
                ) : (
                  <>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      点击选择本地文件 或 将文件拖拽至此处
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      支持 PDF、Markdown、纯文本、JSON 格式（存入 Upstash Blob）
                    </div>
                  </>
                )}
              </label>
            </div>
          ) : (
            /* 文本编辑模式 */
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  文档文件名
                </label>
                <input
                  type="text"
                  value={textDocName}
                  onChange={(e) => setTextDocName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  文档正文内容 (Markdown / 文本)
                </label>
                <textarea
                  rows={4}
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {/* 元信息输入 */}
          <div className="space-y-3 text-xs">
            <div>
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>语义检索标签 (逗号分隔)</span>
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="例如: 架构设计, Vercel, 机器学习"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <AlignLeft className="w-3.5 h-3.5 text-slate-400" />
                <span>内容简要备注 (可选)</span>
              </label>
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="简短描述，有助于快速预览与向量上下文提取"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {successInfo && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs space-y-1">
              <div className="flex items-center gap-2 font-semibold">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{successInfo.message}</span>
              </div>
              <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 pl-6">
                QStash 异步任务流水号: {successInfo.taskId}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isUploading || (!isTextMode && !file)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] rounded-xl shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>正在上传至 Blob...</span>
                </>
              ) : (
                <span>确认存入并异步建立向量</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
