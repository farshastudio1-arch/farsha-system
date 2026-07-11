import { revalidatePath } from 'next/cache';

import { auth } from '../../../../../../../auth';
import {
  FittingDbError,
  getFittingRelatedRevalidationPaths,
  updateFittingAppointmentStatus,
  type FittingAppointmentStatus,
} from '@/lib/fitting-db';

export const dynamic = 'force-dynamic';

type FittingStatusRouteContext = {
  params: Promise<{
    appointmentId: string;
  }>;
};

type FittingStatusPayload = {
  status?: unknown;
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

function normalizeStatus(value: unknown): FittingAppointmentStatus | null {
  if (
    value === 'pending' ||
    value === 'confirmed' ||
    value === 'cancelled' ||
    value === 'completed' ||
    value === 'no_show'
  ) {
    return value;
  }

  return null;
}

export async function POST(request: Request, context: FittingStatusRouteContext) {
  try {
    const adminEmail = await getAdminEmail();

    if (!adminEmail) {
      return jsonResponse({ ok: false, error: 'Unauthorized.' }, 401);
    }

    const { appointmentId } = await context.params;
    const body = (await request.json()) as FittingStatusPayload;
    const status = normalizeStatus(body.status);

    if (!status) {
      return jsonResponse({ ok: false, error: 'Status fitting tidak valid.' }, 400);
    }

    const appointment = await updateFittingAppointmentStatus({
      appointmentId,
      status,
      actor: adminEmail,
    });

    getFittingRelatedRevalidationPaths().forEach((path) => revalidatePath(path));

    return jsonResponse({ ok: true, data: appointment });
  } catch (error) {
    if (error instanceof FittingDbError) {
      return jsonResponse({ ok: false, error: error.message, code: error.code }, error.status);
    }

    const message = error instanceof Error ? error.message : 'Update fitting status failed.';

    return jsonResponse({ ok: false, error: message }, 500);
  }
}
