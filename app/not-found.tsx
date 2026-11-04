import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F5F7] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 font-sans">
      <div className="w-full max-w-sm ios-glass rounded-3xl p-8 text-center space-y-4 border border-white/70 dark:border-white/10 shadow-xl">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold">404 - 页面未找到</h1>
        <p className="text-xs text-slate-500 dark:text-slate-300">
          您访问的页面不存在或已被移除。
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 mt-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回主页</span>
        </Link>
      </div>
    </div>
  );
}
