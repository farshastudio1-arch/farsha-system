import { auth } from '../../../../../../../auth';
import { BookingDbError, generateBookingReceipt, getBookingReceipt } from '@/lib/booking-db';

export const dynamic = 'force-dynamic';

type ReceiptRouteContext = {
  params: Promise<{
    bookingId: string;
  }>;
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

export async function GET(_request: Request, context: ReceiptRouteContext) {
  try {
    if (!(await getAdminEmail())) {
      return jsonResponse({ ok: false, error: 'Unauthorized.' }, 401);
    }

    const { bookingId } = await context.params;
    const receipt = await getBookingReceipt(bookingId);

    if (!receipt) {
      return jsonResponse({ ok: false, error: 'Receipt belum tersedia.' }, 404);
    }

    return jsonResponse({ ok: true, data: receipt });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load receipt.';

    return jsonResponse({ ok: false, error: message }, 500);
  }
}

export async function POST(_request: Request, context: ReceiptRouteContext) {
  try {
    const adminEmail = await getAdminEmail();

    if (!adminEmail) {
      return jsonResponse({ ok: false, error: 'Unauthorized.' }, 401);
    }

    const { bookingId } = await context.params;
    const receipt = await generateBookingReceipt(bookingId, adminEmail);

    return jsonResponse({ ok: true, data: receipt });
  } catch (error) {
    if (error instanceof BookingDbError) {
      return jsonResponse({ ok: false, error: error.message, code: error.code }, error.status);
    }

    const message = error instanceof Error ? error.message : 'Failed to generate receipt.';

    return jsonResponse({ ok: false, error: message }, 500);
  }
}
