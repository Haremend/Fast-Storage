'use client';

import React, { useState } from 'react';
import { Lock, User, KeyRound, RefreshCw } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: { username: string; role: string }) => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('请输入账号和密码');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '账号或密码不正确');
      }

      if (data.token && typeof window !== 'undefined') {
        localStorage.setItem('fast_storage_session_token', data.token);
        localStorage.setItem('upcloud_session_token', data.token);
      }

      onLoginSuccess(data.user);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '登录发生未知错误');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans bg-[#06000c] text-white selection:bg-purple-500/30">
      {/* Background Multi-layered Cosmic Black-Purple Liquid Aura Mesh (默认黑紫色) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,#2a0845_0%,#110122_45%,#06000c_85%)]" />
        <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.30),transparent_65%)] blur-3xl animate-pulse" />
        <div className="absolute top-1/3 right-0 w-[550px] h-[550px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(217,70,239,0.22),transparent_65%)] blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 w-[700px] h-[700px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(76,29,149,0.35),transparent_65%)] blur-3xl" />
      </div>

      {/* iOS 27 Liquid Glass Login Card */}
      <div className="w-full max-w-sm liquid-glass rounded-3xl p-8 sm:p-9 relative z-10 shadow-2xl transition-all duration-300 border border-white/25">
        {/* Header Icon & Title */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-200 via-zinc-100 to-slate-400 flex items-center justify-center shadow-xl shadow-black/40 text-slate-950 border border-white/90">
            <Lock className="w-7 h-7 stroke-[2.2]" />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Fast Storage
            </h1>
            <p className="text-xs text-slate-300 mt-1 font-medium">
              请登录以访问个人空间
            </p>
          </div>
        </div>

        {/* Minimal Credentials Form (保留账号与密码，无冗余提示防被扫描) */}
        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-200 ml-1">
              账号
            </label>
            <div className="relative flex items-center">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入账号"
                autoComplete="username"
                autoFocus
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl liquid-input text-xs text-white placeholder-slate-400 font-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-200 ml-1">
              密码
            </label>
            <div className="relative flex items-center">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                autoComplete="current-password"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl liquid-input text-xs text-white placeholder-slate-400 font-medium"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          {/* 选中的按钮修改为“银灰色” */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 liquid-pill-primary py-3 px-4 font-bold text-xs rounded-xl shadow-xl shadow-black/40 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-black"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>验证中...</span>
              </>
            ) : (
              <span>登录</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
