import PosBookingsClient from '@/components/pos/PosBookingsClient';
import { listBookingQueue } from '@/lib/booking-db';
import { listCatalogItems } from '@/lib/farsha-db';

export default async function PosBookingsHistoryPage() {
  const [catalogItems, databaseBookings] = await Promise.all([
    listCatalogItems({ includeUnpublished: true }),
    listBookingQueue(),
  ]);

  return (
    <PosBookingsClient
      initialItems={catalogItems}
      initialItemId=""
      initialBookingId=""
      initialQueueFilter="all"
      initialBookings={databaseBookings}
      mode="history"
    />
  );
}
