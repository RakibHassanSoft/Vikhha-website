import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchSeekerServerSide } from '@/lib/api';
import SeekerProfileClient from './SeekerProfileClient';

export const revalidate = 30;

/*
 * Next 15+ hands `params` to server components as a Promise. Awaiting it also
 * works on Next 14, where it is a plain object, so this stays correct on both.
 */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const payload = await fetchSeekerServerSide(slug);
  if (!payload?.seeker) return { title: 'সাহায্যপ্রার্থী পাওয়া যায়নি' };

  const { seeker } = payload;
  return {
    title: seeker.name,
    description: seeker.story?.slice(0, 155),
    openGraph: {
      title: `${seeker.name} — ${seeker.categoryLabel}`,
      description: seeker.story?.slice(0, 155),
      images: seeker.avatarUrl ? [{ url: seeker.avatarUrl }] : undefined,
    },
  };
}

export default async function SeekerProfilePage({ params }) {
  const { slug } = await params;
  const payload = await fetchSeekerServerSide(slug);
  if (!payload?.seeker) notFound();

  return (
    <div className="space-y-4">
      <Link href="/" className="inline-block text-xs text-slate-400 hover:text-emerald-400">
        ← সব সাহায্যপ্রার্থী
      </Link>
      <SeekerProfileClient
        seeker={payload.seeker}
        recentDonations={payload.recentDonations || []}
      />
    </div>
  );
}
