'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Bits';
import ImageUploader from '@/components/ImageUploader';
import LocationPicker from '@/components/LocationPicker';
import QrCardModal from '@/components/QrCardModal';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/lib/auth';
import { api, ApiError } from '@/lib/api';
import { CATEGORIES } from '@/lib/constants';

const CATEGORY_OPTIONS = CATEGORIES.filter((c) => c.value !== 'all');

const EMPTY = {
  name: '',
  category: 'disabled',
  address: '',
  district: 'ঢাকা',
  lat: undefined,
  lng: undefined,
  accuracy: undefined,
  dailyTarget: '',
  bkash: '',
  nagad: '',
  rocket: '',
  story: '',
  dua: '',
  avatarUrl: '',
};

export default function RegisterSeekerPage() {
  const router = useRouter();
  const toast = useToast();
  const { user, loading: authLoading, refresh } = useAuth();

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((p) => ({ ...p, [key]: undefined }));
  };

  /** The picker owns the coordinates; the form just stores what it hands back. */
  const setCoords = ({ lat, lng, accuracy }) =>
    setForm((f) => ({ ...f, lat, lng, accuracy }));

  /** Reverse geocoding fills the address, but only where the person left it blank. */
  const fillAddressFromMap = ({ address, district }) =>
    setForm((f) => ({
      ...f,
      address: f.address.trim() ? f.address : address || f.address,
      district: district || f.district,
    }));

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        story: form.story.trim(),
        dua: form.dua.trim(),
        dailyTarget: Number(form.dailyTarget),
        location: {
          address: form.address.trim(),
          district: form.district.trim() || 'ঢাকা',
          ...(Number.isFinite(form.lat) ? { lat: form.lat } : {}),
          ...(Number.isFinite(form.lng) ? { lng: form.lng } : {}),
        },
        payments: {
          ...(form.bkash.trim() ? { bkash: form.bkash.trim() } : {}),
          ...(form.nagad.trim() ? { nagad: form.nagad.trim() } : {}),
          ...(form.rocket.trim() ? { rocket: form.rocket.trim() } : {}),
        },
        ...(form.avatarUrl ? { avatarUrl: form.avatarUrl } : {}),
      };

      const { data } = await api.createSeeker(payload);
      await refresh();
      setCreated(data);
      toast.success('প্রোফাইল তৈরি হয়েছে! যাচাইয়ের পর তালিকায় দেখা যাবে।');
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) {
        const mapped = {};
        for (const d of err.details) {
          const key = d.field.split('.').pop();
          mapped[key === 'address' || key === 'district' ? key : key] = d.message;
        }
        setErrors(mapped);
        toast.error('কিছু তথ্য ঠিক নেই, লাল লেখা দেখে ঠিক করুন।');
      } else if (err.status === 409) {
        toast.error('আপনার একটি প্রোফাইল ইতিমধ্যেই আছে।');
        router.push('/dashboard');
      } else {
        toast.error(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return <div className="py-20 text-center text-slate-400">লোড হচ্ছে…</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
        <div className="mb-3 text-4xl">🔐</div>
        <h1 className="text-xl font-bold text-white">রেজিস্ট্রেশনের আগে অ্যাকাউন্ট লাগবে</h1>
        <p className="mt-2 text-sm text-slate-400">
          প্রোফাইলটি যেন শুধু আপনিই সম্পাদনা করতে পারেন, তাই প্রথমে একটি অ্যাকাউন্ট খুলুন।
        </p>
        <div className="mt-6 flex gap-2">
          <Link href="/signup?role=seeker" className="btn-primary flex-1">অ্যাকাউন্ট খুলুন</Link>
          <Link href="/login" className="btn-ghost flex-1">লগ ইন</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">
        <div className="mb-8 space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-xl">
            🪪
          </div>
          <h1 className="text-2xl font-bold text-white">সাহায্যপ্রার্থী রেজিস্ট্রেশন ফরম</h1>
          <p className="text-sm text-slate-400">
            সরাসরি মোবাইল ব্যাংকিংয়ে সদকা পেতে নিচের তথ্যগুলো দিন। যাচাই শেষে প্রোফাইল প্রকাশিত হবে।
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <ImageUploader
            value={form.avatarUrl}
            onChange={(url) => setForm((f) => ({ ...f, avatarUrl: url }))}
            label="আপনার ছবি (ঐচ্ছিক, কিন্তু ছবি থাকলে মানুষ বেশি আস্থা রাখেন)"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="আপনার নাম / পরিচয়" required error={errors.name}>
              <Input value={form.name} onChange={set('name')} placeholder="যেমন: চাচ্চু কাসেম" error={errors.name} />
            </Field>
            <Field label="শ্রেণী / সাহায্য চাওয়ার কারণ" required error={errors.category}>
              <Select value={form.category} onChange={set('category')} error={errors.category}>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="নিয়মিত অবস্থান / এলাকা" required error={errors.address}>
              <Input value={form.address} onChange={set('address')} placeholder="যেমন: ফার্মগেট ওভারব্রিজ, ঢাকা" error={errors.address} />
            </Field>
            <Field label="জেলা" required error={errors.district}>
              <Input value={form.district} onChange={set('district')} placeholder="ঢাকা" error={errors.district} />
            </Field>
          </div>

          <LocationPicker
            value={{ lat: form.lat, lng: form.lng, accuracy: form.accuracy }}
            onChange={setCoords}
            onAddressFound={fillAddressFromMap}
          />
          {(errors.lat || errors.lng) && (
            <p className="field-error">{errors.lat || errors.lng}</p>
          )}

          <Field
            label="দৈনিক সদকা পাওয়ার লক্ষ্য (টাকা)"
            required
            hint="১০০ থেকে ২০,০০০ টাকার মধ্যে"
            error={errors.dailyTarget}
          >
            <Input
              type="number"
              min="100"
              max="20000"
              value={form.dailyTarget}
              onChange={set('dailyTarget')}
              placeholder="যেমন: 500"
              error={errors.dailyTarget}
            />
          </Field>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="mb-3 text-xs font-semibold text-slate-300">
              মোবাইল ব্যাংকিং নম্বর — অন্তত একটি দিতে হবে <span className="text-rose-400">*</span>
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="বিকাশ (ব্যক্তিগত)" error={errors.bkash}>
                <Input value={form.bkash} onChange={set('bkash')} placeholder="017XXXXXXXX" inputMode="numeric" maxLength={11} error={errors.bkash} />
              </Field>
              <Field label="নগদ" error={errors.nagad}>
                <Input value={form.nagad} onChange={set('nagad')} placeholder="018XXXXXXXX" inputMode="numeric" maxLength={11} error={errors.nagad} />
              </Field>
              <Field label="রকেট" error={errors.rocket}>
                <Input value={form.rocket} onChange={set('rocket')} placeholder="019XXXXXXXX" inputMode="numeric" maxLength={11} error={errors.rocket} />
              </Field>
            </div>
            {errors.payments && <p className="field-error mt-2">{errors.payments}</p>}
          </div>

          <Field
            label="আপনার অবস্থা / কেন সাহায্য প্রয়োজন"
            required
            hint="অন্তত ২০ অক্ষর। সত্য ও স্পষ্টভাবে লিখুন — যাচাইকারী এটি দেখে সিদ্ধান্ত নেবেন।"
            error={errors.story}
          >
            <Textarea
              rows={3}
              value={form.story}
              onChange={set('story')}
              placeholder="যেমন: দুর্ঘটনায় পা হারানোর পর কাজ করতে পারি না, প্রতিদিন ওষুধের টাকা প্রয়োজন..."
              error={errors.story}
            />
          </Field>

          <Field label="দানকারীকে দেওয়ার জন্য দোয়া" required error={errors.dua}>
            <Input
              value={form.dua}
              onChange={set('dua')}
              placeholder="যেমন: আল্লাহ্ আপনার হায়াত বৃদ্ধি করুন ও রিজিকে বরকত দিন।"
              error={errors.dua}
            />
          </Field>

          <button type="submit" disabled={submitting} className="btn-amber w-full py-3.5 text-base">
            {submitting ? <Spinner /> : null}
            {submitting ? 'জমা হচ্ছে…' : 'রেজিস্ট্রেশন সম্পন্ন করুন ও কিউআর কার্ড নিন'}
          </button>

          <p className="text-center text-[11px] leading-relaxed text-slate-500">
            জমা দেওয়ার পর প্রোফাইলটি যাচাইয়ের অপেক্ষায় থাকবে। যাচাই শেষ হলে এটি সবার তালিকায়
            দেখা যাবে ও সদকা গ্রহণ শুরু হবে।
          </p>
        </form>
      </div>

      {created && (
        <QrCardModal
          seeker={created}
          onClose={() => {
            setCreated(null);
            router.push('/dashboard');
          }}
        />
      )}
    </div>
  );
}
