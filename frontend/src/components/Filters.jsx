'use client';

import { CATEGORIES } from '@/lib/constants';

export default function Filters({ query, onQuery, category, onCategory, sort, onSort }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <span className="pointer-events-none absolute left-3.5 top-2.5 text-slate-500">🔍</span>
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="নাম, এলাকা (ফার্মগেট, গুলশান) বা সমস্যা লিখে খুঁজুন..."
          aria-label="সাহায্যপ্রার্থী খুঁজুন"
          className="field-input pl-10"
        />
      </div>

      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => onCategory(cat.value)}
            aria-pressed={category === cat.value}
            className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
              category === cat.value
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span aria-hidden className="mr-1">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      <select
        value={sort}
        onChange={(e) => onSort(e.target.value)}
        aria-label="সাজান"
        className="field-input w-full lg:w-44"
      >
        <option value="newest">নতুন আগে</option>
        <option value="urgent">সবচেয়ে কম পেয়েছেন</option>
        <option value="progress">আজ বেশি পেয়েছেন</option>
        <option value="target">বড় লক্ষ্য আগে</option>
      </select>
    </div>
  );
}
