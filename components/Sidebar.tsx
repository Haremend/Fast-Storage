'use client';

import React from 'react';
import {
  LayoutDashboard,
  FolderArchive,
  Sparkles,
  Activity,
  Database,
  Cloud,
  Layers,
  Zap,
  Server,
  ArrowUpRight,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { SystemStatus } from '@/lib/types';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  status: SystemStatus | null;
  docsCount: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  status,
  docsCount,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const navTabs = [
    { id: 'overview', label: '工作台概览', icon: LayoutDashboard },
    { id: 'documents', label: '个人云端文档', icon: FolderArchive, count: docsCount },
    { id: 'search', label: '语义智能检索舱', icon: Sparkles },
    { id: 'queue', label: 'QStash 异步队列舱', icon: Activity },
    { id: 'redis', label: 'Redis 空间与用例', icon: Server },
    { id: 'system', label: '云端架构与诊断', icon: Database },
  ];

  return (
    <aside
      className={`ios-glass border-r border-slate-200/80 dark:border-white/10 flex flex-col shrink-0 min-h-[calc(100vh-57px)] transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* 顶部菜单栏标题与收起/展开控制按钮 */}
      <div className="p-3 border-b border-slate-200/60 dark:border-white/5 flex items-center justify-between">
        {!isCollapsed ? (
          <>
            <span className="text-[11px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase px-2">
              工作空间导航
            </span>
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title="收起菜单栏"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-all text-xs font-medium ios-press"
              >
                <PanelLeftClose className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="text-[11px]">收起</span>
              </button>
            )}
          </>
        ) : (
          <div className="w-full flex justify-center">
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title="展开菜单栏"
                className="w-full flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-all ios-press"
              >
                <PanelLeftOpen className="w-5 h-5 text-emerald-500" />
                <span className="text-[10px] font-medium leading-none">展开</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 工作区菜单项 */}
      <div className="p-3 space-y-1.5">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          if (isCollapsed) {
            return (
              <div key={tab.id} className="relative flex justify-center">
                <button
                  type="button"
                  onClick={() => onSelectTab(tab.id)}
                  title={tab.label}
                  className={`relative w-12 h-12 flex items-center justify-center rounded-2xl transition-all ios-press group ${
                    isActive
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-800 dark:group-hover:text-white'
                    }`}
                  />
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-mono font-bold rounded-full ${
                        isActive
                          ? 'bg-white text-emerald-600 shadow-xs'
                          : 'bg-emerald-500 text-white shadow-xs'
                      }`}
                    >
                      {tab.count > 99 ? '99+' : tab.count}
                    </span>
                  )}
                </button>
              </div>
            );
          }

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-all ios-press ${
                isActive
                  ? 'bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                <span className="truncate">{tab.label}</span>
              </div>
              {tab.count !== undefined && (
                <span
                  className={`text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Upstash 服务状态卡片 */}
      {!isCollapsed ? (
        <div className="p-4 mx-3 my-2 rounded-2xl ios-glass border border-slate-200/80 dark:border-white/10 space-y-3 shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
            <span>Upstash 服务</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
              {status?.isVercel ? 'Vercel Ready' : 'Serverless REST'}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <Cloud className="w-3.5 h-3.5 text-sky-500" />
                <span>Blob 存储</span>
              </span>
              <span
                className={`font-mono text-[11px] ${
                  status?.blobType === 'live'
                    ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'text-slate-400'
                }`}
              >
                {status?.blobType === 'live' ? '云端就绪' : '本地兼容'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <Zap className="w-3.5 h-3.5 text-purple-500" />
                <span>Vector 向量</span>
              </span>
              <span
                className={`font-mono text-[11px] ${
                  status?.vectorType === 'live'
                    ? 'text-purple-600 dark:text-purple-400 font-semibold'
                    : 'text-slate-400'
                }`}
              >
                {status?.vectorType === 'live' ? '云端就绪' : '本地向量'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <Activity className="w-3.5 h-3.5 text-amber-500" />
                <span>QStash 队列</span>
              </span>
              <span
                className={`font-mono text-[11px] ${
                  status?.qstashType === 'live'
                    ? 'text-amber-600 dark:text-amber-400 font-semibold'
                    : 'text-slate-400'
                }`}
              >
                {status?.qstashType === 'live' ? '云端就绪' : '本地队列'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <Layers className="w-3.5 h-3.5 text-emerald-500" />
                <span>Redis 缓存</span>
              </span>
              <span
                className={`font-mono text-[11px] ${
                  status?.redisType === 'live'
                    ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'text-slate-400'
                }`}
              >
                {status?.redisType === 'live' ? '云端就绪' : '内存缓存'}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>缓存命中率</span>
            <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-bold">
              {status?.cacheStats?.hitRatio || '100.0%'}
            </span>
          </div>
        </div>
      ) : (
        /* 收起状态下的微缩状态指示器 */
        <div
          title="Upstash 服务套件 (Blob/Vector/QStash/Redis) 均正常运行"
          className="mx-3 my-2 p-2.5 rounded-2xl ios-glass border border-slate-200/80 dark:border-white/10 flex flex-col items-center gap-2 cursor-help"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <div className="flex flex-col gap-1 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" title="Blob" />
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" title="Vector" />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="QStash" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Redis" />
          </div>
        </div>
      )}

      {/* 底部链接与收起/展开快捷按钮 */}
      <div className="mt-auto p-3 border-t border-slate-200/80 dark:border-white/10 space-y-2">
        {!isCollapsed ? (
          <>
            <a
              href="https://console.upstash.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors px-1"
            >
              <span className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" />
                <span>Upstash 控制台</span>
              </span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed px-1">
              基于无状态 REST 客户端设计，专为 Vercel Serverless 优化。
            </div>
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all ios-press border border-dashed border-slate-200 dark:border-white/10"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>收起侧边栏</span>
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <a
              href="https://console.upstash.com"
              target="_blank"
              rel="noopener noreferrer"
              title="访问 Upstash 控制台"
              className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <Server className="w-4 h-4" />
            </a>
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title="展开侧边栏"
                className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-emerald-500 hover:bg-black/5 dark:hover:bg-white/5 transition-all ios-press"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
