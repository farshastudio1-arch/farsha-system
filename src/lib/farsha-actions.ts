'use server';

import { revalidatePath } from 'next/cache';

import { auth } from '../../auth';
import { CMSContent, KebayaItem, SiteSettings } from '@/data/mockData';
import {
  deleteMediaAlbum,
  deleteMediaAssetRecord,
  deleteCatalogItem,
  ensureMediaAssetForUrl,
  findCatalogItemByCode,
  findMediaAssetById,
  getCmsContent,
  getSiteSettings,
  listCatalogItems,
  listMediaAlbums,
  listMediaAssets,
  updateCmsContent,
  updateMediaAssetMetadata,
  updateSiteSettings,
  upsertMediaAlbum,
  upsertCatalogItem,
} from '@/lib/farsha-db';
import { MediaAlbum, MediaAsset, MediaAssetUpdate, deleteMediaObjectByKey } from '@/lib/media-library';

type ActionResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
    };

const catalogSchemaError =
  'Database schema is outdated. Apply the latest D1 migrations, then try again.';

async function ensureAdmin() {
  const session = await auth();

  if (session?.user?.role !== 'admin') {
    throw new Error('Unauthorized');
  }
}

function revalidatePublicAndAdmin() {
  revalidatePath('/');
  revalidatePath('/catalog');
  revalidatePath('/admin');
  revalidatePath('/admin/catalog');
  revalidatePath('/admin/settings');
  revalidatePath('/admin/cms');
  revalidatePath('/privacy-policy');
  revalidatePath('/terms');
}

function getActionErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : '';

  if (
    message.includes('no such column: categories') ||
    message.includes('no such column: measurements') ||
    message.includes('no such column: wear_styles') ||
    message.includes('no such column: landing_categories') ||
    message.includes('no such column: hero_eyebrow') ||
    message.includes('no such column: primary_cta_label') ||
    message.includes('no such column: trust_points') ||
    message.includes('no such column: final_cta_label') ||
    message.includes('no such table: media_assets') ||
    message.includes('no such table: media_albums')
  ) {
    return catalogSchemaError;
  }

  return message || fallback;
}

function getCmsImageUrls(content: CMSContent) {
  return [
    content.heroImageUrl,
    ...content.landingCategories.flatMap((category) => [
      category.imageUrl,
      ...category.imageUrls,
    ]),
  ].filter(Boolean);
}

async function ensureMediaAssetsForUrls(
  urls: string[],
  sourceArea: 'catalog' | 'cms' | 'settings',
  title: string,
) {
  await Promise.allSettled(
    Array.from(new Set(urls)).map((url) => ensureMediaAssetForUrl(url, sourceArea, title)),
  );
}

export async function fetchAdminCatalogItemsAction(): Promise<ActionResult<KebayaItem[]>> {
  try {
    await ensureAdmin();
    return { ok: true, data: await listCatalogItems({ fallbackToMock: false }) };
  } catch (error) {
    return {
      ok: false,
      error: getActionErrorMessage(error, 'Failed to load catalog items.'),
    };
  }
}

export async function saveCatalogItemAction(item: KebayaItem): Promise<ActionResult<KebayaItem[]>> {
  try {
    await ensureAdmin();

    const duplicate = await findCatalogItemByCode(item.code);
    if (duplicate && duplicate.id !== item.id) {
      return { ok: false, error: 'Code already exists. Use a unique inventory code.' };
    }

    await upsertCatalogItem(item);
    await ensureMediaAssetsForUrls(item.imageUrls, 'catalog', item.name);

    revalidatePublicAndAdmin();

    return { ok: true, data: await listCatalogItems() };
  } catch (error) {
    return {
      ok: false,
      error: getActionErrorMessage(error, 'Failed to save catalog item.'),
    };
  }
}

export async function deleteCatalogItemAction(itemId: string): Promise<ActionResult<KebayaItem[]>> {
  try {
    await ensureAdmin();
    await deleteCatalogItem(itemId);
    revalidatePublicAndAdmin();

    return { ok: true, data: await listCatalogItems() };
  } catch (error) {
    return {
      ok: false,
      error: getActionErrorMessage(error, 'Failed to delete catalog item.'),
    };
  }
}

