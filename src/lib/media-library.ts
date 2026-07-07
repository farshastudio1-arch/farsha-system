import { getCloudflareContext } from '@opennextjs/cloudflare';

export const MEDIA_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const MEDIA_IMAGE_MAX_COUNT = 8;

const allowedImageTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

export type MediaSourceArea =
  | 'media-library'
  | 'catalog'
  | 'cms'
  | 'settings'
  | 'booking-payments';

export type MediaAlbum = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type MediaUsage = {
  surface: 'catalog' | 'cms' | 'settings';
  label: string;
  detail: string;
  href: string;
};

export type MediaAsset = {
  id: string;
  key: string;
  url: string;
  filename: string;
  contentType: string;
  size: number;
  width: number | null;
  height: number | null;
  title: string;
  altText: string;
  tags: string[];
  albumId: string | null;
  sourceArea: MediaSourceArea;
  createdAt: string;
  updatedAt: string;
  usage?: MediaUsage[];
};

export type MediaAssetInput = {
  id?: string;
  key: string;
  url?: string;
  filename: string;
  contentType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  title?: string;
  altText?: string;
  tags?: string[];
  albumId?: string | null;
  sourceArea?: MediaSourceArea;
};

export type MediaAssetUpdate = {
  id: string;
  title: string;
  altText: string;
  tags: string[];
  albumId: string | null;
};

export function isAllowedMediaImageType(contentType: string) {
  return allowedImageTypes.has(contentType.toLowerCase());
}

export function getAllowedMediaImageTypes() {
  return Array.from(allowedImageTypes.keys());
}

export async function getMediaBucket(): Promise<R2Bucket> {
  const { env } = await getCloudflareContext({ async: true });

  if (!env.MEDIA_BUCKET) {
    throw new Error('Cloudflare R2 binding MEDIA_BUCKET is not available.');
  }

  return env.MEDIA_BUCKET;
}

export function sanitizeMediaSegment(value: string, fallback = 'library') {
  const segment = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return segment || fallback;
}

export function createMediaAssetKey(
  sourceArea: MediaSourceArea,
  filename: string,
  contentType: string,
) {
  const extension = allowedImageTypes.get(contentType.toLowerCase()) ?? 'jpg';
  const month = new Date().toISOString().slice(0, 7);
  const name = sanitizeMediaSegment(filename.replace(/\.[^.]+$/, ''), 'upload');

  return `media/${sourceArea}/${month}/${name}-${crypto.randomUUID()}.${extension}`;
}

export function isMediaAssetKey(key: string) {
  return (
    (key.startsWith('media/') ||
      key.startsWith('catalog/') ||
      key.startsWith('booking-payment-proofs/')) &&
    !key.includes('..') &&
    !key.includes('\\') &&
    key.split('/').every(Boolean)
  );
}

export function mediaKeyToUrl(key: string) {
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, '');

  if (publicBaseUrl) {
    return `${publicBaseUrl}/${key.split('/').map(encodeURIComponent).join('/')}`;
  }

  return `/media/r2/${key.split('/').map(encodeURIComponent).join('/')}`;
}

export function decodeMediaKey(value: string) {
  return value
    .split('/')
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment))
    .join('/');
}

export function mediaUrlToKey(url: string) {
  const trimmed = url.trim();

  if (!trimmed) {
    return null;
  }

  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, '');
  if (publicBaseUrl && trimmed.startsWith(`${publicBaseUrl}/`)) {
    return decodeMediaKey(trimmed.slice(publicBaseUrl.length + 1));
  }

  try {
    const parsed = trimmed.startsWith('http')
      ? new URL(trimmed)
      : new URL(trimmed, 'https://farsha.local');

    if (!parsed.pathname.startsWith('/media/r2/')) {
      return null;
    }

    return decodeMediaKey(parsed.pathname.slice('/media/r2/'.length));
  } catch {
    return null;
  }
}

export async function deleteMediaObjectByKey(key: string) {
  if (!isMediaAssetKey(key)) {
    return false;
  }

  const bucket = await getMediaBucket();
  await bucket.delete(key);

  return true;
}

export function normalizeMediaTags(value: unknown) {
  const rawTags = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  return Array.from(
    new Set(
      rawTags
        .map((tag) => (typeof tag === 'string' ? tag.trim().toLowerCase() : ''))
        .filter(Boolean),
    ),
  ).slice(0, 12);
}

export function normalizeMediaSourceArea(value: unknown): MediaSourceArea {
  return value === 'catalog' ||
    value === 'cms' ||
    value === 'settings' ||
    value === 'booking-payments'
    ? value
    : 'media-library';
}
