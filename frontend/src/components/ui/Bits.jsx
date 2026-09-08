import { STATUS_LABELS, STATUS_STYLES } from '@/lib/constants';
import { taka, toBn } from '@/lib/bn';

export function Spinner({ className = 'h-4 w-4' }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-hidden
    />
  );
}

export function StatusBadge({ status }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
        STATUS_STYLES[status] || STATUS_STYLES.suspended
      }`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export function ProgressBar({ collected, target }) {
  const percent = target ? Math.min(100, Math.round((collected / target) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">
          আজকের সংগ্রহ: <strong className="text-emerald-400">{taka(collected)}</strong>
        </span>
        <span className="text-slate-400">
          লক্ষ্য: {taka(target)} ({toBn(percent)}%)
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-slate-800"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="col-span-full rounded-2xl border border-dashed border-slate-800 py-14 text-center">
      <p className="text-base font-semibold text-slate-300">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="col-span-full rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 text-center">
      <p className="text-sm font-semibold text-rose-300">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-ghost mt-4">
          আবার চেষ্টা করুন
        </button>
      )}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="glass-card animate-pulse space-y-4 p-5">
      <div className="flex gap-3">
        <div className="h-14 w-14 rounded-2xl bg-slate-800" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 rounded bg-slate-800" />
          <div className="h-4 w-40 rounded bg-slate-800" />
          <div className="h-3 w-32 rounded bg-slate-800" />
        </div>
      </div>
      <div className="h-12 rounded-xl bg-slate-800/70" />
      <div className="h-2 rounded-full bg-slate-800" />
      <div className="h-9 rounded-xl bg-slate-800" />
    </div>
  );
}
