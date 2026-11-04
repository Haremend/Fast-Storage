'use client';

import React, { useState } from 'react';
import { X, Upload, Check, RefreshCw, User, Mail, Briefcase } from 'lucide-react';
import { UserSession } from '@/lib/types';

interface AvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: UserSession | null;
  onSessionUpdated: (session: UserSession) => void;
}

export function AvatarModal({
  isOpen,
  onClose,
  session,
  onSessionUpdated,
}: AvatarModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState(session?.name || 'Alex Morgan');
  const [email, setEmail] = useState(session?.email || 'alex.morgan@faststorage.dev');
  const [role, setRole] = useState(session?.role || '云架构师与研究员');
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMessage('请选择标准的图片格式文件（PNG、JPG、WebP 等）。');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setErrorMessage(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let finalAvatarUrl = session?.avatarUrl || '';

      // 上传头像至 Upstash Blob
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('sessionId', session?.id || 'user_alex_morgan_01');

        const uploadRes = await fetch('/api/avatar/upload', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.success) {
          throw new Error(uploadData.error || '上传头像至 Upstash Blob 失败');
        }
        finalAvatarUrl = uploadData.avatarUrl;
      }

      // 更新 Upstash Redis 中的用户会话
      const sessionRes = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session?.id || 'user_alex_morgan_01',
          name,
          email,
          role,
          avatarUrl: finalAvatarUrl,
        }),
      });

      const sessionData = await sessionRes.json();
      if (!sessionRes.ok || !sessionData.success) {
        throw new Error(sessionData.error || '更新用户会话失败');
      }

      onSessionUpdated(sessionData.session);
      setSuccessMessage('个人头像已成功存入 Upstash Blob，并同步至 Redis 全局会话！');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '上传保存过程中出现异常');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <User className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">个人头像与资料设置</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ios-press"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* 头像预览与上传区 */}
          <div className="flex items-center gap-5">
            <div className="relative group w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 ring-2 ring-emerald-500/40 shrink-0 shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl || session?.avatarUrl || '/src/assets/images/avatar_alex_morgan_1793673663751.jpg'}
                alt="头像预览"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex-1 space-y-1.5">
              <label
                htmlFor="avatar-upload"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl cursor-pointer transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>选择新头像图片</span>
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                文件直传至 Upstash Blob，享受全球边缘 CDN 加速。
              </div>
            </div>
          </div>

          {/* 表单输入 */}
          <div className="space-y-3.5 text-xs">
            <div>
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>用户显示名称</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>联系邮箱</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <span>职位 / 头衔</span>
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
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
              disabled={isUploading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] rounded-xl shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>正在存入 Blob...</span>
                </>
              ) : (
                <span>保存至 Blob 与 Redis</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
