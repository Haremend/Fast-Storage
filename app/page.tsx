'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TopBar } from '@/components/TopBar';
import { OverviewView } from '@/components/OverviewView';
import { DocumentsView } from '@/components/DocumentsView';
import { VectorDbView } from '@/components/VectorDbView';
import { TaskQueueView } from '@/components/TaskQueueView';
import { RedisStudioView } from '@/components/RedisStudioView';
import { SystemStatusView } from '@/components/SystemStatusView';
import { LoginView } from '@/components/LoginView';
import { UploadModal } from '@/components/UploadModal';
import { AvatarModal } from '@/components/AvatarModal';
import { DocumentPreviewModal } from '@/components/DocumentPreviewModal';
import { WallpaperModal, WALLPAPER_PRESETS } from '@/components/WallpaperModal';
import { DocumentItem, UserSession, SystemStatus, QueueTaskItem, WallpaperConfig } from '@/lib/types';

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<{ username: string; role: string } | null>(null);

  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [session, setSession] = useState<UserSession | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [tasks, setTasks] = useState<QueueTaskItem[]>([]);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  // iOS Theme Mode State (Defaults to dark for the cosmic black-purple theme)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('fast_storage_dark_mode');
        if (saved !== null) return saved === 'true';
      } catch {}
    }
    return true;
  });

  // Background Wallpaper Configuration (Defaults to "黑紫色" cosmic gradient)
  const [wallpaperConfig, setWallpaperConfig] = useState<WallpaperConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('fast_storage_wallpaper_config');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved wallpaper config:', e);
      }
    }
    return {
      type: 'preset',
      presetId: 'dark-purple-default',
      customDataUrl: null,
      dimPercent: 0,
    };
  });

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [isWallpaperOpen, setIsWallpaperOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);

  // Initialize theme class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('fast_storage_dark_mode', String(isDarkMode));
      } catch {}
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const handleWallpaperChange = async (newConfig: WallpaperConfig) => {
    setWallpaperConfig(newConfig);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('fast_storage_wallpaper_config', JSON.stringify(newConfig));
      } catch (err) {
        console.error('Failed to save wallpaper config:', err);
      }
    }

    try {
      await fetch('/api/wallpaper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_active', config: newConfig }),
      });
    } catch (err) {
      console.warn('Failed to sync active wallpaper to Upstash Redis:', err);
    }
  };

  // Sync wallpaper from Upstash Redis on mount
  useEffect(() => {
    let isCurrent = true;
    const fetchCloudWallpaper = async () => {
      try {
        const res = await fetch('/api/wallpaper');
        const data = await res.json();
        if (isCurrent && data.success && data.activeConfig) {
          setWallpaperConfig(data.activeConfig);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('fast_storage_wallpaper_config', JSON.stringify(data.activeConfig));
            } catch {}
          }
        }
      } catch (err) {
        console.warn('Failed to load wallpaper from Upstash cloud:', err);
      }
    };
    fetchCloudWallpaper();
    return () => {
      isCurrent = false;
    };
  }, []);

  const fetchDocuments = useCallback(async () => {
    setIsLoadingDocs(true);
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (data.success && Array.isArray(data.documents)) {
        setDocuments(data.documents);
      }
    } catch (err) {
      console.error('Documents load error:', err);
    } finally {
      setIsLoadingDocs(false);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error('Tasks load error:', err);
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/system/status');
      const data = await res.json();
      if (data.success && data.status) {
        setStatus(data.status);
      }
    } catch (err) {
      console.error('Status load error:', err);
    }
  }, []);

  // Check login state and initial data load
  useEffect(() => {
    let isMounted = true;

    const checkAuthAndLoad = async () => {
      try {
        const localToken = typeof window !== 'undefined'
          ? (localStorage.getItem('fast_storage_session_token') || localStorage.getItem('upcloud_session_token'))
          : null;
        const authRes = await fetch('/api/auth/me', {
          headers: localToken ? { 'x-session-token': localToken } : {},
        });
        const authData = await authRes.json();

        if (isMounted) {
          const isAuthed = Boolean(authData.isAuthenticated || authData.authenticated);
          if (isAuthed && authData.user) {
            setIsAuthenticated(true);
            setCurrentUser(authData.user);
          } else {
            setIsAuthenticated(false);
            return;
          }
        }

        // Load data if authenticated
        const [sessRes, docsRes, tasksRes, statRes] = await Promise.all([
          fetch('/api/session'),
          fetch('/api/documents'),
          fetch('/api/tasks'),
          fetch('/api/system/status'),
        ]);

        const [sessData, docsData, tasksData, statData] = await Promise.all([
          sessRes.json(),
          docsRes.json(),
          tasksRes.json(),
          statRes.json(),
        ]);

        if (isMounted) {
          if (sessData.success && sessData.session) setSession(sessData.session);
          if (docsData.success && Array.isArray(docsData.documents)) setDocuments(docsData.documents);
          if (tasksData.success && Array.isArray(tasksData.tasks)) setTasks(tasksData.tasks);
          if (statData.success && statData.status) setStatus(statData.status);
        }
      } catch (err) {
        console.error('Initial data load error:', err);
        if (isMounted) setIsAuthenticated(false);
      }
    };

    checkAuthAndLoad();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLoginSuccess = async (user: { username: string; role: string }) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    fetchDocuments();
    fetchTasks();
    fetchStatus();
    try {
      const sessRes = await fetch('/api/session');
      const sessData = await sessRes.json();
      if (sessData.success && sessData.session) {
        setSession(sessData.session);
      }
    } catch (err) {
      console.error('Session load error after login:', err);
    }
  };

  const handleLogout = async () => {
    try {
      const localToken = typeof window !== 'undefined'
        ? (localStorage.getItem('fast_storage_session_token') || localStorage.getItem('upcloud_session_token'))
        : null;
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: localToken ? { 'x-session-token': localToken } : {},
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('fast_storage_session_token');
        localStorage.removeItem('upcloud_session_token');
      }
      setIsAuthenticated(false);
      setCurrentUser(null);
      setCurrentTab('overview');
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      await fetch(`/api/documents?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (selectedDoc?.id === id) {
        setSelectedDoc(null);
      }
      fetchStatus();
    } catch (err) {
      console.error('Delete document failed:', err);
    }
  };

  const handleDocumentUploaded = () => {
    // 文件列表由 DocumentsView 自管；上传后刷新概览与预览
    fetchDocuments();
    fetchStatus();
  };

  const handleSelectDocument = async (key: string) => {
    try {
      const res = await fetch(`/api/documents?id=${encodeURIComponent(key)}`);
      const data = await res.json();
      if (data.success && data.document) setSelectedDoc(data.document);
    } catch (err) {
      console.error('Load document preview failed:', err);
    }
  };

  const handleTriggerSemanticSearch = () => {
    // 向量数据库视图不接收查询词；这里只负责切换到该标签页
    setCurrentTab('search');
  };

  // Render loading placeholder while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#06000c] text-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        </div>
        <div className="p-8 rounded-3xl liquid-glass flex flex-col items-center gap-4 relative z-10 border border-white/20">
          <div className="sound-wave">
            <i /><i /><i /><i /><i />
          </div>
          <span className="text-xs text-slate-300 font-medium tracking-wide">
            安全验证与环境准备中...
          </span>
        </div>
      </div>
    );
  }

  // Render Login View if not authenticated
  if (!isAuthenticated) {
    return (
      <LoginView onLoginSuccess={handleLoginSuccess} wallpaperConfig={wallpaperConfig} />
    );
  }

  return (
    <div className="min-h-screen relative isolate flex flex-col font-sans transition-colors duration-300 overflow-x-hidden bg-[#06000c] text-white">
      {/* =========================================================================
          Dynamic Wallpaper Layer (背景上传功能 & 默认黑紫色渐变系统)
          ========================================================================= */}
      {wallpaperConfig.type === 'custom' && wallpaperConfig.customDataUrl ? (
        /* 用户自定义上传的高清壁纸 */
        <>
          <div
            className="fixed inset-0 -z-20 bg-cover bg-center bg-no-repeat transition-all duration-700"
            style={{ backgroundImage: `url("${wallpaperConfig.customDataUrl}")` }}
          />
          {/* 可调暗化遮罩 */}
          <div
            className="fixed inset-0 -z-10 bg-black pointer-events-none transition-opacity duration-300"
            style={{ opacity: (wallpaperConfig.dimPercent || 0) / 100 }}
          />
        </>
      ) : wallpaperConfig.presetId === 'pure-white-frost' ? (
        /* 极简亮色白雾背景 */
        <div className="fixed inset-0 pointer-events-none -z-10 bg-gradient-to-tr from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0]">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-slate-300/30 blur-3xl" />
        </div>
      ) : wallpaperConfig.presetId === 'deep-violet-velvet' ? (
        /* 暗夜魅紫 */
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-[#05000a]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#3b0764_0%,#190328_50%,#05000a_100%)]" />
          <div className="absolute top-1/4 left-1/4 w-[650px] h-[650px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(147,51,234,0.30),transparent_65%)] blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-10 w-[700px] h-[700px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.22),transparent_65%)] blur-3xl" />
        </div>
      ) : wallpaperConfig.presetId === 'cyber-indigo-twilight' ? (
        /* 深空蓝紫 */
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-[#020617]">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#020617_0%,#0f172a_35%,#1e1b4b_70%,#2e1065_100%)]" />
          <div className="absolute top-1/3 left-1/3 w-[650px] h-[650px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.28),transparent_65%)] blur-3xl" />
          <div className="absolute -bottom-20 right-20 w-[600px] h-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.25),transparent_65%)] blur-3xl" />
        </div>
      ) : wallpaperConfig.presetId === 'obsidian-amber-aurora' ? (
        /* 黑曜金芒 */
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-[#09090b]">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#09090b_0%,#18181b_45%,#271e16_80%,#0c0804_100%)]" />
          <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(217,119,6,0.20),transparent_65%)] blur-3xl" />
        </div>
      ) : (
        /* 默认：“黑紫色”极光流光渐变背景 (Black-Purple Cosmic Neon Mesh) */
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-[#06000c]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,#2c0747_0%,#130124_45%,#06000c_85%)]" />
          <div className="absolute top-[8%] -left-[10%] w-[680px] h-[680px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.32),transparent_65%)] blur-3xl animate-pulse" />
          <div className="absolute top-[25%] -right-[5%] w-[620px] h-[620px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(217,70,239,0.24),transparent_65%)] blur-3xl" />
          <div className="absolute -bottom-[15%] left-[25%] w-[800px] h-[800px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(76,29,149,0.38),transparent_65%)] blur-3xl" />
          <div className="absolute bottom-[25%] right-[20%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(147,51,234,0.22),transparent_65%)] blur-3xl" />
          {/* 可选遮罩 */}
          {wallpaperConfig.dimPercent > 0 && (
            <div
              className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-300"
              style={{ opacity: wallpaperConfig.dimPercent / 100 }}
            />
          )}
        </div>
      )}

      {/* iOS 27 Liquid Glass Floating Top Bar (unified navigation) */}
      <TopBar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenAvatar={() => setIsAvatarOpen(true)}
        onOpenWallpaper={() => setIsWallpaperOpen(true)}
        session={session}
        username={currentUser?.username || 'admin'}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        docsCount={documents.length}
      />

      {/* Main Workspace Layout */}
      <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 py-4">
        {/* Liquid Glass Content Viewport */}
        <main className="transition-all duration-300 min-w-0 pb-4">
          {currentTab === 'overview' && (
            <OverviewView
              session={session}
              documents={documents}
              tasks={tasks}
              status={status}
              onSelectTab={setCurrentTab}
              onSelectDocument={setSelectedDoc}
              onOpenUpload={() => setIsUploadOpen(true)}
              onOpenAvatar={() => setIsAvatarOpen(true)}
            />
          )}

          {currentTab === 'documents' && (
            <DocumentsView
              onSelectDocument={(doc) => handleSelectDocument(doc.id)}
              onOpenUpload={() => setIsUploadOpen(true)}
              onOpenVectorDb={handleTriggerSemanticSearch}
            />
          )}

          {currentTab === 'search' && <VectorDbView />}

          {currentTab === 'queue' && <TaskQueueView />}

          {currentTab === 'redis' && <RedisStudioView />}

          {currentTab === 'system' && (
            <SystemStatusView status={status} onRefresh={fetchStatus} />
          )}
        </main>
      </div>

      {/* Liquid Dialog Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onDocumentUploaded={handleDocumentUploaded}
      />

      <AvatarModal
        isOpen={isAvatarOpen}
        onClose={() => setIsAvatarOpen(false)}
        session={session}
        onSessionUpdated={setSession}
      />

      <DocumentPreviewModal
        document={selectedDoc}
        onClose={() => setSelectedDoc(null)}
        onDelete={handleDeleteDocument}
        onSelectRelatedDoc={(doc) => setSelectedDoc(doc)}
      />

      {/* 背景壁纸与自定义图片上传控制模态窗 */}
      <WallpaperModal
        isOpen={isWallpaperOpen}
        onClose={() => setIsWallpaperOpen(false)}
        config={wallpaperConfig}
        onChangeConfig={handleWallpaperChange}
      />
    </div>
  );
}
