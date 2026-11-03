'use client';

import React from 'react';
import {
  Plus,
  Database,
  Sparkles,
  FolderArchive,
  Activity,
  LayoutDashboard,
  LogOut,
  Sun,
  Moon,
  Server,
} from 'lucide-react';
import { UserSession } from '@/lib/types';

interface TopBarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenUpload: () => void;
  onOpenAvatar: () => void;
  session: UserSession | null;
  username?: string;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export function TopBar({
  currentTab,
  onSelectTab,
  onOpenUpload,
  onOpenAvatar,
  session,
  username = 'admin',
  onLogout,
  isDarkMode,
  onToggleTheme,
}: TopBarProps) {
  const navItems = [
    { id: 'overview', label: '工作台概览', icon: LayoutDashboard },
    { id: 'documents', label: '个人文档', icon: FolderArchive },
    { id: 'search', label: '语义检索舱', icon: Sparkles },
    { id: 'queue', label: 'QStash 队列舱', icon: Activity },
    { id: 'redis', label: 'Redis 空间与用例', icon: Server },
    { id: 'system', label: '云端架构诊断', icon: Database },
  ];

  return (
    <header className="sticky top-0 z-40 px-6 py-3 ios-glass border-b border-slate-200/80 dark:border-white/10 shadow-xs transition-colors">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-8">
        {/* 区域 1: iOS 风格品牌字标 */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onSelectTab('overview')}
            className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-base tracking-tight hover:opacity-80 transition-opacity"
          >
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <span className="w-2.5 h-2.5 bg-white rounded-full" />
            </div>
            <span className="font-semibold">UpCloud Vault</span>
          </button>
        </div>

        {/* 区域 2: 4-6 个 iOS 磨砂导航胶囊 */}
        <nav className="hidden xl:flex items-center gap-1.5 p-1 bg-black/5 dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/5">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-xl whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* 区域 3: iOS 核心动作区 */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* 主题切换按钮 */}
          <button
            onClick={onToggleTheme}
            title={isDarkMode ? '切换为亮色模式' : '切换为暗色模式'}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors ios-press"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* 上传文档按钮 */}
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] rounded-xl shadow-md shadow-emerald-500/20 transition-all whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>上传文档</span>
          </button>

          {/* 用户头像与信息 */}
          <button
            onClick={onOpenAvatar}
            title="个人资料与头像"
            className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
          >
            <div className="w-7 h-7 rounded-full overflow-hidden ring-1 ring-emerald-500/40 bg-slate-200 dark:bg-slate-800 shrink-0">
              {session?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.avatarUrl}
                  alt={session.name || '头像'}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                  {username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className="hidden sm:inline-block text-xs font-medium text-slate-700 dark:text-slate-300 max-w-[80px] truncate">
              {username}
            </span>
          </button>

          {/* 安全登出 */}
          <button
            onClick={onLogout}
            title="退出管理员登录"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors ios-press"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
