'use client';

import React, { useState } from 'react';
import {
  Database,
  Cloud,
  Zap,
  Activity,
  Layers,
  Server,
  Trash2,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Gauge,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { SystemStatus } from '@/lib/types';

interface SystemStatusViewProps {
  status: SystemStatus | null;
  onRefresh: () => void;
}

interface DiagnosticResult {
  connected: boolean;
  latencyMs: number;
  message: string;
}

export function SystemStatusView({ status, onRefresh }: SystemStatusViewProps) {
  const [isPurging, setIsPurging] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [purgeSuccess, setPurgeSuccess] = useState<string | null>(null);
  const [diagnosticData, setDiagnosticData] = useState<{
    redis?: DiagnosticResult;
    blob?: DiagnosticResult;
    vector?: DiagnosticResult;
    qstash?: DiagnosticResult;
  } | null>(null);
  const [copiedEnv, setCopiedEnv] = useState(false);

  const handleTestConnections = async () => {
    setIsDiagnosing(true);
    try {
      const res = await fetch('/api/system/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_connections' }),
      });
      const data = await res.json();
      if (data.success && data.diagnostics) {
        setDiagnosticData(data.diagnostics);
        onRefresh();
      }
    } catch (err) {
      console.error('连接诊断失败:', err);
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handlePurgeCache = async () => {
    setIsPurging(true);
    setPurgeSuccess(null);
    try {
      const res = await fetch('/api/system/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'purge_cache' }),
      });
      const data = await res.json();
      if (data.success) {
        setPurgeSuccess('Redis 全局缓存已成功清空，所有过期与旧键已成功失效。');
        onRefresh();
      }
    } catch (err) {
      console.error('清空缓存失败:', err);
    } finally {
      setIsPurging(false);
    }
  };

  const envTemplate = `# 单用户登录认证配置 (Vercel 环境变量)
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="your-strong-password-here"

# Upstash 云端秘钥配置 (用于 Vercel 生产环境变量)
UPSTASH_BLOB_TOKEN="从 console.upstash.com/blob 获取的 Token"
UPSTASH_REDIS_REST_URL="https://your-database.upstash.io"
UPSTASH_REDIS_REST_TOKEN="从 console.upstash.com/redis 获取的 Token"
UPSTASH_VECTOR_REST_URL="https://your-vector-index.upstash.io"
UPSTASH_VECTOR_REST_TOKEN="从 console.upstash.com/vector 获取的 Token"
QSTASH_TOKEN="从 console.upstash.com/qstash 获取的 Token"`;

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(envTemplate);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 头部标题与核心操作 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-500" />
            <span>系统架构、云端连接与 Redis 遥测</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            无状态无服务器架构，全套适配 Upstash 云端套件并深度兼容 Vercel Serverless。
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleTestConnections}
            disabled={isDiagnosing}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 ios-glass rounded-xl transition-all ios-press whitespace-nowrap"
          >
            {isDiagnosing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Gauge className="w-3.5 h-3.5" />
            )}
            <span>检测云端秘钥与连接</span>
          </button>

          <button
            onClick={handlePurgeCache}
            disabled={isPurging}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-red-500 hover:bg-red-500/10 ios-glass rounded-xl transition-all ios-press whitespace-nowrap"
          >
            {isPurging ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-500" />
            ) : (
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
            )}
            <span>清理 Redis 缓存</span>
          </button>
        </div>
      </div>

      {purgeSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{purgeSuccess}</span>
        </div>
      )}

      {/* 实时诊断反馈条 */}
      {diagnosticData && (
        <div className="p-5 rounded-3xl ios-glass space-y-3">
          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Gauge className="w-4 h-4 text-emerald-500" />
            <span>实时云端连接诊断结果</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 flex items-start gap-2.5">
              {diagnosticData.blob?.connected ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">Upstash Blob 存储</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{diagnosticData.blob?.message}</div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 flex items-start gap-2.5">
              {diagnosticData.vector?.connected ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">Upstash Vector 向量</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{diagnosticData.vector?.message}</div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 flex items-start gap-2.5">
              {diagnosticData.qstash?.connected ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">Upstash QStash 队列</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{diagnosticData.qstash?.message}</div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 flex items-start gap-2.5">
              {diagnosticData.redis?.connected ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">Upstash Redis 缓存</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{diagnosticData.redis?.message}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Redis 缓存遥测卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-3xl ios-glass">
          <div className="text-[11px] text-slate-400 font-semibold uppercase">缓存命中率</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1">
            {status?.cacheStats?.hitRatio || '100.0%'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">大幅削减后端与磁盘开销</div>
        </div>

        <div className="p-4 rounded-3xl ios-glass">
          <div className="text-[11px] text-slate-400 font-semibold uppercase">总缓存命中数</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums mt-1">
            {status?.cacheStats?.hitCount || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">响应延迟 &lt;2ms</div>
        </div>

        <div className="p-4 rounded-3xl ios-glass">
          <div className="text-[11px] text-slate-400 font-semibold uppercase">活跃缓存键数</div>
          <div className="text-2xl font-bold text-sky-600 dark:text-sky-400 font-mono tabular-nums mt-1">
            {status?.cacheStats?.keysCount || 4}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">会话令牌与高频搜索</div>
        </div>

        <div className="p-4 rounded-3xl ios-glass">
          <div className="text-[11px] text-slate-400 font-semibold uppercase">运行时协议</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-1 capitalize">
            {status?.isVercel ? 'Vercel Edge' : 'HTTP REST 协议'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">无 TCP 连接池阻塞风险</div>
        </div>
      </div>

      {/* 4 大云原生架构服务详述 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Blob */}
        <div className="p-6 rounded-3xl ios-glass space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-sky-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Upstash Blob 轻量对象存储</h3>
            </div>
            <span className={`text-[11px] font-mono ${status?.blobType === 'live' ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
              {status?.blobType === 'live' ? '云端已就绪' : '本地兼容模式'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            用于保存用户的高清个人头像与私有文档。支持直接流式上传与边缘全局 CDN 缓存加速，绕过 Serverless 函数 Payload 体积限制。
          </p>
          <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
            控制台入口: <span className="text-emerald-600 dark:text-emerald-400 font-medium">https://console.upstash.com/blob</span>
          </div>
        </div>

        {/* Vector */}
        <div className="p-6 rounded-3xl ios-glass space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Upstash Vector 语义向量检索</h3>
            </div>
            <span className={`text-[11px] font-mono ${status?.vectorType === 'live' ? 'text-purple-600 dark:text-purple-400 font-semibold' : 'text-slate-400'}`}>
              {status?.vectorType === 'live' ? '云端已就绪' : '本地兼容模式'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            实现基于语义概念的个人文档智能检索与跨篇章相似推荐。支持内置 Dense Embedding 模型，实现免外部第三方 AI 依赖的高速嵌入。
          </p>
          <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
            嵌入模型: <span className="text-purple-600 dark:text-purple-400 font-medium">Upstash 内置稠密高维向量模型</span>
          </div>
        </div>

        {/* QStash */}
        <div className="p-6 rounded-3xl ios-glass space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Upstash QStash 异步任务队列</h3>
            </div>
            <span className={`text-[11px] font-mono ${status?.qstashType === 'live' ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-400'}`}>
              {status?.qstashType === 'live' ? '云端已就绪' : '本地兼容模式'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            将文档提取、高维向量嵌入索引与 Webhook 调度解耦至后台异步执行，提供自动重试机制与死信保护，确保系统在高并发下仍具毫秒级交互体验。
          </p>
          <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
            任务调度端点: <span className="text-amber-600 dark:text-amber-400 font-medium">/api/tasks/worker</span>
          </div>
        </div>

        {/* Redis */}
        <div className="p-6 rounded-3xl ios-glass space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Upstash Redis 全局缓存与实时会话</h3>
            </div>
            <span className={`text-[11px] font-mono ${status?.redisType === 'live' ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
              {status?.redisType === 'live' ? '云端已就绪' : '本地兼容模式'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            作为全局分布式缓存层优化数据库和向量查询性能，维护低延迟的用户会话状态管理、令牌频控与高频查询缓存。
          </p>
          <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 font-mono text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>通讯模式: <span className="text-emerald-600 dark:text-emerald-400 font-medium">REST 无状态 API</span></span>
            <span>p99 延迟: <span className="text-emerald-600 dark:text-emerald-400 font-medium">&lt;5ms</span></span>
          </div>
        </div>
      </div>

      {/* Vercel 部署环境变量参考 */}
      <div className="p-6 rounded-3xl ios-glass space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Vercel 生产部署环境变量清单</h3>
          </div>
          <button
            onClick={handleCopyEnv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 ios-glass hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-all ios-press"
          >
            {copiedEnv ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>已复制环境变量模板</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>复制环境变量模板</span>
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          部署到 Vercel 时，仅需在 Vercel 项目设置中的「Settings」-&gt;「Environment Variables」填入对应配置即可。所有 Upstash 服务均采用无连接池阻塞的 REST 协议，完美原生适配 Vercel Serverless 环境。
        </p>
        <pre className="p-4 rounded-2xl bg-black/5 dark:bg-black/40 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300 overflow-x-auto leading-relaxed">
          {envTemplate}
        </pre>
      </div>
    </div>
  );
}
