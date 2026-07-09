import PosBookingsClient from '@/components/pos/PosBookingsClient';
import { listBookingQueue } from '@/lib/booking-db';
import { listCatalogItems } from '@/lib/farsha-db';

interface PosBookingsPageProps {
  searchParams: Promise<{
    itemId?: string | string[];
    bookingId?: string | string[];
    status?: string | string[];
  }>;
}

export default async function PosBookingsPage({ searchParams }: PosBookingsPageProps) {
  const params = await searchParams;
  const itemIdParam = Array.isArray(params.itemId) ? params.itemId[0] : params.itemId;
  const bookingIdParam = Array.isArray(params.bookingId) ? params.bookingId[0] : params.bookingId;
  const statusParam = Array.isArray(params.status) ? params.status[0] : params.status;
  const [catalogItems, databaseBookings] = await Promise.all([
    listCatalogItems(),
    listBookingQueue(),
  ]);

  return (
    <PosBookingsClient
      initialItems={catalogItems}
      initialItemId={itemIdParam ?? ''}
      initialBookingId={bookingIdParam ?? ''}
      initialQueueFilter={statusParam ?? 'active'}
      initialBookings={databaseBookings}
    />
  );
}
