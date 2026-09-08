'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Spinner } from '@/components/ui/Bits';
import { useToast } from '@/components/Toast';
import {
  getCurrentPosition,
  geoErrorMessage,
  isInsideBangladesh,
  reverseGeocode,
} from '@/lib/geo';
import { toBn } from '@/lib/bn';

const PinMap = dynamic(() => import('@/components/PinMap'), {
  ssr: false,
  loading: () => <div className="h-[260px] w-full animate-pulse rounded-2xl bg-slate-900" />,
});

/**
 * Replaces the raw latitude/longitude inputs. The person flips one switch, the
 * browser asks for permission, and the pin lands where they are — they can then
 * drag it if the fix is off. Typing coordinates is still possible, but it is
 * folded away because almost nobody knows theirs.
 */
export default function LocationPicker({ value, onChange, onAddressFound, disabled }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState(false);
  const [denied, setDenied] = useState(false);

  const { lat, lng, accuracy } = value || {};
  const hasFix = Number.isFinite(lat) && Number.isFinite(lng);
  const on = hasFix;

  const setPin = (nextLat, nextLng, nextAccuracy) => {
    onChange({ lat: nextLat, lng: nextLng, accuracy: nextAccuracy });
  };

  const lookupAddress = async (nextLat, nextLng) => {
    if (!onAddressFound) return;
    const found = await reverseGeocode(nextLat, nextLng);
    if (found?.address) onAddressFound(found);
  };

  const turnOn = async () => {
    setBusy(true);
    setDenied(false);
    try {
      const pos = await getCurrentPosition({ timeout: 12000 });

      if (!isInsideBangladesh(pos.lat, pos.lng)) {
        toast.error(
          'আপনার অবস্থান বাংলাদেশের বাইরে দেখাচ্ছে। ম্যাপে সঠিক জায়গায় পিন বসিয়ে দিন।'
        );
        setPin(23.7806, 90.4074, undefined);
        return;
      }

      setPin(pos.lat, pos.lng, pos.accuracy);
      toast.success('অবস্থান যোগ করা হয়েছে। প্রয়োজনে ম্যাপে পিন সরিয়ে ঠিক করুন।');
      lookupAddress(pos.lat, pos.lng);
    } catch (err) {
      if (err?.code === 1) setDenied(true);
      toast.error(geoErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const turnOff = () => {
    onChange({ lat: undefined, lng: undefined, accuracy: undefined });
    setManual(false);
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      {/* Switch */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-200">ম্যাপে আমার অবস্থান দেখান</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
            চালু করলে দাতারা লাইভ ম্যাপে আপনাকে খুঁজে পাবেন। বন্ধ থাকলেও তালিকায় আপনি থাকবেন।
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="ম্যাপে অবস্থান দেখান"
          disabled={disabled || busy}
          onClick={on ? turnOff : turnOn}
          className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
            on ? 'bg-emerald-500' : 'bg-slate-700'
          }`}
        >
          <span
            className={`absolute top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] transition-all ${
              on ? 'left-6' : 'left-1'
            }`}
          >
            {busy ? <Spinner className="h-3 w-3 text-slate-600" /> : null}
          </span>
        </button>
      </div>

      {busy && !hasFix && (
        <p className="mt-3 text-xs text-emerald-400">
          অবস্থান খোঁজা হচ্ছে… একটু অপেক্ষা করুন। (সর্বোচ্চ ১২ সেকেন্ড)
        </p>
      )}

      {denied && !hasFix && (
        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] leading-relaxed text-amber-200">
          <p className="font-semibold">অবস্থানের অনুমতি বন্ধ আছে</p>
          <p className="mt-1">
            ব্রাউজারের ঠিকানা বারের বাঁ পাশে 🔒 বা ⓘ চিহ্নে চাপ দিন → <strong>Location</strong> →{' '}
            <strong>Allow</strong> করুন, তারপর আবার সুইচটি চালু করুন।
          </p>
          <button
            type="button"
            onClick={() => {
              setDenied(false);
              setManual(true);
            }}
            className="mt-2 font-semibold text-amber-300 underline"
          >
            অথবা ম্যাপে নিজেই পিন বসাই
          </button>
        </div>
      )}

      {(hasFix || manual) && (
        <div className="mt-4 space-y-3">
          <PinMap lat={lat} lng={lng} accuracy={accuracy} onPick={(a, b) => {
            setPin(a, b, undefined);
            lookupAddress(a, b);
          }} />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-slate-400">
              📍 ম্যাপে চাপ দিয়ে বা পিন টেনে সঠিক জায়গায় বসান।
              {accuracy ? ` (নির্ভুলতা প্রায় ${toBn(accuracy)} মিটার)` : ''}
            </p>
            <button
              type="button"
              onClick={turnOn}
              disabled={busy}
              className="btn-ghost px-3 py-1.5 text-[11px]"
            >
              {busy ? <Spinner /> : null} আবার আমার অবস্থান নিন
            </button>
          </div>

          {!hasFix && manual && (
            <p className="text-[11px] text-amber-300">
              ম্যাপে চাপ দিয়ে আপনার জায়গাটি বেছে নিন।
            </p>
          )}
        </div>
      )}

      {/*
        Kept visible even while the GPS is still searching: on a phone with no
        signal getCurrentPosition can sit there for the full timeout, and the
        person needs a way out that does not involve waiting.
      */}
      {!hasFix && !manual && !denied && (
        <button
          type="button"
          onClick={() => setManual(true)}
          className="mt-3 text-[11px] text-slate-500 underline hover:text-slate-300"
        >
          অথবা ম্যাপে নিজেই পিন বসাই
        </button>
      )}
    </div>
  );
}
