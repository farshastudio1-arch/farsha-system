'use server';

import { revalidatePath } from 'next/cache';

import { auth } from '../../auth';
import {
  countPublishedBlogPosts,
  deleteBlogAuthor,
  deleteBlogPost,
  getAdminBlogPostById,
  listAdminBlogPosts,
  listBlogAuthors,
  listPublishedBlogPosts,
  saveBlogAuthor,
  saveBlogPost,
  setBlogPostPublished,
  type AdminBlogPost,
  type AdminBlogPostListItem,
  type BlogAuthor,
  type PublicBlogListItem,
  type SaveBlogAuthorInput,
  type SaveBlogPostInput,
} from '@/lib/blog-db';

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type BlogAdminData = {
  posts: AdminBlogPostListItem[];
  authors: BlogAuthor[];
};

export type PublicBlogPage = {
  posts: PublicBlogListItem[];
  hasMore: boolean;
};

const schemaError =
  'Database schema is outdated. Apply the latest D1 migrations (0028_blog.sql), then try again.';

async function ensureAdmin() {
  const session = await auth();

  if (session?.user?.role !== 'admin') {
    throw new Error('Unauthorized');
  }
}

function revalidateBlog(slug?: string | null) {
  revalidatePath('/blog');
  revalidatePath('/admin/blog');
  revalidatePath('/sitemap.xml');

  if (slug) {
    revalidatePath(`/blog/${slug}`);
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : '';

  if (
    message.includes('no such table: blog_posts') ||
    message.includes('no such table: blog_authors')
  ) {
    return schemaError;
  }

  return message || fallback;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function fetchBlogAdminDataAction(): Promise<ActionResult<BlogAdminData>> {
  try {
    await ensureAdmin();

    const [posts, authors] = await Promise.all([listAdminBlogPosts(), listBlogAuthors()]);

    return { ok: true, data: { posts, authors } };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, 'Failed to load blog data.') };
  }
}

export async function saveBlogAuthorAction(
  input: SaveBlogAuthorInput,
): Promise<ActionResult<BlogAuthor[]>> {
  try {
    await ensureAdmin();
    await saveBlogAuthor(input);
    revalidateBlog();

    return { ok: true, data: await listBlogAuthors() };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, 'Failed to save author.') };
  }
}

export async function deleteBlogAuthorAction(
  authorId: string,
): Promise<ActionResult<BlogAdminData>> {
  try {
    await ensureAdmin();
    await deleteBlogAuthor(authorId);
    revalidateBlog();

    const [posts, authors] = await Promise.all([listAdminBlogPosts(), listBlogAuthors()]);

    return { ok: true, data: { posts, authors } };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, 'Failed to delete author.') };
  }
}

export async function fetchBlogPostAction(
  postId: string,
): Promise<ActionResult<AdminBlogPost | null>> {
  try {
    await ensureAdmin();

    return { ok: true, data: await getAdminBlogPostById(postId) };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, 'Failed to load post.') };
  }
}

export async function saveBlogPostAction(
  input: SaveBlogPostInput,
): Promise<ActionResult<AdminBlogPost>> {
  try {
    await ensureAdmin();

    const saved = await saveBlogPost(input);
    revalidateBlog(saved.slug);

    return { ok: true, data: saved };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, 'Failed to save post.') };
  }
}

export async function setBlogPostPublishedAction(
  postId: string,
  published: boolean,
): Promise<ActionResult<AdminBlogPostListItem[]>> {
  try {
    await ensureAdmin();

    const saved = await setBlogPostPublished(postId, published);
    revalidateBlog(saved.slug);

    return { ok: true, data: await listAdminBlogPosts() };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, 'Failed to update publish state.') };
  }
}

export async function deleteBlogPostAction(
  postId: string,
): Promise<ActionResult<AdminBlogPostListItem[]>> {
  try {
    await ensureAdmin();
    await deleteBlogPost(postId);
    revalidateBlog();

    return { ok: true, data: await listAdminBlogPosts() };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, 'Failed to delete post.') };
  }
}

// ---------------------------------------------------------------------------
// Public — "Load more" pagination. No admin gate; published-only by construction.
// ---------------------------------------------------------------------------

export async function loadMoreBlogPostsAction(input: {
  offset: number;
  limit?: number;
}): Promise<ActionResult<PublicBlogPage>> {
  try {
    const limit = Math.min(Math.max(Number(input.limit) || 10, 1), 50);
    const offset = Math.max(Number(input.offset) || 0, 0);

    const [posts, total] = await Promise.all([
      listPublishedBlogPosts({ limit, offset }),
      countPublishedBlogPosts(),
    ]);

    return { ok: true, data: { posts, hasMore: offset + posts.length < total } };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, 'Failed to load more posts.') };
  }
}
