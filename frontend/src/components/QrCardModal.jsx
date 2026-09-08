'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import { SITE_URL } from '@/lib/api';
import { useToast } from '@/components/Toast';

export default function QrCardModal({ seeker, onClose }) {
  const toast = useToast();
  const [origin, setOrigin] = useState(SITE_URL);

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin);
  }, []);

  if (!seeker) return null;

  const profileUrl = `${origin}/seekers/${encodeURIComponent(seeker.slug)}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=${encodeURIComponent(profileUrl)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      toast.success('প্রোফাইল লিংক কপি হয়েছে।');
    } catch {
      toast.error('কপি করা যায়নি, লিংকটি হাতে কপি করুন।');
    }
  };

  return (
    <Modal onClose={onClose} title="ডিজিটাল সদকা কিউআর কার্ড" size="sm">
      <div className="space-y-4 text-center">
        <div className="space-y-4 rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-800 to-slate-950 p-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={seeker.avatarUrl || '/avatar-placeholder.svg'}
            alt={seeker.name}
            className="mx-auto h-20 w-20 rounded-full border-2 border-emerald-400 object-cover"
          />
          <div>
            <h3 className="text-lg font-bold text-white">{seeker.name}</h3>
            <p className="text-xs text-slate-400">{seeker.location?.address}</p>
          </div>

          <div className="inline-block rounded-xl border-4 border-emerald-500 bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} alt="প্রোফাইল কিউআর কোড" width={144} height={144} className="h-36 w-36" />
          </div>

          <div className="space-y-1 text-[11px] text-slate-300">
            {seeker.payments?.bkash && (
              <p>
                bKash ব্যক্তিগত: <span className="font-mono font-bold text-bkash">{seeker.payments.bkash}</span>
              </p>
            )}
            {seeker.payments?.nagad && (
              <p>
                Nagad: <span className="font-mono font-bold text-nagad">{seeker.payments.nagad}</span>
              </p>
            )}
            {seeker.dua && <p className="italic text-amber-300">“{seeker.dua}”</p>}
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-slate-500">
          কিউআর কোডটি স্ক্যান করলে এই প্রোফাইল পেজ খুলবে। কার্ডটি প্রিন্ট করে সাথে রাখা যায়।
        </p>

        <div className="flex gap-2">
          <button type="button" onClick={copy} className="btn-ghost flex-1 text-xs">
            লিংক কপি করুন
          </button>
          <button type="button" onClick={() => window.print()} className="btn-ghost flex-1 text-xs">
            প্রিন্ট করুন
          </button>
        </div>
      </div>
    </Modal>
  );
}
