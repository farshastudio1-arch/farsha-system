'use server';

import { revalidatePath } from 'next/cache';

import { auth } from '../../auth';
import {
  archiveCustomer,
  attachCustomerToRecord,
  getCustomerProfile,
  listCustomers,
  updateCustomer,
  upsertCustomerFromContact,
  type CreateCustomerInput,
  type CustomerDateBasis,
  type CustomerProfile,
  type CustomerRecord,
  type CustomerStatus,
  type UpdateCustomerInput,
} from '@/lib/customer-db';
import { CMSContent, KebayaItem, SiteSettings } from '@/data/mockData';
import { BookingCatalogPressureMap, listBookingCatalogPressure } from '@/lib/booking-db';
import {
  bulkCreateNameGeneratorPoolEntries,
  createCatalogItemWithGeneratedCode,
  deleteMediaAlbum,
  deleteMediaAssetRecord,
  deleteCatalogItem,
  ensureMediaAssetForUrl,
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
    message.includes('no such table: name_generator_used_names') ||
    message.includes('no such table: customers') ||
    message.includes('no such column: customer_id')
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

export async function fetchBookingCatalogPressureAction(): Promise<
  ActionResult<BookingCatalogPressureMap>
> {
  try {
    await ensureAdmin();
    return { ok: true, data: await listBookingCatalogPressure() };
  } catch (error) {
    return {
      ok: false,
      error: getActionErrorMessage(error, 'Failed to load booking visibility.'),
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
    revalidatePath('/pos/transactions');
    revalidatePath('/pos/customers');
    revalidatePath('/pos/finance');

    return { ok: true, data: savedLedger };
  } catch (error) {
    return {
      ok: false,
      error: getActionErrorMessage(error, 'Failed to save POS ledger.'),
    };
  }
}

export async function fetchCustomersAction(input: {
  query?: string;
  status?: CustomerStatus | 'all';
  dateFrom?: string;
  dateTo?: string;
  dateBasis?: CustomerDateBasis;
  limit?: number;
} = {}): Promise<ActionResult<CustomerRecord[]>> {
  try {
    await ensureAdmin();
    return { ok: true, data: await listCustomers(input) };
  } catch (error) {
    return {
      ok: false,
      error: getActionErrorMessage(error, 'Failed to load customers.'),
    };
  }
}

export async function fetchCustomerProfileAction(
  customerId: string,
  input: {
    dateFrom?: string;
    dateTo?: string;
  } = {},
): Promise<ActionResult<CustomerProfile | null>> {
  try {
    await ensureAdmin();
    return { ok: true, data: await getCustomerProfile(customerId, input) };
  } catch (error) {
    return {
      ok: false,
      error: getActionErrorMessage(error, 'Failed to load customer profile.'),
    };
  }
}

function revalidateCustomerPaths() {
  revalidatePath('/pos');
  revalidatePath('/pos/transactions');
  revalidatePath('/pos/bookings');
  revalidatePath('/pos/fitting');
  revalidatePath('/pos/customers');
  revalidatePath('/pos/finance');
}

export async function saveCustomerAction(input: CreateCustomerInput | UpdateCustomerInput): Promise<ActionResult<CustomerRecord>> {
  try {
    const session = await auth();

    if (session?.user?.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    const actor = session.user.email ?? null;
    let savedCustomer: CustomerRecord;

    if ('id' in input && input.id) {
      savedCustomer = await updateCustomer({ ...input, actor });
    } else {
      const createInput = input as CreateCustomerInput;
      savedCustomer = await upsertCustomerFromContact({
        ...createInput,
        source: createInput.source ?? 'manual',
        actor,
      });
    }

    revalidateCustomerPaths();

    return { ok: true, data: savedCustomer };
  } catch (error) {
    return {
      ok: false,
      error: getActionErrorMessage(error, 'Failed to save customer.'),
    };
  }
}

export async function archiveCustomerAction(customerId: string): Promise<ActionResult<CustomerRecord>> {
  try {
    const session = await auth();

    if (session?.user?.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    const archived = await archiveCustomer(customerId, session.user.email ?? null);

    revalidateCustomerPaths();

    return { ok: true, data: archived };
  } catch (error) {
    return {
      ok: false,
      error: getActionErrorMessage(error, 'Failed to archive customer.'),
    };
  }
}

export async function attachCustomerToRecordAction(input: {
  customerId: string;
  targetType: 'pos_transaction' | 'booking' | 'fitting';
  targetId: string;
}): Promise<ActionResult<CustomerProfile | null>> {
  try {
    const session = await auth();

    if (session?.user?.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    const profile = await attachCustomerToRecord({
      ...input,
      actor: session.user.email ?? null,
    });

    revalidateCustomerPaths();

    return { ok: true, data: profile };
  } catch (error) {
    return {
      ok: false,
      error: getActionErrorMessage(error, 'Failed to link customer.'),
    };
  }
}

export async function ensurePosCustomerAction(input: {
  displayName: string;
  primaryPhone: string;
}): Promise<ActionResult<CustomerRecord>> {
  try {
    const session = await auth();

    if (session?.user?.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    const customer = await upsertCustomerFromContact({
      displayName: input.displayName,
      primaryPhone: input.primaryPhone,
      source: 'pos',
      actor: session.user.email ?? null,
    });

    revalidatePath('/pos/customers');

    return { ok: true, data: customer };
  } catch (error) {
    return {
      ok: false,
      error: getActionErrorMessage(error, 'Failed to save POS customer.'),
    };
  }
}

export async function saveCatalogItemAction(item: KebayaItem): Promise<ActionResult<KebayaItem[]>> {
  try {
    await ensureAdmin();

    const duplicateName = await findNameGeneratorUsedNameByName(item.name);
    if (duplicateName && duplicateName.sourceId !== item.id) {
      return { ok: false, error: 'Name already exists. Use a unique item name.' };
    }

    const savedItem = await createCatalogItemWithGeneratedCode(item);
    await recordNameGeneratorUsedName({
      name: savedItem.name,
      source: 'catalog',
      sourceId: savedItem.id,
    });
    await ensureMediaAssetsForUrls(savedItem.imageUrls, 'catalog', savedItem.name);

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
