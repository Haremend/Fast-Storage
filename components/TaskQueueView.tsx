'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  RefreshCw,
  CheckCircle2,
  Clock,
  RotateCcw,
  Trash2,
  Zap,
  Play,
  Layers,
  Rocket,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { QueueTaskItem } from '@/lib/types';

export function TaskQueueView() {
  const [tasks, setTasks] = useState<QueueTaskItem[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    isLive: false,
  });
  const [autoPoll, setAutoPoll] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBatchRunning, setIsBatchRunning] = useState(false);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks);
        setStats(data.stats);
      }
    } catch (err) {
      console.error('获取任务失败:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let isSubscribed = true;

    const poll = async () => {
      try {
        const res = await fetch('/api/tasks');
        const data = await res.json();
        if (isSubscribed && data.success) {
          setTasks(data.tasks);
          setStats(data.stats);
        }
      } catch (err) {
        console.error('轮询队列任务失败:', err);
      }
    };

    poll();

    if (!autoPoll) return;
    const interval = setInterval(poll, 3000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [autoPoll]);

  const handleRetry = async (taskId: string) => {
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry', taskId }),
      });
      fetchTasks();
    } catch (err) {
      console.error('重试失败:', err);
    }
  };

  const handleClearCompleted = async () => {
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_completed' }),
      });
      fetchTasks();
    } catch (err) {
      console.error('清理完成任务失败:', err);
    }
  };

  // 演示用例：单项触发
  const handleTriggerSingleJob = async () => {
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enqueue_custom',
          taskType: 'generate_summary',
          docName: 'Vercel-冷启动基准测试报告.md',
        }),
      });
      fetchTasks();
    } catch (err) {
      console.error('触发异步任务失败:', err);
    }
  };

  // 演示用例：高并发批量压测发射 5 个任务
  const handleTriggerBatchConcurrency = async () => {
    setIsBatchRunning(true);
    const demoBatchFiles = [
      '微服务解耦设计白皮书.pdf',
      '分布式事务二阶段提交实战.md',
      '高并发高可用流量调度策略.docx',
      '边缘节点容灾方案说明.txt',
      'Serverless无服务成本测算表.xlsx',
    ];

    try {
      for (const fileName of demoBatchFiles) {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'enqueue_custom',
            taskType: 'extract_and_embed',
            docName: fileName,
          }),
        });
      }
      fetchTasks();
    } catch (err) {
      console.error('批量发射任务失败:', err);
    } finally {
      setIsBatchRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 头部标题与操作 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl liquid-glass-subtle flex items-center justify-center">
              <Activity className="w-4 h-4 text-amber-500" />
            </div>
            <span>QStash 异步任务队列与削峰调度</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
            通过 Serverless 消息队列将繁重的文档处理与向量嵌入移出主线程，确保用户上传与交互秒级极速响应。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setAutoPoll(!autoPoll)}
            className={`liquid-pill px-3.5 py-2 text-xs font-semibold cursor-pointer flex items-center gap-2 ${
              autoPoll ? 'border-amber-500/40 text-amber-600 dark:text-amber-400' : 'text-slate-500'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                autoPoll ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <span>自动轮询 (3秒)</span>
          </button>

          <button
            onClick={() => {
              setIsRefreshing(true);
              fetchTasks();
            }}
            disabled={isRefreshing}
            className="liquid-orb w-8 h-8 text-slate-600 dark:text-slate-300 hover:text-amber-500 cursor-pointer"
            title="手动刷新"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleTriggerSingleJob}
            className="liquid-pill px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5 fill-current text-amber-500" />
            <span>单项触发</span>
          </button>

          <button
            onClick={handleTriggerBatchConcurrency}
            disabled={isBatchRunning}
            className="liquid-pill px-4 py-2 text-xs font-semibold text-white cursor-pointer flex items-center gap-1.5 whitespace-nowrap shadow-md shadow-amber-500/20"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>{isBatchRunning ? '发射中...' : '并发压测 (5任务)'}</span>
          </button>
        </div>
      </div>

      {/* QStash 异步工作流原理解释卡片 */}
      <div className="p-6 rounded-3xl liquid-glass border border-amber-500/30 shadow-md space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
          <ShieldCheck className="w-4 h-4 text-amber-500" />
          <span>为什么要使用 QStash 异步队列？（高并发与 Serverless 保护）</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl liquid-glass-subtle space-y-1.5">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span>1. 极速前端响应 (&lt;100ms)</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-300 leading-relaxed">
              文件上传后立即返回成功，避免用户在浏览器端长时间等待向量计算与文档解析。
            </p>
          </div>

          <div className="p-4 rounded-2xl liquid-glass-subtle space-y-1.5">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>2. 削峰防击穿与超时保护</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-300 leading-relaxed">
              Vercel 函数默认有 10-15s 超时限制。QStash 充当蓄水池平滑消费，避免同时触发大量昂贵 API 导致崩溃。
            </p>
          </div>

          <div className="p-4 rounded-2xl liquid-glass-subtle space-y-1.5">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-sky-500" />
              <span>3. 失败指数退避自动重试</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-300 leading-relaxed">
              若因第三方网络波动失败，QStash 会自动按梯度延迟（指数退避）重试，彻底杜绝数据丢失。
            </p>
          </div>
        </div>
      </div>

      {/* 5 项核心指标条 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="p-5 rounded-3xl liquid-glass-interactive">
          <div className="text-[11px] text-slate-400 font-bold uppercase font-mono">队列总任务</div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-mono tabular-nums mt-1">{stats.total}</div>
        </div>
        <div className="p-5 rounded-3xl liquid-glass-interactive">
          <div className="text-[11px] text-amber-500 font-bold uppercase font-mono">正在处理</div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-500 font-mono tabular-nums mt-1">{stats.processing}</div>
        </div>
        <div className="p-5 rounded-3xl liquid-glass-interactive">
          <div className="text-[11px] text-sky-500 font-bold uppercase font-mono">排队等待</div>
          <div className="text-2xl sm:text-3xl font-bold text-sky-500 font-mono tabular-nums mt-1">{stats.pending}</div>
        </div>
        <div className="p-5 rounded-3xl liquid-glass-interactive">
          <div className="text-[11px] text-emerald-500 font-bold uppercase font-mono">成功完成</div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-500 font-mono tabular-nums mt-1">{stats.completed}</div>
        </div>
        <div className="p-5 rounded-3xl liquid-glass-interactive">
          <div className="text-[11px] text-rose-500 font-bold uppercase font-mono">异常失败</div>
          <div className="text-2xl sm:text-3xl font-bold text-rose-500 font-mono tabular-nums mt-1">{stats.failed}</div>
        </div>
      </div>

      {/* 任务流水表 */}
      <div className="rounded-3xl liquid-glass overflow-hidden shadow-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/10">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 font-mono">
            <Layers className="w-4 h-4 text-amber-500" />
            <span>QSTASH PIPELINE STREAM / 异步调度任务流</span>
          </div>

          {stats.completed > 0 && (
            <button
              onClick={handleClearCompleted}
              className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>清理已完成</span>
            </button>
          )}
        </div>

        {tasks.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            当前队列为空。点击上方&ldquo;并发压测 (5任务)&rdquo;按钮可观察任务批量推入、排队与执行的实时动画过程。
          </div>
        ) : (
          <div className="divide-y divide-black/5 dark:divide-white/10">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="grid grid-cols-12 items-center px-6 py-4 text-xs hover:bg-white/40 dark:hover:bg-white/5 transition-colors"
              >
                {/* 状态与名称 */}
                <div className="col-span-5 sm:col-span-4 flex items-center gap-3.5 truncate">
                  {task.status === 'completed' && (
                    <div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                  )}
                  {task.status === 'processing' && (
                    <div className="w-7 h-7 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                      <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
                    </div>
                  )}
                  {task.status === 'pending' && (
                    <div className="w-7 h-7 rounded-full bg-sky-500/15 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-sky-500" />
                    </div>
                  )}
                  {task.status === 'failed' && (
                    <div className="w-7 h-7 rounded-full bg-rose-500/15 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4 text-rose-500" />
                    </div>
                  )}
                  <div className="truncate">
                    <div className="font-bold text-slate-900 dark:text-white truncate">
                      {task.docName || task.id}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono truncate">
                      {task.id}
                    </div>
                  </div>
                </div>

                {/* 任务类型 */}
                <div className="hidden sm:block sm:col-span-3 text-[11px] font-mono text-slate-500 dark:text-slate-300">
                  {task.taskType === 'extract_and_embed'
                    ? '向量提取与索引'
                    : task.taskType === 'generate_summary'
                    ? '智能摘要生成'
                    : task.taskType === 'avatar_sync'
                    ? '头像 CDN 同步'
                    : '缓存主动清理'}
                </div>

                {/* 耗时 */}
                <div className="col-span-4 sm:col-span-3 text-slate-500 font-mono text-[11px] tabular-nums">
                  {task.durationMs !== undefined ? `${task.durationMs}ms` : '执行中...'}
                </div>

                {/* 操作 */}
                <div className="col-span-3 sm:col-span-2 text-right">
                  {task.status === 'failed' && (
                    <button
                      onClick={() => handleRetry(task.id)}
                      className="liquid-pill px-3 py-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 cursor-pointer inline-flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>重试</span>
                    </button>
                  )}
                  {task.status === 'completed' && (
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">200 OK</span>
                  )}
                  {task.status === 'processing' && (
                    <span className="text-[11px] font-mono text-amber-500 font-bold">处理中</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
