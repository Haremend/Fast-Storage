'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Search,
  FileText,
  ArrowRight,
  ExternalLink,
  Layers,
  Database,
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { SearchResultItem, DocumentItem } from '@/lib/types';

interface SemanticSearchViewProps {
  initialQuery?: string;
  onSelectDocument: (doc: DocumentItem) => void;
}

export function SemanticSearchView({
  initialQuery = '',
  onSelectDocument,
}: SemanticSearchViewProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [recommendations, setRecommendations] = useState<DocumentItem[]>([]);
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // 对比实验模式：传统字面搜索结果模拟与对比
  const [compareMode, setCompareMode] = useState(true);
  const [traditionalMatches, setTraditionalMatches] = useState<string[]>([]);

  const sampleQueries = [
    '如何优化网络传输延迟并降低服务器开销？',
    '余弦相似度数学公式与多维向量空间投影',
    '无服务器生产部署检查项与环境变量规范',
    '异步任务解耦与消息削峰队列工作流',
    '全局会话存储与缓存自动失效策略',
  ];

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setHasSearched(true);

    try {
      const res = await fetch(`/api/documents/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) {
        setResults(data.results || []);
        setRecommendations(data.recommendations || []);
        setLatencyMs(data.latencyMs || 12);

        // 模拟传统字面搜索：只有当文档名或摘要中字面完整包含搜索词时才算匹配
        const qLower = searchQuery.toLowerCase().trim();
        const literalMatches: string[] = [];
        (data.results || []).forEach((item: SearchResultItem) => {
          if (
            item.document.name.toLowerCase().includes(qLower) ||
            item.document.summary.toLowerCase().includes(qLower)
          ) {
            literalMatches.push(item.document.name);
          }
        });
        setTraditionalMatches(literalMatches);
      }
    } catch (err) {
      console.error('Semantic search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (!initialQuery) return;
    let isCurrent = true;

    const performInitialSearch = async () => {
      try {
        const res = await fetch(`/api/documents/search?q=${encodeURIComponent(initialQuery)}`);
        const data = await res.json();
        if (isCurrent && data.success) {
          setResults(data.results || []);
          setRecommendations(data.recommendations || []);
          setLatencyMs(data.latencyMs || 12);
          setHasSearched(true);
        }
      } catch (err) {
        console.error('Initial search error:', err);
      }
    };

    performInitialSearch();

    return () => {
      isCurrent = false;
    };
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  return (
    <div className="space-y-6">
      {/* 头部介绍 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <span>Upstash Vector 语义智能检索舱</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            通过高维向量理解自然语言概念内涵，让您的个人知识库支持跨表述、跨语种的智能检索与关联推荐。
          </p>
        </div>

        {/* 对比模式开关 */}
        <button
          onClick={() => setCompareMode(!compareMode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ios-press ${
            compareMode
              ? 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400'
              : 'ios-glass text-slate-500'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>{compareMode ? '对比实验舱: 已开启' : '对比实验舱: 已关闭'}</span>
        </button>
      </div>

      {/* 核心搜索框 */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <Search className="w-5 h-5 text-purple-500 absolute left-4 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入自然语言问题、知识点或业务概念 (例如：如何让网络请求更快)..."
            className="w-full pl-12 pr-32 py-3.5 ios-glass rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 shadow-xs transition-all"
          />
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="absolute right-2 px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 active:scale-[0.98] rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm shadow-purple-500/20"
          >
            {isSearching ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>检索中...</span>
              </>
            ) : (
              <>
                <span>语义检索</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* 推荐语义检索概念标签 */}
      <div className="space-y-2">
        <div className="text-[11px] text-slate-400 dark:text-slate-500 uppercase font-semibold">
          点击试用演示概念用例：
        </div>
        <div className="flex flex-wrap gap-2">
          {sampleQueries.map((sample) => (
            <button
              key={sample}
              onClick={() => {
                setQuery(sample);
                handleSearch(sample);
              }}
              className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 ios-glass hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all text-left ios-press"
            >
              &ldquo;{sample}&rdquo;
            </button>
          ))}
        </div>
      </div>

      {/* 对比实验舱面板（直观展示为什么需要 Vector） */}
      {compareMode && hasSearched && (
        <div className="p-4 rounded-3xl ios-glass border border-purple-500/20 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
            <HelpCircle className="w-4 h-4 text-purple-500" />
            <span>原理对比实验室：传统关键词搜索 vs Upstash 向量语义理解</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* 传统搜索结果 */}
            <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-2">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-semibold">
                <span className="flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span>传统 SQL LIKE / 字符串匹配</span>
                </span>
                <span className="font-mono text-[11px]">{traditionalMatches.length} 篇匹配</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                传统搜索必须要求文档中<strong>严格包含您输入的每一个汉字或单词</strong>。当用户用自然语言提问时，字面几乎完全落空，查找不到任何内容。
              </p>
              <div className="pt-1 text-[11px] text-slate-400 font-mono">
                {traditionalMatches.length > 0 ? `字面命中: ${traditionalMatches.join(', ')}` : '未能命中任何字面完全相同的文档'}
              </div>
            </div>

            {/* Upstash 向量搜索结果 */}
            <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-2">
              <div className="flex items-center justify-between text-purple-700 dark:text-purple-300 font-semibold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Upstash Vector 语义检索</span>
                </span>
                <span className="font-mono text-[11px] text-purple-600 dark:text-purple-400 font-bold">
                  {results.length} 篇概念命中 (最高 {results[0] ? Math.round(results[0].score * 100) : 0}%)
                </span>
              </div>
              <p className="text-[11px] text-purple-900/80 dark:text-purple-200/80 leading-relaxed">
                Upstash Vector 将文档与提问投射入稠密高维向量空间。系统<strong>理解了您的真实意图</strong>，即便没有相同字词，也能自动匹配含义高度相关的文章！
              </p>
              <div className="pt-1 text-[11px] text-purple-700 dark:text-purple-300 font-mono font-medium">
                查询耗时: {latencyMs}ms · 结合 Redis 缓存实现亚毫秒极速响应
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 搜索结果列表 */}
      {hasSearched && results.length === 0 && !isSearching && (
        <div className="p-10 rounded-3xl ios-glass text-center">
          <Database className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">未检索到语义相关的文档</div>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            您可以尝试放宽提问概念，或上传更多个人文档扩充向量索引。
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3.5">
        {results.map((item, idx) => {
          const scorePercent = Math.min(100, Math.round(item.score * 100));

          return (
            <div
              key={item.document.id + idx}
              className="p-5 rounded-3xl ios-glass hover:border-purple-500/40 transition-all group space-y-3 shadow-xs"
            >
              <div className="flex items-start justify-between gap-4">
                <div
                  onClick={() => onSelectDocument(item.document)}
                  className="flex items-center gap-2.5 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {item.document.name}
                  </h4>
                </div>

                {/* 相似度得分胶囊 */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-slate-400">概念吻合度:</span>
                  <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-300 tabular-nums bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-full">
                    {scorePercent}%
                  </span>
                </div>
              </div>

              {/* 语义匹配摘录 */}
              <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono text-[11px]">
                {item.matchedSnippet}
              </div>

              {/* 元信息与操作 */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-black/5 dark:border-white/5 text-slate-400">
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span>{(item.document.size / 1024).toFixed(1)} KB</span>
                  <span aria-hidden="true">·</span>
                  <span>{new Date(item.document.uploadedAt).toLocaleDateString('zh-CN')}</span>
                  <span aria-hidden="true">·</span>
                  <span>{item.document.tags.join(', ')}</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onSelectDocument(item.document)}
                    className="text-purple-600 dark:text-purple-400 hover:underline font-semibold text-[11px] flex items-center gap-1"
                  >
                    <span>查看全文</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <a
                    href={item.document.blobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    title="在 Blob 中查看"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 关联智能推荐 */}
      {recommendations.length > 0 && (
        <div className="mt-8 space-y-3 pt-6 border-t border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              语义临近推荐文档 (基于向量空间最近邻)
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                onClick={() => onSelectDocument(rec)}
                className="p-4 rounded-2xl ios-glass hover:border-emerald-500/40 cursor-pointer transition-all group space-y-1.5 ios-press"
              >
                <div className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate">
                  {rec.name}
                </div>
                <div className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                  {rec.summary}
                </div>
                <div className="text-[10px] text-slate-400 font-mono pt-1">
                  {(rec.size / 1024).toFixed(1)} KB · {rec.tags.slice(0, 2).join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
