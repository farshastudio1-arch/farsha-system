import { auth } from '../../../../../auth';
import { listFittingAppointments } from '@/lib/fitting-db';

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

export async function GET() {
  try {
    const adminEmail = await getAdminEmail();

    if (!adminEmail) {
      return jsonResponse({ ok: false, error: 'Unauthorized.' }, 401);
    }

    const appointments = await listFittingAppointments();

    return jsonResponse({ ok: true, data: appointments });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load fitting appointments.';

    return jsonResponse({ ok: false, error: message }, 500);
  }
}
