import BlogAdminClient from '@/components/blog/BlogAdminClient';
import { listAdminBlogPosts, listBlogAuthors } from '@/lib/blog-db';

export default async function AdminBlogPage() {
  const [posts, authors] = await Promise.all([listAdminBlogPosts(), listBlogAuthors()]);

  return <BlogAdminClient initialPosts={posts} initialAuthors={authors} />;
}
