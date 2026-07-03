'use client';

import { useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, Search, X } from 'lucide-react';

import { fetchMediaLibraryAction } from '@/lib/farsha-actions';
import {
  useSavedMediaLibrary,
  writeSavedMediaLibrary,
} from '@/lib/media-storage';

type MediaLibraryPickerProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  onSelect: (url: string) => void;
};

export default function MediaLibraryPicker({
  open,
  title = 'Choose from library',
  onClose,
  onSelect,
}: MediaLibraryPickerProps) {
  const { albums, assets } = useSavedMediaLibrary();
  const [query, setQuery] = useState('');
  const [albumFilter, setAlbumFilter] = useState('all');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

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
  }, [open]);

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

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-4 py-4 sm:px-6">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Media library
            </p>
            <h2 className="mt-1 text-lg font-semibold text-neutral-950">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close media library"
            className="p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-3 border-b border-neutral-200 p-4 sm:grid-cols-[minmax(0,1fr)_220px] sm:p-5">
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
            className="w-full border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
          >
            <option value="all">All albums</option>
            {albums.map((album) => (
              <option key={album.id} value={album.id}>
                {album.name}
              </option>
            ))}
          </select>
        </div>

        {(isLoading || loadError) && (
          <div
            className={`border-b px-4 py-3 text-sm font-semibold ${
              loadError
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-neutral-200 bg-neutral-50 text-neutral-600'
            }`}
          >
            {loadError || 'Loading media library...'}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {filteredAssets.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {filteredAssets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => {
                    onSelect(asset.url);
                    onClose();
                  }}
                  className="group border border-neutral-200 bg-white text-left transition-colors hover:border-neutral-900"
                >
                  <div className="aspect-[4/5] overflow-hidden bg-neutral-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.url}
                      alt={asset.altText || asset.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                    />
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-semibold text-neutral-950">
                      {asset.title}
                    </p>
                    <p className="mt-1 truncate text-xs text-neutral-500">{asset.filename}</p>
                    {(asset.usage?.length ?? 0) > 0 && (
                      <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                        {asset.usage?.length} use{asset.usage?.length === 1 ? '' : 's'}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center border border-dashed border-neutral-200 bg-neutral-50 text-center">
              <ImageIcon className="h-9 w-9 text-neutral-300" />
              <p className="mt-3 text-sm font-semibold text-neutral-900">No media found.</p>
              <p className="mt-1 max-w-sm text-sm text-neutral-500">
                Upload images from the media library page, then choose them here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
