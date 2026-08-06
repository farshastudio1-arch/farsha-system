import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import BlogContent from '@/components/blog/BlogContent';
import BlogShareButton from '@/components/blog/BlogShareButton';
import PublicFooter from '@/components/PublicFooter';
import PublicHeader from '@/components/PublicHeader';
import { getPublishedBlogPostBySlug } from '@/lib/blog-db';
import { formatBlogDate } from '@/lib/blog-format';
import { getCmsContent, getSiteSettings } from '@/lib/farsha-db';
import { absoluteUrl } from '@/lib/site-url';

interface BlogArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: BlogArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);

  if (!post) {
    return { title: 'Artikel tidak ditemukan | Farsha Studio' };
  }

  const url = absoluteUrl(`/blog/${post.slug}`);
  const description = post.excerpt;
  const images = post.coverUrl ? [{ url: post.coverUrl }] : undefined;

  return {
    title: `${post.title} | Farsha Studio`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: post.title,
      description,
      images,
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      images: post.coverUrl ? [post.coverUrl] : undefined,
    },
  };
}

export default async function BlogArticlePage({ params }: BlogArticlePageProps) {
  const { slug } = await params;
  const [post, cmsContent, siteSettings] = await Promise.all([
    getPublishedBlogPostBySlug(slug),
    getCmsContent(),
    getSiteSettings(),
  ]);

  if (!post) {
    notFound();
  }

  const shareUrl = absoluteUrl(`/blog/${post.slug}`);

  return (
    <div className="theme-surface flex min-h-screen flex-col font-sans antialiased">
      <PublicHeader />

      <main className="flex-grow">
        <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium text-[color-mix(in_srgb,var(--theme-text)_65%,transparent)] transition-colors hover:text-[var(--theme-text)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Semua artikel
          </Link>

          <header className="mt-6">
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-[var(--theme-text)] sm:text-4xl">
              {post.title}
            </h1>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {post.author?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.author.avatarUrl}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : null}
                <div className="text-sm">
                  {post.author?.name ? (
                    <p className="font-medium text-[var(--theme-text)]">{post.author.name}</p>
                  ) : null}
                  <p className="text-[color-mix(in_srgb,var(--theme-text)_60%,transparent)]">
                    {formatBlogDate(post.publishedAt)} · {post.readingTimeMinutes} min baca
                  </p>
                </div>
              </div>

              <BlogShareButton title={post.title} url={shareUrl} text={post.excerpt} />
            </div>
          </header>

          {post.coverUrl ? (
            <div className="mt-8 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.coverUrl}
                alt={post.title}
                className="w-full object-cover"
              />
            </div>
          ) : null}

          <div className="mt-8">
            <BlogContent doc={post.bodyJson} />
          </div>

          {post.author ? (
            <aside className="mt-14 flex items-start gap-4 border-t border-[var(--theme-border)] pt-8">
              {post.author.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.author.avatarUrl}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-full object-cover"
                />
              ) : null}
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[color-mix(in_srgb,var(--theme-text)_55%,transparent)]">
                  Penulis
                </p>
                <p className="mt-1 text-base font-semibold text-[var(--theme-text)]">
                  {post.author.name}
                </p>
                {post.author.bio ? (
                  <p className="mt-1.5 text-sm leading-relaxed text-[color-mix(in_srgb,var(--theme-text)_70%,transparent)]">
                    {post.author.bio}
                  </p>
                ) : null}
              </div>
            </aside>
          ) : null}
        </article>
      </main>

      <PublicFooter cmsContent={cmsContent} siteSettings={siteSettings} />
    </div>
  );
}
