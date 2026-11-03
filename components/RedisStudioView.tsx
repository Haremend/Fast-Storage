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
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Server className="w-5 h-5 text-emerald-500" />
            <span>Redis 键值空间与经典特性实验舱</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            支持完整 Redis 键值增删改查浏览，并提供高并发原子计数器与分布式 API 频控限制器交互演示。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchKeys(searchPattern)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 ios-glass hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all ios-press"
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
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] rounded-xl shadow-md shadow-emerald-500/20 transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>新增 Redis 键</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Redis 实例遥测卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl ios-glass">
          <div className="text-[11px] text-slate-400 font-semibold uppercase">实例环境</div>
          <div className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">
            {isLive ? 'Upstash Redis 云端' : '本地内存极速缓存'}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
            {isLive ? '生产 REST 协议' : '开发模拟引擎'}
          </div>
        </div>

        <div className="p-4 rounded-2xl ios-glass">
          <div className="text-[11px] text-slate-400 font-semibold uppercase">总键值数量</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums mt-1">
            {keys.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">活跃存储项</div>
        </div>

        <div className="p-4 rounded-2xl ios-glass">
          <div className="text-[11px] text-slate-400 font-semibold uppercase">预估内存占用</div>
          <div className="text-2xl font-bold text-sky-600 dark:text-sky-400 font-mono tabular-nums mt-1">
            {info.usedMemory || '1.42 MB'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">极轻量内存开销</div>
        </div>

        <div className="p-4 rounded-2xl ios-glass">
          <div className="text-[11px] text-slate-400 font-semibold uppercase">服务可用性</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1">
            99.99%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">全球多区冗余</div>
        </div>
      </div>

      {/* 模块 A：Redis 经典特性交互实验舱 (Classic Demos) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          <Gauge className="w-4 h-4 text-emerald-500" />
          <span>Redis 核心特性交互实验舱 (Classic Feature Demos)</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 实验 1: 分布式滑动窗口频控 (Rate Limiter) */}
          <div className="p-5 rounded-3xl ios-glass space-y-3 border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-emerald-500" />
                <span>1. 分布式 API 频控保护</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                限流 5次/10秒
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              利用 Redis 原子递增与 TTL 机制，防护接口恶意刷量，防止服务器被爬虫压垮。
            </p>

            <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 space-y-1.5 text-xs">
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-500">剩余请求额度:</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                  {rlRemaining !== null ? `${rlRemaining} / ${rlLimit}` : '就绪'}
                </span>
              </div>
              {rlMsg && (
                <div
                  className={`text-[11px] font-medium ${
                    rlBlocked ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {rlMsg}
                </div>
              )}
            </div>

            <button
              onClick={handleTestRateLimit}
              className="w-full py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 ios-press"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>快速模拟 API 连续请求</span>
            </button>
          </div>

          {/* 实验 2: 全局高并发原子计数器 (Atomic Counter) */}
          <div className="p-5 rounded-3xl ios-glass space-y-3 border border-sky-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-sky-500" />
                <span>2. 全局分布式原子累加器</span>
              </span>
              <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">
                Redis INCR
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              多 Serverless 实例并发读写时无惧竞争条件，保证统计数字绝对精准。
            </p>

            <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-between">
              <span className="text-xs text-slate-500">全局访问计数:</span>
              <span className="text-xl font-bold font-mono tabular-nums text-sky-600 dark:text-sky-400">
                {atomicCounter}
              </span>
            </div>

            <button
              onClick={handleIncrementCounter}
              disabled={counterLoading}
              className="w-full py-2.5 px-3 bg-sky-500 hover:bg-sky-400 active:scale-[0.98] text-white font-semibold text-xs rounded-xl shadow-md shadow-sky-500/20 transition-all flex items-center justify-center gap-1.5 ios-press"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>原子 +1 (Atomic INCR)</span>
            </button>
          </div>

          {/* 实验 3: 临时缓存与 TTL 自动驱逐 (TTL Ephemeral Cache) */}
          <div className="p-5 rounded-3xl ios-glass space-y-3 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-purple-500" />
                <span>3. 临时缓存与 TTL 倒计时</span>
              </span>
              <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                TTL Expire
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              设置短期敏感数据（短信验证码、防重复提交令牌），时间一到自动从内存彻底抹除。
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={ttlKeyName}
                onChange={(e) => setTtlKeyName(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono"
              />
              <select
                value={ttlDuration}
                onChange={(e) => setTtlDuration(e.target.value)}
                className="px-2.5 py-1.5 bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono"
              >
                <option value="15">15 秒</option>
                <option value="30">30 秒</option>
                <option value="60">60 秒</option>
              </select>
            </div>

            {ttlMsg && <div className="text-[11px] text-purple-600 font-medium">{ttlMsg}</div>}

            <button
              onClick={handleSetTtlCache}
              className="w-full py-2.5 px-3 bg-purple-600 hover:bg-purple-500 active:scale-[0.98] text-white font-semibold text-xs rounded-xl shadow-md shadow-purple-500/20 transition-all flex items-center justify-center gap-1.5 ios-press"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>写入并开启倒计时</span>
            </button>
          </div>
        </div>
      </div>

      {/* 模块 B: Redis 键值空间浏览器 (Key-Value Browser) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            <KeyRound className="w-4 h-4 text-emerald-500" />
            <span>Redis 键值空间浏览器 (Key-Value Browser)</span>
          </div>

          {/* 模式匹配搜索框 */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchPattern}
              onChange={(e) => {
                setSearchPattern(e.target.value);
                fetchKeys(e.target.value || '*');
              }}
              placeholder="搜索键名 (例如: session:* 或 *)"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* 键值表格 */}
        <div className="rounded-3xl ios-glass overflow-hidden shadow-xs border border-white/60 dark:border-white/10">
          <div className="grid grid-cols-12 px-6 py-3.5 border-b border-black/5 dark:border-white/5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <div className="col-span-4 sm:col-span-3">键名 (Key)</div>
            <div className="col-span-2 sm:col-span-1">类型</div>
            <div className="hidden sm:block sm:col-span-2">剩余 TTL</div>
            <div className="col-span-4 sm:col-span-4">内容预览 (Value Preview)</div>
            <div className="col-span-2 text-right">操作</div>
          </div>

          {keys.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              未找到匹配的 Redis 键。点击右上角&ldquo;新增 Redis 键&rdquo;即可在内存或云端中快速插入测试数据。
            </div>
          ) : (
            <div className="divide-y divide-black/5 dark:divide-white/5 text-xs">
              {keys.map((item) => (
                <div
                  key={item.key}
                  className="grid grid-cols-12 items-center px-6 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                >
                  {/* 键名 */}
                  <div className="col-span-4 sm:col-span-3 font-mono font-medium text-slate-900 dark:text-white truncate">
                    {item.key}
                  </div>

                  {/* 数据类型 */}
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase font-semibold">
                      {item.type}
                    </span>
                  </div>

                  {/* TTL */}
                  <div className="hidden sm:block sm:col-span-2 font-mono text-[11px] text-slate-500 tabular-nums">
                    {item.ttl === -1 ? (
                      <span className="text-slate-400">永久有效</span>
                    ) : item.ttl > 0 ? (
                      <span className="text-amber-500 font-semibold">{item.ttl} 秒</span>
                    ) : (
                      <span className="text-red-400">已过期</span>
                    )}
                  </div>

                  {/* 内容预览 */}
                  <div className="col-span-4 sm:col-span-4 font-mono text-[11px] text-slate-500 truncate pr-2">
                    {item.valuePreview}
                  </div>

                  {/* 操作 */}
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <button
                      onClick={() => {
                        setEditKey(item.key);
                        setEditValue(item.valuePreview);
                        setEditTtl(item.ttl > 0 ? String(item.ttl) : '');
                        setIsEditOpen(true);
                      }}
                      title="编辑此键值"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors ios-press"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteKey(item.key)}
                      title="删除此键"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors ios-press"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-md ios-glass rounded-3xl p-6 shadow-2xl border border-white/60 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {editKey ? '编辑 Redis 键值' : '新增 Redis 键值'}
                </h3>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveKey} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  键名 (Key)
                </label>
                <input
                  type="text"
                  value={editKey}
                  onChange={(e) => setEditKey(e.target.value)}
                  placeholder="例如: config:features:ai_search"
                  required
                  className="w-full px-3 py-2 bg-white/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  键值 (Value 支持字符串或 JSON)
                </label>
                <textarea
                  rows={3}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="例如: true 或 {'active': true, 'tokens': 500}"
                  required
                  className="w-full px-3 py-2 bg-white/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  TTL 过期时间（秒，留空表示永久有效）
                </label>
                <input
                  type="number"
                  value={editTtl}
                  onChange={(e) => setEditTtl(e.target.value)}
                  placeholder="例如: 3600 (1小时) 或 86400 (1天)"
                  className="w-full px-3 py-2 bg-white/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 rounded-xl"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-400 rounded-xl shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSaving ? '正在写入 Redis...' : '保存至 Redis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
