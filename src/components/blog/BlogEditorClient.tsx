'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ImageIcon, Loader2, Trash2 } from 'lucide-react';

import MediaLibraryPicker from '@/components/admin/MediaLibraryPicker';
import BlogTiptapEditor from '@/components/blog/BlogTiptapEditor';
import { slugify, type TiptapDoc } from '@/lib/blog-content';
import {
  deleteBlogPostAction,
  saveBlogPostAction,
} from '@/lib/blog-actions';
import type { AdminBlogPost, BlogAuthor } from '@/lib/blog-db';

type BlogEditorClientProps = {
  post: AdminBlogPost | null;
  authors: BlogAuthor[];
};

const emptyDoc: TiptapDoc = { type: 'doc', content: [] };

const fieldClass =
  'w-full border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition-colors focus:ring-2 focus:ring-neutral-900';
const labelClass =
  'block font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-500';

export default function BlogEditorClient({ post, authors }: BlogEditorClientProps) {
  const router = useRouter();

  const [id, setId] = useState<string | null>(post?.id ?? null);
  const [title, setTitle] = useState(post?.title ?? '');
  const [slug, setSlug] = useState(post?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(Boolean(post?.slug));
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '');
  const [coverUrl, setCoverUrl] = useState(post?.coverUrl ?? '');
  const [authorId, setAuthorId] = useState(post?.authorId ?? '');
  const [published, setPublished] = useState(post?.published ?? false);
  const [body, setBody] = useState<TiptapDoc>(post?.bodyJson ?? emptyDoc);
  const [repurpose, setRepurpose] = useState({
    sharedX: post?.repurpose.sharedX ?? false,
    sharedThreads: post?.repurpose.sharedThreads ?? false,
    madeVideo: post?.repurpose.madeVideo ?? false,
  });

  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const isNew = !id;

  function handleTitleChange(value: string) {
    setTitle(value);

    // Keep the slug in sync with the title until the author edits it by hand.
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  async function handleSave() {
    setError('');
    setNotice('');

    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    if (published && !coverUrl) {
      setError('A cover image is required to publish. Add one or save as a draft.');
      return;
    }

    setSaving(true);

    const result = await saveBlogPostAction({
      id,
      title,
      slug,
      excerpt,
      coverUrl,
      bodyJson: body,
      authorId: authorId || null,
      published,
      repurpose,
    });

    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    const saved = result.data;
    setId(saved.id);
    setSlug(saved.slug);
    setSlugTouched(true);
    setNotice('Saved.');

    if (isNew) {
      // Swap the URL to the real post id so subsequent saves update in place.
      router.replace(`/admin/blog/${saved.id}`);
    }
  }

  async function handleDelete() {
    if (!id) {
      router.push('/admin/blog');
      return;
    }

    if (!window.confirm('Delete this post permanently? This cannot be undone.')) {
      return;
    }

    setDeleting(true);
    const result = await deleteBlogPostAction(id);
    setDeleting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.push('/admin/blog');
  }

  const selectedAuthor = authors.find((author) => author.id === authorId) ?? null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          href="/admin/blog"
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to posts
        </Link>
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
          {isNew ? 'New post' : published ? 'Published' : 'Draft'}
        </span>
      </div>

      {error ? (
        <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="mb-4 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {notice}
        </div>
      ) : null}

      <div className="space-y-6">
        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="blog-title">
            Title
          </label>
          <input
            id="blog-title"
            type="text"
            value={title}
            onChange={(event) => handleTitleChange(event.target.value)}
            placeholder="e.g. 5 cara memadukan kebaya untuk akad"
            className={`${fieldClass} text-base font-medium`}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="blog-slug">
              Slug
            </label>
            <input
              id="blog-slug"
              type="text"
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
              placeholder="auto-from-title"
              className={`${fieldClass} font-mono text-xs`}
            />
            <p className="text-xs text-neutral-400">/blog/{slug || 'auto-from-title'}</p>
          </div>

          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="blog-author">
              Author
            </label>
            <select
              id="blog-author"
              value={authorId}
              onChange={(event) => setAuthorId(event.target.value)}
              className={fieldClass}
            >
              <option value="">— No author —</option>
              {authors.map((author) => (
                <option key={author.id} value={author.id}>
                  {author.name}
                </option>
              ))}
            </select>
            {authors.length === 0 ? (
              <p className="text-xs text-neutral-400">
                Add an author from the blog list first.
              </p>
            ) : null}
          </div>
        </div>

        {/* Cover */}
        <div className="space-y-1.5">
          <label className={labelClass}>Cover image {published ? '(required)' : '(optional for drafts)'}</label>
          <div className="flex items-center gap-4">
            <div className="h-24 w-32 shrink-0 overflow-hidden border border-neutral-200 bg-neutral-100">
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverUrl} alt="Cover preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-neutral-300">
                  <ImageIcon className="h-6 w-6" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setCoverPickerOpen(true)}
                className="border border-neutral-900 bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-700"
              >
                Choose cover
              </button>
              {coverUrl ? (
                <button
                  type="button"
                  onClick={() => setCoverUrl('')}
                  className="text-xs font-medium text-neutral-500 transition-colors hover:text-red-600"
                >
                  Remove cover
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Excerpt */}
        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="blog-excerpt">
            Excerpt (optional)
          </label>
          <textarea
            id="blog-excerpt"
            value={excerpt}
            onChange={(event) => setExcerpt(event.target.value)}
            rows={2}
            placeholder="Leave empty to auto-generate from the first ~160 characters."
            className={`${fieldClass} resize-y`}
          />
        </div>

        {/* Body */}
        <div className="space-y-1.5">
          <label className={labelClass}>Body</label>
          <BlogTiptapEditor value={body} onChange={setBody} />
        </div>

        {/* Repurposing tracker */}
        <div className="space-y-3 border border-neutral-200 bg-neutral-50 p-4">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            Repurposing tracker (admin only)
          </p>
          <div className="flex flex-wrap gap-4">
            {([
              ['sharedX', 'Shared to X'],
              ['sharedThreads', 'Shared to Threads'],
              ['madeVideo', 'Made into short video'],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={repurpose[key]}
                  onChange={(event) =>
                    setRepurpose((prev) => ({ ...prev, [key]: event.target.checked }))
                  }
                  className="h-4 w-4 accent-neutral-900"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Publish + actions */}
        <div className="flex flex-col gap-4 border-t border-neutral-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-3 text-sm font-medium text-neutral-800">
            <button
              type="button"
              role="switch"
              aria-checked={published}
              onClick={() => setPublished((value) => !value)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                published ? 'bg-emerald-600' : 'bg-neutral-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  published ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
            {published ? 'Published' : 'Draft'}
          </label>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || saving}
              className="inline-flex items-center gap-2 border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-600 transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {isNew ? 'Discard' : 'Delete'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || deleting}
              className="inline-flex items-center gap-2 bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </button>
          </div>
        </div>
      </div>

      {selectedAuthor ? (
        <p className="mt-4 text-xs text-neutral-400">
          Byline: {selectedAuthor.name}
        </p>
      ) : null}

      <MediaLibraryPicker
        open={coverPickerOpen}
        title="Choose cover image"
        onClose={() => setCoverPickerOpen(false)}
        onSelect={(url) => setCoverUrl(url)}
      />
    </div>
  );
}
