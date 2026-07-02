import { getCatalogImagesBucket } from '@/lib/catalog-images';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const bucket = await getCatalogImagesBucket();
    const result = await bucket.list({ limit: 1 });

    return Response.json({
      ok: true,
      binding: 'CATALOG_IMAGES',
      objectCountChecked: result.objects.length,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        binding: 'CATALOG_IMAGES',
        error: error instanceof Error ? error.message : 'R2 health check failed.',
      },
      { status: 500 },
    );
  }
}
