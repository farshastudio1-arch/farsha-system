'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Users,
  Video,
  X,
} from 'lucide-react';

import MediaLibraryPicker from '@/components/admin/MediaLibraryPicker';
import {
  deleteBlogAuthorAction,
  saveBlogAuthorAction,
  setBlogPostPublishedAction,
  deleteBlogPostAction,
} from '@/lib/blog-actions';
import type { AdminBlogPostListItem, BlogAuthor } from '@/lib/blog-db';

type BlogAdminClientProps = {
  initialPosts: AdminBlogPostListItem[];
  initialAuthors: BlogAuthor[];
};

type AuthorDraft = {
  id: string | null;
  name: string;
  avatarUrl: string;
  bio: string;
};

const emptyAuthorDraft: AuthorDraft = { id: null, name: '', avatarUrl: '', bio: '' };

function formatDate(value: string | null) {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value.includes('T') ? value : value.replace(' ', 'T') + 'Z');

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function RepurposeBadges({ post }: { post: AdminBlogPostListItem }) {
  const { sharedX, sharedThreads, madeVideo } = post.repurpose;
  const none = !sharedX && !sharedThreads && !madeVideo;

  if (none) {
    return (
      <span className="text-[11px] font-medium text-neutral-400">not yet repurposed</span>
    );
  }

  const badge = 'inline-flex items-center gap-1 border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-600';

  return (
    <div className="flex flex-wrap gap-1.5">
      {sharedX ? <span className={badge}>X</span> : null}
      {sharedThreads ? <span className={badge}>Threads</span> : null}
      {madeVideo ? (
        <span className={badge}>
          <Video className="h-3 w-3" /> Video
        </span>
      ) : null}
    </div>
  );
}

