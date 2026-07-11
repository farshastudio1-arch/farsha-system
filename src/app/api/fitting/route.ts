import { revalidatePath } from 'next/cache';

import {
  createFittingAppointment,
  FittingDbError,
  getFittingRelatedRevalidationPaths,
} from '@/lib/fitting-db';

export const dynamic = 'force-dynamic';

type PublicFittingPayload = {
  appointmentDate?: unknown;
  startTime?: unknown;
  customerName?: unknown;
  customerWhatsapp?: unknown;
  customerEmail?: unknown;
  notes?: unknown;
};

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PublicFittingPayload;
    const appointment = await createFittingAppointment({
      appointmentDate: stringValue(body.appointmentDate),
      startTime: stringValue(body.startTime),
      customerName: stringValue(body.customerName),
      customerWhatsapp: stringValue(body.customerWhatsapp),
      customerEmail: stringValue(body.customerEmail),
      notes: stringValue(body.notes),
      source: 'public',
    });

    getFittingRelatedRevalidationPaths().forEach((path) => revalidatePath(path));

    return jsonResponse({ ok: true, data: appointment }, 201);
  } catch (error) {
    if (error instanceof FittingDbError) {
      return jsonResponse({ ok: false, error: error.message, code: error.code }, error.status);
    }

    const message = error instanceof Error ? error.message : 'Fitting request failed.';

    return jsonResponse({ ok: false, error: message }, 500);
  }
}
