'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Field, Input } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Bits';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
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
      const user = await login(form);
      toast.success(`স্বাগতম, ${user.name}!`);
      router.push(user.role === 'admin' ? '/admin' : user.role === 'seeker' ? '/dashboard' : '/');
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
    <div className="mx-auto max-w-md">
      <form onSubmit={submit} className="space-y-5 rounded-3xl border border-slate-800 bg-slate-900 p-8">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-white">লগ ইন করুন</h1>
          <p className="text-sm text-slate-400">অ্যাকাউন্টে ঢুকে প্রোফাইল ও দান পরিচালনা করুন।</p>
        </div>

        <Field label="ইমেইল" required error={errors.email}>
          <Input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" error={errors.email} />
        </Field>

        <Field label="পাসওয়ার্ড" required error={errors.password}>
          <Input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" autoComplete="current-password" error={errors.password} />
        </Field>

        <button type="submit" disabled={busy} className="btn-primary w-full py-3">
          {busy ? <Spinner /> : null}
          {busy ? 'অপেক্ষা করুন…' : 'লগ ইন'}
        </button>

        <p className="text-center text-xs text-slate-400">
          অ্যাকাউন্ট নেই?{' '}
          <Link href="/signup" className="font-semibold text-emerald-400 hover:underline">
            নতুন অ্যাকাউন্ট খুলুন
          </Link>
        </p>
      </form>
    </div>
  );
}
