'use client';

import Link from 'next/link';
import { ProgressBar } from '@/components/ui/Bits';
import { CATEGORY_LABELS } from '@/lib/constants';

export default function SeekerCard({ seeker, onDonate, onQr }) {
  const methods = ['bkash', 'nagad', 'rocket'].filter((m) => seeker.payments?.[m]);

  return (
    <article className="glass-card group flex flex-col justify-between gap-4 p-5 transition-all hover:border-slate-700">
      <div>
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={seeker.avatarUrl || '/avatar-placeholder.svg'}
            alt={seeker.name}
            loading="lazy"
            className="h-14 w-14 shrink-0 rounded-2xl border border-slate-700 object-cover transition-all group-hover:border-emerald-500"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-md border border-amber-500/20 bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                {seeker.categoryLabel || CATEGORY_LABELS[seeker.category]}
              </span>
              {seeker.isLive && (
                <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-emerald-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-emerald-400" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  লাইভ
                </span>
              )}
            </div>
            <h3 className="mt-1 truncate text-base font-bold text-white">
              <Link href={`/seekers/${encodeURIComponent(seeker.slug)}`} className="hover:text-emerald-400">
                {seeker.name}
              </Link>
            </h3>
            <p className="truncate text-xs text-slate-400">📍 {seeker.location?.address}</p>
          </div>
        </div>

        <p className="my-3 line-clamp-2 rounded-xl border border-slate-800/80 bg-slate-950/50 p-2.5 text-xs italic text-slate-300">
          “{seeker.story}”
        </p>

        <ProgressBar collected={seeker.stats?.collectedToday || 0} target={seeker.dailyTarget} />
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-800 pt-3">
        <div className="flex items-center gap-1 text-[11px] font-bold">
          {methods.includes('bkash') && <span className="rounded bg-bkash/10 px-1.5 py-0.5 text-bkash">bKash</span>}
          {methods.includes('nagad') && <span className="rounded bg-nagad/10 px-1.5 py-0.5 text-nagad">Nagad</span>}
          {methods.includes('rocket') && <span className="rounded bg-rocket/10 px-1.5 py-0.5 text-rocket">Rocket</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onQr?.(seeker)}
            title="কিউআর কার্ড"
            aria-label={`${seeker.name} এর কিউআর কার্ড`}
            className="rounded-xl bg-slate-800 p-2 text-xs text-amber-400 transition-all hover:bg-slate-700"
          >
            ▦
          </button>
          <button
            type="button"
            onClick={() => onDonate?.(seeker)}
            className="btn-primary px-3.5 py-2 text-xs"
          >
            সদকা দিন
          </button>
        </div>
      </div>
    </article>
  );
}
