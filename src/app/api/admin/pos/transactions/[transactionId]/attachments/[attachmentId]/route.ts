import { auth } from '../../../../../../../../../auth';
import { readPosTransactionAttachmentObject } from '@/lib/pos-attachments';

export const dynamic = 'force-dynamic';

type AttachmentRouteContext = {
  params: Promise<{
    transactionId: string;
    attachmentId: string;
  }>;
};

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status });
}

async function ensureAdmin() {
  const session = await auth();

  return session?.user?.role === 'admin';
}

export async function GET(_request: Request, context: AttachmentRouteContext) {
  try {
    if (!(await ensureAdmin())) {
      return jsonResponse({ ok: false, error: 'Unauthorized.' }, 401);
    }

    const { transactionId, attachmentId } = await context.params;
    const result = await readPosTransactionAttachmentObject(transactionId, attachmentId);

    if (!result) {
      return new Response('Attachment not found.', { status: 404 });
    }

    const headers = new Headers();
    result.object.writeHttpMetadata(headers);
    headers.set('etag', result.object.httpEtag);
    headers.set('cache-control', 'private, no-store');
    headers.set('x-content-type-options', 'nosniff');

    return new Response(result.object.body, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load attachment.';

    return jsonResponse({ ok: false, error: message }, 500);
  }
}
