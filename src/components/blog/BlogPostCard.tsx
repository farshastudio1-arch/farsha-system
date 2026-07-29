import Link from 'next/link';

import type { PublicBlogListItem } from '@/lib/blog-db';
import { formatBlogDate } from '@/lib/blog-format';

// Image-led feed card — author byline on top, then a wide 16:9 cover, title,
// and excerpt. Shared by the server-rendered first page and the client
// "Load more" batches, so it stays free of client-only APIs.
export default function BlogPostCard({ post }: { post: PublicBlogListItem }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden border border-[var(--theme-border)] bg-[var(--theme-surface)] transition-colors hover:border-[color-mix(in_srgb,var(--theme-text)_40%,transparent)]"
    >
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        {post.authorAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.authorAvatarUrl}
            alt=""
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : null}
        <div className="min-w-0 text-xs text-[color-mix(in_srgb,var(--theme-text)_60%,transparent)]">
          {post.authorName ? (
            <p className="truncate font-medium text-[var(--theme-text)]">{post.authorName}</p>
          ) : null}
          <p>
            {formatBlogDate(post.publishedAt)} · {post.readingTimeMinutes} min baca
          </p>
        </div>
      </div>

      <div className="aspect-[16/9] overflow-hidden bg-[color-mix(in_srgb,var(--theme-text)_6%,transparent)]">
        {post.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverUrl}
            alt={post.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-lg font-semibold leading-snug tracking-tight text-[var(--theme-text)]">
          {post.title}
        </h2>
        {post.excerpt ? (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[color-mix(in_srgb,var(--theme-text)_65%,transparent)]">
            {post.excerpt}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
