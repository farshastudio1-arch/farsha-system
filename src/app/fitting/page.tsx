import FittingPageClient from '@/components/fitting/FittingPageClient';
import PublicFooter from '@/components/PublicFooter';
import PublicHeader from '@/components/PublicHeader';
import { getCmsContent, getSiteSettings } from '@/lib/farsha-db';
import {
  FittingDbError,
  getFittingBookingContext,
  getTodayJakartaDate,
  listFittingSlotsForDate,
} from '@/lib/fitting-db';

export const dynamic = 'force-dynamic';

interface FittingPageProps {
  searchParams: Promise<{
    booking?: string | string[];
    token?: string | string[];
  }>;
}

export default async function FittingPage({ searchParams }: FittingPageProps) {
  const params = await searchParams;
  const bookingParam = Array.isArray(params.booking) ? params.booking[0] : params.booking;
  const tokenParam = Array.isArray(params.token) ? params.token[0] : params.token;
  const today = getTodayJakartaDate();
  const [cmsContent, siteSettings, initialSlots, bookingContextResult] = await Promise.all([
    getCmsContent(),
    getSiteSettings(),
    listFittingSlotsForDate(today),
    bookingParam && tokenParam
      ? getFittingBookingContext({ bookingNumber: bookingParam, token: tokenParam })
          .then((data) => ({ data, error: '' }))
          .catch((error) => ({
            data: null,
            error: error instanceof FittingDbError ? error.message : 'Link fitting tidak valid.',
          }))
      : Promise.resolve({ data: null, error: '' }),
  ]);

  return (
    <div className="theme-surface min-h-screen font-sans antialiased">
      <PublicHeader variant="catalog" showSearchButton={false} centerLogoOnMobile />
      <FittingPageClient
        initialDate={today}
        initialSlots={initialSlots}
        initialBookingContext={bookingContextResult.data}
        bookingContextError={bookingContextResult.error}
        bookingNumber={bookingParam ?? ''}
        bookingToken={tokenParam ?? ''}
      />
      <div className="hidden lg:block">
        <PublicFooter cmsContent={cmsContent} siteSettings={siteSettings} />
      </div>
    </div>
  );
}
