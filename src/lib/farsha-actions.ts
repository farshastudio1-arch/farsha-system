'use server';

import { revalidatePath } from 'next/cache';

import { auth } from '../../auth';
import { CMSContent, KebayaItem, SiteSettings } from '@/data/mockData';
import { deleteCatalogImageByUrl } from '@/lib/catalog-images';
import {
  deleteCatalogItem,
  findCatalogItemByCode,
  findCatalogItemById,
  getCmsContent,
  getSiteSettings,
  listCatalogItems,
  updateCmsContent,
  updateSiteSettings,
  upsertCatalogItem,
} from '@/lib/farsha-db';

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

async function deleteStoredCatalogImages(urls: string[]) {
  await Promise.allSettled(urls.map((url) => deleteCatalogImageByUrl(url)));
}

function getActionErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : '';

  if (
    message.includes('no such column: categories') ||
    message.includes('no such column: measurements') ||
    message.includes('no such column: landing_categories')
  ) {
    return catalogSchemaError;
  }

  return message || fallback;
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

    const existing = await findCatalogItemById(item.id);
    const duplicate = await findCatalogItemByCode(item.code);
    if (duplicate && duplicate.id !== item.id) {
      return { ok: false, error: 'Code already exists. Use a unique inventory code.' };
    }

    await upsertCatalogItem(item);

    if (existing) {
      const nextImageUrls = new Set(item.imageUrls);
      const removedImageUrls = existing.imageUrls.filter((url) => !nextImageUrls.has(url));
      await deleteStoredCatalogImages(removedImageUrls);
    }

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
    const existing = await findCatalogItemById(itemId);
    await deleteCatalogItem(itemId);
    await deleteStoredCatalogImages(existing?.imageUrls ?? []);
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
    revalidatePublicAndAdmin();

    return { ok: true, data: await getCmsContent() };
  } catch (error) {
    return {
      ok: false,
      error: getActionErrorMessage(error, 'Failed to save CMS content.'),
    };
  }
}
