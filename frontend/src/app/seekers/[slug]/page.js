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
  const result = await fetchSeekerServerSide(slug);

  if (result.status !== 'ok') {
    return { title: 'সাহায্যপ্রার্থীর প্রোফাইল' };
  }

  const { seeker } = result.data;
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
  const result = await fetchSeekerServerSide(slug);

  // Only a genuine 404 from the API is a 404 here. If the API simply did not
  // answer — asleep, restarting, rate limited — the page still renders and the
  // browser fetches the profile itself, so a shared link never dead-ends
  // because of a cold start.
  if (result.status === 'notfound') notFound();

  return (
    <div className="space-y-4">
      <Link href="/" className="inline-block text-xs text-slate-400 hover:text-emerald-400">
        ← সব সাহায্যপ্রার্থী
      </Link>
      <SeekerProfileClient
        slug={slug}
        seeker={result.status === 'ok' ? result.data.seeker : null}
        recentDonations={result.status === 'ok' ? result.data.recentDonations || [] : []}
      />
    </div>
  );
}
