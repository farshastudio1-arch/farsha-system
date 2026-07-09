import { revalidatePath } from 'next/cache';

import { auth } from '../../../../../../../auth';
import {
  BookingDbError,
  confirmBookingDp,
  getBookingRelatedRevalidationPaths,
} from '@/lib/booking-db';

export const dynamic = 'force-dynamic';

type ConfirmDpRouteContext = {
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

export async function POST(_request: Request, context: ConfirmDpRouteContext) {
  try {
    const adminEmail = await getAdminEmail();

    if (!adminEmail) {
      return jsonResponse({ ok: false, error: 'Unauthorized.' }, 401);
    }

    const { bookingId } = await context.params;
    const result = await confirmBookingDp(bookingId, adminEmail);
    getBookingRelatedRevalidationPaths().forEach((path) => revalidatePath(path));

    return jsonResponse({ ok: true, data: result });
  } catch (error) {
    if (error instanceof BookingDbError) {
      return jsonResponse({ ok: false, error: error.message, code: error.code }, error.status);
    }

    const message = error instanceof Error ? error.message : 'Konfirmasi Biaya Booking gagal.';

    return jsonResponse({ ok: false, error: message }, 500);
  }
}
