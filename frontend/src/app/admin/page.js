'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import { StatusBadge, Spinner, EmptyState, ErrorState } from '@/components/ui/Bits';
import { useToast } from '@/components/Toast';
import { api } from '@/lib/api';
import { taka, bnNumber, bnDateTime } from '@/lib/bn';
import { METHOD_LABELS } from '@/lib/constants';

function AdminPanel() {
  const toast = useToast();
  const [tab, setTab] = useState('donations');
  const [stats, setStats] = useState(null);
  const [donations, setDonations] = useState([]);
  const [seekers, setSeekers] = useState([]);
  const [donationStatus, setDonationStatus] = useState('pending');
  const [seekerStatus, setSeekerStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [overview, d, s] = await Promise.all([
        api.overview(),
        api.adminDonations({ status: donationStatus, page: 1, limit: 50 }),
        api.adminSeekers({ status: seekerStatus, page: 1, limit: 50 }),
      ]);
      setStats(overview.data);
      setDonations(d.data || []);
      setSeekers(s.data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [donationStatus, seekerStatus]);

  useEffect(() => {
    load();
  }, [load]);

  const reviewDonation = async (id, status) => {
    const note =
      status === 'rejected'
        ? window.prompt('বাতিলের কারণ লিখুন (ঐচ্ছিক):', 'ট্রানজেকশন আইডি মেলেনি')
        : undefined;
    if (status === 'rejected' && note === null) return;

    setBusyId(id);
    try {
      await api.reviewDonation(id, { status, ...(note ? { statusNote: note } : {}) });
      toast.success(status === 'verified' ? 'দান যাচাই সম্পন্ন হয়েছে।' : 'দানটি বাতিল করা হয়েছে।');
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const reviewSeeker = async (id, status) => {
    const note =
      status === 'rejected'
        ? window.prompt('বাতিলের কারণ লিখুন (ঐচ্ছিক):', 'তথ্য যাচাই করা যায়নি')
        : undefined;
    if (status === 'rejected' && note === null) return;

    setBusyId(id);
    try {
      await api.reviewSeeker(id, { status, ...(note ? { statusNote: note } : {}) });
      toast.success(status === 'approved' ? 'প্রোফাইল অনুমোদিত হয়েছে।' : 'প্রোফাইলটি বাতিল করা হয়েছে।');
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const cards = stats
    ? [
        ['আজকের যাচাইকৃত সংগ্রহ', taka(stats.today.collected), 'text-emerald-400'],
        ['সর্বমোট সংগ্রহ', taka(stats.lifetime.collected), 'text-white'],
        ['সক্রিয় সাহায্যপ্রার্থী', `${bnNumber(stats.activeSeekers)} জন`, 'text-teal-400'],
        ['অপেক্ষমাণ প্রোফাইল', `${bnNumber(stats.pendingSeekers)}টি`, 'text-amber-400'],
        ['অপেক্ষমাণ দান', `${bnNumber(stats.pendingDonations)}টি`, 'text-amber-400'],
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">অ্যাডমিন প্যানেল</h1>
        <button type="button" onClick={load} className="btn-ghost text-xs">↻ রিফ্রেশ</button>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map(([label, value, tone]) => (
          <div key={label} className="glass-card p-4 text-center">
            <span className="block text-[11px] leading-tight text-slate-400">{label}</span>
            <span className={`mt-1 block text-lg font-bold ${tone}`}>{value}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 rounded-full border border-slate-800 bg-slate-900 p-1.5">
        {[
          ['donations', 'দান যাচাই'],
          ['seekers', 'প্রোফাইল যাচাই'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
              tab === key ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <div className="py-12 text-center text-slate-400">লোড হচ্ছে…</div>}

      {!loading && tab === 'donations' && (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {['pending', 'verified', 'rejected'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setDonationStatus(s)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                  donationStatus === s ? 'bg-slate-700 text-white' : 'bg-slate-900 text-slate-400'
                }`}
              >
                <StatusBadge status={s} />
              </button>
            ))}
          </div>

          {donations.length === 0 ? (
            <EmptyState title="এই তালিকায় কিছু নেই" />
          ) : (
            <div className="glass-card divide-y divide-slate-800">
              {donations.map((d) => (
                <div key={d.id || d._id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-bold text-white">
                      {taka(d.amount)} → {d.seeker?.name || 'অজানা'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {METHOD_LABELS[d.method]} · প্রেরক <span className="font-mono">{d.senderNumber}</span> · প্রাপক{' '}
                      <span className="font-mono">{d.receiverNumber}</span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      TrxID <span className="font-mono font-bold text-amber-300">{d.trxId}</span> ·{' '}
                      {bnDateTime(d.createdAt)}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      দাতা: {d.donor?.name || 'নাম প্রকাশে অনিচ্ছুক'}
                      {d.donor?.phone ? ` · ${d.donor.phone}` : ''}
                    </p>
                    {d.message && <p className="text-[11px] italic text-slate-400">“{d.message}”</p>}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Link href={`/receipt/${d.receiptNo}`} className="btn-ghost px-3 py-1.5 text-[11px]">
                      রসিদ
                    </Link>
                    {d.status === 'pending' ? (
                      <>
                        <button
                          type="button"
                          disabled={busyId === (d.id || d._id)}
                          onClick={() => reviewDonation(d.id || d._id, 'verified')}
                          className="btn-primary px-3 py-1.5 text-[11px]"
                        >
                          {busyId === (d.id || d._id) ? <Spinner /> : null} যাচাই করুন
                        </button>
                        <button
                          type="button"
                          disabled={busyId === (d.id || d._id)}
                          onClick={() => reviewDonation(d.id || d._id, 'rejected')}
                          className="btn px-3 py-1.5 text-[11px] border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                        >
                          বাতিল
                        </button>
                      </>
                    ) : (
                      <StatusBadge status={d.status} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {!loading && tab === 'seekers' && (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {['pending', 'approved', 'rejected', 'suspended'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeekerStatus(s)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                  seekerStatus === s ? 'bg-slate-700' : 'bg-slate-900'
                }`}
              >
                <StatusBadge status={s} />
              </button>
            ))}
          </div>

          {seekers.length === 0 ? (
            <EmptyState title="এই তালিকায় কিছু নেই" />
          ) : (
            <div className="glass-card divide-y divide-slate-800">
              {seekers.map((s) => (
                <div key={s.id || s._id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="flex min-w-0 flex-1 gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.avatarUrl || '/avatar-placeholder.svg'}
                      alt={s.name}
                      className="h-12 w-12 shrink-0 rounded-xl border border-slate-700 object-cover"
                    />
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-bold text-white">{s.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {s.categoryLabel} · 📍 {s.location?.address} · লক্ষ্য {taka(s.dailyTarget)}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {['bkash', 'nagad', 'rocket']
                          .filter((m) => s.payments?.[m])
                          .map((m) => `${METHOD_LABELS[m]}: ${s.payments[m]}`)
                          .join(' · ')}
                      </p>
                      {s.user && (
                        <p className="text-[11px] text-slate-500">
                          অ্যাকাউন্ট: {s.user.name} · {s.user.email}
                        </p>
                      )}
                      <p className="text-[11px] italic text-slate-400">“{s.story}”</p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {s.status !== 'approved' && (
                      <button
                        type="button"
                        disabled={busyId === (s.id || s._id)}
                        onClick={() => reviewSeeker(s.id || s._id, 'approved')}
                        className="btn-primary px-3 py-1.5 text-[11px]"
                      >
                        {busyId === (s.id || s._id) ? <Spinner /> : null} অনুমোদন
                      </button>
                    )}
                    {s.status !== 'rejected' && (
                      <button
                        type="button"
                        disabled={busyId === (s.id || s._id)}
                        onClick={() => reviewSeeker(s.id || s._id, 'rejected')}
                        className="btn px-3 py-1.5 text-[11px] border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                      >
                        বাতিল
                      </button>
                    )}
                    {s.status === 'approved' && (
                      <button
                        type="button"
                        disabled={busyId === (s.id || s._id)}
                        onClick={() => reviewSeeker(s.id || s._id, 'suspended')}
                        className="btn-ghost px-3 py-1.5 text-[11px]"
                      >
                        স্থগিত
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <RequireAuth role="admin">
      <AdminPanel />
    </RequireAuth>
  );
}
