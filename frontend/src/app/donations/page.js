'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import { StatusBadge, EmptyState, ErrorState } from '@/components/ui/Bits';
import { api } from '@/lib/api';
import { taka, bnDateTime, bnNumber } from '@/lib/bn';
import { METHOD_LABELS } from '@/lib/constants';

function DonationList() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .myDonations({ page: 1, limit: 50 })
      .then(({ data, meta: m }) => {
        setRows(data || []);
        setMeta(m);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const verified = rows.filter((r) => r.status === 'verified');
  const total = verified.reduce((sum, r) => sum + r.amount, 0);

  if (loading) return <div className="py-20 text-center text-slate-400">লোড হচ্ছে…</div>;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="glass-card p-4 text-center">
          <span className="block text-xs text-slate-400">মোট যাচাইকৃত দান</span>
          <span className="mt-1 block text-xl font-bold text-emerald-400">{taka(total)}</span>
        </div>
        <div className="glass-card p-4 text-center">
          <span className="block text-xs text-slate-400">যাচাই সম্পন্ন</span>
          <span className="mt-1 block text-xl font-bold text-white">{bnNumber(verified.length)}টি</span>
        </div>
        <div className="glass-card p-4 text-center">
          <span className="block text-xs text-slate-400">সর্বমোট এন্ট্রি</span>
          <span className="mt-1 block text-xl font-bold text-white">{bnNumber(meta?.total || rows.length)}টি</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="এখনো কোনো দান নেই"
          description="তালিকা থেকে একজন সাহায্যপ্রার্থী বেছে নিয়ে প্রথম সদকা পাঠান।"
          action={<Link href="/" className="btn-primary">তালিকা দেখুন</Link>}
        />
      ) : (
        <div className="glass-card divide-y divide-slate-800">
          {rows.map((d) => (
            <div key={d.receiptNo} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <Link
                  href={`/receipt/${d.receiptNo}`}
                  className="truncate text-sm font-bold text-white hover:text-emerald-400"
                >
                  {d.seeker?.name || 'সাহায্যপ্রার্থী'}
                </Link>
                <p className="text-[11px] text-slate-500">
                  {bnDateTime(d.createdAt)} · {METHOD_LABELS[d.method]} · <span className="font-mono">{d.trxId}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={d.status} />
                <span className="font-bold text-emerald-400">{taka(d.amount)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MyDonationsPage() {
  return (
    <RequireAuth>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">আমার দানের ইতিহাস</h1>
        <DonationList />
      </div>
    </RequireAuth>
  );
}
