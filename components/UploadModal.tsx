'use client';

import React, { useState } from 'react';
import {
  X,
  Upload,
  FileText,
  Check,
  RefreshCw,
  Tag,
  AlignLeft,
  Sparkles,
  Folder,
  AlertTriangle,
  Link,
  Files,
} from 'lucide-react';
import { DocumentItem, SimilarDocRef } from '@/lib/types';

type BlobFolder = 'avatars' | 'documents' | 'wallpapers' | 'temp';

const FOLDER_OPTIONS: { id: BlobFolder; label: string; desc: string }[] = [
  { id: 'documents', label: 'Documents', desc: '个人文档 / 笔记' },
  { id: 'wallpapers', label: 'Wallpapers', desc: '背景壁纸图片' },
  { id: 'avatars', label: 'Avatars', desc: '个人头像' },
  { id: 'temp', label: 'Temp', desc: '临时文件' },
];

type UploadStatus = 'pending' | 'uploading' | 'done' | 'error';

interface SelectedFile {
  id: string;
  file: File;
  status: UploadStatus;
  message?: string;
  duplicate?: SimilarDocRef;
  related?: SimilarDocRef[];
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentUploaded: (doc: DocumentItem) => void;
}

const formatSize = (bytes: number) =>
  bytes > 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(2)} MB` : `${(bytes / 1024).toFixed(1)} KB`;

export function UploadModal({
  isOpen,
  onClose,
  onDocumentUploaded,
}: UploadModalProps) {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [tags, setTags] = useState('个人文档, 架构设计');
  const [summary, setSummary] = useState('');
  const [folder, setFolder] = useState<BlobFolder>('documents');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hasUploaded, setHasUploaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ message: string } | null>(null);
  const [dupWarning, setDupWarning] = useState<SimilarDocRef | null>(null);
  const [relatedDocs, setRelatedDocs] = useState<SimilarDocRef[]>([]);

  // 快速文本编辑模式
  const [isTextMode, setIsTextMode] = useState(false);
  const [textDocName, setTextDocName] = useState('');
  const [textContent, setTextContent] = useState('');

  if (!isOpen) return null;

  const addFiles = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.id));
      const next = [...prev];
      for (const file of arr) {
        const id = `${file.name}-${file.size}-${file.lastModified}`;
        if (existing.has(id)) continue;
        existing.add(id);
        next.push({ id, file, status: 'pending' });
      }
      return next;
    });
  };

  const removeFile = (id: string) => {
    if (isUploading) return;
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const resetAll = () => {
    setFiles([]);
    setSummary('');
    setErrorMessage(null);
    setSuccessInfo(null);
    setDupWarning(null);
    setRelatedDocs([]);
    setHasUploaded(false);
    setTextDocName('');
    setTextContent('');
  };

  const handleClose = () => {
    if (isUploading) return;
    resetAll();
    onClose();
  };

  const updateFile = (id: string, patch: Partial<SelectedFile>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const uploadOne = async (item: SelectedFile): Promise<DocumentItem | null> => {
    updateFile(item.id, { status: 'uploading', message: undefined, duplicate: undefined, related: undefined });
    try {
      const formData = new FormData();
      formData.append('file', item.file);
      if (summary) formData.append('summary', summary);
      if (tags) formData.append('tags', tags);
      formData.append('folder', folder);

      const res = await fetch('/api/documents', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '上传失败');
      }

      const duplicate: SimilarDocRef | undefined =
        Array.isArray(data.duplicates) && data.duplicates[0] ? data.duplicates[0] : undefined;
      const related: SimilarDocRef[] = Array.isArray(data.relatedDocs) ? data.relatedDocs.slice(0, 3) : [];

      updateFile(item.id, {
        status: 'done',
        message: data.textLike ? '已存入 Blob · 已建立语义向量' : '已存入 Blob',
        duplicate,
        related,
      });
      return data.document as DocumentItem;
    } catch (err) {
      updateFile(item.id, {
        status: 'error',
        message: err instanceof Error ? err.message : '上传失败',
      });
      return null;
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessInfo(null);
    setDupWarning(null);
    setRelatedDocs([]);

    // —— 在线 Markdown 编辑模式：单文档 ——
    if (isTextMode) {
      if (!textDocName.trim() || !textContent.trim()) {
        setErrorMessage('请填写文件名与正文内容。');
        return;
      }
      setIsUploading(true);
      try {
        const res = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: textDocName,
            content: textContent,
            type: 'text/markdown',
            summary: summary || textContent.slice(0, 140).replace(/\n/g, ' '),
            tags: tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
            folder,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || '上传失败');

        onDocumentUploaded(data.document);
        setSuccessInfo({
          message: data.textLike ? '文档已存入 Upstash Blob，并已同步建立语义向量索引！' : '文档已存入 Upstash Blob！',
        });
        if (Array.isArray(data.duplicates) && data.duplicates.length > 0) setDupWarning(data.duplicates[0]);
        if (Array.isArray(data.relatedDocs)) setRelatedDocs(data.relatedDocs.slice(0, 3));
        setHasUploaded(true);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : '上传失败');
      } finally {
        setIsUploading(false);
      }
      return;
    }

    // —— 本地文件模式：批量逐文件上传 ——
    const pending = files.filter((f) => f.status !== 'done');
    if (pending.length === 0) {
      setErrorMessage('请先选择或拖拽待上传的文件。');
      return;
    }

    setIsUploading(true);
    let lastDoc: DocumentItem | null = null;
    for (const item of pending) {
      const doc = await uploadOne(item);
      if (doc) lastDoc = doc;
    }
    setIsUploading(false);
    setHasUploaded(true);
    if (lastDoc) onDocumentUploaded(lastDoc);
  };

  const pendingCount = files.filter((f) => f.status !== 'done').length;
  const doneCount = files.filter((f) => f.status === 'done').length;
  const errorCount = files.filter((f) => f.status === 'error').length;
  const canSubmit = isTextMode
    ? Boolean(textDocName.trim() && textContent.trim())
    : pendingCount > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xl">
      <div className="w-full max-w-3xl liquid-glass rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col transition-all duration-300">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl liquid-glass-subtle flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">上传文件至云端存储</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-300 mt-0.5">支持多选 / 拖拽批量上传，文本文件自动建立语义向量</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="liquid-orb w-8 h-8 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleUpload} className="flex flex-col flex-1 min-h-0">
          {/* 可滚动内容区 */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
            {/* 模式切换 */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsTextMode(false)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                  !isTextMode
                    ? 'liquid-pill-primary shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                本地文件上传（支持多选）
              </button>
              <button
                type="button"
                onClick={() => setIsTextMode(true)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
                  isTextMode
                    ? 'liquid-pill-primary shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>在线 Markdown 编辑</span>
              </button>
            </div>

            {/* 分类选择 */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                <Folder className="w-3.5 h-3.5 text-emerald-500" />
                <span>存储分类 (Upstash Blob 文件夹)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FOLDER_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFolder(opt.id)}
                    className={`rounded-xl px-3 py-2.5 text-left transition-all cursor-pointer border ${
                      folder === opt.id
                        ? 'liquid-pill-primary shadow-md border-transparent'
                        : 'liquid-glass-subtle border-white/40 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:border-emerald-400/40'
                    }`}
                  >
                    <div className={`text-xs font-bold ${folder === opt.id ? 'text-black' : ''}`}>{opt.label}</div>
                    <div className={`text-[10px] ${folder === opt.id ? 'text-slate-700' : 'text-slate-400 dark:text-slate-300'}`}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {!isTextMode ? (
              <>
                {/* 拖拽 / 多选上传区域 */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`p-7 rounded-2xl border-2 border-dashed text-center transition-all liquid-glass-subtle ${
                    isDragging
                      ? 'border-emerald-500 bg-emerald-500/15'
                      : 'border-slate-300 dark:border-white/15 hover:border-emerald-500/50'
                  }`}
                >
                  <input
                    type="file"
                    id="doc-file-input"
                    multiple
                    onChange={(e) => {
                      if (e.target.files?.length) addFiles(e.target.files);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                  <label htmlFor="doc-file-input" className="cursor-pointer block">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2.5 shadow-xs">
                      <Upload className="w-7 h-7 stroke-[2.2]" />
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      点击选择多个文件 或 将文件批量拖拽至此处
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-300 mt-1">
                      支持 PDF、Markdown、纯文本、JSON、图片等格式，批量存入 Upstash Blob
                    </div>
                  </label>
                </div>

                {/* 已选文件列表 */}
                {files.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-300 font-mono uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <Files className="w-3.5 h-3.5 text-emerald-500" />
                        已选文件 ({files.length})
                      </span>
                      <span>
                        成功 {doneCount} · 失败 {errorCount} · 待传 {pendingCount}
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                      {files.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl liquid-glass-subtle flex items-start gap-3 text-xs"
                        >
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-900 dark:text-white truncate">
                              {item.file.name}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-300 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>{formatSize(item.file.size)}</span>
                              {item.status === 'uploading' && (
                                <span className="text-emerald-500 flex items-center gap-1">
                                  <RefreshCw className="w-3 h-3 animate-spin" /> 上传中
                                </span>
                              )}
                              {item.status === 'done' && (
                                <span className="text-emerald-500 flex items-center gap-1">
                                  <Check className="w-3 h-3" /> {item.message}
                                </span>
                              )}
                              {item.status === 'error' && (
                                <span className="text-rose-500 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> {item.message}
                                </span>
                              )}
                            </div>
                            {item.duplicate && (
                              <div className="text-[10px] text-amber-600 dark:text-amber-300 mt-1">
                                疑似重复：{item.duplicate.name}（{Math.round(item.duplicate.similarity * 100)}%）
                              </div>
                            )}
                            {item.related && item.related.length > 0 && (
                              <div className="text-[10px] text-sky-600 dark:text-sky-300 mt-1 truncate">
                                相关：{item.related.map((r) => `${r.name} ${Math.round(r.similarity * 100)}%`).join(' · ')}
                              </div>
                            )}
                          </div>
                          {item.status !== 'uploading' && !isUploading && (
                            <button
                              type="button"
                              onClick={() => removeFile(item.id)}
                              className="liquid-orb w-6 h-6 text-slate-400 hover:text-rose-400 shrink-0 flex items-center justify-center cursor-pointer"
                              title="移除"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
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
                    placeholder="例如：个人技术笔记.md"
                    className="w-full px-3.5 py-2 text-xs rounded-xl liquid-input font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    文档正文内容 (Markdown / 文本)
                  </label>
                  <textarea
                    rows={7}
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="在此输入正文内容..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl liquid-input font-mono leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* 元信息输入（批量上传时作为所有文件的公共标签/备注） */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <Tag className="w-3.5 h-3.5 text-emerald-500" />
                  <span>语义检索标签</span>
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="例如: 架构设计, Vercel"
                  className="w-full px-3.5 py-2 rounded-xl liquid-input"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <AlignLeft className="w-3.5 h-3.5 text-emerald-500" />
                  <span>公共备注 (可选)</span>
                </label>
                <input
                  type="text"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="简短描述，应用到本次上传的全部文件"
                  className="w-full px-3.5 py-2 rounded-xl liquid-input"
                />
              </div>
            </div>

            {/* 文本模式的结果（批量文件的结果显示在文件列表中） */}
            {isTextMode && (errorMessage || successInfo || dupWarning || relatedDocs.length > 0) && (
              <div className="space-y-2">
                {errorMessage && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                    {errorMessage}
                  </div>
                )}
                {successInfo && (
                  <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 font-bold">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{successInfo.message}</span>
                  </div>
                )}
                {dupWarning && (
                  <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-300 text-xs">
                    <span className="font-bold">疑似重复（{Math.round(dupWarning.similarity * 100)}%）：</span>
                    {dupWarning.name}
                  </div>
                )}
                {relatedDocs.length > 0 && (
                  <div className="p-3 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-700 dark:text-sky-300 text-xs">
                    <span className="font-bold flex items-center gap-1.5 mb-1"><Link className="w-3.5 h-3.5" /> 语义相关文档</span>
                    {relatedDocs.map((d, i) => (
                      <div key={d.id || i} className="text-[11px] pl-5">
                        {d.name} · {Math.round(d.similarity * 100)}%
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 批量上传错误提示 */}
            {!isTextMode && errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                {errorMessage}
              </div>
            )}
          </div>

          {/* 底部操作栏 */}
          <div className="flex items-center justify-between gap-2.5 px-6 py-4 border-t border-black/5 dark:border-white/10 shrink-0">
            <div className="text-[11px] text-slate-500 dark:text-slate-300 font-mono truncate">
              {!isTextMode && files.length > 0
                ? `${files.length} 个文件 · 将存入 ${folder}/`
                : isTextMode
                  ? '在线编辑内容 · 将存入 ' + folder + '/'
                  : '尚未选择文件'}
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleClose}
                disabled={isUploading}
                className="liquid-pill px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer disabled:opacity-40"
              >
                {hasUploaded ? '关闭' : '取消'}
              </button>
              <button
                type="submit"
                disabled={isUploading || !canSubmit}
                className="liquid-pill-primary px-5 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-40"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>上传中 ({doneCount + errorCount}/{files.length})</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isTextMode ? '确认存入并建立向量' : `开始上传${pendingCount > 0 ? ` (${pendingCount})` : ''}`}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
