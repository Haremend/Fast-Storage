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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
      <div className="w-full max-w-md liquid-glass rounded-3xl shadow-2xl overflow-hidden transition-all duration-300">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl liquid-glass-subflex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <User className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">个人头像与资料设置</h3>
          </div>
          <button
            onClick={onClose}
            className="liquid-orb w-8 h-8 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* 头像预览与上传区 */}
          <div className="flex items-center gap-5">
            <div className="relative group w-20 h-20 rounded-2xl overflow-hidden bg-emerald-950/20 ring-2 ring-emerald-500/50 shrink-0 shadow-lg shadow-emerald-500/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl || session?.avatarUrl || '/src/assets/images/avatar_alex_morgan_1793673663751.jpg'}
                alt="头像预览"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex-1 space-y-2">
              <label
                htmlFor="avatar-upload"
                className="liquid-pill inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 cursor-pointer"
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
              <p className="text-[11px] text-slate-500 dark:text-slate-300 leading-relaxed">
                上传后将持久化写入 Upstash Blob，并在 Redis 会话中实时更新。
              </p>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                <User className="w-3.5 h-3.5 text-emerald-500" />
                <span>姓名 / 昵称</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl liquid-input text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                <Mail className="w-3.5 h-3.5 text-emerald-500" />
                <span>电子邮箱</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl liquid-input text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                <Briefcase className="w-3.5 h-3.5 text-emerald-500" />
                <span>角色与身份</span>
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl liquid-input text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 font-bold">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-black/5 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="liquid-pill px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="liquid-pill-primary px-5 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-40"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>保存同步中...</span>
                </>
              ) : (
                <span>保存并同步至 Redis</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
