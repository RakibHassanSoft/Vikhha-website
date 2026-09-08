'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Spinner } from '@/components/ui/Bits';
import { useToast } from '@/components/Toast';
import { api } from '@/lib/api';
import { geoErrorMessage, isInsideBangladesh, distanceMetres } from '@/lib/geo';
import { toBn, timeAgoBn } from '@/lib/bn';

/** Send at most one ping every 30s, and only after moving 20m or so. */
const MIN_INTERVAL_MS = 30 * 1000;
const MIN_MOVE_METRES = 20;
/** Stop on its own after two hours so a forgotten switch cannot run all night. */
const AUTO_STOP_MS = 2 * 60 * 60 * 1000;

export default function LiveLocationToggle({ profile, onUpdated }) {
  const toast = useToast();

  const [sharing, setSharing] = useState(Boolean(profile?.isLive));
  const [starting, setStarting] = useState(false);
  const [lastSentAt, setLastSentAt] = useState(profile?.live?.lastPingAt || null);
  const [accuracy, setAccuracy] = useState(profile?.location?.accuracy);
  const [error, setError] = useState(null);

  const watchId = useRef(null);
  const lastSent = useRef({ at: 0, coords: null });
  const stopTimer = useRef(null);

  const clearWatch = useCallback(() => {
    if (watchId.current !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (stopTimer.current) {
      clearTimeout(stopTimer.current);
      stopTimer.current = null;
    }
  }, []);

  // Always release the GPS watch when this screen goes away.
  useEffect(() => clearWatch, [clearWatch]);

  const push = useCallback(
    async (coords) => {
      try {
        const { data } = await api.updateMyLocation({
          lat: coords.lat,
          lng: coords.lng,
          accuracy: coords.accuracy,
          isSharing: true,
        });
        lastSent.current = { at: Date.now(), coords };
        setLastSentAt(data?.live?.lastPingAt || new Date().toISOString());
        setAccuracy(coords.accuracy);
        setError(null);
        onUpdated?.(data);
      } catch (err) {
        setError(err.message);
      }
    },
    [onUpdated]
  );

  const stop = useCallback(
    async ({ silent } = {}) => {
      clearWatch();
      setSharing(false);
      try {
        await api.stopSharingLocation();
        if (!silent) toast.info('লাইভ অবস্থান শেয়ার বন্ধ করা হয়েছে।');
      } catch (err) {
        if (!silent) toast.error(err.message);
      }
    },
    [clearWatch, toast]
  );

  const start = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.error('আপনার ব্রাউজার অবস্থান শেয়ারিং সমর্থন করে না।');
      return;
    }

    setStarting(true);
    setError(null);

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracy: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : undefined,
        };

        if (!isInsideBangladesh(coords.lat, coords.lng)) {
          setError('আপনার অবস্থান বাংলাদেশের বাইরে দেখাচ্ছে, তাই পাঠানো হয়নি।');
          setStarting(false);
          return;
        }

        const sinceLast = Date.now() - lastSent.current.at;
        const moved = distanceMetres(lastSent.current.coords, coords);
        const first = !lastSent.current.coords;

        if (first || (sinceLast > MIN_INTERVAL_MS && moved > MIN_MOVE_METRES)) {
          push(coords);
        }

        if (first) {
          setSharing(true);
          setStarting(false);
          toast.success('লাইভ অবস্থান চালু হয়েছে। দাতারা এখন ম্যাপে আপনাকে দেখতে পাবেন।');
          stopTimer.current = setTimeout(() => {
            stop({ silent: true });
            toast.info('২ ঘণ্টা পার হওয়ায় লাইভ অবস্থান নিজে থেকেই বন্ধ হয়েছে।');
          }, AUTO_STOP_MS);
        }
      },
      (err) => {
        setStarting(false);
        setSharing(false);
        clearWatch();
        toast.error(geoErrorMessage(err));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
    );
  }, [clearWatch, push, stop, toast]);

  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${
        sharing ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-800 bg-slate-950/60'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            {sharing && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-emerald-400" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
            )}
            লাইভ অবস্থান শেয়ার
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
            {sharing
              ? 'আপনি এখন লাইভ ম্যাপে দেখাচ্ছেন। জায়গা বদলালে অবস্থান নিজে থেকেই আপডেট হবে।'
              : 'চালু করলে আপনি যেখানে আছেন দাতারা সেখানেই আপনাকে ম্যাপে দেখতে পাবেন।'}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={sharing}
          aria-label="লাইভ অবস্থান শেয়ার"
          disabled={starting}
          onClick={() => (sharing ? stop() : start())}
          className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
            sharing ? 'bg-emerald-500' : 'bg-slate-700'
          }`}
        >
          <span
            className={`absolute top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white transition-all ${
              sharing ? 'left-6' : 'left-1'
            }`}
          >
            {starting ? <Spinner className="h-3 w-3 text-slate-600" /> : null}
          </span>
        </button>
      </div>

      {starting && (
        <p className="mt-3 text-xs text-emerald-400">জিপিএস সিগন্যাল নেওয়া হচ্ছে…</p>
      )}

      {sharing && lastSentAt && (
        <p className="mt-3 text-[11px] text-slate-400">
          সর্বশেষ আপডেট: <strong className="text-emerald-400">{timeAgoBn(lastSentAt)}</strong>
          {accuracy ? ` · নির্ভুলতা প্রায় ${toBn(accuracy)} মিটার` : ''}
        </p>
      )}

      {error && <p className="mt-3 text-[11px] text-rose-400">{error}</p>}

      <p className="mt-3 rounded-lg bg-slate-950/70 p-2.5 text-[10px] leading-relaxed text-slate-500">
        🔒 আপনার অবস্থান শুধু চালু থাকা অবস্থাতেই দেখা যায়। বন্ধ করলে সাথে সাথেই লাইভ ম্যাপ থেকে
        সরে যায়, আর ১০ মিনিট কোনো আপডেট না এলে নিজে থেকেই বন্ধ হয়ে যায়। ২ ঘণ্টা পর স্বয়ংক্রিয়ভাবে
        বন্ধ হবে।
      </p>
    </div>
  );
}
