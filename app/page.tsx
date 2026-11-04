'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TopBar } from '@/components/TopBar';
import { Sidebar } from '@/components/Sidebar';
import { OverviewView } from '@/components/OverviewView';
import { DocumentsView } from '@/components/DocumentsView';
import { SemanticSearchView } from '@/components/SemanticSearchView';
import { TaskQueueView } from '@/components/TaskQueueView';
import { RedisStudioView } from '@/components/RedisStudioView';
import { SystemStatusView } from '@/components/SystemStatusView';
import { LoginView } from '@/components/LoginView';
import { UploadModal } from '@/components/UploadModal';
import { AvatarModal } from '@/components/AvatarModal';
import { DocumentPreviewModal } from '@/components/DocumentPreviewModal';
import { DocumentItem, UserSession, SystemStatus, QueueTaskItem } from '@/lib/types';

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<{ username: string; role: string } | null>(null);

  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [session, setSession] = useState<UserSession | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [tasks, setTasks] = useState<QueueTaskItem[]>([]);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  // iOS Light / Dark Mode State (Defaults to pure white theme)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Sidebar collapse / expand state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('fast_storage_sidebar_collapsed') === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [semanticQuery, setSemanticQuery] = useState('');

  // Initialize theme class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('fast_storage_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

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

  const handleDocumentUploaded = (newDoc: DocumentItem) => {
    setDocuments((prev) => [newDoc, ...prev]);
    fetchTasks();
    fetchStatus();
  };

  const handleTriggerSemanticSearch = (query: string) => {
    setSemanticQuery(query);
    setCurrentTab('search');
  };

  // Render loading placeholder while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] dark:bg-[#0B0F19]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center animate-pulse">
            <span className="w-3 h-3 bg-emerald-500 rounded-full" />
          </div>
          <span className="text-xs text-slate-500 font-medium">安全验证中...</span>
        </div>
      </div>
    );
  }

  // Render Login View if not authenticated
  if (!isAuthenticated) {
    return (
      <LoginView onLoginSuccess={handleLoginSuccess} />
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* 3-Zone iOS Frosted Glass Top Bar */}
      <TopBar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenAvatar={() => setIsAvatarOpen(true)}
        session={session}
        username={currentUser?.username || 'admin'}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex w-full max-w-[1600px] mx-auto">
        {/* Desktop Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          status={status}
          docsCount={documents.length}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />

        {/* Content Viewport */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto transition-all duration-300 min-w-0">
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
              onTriggerSemanticSearch={handleTriggerSemanticSearch}
            />
          )}

          {currentTab === 'documents' && (
            <DocumentsView
              documents={documents}
              onSelectDocument={setSelectedDoc}
              onDeleteDocument={handleDeleteDocument}
              onOpenUpload={() => setIsUploadOpen(true)}
              onTriggerSemanticSearch={handleTriggerSemanticSearch}
              onRefresh={fetchDocuments}
              isLoading={isLoadingDocs}
            />
          )}

          {currentTab === 'search' && (
            <SemanticSearchView
              initialQuery={semanticQuery}
              onSelectDocument={setSelectedDoc}
            />
          )}

          {currentTab === 'queue' && <TaskQueueView />}

          {currentTab === 'redis' && <RedisStudioView />}

          {currentTab === 'system' && (
            <SystemStatusView status={status} onRefresh={fetchStatus} />
          )}
        </main>
      </div>

      {/* Upload Document Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onDocumentUploaded={handleDocumentUploaded}
      />

      {/* User Profile / Avatar Modal */}
      <AvatarModal
        isOpen={isAvatarOpen}
        onClose={() => setIsAvatarOpen(false)}
        session={session}
        onSessionUpdated={setSession}
      />

      {/* Document Details & Vector Recommendation Modal */}
      <DocumentPreviewModal
        document={selectedDoc}
        onClose={() => setSelectedDoc(null)}
        onDelete={handleDeleteDocument}
        onSelectRelatedDoc={(doc) => setSelectedDoc(doc)}
      />
    </div>
  );
}
