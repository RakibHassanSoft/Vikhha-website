import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <div className="mb-4 text-5xl">🔍</div>
      <h1 className="text-2xl font-bold text-white">পাতাটি পাওয়া যায়নি</h1>
      <p className="mt-2 text-sm text-slate-400">
        আপনি যে ঠিকানাটি খুঁজছেন সেটি নেই, অথবা প্রোফাইলটি এখনো যাচাইয়ের অপেক্ষায় আছে।
      </p>
      <Link href="/" className="btn-primary mt-6">হোমপেজে ফিরুন</Link>
    </div>
  );
}
