'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import QrCardModal from '@/components/QrCardModal';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { ProgressBar, StatusBadge, Spinner, EmptyState, ErrorState } from '@/components/ui/Bits';
import ImageUploader from '@/components/ImageUploader';
import LiveLocationToggle from '@/components/LiveLocationToggle';
import LocationPicker from '@/components/LocationPicker';
import { useToast } from '@/components/Toast';
import { api, ApiError } from '@/lib/api';
import { taka, bnNumber, bnDateTime } from '@/lib/bn';
import { METHOD_LABELS } from '@/lib/constants';

function Dashboard() {
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [donations, setDonations] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.myProfile();
      setProfile(data.seeker);
      setPendingCount(data.pendingDonations || 0);
      setError(null);
      const list = await api.receivedDonations({ page: 1, limit: 30 });
      setDonations(list.data || []);
    } catch (err) {
      setError(err.status === 404 ? 'notfound' : err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = () => {
    setErrors({});
    setEdit({
      story: profile.story,
      dua: profile.dua,
      dailyTarget: String(profile.dailyTarget),
      address: profile.location?.address || '',
      district: profile.location?.district || '',
      lat: profile.location?.lat,
      lng: profile.location?.lng,
      accuracy: profile.location?.accuracy,
      avatarUrl: profile.avatarUrl || '',
    });
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await api.updateSeeker(profile.id || profile._id, {
        story: edit.story.trim(),
        dua: edit.dua.trim(),
        dailyTarget: Number(edit.dailyTarget),
        location: {
          address: edit.address.trim(),
          district: edit.district.trim() || 'ঢাকা',
          ...(Number.isFinite(edit.lat) ? { lat: edit.lat } : {}),
          ...(Number.isFinite(edit.lng) ? { lng: edit.lng } : {}),
        },
        ...(edit.avatarUrl ? { avatarUrl: edit.avatarUrl } : {}),
      });
      toast.success('প্রোফাইল হালনাগাদ হয়েছে।');
      setEdit(null);
      load();
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) {
        setErrors(Object.fromEntries(err.details.map((d) => [d.field.split('.').pop(), d.message])));
      } else {
        toast.error(err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-20 text-center text-slate-400">লোড হচ্ছে…</div>;

  if (error === 'notfound') {
    return (
      <EmptyState
        title="আপনার এখনো কোনো প্রোফাইল নেই"
        description="সদকা গ্রহণ শুরু করতে সাহায্যপ্রার্থী প্রোফাইল তৈরি করুন।"
        action={<Link href="/register" className="btn-amber">প্রোফাইল তৈরি করুন</Link>}
      />
    );
  }
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <section className="glass-card p-6">
        <div className="flex flex-col gap-5 sm:flex-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile.avatarUrl || '/avatar-placeholder.svg'}
            alt={profile.name}
            className="h-24 w-24 shrink-0 rounded-3xl border border-slate-700 object-cover"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-white">{profile.name}</h1>
              <StatusBadge status={profile.status} />
            </div>
            <p className="text-sm text-slate-400">📍 {profile.location?.address}</p>
            {profile.statusNote && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
                {profile.statusNote}
              </p>
            )}
            {profile.status === 'pending' && (
              <p className="text-xs text-amber-400">
                প্রোফাইল যাচাইয়ের অপেক্ষায় আছে — অনুমোদনের পর তালিকায় দেখা যাবে।
              </p>
            )}
          </div>
        </div>

        <div className="mt-5">
          <ProgressBar collected={profile.stats?.collectedToday || 0} target={profile.dailyTarget} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['আজকের সংগ্রহ', taka(profile.stats?.collectedToday || 0), 'text-emerald-400'],
            ['সর্বমোট সংগ্রহ', taka(profile.stats?.collectedTotal || 0), 'text-white'],
            ['মোট দাতা', `${bnNumber(profile.stats?.donationCount || 0)} জন`, 'text-white'],
            ['যাচাইয়ের অপেক্ষায়', `${bnNumber(pendingCount)}টি`, 'text-amber-400'],
          ].map(([label, value, tone]) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-center">
              <span className="block text-[11px] text-slate-400">{label}</span>
              <span className={`mt-1 block text-base font-bold ${tone}`}>{value}</span>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <LiveLocationToggle
            profile={profile}
            onUpdated={(data) =>
              setProfile((prev) =>
                prev ? { ...prev, location: data.location, live: data.live, isLive: data.isLive } : prev
              )
            }
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={() => setQrOpen(true)} className="btn-ghost text-xs">▦ কিউআর কার্ড</button>
          <button type="button" onClick={startEdit} className="btn-ghost text-xs">✎ তথ্য সম্পাদনা</button>
          {profile.status === 'approved' && (
            <Link href={`/seekers/${encodeURIComponent(profile.slug)}`} className="btn-ghost text-xs">
              🌐 পাবলিক প্রোফাইল
            </Link>
          )}
        </div>
      </section>

      {edit && (
        <form onSubmit={save} className="glass-card space-y-4 p-6">
          <h2 className="text-base font-bold text-white">তথ্য সম্পাদনা</h2>
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-300">
            তথ্য বদলালে প্রোফাইলটি আবার যাচাইয়ের জন্য পাঠানো হবে।
          </p>

          <ImageUploader
            value={edit.avatarUrl}
            onChange={(url) => setEdit((f) => ({ ...f, avatarUrl: url }))}
            label="ছবি"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="অবস্থান" required error={errors.address}>
              <Input value={edit.address} onChange={(e) => setEdit((f) => ({ ...f, address: e.target.value }))} error={errors.address} />
            </Field>
            <Field label="জেলা" required error={errors.district}>
              <Input value={edit.district} onChange={(e) => setEdit((f) => ({ ...f, district: e.target.value }))} error={errors.district} />
            </Field>
          </div>

          <LocationPicker
            value={{ lat: edit.lat, lng: edit.lng, accuracy: edit.accuracy }}
            onChange={({ lat, lng, accuracy }) => setEdit((f) => ({ ...f, lat, lng, accuracy }))}
            onAddressFound={({ address, district }) =>
              setEdit((f) => ({ ...f, address: address || f.address, district: district || f.district }))
            }
          />

          <Field label="দৈনিক লক্ষ্য (টাকা)" required error={errors.dailyTarget}>
            <Input
              type="number"
              min="100"
              max="20000"
              value={edit.dailyTarget}
              onChange={(e) => setEdit((f) => ({ ...f, dailyTarget: e.target.value }))}
              error={errors.dailyTarget}
            />
          </Field>

          <Field label="আপনার অবস্থা" required error={errors.story}>
            <Textarea rows={3} value={edit.story} onChange={(e) => setEdit((f) => ({ ...f, story: e.target.value }))} error={errors.story} />
          </Field>

          <Field label="দোয়া" required error={errors.dua}>
            <Input value={edit.dua} onChange={(e) => setEdit((f) => ({ ...f, dua: e.target.value }))} error={errors.dua} />
          </Field>

          <div className="flex gap-2">
            <button type="button" onClick={() => setEdit(null)} className="btn-ghost flex-1">বাতিল</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? <Spinner /> : null}
              {saving ? 'সংরক্ষণ হচ্ছে…' : 'সংরক্ষণ করুন'}
            </button>
          </div>
        </form>
      )}

      <section className="glass-card p-6">
        <h2 className="mb-4 text-base font-bold text-white">আমার পাওয়া দান</h2>
        {donations.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-800 py-8 text-center text-sm text-slate-500">
            এখনো কোনো দান আসেনি।
          </p>
        ) : (
          <div className="divide-y divide-slate-800">
            {donations.map((d) => (
              <div key={d.receiptNo} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-200">
                    {d.donor?.name || 'নাম প্রকাশে অনিচ্ছুক'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {bnDateTime(d.createdAt)} · {METHOD_LABELS[d.method]} ·{' '}
                    <span className="font-mono">{d.trxId}</span>
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
      </section>

      {qrOpen && <QrCardModal seeker={profile} onClose={() => setQrOpen(false)} />}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth role="seeker">
      <Dashboard />
    </RequireAuth>
  );
}
