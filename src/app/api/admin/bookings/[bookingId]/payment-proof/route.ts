import { auth } from '../../../../../../../auth';
import { BookingDbError, recordBookingPaymentProof } from '@/lib/booking-db';
import { getMediaBucket, mediaKeyToUrl, sanitizeMediaSegment } from '@/lib/media-library';

export const dynamic = 'force-dynamic';

type PaymentProofRouteContext = {
  params: Promise<{
    bookingId: string;
  }>;
};

const maxProofBytes = 5 * 1024 * 1024;
const allowedProofTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['application/pdf', 'pdf'],
]);

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

function createProofKey(bookingId: string, filename: string, contentType: string) {
  const extension = allowedProofTypes.get(contentType.toLowerCase()) ?? 'jpg';
  const month = new Date().toISOString().slice(0, 7);
  const bookingSegment = sanitizeMediaSegment(bookingId, 'booking');
  const fileSegment = sanitizeMediaSegment(filename.replace(/\.[^.]+$/, ''), 'proof');

  return `booking-payment-proofs/${month}/${bookingSegment}/${fileSegment}-${crypto.randomUUID()}.${extension}`;
}

export async function POST(request: Request, context: PaymentProofRouteContext) {
  try {
    const adminEmail = await getAdminEmail();

    if (!adminEmail) {
      return jsonResponse({ ok: false, error: 'Unauthorized.' }, 401);
    }

    const { bookingId } = await context.params;
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return jsonResponse({ ok: false, error: 'Choose payment proof first.' }, 400);
    }

    if (file.size <= 0) {
      return jsonResponse({ ok: false, error: 'Payment proof is empty.' }, 400);
    }

    if (file.size > maxProofBytes) {
      return jsonResponse({ ok: false, error: 'Payment proof must be 5 MB or smaller.' }, 400);
    }

    if (!allowedProofTypes.has(file.type.toLowerCase())) {
      return jsonResponse({ ok: false, error: 'Use JPG, PNG, WebP, or PDF.' }, 400);
    }

    const key = createProofKey(bookingId, file.name, file.type);
    const bucket = await getMediaBucket();

    await bucket.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'private, max-age=31536000, immutable',
      },
      customMetadata: {
        source: 'farsha-booking-payment-proof',
        bookingId,
        originalName: file.name,
      },
    });

    const proof = await recordBookingPaymentProof({
      bookingId,
      key,
      filename: file.name,
      contentType: file.type,
      size: file.size,
      uploadedBy: adminEmail,
    });

    return jsonResponse({
      ok: true,
      data: {
        ...proof,
        url: mediaKeyToUrl(key),
      },
    });
  } catch (error) {
    if (error instanceof BookingDbError) {
      return jsonResponse({ ok: false, error: error.message, code: error.code }, error.status);
    }

    const message = error instanceof Error ? error.message : 'Upload payment proof failed.';

    return jsonResponse({ ok: false, error: message }, 500);
  }
}
