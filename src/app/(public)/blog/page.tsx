import type { Metadata } from 'next';

import BlogFeed from '@/components/blog/BlogFeed';
import PublicFooter from '@/components/PublicFooter';
import PublicHeader from '@/components/PublicHeader';
import { countPublishedBlogPosts, listPublishedBlogPosts } from '@/lib/blog-db';
import { getCmsContent, getSiteSettings } from '@/lib/farsha-db';
import { absoluteUrl } from '@/lib/site-url';

const firstPageSize = 10;

export const metadata: Metadata = {
  title: 'Blog — Farsha Studio',
  description:
    'Artikel-artikel pilihan dari kami',
  alternates: { canonical: absoluteUrl('/blog') },
  openGraph: {
    type: 'website',
    url: absoluteUrl('/blog'),
    title: 'Blog — Farsha Studio',
    description:
      'Artikel-artikel pilihan dari kami',
  },
};

export default async function BlogFeedPage() {
  const [posts, total, cmsContent, siteSettings] = await Promise.all([
    listPublishedBlogPosts({ limit: firstPageSize, offset: 0 }),
    countPublishedBlogPosts(),
    getCmsContent(),
    getSiteSettings(),
  ]);

  return (
    <div className="theme-surface flex min-h-screen flex-col font-sans antialiased">
      <PublicHeader />

      <main className="flex-grow">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <header className="mb-10 max-w-2xl">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[color-mix(in_srgb,var(--theme-text)_55%,transparent)]">
              Blog
            </p>
            <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-[var(--theme-text)] sm:text-4xl">
            Artikel-artikel pilihan kami
            </h1>
            
          </header>

          <BlogFeed
            initialPosts={posts}
            initialHasMore={posts.length < total}
            batchSize={firstPageSize}
          />
        </div>
      </main>

      <PublicFooter cmsContent={cmsContent} siteSettings={siteSettings} />
    </div>
  );
}
