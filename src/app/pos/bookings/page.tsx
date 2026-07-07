import PosBookingsPreviewClient from '@/components/pos/PosBookingsPreviewClient';
import type { PreviewBooking, PreviewBookingStatus } from '@/lib/booking-preview';
import { listBookingQueue } from '@/lib/booking-db';
import { listCatalogItems } from '@/lib/farsha-db';

interface PosBookingsPageProps {
  searchParams: Promise<{
    itemId?: string | string[];
  }>;
}

export default async function PosBookingsPage({ searchParams }: PosBookingsPageProps) {
  const params = await searchParams;
  const itemIdParam = Array.isArray(params.itemId) ? params.itemId[0] : params.itemId;
  const [catalogItems, databaseBookings] = await Promise.all([
    listCatalogItems(),
    listBookingQueue(),
  ]);
  const statusMap: Record<string, PreviewBookingStatus> = {
    requested: 'requested',
    payment_submitted: 'payment_submitted',
    dp_confirmed: 'dp_confirmed',
    fitting_link_sent: 'dp_confirmed',
    picked_up: 'pickup_ready',
    completed: 'completed',
    rejected: 'rejected',
    cancelled: 'cancelled',
    expired: 'cancelled',
  };
  const initialDatabaseBookings: PreviewBooking[] = databaseBookings.map((booking) => ({
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    itemId: booking.firstItemId ?? '',
    itemCode: booking.firstItemCode ?? '',
    itemName:
      booking.itemCount > 1
        ? `${booking.firstItemName ?? booking.itemLabel ?? 'Booking item'} +${booking.itemCount - 1} item`
        : booking.firstItemName ?? booking.itemLabel ?? 'Booking item',
    customerName: booking.customerName,
    customerWhatsapp: booking.customerWhatsapp,
    customerEmail: booking.customerEmail ?? undefined,
    customerInstagram: booking.customerInstagram ?? undefined,
    eventDate: booking.firstEventDate ?? '',
    pickupDate: booking.firstPickupDate ?? '',
    returnDate: booking.lastReturnDueDate ?? '',
    bufferUntilDate: booking.lastMaintenanceEndDate ?? '',
    status: statusMap[booking.status] ?? 'requested',
    dpAmount: booking.dpTotal,
    securityDeposit: 0,
    paymentMethod: 'transfer',
    paymentReference: booking.paymentReference ?? '',
    notes: booking.notes,
    source:
      booking.source === 'walk_in'
        ? 'walk-in'
        : booking.source === 'catalog'
          ? 'catalog'
          : 'whatsapp',
    createdAt: booking.createdAt,
  }));

  return (
    <PosBookingsPreviewClient
      initialItems={catalogItems}
      initialItemId={itemIdParam ?? ''}
      initialDatabaseBookings={initialDatabaseBookings}
    />
  );
}
