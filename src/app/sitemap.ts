import type { MetadataRoute } from 'next';

import { listPublishedBlogSlugs } from '@/lib/blog-db';
import { absoluteUrl } from '@/lib/site-url';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/catalog'), changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/blog'), changeFrequency: 'weekly', priority: 0.7 },
  ];

  const posts = await listPublishedBlogSlugs();

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: post.updatedAt || post.publishedAt || undefined,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...postRoutes];
}
