import { CMSContent, KebayaItem, mockCMS, mockKebayas, mockSiteSettings, SiteSettings } from '@/data/mockData';
import { normalizeCatalogItem } from '@/lib/catalog-normalization';
import { normalizeCmsContent } from '@/lib/cms-normalization';
import { getD1Database } from '@/lib/cloudflare';
import { normalizeSiteSettings } from '@/lib/site-settings-normalization';

type CatalogRow = {
  id: string;
  code: string;
  name: string;
  color: string;
  size: KebayaItem['size'];
  model: KebayaItem['model'];
  rental_price: number;
  status: KebayaItem['status'];
  rental_end_date: string | null;
  image_urls: string;
  description: string;
  categories?: string | null;
  measurements?: string | null;
};

type CmsRow = {
  hero_title: string;
  hero_subtitle: string;
  hero_image_url: string;
  promo_text: string;
  about_title: string;
  about_text: string;
  studio_address: string;
  studio_phone: string;
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
      status: row.status,
      rentalEndDate: row.rental_end_date,
      imageUrls: parseJson<string[]>(row.image_urls, []),
      description: row.description,
      categories: parseJson<KebayaItem['categories']>(row.categories, undefined),
      measurements: parseJson<KebayaItem['measurements']>(row.measurements, undefined),
    },
    index,
  );
}

function cmsRowToContent(row: CmsRow): CMSContent {
  return normalizeCmsContent({
    heroTitle: row.hero_title,
    heroSubtitle: row.hero_subtitle,
    heroImageUrl: row.hero_image_url,
    promoText: row.promo_text,
    aboutTitle: row.about_title,
    aboutText: row.about_text,
    studioAddress: row.studio_address,
    studioPhone: row.studio_phone,
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

export async function listCatalogItems(options: { fallbackToMock?: boolean } = {}): Promise<KebayaItem[]> {
  const { fallbackToMock = true } = options;

  try {
    const db = await getD1Database();
    const result = await db
      .prepare(
        `SELECT id, code, name, color, size, model, rental_price, status, rental_end_date,
          image_urls, description, categories, measurements
         FROM kebaya_items
         WHERE status != 'archived'
         ORDER BY created_at DESC, code ASC`,
      )
      .all<CatalogRow>();

    const items = result.results
      .map((row, index) => catalogRowToItem(row, index))
      .filter((item): item is KebayaItem => Boolean(item));

    return items.length > 0 || !fallbackToMock ? items : mockKebayas;
  } catch (error) {
    if (!fallbackToMock) {
      throw error;
    }

    return mockKebayas;
  }
}

export async function findCatalogItemByCode(code: string): Promise<KebayaItem | null> {
  const db = await getD1Database();
  const row = await db
    .prepare(
      `SELECT id, code, name, color, size, model, rental_price, status, rental_end_date,
        image_urls, description, categories, measurements
       FROM kebaya_items
       WHERE lower(code) = lower(?) AND status != 'archived'
       LIMIT 1`,
    )
    .bind(code)
    .first<CatalogRow>();

  return row ? catalogRowToItem(row, 0) : null;
}

export async function findCatalogItemById(itemId: string): Promise<KebayaItem | null> {
  const db = await getD1Database();
  const row = await db
    .prepare(
      `SELECT id, code, name, color, size, model, rental_price, status, rental_end_date,
        image_urls, description, categories, measurements
       FROM kebaya_items
       WHERE id = ? AND status != 'archived'
       LIMIT 1`,
    )
    .bind(itemId)
    .first<CatalogRow>();

  return row ? catalogRowToItem(row, 0) : null;
}

export async function upsertCatalogItem(item: KebayaItem): Promise<void> {
  const db = await getD1Database();
  const normalized = normalizeCatalogItem(item, 0);

  if (!normalized) {
    throw new Error('Catalog item is invalid.');
  }

  await db
    .prepare(
      `INSERT INTO kebaya_items (
        id, code, name, color, size, model, rental_price, status, rental_end_date,
        image_urls, description, categories, measurements
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      JSON.stringify(normalized.categories ?? []),
      JSON.stringify(normalized.measurements ?? {}),
    )
    .run();
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
        `SELECT hero_title, hero_subtitle, hero_image_url, promo_text, about_title,
          about_text, studio_address, studio_phone
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
        id, hero_title, hero_subtitle, hero_image_url, promo_text, about_title,
        about_text, studio_address, studio_phone
      )
      VALUES ('main', ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        hero_title = excluded.hero_title,
        hero_subtitle = excluded.hero_subtitle,
        hero_image_url = excluded.hero_image_url,
        promo_text = excluded.promo_text,
        about_title = excluded.about_title,
        about_text = excluded.about_text,
        studio_address = excluded.studio_address,
        studio_phone = excluded.studio_phone,
        updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(
      normalized.heroTitle,
      normalized.heroSubtitle,
      normalized.heroImageUrl,
      normalized.promoText,
      normalized.aboutTitle,
      normalized.aboutText,
      normalized.studioAddress,
      normalized.studioPhone,
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
