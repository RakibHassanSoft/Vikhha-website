export const CATEGORIES = [
  { value: 'all', label: 'সবাই', icon: '👥' },
  { value: 'disabled', label: 'শারীরিক প্রতিবন্ধী', icon: '♿' },
  { value: 'elderly', label: 'বয়স্ক ও অসহায়', icon: '🧓' },
  { value: 'hafeez', label: 'অন্ধ হাফেজ / মাদরাসা', icon: '📖' },
  { value: 'artist', label: 'বাউল ও পথশিল্পী', icon: '🎵' },
  { value: 'other', label: 'অন্যান্য', icon: '🤝' },
];

export const CATEGORY_LABELS = {
  disabled: 'শারীরিক প্রতিবন্ধী',
  elderly: 'বয়স্ক ও কর্মক্ষমতাহীন',
  hafeez: 'অন্ধ হাফেজ / এতিমখানা',
  artist: 'পথশিল্পী ও বাউল',
  other: 'অসহায় সাহায্যপ্রার্থী',
};

export const METHODS = [
  { value: 'bkash', label: 'বিকাশ', latin: 'bKash', color: 'bkash' },
  { value: 'nagad', label: 'নগদ', latin: 'Nagad', color: 'nagad' },
  { value: 'rocket', label: 'রকেট', latin: 'Rocket', color: 'rocket' },
];

export const METHOD_LABELS = { bkash: 'বিকাশ', nagad: 'নগদ', rocket: 'রকেট' };

/** How the donor finds their transaction id inside each MFS app. */
export const TRX_HINTS = {
  bkash: 'বিকাশ অ্যাপে Send Money করার পর যে TrxID আসে (যেমন 9F3KL2QX7A), সেটি লিখুন।',
  nagad: 'নগদ অ্যাপে "Send Money" শেষে যে TxnID দেখায়, সেটি লিখুন।',
  rocket: 'রকেট SMS-এ পাওয়া TxnId টি লিখুন।',
};

export const STATUS_LABELS = {
  pending: 'যাচাই চলছে',
  verified: 'যাচাই সম্পন্ন',
  rejected: 'বাতিল',
  approved: 'অনুমোদিত',
  suspended: 'স্থগিত',
};

export const STATUS_STYLES = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  verified: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  suspended: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
};

export const DUA_OCCASIONS = [
  { value: 'general', label: 'সাধারণ সদকা' },
  { value: 'parents', label: 'মা-বাবার মাগফিরাত' },
  { value: 'health', label: 'সুস্থতা ও শেফা' },
  { value: 'rizq', label: 'রিজিক ও বরকত' },
  { value: 'business', label: 'ব্যবসায় উন্নতি' },
  { value: 'exam', label: 'পরীক্ষায় সাফল্য' },
  { value: 'travel', label: 'নিরাপদ সফর' },
];

export const QUICK_AMOUNTS = [10, 20, 50, 100, 200, 500];
