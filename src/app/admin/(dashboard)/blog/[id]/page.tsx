import { notFound } from 'next/navigation';

import BlogEditorClient from '@/components/blog/BlogEditorClient';
import { getAdminBlogPostById, listBlogAuthors } from '@/lib/blog-db';

interface AdminBlogEditorPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminBlogEditorPage({ params }: AdminBlogEditorPageProps) {
  const { id } = await params;
  const authors = await listBlogAuthors();

  // `/admin/blog/new` is the create route; every other id loads an existing post.
  if (id === 'new') {
    return <BlogEditorClient post={null} authors={authors} />;
  }

  const post = await getAdminBlogPostById(id);

  if (!post) {
    notFound();
  }

  return <BlogEditorClient post={post} authors={authors} />;
}
