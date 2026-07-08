import { auth } from '../../../../../../../auth';
import { BookingDbError, closeBooking, type CloseBookingAction } from '@/lib/booking-db';

export const dynamic = 'force-dynamic';

type BookingStatusRouteContext = {
  params: Promise<{
    bookingId: string;
  }>;
};

type BookingStatusPayload = {
  action?: unknown;
  reason?: unknown;
};

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

function normalizeAction(value: unknown): CloseBookingAction | null {
  return value === 'reject' || value === 'cancel' ? value : null;
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: Request, context: BookingStatusRouteContext) {
  try {
    const adminEmail = await getAdminEmail();

    if (!adminEmail) {
      return jsonResponse({ ok: false, error: 'Unauthorized.' }, 401);
    }

    const { bookingId } = await context.params;
    const body = (await request.json()) as BookingStatusPayload;
    const action = normalizeAction(body.action);

    if (!action) {
      return jsonResponse({ ok: false, error: 'Use reject or cancel action.' }, 400);
    }

    const result = await closeBooking({
      bookingId,
      action,
      reason: stringValue(body.reason),
      actor: adminEmail,
    });

    return jsonResponse({ ok: true, data: result });
  } catch (error) {
    if (error instanceof BookingDbError) {
      return jsonResponse({ ok: false, error: error.message, code: error.code }, error.status);
    }

    const message = error instanceof Error ? error.message : 'Update booking status failed.';

    return jsonResponse({ ok: false, error: message }, 500);
  }
}
