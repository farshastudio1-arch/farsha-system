import FittingPageClient from '@/components/fitting/FittingPageClient';
import PublicFooter from '@/components/PublicFooter';
import PublicHeader from '@/components/PublicHeader';
import { getCmsContent, getSiteSettings } from '@/lib/farsha-db';
import { getTodayJakartaDate, listFittingSlotsForDate } from '@/lib/fitting-db';

export const dynamic = 'force-dynamic';

export default async function FittingPage() {
  const today = getTodayJakartaDate();
  const [cmsContent, siteSettings, initialSlots] = await Promise.all([
    getCmsContent(),
    getSiteSettings(),
    listFittingSlotsForDate(today),
  ]);

  return (
    <div className="theme-surface min-h-screen font-sans antialiased">
      <PublicHeader variant="catalog" showSearchButton={false} centerLogoOnMobile />
      <FittingPageClient initialDate={today} initialSlots={initialSlots} />
      <div className="hidden lg:block">
        <PublicFooter cmsContent={cmsContent} siteSettings={siteSettings} />
      </div>
    </div>
  );
}
