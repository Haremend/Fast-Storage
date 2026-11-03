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

  return (
    <div className="space-y-6">
      {/* iOS 风格主横幅 */}
      <div className="p-6 sm:p-7 rounded-3xl ios-glass border border-white/70 dark:border-white/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all">
        <div className="flex items-center gap-4">
          <button
            onClick={onOpenAvatar}
            className="w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-emerald-500/40 hover:ring-emerald-400 transition-all bg-slate-200 dark:bg-slate-800 shrink-0 group relative shadow-md"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={session?.avatarUrl || '/src/assets/images/avatar_alex_morgan_1793673663751.jpg'}
              alt={session?.name || '个人头像'}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-semibold">
              换头像
            </div>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                欢迎回来，{session?.name || 'Alex Morgan'}
              </h2>
              <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10">
                {session?.role || '系统管理员'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
              您的轻量级无服务器云端空间正常运行中。基于 Upstash Blob、Vector、QStash 与 Redis 全栈协同。
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenAvatar}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap ios-glass"
          >
            <User className="w-3.5 h-3.5" />
            <span>个人资料</span>
          </button>
          <button
            onClick={onOpenUpload}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>上传新文档</span>
          </button>
        </div>
      </div>

      {/* 5 大核心服务指标卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Blob 卡片 */}
        <div
          onClick={() => onSelectTab('documents')}
          className="p-5 rounded-3xl ios-glass-interactive cursor-pointer group space-y-1"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase">云端文档 (Blob)</span>
            <FolderArchive className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {documents.length}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 group-hover:text-sky-500 transition-colors pt-1">
            <span>存储与下载中心</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Vector 卡片 */}
        <div
          onClick={() => onSelectTab('search')}
          className="p-5 rounded-3xl ios-glass-interactive cursor-pointer group space-y-1"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase">语义检索 (Vector)</span>
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 font-mono tabular-nums">
            {documents.filter((d) => d.status === 'indexed').length} 篇已索引
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 group-hover:text-purple-400 transition-colors pt-1">
            <span>对比字面检索舱</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* QStash 卡片 */}
        <div
          onClick={() => onSelectTab('queue')}
          className="p-5 rounded-3xl ios-glass-interactive cursor-pointer group space-y-1"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase">异步队列 (QStash)</span>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {activeTasks.length > 0 ? `${activeTasks.length} 运行中` : '就绪待命'}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 group-hover:text-amber-500 transition-colors pt-1">
            <span>并发注入压测</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Redis 特性卡片 */}
        <div
          onClick={() => onSelectTab('redis')}
          className="p-5 rounded-3xl ios-glass-interactive cursor-pointer group space-y-1"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase">Redis 键空间</span>
            <Server className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {status?.cacheStats?.keysCount || 4} 项键值
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 group-hover:text-emerald-500 transition-colors pt-1">
            <span>CRUD 浏览器与用例</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* 架构诊断卡片 */}
        <div
          onClick={() => onSelectTab('system')}
          className="p-5 rounded-3xl ios-glass-interactive cursor-pointer group space-y-1 col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase">缓存命中率</span>
            <Layers className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-bold text-teal-600 dark:text-teal-400 font-mono tabular-nums">
            {status?.cacheStats?.hitRatio || '100.0%'}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 group-hover:text-teal-500 transition-colors pt-1">
            <span>架构与连接遥测</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* 快捷语义检索入口 */}
      <div className="p-6 rounded-3xl ios-glass space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              快速语义概念检索体验
            </h3>
          </div>
          <button
            onClick={() => onSelectTab('search')}
            className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-500 font-medium flex items-center gap-1"
          >
            <span>进入完整智能检索舱</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            'Serverless 无状态架构与冷启动消除',
            '余弦相似度计算与高维向量嵌入',
            'Vercel 部署规范与环境变量清单',
            'QStash 异步解耦与削峰处理',
          ].map((queryText) => (
            <button
              key={queryText}
              onClick={() => onTriggerSemanticSearch(queryText)}
              className="px-3.5 py-2 text-xs text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-300 bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl transition-all ios-press text-left"
            >
              &ldquo;{queryText}&rdquo;
            </button>
          ))}
        </div>
      </div>

      {/* 左右分栏：最近文档 与 队列工作流 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 最近文档 (占 2 列) */}
        <div className="lg:col-span-2 p-6 rounded-3xl ios-glass space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderArchive className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">最近存入文档</h3>
            </div>
            <button
              onClick={() => onSelectTab('documents')}
              className="text-xs text-slate-500 hover:text-emerald-600 transition-colors flex items-center gap-1"
            >
              <span>查看全部 ({documents.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-black/5 dark:divide-white/5">
            {recentDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onSelectDocument(doc)}
                className="py-3 flex items-center justify-between gap-4 cursor-pointer hover:text-emerald-600 group transition-colors"
              >
                <div className="flex items-center gap-3 truncate">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 truncate">
                      {doc.name}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
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
        <div className="p-6 rounded-3xl ios-glass space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">队列工作流</h3>
            </div>
            <button
              onClick={() => onSelectTab('queue')}
              className="text-xs text-slate-500 hover:text-amber-600 transition-colors flex items-center gap-1"
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
                  className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/60 dark:border-white/5 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                      {task.docName || task.id}
                    </span>
                    <span
                      className={`font-mono text-[10px] uppercase font-semibold ${
                        task.status === 'completed'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : task.status === 'processing'
                          ? 'text-amber-500 animate-pulse'
                          : 'text-slate-400'
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
