'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  Palette,
  type LucideIcon,
} from 'lucide-react';
import { UserSession } from '@/lib/types';

interface TopBarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenUpload: () => void;
  onOpenAvatar: () => void;
  onOpenWallpaper: () => void;
  session: UserSession | null;
  username?: string;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  docsCount?: number;
}

export function TopBar({
  currentTab,
  onSelectTab,
  onOpenUpload,
  onOpenAvatar,
  onOpenWallpaper,
  session,
  username = 'admin',
  onLogout,
  isDarkMode,
  onToggleTheme,
  docsCount = 0,
}: TopBarProps) {
  const navItems: { id: string; label: string; icon: LucideIcon; count?: number }[] = [
    { id: 'overview', label: '工作台概览', icon: LayoutDashboard },
    { id: 'documents', label: '文件管理', icon: FolderArchive, count: docsCount },
    { id: 'search', label: '向量数据库', icon: Database },
    { id: 'queue', label: 'QStash 队列舱', icon: Activity },
    { id: 'redis', label: 'Redis 空间与用例', icon: Server },
    { id: 'system', label: '云端架构诊断', icon: Database },
  ];

  // 统一菜单栏：横向滚动 + 鼠标靠近左右边缘时自动滑动
  const navRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const speedRef = useRef<number>(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  const stopEdgeScroll = useCallback(() => {
    speedRef.current = 0;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startEdgeScroll = useCallback(() => {
    if (rafRef.current !== null) return; // 已在运行
    function step() {
      const el = navRef.current;
      if (!el || speedRef.current === 0) {
        rafRef.current = null;
        return;
      }
      const prev = el.scrollLeft;
      el.scrollLeft = prev + speedRef.current;
      // 到达边缘则停止，避免空转
      if (el.scrollLeft === prev) {
        rafRef.current = null;
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
  }, []);

  const handleNavMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const el = navRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const edge = 64; // 边缘感应宽度（px）
      const maxSpeed = 14; // 每帧最大滚动像素
      const fromLeft = e.clientX - rect.left;
      const fromRight = rect.right - e.clientX;

      let speed = 0;
      if (fromLeft < edge) {
        speed = -Math.ceil(((edge - fromLeft) / edge) * maxSpeed);
      } else if (fromRight < edge) {
        speed = Math.ceil(((edge - fromRight) / edge) * maxSpeed);
      }

      speedRef.current = speed;
      if (speed !== 0) {
        startEdgeScroll();
      } else {
        stopEdgeScroll();
      }
    },
    [startEdgeScroll, stopEdgeScroll]
  );

  useEffect(() => {
    updateScrollState();
    const handleResize = () => updateScrollState();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [updateScrollState]);

  return (
    <header className="sticky top-3 z-40 px-3 sm:px-6">
      <div className="max-w-[1600px] mx-auto liquid-glass rounded-3xl px-3 sm:px-6 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-4 transition-all duration-300 border border-white/30 dark:border-white/20">
        {/* 区域 1: iOS 27 液态玻璃品牌字标 (金属银灰拉丝高光质感) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onSelectTab('overview')}
            className="flex items-center gap-3 text-slate-900 dark:text-white font-bold text-base tracking-tight hover:opacity-90 transition-all cursor-pointer group"
          >
            <div className="relative w-8 h-8 rounded-2xl bg-gradient-to-tr from-slate-200 via-zinc-100 to-slate-400 flex items-center justify-center text-slate-900 shadow-lg shadow-black/20 border border-white/80 transition-transform duration-300 group-hover:scale-105">
              <span className="w-2.5 h-2.5 bg-slate-900 rounded-full shadow-xs" />
              <div className="absolute inset-0 rounded-2xl bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white leading-none">
                Fast Storage
              </span>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-300 font-mono tracking-wider opacity-85 mt-0.5">
                LIQUID CLOUD
              </span>
            </div>
          </button>
        </div>

        {/* 区域 2: 统一菜单栏 (居中胶囊，窄屏横向滚动 + 边缘悬停自动滑动) */}
        <div className="flex-1 min-w-0 flex justify-center">
          <div className="relative min-w-0 max-w-full liquid-glass-subtle rounded-full p-1.5">
            <nav
              ref={navRef}
              onMouseMove={handleNavMouseMove}
              onMouseLeave={stopEdgeScroll}
              onScroll={updateScrollState}
              className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`relative flex items-center gap-2 px-3.5 sm:px-4 py-1.5 text-xs font-bold rounded-full whitespace-nowrap transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'liquid-pill-primary shadow-md text-slate-950 font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/30 dark:hover:bg-white/10'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black font-bold' : 'opacity-70'}`} />
                    <span>{item.label}</span>
                    {item.count !== undefined && item.count > 0 && (
                      <span
                        className={`min-w-[16px] h-4 px-1 flex items-center justify-center text-[9px] font-mono font-bold rounded-full ${
                          isActive
                            ? 'bg-black/15 text-black'
                            : 'bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {item.count > 99 ? '99+' : item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* 边缘渐隐指示（仅当该侧可滚动时显示） */}
            {canScrollLeft && (
              <div className="pointer-events-none absolute inset-y-0 left-0 w-7 rounded-l-full bg-gradient-to-r from-white/85 to-transparent dark:from-black/65" />
            )}
            {canScrollRight && (
              <div className="pointer-events-none absolute inset-y-0 right-0 w-7 rounded-r-full bg-gradient-to-l from-white/85 to-transparent dark:from-black/65" />
            )}
          </div>
        </div>

        {/* 区域 3: 核心动作区 (背景上传与切换、主题切换、上传文档、个人头像、登出) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* 背景壁纸切换与自定义上传按钮 */}
          <button
            onClick={onOpenWallpaper}
            title="更换背景壁纸 / 上传自定义图片"
            className="liquid-pill flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer hover:border-purple-400/50"
          >
            <Palette className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">壁纸</span>
          </button>

          {/* 主题切换按钮 */}
          <button
            onClick={onToggleTheme}
            title={isDarkMode ? '切换为亮色模式' : '切换为暗色模式'}
            className="w-9 h-9 rounded-full liquid-orb text-slate-600 dark:text-slate-300 transition-transform cursor-pointer"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* 上传文档按钮 (银灰色按键) */}
          <button
            onClick={onOpenUpload}
            className="liquid-pill-primary flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-bold rounded-full shadow-lg shadow-black/25 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">上传文档</span>
          </button>

          {/* 用户头像与信息 */}
          <button
            onClick={onOpenAvatar}
            title="个人资料与头像"
            className="liquid-pill flex items-center gap-2 pl-1.5 pr-2.5 sm:pr-3 py-1 cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-white/50 bg-slate-200 dark:bg-purple-950/60 shrink-0 shadow-xs">
              {session?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.avatarUrl}
                  alt={session.name || '头像'}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-800 dark:text-slate-100">
                  {username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className="hidden sm:inline-block text-xs font-semibold text-slate-700 dark:text-slate-200 max-w-[85px] truncate">
              {username}
            </span>
          </button>

          {/* 安全登出 */}
          <button
            onClick={onLogout}
            title="退出登录"
            className="w-9 h-9 rounded-full liquid-orb text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
