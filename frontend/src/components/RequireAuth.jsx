'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export default function RequireAuth({ role, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="py-20 text-center text-slate-400">লোড হচ্ছে…</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
        <div className="mb-3 text-4xl">🔐</div>
        <h1 className="text-xl font-bold text-white">এই পাতাটি দেখতে লগ ইন করুন</h1>
        <div className="mt-6 flex gap-2">
          <Link href="/login" className="btn-primary flex-1">লগ ইন</Link>
          <Link href="/signup" className="btn-ghost flex-1">অ্যাকাউন্ট খুলুন</Link>
        </div>
      </div>
    );
  }

  if (role && user.role !== role) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-rose-500/30 bg-rose-500/5 p-8 text-center">
        <div className="mb-3 text-4xl">⛔</div>
        <h1 className="text-xl font-bold text-white">এই পাতায় প্রবেশাধিকার নেই</h1>
        <p className="mt-2 text-sm text-slate-400">এটি শুধু {role === 'admin' ? 'অ্যাডমিন' : 'সাহায্যপ্রার্থী'} অ্যাকাউন্টের জন্য।</p>
        <Link href="/" className="btn-ghost mt-6">হোমপেজে ফিরুন</Link>
      </div>
    );
  }

  return children;
}
