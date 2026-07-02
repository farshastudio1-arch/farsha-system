import { getCloudflareContext } from '@opennextjs/cloudflare';

export const CATALOG_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const CATALOG_IMAGE_MAX_COUNT = 8;

const allowedImageTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

export type CatalogImageUpload = {
  key: string;
  url: string;
  contentType: string;
  size: number;
};

export function isAllowedCatalogImageType(contentType: string) {
  return allowedImageTypes.has(contentType.toLowerCase());
}

export function getAllowedCatalogImageTypes() {
  return Array.from(allowedImageTypes.keys());
}

export async function getCatalogImagesBucket(): Promise<R2Bucket> {
  const { env } = await getCloudflareContext({ async: true });

  if (!env.CATALOG_IMAGES) {
    throw new Error('Cloudflare R2 binding CATALOG_IMAGES is not available.');
  }

  return env.CATALOG_IMAGES;
}

export function sanitizeCatalogImageCode(code: string) {
  const value = code
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return value || 'draft';
}

export function createCatalogImageKey(code: string, contentType: string) {
  const extension = allowedImageTypes.get(contentType.toLowerCase()) ?? 'jpg';
  const month = new Date().toISOString().slice(0, 7);

  return `catalog/${sanitizeCatalogImageCode(code)}/${month}/${crypto.randomUUID()}.${extension}`;
}

export function isCatalogImageKey(key: string) {
  return (
    key.startsWith('catalog/') &&
    !key.includes('..') &&
    !key.includes('\\') &&
    key.split('/').every(Boolean)
  );
}

export function catalogImageKeyToUrl(key: string) {
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, '');

  if (publicBaseUrl) {
    return `${publicBaseUrl}/${key.split('/').map(encodeURIComponent).join('/')}`;
  }

  return `/media/r2/${key.split('/').map(encodeURIComponent).join('/')}`;
}

export function catalogImageUrlToKey(url: string) {
  const trimmed = url.trim();

  if (!trimmed) {
    return null;
  }

  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, '');
  if (publicBaseUrl && trimmed.startsWith(`${publicBaseUrl}/`)) {
    return decodeKey(trimmed.slice(publicBaseUrl.length + 1));
  }

  try {
    const parsed = trimmed.startsWith('http')
      ? new URL(trimmed)
      : new URL(trimmed, 'https://farsha.local');

    if (!parsed.pathname.startsWith('/media/r2/')) {
      return null;
    }

    return decodeKey(parsed.pathname.slice('/media/r2/'.length));
  } catch {
    return null;
  }
}

export function decodeKey(value: string) {
  return value
    .split('/')
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment))
    .join('/');
}

export async function deleteCatalogImageByUrl(url: string) {
  const key = catalogImageUrlToKey(url);

  if (!key || !isCatalogImageKey(key)) {
    return false;
  }

  const bucket = await getCatalogImagesBucket();
  await bucket.delete(key);

  return true;
}
