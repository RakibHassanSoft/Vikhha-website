'use client';

import { useState } from 'react';
import { Field, Input, Select } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Bits';
import { useToast } from '@/components/Toast';
import { api } from '@/lib/api';
import { speakBangla, stopSpeaking } from '@/lib/speech';
import { DUA_OCCASIONS } from '@/lib/constants';

const PRESETS = [
  { tone: 'text-teal-400', title: 'সাধারণ সদকা দোয়া', text: 'আল্লাহ্ আপনার দান কবুল করুন এবং আপনার ধনসম্পদে বরকত দিন!' },
  { tone: 'text-amber-400', title: 'দীর্ঘায়ু ও শেফা', text: 'আল্লাহ্ আপনার হায়াত দরাজ করুক এবং পরিবারের সবাইকে বিপদ-আপদ থেকে রক্ষা করুক!' },
  { tone: 'text-rose-400', title: 'মা-বাবার মাগফিরাত', text: 'হে আল্লাহ্, এই দানকারীর মা-বাবাকে মাফ করে দিন এবং জান্নাতুল ফেরদাউস নসিব করুন!' },
  { tone: 'text-emerald-400', title: 'ব্যবসায় বরকত', text: 'আল্লাহ্ আপনার ব্যবসায় তরক্কী দান করুক এবং অভাব দূর করে দিক!' },
];

export default function DuaStudioPage() {
  const toast = useToast();
  const [occasion, setOccasion] = useState('general');
  const [tone, setTone] = useState('warm');
  const [donorName, setDonorName] = useState('');
  const [generated, setGenerated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [custom, setCustom] = useState('');

  const speak = (text) => {
    const res = speakBangla(text);
    if (!res.ok) toast.error('আপনার ব্রাউজারে বাংলা ভয়েস সাপোর্ট নেই।');
  };

  const generate = async () => {
    setLoading(true);
    try {
      const { data } = await api.dua({
        occasion,
        tone,
        donorName: donorName.trim() || undefined,
      });
      setGenerated(data);
      speak(data.text);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
              🔊 দোয়া ও আশীর্বাদ স্টুডিও
            </h1>
            <p className="text-xs text-slate-400">
              যেকোনো দানের জন্য তাৎক্ষণিক বাংলা দোয়া তৈরি করুন ও কণ্ঠে শুনুন।
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs text-teal-400">
            AI দোয়া ইঞ্জিন
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="দোয়ার ধরন">
            <Select value={occasion} onChange={(e) => setOccasion(e.target.value)}>
              {DUA_OCCASIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="ভাষার ধরন">
            <Select value={tone} onChange={(e) => setTone(e.target.value)}>
              <option value="short">সংক্ষিপ্ত</option>
              <option value="warm">আন্তরিক</option>
              <option value="formal">আনুষ্ঠানিক</option>
            </Select>
          </Field>

          <Field label="দানকারীর নাম (ঐচ্ছিক)">
            <Input
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              placeholder="যেমন: রাকিব"
            />
          </Field>
        </div>

        <button type="button" onClick={generate} disabled={loading} className="btn-primary mt-4 w-full py-3">
          {loading ? <Spinner /> : null}
          {loading ? 'দোয়া তৈরি হচ্ছে…' : 'দোয়া তৈরি করুন ও শুনুন'}
        </button>

        {generated && (
          <div className="mt-5 rounded-2xl border border-teal-500/30 bg-teal-500/5 p-5">
            <p className="text-base italic leading-relaxed text-teal-100">“{generated.text}”</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                উৎস: {generated.source === 'gemini' ? 'Gemini AI' : 'নির্বাচিত দোয়া সংগ্রহ'}
              </span>
              <div className="flex gap-2">
                <button type="button" onClick={() => speak(generated.text)} className="btn-ghost px-3 py-1.5 text-xs">
                  🔊 আবার শুনুন
                </button>
                <button type="button" onClick={stopSpeaking} className="btn-ghost px-3 py-1.5 text-xs">
                  ⏹ থামান
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
        <h2 className="mb-4 text-lg font-bold text-white">প্রস্তুত দোয়া</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {PRESETS.map((p) => (
            <button
              key={p.title}
              type="button"
              onClick={() => speak(p.text)}
              className="group rounded-2xl border border-slate-800 bg-slate-950 p-4 text-left transition-all hover:border-teal-500/50"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className={`text-xs font-semibold ${p.tone}`}>{p.title}</span>
                <span className={`${p.tone} transition-transform group-hover:scale-110`}>▶</span>
              </div>
              <p className="text-sm text-slate-200">“{p.text}”</p>
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-3 rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <label className="block text-xs text-slate-400" htmlFor="custom-dua">
            নিজের পছন্দের দোয়া লিখে শুনুন
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="custom-dua"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="এখানে আপনার কাঙ্ক্ষিত দোয়ার লেখা লিখুন..."
              className="field-input flex-1"
            />
            <button
              type="button"
              onClick={() => (custom.trim() ? speak(custom) : toast.error('দোয়ার লেখা লিখুন।'))}
              className="btn-primary px-5"
            >
              🔊 প্লে করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
