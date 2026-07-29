import { getD1Database } from '@/lib/cloudflare';
import {
  computeReadingTimeMinutes,
  deriveExcerpt,
  parseTiptapDoc,
  serializeTiptapDoc,
  slugify,
  type TiptapDoc,
} from '@/lib/blog-content';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BlogAuthor = {
  id: string;
  name: string;
  avatarUrl: string;
  bio: string;
  createdAt: string;
  updatedAt: string;
};

export type BlogRepurpose = {
  sharedX: boolean;
  sharedThreads: boolean;
  madeVideo: boolean;
};

// Full post for the admin editor. Includes the raw Tiptap doc and the
// repurposing flags — neither is ever handed to a public query.
export type AdminBlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverUrl: string;
  bodyJson: TiptapDoc;
  authorId: string | null;
  author: BlogAuthor | null;
  published: boolean;
  repurpose: BlogRepurpose;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

// Lighter row for the admin list — no body payload.
export type AdminBlogPostListItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverUrl: string;
  authorName: string | null;
  published: boolean;
  repurpose: BlogRepurpose;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

// Public shapes never carry the repurposing flags or the author bio (feed).
export type PublicBlogListItem = {
  slug: string;
  title: string;
  excerpt: string;
  coverUrl: string;
  authorName: string | null;
  authorAvatarUrl: string | null;
  publishedAt: string | null;
  readingTimeMinutes: number;
};

export type PublicBlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  coverUrl: string;
  bodyJson: TiptapDoc;
  author: BlogAuthor | null;
  publishedAt: string | null;
  updatedAt: string;
  readingTimeMinutes: number;
};

export type SaveBlogAuthorInput = {
  id?: string | null;
  name: string;
  avatarUrl: string;
  bio?: string | null;
};

export type SaveBlogPostInput = {
  id?: string | null;
  title: string;
  slug?: string | null;
  excerpt?: string | null;
  coverUrl: string;
  bodyJson: unknown;
  authorId?: string | null;
  published: boolean;
  repurpose?: Partial<BlogRepurpose>;
};

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

type BlogAuthorRow = {
  id: string;
  name: string;
  avatar_url: string;
  bio: string | null;
  created_at: string;
  updated_at: string;
};

type BlogPostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_url: string | null;
  body_json: string | null;
  author_id: string | null;
  published: number;
  shared_x: number;
  shared_threads: number;
  made_video: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  author_name?: string | null;
  author_avatar_url?: string | null;
  author_bio?: string | null;
  author_created_at?: string | null;
  author_updated_at?: string | null;
};

export class BlogDbError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = 'BLOG_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function normalizeText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function toBool(value: unknown) {
  return value === 1 || value === true || value === '1';
}

function toFlag(value: unknown) {
  return value ? 1 : 0;
}

// Un-migrated database (blog tables absent) — reads degrade to empty rather than
// 500ing, mirroring the catalog/customer fallbacks elsewhere in the codebase.
function isMissingBlogSchema(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes('no such table: blog_posts') ||
    message.includes('no such table: blog_authors')
  );
}

