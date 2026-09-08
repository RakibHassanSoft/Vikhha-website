'use client';

import { useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { Spinner } from '@/components/ui/Bits';

const MAX_BYTES = 5 * 1024 * 1024;

export default function ImageUploader({ value, onChange, label = 'ছবি আপলোড করুন', kind = 'avatar' }) {
  const toast = useToast();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('শুধু JPG, PNG বা WebP ছবি দেওয়া যাবে।');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('ছবির আকার ৫ মেগাবাইটের কম হতে হবে।');
      return;
    }

    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const { data } = await api.uploadImage(file, kind);
      onChange(data.url);
      toast.success('ছবি আপলোড হয়েছে।');
    } catch (err) {
      setPreview(null);
      toast.error(
        err.status === 503
          ? 'ছবি আপলোড সার্ভারে এখনো কনফিগার করা হয়নি (Cloudinary)। ছবি ছাড়াই এগিয়ে যেতে পারেন।'
          : err.message
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const shown = value || preview;

  return (
    <div>
      <span className="field-label">{label}</span>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="পূর্বরূপ" className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl text-slate-700">🖼</span>
          )}
        </div>

        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="btn-ghost px-3 py-2 text-xs"
          >
            {busy ? <Spinner /> : null}
            {busy ? 'আপলোড হচ্ছে…' : shown ? 'ছবি বদলান' : 'ছবি বাছাই করুন'}
          </button>
          {shown && !busy && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setPreview(null);
              }}
              className="block text-[11px] text-rose-400 hover:underline"
            >
              ছবি সরান
            </button>
          )}
          <p className="text-[11px] text-slate-500">JPG / PNG / WebP · সর্বোচ্চ ৫ MB</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={pick}
        className="hidden"
      />
    </div>
  );
}
