import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UpCloud 云端保险库 — 基于 Upstash Blob、Vector、QStash 与 Redis 的个人智能云存储',
  description: '轻量级 Serverless 个人云端存储服务，支持用户头像与文档存取、基于余弦相似度的语义智能检索与推荐、QStash 异步任务队列与 Redis 全局缓存。',
  openGraph: {
    title: 'UpCloud 云端保险库 — 个人智能云存储',
    description: '轻量级 Serverless 个人云端存储服务，基于 Upstash Blob、Vector、QStash 与 Redis 打造。',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UpCloud 云端保险库 — 个人智能云存储',
    description: '轻量级 Serverless 个人云端存储服务，基于 Upstash Blob、Vector、QStash 与 Redis 打造。',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 antialiased font-sans transition-colors duration-200" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
