import { CMSContent, KebayaItem, mockCMS, mockKebayas, mockSiteSettings, SiteSettings } from '@/data/mockData';
import { normalizeCatalogItem } from '@/lib/catalog-normalization';
import { normalizeCmsContent } from '@/lib/cms-normalization';
import { getD1Database } from '@/lib/cloudflare';
import {
  MediaAlbum,
  MediaAsset,
  MediaAssetInput,
  MediaAssetUpdate,
  MediaUsage,
  mediaKeyToUrl,
  mediaUrlToKey,
  normalizeMediaSourceArea,
  normalizeMediaTags,
} from '@/lib/media-library';
import { normalizeSiteSettings } from '@/lib/site-settings-normalization';

type CatalogRow = {
  id: string;
  code: string;
  name: string;
  color: string;
  size: KebayaItem['size'];
  model: KebayaItem['model'];
  rental_price: number;
  compare_at_rental_price?: number | null;
  status: KebayaItem['status'];
  rental_end_date: string | null;
  image_urls: string;
  description: string;
  wear_styles?: string | null;
  categories?: string | null;
  measurements?: string | null;
};

const catalogSelectFieldsWithComparePrice =
  `id, code, name, color, size, model, rental_price, compare_at_rental_price, status, rental_end_date,
  image_urls, description, wear_styles, categories, measurements`;
const catalogSelectFieldsLegacy =
  `id, code, name, color, size, model, rental_price, status, rental_end_date,
  image_urls, description, wear_styles, categories, measurements`;

function isMissingComparePriceColumnError(error: unknown) {
  return String(error).includes('no such column: compare_at_rental_price');
}

async function hasCatalogComparePriceColumn(db: D1Database) {
  try {
    const result = await db.prepare('PRAGMA table_info(kebaya_items)').all<{ name: string }>();
    return result.results.some((column) => column.name === 'compare_at_rental_price');
  } catch {
    return false;
  }
}

type CmsRow = {
  hero_eyebrow?: string | null;
  hero_title: string;
  hero_subtitle: string;
  hero_image_url: string;
  primary_cta_label?: string | null;
  whatsapp_cta_label?: string | null;
  maps_cta_label?: string | null;
  maps_cta_url?: string | null;
  tiktok_cta_label?: string | null;
  hero_meta_text?: string | null;
  reminder_label?: string | null;
  promo_text: string;
  category_eyebrow?: string | null;
  category_title?: string | null;
  trust_points?: string | null;
  final_eyebrow?: string | null;
  about_title: string;
  about_text: string;
  final_cta_label?: string | null;
  studio_address: string;
  studio_phone: string;
  landing_categories?: string | null;
};

type SettingsRow = {
  studio_name: string;
  tagline: string;
  status: SiteSettings['status'];
  location_label: string;
  whatsapp_number: string;
  email: string;
  address: string;
  instagram_url: string;
  tiktok_url: string;
  maps_url: string;
  currency: SiteSettings['currency'];
  default_product_status: SiteSettings['defaultProductStatus'];
  default_sort: SiteSettings['defaultSort'];
  catalog_card_mode: SiteSettings['catalogCardMode'];
  show_prices: number;
  show_availability_badges: number;
  show_product_code: number;
  show_product_model: number;
  show_product_size: number;
  show_product_color: number;
  show_product_description: number;
  show_card_cta: number;
  default_mobile_grid: SiteSettings['defaultMobileGrid'];
  default_desktop_grid: SiteSettings['defaultDesktopGrid'];
  brand_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  primary_color: string;
  surface_color: string;
  border_color: string;
  border_radius: number;
  logo_url: string;
  favicon_url: string;
  show_promo_banner: number;
  updated_at: string;
};

