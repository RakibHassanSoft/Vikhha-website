'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { StatusBadge } from '@/components/ui/Bits';
import { api } from '@/lib/api';
import { taka, bnDateTime } from '@/lib/bn';
import { METHOD_LABELS } from '@/lib/constants';
import { speakBangla } from '@/lib/speech';

export default function ReceiptPage({ params }) {
  /*
   * Next 15+ passes `params` to client components as a Promise, which has to be
   * unwrapped with `use()`; Next 14 passes a plain object, which `use()` would
   * reject. `use` is the one hook React allows to be called conditionally, so
   * this branch is legal and keeps the page working on both versions.
   */
  const { receiptNo } = typeof params?.then === 'function' ? use(params) : params;
  const [donation, setDonation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .receipt(receiptNo)
      .then(({ data }) => setDonation(data))
      .catch((err) => setError(err.message));
  }, [receiptNo]);

  if (error) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <div className="mb-4 text-5xl">🧾</div>
        <h1 className="text-xl font-bold text-white">রসিদ পাওয়া যায়নি</h1>
        <p className="mt-2 text-sm text-slate-400">{error}</p>
        <Link href="/" className="btn-ghost mt-6">হোমপেজে ফিরুন</Link>
      </div>
    );
  }

  if (!donation) {
    return <div className="py-20 text-center text-slate-400">রসিদ লোড হচ্ছে…</div>;
  }

  const rows = [
    ['রসিদ নম্বর', donation.receiptNo, 'font-mono'],
    ['তারিখ', bnDateTime(donation.createdAt)],
    ['পরিমাণ', taka(donation.amount), 'text-emerald-400 font-bold'],
    ['মাধ্যম', METHOD_LABELS[donation.method]],
    ['ট্রানজেকশন আইডি', donation.trxId, 'font-mono'],
    ['প্রাপকের নম্বর', donation.receiverNumber, 'font-mono'],
    ['দাতা', donation.donor?.name || 'নাম প্রকাশে অনিচ্ছুক'],
  ];

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href="/" className="inline-block text-xs text-slate-400 hover:text-emerald-400">
        ← হোমপেজ
      </Link>

      <div className="glass-card overflow-hidden">
        <div className="border-b border-slate-800 bg-slate-950/60 p-6 text-center">
          <div className="mb-2 text-4xl">🧾</div>
          <h1 className="text-lg font-bold text-white">ডিজিটাল সদকা রসিদ</h1>
          <div className="mt-2 flex justify-center">
            <StatusBadge status={donation.status} />
          </div>
          {donation.status === 'pending' && (
            <p className="mt-2 text-[11px] text-amber-400">
              যাচাই সম্পন্ন হলে এই দান সাহায্যপ্রার্থীর সংগ্রহে যোগ হবে।
            </p>
          )}
          {donation.statusNote && (
            <p className="mt-2 text-[11px] text-slate-400">{donation.statusNote}</p>
          )}
        </div>

        {donation.seeker && (
          <div className="flex items-center gap-3 border-b border-slate-800 p-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={donation.seeker.avatarUrl || '/avatar-placeholder.svg'}
              alt={donation.seeker.name}
              className="h-12 w-12 rounded-2xl border border-slate-700 object-cover"
            />
            <div className="min-w-0">
              <Link
                href={`/seekers/${encodeURIComponent(donation.seeker.slug)}`}
                className="truncate text-sm font-bold text-white hover:text-emerald-400"
              >
                {donation.seeker.name}
              </Link>
              <p className="truncate text-xs text-slate-400">{donation.seeker.location?.address}</p>
            </div>
          </div>
        )}

        <dl className="divide-y divide-slate-800 p-5 text-sm">
          {rows.map(([label, value, cls]) => (
            <div key={label} className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-xs text-slate-400">{label}</dt>
              <dd className={`text-right text-slate-100 ${cls || ''}`}>{value}</dd>
            </div>
          ))}
        </dl>

        {donation.duaText && (
          <div className="border-t border-slate-800 p-5">
            <p className="text-sm italic leading-relaxed text-teal-200">“{donation.duaText}”</p>
            <button
              type="button"
              onClick={() => speakBangla(donation.duaText)}
              className="btn-ghost mt-3 w-full text-xs"
            >
              🔊 দোয়া শুনুন
            </button>
          </div>
        )}
      </div>

      <button type="button" onClick={() => window.print()} className="btn-ghost w-full text-xs">
        🖨 রসিদ প্রিন্ট করুন
      </button>
    </div>
  );
}
