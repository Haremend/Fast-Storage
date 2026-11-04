'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Sparkles,
  RotateCcw,
  Check,
  Trash2,
  Sliders,
  History,
  Cloud,
  RefreshCw,
  HardDrive,
  Eye,
} from 'lucide-react';
import { UploadedWallpaper, WallpaperConfig } from '@/lib/types';
export type { UploadedWallpaper, WallpaperConfig };

export const WALLPAPER_PRESETS = [
  {
    id: 'dark-purple-default',
    name: '黑紫极光 (默认)',
    desc: '深度黑紫流光星云，为 iOS 液态毛玻璃带来最佳折射与通透感',
    previewGradient: 'radial-gradient(circle at 30% 30%, #3b0764 0%, #170228 50%, #06000c 100%)',
  },
  {
    id: 'deep-violet-velvet',
    name: '暗夜魅紫',
    desc: '深邃高贵的天鹅绒暗紫，极致专注与沉浸感',
    previewGradient: 'radial-gradient(ellipse at 50% 20%, #4c1d95 0%, #1e0533 55%, #05000a 100%)',
  },
  {
    id: 'cyber-indigo-twilight',
    name: '深空蓝紫',
    desc: '星际深蓝渐变紫光，冷暖交融的科技质感',
    previewGradient: 'linear-gradient(135deg, #020617 0%, #0f172a 35%, #1e1b4b 70%, #2e1065 100%)',
  },
  {
    id: 'obsidian-amber-aurora',
    name: '黑曜金芒',
    desc: '沉稳黑曜石与暮光暖金微光，柔和低调的金属折射',
    previewGradient: 'linear-gradient(135deg, #09090b 0%, #18181b 45%, #271e16 80%, #0c0804 100%)',
  },
  {
    id: 'pure-white-frost',
    name: '极简云白',
    desc: '明亮通透的雪白晨雾（轻量极简风格）',
    previewGradient: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 50%, #e2e8f0 100%)',
  },
];

interface WallpaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WallpaperConfig;
  onChangeConfig: (newConfig: WallpaperConfig) => void;
}

