'use client';

import React from 'react';
import {
  FolderArchive,
  Sparkles,
  Activity,
  Layers,
  ArrowRight,
  Plus,
  FileText,
  User,
  Server,
  Zap,
  HardDrive,
} from 'lucide-react';
import { DocumentItem, UserSession, SystemStatus, QueueTaskItem } from '@/lib/types';

interface OverviewViewProps {
  session: UserSession | null;
  documents: DocumentItem[];
  tasks: QueueTaskItem[];
  status: SystemStatus | null;
  onSelectTab: (tab: string) => void;
  onSelectDocument: (doc: DocumentItem) => void;
  onOpenUpload: () => void;
  onOpenAvatar: () => void;
  onTriggerSemanticSearch: (query: string) => void;
}

export function OverviewView({
  session,
  documents,
  tasks,
  status,
  onSelectTab,
  onSelectDocument,
  onOpenUpload,
  onOpenAvatar,
  onTriggerSemanticSearch,
}: OverviewViewProps) {
  const recentDocs = documents.slice(0, 4);
  const activeTasks = tasks.filter((t) => t.status === 'processing' || t.status === 'pending');
  const totalSizeBytes = documents.reduce((acc, d) => acc + (d.size || 0), 0);
  const totalSizeKB = (totalSizeBytes / 1024).toFixed(1);
  const quotaPercentage = Math.min(100, Math.round((totalSizeBytes / (50 * 1024 * 1024)) * 100) || 4);

  return (
    <div className="space-y-6">
      {/* iOS 27 液态玻璃主横幅 (融合 Liquid Glass Player & Profile Hero) */}
      <div className="p-6 sm:p-8 rounded-3xl liquid-glass flex flex-col justify-between gap-6 transition-all duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <button
              onClick={onOpenAvatar}
              className="relative w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-emerald-500/60 hover:ring-emerald-400 transition-all bg-emerald-950/30 shrink-0 group cursor-pointer shadow-xl shadow-emerald-500/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={session?.avatarUrl || '/src/assets/images/avatar_alex_morgan_1793673663751.jpg'}
                alt={session?.name || '个人头像'}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-semibold">
                更换头像
              </div>
            </button>

            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {session?.name || 'Alex Morgan'}
                </h2>
                <span className="text-emerald-700 dark:text-emerald-300 text-xs font-semibold px-2.5 py-0.5 rounded-full liquid-glass-subtle font-mono">
                  {session?.role || '系统管理员'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-xl font-normal leading-relaxed">
                Serverless 个人智能空间稳定运行中。Upstash 全栈套件（Blob + Vector + QStash + Redis）协同就绪。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            {/* Live Equalizer Pulse */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-2xl liquid-glass-subtle" title="系统心跳脉冲">
              <div className="sound-wave">
                <i /><i /><i /><i /><i />
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                100% HEALTHY
              </span>
            </div>

            <button
              onClick={onOpenAvatar}
              className="liquid-pill px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
            >
              <User className="w-3.5 h-3.5" />
              <span>资料管理</span>
            </button>
            <button
              onClick={onOpenUpload}
              className="liquid-pill-primary px-4 py-2 text-xs font-bold cursor-pointer flex items-center gap-1.5 whitespace-nowrap shadow-md shadow-black/25 text-black"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>上传新文档</span>
            </button>
          </div>
        </div>

        {/* 存储配额进度滑块 (灵感来自 Demo timeline range slider) */}
        <div className="pt-4 border-t border-black/5 dark:border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-medium">
            <span className="flex items-center gap-2 font-mono">
              <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
              <span>云端存储用量与配额</span>
            </span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
              {totalSizeKB} KB / 50 MB ({quotaPercentage}%)
            </span>
          </div>
          <div className="relative w-full">
            <input
              type="range"
              min="0"
              max="100"
              value={quotaPercentage}
              readOnly
              className="liquid-slider pointer-events-none"
            />
          </div>
        </div>
      </div>

      {/* 5 大核心服务指标卡片 (液态玻璃交互卡片) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Blob 卡片 */}
        <div
          onClick={() => onSelectTab('documents')}
          className="p-5 rounded-3xl liquid-glass-interactive cursor-pointer group space-y-2"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">BLOB 存储</span>
            <div className="w-7 h-7 rounded-full liquid-glass-subtle flex items-center justify-center">
              <FolderArchive className="w-4 h-4 text-sky-500" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {documents.length}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 group-hover:text-sky-500 transition-colors pt-1 font-medium">
            <span>存储与下载中心</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
          </div>
        </div>

        {/* Vector 卡片 */}
        <div
          onClick={() => onSelectTab('search')}
          className="p-5 rounded-3xl liquid-glass-interactive cursor-pointer group space-y-2"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">VECTOR 向量</span>
            <div className="w-7 h-7 rounded-full liquid-glass-subtle flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-500" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400 font-mono tabular-nums">
            {documents.filter((d) => d.status === 'indexed').length} <span className="text-xs font-normal text-slate-500">已索引</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 group-hover:text-purple-400 transition-colors pt-1 font-medium">
            <span>余弦智能检索舱</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
          </div>
        </div>

        {/* QStash 卡片 */}
        <div
          onClick={() => onSelectTab('queue')}
          className="p-5 rounded-3xl liquid-glass-interactive cursor-pointer group space-y-2"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">QSTASH 队列</span>
            <div className="w-7 h-7 rounded-full liquid-glass-subtle flex items-center justify-center">
              <Activity className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {activeTasks.length > 0 ? `${activeTasks.length} 运行中` : '就绪'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 group-hover:text-amber-500 transition-colors pt-1 font-medium">
            <span>异步削峰调度</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
          </div>
        </div>

        {/* Redis 特性卡片 */}
        <div
          onClick={() => onSelectTab('redis')}
          className="p-5 rounded-3xl liquid-glass-interactive cursor-pointer group space-y-2"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">REDIS 空间</span>
            <div className="w-7 h-7 rounded-full liquid-glass-subtle flex items-center justify-center">
              <Server className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {status?.cacheStats?.keysCount || 4} <span className="text-xs font-normal text-slate-500">键</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 group-hover:text-emerald-500 transition-colors pt-1 font-medium">
            <span>原子计数与限流</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
          </div>
        </div>

        {/* 架构诊断卡片 */}
        <div
          onClick={() => onSelectTab('system')}
          className="p-5 rounded-3xl liquid-glass-interactive cursor-pointer group space-y-2 col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">缓存命中</span>
            <div className="w-7 h-7 rounded-full liquid-glass-subtle flex items-center justify-center">
              <Layers className="w-4 h-4 text-teal-500" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-teal-600 dark:text-teal-400 font-mono tabular-nums">
            {status?.cacheStats?.hitRatio || '100.0%'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 group-hover:text-teal-500 transition-colors pt-1 font-medium">
            <span>架构与连接遥测</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </div>

      {/* 快捷语义概念检索体验 (液态搜索胶囊) */}
      <div className="p-6 rounded-3xl liquid-glass space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-purple-500/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-500" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              QUICK SEMANTIC LAB / 快速语义体验
            </h3>
          </div>
          <button
            onClick={() => onSelectTab('search')}
            className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-500 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>进入完整智能检索舱</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2.5 pt-1">
          {[
            'Serverless 无状态架构与冷启动消除',
            '余弦相似度计算与高维向量嵌入',
            'Vercel 部署规范与环境变量清单',
            'QStash 异步解耦与削峰处理',
          ].map((queryText) => (
            <button
              key={queryText}
              onClick={() => onTriggerSemanticSearch(queryText)}
              className="liquid-pill px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-purple-600 dark:hover:text-purple-300 transition-all cursor-pointer text-left"
            >
              &ldquo;{queryText}&rdquo;
            </button>
          ))}
        </div>
      </div>

      {/* 左右分栏：最近文档 与 队列工作流 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 最近文档 (占 2 列) */}
        <div className="lg:col-span-2 p-6 rounded-3xl liquid-glass space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <FolderArchive className="w-4 h-4 text-emerald-500" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">最近存入文档</h3>
            </div>
            <button
              onClick={() => onSelectTab('documents')}
              className="text-xs font-semibold text-slate-500 hover:text-emerald-600 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>查看全部 ({documents.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-black/5 dark:divide-white/10">
            {recentDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onSelectDocument(doc)}
                className="py-3.5 flex items-center justify-between gap-4 cursor-pointer hover:text-emerald-600 group transition-all"
              >
                <div className="flex items-center gap-3.5 truncate">
                  <div className="w-9 h-9 rounded-2xl liquid-glass-subtle flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate">
                      {doc.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {doc.summary}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 font-mono tabular-nums whitespace-nowrap shrink-0">
                  {(doc.size / 1024).toFixed(1)} KB
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 异步队列流 (占 1 列) */}
        <div className="p-6 rounded-3xl liquid-glass space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-amber-500/15 flex items-center justify-center">
                <Activity className="w-4 h-4 text-amber-500" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">队列工作流</h3>
            </div>
            <button
              onClick={() => onSelectTab('queue')}
              className="text-xs font-semibold text-slate-500 hover:text-amber-600 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>队列工作舱</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {tasks.slice(0, 4).map((task) => {
              const statusLabel =
                task.status === 'completed'
                  ? '已完成'
                  : task.status === 'processing'
                  ? '处理中'
                  : task.status === 'pending'
                  ? '排队中'
                  : '失败';

              return (
                <div
                  key={task.id}
                  className="p-3.5 rounded-2xl liquid-glass-subtle text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                      {task.docName || task.id}
                    </span>
                    <span
                      className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        task.status === 'completed'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : task.status === 'processing'
                          ? 'bg-amber-500/15 text-amber-500 animate-pulse'
                          : 'bg-black/5 dark:bg-white/10 text-slate-400'
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
                    <span>{task.taskType}</span>
                    <span className="tabular-nums">
                      {task.durationMs !== undefined ? `${task.durationMs}ms` : '执行中...'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
