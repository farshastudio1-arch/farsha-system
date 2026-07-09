import { revalidatePath } from 'next/cache';

import { BookingDbError, createBooking, getBookingRelatedRevalidationPaths } from '@/lib/booking-db';

export const dynamic = 'force-dynamic';

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status });
}

type PublicBookingPayload = {
  itemIds?: unknown;
  pickupDate?: unknown;
  eventDate?: unknown;
  returnDueDate?: unknown;
  customerName?: unknown;
  customerWhatsapp?: unknown;
  customerEmail?: unknown;
  customerInstagram?: unknown;
  pickupMethod?: unknown;
  deliveryAddress?: unknown;
  notes?: unknown;
  dpPerItem?: unknown;
  instagramDiscountAmount?: unknown;
  extraReturnFeeTotal?: unknown;
  rentalEstimateTotal?: unknown;
};

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PublicBookingPayload;
    const itemIds = Array.isArray(body.itemIds)
      ? body.itemIds.filter((itemId): itemId is string => typeof itemId === 'string')
      : [];

    const booking = await createBooking({
      itemIds,
      pickupDate: stringValue(body.pickupDate),
      eventDate: stringValue(body.eventDate),
      returnDueDate: stringValue(body.returnDueDate),
      customerName: stringValue(body.customerName),
      customerWhatsapp: stringValue(body.customerWhatsapp),
      customerEmail: stringValue(body.customerEmail),
      customerInstagram: stringValue(body.customerInstagram),
      pickupMethod: body.pickupMethod === 'gosend' ? 'gosend' : 'store',
      deliveryAddress: stringValue(body.deliveryAddress),
      notes: stringValue(body.notes),
      source: 'catalog',
      status: 'requested',
      dpPerItem: Number(body.dpPerItem),
      instagramDiscountAmount: Number(body.instagramDiscountAmount),
      extraReturnFeeTotal: Number(body.extraReturnFeeTotal),
      rentalEstimateTotal: Number(body.rentalEstimateTotal),
    });

    getBookingRelatedRevalidationPaths().forEach((path) => revalidatePath(path));

    return jsonResponse({ ok: true, data: booking }, 201);
  } catch (error) {
    if (error instanceof BookingDbError) {
      return jsonResponse({ ok: false, error: error.message, code: error.code }, error.status);
    }

    const message = error instanceof Error ? error.message : 'Booking request failed.';

    return jsonResponse({ ok: false, error: message }, 500);
  }
}
