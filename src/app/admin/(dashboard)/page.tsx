import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  FileImage,
  ImageIcon,
  LayoutPanelTop,
  LibraryBig,
  Megaphone,
  Palette,
  Settings,
  ShoppingBag,
  Tags,
  Wand2,
} from 'lucide-react';

import type { CMSContent, KebayaItem, SiteSettings } from '@/data/mockData';
import {
  getCmsContent,
  getSiteSettings,
  listCatalogItems,
  listMediaAlbums,
  listMediaAssets,
} from '@/lib/farsha-db';
import type { MediaAsset } from '@/lib/media-library';

type Tone = 'neutral' | 'good' | 'warning' | 'danger';

function toneClass(tone: Tone) {
  const classes: Record<Tone, string> = {
    neutral: 'border-neutral-200 bg-white text-neutral-950',
    good: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    danger: 'border-red-200 bg-red-50 text-red-900',
  };

  return classes[tone];
}

function cleanPhone(value: string) {
  return value.replace(/[^0-9]/g, '');
}

function isConfigured(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function getItemQualityIssues(item: KebayaItem) {
  const issues: string[] = [];

  if (item.imageUrls.filter(Boolean).length < 2) {
    issues.push('photos');
  }

  if (!item.description.trim()) {
    issues.push('copy');
  }

  if (!item.rentalPrice || item.rentalPrice <= 0) {
    issues.push('price');
  }

  if (!item.categories || item.categories.length === 0) {
    issues.push('category');
  }

  if (!item.measurements?.rentalCategory) {
    issues.push('rental area');
  }

  return issues;
}

function getCmsIssues(content: CMSContent) {
  const issues: string[] = [];

  if (!content.heroTitle.trim()) {
    issues.push('hero title');
  }

  if (!content.heroSubtitle.trim()) {
    issues.push('hero subtitle');
  }

  if (!content.heroImageUrl.trim()) {
    issues.push('hero image');
  }

  if (content.landingCategories.length === 0) {
    issues.push('landing categories');
  }

  if (content.trustPoints.length === 0) {
    issues.push('trust points');
  }

  if (!content.aboutText.trim()) {
    issues.push('about copy');
  }

  return issues;
}

function getSettingsIssues(settings: SiteSettings) {
  const issues: string[] = [];

  if (settings.status !== 'active') {
    issues.push(`store ${settings.status}`);
  }

  if (cleanPhone(settings.whatsappNumber).length < 10) {
    issues.push('WhatsApp');
  }

  if (!isConfigured(settings.address)) {
    issues.push('address');
  }

  if (!isConfigured(settings.mapsUrl)) {
    issues.push('maps');
  }

  if (!isConfigured(settings.email)) {
    issues.push('email');
  }

  return issues;
}

function getMediaIssues(assets: MediaAsset[]) {
  return assets.filter((asset) => !asset.title.trim() || !asset.altText.trim());
}

function ReadinessCard({
  title,
  value,
  detail,
  tone,
  icon: Icon,
  href,
}: {
  title: string;
  value: string | number;
  detail: string;
  tone: Tone;
  icon: typeof ShoppingBag;
  href: string;
}) {
  return (
    <Link href={href} className="block h-full transition-opacity hover:opacity-90">
      <div className={`h-full border p-4 shadow-sm sm:p-5 ${toneClass(tone)}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest opacity-70">{title}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
          </div>
          <div className="border border-current/20 bg-white/55 p-2">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed opacity-80">{detail}</p>
      </div>
    </Link>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-neutral-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-200 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-neutral-950">{title}</h2>
        {action}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function ToolCard({
  href,
  title,
  detail,
  icon: Icon,
}: {
  href: string;
  title: string;
  detail: string;
  icon: typeof ShoppingBag;
}) {
  return (
    <Link
      href={href}
      className="block border border-neutral-200 bg-neutral-50 p-4 transition-colors hover:bg-white"
    >
      <div className="flex items-start gap-3">
        <div className="border border-neutral-200 bg-white p-2 text-neutral-700">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-950">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500">{detail}</p>
        </div>
      </div>
    </Link>
  );
}

export default async function AdminDashboard() {
  const [catalogItems, cmsContent, settings, mediaAssets, mediaAlbums] = await Promise.all([
    listCatalogItems({ fallbackToMock: false }),
    getCmsContent(),
    getSiteSettings(),
    listMediaAssets(),
    listMediaAlbums(),
  ]);

  const catalogIssueItems = catalogItems.filter((item) => getItemQualityIssues(item).length > 0);
  const cmsIssues = getCmsIssues(cmsContent);
  const settingsIssues = getSettingsIssues(settings);
  const mediaIssueAssets = getMediaIssues(mediaAssets);
  const uncategorizedMedia = mediaAssets.filter((asset) => !asset.albumId);
  const readyCatalogItems = catalogItems.length - catalogIssueItems.length;
  const storefrontIssueCount = cmsIssues.length + settingsIssues.length;
  const setupIssueCount = catalogIssueItems.length + storefrontIssueCount + mediaIssueAssets.length;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Admin dashboard
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
            Business setup health
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500 sm:text-base">
            Master data, storefront content, media library, and configuration readiness.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/admin/catalog"
            className="inline-flex items-center justify-center gap-2 bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
          >
            Manage catalog
            <ShoppingBag className="h-4 w-4" />
          </Link>
          <Link
            href="/catalog"
            className="inline-flex items-center justify-center gap-2 border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            View storefront
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReadinessCard
          title="Setup issues"
          value={setupIssueCount}
          detail="Catalog, content, media, and settings items needing attention"
          tone={setupIssueCount > 0 ? 'warning' : 'good'}
          icon={AlertTriangle}
          href="/admin"
        />
        <ReadinessCard
          title="Catalog master"
          value={`${readyCatalogItems}/${catalogItems.length}`}
          detail={`${catalogIssueItems.length} item records need data cleanup`}
          tone={catalogIssueItems.length > 0 ? 'warning' : 'good'}
          icon={ShoppingBag}
          href="/admin/catalog"
        />
        <ReadinessCard
          title="Storefront content"
          value={storefrontIssueCount}
          detail={`${cmsIssues.length} CMS issues · ${settingsIssues.length} settings issues`}
          tone={storefrontIssueCount > 0 ? 'warning' : 'good'}
          icon={LayoutPanelTop}
          href="/admin/cms"
        />
        <ReadinessCard
          title="Media library"
          value={mediaAssets.length}
          detail={`${mediaIssueAssets.length} assets missing title or alt text`}
          tone={mediaIssueAssets.length > 0 ? 'warning' : 'neutral'}
          icon={ImageIcon}
          href="/admin/media"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.72fr)]">
        <Section
          title="Setup Checklist"
          action={
            <Link
              href="/admin/settings"
              className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700 hover:text-neutral-950"
            >
              Settings
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={`border p-4 ${catalogIssueItems.length > 0 ? toneClass('warning') : toneClass('good')}`}>
              <p className="text-xs font-semibold uppercase tracking-widest opacity-70">
                Catalog data
              </p>
              <p className="mt-2 text-sm font-semibold">
                {catalogIssueItems.length > 0
                  ? `${catalogIssueItems.length} records need cleanup`
                  : 'Catalog records look complete'}
              </p>
            </div>
            <div className={`border p-4 ${cmsIssues.length > 0 ? toneClass('warning') : toneClass('good')}`}>
              <p className="text-xs font-semibold uppercase tracking-widest opacity-70">
                Homepage CMS
              </p>
              <p className="mt-2 text-sm font-semibold">
                {cmsIssues.length > 0 ? cmsIssues.join(', ') : 'Homepage content configured'}
              </p>
            </div>
            <div className={`border p-4 ${settingsIssues.length > 0 ? toneClass('warning') : toneClass('good')}`}>
              <p className="text-xs font-semibold uppercase tracking-widest opacity-70">
                Store settings
              </p>
              <p className="mt-2 text-sm font-semibold">
                {settingsIssues.length > 0 ? settingsIssues.join(', ') : 'Settings configured'}
              </p>
            </div>
            <div className={`border p-4 ${mediaIssueAssets.length > 0 ? toneClass('warning') : toneClass('neutral')}`}>
              <p className="text-xs font-semibold uppercase tracking-widest opacity-70">
                Media metadata
              </p>
              <p className="mt-2 text-sm font-semibold">
                {mediaIssueAssets.length > 0
                  ? `${mediaIssueAssets.length} assets need title or alt text`
                  : 'No media metadata issues'}
              </p>
            </div>
          </div>
        </Section>

        <Section title="Storefront Status">
          <div className="space-y-3">
            <div className="border border-neutral-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                Store status
              </p>
              <p className="mt-1 text-sm font-semibold capitalize text-neutral-950">
                {settings.status.replace('-', ' ')}
              </p>
            </div>
            <div className="border border-neutral-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                Public contact
              </p>
              <p className="mt-1 text-sm font-semibold text-neutral-950">
                {cleanPhone(settings.whatsappNumber).length >= 10
                  ? settings.whatsappNumber
                  : 'WhatsApp needs setup'}
              </p>
            </div>
            <div className="border border-neutral-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                Homepage hero
              </p>
              <p className="mt-1 line-clamp-2 text-sm font-semibold text-neutral-950">
                {cmsContent.heroTitle || 'Hero title not configured'}
              </p>
            </div>
          </div>
        </Section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(340px,0.82fr)_minmax(0,1.18fr)]">
        <Section
          title="Catalog Exceptions"
          action={
            <Link
              href="/admin/catalog"
              className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700 hover:text-neutral-950"
            >
              Catalog
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          }
        >
          {catalogIssueItems.length > 0 ? (
            <div className="space-y-3">
              {catalogIssueItems.slice(0, 6).map((item) => (
                <Link
                  key={item.id}
                  href="/admin/catalog"
                  className="block border border-neutral-200 p-4 transition-colors hover:bg-neutral-50"
                >
                  <p className="text-sm font-semibold text-neutral-950">{item.name}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-neutral-400">
                    {item.code}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {getItemQualityIssues(item).map((issue) => (
                      <span
                        key={issue}
                        className="border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
                      >
                        {issue}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              Catalog master data is complete enough for public browsing.
            </div>
          )}
        </Section>

        <Section
          title="Admin Tools"
          action={
            <Link
              href="/admin/cms"
              className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700 hover:text-neutral-950"
            >
              CMS
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <ToolCard
              href="/admin/catalog"
              title="Catalog"
              detail="Master item identity, pricing, photos, categories, and measurements."
              icon={ShoppingBag}
            />
            <ToolCard
              href="/admin/cms"
              title="CMS"
              detail="Homepage copy, hero media, landing categories, trust points, and promo content."
              icon={LayoutPanelTop}
            />
            <ToolCard
              href="/admin/media"
              title="Media"
              detail={`${mediaAssets.length} assets across ${mediaAlbums.length} albums.`}
              icon={LibraryBig}
            />
            <ToolCard
              href="/admin/settings"
              title="Settings"
              detail="Store status, contact, social links, theme, logo, and catalog display defaults."
              icon={Settings}
            />
            <ToolCard
              href="/admin/marketing"
              title="Marketing"
              detail="Notes, campaigns, and content ideas."
              icon={Megaphone}
            />
            <ToolCard
              href="/admin/name-generator"
              title="Name Generator"
              detail="Reusable naming pools for catalog item names."
              icon={Wand2}
            />
          </div>
        </Section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section
          title="Media Review"
          action={
            <Link
              href="/admin/media"
              className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700 hover:text-neutral-950"
            >
              Media library
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          }
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
                Assets
              </p>
              <p className="mt-3 text-3xl font-semibold text-neutral-950">{mediaAssets.length}</p>
            </div>
            <div className="border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
                Albums
              </p>
              <p className="mt-3 text-3xl font-semibold text-neutral-950">{mediaAlbums.length}</p>
            </div>
            <div className="border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <p className="text-xs font-semibold uppercase tracking-widest">Uncategorized</p>
              <p className="mt-3 text-3xl font-semibold">{uncategorizedMedia.length}</p>
            </div>
          </div>
        </Section>

        <Section title="Storefront Content">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="border border-neutral-200 p-4">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-neutral-500" />
                <p className="text-sm font-semibold text-neutral-950">Theme</p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                Primary {settings.primaryColor} · background {settings.backgroundColor}
              </p>
            </div>
            <div className="border border-neutral-200 p-4">
              <div className="flex items-center gap-2">
                <Tags className="h-4 w-4 text-neutral-500" />
                <p className="text-sm font-semibold text-neutral-950">Landing categories</p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                {cmsContent.landingCategories.length} public category cards configured
              </p>
            </div>
            <div className="border border-neutral-200 p-4">
              <div className="flex items-center gap-2">
                <FileImage className="h-4 w-4 text-neutral-500" />
                <p className="text-sm font-semibold text-neutral-950">Hero image</p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                {cmsContent.heroImageUrl ? 'Configured' : 'Missing'}
              </p>
            </div>
            <div className="border border-neutral-200 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-neutral-500" />
                <p className="text-sm font-semibold text-neutral-950">Promo banner</p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                {settings.showPromoBanner ? 'Visible on storefront' : 'Hidden'}
              </p>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
