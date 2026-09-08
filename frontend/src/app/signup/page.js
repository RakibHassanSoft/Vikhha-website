'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Field, Input } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Bits';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const { register } = useAuth();

  const [role, setRole] = useState(params.get('role') === 'seeker' ? 'seeker' : 'donor');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const user = await register({
        ...form,
        phone: form.phone.trim() || undefined,
        role,
      });
      toast.success('অ্যাকাউন্ট তৈরি হয়েছে!');
      router.push(user.role === 'seeker' ? '/register' : '/');
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) {
        setErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
      } else {
        toast.error(err.message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5 rounded-3xl border border-slate-800 bg-slate-900 p-8">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold text-white">নতুন অ্যাকাউন্ট</h1>
        <p className="text-sm text-slate-400">আপনি কী করতে চান তা বেছে নিন।</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { value: 'donor', title: 'দান করতে চাই', sub: 'দাতা' },
          { value: 'seeker', title: 'সাহায্য চাই', sub: 'সাহায্যপ্রার্থী' },
        ].map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setRole(opt.value)}
            className={`rounded-2xl border-2 p-3 text-center transition-all ${
              role === opt.value
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-600'
            }`}
          >
            <span className="block text-sm font-bold">{opt.title}</span>
            <span className="text-[11px] text-slate-400">{opt.sub}</span>
          </button>
        ))}
      </div>

      <Field label="নাম" required error={errors.name}>
        <Input value={form.name} onChange={set('name')} placeholder="আপনার পূর্ণ নাম" error={errors.name} />
      </Field>

      <Field label="ইমেইল" required error={errors.email}>
        <Input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" error={errors.email} />
      </Field>

      <Field label="মোবাইল নম্বর (ঐচ্ছিক)" error={errors.phone}>
        <Input value={form.phone} onChange={set('phone')} placeholder="01712345678" inputMode="numeric" maxLength={11} error={errors.phone} />
      </Field>

      <Field label="পাসওয়ার্ড" required hint="অন্তত ৮ অক্ষর" error={errors.password}>
        <Input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" autoComplete="new-password" error={errors.password} />
      </Field>

      <button type="submit" disabled={busy} className="btn-primary w-full py-3">
        {busy ? <Spinner /> : null}
        {busy ? 'তৈরি হচ্ছে…' : 'অ্যাকাউন্ট খুলুন'}
      </button>

      <p className="text-center text-xs text-slate-400">
        আগে থেকেই অ্যাকাউন্ট আছে?{' '}
        <Link href="/login" className="font-semibold text-emerald-400 hover:underline">লগ ইন করুন</Link>
      </p>
    </form>
  );
}

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md">
      <Suspense fallback={<div className="py-20 text-center text-slate-400">লোড হচ্ছে…</div>}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
