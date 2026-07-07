import {
  calculateBookingDatesFromPickup,
  listAvailabilityBlocksForItem,
} from '@/lib/booking-db';

export const dynamic = 'force-dynamic';

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function addMonths(date: Date, months: number) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

function formatDatePart(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const itemId = url.searchParams.get('itemId')?.trim();
    const month = Number(url.searchParams.get('month'));
    const year = Number(url.searchParams.get('year'));

    if (!itemId) {
      return jsonResponse({ ok: false, error: 'itemId is required.' }, 400);
    }

    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year)) {
      return jsonResponse({ ok: false, error: 'Valid month and year are required.' }, 400);
    }

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const rangeStartDate = formatDatePart(addMonths(monthStart, -1));
    const rangeEndDate = formatDatePart(addMonths(monthEnd, 1));
    const blocks = await listAvailabilityBlocksForItem(itemId, rangeStartDate, rangeEndDate);

    return jsonResponse({
      ok: true,
      data: {
        itemId,
        month,
        year,
        blocks,
        rule: {
          selectedDateMeans: 'pickup_date',
          preview: calculateBookingDatesFromPickup(formatDatePart(monthStart)),
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load availability.';

    return jsonResponse({ ok: false, error: message }, 500);
  }
}
