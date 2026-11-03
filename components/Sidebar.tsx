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
} from 'lucide-react';
import { SystemStatus } from '@/lib/types';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  status: SystemStatus | null;
  docsCount: number;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  status,
  docsCount,
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
    <aside className="w-64 ios-glass border-r border-slate-200/80 dark:border-white/10 flex flex-col shrink-0 min-h-[calc(100vh-57px)] transition-colors">
      {/* 工作区菜单 */}
      <div className="p-4 space-y-1">
        <div className="text-[11px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase px-3 py-1.5">
          工作空间导航
        </div>
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-all ios-press ${
                isActive
                  ? 'bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
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
      <div className="p-4 mx-4 my-2 rounded-2xl ios-glass border border-slate-200/80 dark:border-white/10 space-y-3 shadow-xs">
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
            <span className={`font-mono text-[11px] ${status?.blobType === 'live' ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
              {status?.blobType === 'live' ? '云端就绪' : '本地兼容'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <Zap className="w-3.5 h-3.5 text-purple-500" />
              <span>Vector 向量</span>
            </span>
            <span className={`font-mono text-[11px] ${status?.vectorType === 'live' ? 'text-purple-600 dark:text-purple-400 font-semibold' : 'text-slate-400'}`}>
              {status?.vectorType === 'live' ? '云端就绪' : '本地向量'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <Activity className="w-3.5 h-3.5 text-amber-500" />
              <span>QStash 队列</span>
            </span>
            <span className={`font-mono text-[11px] ${status?.qstashType === 'live' ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-400'}`}>
              {status?.qstashType === 'live' ? '云端就绪' : '本地队列'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <Layers className="w-3.5 h-3.5 text-emerald-500" />
              <span>Redis 缓存</span>
            </span>
            <span className={`font-mono text-[11px] ${status?.redisType === 'live' ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
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

      {/* 底部链接 */}
      <div className="mt-auto p-4 border-t border-slate-200/80 dark:border-white/10 space-y-2">
        <a
          href="https://console.upstash.com/blob"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5" />
            <span>Upstash 控制台</span>
          </span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
        <div className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
          采用无状态 REST 客户端设计，专为 Vercel Serverless 优化。
        </div>
      </div>
    </aside>
  );
}
