'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import DonateModal from '@/components/DonateModal';
import QrCardModal from '@/components/QrCardModal';
import { ProgressBar, StatusBadge } from '@/components/ui/Bits';
import { api } from '@/lib/api';
import { speakBangla } from '@/lib/speech';
import { taka, bnNumber, timeAgoBn } from '@/lib/bn';
import { METHOD_LABELS } from '@/lib/constants';

export default function SeekerProfileClient({
  slug,
  seeker: initialSeeker,
  recentDonations: initialDonations,
}) {
  const [donateOpen, setDonateOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  /*
   * Two jobs for this fetch.
   *
   * When the server render succeeded, it refreshes the values the 30s page
   * cache would make stale — "এখন লাইভ" and today's total read as current, so
   * they must not be half a minute old.
   *
   * When the server render could not reach the API (a sleeping free-tier
   * instance, a restart), `initialSeeker` is null and this fetch is how the
   * page gets its content at all, rather than the visitor hitting a 404 on a
   * link someone shared with them.
   */
  const [seeker, setSeeker] = useState(initialSeeker);
  const [recentDonations, setRecentDonations] = useState(initialDonations);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    api
      .getSeeker(slug)
      .then(({ data }) => {
        if (!alive || !data?.seeker) return;
        setSeeker(data.seeker);
        setRecentDonations(data.recentDonations || []);
        setError(null);
      })
      .catch((err) => {
        // Only surfaced when there is nothing rendered to fall back on.
        if (alive && !initialSeeker) setError(err);
      });
    return () => {
      alive = false;
    };
  }, [slug, initialSeeker]);

  if (!seeker) {
    if (error) {
      return (
        <div className="glass-card p-10 text-center">
          <div className="mb-3 text-4xl">{error.status === 404 ? '🔍' : '🌐'}</div>
          <h1 className="text-xl font-bold text-white">
            {error.status === 404 ? 'প্রোফাইলটি পাওয়া যায়নি' : 'প্রোফাইলটি এখন লোড করা যাচ্ছে না'}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
            {error.status === 404
              ? 'এই ঠিকানায় কোনো সাহায্যপ্রার্থী নেই, অথবা প্রোফাইলটি এখনো যাচাইয়ের অপেক্ষায় আছে।'
              : 'সার্ভার সাড়া দিচ্ছে না — কিছুক্ষণ পর আবার চেষ্টা করুন।'}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <button type="button" onClick={() => window.location.reload()} className="btn-primary">
              আবার চেষ্টা করুন
            </button>
            <Link href="/" className="btn-ghost">সব সাহায্যপ্রার্থী</Link>
          </div>
        </div>
      );
    }

    return (
      <div className="glass-card animate-pulse space-y-4 p-6">
        <div className="flex gap-5">
          <div className="h-28 w-28 rounded-3xl bg-slate-800" />
          <div className="flex-1 space-y-3">
            <div className="h-3 w-28 rounded bg-slate-800" />
            <div className="h-6 w-64 rounded bg-slate-800" />
            <div className="h-3 w-48 rounded bg-slate-800" />
          </div>
        </div>
        <div className="h-20 rounded-2xl bg-slate-800/70" />
        <div className="h-2 rounded-full bg-slate-800" />
        <div className="h-12 rounded-xl bg-slate-800" />
      </div>
    );
  }

  const methods = ['bkash', 'nagad', 'rocket'].filter((m) => seeker.payments?.[m]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <section className="glass-card p-6">
          <div className="flex flex-col gap-5 sm:flex-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={seeker.avatarUrl || '/avatar-placeholder.svg'}
              alt={seeker.name}
              className="h-28 w-28 shrink-0 rounded-3xl border border-slate-700 object-cover"
            />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-amber-500/20 bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-amber-400">
                  {seeker.categoryLabel}
                </span>
                <StatusBadge status={seeker.status} />
                {seeker.isLive && (
                  <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-emerald-400" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    এখন লাইভ · {timeAgoBn(seeker.live?.lastPingAt)}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-white">{seeker.name}</h1>
              <p className="text-sm text-slate-400">
                📍 {seeker.location?.address}
                {seeker.location?.district ? ` · ${seeker.location.district}` : ''}
              </p>
              <p className="text-xs text-slate-500">
                মোট যাচাইকৃত সংগ্রহ:{' '}
                <strong className="text-emerald-400">{taka(seeker.stats?.collectedTotal || 0)}</strong> ·{' '}
                {bnNumber(seeker.stats?.donationCount || 0)} জন দাতা
              </p>
            </div>
          </div>

          <blockquote className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm italic leading-relaxed text-slate-300">
            “{seeker.story}”
          </blockquote>

          <div className="mt-5">
            <ProgressBar collected={seeker.stats?.collectedToday || 0} target={seeker.dailyTarget} />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => setDonateOpen(true)} className="btn-primary flex-1 py-3">
              🤲 সদকা দিন
            </button>
            <button type="button" onClick={() => setQrOpen(true)} className="btn-ghost px-4">
              ▦ কিউআর কার্ড
            </button>
            <button type="button" onClick={() => speakBangla(seeker.dua)} className="btn-ghost px-4">
              🔊 দোয়া শুনুন
            </button>
          </div>
        </section>

        <section className="glass-card p-6">
          <h2 className="mb-4 text-base font-bold text-white">সাম্প্রতিক যাচাইকৃত দান</h2>
          {recentDonations.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-800 py-8 text-center text-sm text-slate-500">
              এখনো কোনো যাচাইকৃত দান নেই। আপনিই প্রথম হতে পারেন।
            </p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {recentDonations.map((d) => (
                <li key={d.receiptNo} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-200">
                      {d.donor?.name || 'নাম প্রকাশে অনিচ্ছুক'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {METHOD_LABELS[d.method]} · {timeAgoBn(d.createdAt)}
                    </p>
                    {d.message && (
                      <p className="mt-1 truncate text-xs italic text-slate-400">“{d.message}”</p>
                    )}
                  </div>
                  <span className="shrink-0 font-bold text-emerald-400">{taka(d.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="space-y-6">
        <section className="glass-card p-6">
          <h2 className="mb-3 text-sm font-bold text-white">যেসব নম্বরে পাঠাতে পারেন</h2>
          <ul className="space-y-2 text-sm">
            {methods.map((m) => (
              <li key={m} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                <span className="text-xs font-semibold text-slate-400">{METHOD_LABELS[m]}</span>
                <span className="font-mono font-bold text-white">{seeker.payments[m]}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 rounded-xl bg-slate-950/70 p-3 text-[11px] leading-relaxed text-slate-400">
            🔒 টাকা সরাসরি এই নম্বরেই যায় — পোর্টালের মধ্য দিয়ে নয়। কেউ পিন চাইলে দেবেন না।
          </p>
        </section>

        {Number.isFinite(seeker.location?.lat) && (
          <section className="glass-card p-6">
            <h2 className="mb-2 text-sm font-bold text-white">অবস্থান</h2>
            <p className="text-xs leading-relaxed text-slate-400">
              {seeker.isLive
                ? 'তিনি এখন লাইভ অবস্থান শেয়ার করছেন — ম্যাপে বর্তমান জায়গাটি দেখা যাচ্ছে।'
                : 'ম্যাপে তাঁর সর্বশেষ জানা অবস্থান দেখা যাচ্ছে।'}
            </p>
            <Link href="/map" className="btn-ghost mt-3 w-full text-xs">
              🗺 লাইভ ম্যাপে দেখুন
            </Link>
          </section>
        )}

        <section className="glass-card p-6">
          <h2 className="mb-2 text-sm font-bold text-white">তাঁর দোয়া</h2>
          <p className="text-sm italic leading-relaxed text-amber-300">“{seeker.dua}”</p>
        </section>
      </aside>

      {donateOpen && <DonateModal seeker={seeker} onClose={() => setDonateOpen(false)} />}
      {qrOpen && <QrCardModal seeker={seeker} onClose={() => setQrOpen(false)} />}
    </div>
  );
}
