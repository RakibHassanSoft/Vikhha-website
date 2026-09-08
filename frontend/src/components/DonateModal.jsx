'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Modal from '@/components/Modal';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Bits';
import { useToast } from '@/components/Toast';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { speakBangla } from '@/lib/speech';
import { taka, toBn } from '@/lib/bn';
import { METHODS, METHOD_LABELS, TRX_HINTS, QUICK_AMOUNTS } from '@/lib/constants';

const METHOD_STYLES = {
  bkash: 'border-bkash bg-bkash/10 text-bkash',
  nagad: 'border-nagad bg-nagad/10 text-nagad',
  rocket: 'border-rocket bg-rocket/10 text-rocket',
};

export default function DonateModal({ seeker, onClose, onDone }) {
  const toast = useToast();
  const { user } = useAuth();

  const available = useMemo(
    () => METHODS.filter((m) => seeker?.payments?.[m.value]),
    [seeker]
  );

  const [step, setStep] = useState(1);
  const [method, setMethod] = useState(available[0]?.value || 'bkash');
  const [amount, setAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState('');
  const [form, setForm] = useState({
    senderNumber: user?.phone || '',
    trxId: '',
    donorName: user?.name || '',
    message: '',
    isAnonymous: false,
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  if (!seeker) return null;

  const finalAmount = customAmount ? Number(customAmount) : amount;
  const receiver = seeker.payments?.[method];

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(receiver);
      toast.success('নম্বরটি কপি হয়েছে।');
    } catch {
      toast.info(`নম্বর: ${receiver}`);
    }
  };

  const goToStep2 = () => {
    if (!finalAmount || finalAmount < 1) {
      toast.error('সঠিক টাকার পরিমাণ লিখুন।');
      return;
    }
    setStep(2);
  };

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);
    try {
      const { data } = await api.donate({
        seekerId: seeker.id || seeker._id,
        amount: finalAmount,
        method,
        senderNumber: form.senderNumber.trim(),
        trxId: form.trxId.trim().toUpperCase(),
        donorName: form.isAnonymous ? undefined : form.donorName.trim() || undefined,
        isAnonymous: form.isAnonymous,
        message: form.message.trim() || undefined,
      });

      setResult(data);
      setStep(3);
      speakBangla(data.dua?.text);
      onDone?.(data);
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) {
        setErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
        toast.error('কিছু তথ্য ঠিক নেই, লাল লেখা দেখে ঠিক করুন।');
      } else {
        toast.error(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      onClose={onClose}
      title={seeker.name}
      subtitle={seeker.location?.address}
      avatar={seeker.avatarUrl}
      size="md"
    >
      {/* Step indicator */}
      {step < 3 && (
        <ol className="mb-5 flex items-center gap-2 text-[11px] font-semibold">
          {['পরিমাণ ও মাধ্যম', 'টাকা পাঠান ও আইডি দিন'].map((label, i) => (
            <li
              key={label}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-center ${
                step === i + 1
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : 'border-slate-800 bg-slate-950 text-slate-500'
              }`}
            >
              {toBn(i + 1)}. {label}
            </li>
          ))}
        </ol>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <div>
            <span className="field-label">সদকার পরিমাণ নির্বাচন করুন (৳)</span>
            <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setAmount(amt);
                    setCustomAmount('');
                  }}
                  className={`rounded-xl border px-2 py-2 text-sm font-bold transition-colors ${
                    !customAmount && amount === amt
                      ? 'border-emerald-500 bg-emerald-600 text-white'
                      : 'border-slate-700 bg-slate-800 text-emerald-400 hover:border-emerald-500'
                  }`}
                >
                  {taka(amt)}
                </button>
              ))}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 font-bold text-slate-400">৳</span>
              <input
                type="number"
                min="1"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="অন্য যেকোনো পরিমাণ লিখুন..."
                className="field-input pl-8 font-bold"
              />
            </div>
          </div>

          <div>
            <span className="field-label">পেমেন্ট মাধ্যম</span>
            <div className="grid grid-cols-3 gap-2">
              {available.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMethod(m.value)}
                  className={`flex flex-col items-center gap-0.5 rounded-xl border-2 p-2.5 text-xs font-bold transition-all ${
                    method === m.value
                      ? METHOD_STYLES[m.value]
                      : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <span className="text-sm font-extrabold">{m.latin}</span>
                  <span className="text-[10px] text-slate-400">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button type="button" onClick={goToStep2} className="btn-primary w-full py-3.5 text-base">
            {taka(finalAmount || 0)} পাঠানোর নিয়ম দেখুন →
          </button>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={submit} className="space-y-5">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="text-sm font-bold text-amber-300">
              ধাপ ১ — নিজের {METHOD_LABELS[method]} অ্যাপ থেকে টাকা পাঠান
            </p>
            <ol className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-300">
              <li>
                ১. {METHOD_LABELS[method]} অ্যাপ খুলে <strong>Send Money</strong> নির্বাচন করুন।
              </li>
              <li className="flex flex-wrap items-center gap-2">
                ২. এই নম্বরে
                <span className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-sm font-bold text-white">
                  {receiver}
                </span>
                <button type="button" onClick={copyNumber} className="btn-ghost px-2 py-1 text-[11px]">
                  কপি
                </button>
                <strong className="text-emerald-400">{taka(finalAmount)}</strong> পাঠান।
              </li>
              <li>৩. পাঠানো শেষে যে ট্রানজেকশন আইডি (TrxID) পাবেন, নিচে সেটি লিখুন।</li>
            </ol>
            <p className="mt-3 rounded-lg bg-slate-950/70 p-2 text-[11px] text-slate-400">
              🔒 এই সাইট কখনো আপনার পিন চায় না এবং আপনার টাকা এই সাইটের মধ্য দিয়ে যায় না। টাকা
              সরাসরি সাহায্যপ্রার্থীর নম্বরে যায়।
            </p>
          </div>

          <p className="text-sm font-bold text-slate-200">ধাপ ২ — লেনদেনের তথ্য দিন</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="আপনার যে নম্বর থেকে পাঠিয়েছেন" required error={errors.senderNumber}>
              <Input
                value={form.senderNumber}
                onChange={set('senderNumber')}
                placeholder="01712345678"
                inputMode="numeric"
                maxLength={11}
                error={errors.senderNumber}
              />
            </Field>

            <Field
              label="ট্রানজেকশন আইডি (TrxID)"
              required
              hint={TRX_HINTS[method]}
              error={errors.trxId}
            >
              <Input
                value={form.trxId}
                onChange={set('trxId')}
                placeholder="9F3KL2QX7A"
                className="font-mono uppercase"
                error={errors.trxId}
              />
            </Field>
          </div>

          <Field label="আপনার নাম" error={errors.donorName}>
            <Input
              value={form.donorName}
              onChange={set('donorName')}
              placeholder="যেমন: রাকিব হাসান"
              disabled={form.isAnonymous}
              error={errors.donorName}
            />
          </Field>

          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={form.isAnonymous}
              onChange={set('isAnonymous')}
              className="h-4 w-4 rounded border-slate-700 bg-slate-950 accent-emerald-500"
            />
            নাম প্রকাশ করতে চাই না
          </label>

          <Field label="বার্তা (ঐচ্ছিক)" error={errors.message}>
            <Textarea
              rows={2}
              value={form.message}
              onChange={set('message')}
              placeholder="দোয়া করবেন..."
              error={errors.message}
            />
          </Field>

          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(1)} className="btn-ghost flex-1">
              ← পেছনে
            </button>
            <button type="submit" disabled={submitting} className="btn-primary flex-[2] py-3.5">
              {submitting ? <Spinner /> : null}
              {submitting ? 'জমা হচ্ছে…' : `${taka(finalAmount)} দান জমা দিন`}
            </button>
          </div>
        </form>
      )}

      {step === 3 && result && (
        <div className="space-y-5 text-center">
          <div className="text-5xl">🤲</div>
          <div>
            <h3 className="text-lg font-bold text-emerald-400">দান জমা হয়েছে</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{result.notice}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-left text-xs">
            <div className="flex justify-between py-1">
              <span className="text-slate-400">রসিদ নম্বর</span>
              <span className="font-mono font-bold text-white">{result.donation.receiptNo}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">পরিমাণ</span>
              <span className="font-bold text-emerald-400">{taka(result.donation.amount)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">মাধ্যম</span>
              <span className="font-bold text-white">{METHOD_LABELS[result.donation.method]}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">TrxID</span>
              <span className="font-mono text-white">{result.donation.trxId}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">অবস্থা</span>
              <span className="font-bold text-amber-400">যাচাই চলছে</span>
            </div>
          </div>

          <blockquote className="rounded-2xl border border-teal-500/30 bg-teal-500/5 p-4 text-sm italic leading-relaxed text-teal-200">
            “{result.dua?.text}”
          </blockquote>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => speakBangla(result.dua?.text)}
              className="btn-ghost flex-1 text-xs"
            >
              🔊 দোয়া শুনুন
            </button>
            <Link
              href={`/receipt/${result.donation.receiptNo}`}
              className="btn-primary flex-1 text-xs"
            >
              রসিদ দেখুন
            </Link>
          </div>

          <button type="button" onClick={onClose} className="text-xs text-slate-500 hover:text-slate-300">
            বন্ধ করুন
          </button>
        </div>
      )}
    </Modal>
  );
}