export async function fetchSiteSettingsAction(): Promise<ActionResult<SiteSettings>> {
  try {
    await ensureAdmin();
    return { ok: true, data: await getSiteSettings() };
  } catch (error) {
    return {
      ok: false,
      error: getActionErrorMessage(error, 'Failed to load site settings.'),
    };
  }
}

export async function saveSiteSettingsAction(
  settings: SiteSettings,
): Promise<ActionResult<SiteSettings>> {
  try {
    await ensureAdmin();
    await updateSiteSettings(settings);
    await ensureMediaAssetsForUrls(
      [settings.logoUrl, settings.faviconUrl].filter(Boolean),
      'settings',
      'Site identity image',
    );
    revalidatePublicAndAdmin();

    return { ok: true, data: await getSiteSettings() };
  } catch (error) {
    return {
      ok: false,
      error: getActionErrorMessage(error, 'Failed to save site settings.'),
    };
  }
}

export async function fetchCmsContentAction(): Promise<ActionResult<CMSContent>> {
  try {
    await ensureAdmin();
    return { ok: true, data: await getCmsContent() };
  } catch (error) {
    return {
      ok: false,
      error: getActionErrorMessage(error, 'Failed to load CMS content.'),
    };
  }
}

export async function saveCmsContentAction(content: CMSContent): Promise<ActionResult<CMSContent>> {
  try {
    await ensureAdmin();
    await updateCmsContent(content);
    await ensureMediaAssetsForUrls(getCmsImageUrls(content), 'cms', 'CMS image');
    revalidatePublicAndAdmin();

    return { ok: true, data: await getCmsContent() };
  } catch (error) {
    return {
      ok: false,
      error: getActionErrorMessage(error, 'Failed to save CMS content.'),
    };
  }
}

export async function fetchMediaLibraryAction(): Promise<
  ActionResult<{ albums: MediaAlbum[]; assets: MediaAsset[] }>
> {
  try {
    await ensureAdmin();
    const [albums, assets] = await Promise.all([listMediaAlbums(), listMediaAssets()]);

    return { ok: true, data: { albums, assets } };
  } catch (error) {
    return {
      ok: false,
      error: getActionErrorMessage(error, 'Failed to load media library.'),
    };
  }
}

export async function saveMediaAlbumAction(input: {
  id?: string;
  name: string;
}): Promise<ActionResult<MediaAlbum[]>> {
  try {
    await ensureAdmin();
    const albums = await upsertMediaAlbum(input);
    revalidatePath('/admin/media');

    return { ok: true, data: albums };
  } catch (error) {
    return {
      ok: false,
      error: getActionErrorMessage(error, 'Failed to save album.'),
    };
  }
}

export async function deleteMediaAlbumAction(albumId: string): Promise<ActionResult<MediaAlbum[]>> {
  try {
    await ensureAdmin();
    const albums = await deleteMediaAlbum(albumId);
    revalidatePath('/admin/media');

    return { ok: true, data: albums };
  } catch (error) {
    return {
      ok: false,
      error: getActionErrorMessage(error, 'Failed to delete album.'),
    };
  }
}

export async function updateMediaAssetAction(
  input: MediaAssetUpdate,
): Promise<ActionResult<MediaAsset[]>> {
  try {
    await ensureAdmin();
    const assets = await updateMediaAssetMetadata(input);
    revalidatePath('/admin/media');

    return { ok: true, data: assets };
  } catch (error) {
    return {
      ok: false,
      error: getActionErrorMessage(error, 'Failed to update media asset.'),
    };
  }
}

export async function deleteMediaAssetAction(assetId: string): Promise<ActionResult<MediaAsset[]>> {
  try {
    await ensureAdmin();
    const asset = await findMediaAssetById(assetId);

    if (!asset) {
      return { ok: false, error: 'Media asset not found.' };
    }

    if ((asset.usage?.length ?? 0) > 0) {
      return {
        ok: false,
        error: 'This image is still used. Remove it from catalog, CMS, or settings first.',
      };
    }

    await deleteMediaObjectByKey(asset.key);
    await deleteMediaAssetRecord(assetId);
    revalidatePath('/admin/media');

    return { ok: true, data: await listMediaAssets() };
  } catch (error) {
    return {
      ok: false,
      error: getActionErrorMessage(error, 'Failed to delete media asset.'),
    };
  }
}
