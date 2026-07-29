'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

import BlogPostCard from '@/components/blog/BlogPostCard';
import { loadMoreBlogPostsAction } from '@/lib/blog-actions';
import type { PublicBlogListItem } from '@/lib/blog-db';

type BlogFeedProps = {
  initialPosts: PublicBlogListItem[];
  initialHasMore: boolean;
  batchSize?: number;
};

export default function BlogFeed({
  initialPosts,
  initialHasMore,
  batchSize = 10,
}: BlogFeedProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadMore() {
    setLoading(true);
    setError('');

    const result = await loadMoreBlogPostsAction({ offset: posts.length, limit: batchSize });

    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setPosts((prev) => [...prev, ...result.data.posts]);
    setHasMore(result.data.hasMore);
  }

  if (posts.length === 0) {
    return (
      <div className="border border-dashed border-[var(--theme-border)] px-6 py-20 text-center">
        <p className="text-sm text-[color-mix(in_srgb,var(--theme-text)_65%,transparent)]">
          Belum ada artikel. Nantikan tips &amp; inspirasi styling dari kami.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <BlogPostCard key={post.slug} post={post} />
        ))}
      </div>

      {error ? (
        <p className="mt-6 text-center text-sm font-medium text-red-600">{error}</p>
      ) : null}

      {hasMore ? (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="inline-flex items-center gap-2 border border-[var(--theme-text)] px-8 py-3 text-sm font-semibold text-[var(--theme-text)] transition-colors hover:bg-[var(--theme-text)] hover:text-[var(--theme-surface)] disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Muat lebih banyak
          </button>
        </div>
      ) : null}
    </div>
  );
}
