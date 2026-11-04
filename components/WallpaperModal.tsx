'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Sparkles,
  RotateCcw,
  Check,
  Trash2,
  Sliders,
  Moon,
  Eye,
} from 'lucide-react';

export interface WallpaperConfig {
  type: 'preset' | 'custom';
  presetId: string;
  customDataUrl: string | null;
  dimPercent: number;
}

export const WALLPAPER_PRESETS = [
  {
    id: 'dark-purple-default',
    name: '黑紫极光 (默认)',
    desc: '深度黑紫流光星云，为 iOS 液态毛玻璃带来最佳折射与通透感',
    previewGradient: 'radial-gradient(circle at 30% 30%, #3b0764 0%, #170228 50%, #06000c 100%)',
    bgClass: 'bg-[#06000c]',
  },
  {
    id: 'deep-violet-velvet',
    name: '暗夜魅紫',
    desc: '深邃高贵的天鹅绒暗紫，极致专注与沉浸感',
    previewGradient: 'radial-gradient(ellipse at 50% 20%, #4c1d95 0%, #1e0533 55%, #05000a 100%)',
    bgClass: 'bg-[#05000a]',
  },
  {
    id: 'cyber-indigo-twilight',
    name: '深空蓝紫',
    desc: '星际深蓝渐变紫光，冷暖交融的科技质感',
    previewGradient: 'linear-gradient(135deg, #020617 0%, #0f172a 35%, #1e1b4b 70%, #2e1065 100%)',
    bgClass: 'bg-[#020617]',
  },
  {
    id: 'obsidian-amber-aurora',
    name: '黑曜金芒',
    desc: '沉稳黑曜石与暮光暖金微光，柔和低调的金属折射',
    previewGradient: 'linear-gradient(135deg, #09090b 0%, #18181b 45%, #271e16 80%, #0c0804 100%)',
    bgClass: 'bg-[#09090b]',
  },
  {
    id: 'pure-white-frost',
    name: '极简云白',
    desc: '明亮通透的雪白晨雾（轻量极简风格）',
    previewGradient: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 50%, #e2e8f0 100%)',
    bgClass: 'bg-[#f8fafc]',
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
  const [selectedPreset, setSelectedPreset] = useState<string>(config.presetId);
  const [dimPercent, setDimPercent] = useState<number>(config.dimPercent);
  const [customImage, setCustomImage] = useState<string | null>(config.customDataUrl);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Handle Image Upload & Compression
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('请选择有效的图片文件（JPG, PNG, WebP 等）');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setUploadError('图片体积请小于 15MB');
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Optimize image to max 1920x1080 to ensure smooth rendering and reliable localStorage storage
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 1920;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setCustomImage(compressedDataUrl);

          const updated: WallpaperConfig = {
            type: 'custom',
            presetId: selectedPreset,
            customDataUrl: compressedDataUrl,
            dimPercent: dimPercent,
          };
          onChangeConfig(updated);
        }
        setIsUploading(false);
      };
      img.onerror = () => {
        setUploadError('解析图片失败，请更换其他图片');
        setIsUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const updated: WallpaperConfig = {
      type: 'preset',
      presetId,
      customDataUrl: customImage,
      dimPercent,
    };
    onChangeConfig(updated);
  };

  const handleApplyCustom = () => {
    if (!customImage) return;
    const updated: WallpaperConfig = {
      type: 'custom',
      presetId: selectedPreset,
      customDataUrl: customImage,
      dimPercent,
    };
    onChangeConfig(updated);
  };

  const handleDimChange = (val: number) => {
    setDimPercent(val);
    const updated: WallpaperConfig = {
      ...config,
      dimPercent: val,
    };
    onChangeConfig(updated);
  };

  const handleRemoveCustom = () => {
    setCustomImage(null);
    const updated: WallpaperConfig = {
      type: 'preset',
      presetId: 'dark-purple-default',
      customDataUrl: null,
      dimPercent: 0,
    };
    setSelectedPreset('dark-purple-default');
    setDimPercent(0);
    onChangeConfig(updated);
  };

  const handleResetToDefault = () => {
    setSelectedPreset('dark-purple-default');
    setDimPercent(0);
    const updated: WallpaperConfig = {
      type: 'preset',
      presetId: 'dark-purple-default',
      customDataUrl: customImage,
      dimPercent: 0,
    };
    onChangeConfig(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-md transition-opacity"
      />

      {/* iOS 27 Liquid Glass Dialog */}
      <div className="relative w-full max-w-xl liquid-glass rounded-3xl p-6 sm:p-7 shadow-2xl border border-white/40 dark:border-white/20 z-10 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl liquid-glass-subtle flex items-center justify-center text-purple-400">
              <ImageIcon className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>个性化背景壁纸</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full liquid-glass-subtle text-purple-400 font-semibold">
                  iOS 27 GLASS
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                支持上传自定义壁纸图片或选择预设深邃黑紫渐变
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

        {/* Section 1: Upload Custom Background (背景上传功能) */}
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Upload className="w-3.5 h-3.5 text-purple-400" />
              <span>上传自定义壁纸</span>
            </span>
            {customImage && (
              <button
                onClick={handleRemoveCustom}
                className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>清除自定义</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="group relative p-5 rounded-2xl liquid-glass-interactive border border-dashed border-white/30 hover:border-purple-400/70 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2"
          >
            {customImage ? (
              <div className="w-full flex items-center justify-between gap-4">
                <div className="relative w-24 h-16 rounded-xl overflow-hidden shadow-md ring-2 ring-purple-400/60 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={customImage}
                    alt="自定义壁纸预览"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/25 flex items-center justify-center text-[10px] text-white font-bold">
                    已加载
                  </div>
                </div>

                <div className="flex-1 text-left">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    已上传自定义壁纸
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    点击可更换新图片，或在右侧启用作为当前生效背景
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApplyCustom();
                  }}
                  className={`px-4 py-2 text-xs font-bold rounded-full transition-all cursor-pointer ${
                    config.type === 'custom'
                      ? 'liquid-pill-primary'
                      : 'liquid-pill hover:liquid-pill-primary'
                  }`}
                >
                  {config.type === 'custom' ? '当前使用中' : '立即应用'}
                </button>
              </div>
            ) : (
              <>
                <div className="w-11 h-11 rounded-2xl liquid-glass-subtle flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-slate-200">
                  {isUploading ? '正在压缩并载入图片...' : '点击上传本地背景图片 (JPG, PNG, WebP)'}
                </div>
                <div className="text-[11px] text-slate-400">
                  支持高清大图，自动智能适应屏幕比例
                </div>
              </>
            )}
          </div>

          {uploadError && (
            <div className="text-xs text-rose-400 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 font-medium">
              {uploadError}
            </div>
          )}
        </div>

        {/* Section 2: Preset Gradient Library (默认黑紫色) */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-2">
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
                config.type === 'preset' && selectedPreset === preset.id;

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
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
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

        {/* Section 3: Wallpaper Dimming & Contrast Tuning */}
        <div className="mt-6 p-4 rounded-2xl liquid-glass-subtle space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
            <span className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
              <span>壁纸暗化遮罩（增强文字与玻璃可读性）</span>
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
            <span>原图明亮 (0%)</span>
            <span>微暗聚焦 (35%)</span>
            <span>深沉极夜 (75%)</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 font-mono">
            设置将自动保存在当前浏览器本地。
          </div>
          <button
            onClick={onClose}
            className="liquid-pill-primary px-6 py-2.5 text-xs font-bold shadow-lg cursor-pointer"
          >
            完成设定
          </button>
        </div>
      </div>
    </div>
  );
}
