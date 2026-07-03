'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Folder,
  ImagePlus,
  Pencil,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

import {
  deleteMediaAlbumAction,
  deleteMediaAssetAction,
  fetchMediaLibraryAction,
  saveMediaAlbumAction,
  updateMediaAssetAction,
} from '@/lib/farsha-actions';
import { optimizeImageBeforeUpload } from '@/lib/client-image-optimizer';
import { MediaAsset } from '@/lib/media-library';
import {
  useSavedMediaLibrary,
  writeSavedMediaAlbums,
  writeSavedMediaAssets,
  writeSavedMediaLibrary,
} from '@/lib/media-storage';

const maxUploadBytes = 5 * 1024 * 1024;
const acceptedUploadTypes = ['image/jpeg', 'image/png', 'image/webp'];
const acceptedUploadInput = acceptedUploadTypes.join(',');

const inputCls =
  'w-full border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900';

type MediaUploadResponse =
  | {
      ok: true;
      data: {
        asset: MediaAsset;
      };
    }
  | {
      ok: false;
      error: string;
    };

function formatBytes(size: number) {
  if (size <= 0) {
    return 'Unknown size';
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-neutral-700">{label}</span>
      {children}
    </label>
  );
}

export default function MediaLibraryPage() {
  const { albums, assets } = useSavedMediaLibrary();
  const [query, setQuery] = useState('');
  const [albumFilter, setAlbumFilter] = useState('all');
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [optimizationMessage, setOptimizationMessage] = useState('');
  const [uploadAlbumId, setUploadAlbumId] = useState('');
  const [albumName, setAlbumName] = useState('');
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);
  const [editingAsset, setEditingAsset] = useState<MediaAsset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaAsset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [assetDraft, setAssetDraft] = useState({
    title: '',
    altText: '',
    tags: '',
    albumId: '',
  });
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    let active = true;

    async function loadLibrary() {
      setIsLoading(true);
      const result = await fetchMediaLibraryAction();

      if (!active) {
        return;
      }

      if (result.ok) {
        writeSavedMediaLibrary(result.data);
        setLoadError('');
      } else {
        setLoadError(result.error);
      }

      setIsLoading(false);
    }

    loadLibrary();

    return () => {
      active = false;
    };
  }, []);

  const filteredAssets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return assets.filter((asset) => {
      const matchesAlbum = albumFilter === 'all' || asset.albumId === albumFilter;
      const matchesQuery =
        !normalizedQuery ||
        asset.title.toLowerCase().includes(normalizedQuery) ||
        asset.filename.toLowerCase().includes(normalizedQuery) ||
        asset.altText.toLowerCase().includes(normalizedQuery) ||
        asset.tags.some((tag) => tag.includes(normalizedQuery));

      return matchesAlbum && matchesQuery;
    });
  }, [albumFilter, assets, query]);

  const usedAssets = assets.filter((asset) => (asset.usage?.length ?? 0) > 0);
  const unfiledAssets = assets.filter((asset) => !asset.albumId);

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';

    if (!file || isUploading) {
      return;
    }

    if (!acceptedUploadTypes.includes(file.type)) {
      setActionError('Use JPG, PNG, or WebP image files.');
      return;
    }

    if (file.size <= 0) {
      setActionError('Image file is empty.');
      return;
    }

    setIsUploading(true);
    setActionError('');
    setOptimizationMessage('Optimizing image before upload...');
    setSaveState('idle');

    try {
      const optimization = await optimizeImageBeforeUpload(file);

      if (optimization.file.size > maxUploadBytes) {
        setActionError('Image must be 5 MB or smaller after optimization.');
        setOptimizationMessage(optimization.message);
        setSaveState('error');
        return;
      }

      setOptimizationMessage(optimization.message);

      const formData = new FormData();
      formData.append('file', optimization.file);
      formData.append('filenameHint', optimization.originalFile.name);
      formData.append('sourceArea', 'media-library');
      formData.append('originalFilename', optimization.originalFile.name);
      formData.append('originalSize', String(optimization.originalSize));
      formData.append('optimized', String(optimization.optimized));
      if (optimization.width) {
        formData.append('width', String(optimization.width));
      }
      if (optimization.height) {
        formData.append('height', String(optimization.height));
      }
      if (uploadAlbumId) {
        formData.append('albumId', uploadAlbumId);
      }

      const response = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      });
      const payload = (await response.json().catch(() => ({
        ok: false,
        error: 'Upload failed before the server returned details.',
      }))) as MediaUploadResponse;

      if (!response.ok || !payload.ok) {
        setActionError(payload.ok ? 'Upload failed.' : payload.error);
        setSaveState('error');
        return;
      }

      writeSavedMediaAssets([payload.data.asset, ...assets]);
      setSaveState('saved');
    } catch {
      setActionError('Upload failed. Please try again.');
      setSaveState('error');
    } finally {
      setIsUploading(false);
    }
  };

  const saveAlbum = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = albumName.trim();

    if (!name) {
      setActionError('Album name is required.');
      setSaveState('error');
      return;
    }

    const result = await saveMediaAlbumAction({
      id: editingAlbumId ?? undefined,
      name,
    });

    if (result.ok) {
      writeSavedMediaAlbums(result.data);
      setAlbumName('');
      setEditingAlbumId(null);
      setActionError('');
      setSaveState('saved');
    } else {
      setActionError(result.error);
      setSaveState('error');
    }
  };

  const deleteAlbum = async (albumId: string) => {
    const result = await deleteMediaAlbumAction(albumId);

    if (result.ok) {
      writeSavedMediaAlbums(result.data);
      setActionError('');
      setSaveState('saved');
      if (albumFilter === albumId) {
        setAlbumFilter('all');
      }
    } else {
      setActionError(result.error);
      setSaveState('error');
    }
  };

  const openAssetEditor = (asset: MediaAsset) => {
    setEditingAsset(asset);
    setAssetDraft({
      title: asset.title,
      altText: asset.altText,
      tags: asset.tags.join(', '),
      albumId: asset.albumId ?? '',
    });
    setActionError('');
    setSaveState('idle');
  };

  const saveAsset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingAsset) {
      return;
    }

    const result = await updateMediaAssetAction({
      id: editingAsset.id,
      title: assetDraft.title,
      altText: assetDraft.altText,
      tags: assetDraft.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      albumId: assetDraft.albumId || null,
    });

    if (result.ok) {
      writeSavedMediaAssets(result.data);
      setEditingAsset(null);
      setActionError('');
      setSaveState('saved');
    } else {
      setActionError(result.error);
      setSaveState('error');
    }
  };

  const requestDeleteAsset = (asset: MediaAsset) => {
    if ((asset.usage?.length ?? 0) > 0) {
      return;
    }

    setDeleteTarget(asset);
    setActionError('');
    setSaveState('idle');
  };

  const closeDeleteConfirm = () => {
    if (isDeleting) {
      return;
    }

    setDeleteTarget(null);
  };

  const confirmDeleteAsset = async () => {
    if (!deleteTarget || isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deleteMediaAssetAction(deleteTarget.id);

      if (result.ok) {
        writeSavedMediaAssets(result.data);
        if (editingAsset?.id === deleteTarget.id) {
          setEditingAsset(null);
        }
        setDeleteTarget(null);
        setActionError('');
        setSaveState('saved');
      } else {
        setActionError(result.error);
        setSaveState('error');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Media library
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
            Photo library manager
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500 sm:text-base">
            Upload reusable images, organize them into flat albums, and track where each photo is
            used across catalog, CMS, and settings.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {saveState === 'saved' && (
            <span className="inline-flex items-center justify-center gap-1.5 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              <Check className="h-4 w-4" />
              Saved
            </span>
          )}
          {(saveState === 'error' || loadError || actionError) && (
            <span className="inline-flex items-center justify-center gap-1.5 border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              <AlertTriangle className="h-4 w-4" />
              {actionError || loadError || 'Review fields'}
            </span>
          )}
          <label
            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              isUploading
                ? 'cursor-not-allowed bg-neutral-100 text-neutral-400'
                : 'cursor-pointer bg-neutral-900 text-white hover:bg-neutral-800'
            }`}
          >
            <Upload className="h-4 w-4" />
            {isUploading ? 'Uploading...' : 'Upload image'}
            <input
              type="file"
              accept={acceptedUploadInput}
              disabled={isUploading}
              onChange={uploadImage}
              className="sr-only"
            />
          </label>
          {optimizationMessage && (
            <span className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-600">
              {optimizationMessage}
            </span>
          )}
        </div>
      </div>

      {(isLoading || loadError) && (
        <div
          className={`border px-4 py-3 text-sm font-semibold ${
            loadError
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-neutral-200 bg-neutral-50 text-neutral-600'
          }`}
        >
          {loadError || 'Loading media library from database...'}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Assets
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
            {assets.length}
          </p>
          <p className="mt-2 text-sm text-neutral-500">Indexed R2 images</p>
        </div>
        <div className="border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Albums
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
            {albums.length}
          </p>
          <p className="mt-2 text-sm text-neutral-500">Flat organization folders</p>
        </div>
        <div className="border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
            In use
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-emerald-900">
            {usedAssets.length}
          </p>
          <p className="mt-2 text-sm text-emerald-700">Referenced by app content</p>
        </div>
        <div className="border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">
            Unfiled
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-amber-900">
            {unfiledAssets.length}
          </p>
          <p className="mt-2 text-sm text-amber-700">No album assigned</p>
        </div>
      </div>

      <section className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <section className="border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 p-4">
              <h2 className="text-base font-semibold text-neutral-950">Albums</h2>
              <p className="mt-1 text-sm text-neutral-500">Create flat folders for shoots.</p>
            </div>
            <form onSubmit={saveAlbum} className="border-b border-neutral-200 p-4">
              <FieldLabel label={editingAlbumId ? 'Rename album' : 'New album'}>
                <input
                  type="text"
                  value={albumName}
                  onChange={(event) => setAlbumName(event.target.value)}
                  placeholder="Wisuda July"
                  className={inputCls}
                />
              </FieldLabel>
              <div className="mt-3 flex gap-2">
                <button
                  type="submit"
                  className="inline-flex flex-1 items-center justify-center gap-2 bg-neutral-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
                >
                  <Save className="h-4 w-4" />
                  {editingAlbumId ? 'Rename' : 'Create'}
                </button>
                {editingAlbumId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAlbumId(null);
                      setAlbumName('');
                    }}
                    className="border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
            <div className="divide-y divide-neutral-200">
              {albums.map((album) => (
                <div key={album.id} className="flex items-center justify-between gap-2 p-3">
                  <button
                    type="button"
                    onClick={() => setAlbumFilter(album.id)}
                    className={`flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm font-semibold ${
                      albumFilter === album.id
                        ? 'bg-neutral-900 text-white'
                        : 'text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <Folder className="h-4 w-4 shrink-0" />
                    <span className="truncate">{album.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAlbumId(album.id);
                      setAlbumName(album.name);
                    }}
                    aria-label={`Rename ${album.name}`}
                    className="p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteAlbum(album.id)}
                    aria-label={`Delete ${album.name}`}
                    className="p-2 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {albums.length === 0 && (
                <p className="p-4 text-sm text-neutral-500">No albums yet.</p>
              )}
            </div>
          </section>

          <section className="border border-neutral-200 bg-white p-4 shadow-sm">
            <FieldLabel label="Upload into album">
              <select
                value={uploadAlbumId}
                onChange={(event) => setUploadAlbumId(event.target.value)}
                className={inputCls}
              >
                <option value="">Unfiled</option>
                {albums.map((album) => (
                  <option key={album.id} value={album.id}>
                    {album.name}
                  </option>
                ))}
              </select>
            </FieldLabel>
            <p className="mt-2 text-xs leading-relaxed text-neutral-500">
              JPG, PNG, or WebP. Max 5 MB each. Images are reusable until deleted here.
            </p>
          </section>
        </aside>

        <section className="border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 p-4 sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search title, filename, alt text, or tags..."
                  className="w-full border border-neutral-200 bg-neutral-50 py-2.5 pl-9 pr-4 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
              <select
                value={albumFilter}
                onChange={(event) => setAlbumFilter(event.target.value)}
                className={inputCls}
              >
                <option value="all">All albums</option>
                {albums.map((album) => (
                  <option key={album.id} value={album.id}>
                    {album.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3 2xl:grid-cols-4">
            {filteredAssets.map((asset) => (
              <article key={asset.id} className="border border-neutral-200 bg-white">
                <div className="aspect-[4/5] overflow-hidden bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.url} alt={asset.altText || asset.title} className="h-full w-full object-cover" />
                </div>
                <div className="space-y-3 p-3">
                  <div>
                    <h3 className="truncate text-sm font-semibold text-neutral-950">
                      {asset.title}
                    </h3>
                    <p className="mt-1 truncate text-xs text-neutral-500">{asset.filename}</p>
                    <p className="mt-1 text-xs text-neutral-400">
                      {formatBytes(asset.size)} · {formatDate(asset.createdAt)}
                    </p>
                  </div>

                  {asset.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {asset.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-semibold text-neutral-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-neutral-200 pt-3">
                    {(asset.usage?.length ?? 0) > 0 ? (
                      <div className="space-y-1.5">
                        {asset.usage?.slice(0, 2).map((usage, index) => (
                          <p key={`${usage.surface}-${usage.label}-${index}`} className="text-xs text-neutral-600">
                            <span className="font-semibold capitalize">{usage.surface}</span> · {usage.label}
                          </p>
                        ))}
                        {(asset.usage?.length ?? 0) > 2 && (
                          <p className="text-xs font-semibold text-neutral-400">
                            +{(asset.usage?.length ?? 0) - 2} more uses
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs font-semibold text-neutral-400">Unused</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => openAssetEditor(asset)}
                      className="inline-flex items-center justify-center gap-2 border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => requestDeleteAsset(asset)}
                      disabled={(asset.usage?.length ?? 0) > 0}
                      className="inline-flex items-center justify-center gap-2 border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {filteredAssets.length === 0 && (
            <div className="border-t border-neutral-200 px-6 py-14 text-center">
              <ImagePlus className="mx-auto h-9 w-9 text-neutral-300" />
              <p className="mt-3 text-sm font-semibold text-neutral-900">No images found.</p>
              <p className="mt-1 text-sm text-neutral-500">
                Upload an image or adjust the current search and album filter.
              </p>
            </div>
          )}
        </section>
      </section>

      {editingAsset && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden bg-white shadow-2xl md:flex-row">
            <div className="shrink-0 border-b border-neutral-200 bg-neutral-100 md:w-80 md:border-b-0 md:border-r">
              <div className="aspect-[4/5] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={editingAsset.url}
                  alt={editingAsset.altText || editingAsset.title}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <form onSubmit={saveAsset} className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-4 py-4 sm:px-6">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-950">Edit media details</h2>
                  <p className="mt-1 text-sm text-neutral-500">{editingAsset.filename}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingAsset(null)}
                  aria-label="Close media editor"
                  className="p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
                <FieldLabel label="Title">
                  <input
                    type="text"
                    value={assetDraft.title}
                    onChange={(event) =>
                      setAssetDraft((current) => ({ ...current, title: event.target.value }))
                    }
                    className={inputCls}
                  />
                </FieldLabel>
                <FieldLabel label="Alt text">
                  <textarea
                    rows={3}
                    value={assetDraft.altText}
                    onChange={(event) =>
                      setAssetDraft((current) => ({ ...current, altText: event.target.value }))
                    }
                    className={`${inputCls} resize-none`}
                  />
                </FieldLabel>
                <FieldLabel label="Tags">
                  <input
                    type="text"
                    value={assetDraft.tags}
                    onChange={(event) =>
                      setAssetDraft((current) => ({ ...current, tags: event.target.value }))
                    }
                    placeholder="wisuda, green, studio"
                    className={inputCls}
                  />
                </FieldLabel>
                <FieldLabel label="Album">
                  <select
                    value={assetDraft.albumId}
                    onChange={(event) =>
                      setAssetDraft((current) => ({ ...current, albumId: event.target.value }))
                    }
                    className={inputCls}
                  >
                    <option value="">Unfiled</option>
                    {albums.map((album) => (
                      <option key={album.id} value={album.id}>
                        {album.name}
                      </option>
                    ))}
                  </select>
                </FieldLabel>
                <div className="border border-neutral-200 bg-neutral-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                    Usage
                  </p>
                  {(editingAsset.usage?.length ?? 0) > 0 ? (
                    <div className="mt-3 space-y-2">
                      {editingAsset.usage?.map((usage, index) => (
                        <p key={`${usage.surface}-${usage.label}-${index}`} className="text-sm text-neutral-700">
                          <span className="font-semibold capitalize">{usage.surface}</span> · {usage.label}
                          <span className="block text-xs text-neutral-500">{usage.detail}</span>
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-neutral-500">
                      This image is not referenced by catalog, CMS, or settings.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-neutral-200 p-4 sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  onClick={() => requestDeleteAsset(editingAsset)}
                  disabled={(editingAsset.usage?.length ?? 0) > 0}
                  className="inline-flex items-center justify-center gap-2 border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete image
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
                >
                  <Save className="h-4 w-4" />
                  Save details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md border border-red-100 bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-red-50 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-red-500">
                  Confirm delete
                </p>
                <h2 className="mt-1 text-lg font-semibold text-neutral-950">
                  Delete {deleteTarget.title}?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                  This permanently removes the photo from the media library and storage. Use this
                  confirmation to avoid accidental trash-button presses.
                </p>
                <div className="mt-3 flex items-center gap-3 border border-neutral-200 bg-neutral-50 p-2">
                  <div className="h-14 w-11 shrink-0 overflow-hidden bg-neutral-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={deleteTarget.url}
                      alt={deleteTarget.altText || deleteTarget.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-neutral-700">
                      {deleteTarget.filename}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {formatBytes(deleteTarget.size)} / {formatDate(deleteTarget.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                disabled={isDeleting}
                className="border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteAsset}
                disabled={isDeleting}
                className="bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete photo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
