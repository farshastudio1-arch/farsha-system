import { auth } from '../../../../../../../auth';
import { getBookingInvoice } from '@/lib/booking-db';

export const dynamic = 'force-dynamic';

type InvoiceRouteContext = {
  params: Promise<{
    bookingId: string;
  }>;
};

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status });
}

async function ensureAdmin() {
  const session = await auth();

  return session?.user?.role === 'admin';
}

export async function GET(_request: Request, context: InvoiceRouteContext) {
  try {
    if (!(await ensureAdmin())) {
      return jsonResponse({ ok: false, error: 'Unauthorized.' }, 401);
    }

    const { bookingId } = await context.params;
    const invoice = await getBookingInvoice(bookingId);

    if (!invoice) {
      return jsonResponse({ ok: false, error: 'Invoice belum tersedia.' }, 404);
    }

    return jsonResponse({ ok: true, data: invoice });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load invoice.';

    return jsonResponse({ ok: false, error: message }, 500);
  }
}
