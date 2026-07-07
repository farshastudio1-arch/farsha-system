'use server';

import { revalidatePath } from 'next/cache';

import { auth } from '../../auth';
import { CMSContent, KebayaItem, SiteSettings } from '@/data/mockData';
import {
  bulkCreateNameGeneratorPoolEntries,
  deleteMediaAlbum,
  deleteMediaAssetRecord,
  deleteCatalogItem,
  ensureMediaAssetForUrl,
  findCatalogItemByCode,
  findMediaAssetById,
  findNameGeneratorUsedNameByName,
  getCmsContent,
  getSiteSettings,
  listNameGeneratorPoolEntries,
  listNameGeneratorUsedNames,
  listCatalogItems,
  listMediaAlbums,
  listMediaAssets,
  NameGeneratorPoolEntry,
  NameGeneratorTableKey,
  NameGeneratorUsedName,
  normalizeGeneratedName,
  recordNameGeneratorUsedName,
  updateCmsContent,
  updateMediaAssetMetadata,
  updateSiteSettings,
  upsertNameGeneratorPoolEntry,
  upsertMediaAlbum,
  upsertCatalogItem,
  deleteNameGeneratorPoolEntry,
} from '@/lib/farsha-db';
import { MediaAlbum, MediaAsset, MediaAssetUpdate, deleteMediaObjectByKey } from '@/lib/media-library';
import { listPosLedger, savePosLedgerSnapshot } from '@/lib/pos-db';
import { PosLedgerState } from '@/lib/pos-ledger';

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
    message.includes('no such column: maps_cta_label') ||
    message.includes('no such column: maps_cta_url') ||
    message.includes('no such column: trust_points') ||
    message.includes('no such column: final_cta_label') ||
    message.includes('no such table: media_assets') ||
    message.includes('no such table: media_albums') ||
    message.includes('no such table: name_generator_pool_entries') ||
    message.includes('no such table: name_generator_used_names')
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

export async function fetchPosLedgerAction(): Promise<ActionResult<PosLedgerState>> {
  try {
    await ensureAdmin();
    return { ok: true, data: await listPosLedger() };
  } catch (error) {
    return {
      ok: false,
      error: getActionErrorMessage(error, 'Failed to load POS ledger.'),
    };
  }
}

export async function savePosLedgerAction(
  ledger: PosLedgerState,
): Promise<ActionResult<PosLedgerState>> {
  try {
    await ensureAdmin();
    const savedLedger = await savePosLedgerSnapshot(ledger);

    revalidatePath('/');
    revalidatePath('/catalog');
    revalidatePath('/admin');
    revalidatePath('/admin/catalog');
    revalidatePath('/pos');
    revalidatePath('/pos/dashboard');

    return { ok: true, data: savedLedger };
  } catch (error) {
    return {
      ok: false,
      error: getActionErrorMessage(error, 'Failed to save POS ledger.'),
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

    const duplicateName = await findNameGeneratorUsedNameByName(item.name);
    if (duplicateName && duplicateName.sourceId !== item.id) {
      return { ok: false, error: 'Name already exists. Use a unique item name.' };
    }

    await upsertCatalogItem(item);
    await recordNameGeneratorUsedName({
      name: item.name,
      source: 'catalog',
      sourceId: item.id,
    });
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

export async function fetchNameGeneratorAction(): Promise<
  ActionResult<{ poolEntries: NameGeneratorPoolEntry[]; usedNames: NameGeneratorUsedName[] }>
> {
  try {
    await ensureAdmin();
    const [poolEntries, usedNames] = await Promise.all([
      listNameGeneratorPoolEntries(),
      listNameGeneratorUsedNames(),
    ]);

    return { ok: true, data: { poolEntries, usedNames } };
  } catch (error) {
    return {
      ok: false,
      error: getActionErrorMessage(error, 'Failed to load name generator.'),
    };
  }
}

export async function saveNameGeneratorPoolEntryAction(input: {
  id?: string;
  tableKey: NameGeneratorTableKey;
  value: string;
}): Promise<ActionResult<NameGeneratorPoolEntry[]>> {
  try {
    await ensureAdmin();
    const entries = await upsertNameGeneratorPoolEntry(input);
    revalidatePath('/admin/name-generator');

    return { ok: true, data: entries };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';

    return {
      ok: false,
      error: message.includes('UNIQUE constraint failed')
        ? 'This pool entry already exists in that table.'
        : getActionErrorMessage(error, 'Failed to save pool entry.'),
    };
  }
}

export async function bulkAddNameGeneratorPoolEntriesAction(input: {
  tableKey: NameGeneratorTableKey;
  values: string[];
}): Promise<ActionResult<{ entries: NameGeneratorPoolEntry[]; addedCount: number; skippedCount: number }>> {
  try {
    await ensureAdmin();
    const result = await bulkCreateNameGeneratorPoolEntries(input);
    revalidatePath('/admin/name-generator');

    return { ok: true, data: result };
  } catch (error) {
    return {
      ok: false,
      error: getActionErrorMessage(error, 'Failed to bulk add pool entries.'),
    };
  }
}

export async function deleteNameGeneratorPoolEntryAction(
  entryId: string,
): Promise<ActionResult<NameGeneratorPoolEntry[]>> {
  try {
    await ensureAdmin();
    const entries = await deleteNameGeneratorPoolEntry(entryId);
    revalidatePath('/admin/name-generator');

    return { ok: true, data: entries };
  } catch (error) {
    return {
      ok: false,
      error: getActionErrorMessage(error, 'Failed to delete pool entry.'),
    };
  }
}

export async function checkGeneratedNameAvailabilityAction(
  name: string,
): Promise<ActionResult<{ available: boolean; normalizedName: string }>> {
  try {
    await ensureAdmin();
    const normalizedName = normalizeGeneratedName(name);
    const usedNames = await listNameGeneratorUsedNames();

    return {
      ok: true,
      data: {
        available: !usedNames.some((usedName) => usedName.normalizedName === normalizedName),
        normalizedName,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: getActionErrorMessage(error, 'Failed to check name availability.'),
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
