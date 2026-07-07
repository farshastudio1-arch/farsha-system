import BookingPageClient from '@/components/booking/BookingPageClient';
import PublicFooter from '@/components/PublicFooter';
import PublicHeader from '@/components/PublicHeader';
import { getCmsContent, getSiteSettings, listCatalogItems } from '@/lib/farsha-db';
import { listPosLedger } from '@/lib/pos-db';
import { projectCatalogItems } from '@/lib/pos-ledger';

interface BookingPageProps {
  searchParams: Promise<{
    itemId?: string | string[];
    eventDate?: string | string[];
  }>;
}

export default async function BookingPage({ searchParams }: BookingPageProps) {
  const params = await searchParams;
  const itemIdParam = Array.isArray(params.itemId) ? params.itemId[0] : params.itemId;
  const eventDateParam = Array.isArray(params.eventDate) ? params.eventDate[0] : params.eventDate;
  const [catalogItems, cmsContent, siteSettings, posLedger] = await Promise.all([
    listCatalogItems(),
    getCmsContent(),
    getSiteSettings(),
    listPosLedger(),
  ]);
  const projectedCatalogItems = projectCatalogItems(catalogItems, posLedger);

  return (
    <div className="theme-surface min-h-screen font-sans antialiased">
      <PublicHeader variant="catalog" />
      <BookingPageClient
        initialItems={projectedCatalogItems}
        initialItemId={itemIdParam ?? ''}
        initialEventDate={eventDateParam ?? ''}
      />
      <div className="hidden lg:block">
        <PublicFooter cmsContent={cmsContent} siteSettings={siteSettings} />
      </div>
    </div>
  );
}
