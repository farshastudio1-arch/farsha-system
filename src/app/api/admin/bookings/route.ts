import { auth } from '../../../../../auth';
import { BookingDbError, createBooking, listBookingQueue } from '@/lib/booking-db';

export const dynamic = 'force-dynamic';

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status });
}

async function getAdminEmail() {
  const session = await auth();

  if (session?.user?.role !== 'admin') {
    return null;
  }

  return session.user.email ?? null;
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function GET() {
  try {
    const adminEmail = await getAdminEmail();

    if (!adminEmail) {
      return jsonResponse({ ok: false, error: 'Unauthorized.' }, 401);
    }

    const bookings = await listBookingQueue();

    return jsonResponse({ ok: true, data: bookings });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load bookings.';

    return jsonResponse({ ok: false, error: message }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const adminEmail = await getAdminEmail();

    if (!adminEmail) {
      return jsonResponse({ ok: false, error: 'Unauthorized.' }, 401);
    }

    const body = (await request.json()) as Record<string, unknown>;
    const itemIds = Array.isArray(body.itemIds)
      ? body.itemIds.filter((itemId: unknown): itemId is string => typeof itemId === 'string')
      : typeof body.itemId === 'string'
        ? [body.itemId]
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
      source: body.source === 'walk_in' ? 'walk_in' : 'whatsapp',
      status: body.status === 'payment_submitted' ? 'payment_submitted' : 'requested',
      dpPerItem: Number(body.dpPerItem),
      paymentReference: stringValue(body.paymentReference),
      createdBy: adminEmail,
    });

    return jsonResponse({ ok: true, data: booking }, 201);
  } catch (error) {
    if (error instanceof BookingDbError) {
      return jsonResponse({ ok: false, error: error.message, code: error.code }, error.status);
    }

    const message = error instanceof Error ? error.message : 'Manual booking failed.';

    return jsonResponse({ ok: false, error: message }, 500);
  }
}
