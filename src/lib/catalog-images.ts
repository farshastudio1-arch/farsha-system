import {
  MEDIA_IMAGE_MAX_BYTES,
  MEDIA_IMAGE_MAX_COUNT,
  createMediaAssetKey,
  decodeMediaKey,
  deleteMediaObjectByKey,
  getAllowedMediaImageTypes,
  getMediaBucket,
  isAllowedMediaImageType,
  isMediaAssetKey,
  mediaKeyToUrl,
  mediaUrlToKey,
} from '@/lib/media-library';

export const CATALOG_IMAGE_MAX_BYTES = MEDIA_IMAGE_MAX_BYTES;
export const CATALOG_IMAGE_MAX_COUNT = MEDIA_IMAGE_MAX_COUNT;

export type CatalogImageUpload = {
  key: string;
  url: string;
  contentType: string;
  size: number;
};

export function isAllowedCatalogImageType(contentType: string) {
  return isAllowedMediaImageType(contentType);
}

export function getAllowedCatalogImageTypes() {
  return getAllowedMediaImageTypes();
}

export async function getCatalogImagesBucket(): Promise<R2Bucket> {
  return getMediaBucket();
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
  return createMediaAssetKey('catalog', sanitizeCatalogImageCode(code), contentType);
}

export function isCatalogImageKey(key: string) {
  return isMediaAssetKey(key);
}

export function catalogImageKeyToUrl(key: string) {
  return mediaKeyToUrl(key);
}

export function catalogImageUrlToKey(url: string) {
  return mediaUrlToKey(url);
}

export function decodeKey(value: string) {
  return decodeMediaKey(value);
}

export async function deleteCatalogImageByUrl(url: string) {
  const key = catalogImageUrlToKey(url);

  if (!key || !isCatalogImageKey(key)) {
    return false;
  }

  await deleteMediaObjectByKey(key);

  return true;
}
