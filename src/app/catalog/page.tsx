import Catalog from '@/components/Catalog';
import PublicFooter from '@/components/PublicFooter';
import PublicHeader from '@/components/PublicHeader';
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

  return (
    <div className="theme-surface min-h-screen flex flex-col font-sans antialiased">
      <PublicHeader />

      <main className="flex-grow">
        <Catalog initialCategory={landingCategory?.slug ?? null} />
      </main>

      <PublicFooter />
    </div>
  );
}
