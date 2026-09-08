'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import DonateModal from '@/components/DonateModal';
import { ErrorState } from '@/components/ui/Bits';
import { api } from '@/lib/api';
import { bnNumber } from '@/lib/bn';

const SeekerMap = dynamic(() => import('@/components/SeekerMap'), {
  ssr: false,
  loading: () => <div className="h-[460px] w-full animate-pulse rounded-2xl bg-slate-900" />,
});

const LEGEND = [
  { label: 'শারীরিক প্রতিবন্ধী', color: '#f43f5e' },
  { label: 'বয়স্ক ও অসহায়', color: '#f59e0b' },
  { label: 'অন্ধ হাফেজ', color: '#14b8a6' },
  { label: 'পথশিল্পী', color: '#818cf8' },
];

/** Live pins go stale on their own, so the list is refreshed while the tab is open. */
const REFRESH_MS = 45 * 1000;

export default function MapPage() {
  const [seekers, setSeekers] = useState([]);
  const [error, setError] = useState(null);
  const [liveOnly, setLiveOnly] = useState(false);
  const [donateTo, setDonateTo] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.mapSeekers({ live: liveOnly });
      setSeekers(data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [liveOnly]);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const liveCount = seekers.filter((s) => s.isLive).length;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-white">
              📍 সাহায্যপ্রার্থী লোকেশন ম্যাপ
            </h1>
            <p className="text-xs text-slate-400">
              বাংলাদেশের বিভিন্ন এলাকায় যাচাইকৃত সাহায্যপ্রার্থীদের প্রকৃত অবস্থান। ম্যাপে{' '}
              {bnNumber(seekers.length)} জন
              {liveCount > 0 && (
                <>
                  , তাঁদের মধ্যে{' '}
                  <strong className="text-emerald-400">{bnNumber(liveCount)} জন এখন লাইভ</strong>
                </>
              )}
              ।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={liveOnly}
              onClick={() => setLiveOnly((v) => !v)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                liveOnly
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span className="relative flex h-2.5 w-2.5">
                {liveOnly && (
                  <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-emerald-400" />
                )}
                <span
                  className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                    liveOnly ? 'bg-emerald-400' : 'bg-slate-600'
                  }`}
                />
              </span>
              শুধু লাইভ
            </button>
          </div>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <SeekerMap seekers={seekers} onDonate={setDonateTo} />
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-emerald-400" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
            </span>
            এখন লাইভ
          </span>
          {LEGEND.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>

        <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-400">
          ম্যাপের যেকোনো বিন্দুতে ক্লিক করে সরাসরি সদকা পাঠাতে পারেন। সবুজ স্পন্দিত বিন্দুগুলো
          এখন লাইভ — তাঁরা নিজেরা অবস্থান শেয়ার চালু রেখেছেন। যাঁদের অবস্থান দেওয়া নেই তাঁরা ম্যাপে
          দেখাবেন না; তালিকা পাতায় তাঁদের পাবেন।
        </p>
      </div>

      {donateTo && (
        <DonateModal seeker={donateTo} onClose={() => setDonateTo(null)} onDone={load} />
      )}
    </div>
  );
}
