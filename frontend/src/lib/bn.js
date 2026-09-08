const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/** Converts ASCII digits in a string/number to Bangla digits. */
export function toBn(value) {
  return String(value ?? '').replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

/** ৳ 1,250 -> ৳১,২৫০ */
export function taka(amount) {
  const n = Number(amount || 0);
  return `৳${toBn(n.toLocaleString('en-US'))}`;
}

export function bnNumber(n) {
  return toBn(Number(n || 0).toLocaleString('en-US'));
}

const MONTHS_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];

export function bnDate(input) {
  if (!input) return '';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  return `${toBn(d.getDate())} ${MONTHS_BN[d.getMonth()]} ${toBn(d.getFullYear())}`;
}

export function bnDateTime(input) {
  if (!input) return '';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Dhaka',
  });
  const [clock, meridiem] = time.split(' ');
  return `${bnDate(d)}, ${toBn(clock)} ${meridiem === 'AM' ? 'সকাল' : 'বিকাল'}`;
}

export function timeAgoBn(input) {
  if (!input) return '';
  const diff = Date.now() - new Date(input).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'এইমাত্র';
  if (mins < 60) return `${toBn(mins)} মিনিট আগে`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${toBn(hrs)} ঘণ্টা আগে`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${toBn(days)} দিন আগে`;
  return bnDate(input);
}