export function WallpaperModal({
  isOpen,
  onClose,
  config,
  onChangeConfig,
}: WallpaperModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'history' | 'presets'>('upload');
  const [historyWallpapers, setHistoryWallpapers] = useState<UploadedWallpaper[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [dimPercent, setDimPercent] = useState<number>(config.dimPercent || 0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch wallpaper history from Upstash Blob & Redis
  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/wallpaper');
      const data = await res.json();
      if (data.success && Array.isArray(data.wallpapers)) {
        setHistoryWallpapers(data.wallpapers);
      }
    } catch (err) {
      console.error('Failed to load wallpaper history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let isCurrent = true;

    fetch('/api/wallpaper')
      .then((res) => res.json())
      .then((data) => {
        if (isCurrent && data.success && Array.isArray(data.wallpapers)) {
          setHistoryWallpapers(data.wallpapers);
        }
      })
      .catch((err) => {
        console.error('Failed to load wallpaper history:', err);
      })
      .finally(() => {
        if (isCurrent) setIsLoadingHistory(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Real File Upload to Upstash Blob
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('请选择有效的图片文件（JPG, PNG, WebP, GIF 等）');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setUploadError('图片体积请小于 20MB');
      return;
    }

    setUploadError(null);
    setSuccessMessage(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dimPercent', String(dimPercent));

      const res = await fetch('/api/wallpaper', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '上传到 Upstash Blob 失败');
      }

      setSuccessMessage(
        data.storageSource === 'upstash-blob'
          ? '壁纸已成功上传并持久化保存至 Upstash Blob 云端存储！'
          : '壁纸已暂存于云端存储池并建立历史索引！'
      );

      // Prepend to history
      if (data.wallpaper) {
        setHistoryWallpapers((prev) => [
          data.wallpaper,
          ...prev.filter((w) => w.key !== data.wallpaper.key),
        ]);
      }

      // Immediately apply as active wallpaper
      if (data.activeConfig) {
        onChangeConfig(data.activeConfig);
      }

      // Switch to history tab so user can see it
      setTimeout(() => {
        setActiveTab('history');
      }, 1000);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '上传失败，请重试');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Switch to a history wallpaper
  const handleSelectHistoryWallpaper = async (wallpaper: UploadedWallpaper) => {
    const newConfig: WallpaperConfig = {
      type: 'custom',
      presetId: 'dark-purple-default',
      customDataUrl: wallpaper.url,
      customKey: wallpaper.key,
      dimPercent,
    };

    onChangeConfig(newConfig);

    // Sync active wallpaper to Upstash Redis
    try {
      await fetch('/api/wallpaper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_active', config: newConfig }),
      });
    } catch (err) {
      console.warn('Sync active wallpaper to Redis failed:', err);
    }
  };

  // Delete a history wallpaper from Upstash Blob & Redis
  const handleDeleteHistoryWallpaper = async (wallpaper: UploadedWallpaper, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`确定从 Upstash 云端存储中删除壁纸 "${wallpaper.name}" 吗？`)) return;

    try {
      const res = await fetch(`/api/wallpaper?key=${encodeURIComponent(wallpaper.key)}&id=${encodeURIComponent(wallpaper.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setHistoryWallpapers((prev) => prev.filter((w) => w.key !== wallpaper.key && w.id !== wallpaper.id));

        // If the deleted wallpaper was active, reset to default
        if (config.customKey === wallpaper.key || config.customDataUrl === wallpaper.url) {
          const resetConfig: WallpaperConfig = {
            type: 'preset',
            presetId: 'dark-purple-default',
            customDataUrl: null,
            customKey: null,
            dimPercent: 0,
          };
          onChangeConfig(resetConfig);
        }
      }
    } catch (err) {
      console.error('Delete wallpaper failed:', err);
    }
  };

  // Select a preset gradient
  const handleSelectPreset = async (presetId: string) => {
    const newConfig: WallpaperConfig = {
      type: 'preset',
      presetId,
      customDataUrl: null,
      customKey: null,
      dimPercent,
    };
    onChangeConfig(newConfig);

    try {
      await fetch('/api/wallpaper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_active', config: newConfig }),
      });
    } catch (err) {
      console.warn('Sync preset to Redis failed:', err);
    }
  };

  const handleDimChange = async (val: number) => {
    setDimPercent(val);
    const newConfig: WallpaperConfig = {
      ...config,
      dimPercent: val,
    };
    onChangeConfig(newConfig);

    try {
      await fetch('/api/wallpaper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_active', config: newConfig }),
      });
    } catch (err) {
      console.warn('Sync dim to Redis failed:', err);
    }
  };

  const handleResetToDefault = () => {
    handleSelectPreset('dark-purple-default');
    setDimPercent(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity"
      />

      {/* iOS 27 Liquid Glass Dialog */}
      <div className="relative w-full max-w-2xl liquid-glass rounded-3xl p-5 sm:p-7 shadow-2xl border border-white/40 dark:border-white/20 z-10 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl liquid-glass-subtle flex items-center justify-center text-purple-400">
              <ImageIcon className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>云端个性化背景管理</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full liquid-glass-subtle text-purple-400 font-semibold flex items-center gap-1">
                  <Cloud className="w-3 h-3 text-sky-400" />
                  <span>UPSTASH BLOB</span>
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                支持上传原图至 Upstash Blob 云端存储，支持历史壁纸在线浏览与即时切换
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="liquid-orb w-8 h-8 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher (上传壁纸 / 历史云端壁纸 / 精选渐变) */}
        <div className="flex items-center gap-1.5 p-1 mt-4 rounded-full liquid-glass-subtle shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-1.5 px-3 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'upload'
                ? 'liquid-pill-primary text-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>上传新背景</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('history');
              fetchHistory();
            }}
            className={`flex-1 py-1.5 px-3 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 relative ${
              activeTab === 'history'
                ? 'liquid-pill-primary text-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>历史云端图库 ({historyWallpapers.length})</span>
            {historyWallpapers.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-1.5 px-3 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'presets'
                ? 'liquid-pill-primary text-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>黑紫渐变预设</span>
          </button>
        </div>

        {/* Tab Content Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-4 min-h-[260px]">
          {/* TAB 1: Upload to Upstash Blob */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              <div
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className="group relative p-8 rounded-3xl liquid-glass-interactive border border-dashed border-white/30 hover:border-purple-400/80 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-3"
              >
                <div className="w-14 h-14 rounded-2xl liquid-glass-subtle flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform shadow-lg">
                  {isUploading ? (
                    <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
                  ) : (
                    <Upload className="w-6 h-6" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-bold text-white">
                    {isUploading ? '正在将图片上传至 Upstash Blob 云端存储...' : '点击选择本地图片上传至 Upstash Blob'}
                  </div>
                  <p className="text-xs text-slate-400 max-w-sm">
                    支持高清 JPG、PNG、WebP、GIF 等格式，图片将直接上传至云端 Blob 存储桶，并在 Redis 中自动登记历史索引。
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono text-purple-300 bg-purple-500/15 px-3 py-1 rounded-full font-semibold">
                  <Cloud className="w-3 h-3" />
                  <span>实时持久化存储于 Upstash Blob</span>
                </div>
              </div>

              {uploadError && (
                <div className="text-xs text-rose-300 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 font-medium">
                  {uploadError}
                </div>
              )}

              {successMessage && (
                <div className="text-xs text-emerald-300 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 font-medium flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Current Active Preview */}
              {config.type === 'custom' && config.customDataUrl && (
                <div className="p-4 rounded-2xl liquid-glass-subtle flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-12 rounded-xl overflow-hidden shadow-md ring-2 ring-purple-400/60 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={config.customDataUrl}
                        alt="当前背景"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>当前生效背景</span>
                        <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-semibold">
                          ACTIVE
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                        {config.customKey || '云端存储壁纸'}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleResetToDefault}
                    className="liquid-pill px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                  >
                    恢复默认黑紫
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Historical Cloud Wallpapers (历史已上传的背景图切换) */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>从 Upstash 云端存储历史中挑选并切换：</span>
                <button
                  onClick={fetchHistory}
                  disabled={isLoadingHistory}
                  className="flex items-center gap-1 text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                  <span>刷新历史</span>
                </button>
              </div>

              {isLoadingHistory ? (
                <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
                  <span>正在从 Upstash 加载已上传壁纸列表...</span>
                </div>
              ) : historyWallpapers.length === 0 ? (
                <div className="p-10 rounded-2xl liquid-glass-subtle text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-white/5 flex items-center justify-center text-slate-400">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-semibold text-slate-300">
                    云端暂无历史已上传壁纸
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    切换到「上传新背景」标签页，上传您的第一张壁纸，图片将自动持久化至 Upstash Blob。
                  </p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="liquid-pill-primary px-4 py-2 text-xs font-bold text-black cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>去上传背景</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {historyWallpapers.map((wallpaper) => {
                    const isCurrent =
                      config.type === 'custom' &&
                      (config.customKey === wallpaper.key || config.customDataUrl === wallpaper.url);

                    return (
                      <div
                        key={wallpaper.id || wallpaper.key}
                        onClick={() => handleSelectHistoryWallpaper(wallpaper)}
                        className={`group relative p-3 rounded-2xl liquid-glass-interactive flex items-center gap-3 transition-all cursor-pointer border ${
                          isCurrent
                            ? 'border-white/80 ring-2 ring-white/60 shadow-xl shadow-purple-500/20'
                            : 'border-white/10 hover:border-white/30'
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="relative w-20 h-14 rounded-xl overflow-hidden shadow-md shrink-0 bg-black/40">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={wallpaper.url}
                            alt={wallpaper.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {isCurrent && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center shadow-md">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Metadata & Actions */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-white truncate" title={wallpaper.name}>
                              {wallpaper.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-mono">
                            <span>{(wallpaper.size / 1024).toFixed(0)} KB</span>
                            <span>•</span>
                            <span className="text-sky-400 font-semibold">
                              {wallpaper.source === 'upstash-blob' ? 'Upstash Blob' : '云端存储'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectHistoryWallpaper(wallpaper);
                              }}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                                isCurrent
                                  ? 'liquid-pill-primary text-black'
                                  : 'liquid-pill text-slate-300 hover:text-white'
                              }`}
                            >
                              {isCurrent ? '使用中' : '设为此背景'}
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleDeleteHistoryWallpaper(wallpaper, e)}
                              title="从云端永久删除"
                              className="w-6 h-6 rounded-lg liquid-orb text-slate-400 hover:text-rose-400 flex items-center justify-center cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Curated Presets (默认黑紫色) */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>精选渐变壁纸（推荐默认黑紫色）</span>
                </span>
                <button
                  onClick={handleResetToDefault}
                  className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>恢复默认黑紫</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {WALLPAPER_PRESETS.map((preset) => {
                  const isSelected =
                    config.type === 'preset' && config.presetId === preset.id;

                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset.id)}
                      className={`p-3.5 rounded-2xl liquid-glass-interactive transition-all cursor-pointer flex items-center gap-3.5 border ${
                        isSelected
                          ? 'border-white/80 ring-2 ring-white/50 shadow-lg'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      {/* Preset Mini Canvas Preview */}
                      <div
                        className="w-12 h-12 rounded-xl shrink-0 shadow-inner border border-white/20 flex items-center justify-center relative overflow-hidden"
                        style={{ background: preset.previewGradient }}
                      >
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center shadow-md">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white truncate">
                            {preset.name}
                          </span>
                          {preset.id === 'dark-purple-default' && (
                            <span className="text-[10px] font-mono text-purple-400 font-bold ml-1 shrink-0">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                          {preset.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section: Wallpaper Dimming & Contrast Tuning */}
          <div className="p-4 rounded-2xl liquid-glass-subtle space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
              <span className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-purple-400" />
                <span>壁纸暗化遮罩（保护文字与液态毛玻璃对比度）</span>
              </span>
              <span className="font-mono text-purple-400 font-bold">{dimPercent}%</span>
            </div>

            <input
              type="range"
              min={0}
              max={75}
              step={5}
              value={dimPercent}
              onChange={(e) => handleDimChange(parseInt(e.target.value, 10))}
              className="liquid-slider"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>原画通透 (0%)</span>
              <span>微暗聚焦 (35%)</span>
              <span>深邃极夜 (75%)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
            <Cloud className="w-3 h-3 text-sky-400" />
            <span>设置自动同步至 Upstash Redis 与本地存储</span>
          </div>
          <button
            onClick={onClose}
            className="liquid-pill-primary px-6 py-2 text-xs font-bold shadow-lg cursor-pointer text-black"
          >
            完成设定
          </button>
        </div>
      </div>
    </div>
  );
}
