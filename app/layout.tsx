import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fast Storage — 基于 Upstash Blob、Vector、QStash 与 Redis 的个人智能云存储',
  description: '轻量级 Serverless 个人云端存储服务，支持用户头像与文档存取、基于余弦相似度的语义智能检索与推荐、QStash 异步队列与 Redis 全局缓存。',
  openGraph: {
    title: 'Fast Storage — 个人智能云存储',
    description: '轻量级 Serverless 个人云端存储服务，基于 Upstash Blob、Vector、QStash 与 Redis 打造。',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fast Storage — 个人智能云存储',
    description: '轻量级 Serverless 个人云端存储服务，基于 Upstash Blob、Vector、QStash 与 Redis 打造。',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark" suppressHydrationWarning>
      <body
        className="min-h-screen bg-[#06000c] text-white antialiased font-sans selection:bg-purple-500/30 selection:text-purple-200 overflow-x-hidden"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
