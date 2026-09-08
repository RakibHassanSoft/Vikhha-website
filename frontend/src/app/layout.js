import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/components/Toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata = {
  // Makes every canonical and Open Graph URL absolute. Without it, a shared
  // link renders its preview against the deployment's own hostname, which on a
  // preview build is not the address anyone actually visits.
  metadataBase: new URL(siteUrl),
  title: {
    default: 'ডিজিটাল ভিক্ষা ও সদকা পোর্টাল বিডি',
    template: '%s | ডিজিটাল ভিক্ষা ও সদকা পোর্টাল',
  },
  description:
    'বাংলাদেশের অসহায় ও দুস্থ সাহায্যপ্রার্থীদের সরাসরি বিকাশ, নগদ ও রকেটে সদকা পাঠান। প্রতিটি লেনদেন যাচাই করা হয়।',
  keywords: ['সদকা', 'দান', 'বিকাশ', 'নগদ', 'যাকাত', 'বাংলাদেশ', 'sadaqah', 'donation', 'bangladesh'],
  openGraph: {
    type: 'website',
    locale: 'bn_BD',
    url: siteUrl,
    siteName: 'ডিজিটাল ভিক্ষা ও সদকা পোর্টাল',
    title: 'ডিজিটাল ভিক্ষা ও সদকা পোর্টাল বিডি',
    description: 'যাচাইকৃত সাহায্যপ্রার্থীদের সরাসরি সদকা পাঠান।',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ডিজিটাল ভিক্ষা ও সদকা পোর্টাল বিডি',
    description: 'যাচাইকৃত সাহায্যপ্রার্থীদের সরাসরি সদকা পাঠান।',
  },
  robots: { index: true, follow: true },
};

export const viewport = {
  themeColor: '#020617',
};

export default function RootLayout({ children }) {
  return (
    <html lang="bn">
      <head>
        {/*
          Loaded with a plain <link> rather than next/font so the production
          build never depends on Google Fonts being reachable at build time
          (CI, Docker and offline builds all fail on that). The local fallback
          stack in tailwind.config.js keeps Bangla readable if the CDN is slow.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen flex-col font-sans selection:bg-emerald-600 selection:text-white">
        <AuthProvider>
          <ToastProvider>
            <Navbar />
            <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
              {children}
            </main>
            <Footer />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