function toBlogAuthor(row: BlogAuthorRow): BlogAuthor {
  return {
    id: row.id,
    name: row.name,
    avatarUrl: row.avatar_url,
    bio: row.bio ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowAuthor(row: BlogPostRow): BlogAuthor | null {
  if (!row.author_id || !row.author_name) {
    return null;
  }

  return {
    id: row.author_id,
    name: row.author_name,
    avatarUrl: row.author_avatar_url ?? '',
    bio: row.author_bio ?? '',
    createdAt: row.author_created_at ?? '',
    updatedAt: row.author_updated_at ?? '',
  };
}

function rowRepurpose(row: BlogPostRow): BlogRepurpose {
  return {
    sharedX: toBool(row.shared_x),
    sharedThreads: toBool(row.shared_threads),
    madeVideo: toBool(row.made_video),
  };
}

function toAdminPost(row: BlogPostRow): AdminBlogPost {
  const bodyJson = parseTiptapDoc(row.body_json);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? '',
    coverUrl: row.cover_url ?? '',
    bodyJson,
    authorId: row.author_id,
    author: rowAuthor(row),
    published: toBool(row.published),
    repurpose: rowRepurpose(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

function toAdminListItem(row: BlogPostRow): AdminBlogPostListItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? '',
    coverUrl: row.cover_url ?? '',
    authorName: row.author_name ?? null,
    published: toBool(row.published),
    repurpose: rowRepurpose(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

function toPublicListItem(row: BlogPostRow): PublicBlogListItem {
  const bodyJson = parseTiptapDoc(row.body_json);

  return {
    slug: row.slug,
    title: row.title,
    excerpt: deriveExcerpt(bodyJson, row.excerpt),
    coverUrl: row.cover_url ?? '',
    authorName: row.author_name ?? null,
    authorAvatarUrl: row.author_avatar_url ?? null,
    publishedAt: row.published_at,
    readingTimeMinutes: computeReadingTimeMinutes(bodyJson),
  };
}

function toPublicPost(row: BlogPostRow): PublicBlogPost {
  const bodyJson = parseTiptapDoc(row.body_json);

  return {
    slug: row.slug,
    title: row.title,
    excerpt: deriveExcerpt(bodyJson, row.excerpt),
    coverUrl: row.cover_url ?? '',
    bodyJson,
    author: rowAuthor(row),
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    readingTimeMinutes: computeReadingTimeMinutes(bodyJson),
  };
}

// Column list for post reads. `withRepurpose` is false for every public path so
// the repurposing flags never leave the admin surface (spec §5).
function postSelectColumns(withRepurpose: boolean) {
  const base = `p.id,
       p.slug,
       p.title,
       p.excerpt,
       p.cover_url,
       p.body_json,
       p.author_id,
       p.published,
       p.created_at,
       p.updated_at,
       p.published_at,
       a.name AS author_name,
       a.avatar_url AS author_avatar_url,
       a.bio AS author_bio,
       a.created_at AS author_created_at,
       a.updated_at AS author_updated_at`;

  if (!withRepurpose) {
    return base;
  }

  return `${base},
       p.shared_x,
       p.shared_threads,
       p.made_video`;
}

const postFromJoin = `FROM blog_posts p
     LEFT JOIN blog_authors a ON a.id = p.author_id`;

// ---------------------------------------------------------------------------
// Authors
// ---------------------------------------------------------------------------

export async function listBlogAuthors(): Promise<BlogAuthor[]> {
  try {
    const db = await getD1Database();
    const result = await db
      .prepare('SELECT id, name, avatar_url, bio, created_at, updated_at FROM blog_authors ORDER BY name ASC')
      .all<BlogAuthorRow>();

    return result.results.map(toBlogAuthor);
  } catch (error) {
    if (isMissingBlogSchema(error)) {
      return [];
    }

    throw error;
  }
}

export async function getBlogAuthorById(authorId: string): Promise<BlogAuthor | null> {
  const id = normalizeText(authorId);

  if (!id) {
    return null;
  }

  const db = await getD1Database();
  const row = await db
    .prepare('SELECT id, name, avatar_url, bio, created_at, updated_at FROM blog_authors WHERE id = ? LIMIT 1')
    .bind(id)
    .first<BlogAuthorRow>();

  return row ? toBlogAuthor(row) : null;
}

export async function saveBlogAuthor(input: SaveBlogAuthorInput): Promise<BlogAuthor> {
  const db = await getD1Database();
  const name = normalizeText(input.name);
  const avatarUrl = normalizeText(input.avatarUrl);
  const bio = normalizeText(input.bio);

  if (!name) {
    throw new BlogDbError('Author name is required.', 400, 'BLOG_AUTHOR_NAME_REQUIRED');
  }

  if (!avatarUrl) {
    throw new BlogDbError('Author avatar is required.', 400, 'BLOG_AUTHOR_AVATAR_REQUIRED');
  }

  const id = normalizeText(input.id) || createId('author');

  await db
    .prepare(
      `INSERT INTO blog_authors (id, name, avatar_url, bio)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         avatar_url = excluded.avatar_url,
         bio = excluded.bio,
         updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(id, name, avatarUrl, bio)
    .run();

  const author = await getBlogAuthorById(id);

  if (!author) {
    throw new BlogDbError('Author not found after save.', 404, 'BLOG_AUTHOR_NOT_FOUND');
  }

  return author;
}

export async function deleteBlogAuthor(authorId: string): Promise<void> {
  const db = await getD1Database();
  const id = normalizeText(authorId);

  if (!id) {
    throw new BlogDbError('Author is invalid.', 400, 'INVALID_BLOG_AUTHOR');
  }

  // Posts keep existing but lose the byline (author_id → NULL) rather than being
  // deleted along with the author.
  await db.prepare('UPDATE blog_posts SET author_id = NULL WHERE author_id = ?').bind(id).run();
  await db.prepare('DELETE FROM blog_authors WHERE id = ?').bind(id).run();
}

// ---------------------------------------------------------------------------
// Posts — admin
// ---------------------------------------------------------------------------

export async function listAdminBlogPosts(): Promise<AdminBlogPostListItem[]> {
  try {
    const db = await getD1Database();
    const result = await db
      .prepare(
        `SELECT ${postSelectColumns(true)}
         ${postFromJoin}
         ORDER BY p.created_at DESC`,
      )
      .all<BlogPostRow>();

    return result.results.map(toAdminListItem);
  } catch (error) {
    if (isMissingBlogSchema(error)) {
      return [];
    }

    throw error;
  }
}

export async function getAdminBlogPostById(postId: string): Promise<AdminBlogPost | null> {
  const id = normalizeText(postId);

  if (!id) {
    return null;
  }

  const db = await getD1Database();
  const row = await db
    .prepare(
      `SELECT ${postSelectColumns(true)}
       ${postFromJoin}
       WHERE p.id = ?
       LIMIT 1`,
    )
    .bind(id)
    .first<BlogPostRow>();

  return row ? toAdminPost(row) : null;
}

async function generateUniqueSlug(
  db: D1Database,
  desired: string,
  excludePostId: string | null,
): Promise<string> {
  const base = slugify(desired) || `post-${Date.now()}`;
  let candidate = base;
  let suffix = 2;

  // Loop until the slug is free (ignoring the post being edited).
  for (;;) {
    const clash = await db
      .prepare('SELECT id FROM blog_posts WHERE slug = ? AND id != ? LIMIT 1')
      .bind(candidate, excludePostId ?? '')
      .first<{ id: string }>();

    if (!clash) {
      return candidate;
    }

    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function saveBlogPost(input: SaveBlogPostInput): Promise<AdminBlogPost> {
  const db = await getD1Database();
  const title = normalizeText(input.title);
  const coverUrl = normalizeText(input.coverUrl);
  const excerpt = normalizeText(input.excerpt);
  const authorId = normalizeText(input.authorId) || null;
  const published = Boolean(input.published);
  const bodyJson = serializeTiptapDoc(parseTiptapDoc(input.bodyJson));

  if (!title) {
    throw new BlogDbError('Post title is required.', 400, 'BLOG_TITLE_REQUIRED');
  }

  // Cover is required to publish; drafts are exempt (spec §2, decision 4).
  if (published && !coverUrl) {
    throw new BlogDbError('A cover image is required to publish.', 400, 'BLOG_COVER_REQUIRED');
  }

  const id = normalizeText(input.id) || null;
  const existing = id ? await getAdminBlogPostById(id) : null;

  if (id && !existing) {
    throw new BlogDbError('Post not found.', 404, 'BLOG_POST_NOT_FOUND');
  }

  const desiredSlug = normalizeText(input.slug) || title;
  const slug = await generateUniqueSlug(db, desiredSlug, existing?.id ?? null);

  const repurpose = {
    sharedX: toFlag(input.repurpose?.sharedX ?? existing?.repurpose.sharedX ?? false),
    sharedThreads: toFlag(input.repurpose?.sharedThreads ?? existing?.repurpose.sharedThreads ?? false),
    madeVideo: toFlag(input.repurpose?.madeVideo ?? existing?.repurpose.madeVideo ?? false),
  };

  if (existing) {
    // published_at is stamped the first time a post goes live and then kept.
    const shouldStampPublished = published && !existing.publishedAt;

    await db
      .prepare(
        `UPDATE blog_posts SET
           slug = ?,
           title = ?,
           excerpt = ?,
           cover_url = ?,
           body_json = ?,
           author_id = ?,
           published = ?,
           shared_x = ?,
           shared_threads = ?,
           made_video = ?,
           published_at = ${shouldStampPublished ? 'CURRENT_TIMESTAMP' : 'published_at'},
           updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(
        slug,
        title,
        excerpt,
        coverUrl,
        bodyJson,
        authorId,
        toFlag(published),
        repurpose.sharedX,
        repurpose.sharedThreads,
        repurpose.madeVideo,
        existing.id,
      )
      .run();

    const saved = await getAdminBlogPostById(existing.id);

    if (!saved) {
      throw new BlogDbError('Post not found after save.', 404, 'BLOG_POST_NOT_FOUND');
    }

    return saved;
  }

  const newId = createId('post');

  await db
    .prepare(
      `INSERT INTO blog_posts (
         id, slug, title, excerpt, cover_url, body_json, author_id, published,
         shared_x, shared_threads, made_video, published_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${published ? 'CURRENT_TIMESTAMP' : 'NULL'})`,
    )
    .bind(
      newId,
      slug,
      title,
      excerpt,
      coverUrl,
      bodyJson,
      authorId,
      toFlag(published),
      repurpose.sharedX,
      repurpose.sharedThreads,
      repurpose.madeVideo,
    )
    .run();

  const saved = await getAdminBlogPostById(newId);

  if (!saved) {
    throw new BlogDbError('Post not found after creation.', 404, 'BLOG_POST_NOT_FOUND');
  }

  return saved;
}

export async function setBlogPostPublished(
  postId: string,
  published: boolean,
): Promise<AdminBlogPost> {
  const db = await getD1Database();
  const id = normalizeText(postId);
  const existing = id ? await getAdminBlogPostById(id) : null;

  if (!existing) {
    throw new BlogDbError('Post not found.', 404, 'BLOG_POST_NOT_FOUND');
  }

  if (published && !existing.coverUrl) {
    throw new BlogDbError('A cover image is required to publish.', 400, 'BLOG_COVER_REQUIRED');
  }

  const shouldStampPublished = published && !existing.publishedAt;

  await db
    .prepare(
      `UPDATE blog_posts SET
         published = ?,
         published_at = ${shouldStampPublished ? 'CURRENT_TIMESTAMP' : 'published_at'},
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(toFlag(published), existing.id)
    .run();

  const saved = await getAdminBlogPostById(existing.id);

  if (!saved) {
    throw new BlogDbError('Post not found after update.', 404, 'BLOG_POST_NOT_FOUND');
  }

  return saved;
}

export async function deleteBlogPost(postId: string): Promise<void> {
  const db = await getD1Database();
  const id = normalizeText(postId);

  if (!id) {
    throw new BlogDbError('Post is invalid.', 400, 'INVALID_BLOG_POST');
  }

  await db.prepare('DELETE FROM blog_posts WHERE id = ?').bind(id).run();
}

// ---------------------------------------------------------------------------
// Posts — public (published only, never selects repurposing flags)
// ---------------------------------------------------------------------------

export async function listPublishedBlogPosts(
  options: { limit?: number; offset?: number } = {},
): Promise<PublicBlogListItem[]> {
  const limit = Math.min(Math.max(Number(options.limit) || 10, 1), 50);
  const offset = Math.max(Number(options.offset) || 0, 0);

  try {
    const db = await getD1Database();
    const result = await db
      .prepare(
        `SELECT ${postSelectColumns(false)}
         ${postFromJoin}
         WHERE p.published = 1
         ORDER BY COALESCE(p.published_at, p.created_at) DESC
         LIMIT ? OFFSET ?`,
      )
      .bind(limit, offset)
      .all<BlogPostRow>();

    return result.results.map(toPublicListItem);
  } catch (error) {
    if (isMissingBlogSchema(error)) {
      return [];
    }

    throw error;
  }
}

export async function countPublishedBlogPosts(): Promise<number> {
  try {
    const db = await getD1Database();
    const row = await db
      .prepare('SELECT COUNT(*) AS count FROM blog_posts WHERE published = 1')
      .first<{ count: number }>();

    return Number(row?.count ?? 0);
  } catch (error) {
    if (isMissingBlogSchema(error)) {
      return 0;
    }

    throw error;
  }
}

export async function getPublishedBlogPostBySlug(slug: string): Promise<PublicBlogPost | null> {
  const normalizedSlug = normalizeText(slug);

  if (!normalizedSlug) {
    return null;
  }

  try {
    const db = await getD1Database();
    const row = await db
      .prepare(
        `SELECT ${postSelectColumns(false)}
         ${postFromJoin}
         WHERE p.published = 1 AND p.slug = ?
         LIMIT 1`,
      )
      .bind(normalizedSlug)
      .first<BlogPostRow>();

    return row ? toPublicPost(row) : null;
  } catch (error) {
    if (isMissingBlogSchema(error)) {
      return null;
    }

    throw error;
  }
}

// Slugs + last-modified for the sitemap.
export async function listPublishedBlogSlugs(): Promise<
  Array<{ slug: string; updatedAt: string; publishedAt: string | null }>
> {
  try {
    const db = await getD1Database();
    const result = await db
      .prepare(
        `SELECT slug, updated_at, published_at
         FROM blog_posts
         WHERE published = 1
         ORDER BY COALESCE(published_at, created_at) DESC`,
      )
      .all<{ slug: string; updated_at: string; published_at: string | null }>();

    return result.results.map((row) => ({
      slug: row.slug,
      updatedAt: row.updated_at,
      publishedAt: row.published_at,
    }));
  } catch (error) {
    if (isMissingBlogSchema(error)) {
      return [];
    }

    throw error;
  }
}
