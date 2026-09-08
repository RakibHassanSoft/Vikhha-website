import Link from 'next/link';
import { toBn } from '@/lib/bn';

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-slate-800 bg-slate-900 px-4 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 text-xs text-slate-400 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-slate-300">
              ক্যাশলেস ও হ্যাসেলমুক্ত সামাজিক সহায়তা প্ল্যাটফর্ম
            </span>
          </div>
          <p className="leading-relaxed">
            এই পোর্টাল কোনো টাকা গ্রহণ বা জমা রাখে না। দাতা নিজের বিকাশ, নগদ বা রকেট অ্যাপ থেকে
            সরাসরি সাহায্যপ্রার্থীর নম্বরে টাকা পাঠান; পোর্টাল শুধু লেনদেনের রেফারেন্স সংরক্ষণ ও
            যাচাই করে।
          </p>
        </div>

        <nav className="flex flex-col gap-2">
          <span className="font-semibold text-slate-300">লিংক</span>
          <Link href="/" className="hover:text-emerald-400">সাহায্যপ্রার্থী তালিকা</Link>
          <Link href="/map" className="hover:text-emerald-400">লাইভ ম্যাপ</Link>
          <Link href="/register" className="hover:text-emerald-400">নতুন রেজিস্ট্রেশন</Link>
          <Link href="/dua" className="hover:text-emerald-400">দোয়া স্টুডিও</Link>
        </nav>

        <div className="space-y-2">
          <span className="font-semibold text-slate-300">নিরাপত্তা</span>
          <p className="max-w-xs leading-relaxed">
            কেউ কখনো আপনার বিকাশ/নগদ <strong className="text-amber-400">পিন</strong> চাইবে না। এই
            ওয়েবসাইটেও পিন লেখার কোনো ঘর নেই। পিন চাইলে বুঝবেন সেটি প্রতারণা।
          </p>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-7xl border-t border-slate-800 pt-4 text-center text-[11px] text-slate-500">
        © {toBn(new Date().getFullYear())} ডিজিটাল ভিক্ষা ও সদকা পোর্টাল বাংলাদেশ
      </div>
    </footer>
  );
}
