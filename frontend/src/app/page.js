'use client';

import { useCallback, useEffect, useState } from 'react';
import StatsBar from '@/components/StatsBar';
import Filters from '@/components/Filters';
import SeekerCard from '@/components/SeekerCard';
import DonateModal from '@/components/DonateModal';
import QrCardModal from '@/components/QrCardModal';
import { CardSkeleton, EmptyState, ErrorState } from '@/components/ui/Bits';
import { api } from '@/lib/api';
import { toBn } from '@/lib/bn';

export default function HomePage() {
  const [seekers, setSeekers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  const [donateTo, setDonateTo] = useState(null);
  const [qrFor, setQrFor] = useState(null);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebounced(query);
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, meta: m } = await api.listSeekers({
        q: debounced || undefined,
        category,
        sort,
        page,
        limit: 12,
      });
      setSeekers(data || []);
      setMeta(m || null);
    } catch (err) {
      setError(err.message);
      setSeekers([]);
    } finally {
      setLoading(false);
    }
  }, [debounced, category, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-8">
      <StatsBar />

      <Filters
        query={query}
        onQuery={setQuery}
        category={category}
        onCategory={(c) => {
          setCategory(c);
          setPage(1);
        }}
        sort={sort}
        onSort={(s) => {
          setSort(s);
          setPage(1);
        }}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading &&
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}

        {!loading && error && <ErrorState message={error} onRetry={load} />}

        {!loading && !error && seekers.length === 0 && (
          <EmptyState
            title="কোনো সাহায্যপ্রার্থী পাওয়া যায়নি"
            description="অন্য শ্রেণী বেছে নিন বা খোঁজার শব্দ বদলে আবার চেষ্টা করুন।"
          />
        )}

        {!loading &&
          !error &&
          seekers.map((seeker) => (
            <SeekerCard
              key={seeker.id || seeker._id}
              seeker={seeker}
              onDonate={setDonateTo}
              onQr={setQrFor}
            />
          ))}
      </div>

      {meta && meta.totalPages > 1 && (
        <nav className="flex items-center justify-center gap-3" aria-label="পাতা">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="btn-ghost px-4 py-2 text-xs"
          >
            ← আগের
          </button>
          <span className="text-xs text-slate-400">
            পাতা {toBn(meta.page)} / {toBn(meta.totalPages)}
          </span>
          <button
            type="button"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="btn-ghost px-4 py-2 text-xs"
          >
            পরের →
          </button>
        </nav>
      )}

      {donateTo && (
        <DonateModal seeker={donateTo} onClose={() => setDonateTo(null)} onDone={load} />
      )}
      {qrFor && <QrCardModal seeker={qrFor} onClose={() => setQrFor(null)} />}
    </div>
  );
}