type MediaAlbumRow = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type MediaAssetRow = {
  id: string;
  key: string;
  url: string;
  filename: string;
  content_type: string;
  size: number;
  width: number | null;
  height: number | null;
  title: string;
  alt_text: string;
  tags: string;
  album_id: string | null;
  source_area: string;
  created_at: string;
  updated_at: string;
};

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function catalogRowToItem(row: CatalogRow, index: number): KebayaItem | null {
  return normalizeCatalogItem(
    {
      id: row.id,
      code: row.code,
      name: row.name,
      color: row.color,
      size: row.size,
      model: row.model,
      rentalPrice: row.rental_price,
      compareAtRentalPrice: row.compare_at_rental_price ?? null,
      status: row.status,
      rentalEndDate: row.rental_end_date,
      imageUrls: parseJson<string[]>(row.image_urls, []),
      description: row.description,
      wearStyles: parseJson<KebayaItem['wearStyles']>(row.wear_styles, []),
      categories: parseJson<KebayaItem['categories']>(row.categories, undefined),
      measurements: parseJson<KebayaItem['measurements']>(row.measurements, undefined),
    },
    index,
  );
}

async function listCatalogRows(db: D1Database) {
  const selectFields = (await hasCatalogComparePriceColumn(db))
    ? catalogSelectFieldsWithComparePrice
    : catalogSelectFieldsLegacy;

  try {
    return await db
      .prepare(
        `SELECT ${selectFields}
         FROM kebaya_items
         WHERE status != 'archived'
         ORDER BY created_at DESC, code ASC`,
      )
      .all<CatalogRow>();
  } catch (error) {
    if (!isMissingComparePriceColumnError(error)) {
      throw error;
    }

    return db
      .prepare(
        `SELECT ${catalogSelectFieldsLegacy}
         FROM kebaya_items
         WHERE status != 'archived'
         ORDER BY created_at DESC, code ASC`,
      )
      .all<CatalogRow>();
  }
}

async function findCatalogRowByCode(db: D1Database, code: string) {
  const selectFields = (await hasCatalogComparePriceColumn(db))
    ? catalogSelectFieldsWithComparePrice
    : catalogSelectFieldsLegacy;

  try {
    return await db
      .prepare(
        `SELECT ${selectFields}
         FROM kebaya_items
         WHERE lower(code) = lower(?) AND status != 'archived'
         LIMIT 1`,
      )
      .bind(code)
      .first<CatalogRow>();
  } catch (error) {
    if (!isMissingComparePriceColumnError(error)) {
      throw error;
    }

    return db
      .prepare(
        `SELECT ${catalogSelectFieldsLegacy}
         FROM kebaya_items
         WHERE lower(code) = lower(?) AND status != 'archived'
         LIMIT 1`,
      )
      .bind(code)
      .first<CatalogRow>();
  }
}

async function findCatalogRowById(db: D1Database, itemId: string) {
  const selectFields = (await hasCatalogComparePriceColumn(db))
    ? catalogSelectFieldsWithComparePrice
    : catalogSelectFieldsLegacy;

  try {
    return await db
      .prepare(
        `SELECT ${selectFields}
         FROM kebaya_items
         WHERE id = ? AND status != 'archived'
         LIMIT 1`,
      )
      .bind(itemId)
      .first<CatalogRow>();
  } catch (error) {
    if (!isMissingComparePriceColumnError(error)) {
      throw error;
    }

    return db
      .prepare(
        `SELECT ${catalogSelectFieldsLegacy}
         FROM kebaya_items
         WHERE id = ? AND status != 'archived'
         LIMIT 1`,
      )
      .bind(itemId)
      .first<CatalogRow>();
  }
}

