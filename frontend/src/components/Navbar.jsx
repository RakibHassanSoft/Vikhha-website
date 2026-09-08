'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';

const LINKS = [
  { href: '/', label: 'সাহায্যপ্রার্থী তালিকা' },
  { href: '/map', label: 'লাইভ ম্যাপ' },
  { href: '/register', label: 'নতুন রেজিস্ট্রেশন' },
  { href: '/dua', label: 'দোয়া স্টুডিও' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, isAdmin, isSeeker, logout, loading } = useAuth();
  const [open, setOpen] = useState(false);

  const isActive = (href) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  const accountLinks = [
    isSeeker && { href: '/dashboard', label: 'আমার প্রোফাইল' },
    user && { href: '/donations', label: 'আমার দান' },
    isAdmin && { href: '/admin', label: 'অ্যাডমিন প্যানেল' },
  ].filter(Boolean);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-bdgreen to-emerald-400 text-xl shadow-lg shadow-emerald-900/40">
            🤲
          </span>
          <span className="bg-gradient-to-r from-emerald-400 via-teal-200 to-amber-300 bg-clip-text text-lg font-bold text-transparent sm:text-xl">
            ডিজিটাল ভিক্ষা ও সদকা
          </span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-slate-700/50 bg-slate-800/60 p-1.5 lg:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                isActive(link.href)
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {!loading && user ? (
            <div className="hidden items-center gap-2 lg:flex">
              {accountLinks.map((l) => (
                <Link key={l.href} href={l.href} className="btn-ghost px-3 py-2 text-xs">
                  {l.label}
                </Link>
              ))}
              <button type="button" onClick={logout} className="btn-ghost px-3 py-2 text-xs">
                লগ আউট
              </button>
            </div>
          ) : (
            !loading && (
              <Link href="/login" className="hidden lg:inline-flex btn-ghost px-3 py-2 text-xs">
                লগ ইন
              </Link>
            )
          )}

          <Link href="/register" className="hidden btn-amber px-4 py-2 text-sm sm:inline-flex">
            কিউআর কার্ড তৈরি
          </Link>

          <button
            type="button"
            aria-label="মেনু"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-2 text-xl text-slate-300 hover:text-white lg:hidden"
          >
            ☰
          </button>
        </div>
      </div>

      {open && (
        <div className="space-y-1 border-b border-slate-800 bg-slate-900 px-4 py-3 lg:hidden">
          {[...LINKS, ...accountLinks].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                isActive(link.href) ? 'bg-slate-800 text-emerald-400' : 'text-slate-300'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {!loading &&
            (user ? (
              <button
                type="button"
                onClick={() => {
                  logout();
                  setOpen(false);
                }}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-300"
              >
                লগ আউট
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-slate-300"
              >
                লগ ইন
              </Link>
            ))}
        </div>
      )}
    </header>
  );
}
