import Catalog from '@/components/Catalog';
import PublicFooter from '@/components/PublicFooter';
import PublicHeader from '@/components/PublicHeader';
import { getCmsContent, getSiteSettings, listCatalogItems } from '@/lib/farsha-db';
import { getLandingCategory } from '@/lib/landing-categories';

interface CatalogPageProps {
  searchParams: Promise<{
    category?: string | string[];
  }>;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const categoryParam = Array.isArray(params.category) ? params.category[0] : params.category;
  const landingCategory = getLandingCategory(categoryParam);
  const [catalogItems, cmsContent, siteSettings] = await Promise.all([
    listCatalogItems(),
    getCmsContent(),
    getSiteSettings(),
  ]);

  return (
    <div className="theme-surface min-h-screen flex flex-col font-sans antialiased">
      <PublicHeader variant="catalog" />

      <main className="flex-grow">
        <Catalog
          key={landingCategory?.slug ?? 'all'}
          cmsContent={cmsContent}
          initialItems={catalogItems}
          siteSettings={siteSettings}
          initialCategory={landingCategory?.slug ?? null}
        />
      </main>

      <div className="hidden lg:block">
        <PublicFooter cmsContent={cmsContent} siteSettings={siteSettings} />
      </div>
    </div>
  );
}