function cmsRowToContent(row: CmsRow): CMSContent {
  return normalizeCmsContent({
    heroEyebrow: row.hero_eyebrow ?? undefined,
    heroTitle: row.hero_title,
    heroSubtitle: row.hero_subtitle,
    heroImageUrl: row.hero_image_url,
    primaryCtaLabel: row.primary_cta_label ?? undefined,
    whatsappCtaLabel: row.whatsapp_cta_label ?? undefined,
    mapsCtaLabel: row.maps_cta_label ?? undefined,
    mapsCtaUrl: row.maps_cta_url ?? undefined,
    tiktokCtaLabel: row.tiktok_cta_label ?? undefined,
    heroMetaText: row.hero_meta_text ?? undefined,
    reminderLabel: row.reminder_label ?? undefined,
    promoText: row.promo_text,
    categoryEyebrow: row.category_eyebrow ?? undefined,
    categoryTitle: row.category_title ?? undefined,
    trustPoints: parseJson<CMSContent['trustPoints']>(row.trust_points, mockCMS.trustPoints),
    finalEyebrow: row.final_eyebrow ?? undefined,
    aboutTitle: row.about_title,
    aboutText: row.about_text,
    finalCtaLabel: row.final_cta_label ?? undefined,
    studioAddress: row.studio_address,
    studioPhone: row.studio_phone,
    landingCategories: parseJson<CMSContent['landingCategories']>(row.landing_categories, []),
  });
}

function settingsRowToSettings(row: SettingsRow): SiteSettings {
  return normalizeSiteSettings({
    studioName: row.studio_name,
    tagline: row.tagline,
    status: row.status,
    locationLabel: row.location_label,
    whatsappNumber: row.whatsapp_number,
    email: row.email,
    address: row.address,
    instagramUrl: row.instagram_url,
    tiktokUrl: row.tiktok_url,
    mapsUrl: row.maps_url,
    currency: row.currency,
    defaultProductStatus: row.default_product_status,
    defaultSort: row.default_sort,
    catalogCardMode: row.catalog_card_mode,
    showPrices: row.show_prices === 1,
    showAvailabilityBadges: row.show_availability_badges === 1,
    showProductCode: row.show_product_code === 1,
    showProductModel: row.show_product_model === 1,
    showProductSize: row.show_product_size === 1,
    showProductColor: row.show_product_color === 1,
    showProductDescription: row.show_product_description === 1,
    showCardCta: row.show_card_cta === 1,
    defaultMobileGrid: row.default_mobile_grid,
    defaultDesktopGrid: row.default_desktop_grid,
    brandColor: row.brand_color,
    accentColor: row.accent_color,
    backgroundColor: row.background_color,
    textColor: row.text_color,
    primaryColor: row.primary_color,
    surfaceColor: row.surface_color,
    borderColor: row.border_color,
    borderRadius: row.border_radius,
    logoUrl: row.logo_url,
    faviconUrl: row.favicon_url,
    showPromoBanner: row.show_promo_banner === 1,
    updatedAt: row.updated_at,
  });
}

