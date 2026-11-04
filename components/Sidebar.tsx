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
      className={`liquid-glass rounded-3xl flex flex-col shrink-0 min-h-[calc(100vh-100px)] transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* 顶部菜单栏标题与收起/展开控制按钮 */}
      {/* 顶部菜单栏标题与收起/展开控制按钮 */}
      <div className="p-3.5 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
        {!isCollapsed ? (
          <>
            <span className="text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-400 uppercase px-2 font-mono">
              WORKSPACE
            </span>
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title="收起菜单栏"
                className="liquid-pill flex items-center gap-1.5 px-3 py-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all text-xs font-semibold cursor-pointer"
              >
                <PanelLeftClose className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
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
                className="liquid-orb w-10 h-10 flex flex-col items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                <PanelLeftOpen className="w-4 h-4 text-slate-300" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 工作区液态菜单项 (选中状态为高级银灰色) */}
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
                  className={`relative w-12 h-12 flex items-center justify-center rounded-2xl transition-all cursor-pointer group ${
                    isActive
                      ? 'liquid-pill-primary shadow-lg shadow-black/35 ring-2 ring-white/60'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/10'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? 'text-black font-bold' : 'text-slate-400 group-hover:text-white'
                    }`}
                  />
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-mono font-bold rounded-full ${
                        isActive
                          ? 'bg-black text-white shadow-xs'
                          : 'bg-white/20 text-white shadow-xs'
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
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'liquid-pill-primary shadow-lg shadow-black/25 text-black'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/30 dark:hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-black font-bold' : 'text-slate-400 group-hover:text-white'
                  }`}
                />
                <span className={`truncate ${isActive ? 'text-black font-bold' : ''}`}>
                  {tab.label}
                </span>
              </div>
              {tab.count !== undefined && (
                <span
                  className={`text-[11px] font-mono font-bold tabular-nums px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-black/15 text-black'
                      : 'bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300'
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
        <div className="p-4 mx-3 my-2 rounded-2xl liquid-glass-subtle space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider font-mono">
            <span>UPSTASH SUITE</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span>LIVE</span>
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Cloud className="w-3.5 h-3.5 text-sky-500" />
                <span>Blob 存储</span>
              </span>
              <span
                className={`font-mono text-[11px] font-semibold ${
                  status?.blobType === 'live'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400'
                }`}
              >
                {status?.blobType === 'live' ? '云端就绪' : '本地兼容'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Zap className="w-3.5 h-3.5 text-purple-500" />
                <span>Vector 向量</span>
              </span>
              <span
                className={`font-mono text-[11px] font-semibold ${
                  status?.vectorType === 'live'
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-slate-400'
                }`}
              >
                {status?.vectorType === 'live' ? '云端就绪' : '本地向量'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Activity className="w-3.5 h-3.5 text-amber-500" />
                <span>QStash 队列</span>
              </span>
              <span
                className={`font-mono text-[11px] font-semibold ${
                  status?.qstashType === 'live'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-400'
                }`}
              >
                {status?.qstashType === 'live' ? '云端就绪' : '本地队列'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Layers className="w-3.5 h-3.5 text-emerald-500" />
                <span>Redis 缓存</span>
              </span>
              <span
                className={`font-mono text-[11px] font-semibold ${
                  status?.redisType === 'live'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400'
                }`}
              >
                {status?.redisType === 'live' ? '云端就绪' : '内存缓存'}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-black/5 dark:border-white/10 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>缓存命中率</span>
            <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-bold">
              {status?.cacheStats?.hitRatio || '100.0%'}
            </span>
          </div>
        </div>
      ) : (
        /* 收起状态下的微缩液态指示器 */
        <div
          title="Upstash 服务套件 (Blob/Vector/QStash/Redis) 均正常运行"
          className="mx-3 my-2 p-2.5 rounded-2xl liquid-glass-subtle flex flex-col items-center gap-2 cursor-help"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50 animate-pulse" />
          <div className="flex flex-col gap-1 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" title="Blob" />
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" title="Vector" />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="QStash" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Redis" />
          </div>
        </div>
      )}

      {/* 底部链接与收起/展开快捷按钮 */}
      <div className="mt-auto p-3 border-t border-black/5 dark:border-white/10 space-y-2">
        {!isCollapsed ? (
          <>
            <a
              href="https://console.upstash.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-white transition-colors px-2 py-1.5 rounded-xl hover:bg-white/10"
            >
              <span className="flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-slate-300" />
                <span>Upstash 控制台</span>
              </span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed px-2">
              REST 无状态客户端，专为 Vercel Serverless 高频吞吐优化。
            </div>
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="w-full liquid-pill flex items-center justify-center gap-2 py-2 px-3 text-xs text-slate-300 hover:text-white transition-all cursor-pointer font-semibold"
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
              className="liquid-orb w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white"
            >
              <Server className="w-4 h-4" />
            </a>
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title="展开侧边栏"
                className="liquid-orb w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
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
