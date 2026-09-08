'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const SIZES = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };

export default function Modal({ title, subtitle, avatar, onClose, size = 'md', children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  if (!mounted) return null;

  /*
   * Rendered through a portal on <body> rather than in place: the page tree
   * contains sticky headers and backdrop-blurred cards, and any of those can
   * capture a `position: fixed` overlay's containing block or out-rank it in
   * the stacking order. A body-level portal makes the overlay's coverage
   * independent of wherever the modal happens to be used from.
   */
  return createPortal(
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className={`max-h-[92vh] w-full animate-slide-up overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl ${SIZES[size]}`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900 p-5">
          <div className="flex min-w-0 items-center gap-3">
            {avatar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt=""
                className="h-10 w-10 rounded-full border border-amber-500/50 object-cover"
              />
            )}
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-white">{title}</h3>
              {subtitle && <p className="truncate text-xs text-slate-400">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}
