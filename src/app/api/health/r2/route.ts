import { getMediaBucket } from '@/lib/media-library';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const bucket = await getMediaBucket();
    const result = await bucket.list({ limit: 1 });

    return Response.json({
      ok: true,
      binding: 'MEDIA_BUCKET',
      storage: 'media',
      objectCountChecked: result.objects.length,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        binding: 'MEDIA_BUCKET',
        storage: 'media',
        error: error instanceof Error ? error.message : 'R2 health check failed.',
      },
      { status: 500 },
    );
  }
}