function mediaAlbumRowToAlbum(row: MediaAlbumRow): MediaAlbum {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mediaAssetRowToAsset(row: MediaAssetRow): MediaAsset {
  return {
    id: row.id,
    key: row.key,
    url: row.url,
    filename: row.filename,
    contentType: row.content_type,
    size: row.size,
    width: row.width,
    height: row.height,
    title: row.title,
    altText: row.alt_text,
    tags: normalizeMediaTags(parseJson<unknown>(row.tags, [])),
    albumId: row.album_id,
    sourceArea: normalizeMediaSourceArea(row.source_area),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isSchemaMissing(error: unknown, tableName: string) {
  const message = error instanceof Error ? error.message : '';

  return message.includes(`no such table: ${tableName}`);
}

function createMediaUsageFromCatalog(items: KebayaItem[], url: string): MediaUsage[] {
  return items.flatMap((item) =>
    item.imageUrls.includes(url)
      ? [
          {
            surface: 'catalog' as const,
            label: item.name,
            detail: item.code,
            href: '/admin/catalog',
          },
        ]
      : [],
  );
}

function createMediaUsageFromCms(content: CMSContent, url: string): MediaUsage[] {
  const usage: MediaUsage[] = [];

  if (content.heroImageUrl === url) {
    usage.push({
      surface: 'cms',
      label: 'Homepage hero',
      detail: 'Hero image',
      href: '/admin/cms',
    });
  }

  content.landingCategories.forEach((category) => {
    if (category.imageUrl === url || category.imageUrls.includes(url)) {
      usage.push({
        surface: 'cms',
        label: category.title,
        detail: 'Landing category image',
        href: '/admin/cms',
      });
    }
  });

  return usage;
}

function createMediaUsageFromSettings(settings: SiteSettings, url: string): MediaUsage[] {
  const usage: MediaUsage[] = [];

  if (settings.logoUrl === url) {
    usage.push({
      surface: 'settings',
      label: 'Site logo',
      detail: 'Public identity',
      href: '/admin/settings',
    });
  }

  if (settings.faviconUrl === url) {
    usage.push({
      surface: 'settings',
      label: 'Favicon',
      detail: 'Browser icon',
      href: '/admin/settings',
    });
  }

  return usage;
}

async function getMediaUsageByUrl(url: string): Promise<MediaUsage[]> {
  const [catalogItems, cmsContent, siteSettings] = await Promise.all([
    listCatalogItems(),
    getCmsContent(),
    getSiteSettings(),
  ]);

  return [
    ...createMediaUsageFromCatalog(catalogItems, url),
    ...createMediaUsageFromCms(cmsContent, url),
    ...createMediaUsageFromSettings(siteSettings, url),
  ];
}

export async function listCatalogItems(options: { fallbackToMock?: boolean } = {}): Promise<KebayaItem[]> {
  const { fallbackToMock = true } = options;

  try {
    const db = await getD1Database();
    const result = await listCatalogRows(db);

    const items = result.results
      .map((row, index) => catalogRowToItem(row, index))
      .filter((item): item is KebayaItem => Boolean(item));

    return items;
  } catch (error) {
    if (!fallbackToMock) {
      throw error;
    }

    return mockKebayas;
  }
}

export async function findCatalogItemByCode(code: string): Promise<KebayaItem | null> {
  const db = await getD1Database();
  const row = await findCatalogRowByCode(db, code);

  return row ? catalogRowToItem(row, 0) : null;
}

export async function findCatalogItemById(itemId: string): Promise<KebayaItem | null> {
  const db = await getD1Database();
  const row = await findCatalogRowById(db, itemId);

  return row ? catalogRowToItem(row, 0) : null;
}

export async function upsertCatalogItem(item: KebayaItem): Promise<void> {
  const db = await getD1Database();
  const normalized = normalizeCatalogItem(item, 0);

  if (!normalized) {
    throw new Error('Catalog item is invalid.');
  }

  try {
    await db
      .prepare(
        `INSERT INTO kebaya_items (
          id, code, name, color, size, model, rental_price, compare_at_rental_price, status, rental_end_date,
          image_urls, description, wear_styles, categories, measurements
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          code = excluded.code,
          name = excluded.name,
          color = excluded.color,
          size = excluded.size,
          model = excluded.model,
          rental_price = excluded.rental_price,
          compare_at_rental_price = excluded.compare_at_rental_price,
          status = excluded.status,
          rental_end_date = excluded.rental_end_date,
          image_urls = excluded.image_urls,
          description = excluded.description,
          wear_styles = excluded.wear_styles,
          categories = excluded.categories,
          measurements = excluded.measurements,
          updated_at = CURRENT_TIMESTAMP`,
      )
      .bind(
        normalized.id,
        normalized.code,
        normalized.name,
        normalized.color,
        normalized.size,
        normalized.model,
        normalized.rentalPrice,
        normalized.compareAtRentalPrice ?? null,
        normalized.status,
        normalized.rentalEndDate,
        JSON.stringify(normalized.imageUrls),
        normalized.description,
        JSON.stringify(normalized.wearStyles),
        JSON.stringify(normalized.categories ?? []),
        JSON.stringify(normalized.measurements ?? {}),
      )
      .run();
  } catch (error) {
    if (!isMissingComparePriceColumnError(error)) {
      throw error;
    }

    if (normalized.compareAtRentalPrice !== null) {
      throw new Error(
        'Compare price cannot be saved until migration 0009_catalog_compare_price.sql is applied.',
      );
    }

    await db
      .prepare(
        `INSERT INTO kebaya_items (
          id, code, name, color, size, model, rental_price, status, rental_end_date,
          image_urls, description, wear_styles, categories, measurements
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          code = excluded.code,
          name = excluded.name,
          color = excluded.color,
          size = excluded.size,
          model = excluded.model,
          rental_price = excluded.rental_price,
          status = excluded.status,
          rental_end_date = excluded.rental_end_date,
          image_urls = excluded.image_urls,
          description = excluded.description,
          wear_styles = excluded.wear_styles,
          categories = excluded.categories,
          measurements = excluded.measurements,
          updated_at = CURRENT_TIMESTAMP`,
      )
      .bind(
        normalized.id,
        normalized.code,
        normalized.name,
        normalized.color,
        normalized.size,
        normalized.model,
        normalized.rentalPrice,
        normalized.status,
        normalized.rentalEndDate,
        JSON.stringify(normalized.imageUrls),
        normalized.description,
        JSON.stringify(normalized.wearStyles),
        JSON.stringify(normalized.categories ?? []),
        JSON.stringify(normalized.measurements ?? {}),
      )
      .run();
  }
}

export async function deleteCatalogItem(itemId: string): Promise<void> {
  const db = await getD1Database();
  await db.prepare('DELETE FROM kebaya_items WHERE id = ?').bind(itemId).run();
}

export async function getCmsContent(): Promise<CMSContent> {
  try {
    const db = await getD1Database();
    const row = await db
      .prepare(
        `SELECT hero_eyebrow, hero_title, hero_subtitle, hero_image_url, primary_cta_label,
          whatsapp_cta_label, maps_cta_label, maps_cta_url, tiktok_cta_label, hero_meta_text,
          reminder_label, promo_text, category_eyebrow, category_title, trust_points,
          final_eyebrow, about_title, about_text, final_cta_label, studio_address, studio_phone,
          landing_categories
         FROM cms_content
         WHERE id = 'main'
         LIMIT 1`,
      )
      .first<CmsRow>();

    return row ? cmsRowToContent(row) : mockCMS;
  } catch {
    return mockCMS;
  }
}

export async function updateCmsContent(content: CMSContent): Promise<void> {
  const db = await getD1Database();
  const normalized = normalizeCmsContent(content);

  await db
    .prepare(
      `INSERT INTO cms_content (
        id, hero_eyebrow, hero_title, hero_subtitle, hero_image_url, primary_cta_label,
        whatsapp_cta_label, maps_cta_label, maps_cta_url, tiktok_cta_label, hero_meta_text,
        reminder_label, promo_text, category_eyebrow, category_title, trust_points, final_eyebrow,
        about_title, about_text, final_cta_label, studio_address, studio_phone, landing_categories
      )
      VALUES ('main', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        hero_eyebrow = excluded.hero_eyebrow,
        hero_title = excluded.hero_title,
        hero_subtitle = excluded.hero_subtitle,
        hero_image_url = excluded.hero_image_url,
        primary_cta_label = excluded.primary_cta_label,
        whatsapp_cta_label = excluded.whatsapp_cta_label,
        maps_cta_label = excluded.maps_cta_label,
        maps_cta_url = excluded.maps_cta_url,
        tiktok_cta_label = excluded.tiktok_cta_label,
        hero_meta_text = excluded.hero_meta_text,
        reminder_label = excluded.reminder_label,
        promo_text = excluded.promo_text,
        category_eyebrow = excluded.category_eyebrow,
        category_title = excluded.category_title,
        trust_points = excluded.trust_points,
        final_eyebrow = excluded.final_eyebrow,
        about_title = excluded.about_title,
        about_text = excluded.about_text,
        final_cta_label = excluded.final_cta_label,
        studio_address = excluded.studio_address,
        studio_phone = excluded.studio_phone,
        landing_categories = excluded.landing_categories,
        updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(
      normalized.heroEyebrow,
      normalized.heroTitle,
      normalized.heroSubtitle,
      normalized.heroImageUrl,
      normalized.primaryCtaLabel,
      normalized.whatsappCtaLabel,
      normalized.mapsCtaLabel,
      normalized.mapsCtaUrl,
      normalized.tiktokCtaLabel,
      normalized.heroMetaText,
      normalized.reminderLabel,
      normalized.promoText,
      normalized.categoryEyebrow,
      normalized.categoryTitle,
      JSON.stringify(normalized.trustPoints),
      normalized.finalEyebrow,
      normalized.aboutTitle,
      normalized.aboutText,
      normalized.finalCtaLabel,
      normalized.studioAddress,
      normalized.studioPhone,
      JSON.stringify(normalized.landingCategories),
    )
    .run();
}

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const db = await getD1Database();
    const row = await db
      .prepare(
        `SELECT studio_name, tagline, status, location_label, whatsapp_number, email,
          address, instagram_url, tiktok_url, maps_url, currency, default_product_status,
          default_sort, catalog_card_mode, show_prices, show_availability_badges,
          show_product_code, show_product_model, show_product_size, show_product_color,
          show_product_description, show_card_cta, default_mobile_grid, default_desktop_grid,
          brand_color, accent_color, background_color, text_color, primary_color, surface_color,
          border_color, border_radius, logo_url, favicon_url, show_promo_banner, updated_at
         FROM site_settings
         WHERE id = 'main'
         LIMIT 1`,
      )
      .first<SettingsRow>();

    return row ? settingsRowToSettings(row) : mockSiteSettings;
  } catch {
    return mockSiteSettings;
  }
}

export async function updateSiteSettings(settings: SiteSettings): Promise<void> {
  const db = await getD1Database();
  const normalized = normalizeSiteSettings(settings);

  await db
    .prepare(
      `INSERT INTO site_settings (
        id, studio_name, tagline, status, location_label, whatsapp_number, email,
        address, instagram_url, tiktok_url, maps_url, currency, default_product_status,
        default_sort, catalog_card_mode, show_prices, show_availability_badges,
        show_product_code, show_product_model, show_product_size, show_product_color,
        show_product_description, show_card_cta, default_mobile_grid, default_desktop_grid,
        brand_color, accent_color, background_color, text_color, primary_color, surface_color,
        border_color, border_radius, logo_url, favicon_url, show_promo_banner, updated_at
      )
      VALUES ('main', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        studio_name = excluded.studio_name,
        tagline = excluded.tagline,
        status = excluded.status,
        location_label = excluded.location_label,
        whatsapp_number = excluded.whatsapp_number,
        email = excluded.email,
        address = excluded.address,
        instagram_url = excluded.instagram_url,
        tiktok_url = excluded.tiktok_url,
        maps_url = excluded.maps_url,
        currency = excluded.currency,
        default_product_status = excluded.default_product_status,
        default_sort = excluded.default_sort,
        catalog_card_mode = excluded.catalog_card_mode,
        show_prices = excluded.show_prices,
        show_availability_badges = excluded.show_availability_badges,
        show_product_code = excluded.show_product_code,
        show_product_model = excluded.show_product_model,
        show_product_size = excluded.show_product_size,
        show_product_color = excluded.show_product_color,
        show_product_description = excluded.show_product_description,
        show_card_cta = excluded.show_card_cta,
        default_mobile_grid = excluded.default_mobile_grid,
        default_desktop_grid = excluded.default_desktop_grid,
        brand_color = excluded.brand_color,
        accent_color = excluded.accent_color,
        background_color = excluded.background_color,
        text_color = excluded.text_color,
        primary_color = excluded.primary_color,
        surface_color = excluded.surface_color,
        border_color = excluded.border_color,
        border_radius = excluded.border_radius,
        logo_url = excluded.logo_url,
        favicon_url = excluded.favicon_url,
        show_promo_banner = excluded.show_promo_banner,
        updated_at = excluded.updated_at`,
    )
    .bind(
      normalized.studioName,
      normalized.tagline,
      normalized.status,
      normalized.locationLabel,
      normalized.whatsappNumber,
      normalized.email,
      normalized.address,
      normalized.instagramUrl,
      normalized.tiktokUrl,
      normalized.mapsUrl,
      normalized.currency,
      normalized.defaultProductStatus,
      normalized.defaultSort,
      normalized.catalogCardMode,
      normalized.showPrices ? 1 : 0,
      normalized.showAvailabilityBadges ? 1 : 0,
      normalized.showProductCode ? 1 : 0,
      normalized.showProductModel ? 1 : 0,
      normalized.showProductSize ? 1 : 0,
      normalized.showProductColor ? 1 : 0,
      normalized.showProductDescription ? 1 : 0,
      normalized.showCardCta ? 1 : 0,
      normalized.defaultMobileGrid,
      normalized.defaultDesktopGrid,
      normalized.brandColor,
      normalized.accentColor,
      normalized.backgroundColor,
      normalized.textColor,
      normalized.primaryColor,
      normalized.surfaceColor,
      normalized.borderColor,
      normalized.borderRadius,
      normalized.logoUrl,
      normalized.faviconUrl,
      normalized.showPromoBanner ? 1 : 0,
      normalized.updatedAt,
    )
    .run();
}

export async function listMediaAlbums(): Promise<MediaAlbum[]> {
  try {
    const db = await getD1Database();
    const result = await db
      .prepare(
        `SELECT id, name, created_at, updated_at
         FROM media_albums
         ORDER BY lower(name) ASC`,
      )
      .all<MediaAlbumRow>();

    return result.results.map(mediaAlbumRowToAlbum);
  } catch (error) {
    if (isSchemaMissing(error, 'media_albums')) {
      return [];
    }

    throw error;
  }
}

export async function upsertMediaAlbum(input: { id?: string; name: string }): Promise<MediaAlbum[]> {
  const db = await getD1Database();
  const id = input.id ?? `album-${crypto.randomUUID()}`;
  const name = input.name.trim();

  if (!name) {
    throw new Error('Album name is required.');
  }

  await db
    .prepare(
      `INSERT INTO media_albums (id, name)
       VALUES (?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(id, name)
    .run();

  return listMediaAlbums();
}

export async function deleteMediaAlbum(albumId: string): Promise<MediaAlbum[]> {
  const db = await getD1Database();

  await db.batch([
    db.prepare('UPDATE media_assets SET album_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE album_id = ?').bind(albumId),
    db.prepare('DELETE FROM media_albums WHERE id = ?').bind(albumId),
  ]);

  return listMediaAlbums();
}

export async function listMediaAssets(): Promise<MediaAsset[]> {
  try {
    const db = await getD1Database();
    const result = await db
      .prepare(
        `SELECT id, key, url, filename, content_type, size, width, height, title, alt_text,
          tags, album_id, source_area, created_at, updated_at
         FROM media_assets
         ORDER BY created_at DESC`,
      )
      .all<MediaAssetRow>();

    const assets = result.results.map(mediaAssetRowToAsset);
    const withUsage = await Promise.all(
      assets.map(async (asset) => ({
        ...asset,
        usage: await getMediaUsageByUrl(asset.url),
      })),
    );

    return withUsage;
  } catch (error) {
    if (isSchemaMissing(error, 'media_assets')) {
      return [];
    }

    throw error;
  }
}

export async function findMediaAssetById(assetId: string): Promise<MediaAsset | null> {
  const db = await getD1Database();
  const row = await db
    .prepare(
      `SELECT id, key, url, filename, content_type, size, width, height, title, alt_text,
        tags, album_id, source_area, created_at, updated_at
       FROM media_assets
       WHERE id = ?
       LIMIT 1`,
    )
    .bind(assetId)
    .first<MediaAssetRow>();

  if (!row) {
    return null;
  }

  const asset = mediaAssetRowToAsset(row);

  return {
    ...asset,
    usage: await getMediaUsageByUrl(asset.url),
  };
}

export async function findMediaAssetByKey(key: string): Promise<MediaAsset | null> {
  const db = await getD1Database();
  const row = await db
    .prepare(
      `SELECT id, key, url, filename, content_type, size, width, height, title, alt_text,
        tags, album_id, source_area, created_at, updated_at
       FROM media_assets
       WHERE key = ?
       LIMIT 1`,
    )
    .bind(key)
    .first<MediaAssetRow>();

  return row ? mediaAssetRowToAsset(row) : null;
}

export async function upsertMediaAsset(input: MediaAssetInput): Promise<MediaAsset> {
  const db = await getD1Database();
  const id = input.id ?? `media-${crypto.randomUUID()}`;
  const url = input.url ?? mediaKeyToUrl(input.key);
  const title = input.title?.trim() || input.filename.replace(/\.[^.]+$/, '') || 'Untitled image';
  const sourceArea = input.sourceArea ?? 'media-library';

  await db
    .prepare(
      `INSERT INTO media_assets (
        id, key, url, filename, content_type, size, width, height, title, alt_text,
        tags, album_id, source_area
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        url = excluded.url,
        filename = excluded.filename,
        content_type = excluded.content_type,
        size = excluded.size,
        width = excluded.width,
        height = excluded.height,
        title = excluded.title,
        alt_text = excluded.alt_text,
        tags = excluded.tags,
        album_id = excluded.album_id,
        source_area = excluded.source_area,
        updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(
      id,
      input.key,
      url,
      input.filename,
      input.contentType,
      input.size,
      input.width ?? null,
      input.height ?? null,
      title,
      input.altText?.trim() ?? '',
      JSON.stringify(normalizeMediaTags(input.tags ?? [])),
      input.albumId ?? null,
      sourceArea,
    )
    .run();

  const saved = await findMediaAssetByKey(input.key);
  if (!saved) {
    throw new Error('Media asset could not be saved.');
  }

  return {
    ...saved,
    usage: await getMediaUsageByUrl(saved.url),
  };
}

export async function updateMediaAssetMetadata(input: MediaAssetUpdate): Promise<MediaAsset[]> {
  const db = await getD1Database();

  await db
    .prepare(
      `UPDATE media_assets
       SET title = ?, alt_text = ?, tags = ?, album_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(
      input.title.trim() || 'Untitled image',
      input.altText.trim(),
      JSON.stringify(normalizeMediaTags(input.tags)),
      input.albumId,
      input.id,
    )
    .run();

  return listMediaAssets();
}

export async function deleteMediaAssetRecord(assetId: string): Promise<void> {
  const db = await getD1Database();
  await db.prepare('DELETE FROM media_assets WHERE id = ?').bind(assetId).run();
}

export async function ensureMediaAssetForUrl(
  url: string,
  sourceArea: MediaAssetInput['sourceArea'],
  title: string,
): Promise<MediaAsset | null> {
  const key = mediaUrlToKey(url);

  if (!key) {
    return null;
  }

  const existing = await findMediaAssetByKey(key).catch(() => null);
  if (existing) {
    return existing;
  }

  return upsertMediaAsset({
    key,
    url,
    filename: key.split('/').at(-1) ?? 'existing-image',
    contentType: 'image/jpeg',
    size: 0,
    title,
    sourceArea,
  });
}
