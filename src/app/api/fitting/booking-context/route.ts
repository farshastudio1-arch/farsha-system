import { FittingDbError, getFittingBookingContext } from '@/lib/fitting-db';

export const dynamic = 'force-dynamic';

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const bookingNumber = url.searchParams.get('booking')?.trim() ?? '';
    const token = url.searchParams.get('token')?.trim() ?? '';
    const context = await getFittingBookingContext({ bookingNumber, token });

    return jsonResponse({ ok: true, data: context });
  } catch (error) {
    if (error instanceof FittingDbError) {
      return jsonResponse({ ok: false, error: error.message, code: error.code }, error.status);
    }

    const message = error instanceof Error ? error.message : 'Failed to load fitting booking context.';

    return jsonResponse({ ok: false, error: message }, 500);
  }
}
