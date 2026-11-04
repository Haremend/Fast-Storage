'use client';

import React, { useState, useEffect } from 'react';
import {
  Server,
  KeyRound,
  Trash2,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Sliders,
  TrendingUp,
  Clock,
  Layers,
  Edit,
  X,
  Gauge,
  Flame,
} from 'lucide-react';
import { RedisKeyItem } from '@/lib/types';

export function RedisStudioView() {
  const [keys, setKeys] = useState<RedisKeyItem[]>([]);
  const [info, setInfo] = useState<{
    usedMemory?: string;
    totalKeys?: number;
    uptime?: string;
    serverType?: string;
  }>({});
  const [searchPattern, setSearchPattern] = useState('*');
  const [isLoading, setIsLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);

  // New/Edit Key Modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editKey, setEditKey] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editTtl, setEditTtl] = useState('3600');
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Demo 1: Rate Limiter state
  const [rlRemaining, setRlRemaining] = useState<number | null>(null);
  const [rlLimit, setRlLimit] = useState(5);
  const [rlResetSeconds, setRlResetSeconds] = useState(0);
  const [rlMsg, setRlMsg] = useState<string | null>(null);
  const [rlBlocked, setRlBlocked] = useState(false);

  // Demo 2: Atomic Counter state
  const [atomicCounter, setAtomicCounter] = useState(1042);
  const [counterLoading, setCounterLoading] = useState(false);

  // Demo 3: TTL Cache Demo state
  const [ttlKeyName, setTtlKeyName] = useState('temp:token:884');
  const [ttlDuration, setTtlDuration] = useState('15');
  const [ttlMsg, setTtlMsg] = useState<string | null>(null);

  const fetchKeys = async (pattern = '*') => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/redis/keys?pattern=${encodeURIComponent(pattern)}`);
      const data = await res.json();
      if (data.success) {
        setKeys(data.keys || []);
        setInfo(data.info || {});
        setIsLive(data.isLive || false);
      }
    } catch (err) {
      console.error('获取 Redis 键列表失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isSubscribed = true;
    const load = async () => {
      try {
        const res = await fetch('/api/redis/keys?pattern=*');
        const data = await res.json();
        if (isSubscribed && data.success) {
          setKeys(data.keys || []);
          setInfo(data.info || {});
          setIsLive(data.isLive || false);
        }
      } catch (err) {
        console.error('初始化 Redis 数据失败:', err);
      }
    };
    load();
    return () => {
      isSubscribed = false;
    };
  }, []);

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editKey.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/redis/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: editKey.trim(),
          value: editValue,
          ttl: editTtl ? parseInt(editTtl, 10) : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMsg(`键 "${editKey}" 已成功保存`);
        setIsEditOpen(false);
        fetchKeys(searchPattern);
        setTimeout(() => setFeedbackMsg(null), 3000);
      }
    } catch (err) {
      console.error('保存键值失败:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteKey = async (key: string) => {
    if (!confirm(`确定从 Redis 中永久删除键 "${key}" 吗？`)) return;
    try {
      const res = await fetch(`/api/redis/keys?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMsg(`键 "${key}" 已删除`);
        fetchKeys(searchPattern);
        setTimeout(() => setFeedbackMsg(null), 3000);
      }
    } catch (err) {
      console.error('删除键失败:', err);
    }
  };

  // Demo 1: Rate Limiter Trigger
  const handleTestRateLimit = async () => {
    try {
      const res = await fetch('/api/redis/demos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_ratelimit',
          clientId: 'user_browser_demo',
          limit: 5,
          windowSeconds: 10,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRlRemaining(data.remaining);
        setRlLimit(data.limit);
        setRlResetSeconds(data.resetInSeconds);
        setRlMsg(data.message);
        setRlBlocked(!data.success);
      } else {
        setRlRemaining(0);
        setRlResetSeconds(data.resetInSeconds || 10);
        setRlMsg(data.message);
        setRlBlocked(true);
      }
    } catch (err) {
      console.error('限流测试失败:', err);
    }
  };

  // Demo 2: Increment Atomic Counter
  const handleIncrementCounter = async () => {
    setCounterLoading(true);
    try {
      const res = await fetch('/api/redis/demos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'increment_counter' }),
      });
      const data = await res.json();
      if (data.success && data.value) {
        setAtomicCounter(data.value);
        fetchKeys(searchPattern);
      }
    } catch (err) {
      console.error('累加计数器失败:', err);
    } finally {
      setCounterLoading(false);
    }
  };

  // Demo 3: TTL Ephemeral Cache
  const handleSetTtlCache = async () => {
    try {
      const res = await fetch('/api/redis/demos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_ttl_cache',
          key: ttlKeyName,
          value: '这是一段经过 Redis 临时倒计时的安全令牌数据',
          ttl: parseInt(ttlDuration, 10),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTtlMsg(`临时键 "${ttlKeyName}" 写入成功，剩余 ${ttlDuration} 秒自动消除`);
        fetchKeys(searchPattern);
        setTimeout(() => setTtlMsg(null), 4000);
      }
    } catch (err) {
      console.error('设置临时缓存失败:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* 头部标题与核心指标 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl liquid-glass-subtle flex items-center justify-center">
              <Server className="w-4 h-4 text-emerald-500" />
            </div>
            <span>Redis 键值空间与经典特性实验舱</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
            支持完整的 Redis 键值增删改查浏览，并提供高并发原子计数器与分布式 API 频控限制器交互演示。
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchKeys(searchPattern)}
            disabled={isLoading}
            className="liquid-pill flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>刷新键列表</span>
          </button>

          <button
            onClick={() => {
              setEditKey('');
              setEditValue('');
              setEditTtl('3600');
              setIsEditOpen(true);
            }}
            className="liquid-pill-primary flex items-center gap-1.5 px-4 py-2 text-xs font-bold shadow-md shadow-black/25 cursor-pointer whitespace-nowrap text-black"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>新增 Redis 键</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3.5 rounded-2xl liquid-glass border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Redis 实例遥测卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-5 rounded-3xl liquid-glass-interactive">
          <div className="text-[11px] text-slate-400 font-bold uppercase font-mono">实例环境</div>
          <div className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">
            {isLive ? 'Upstash Redis 云端' : '本地内存极速缓存'}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono font-semibold">
            {isLive ? '生产 REST 协议' : '开发模拟引擎'}
          </div>
        </div>

        <div className="p-5 rounded-3xl liquid-glass-interactive">
          <div className="text-[11px] text-slate-400 font-bold uppercase font-mono">总键值数量</div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-mono tabular-nums mt-1">
            {keys.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">活跃存储项</div>
        </div>

        <div className="p-5 rounded-3xl liquid-glass-interactive">
          <div className="text-[11px] text-slate-400 font-bold uppercase font-mono">预估内存占用</div>
          <div className="text-2xl sm:text-3xl font-bold text-sky-600 dark:text-sky-400 font-mono tabular-nums mt-1">
            {info.usedMemory || '1.42 MB'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">极轻量内存开销</div>
        </div>

        <div className="p-5 rounded-3xl liquid-glass-interactive">
          <div className="text-[11px] text-slate-400 font-bold uppercase font-mono">服务可用性</div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1">
            99.99%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">全球多区冗余</div>
        </div>
      </div>

      {/* 模块 A：Redis 经典特性交互实验舱 (Classic Demos) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
          <Gauge className="w-4 h-4 text-emerald-500" />
          <span>REDIS FEATURE LAB / 核心特性交互实验舱</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 实验 1: 分布式滑动窗口频控 (Rate Limiter) */}
          <div className="p-6 rounded-3xl liquid-glass space-y-3.5 border border-emerald-500/30 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <Sliders className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <span>1. 分布式 API 频控保护</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full font-bold">
                5次/10秒
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-300 leading-relaxed">
              利用 Redis 原子递增与 TTL 机制，防护接口恶意刷量，防止服务器被爬虫压垮。
            </p>

            <div className="p-3.5 rounded-2xl liquid-glass-subtle space-y-1.5 text-xs">
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-500">剩余请求额度:</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                  {rlRemaining !== null ? `${rlRemaining} / ${rlLimit}` : '就绪'}
                </span>
              </div>
              {rlMsg && (
                <div
                  className={`text-[11px] font-bold ${
                    rlBlocked ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {rlMsg}
                </div>
              )}
            </div>

            <button
              onClick={handleTestRateLimit}
              className="w-full liquid-pill-primary py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20"
            >
              <Flame className="w-4 h-4" />
              <span>快速模拟 API 连续请求</span>
            </button>
          </div>

          {/* 实验 2: 全局高并发原子计数器 (Atomic Counter) */}
          <div className="p-6 rounded-3xl liquid-glass space-y-3.5 border border-sky-500/30 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-sky-500/15 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-sky-500" />
                </div>
                <span>2. 全局分布式原子累加器</span>
              </span>
              <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400 bg-sky-500/15 px-2.5 py-0.5 rounded-full font-bold">
                Redis INCR
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-300 leading-relaxed">
              多 Serverless 实例并发读写时无惧竞争条件，保证统计数字绝对精准。
            </p>

            <div className="p-3.5 rounded-2xl liquid-glass-subtle flex items-center justify-between">
              <span className="text-xs text-slate-500">全局访问计数:</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-sky-600 dark:text-sky-400">
                {atomicCounter}
              </span>
            </div>

            <button
              onClick={handleIncrementCounter}
              disabled={counterLoading}
              className="w-full liquid-pill py-2.5 px-4 text-xs font-bold text-sky-600 dark:text-sky-300 border-sky-500/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>原子 +1 (Atomic INCR)</span>
            </button>
          </div>

          {/* 实验 3: 临时缓存与 TTL 自动驱逐 (TTL Ephemeral Cache) */}
          <div className="p-6 rounded-3xl liquid-glass space-y-3.5 border border-purple-500/30 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-purple-500/15 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-purple-500" />
                </div>
                <span>3. 临时缓存与 TTL 倒计时</span>
              </span>
              <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 bg-purple-500/15 px-2.5 py-0.5 rounded-full font-bold">
                TTL Expire
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-300 leading-relaxed">
              设置短期敏感数据（短信验证码、防重复令牌），时间一到自动从内存彻底抹除。
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={ttlKeyName}
                onChange={(e) => setTtlKeyName(e.target.value)}
                className="flex-1 px-3 py-2 liquid-input rounded-xl text-xs font-mono"
              />
              <select
                value={ttlDuration}
                onChange={(e) => setTtlDuration(e.target.value)}
                className="px-3 py-2 liquid-input rounded-xl text-xs font-mono"
              >
                <option value="15">15 秒</option>
                <option value="30">30 秒</option>
                <option value="60">60 秒</option>
              </select>
            </div>

            {ttlMsg && <div className="text-[11px] text-purple-600 dark:text-purple-400 font-bold">{ttlMsg}</div>}

            <button
              onClick={handleSetTtlCache}
              className="w-full liquid-pill py-2.5 px-4 text-xs font-bold text-purple-600 dark:text-purple-300 border-purple-500/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Clock className="w-4 h-4" />
              <span>写入并开启倒计时</span>
            </button>
          </div>
        </div>
      </div>

      {/* 模块 B: Redis 键值空间浏览器 (Key-Value Browser) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
            <KeyRound className="w-4 h-4 text-emerald-500" />
            <span>KEY-VALUE BROWSER / 键值空间浏览器</span>
          </div>

          {/* 模式匹配搜索框 */}
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchPattern}
              onChange={(e) => {
                setSearchPattern(e.target.value);
                fetchKeys(e.target.value || '*');
              }}
              placeholder="搜索键名 (例如: session:* 或 *)"
              className="w-full pl-10 pr-3 py-2 text-xs rounded-xl liquid-input text-slate-900 dark:text-white placeholder-slate-400"
            />
          </div>
        </div>

        {/* 键值表格 */}
        <div className="rounded-3xl liquid-glass overflow-hidden shadow-md">
          <div className="grid grid-cols-12 px-6 py-4 border-b border-black/5 dark:border-white/10 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            <div className="col-span-4 sm:col-span-3">键名 (Key)</div>
            <div className="col-span-2 sm:col-span-1">类型</div>
            <div className="hidden sm:block sm:col-span-2">剩余 TTL</div>
            <div className="col-span-4 sm:col-span-4">内容预览 (Value Preview)</div>
            <div className="col-span-2 text-right">操作</div>
          </div>

          {keys.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs">
              未找到匹配的 Redis 键。点击右上角&ldquo;新增 Redis 键&rdquo;即可在内存或云端中快速插入测试数据。
            </div>
          ) : (
            <div className="divide-y divide-black/5 dark:divide-white/5 text-xs">
              {keys.map((item) => (
                <div
                  key={item.key}
                  className="grid grid-cols-12 items-center px-6 py-3.5 hover:bg-white/40 dark:hover:bg-white/5 transition-colors group"
                >
                  {/* 键名 */}
                  <div className="col-span-4 sm:col-span-3 font-mono font-bold text-slate-900 dark:text-white truncate">
                    {item.key}
                  </div>

                  {/* 数据类型 */}
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full liquid-glass-subtle text-emerald-600 dark:text-emerald-400 uppercase font-bold">
                      {item.type}
                    </span>
                  </div>

                  {/* TTL */}
                  <div className="hidden sm:block sm:col-span-2 font-mono text-[11px] text-slate-500 tabular-nums">
                    {item.ttl === -1 ? (
                      <span className="text-slate-400">永久有效</span>
                    ) : item.ttl > 0 ? (
                      <span className="text-amber-500 font-bold">{item.ttl} 秒</span>
                    ) : (
                      <span className="text-rose-400">已过期</span>
                    )}
                  </div>

                  {/* 内容预览 */}
                  <div className="col-span-4 sm:col-span-4 font-mono text-[11px] text-slate-500 dark:text-slate-300 truncate pr-2">
                    {item.valuePreview}
                  </div>

                  {/* 操作 */}
                  <div className="col-span-2 flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => {
                        setEditKey(item.key);
                        setEditValue(item.valuePreview);
                        setEditTtl(item.ttl > 0 ? String(item.ttl) : '');
                        setIsEditOpen(true);
                      }}
                      title="编辑此键值"
                      className="liquid-orb w-7 h-7 text-slate-500 hover:text-emerald-600 cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteKey(item.key)}
                      title="删除此键"
                      className="liquid-orb w-7 h-7 text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 新增/编辑键值 Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
          <div className="w-full max-w-md liquid-glass rounded-3xl p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-emerald-500" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {editKey ? '编辑 Redis 键值' : '新增 Redis 键值'}
                </h3>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="liquid-orb w-7 h-7 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveKey} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  键名 (Key)
                </label>
                <input
                  type="text"
                  value={editKey}
                  onChange={(e) => setEditKey(e.target.value)}
                  placeholder="例如: config:site_title"
                  required
                  className="w-full px-3.5 py-2 text-xs rounded-xl liquid-input font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  内容值 (Value)
                </label>
                <textarea
                  rows={4}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="输入字符串或 JSON 内容..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl liquid-input font-mono leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  生命周期 TTL (秒，留空为永久)
                </label>
                <input
                  type="number"
                  value={editTtl}
                  onChange={(e) => setEditTtl(e.target.value)}
                  placeholder="3600"
                  className="w-full px-3.5 py-2 text-xs rounded-xl liquid-input font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="liquid-pill px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="liquid-pill-primary px-5 py-2 text-xs font-semibold cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  {isSaving ? '保存中...' : '确认保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
