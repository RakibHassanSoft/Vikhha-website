'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { taka, bnNumber } from '@/lib/bn';

const CARDS = [
  { key: 'collected', label: 'আজকের যাচাইকৃত সংগ্রহ', tone: 'text-emerald-400' },
  { key: 'seekers', label: 'সক্রিয় সাহায্যপ্রার্থী', tone: 'text-amber-400' },
  { key: 'donations', label: 'মোট যাচাইকৃত দান', tone: 'text-teal-400' },
];

export default function StatsBar() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let alive = true;
    api
      .overview()
      .then(({ data }) => alive && setStats(data))
      .catch(() => alive && setStats(null));
    return () => {
      alive = false;
    };
  }, []);

  const values = {
    collected: stats ? taka(stats.today.collected) : '—',
    seekers: stats ? `${bnNumber(stats.activeSeekers)} জন` : '—',
    donations: stats ? `${bnNumber(stats.lifetime.donations)}টি` : '—',
  };

  return (
    <section className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-emerald-950/50 to-slate-900 px-4 py-6 sm:px-6">
      <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
        <div className="space-y-2 text-center md:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-emerald-400" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            ক্যাশলেস বাংলাদেশ · যাচাইকৃত সদকা ব্যবস্থা
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            বাড়িতে বসেই দিন <span className="text-amber-400">সদকা</span>, সরাসরি{' '}
            <span className="font-bold text-bkash">বিকাশে</span>
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
            যাচাইকৃত সাহায্যপ্রার্থীদের নিজের মোবাইল ব্যাংকিং অ্যাপ থেকে সরাসরি টাকা পাঠান, তারপর
            এখানে ট্রানজেকশন আইডি জমা দিন। যাচাই শেষে দান তাঁর সংগ্রহে যোগ হবে ও আপনি ডিজিটাল রসিদ
            পাবেন।
          </p>
        </div>

        <div className="grid w-full min-w-[280px] grid-cols-3 gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 sm:w-auto sm:min-w-[340px]">
          {CARDS.map((card) => (
            <div key={card.key} className="rounded-xl bg-slate-800/50 p-2 text-center">
              <span className="block text-[11px] leading-tight text-slate-400">{card.label}</span>
              <span className={`mt-1 block text-lg font-bold ${card.tone}`}>{values[card.key]}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