export default function BlogAdminClient({ initialPosts, initialAuthors }: BlogAdminClientProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [authors, setAuthors] = useState(initialAuthors);
  const [error, setError] = useState('');
  const [busyPostId, setBusyPostId] = useState<string | null>(null);

  const [authorDraft, setAuthorDraft] = useState<AuthorDraft | null>(null);
  const [authorSaving, setAuthorSaving] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);

  async function togglePublished(post: AdminBlogPostListItem) {
    setError('');

    if (!post.published && !post.coverUrl) {
      setError(`"${post.title}" needs a cover image before it can be published.`);
      return;
    }

    setBusyPostId(post.id);
    const result = await setBlogPostPublishedAction(post.id, !post.published);
    setBusyPostId(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setPosts(result.data);
  }

  async function removePost(post: AdminBlogPostListItem) {
    if (!window.confirm(`Delete "${post.title}" permanently?`)) {
      return;
    }

    setError('');
    setBusyPostId(post.id);
    const result = await deleteBlogPostAction(post.id);
    setBusyPostId(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setPosts(result.data);
  }

  async function saveAuthor() {
    if (!authorDraft) {
      return;
    }

    setError('');

    if (!authorDraft.name.trim()) {
      setError('Author name is required.');
      return;
    }

    if (!authorDraft.avatarUrl.trim()) {
      setError('Author avatar is required.');
      return;
    }

    setAuthorSaving(true);
    const result = await saveBlogAuthorAction({
      id: authorDraft.id,
      name: authorDraft.name,
      avatarUrl: authorDraft.avatarUrl,
      bio: authorDraft.bio,
    });
    setAuthorSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setAuthors(result.data);
    setAuthorDraft(null);
  }

  async function removeAuthor(author: BlogAuthor) {
    if (
      !window.confirm(
        `Delete author "${author.name}"? Their posts stay but lose the byline.`,
      )
    ) {
      return;
    }

    setError('');
    const result = await deleteBlogAuthorAction(author.id);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setPosts(result.data.posts);
    setAuthors(result.data.authors);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Content
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">Blog</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Styling tips &amp; inspiration. Published posts appear at /blog.
          </p>
        </div>
        <Link
          href="/admin/blog/new"
          className="inline-flex items-center gap-2 bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-700"
        >
          <Plus className="h-4 w-4" />
          New post
        </Link>
      </div>

      {error ? (
        <div className="mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {/* Posts */}
      <section className="mt-8">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center border border-dashed border-neutral-200 bg-neutral-50 py-16 text-center">
            <FileText className="h-9 w-9 text-neutral-300" />
            <p className="mt-3 text-sm font-semibold text-neutral-900">No posts yet.</p>
            <p className="mt-1 text-sm text-neutral-500">Create your first post to get started.</p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200 border border-neutral-200 bg-white">
            {posts.map((post) => (
              <li key={post.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <div className="h-16 w-24 shrink-0 overflow-hidden border border-neutral-200 bg-neutral-100">
                  {post.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.coverUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-neutral-300">
                      <FileText className="h-5 w-5" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        post.published ? 'bg-emerald-500' : 'bg-neutral-300'
                      }`}
                    />
                    <p className="truncate text-sm font-semibold text-neutral-900">{post.title}</p>
                  </div>
                  <p className="mt-0.5 truncate font-mono text-xs text-neutral-400">/blog/{post.slug}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                    <span>{post.authorName ?? 'No author'}</span>
                    <span>·</span>
                    <span>{post.published ? `Published ${formatDate(post.publishedAt)}` : 'Draft'}</span>
                    <RepurposeBadges post={post} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => togglePublished(post)}
                    disabled={busyPostId === post.id}
                    className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                      post.published
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    {busyPostId === post.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    {post.published ? 'Published' : 'Draft'}
                  </button>
                  <Link
                    href={`/admin/blog/${post.id}`}
                    aria-label={`Edit ${post.title}`}
                    className="border border-neutral-200 p-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => removePost(post)}
                    disabled={busyPostId === post.id}
                    aria-label={`Delete ${post.title}`}
                    className="border border-neutral-200 p-2 text-neutral-600 transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Authors */}
      <section className="mt-12">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-neutral-500" />
            <h2 className="text-lg font-semibold tracking-tight text-neutral-900">Authors</h2>
          </div>
          <button
            type="button"
            onClick={() => setAuthorDraft({ ...emptyAuthorDraft })}
            className="inline-flex items-center gap-2 border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-100"
          >
            <Plus className="h-4 w-4" />
            Add author
          </button>
        </div>

        {authors.length === 0 ? (
          <p className="mt-4 border border-dashed border-neutral-200 bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-500">
            No authors yet. Add one to attach a byline to posts.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {authors.map((author) => (
              <li
                key={author.id}
                className="flex items-start gap-3 border border-neutral-200 bg-white p-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={author.avatarUrl}
                  alt=""
                  className="h-11 w-11 shrink-0 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-neutral-900">{author.name}</p>
                  {author.bio ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">{author.bio}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setAuthorDraft({
                        id: author.id,
                        name: author.name,
                        avatarUrl: author.avatarUrl,
                        bio: author.bio,
                      })
                    }
                    aria-label={`Edit ${author.name}`}
                    className="p-2 text-neutral-500 transition-colors hover:text-neutral-900"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAuthor(author)}
                    aria-label={`Delete ${author.name}`}
                    className="p-2 text-neutral-500 transition-colors hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Author editor */}
      {authorDraft ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-md bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <h3 className="text-base font-semibold text-neutral-900">
                {authorDraft.id ? 'Edit author' : 'New author'}
              </h3>
              <button
                type="button"
                onClick={() => setAuthorDraft(null)}
                aria-label="Close"
                className="p-1.5 text-neutral-400 transition-colors hover:text-neutral-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-neutral-200 bg-neutral-100">
                  {authorDraft.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={authorDraft.avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-neutral-300">
                      <Users className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setAvatarPickerOpen(true)}
                  className="border border-neutral-900 bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-700"
                >
                  Choose avatar
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="block font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                  Name
                </label>
                <input
                  type="text"
                  value={authorDraft.name}
                  onChange={(event) =>
                    setAuthorDraft((prev) => (prev ? { ...prev, name: event.target.value } : prev))
                  }
                  className="w-full border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                  Bio
                </label>
                <textarea
                  value={authorDraft.bio}
                  onChange={(event) =>
                    setAuthorDraft((prev) => (prev ? { ...prev, bio: event.target.value } : prev))
                  }
                  rows={3}
                  className="w-full resize-y border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-neutral-200 px-5 py-4">
              <button
                type="button"
                onClick={() => setAuthorDraft(null)}
                className="border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveAuthor}
                disabled={authorSaving}
                className="inline-flex items-center gap-2 bg-neutral-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 disabled:opacity-50"
              >
                {authorSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </button>
            </div>
          </div>

          <MediaLibraryPicker
            open={avatarPickerOpen}
            title="Choose avatar"
            onClose={() => setAvatarPickerOpen(false)}
            onSelect={(url) =>
              setAuthorDraft((prev) => (prev ? { ...prev, avatarUrl: url } : prev))
            }
          />
        </div>
      ) : null}
    </div>
  );
}
