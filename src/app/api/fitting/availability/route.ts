import { FittingDbError, getTodayJakartaDate, listFittingSlotsForDate } from '@/lib/fitting-db';

export const dynamic = 'force-dynamic';

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const appointmentDate = url.searchParams.get('date')?.trim() || getTodayJakartaDate();
    const slots = await listFittingSlotsForDate(appointmentDate);

    return jsonResponse({
      ok: true,
      data: {
        appointmentDate,
        slots,
        rule: {
          selectedDateMeans: 'appointment_date',
          slotLengthMinutes: 60,
          opensAt: '10:00',
          closesAt: '19:00',
          lastStartTime: '18:00',
        },
      },
    });
  } catch (error) {
    if (error instanceof FittingDbError) {
      return jsonResponse({ ok: false, error: error.message, code: error.code }, error.status);
    }

    const message = error instanceof Error ? error.message : 'Failed to load fitting availability.';

    return jsonResponse({ ok: false, error: message }, 500);
  }
}
