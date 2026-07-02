import { auth } from '../../../../../auth';
import {
  CATALOG_IMAGE_MAX_BYTES,
  catalogImageKeyToUrl,
  createCatalogImageKey,
  deleteCatalogImageByUrl,
  getAllowedCatalogImageTypes,
  getCatalogImagesBucket,
  isAllowedCatalogImageType,
} from '@/lib/catalog-images';

export const dynamic = 'force-dynamic';

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status });
}

async function ensureAdmin() {
  const session = await auth();

  if (session?.user?.role !== 'admin') {
    return false;
  }

  return true;
}

export async function POST(request: Request) {
  try {
    if (!(await ensureAdmin())) {
      return jsonResponse({ ok: false, error: 'Unauthorized.' }, 401);
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const code = String(formData.get('code') ?? 'draft');

    if (!(file instanceof File)) {
      return jsonResponse({ ok: false, error: 'Choose an image file first.' }, 400);
    }

    if (file.size <= 0) {
      return jsonResponse({ ok: false, error: 'Image file is empty.' }, 400);
    }

    if (file.size > CATALOG_IMAGE_MAX_BYTES) {
      return jsonResponse({ ok: false, error: 'Image must be 5 MB or smaller.' }, 400);
    }

    if (!isAllowedCatalogImageType(file.type)) {
      return jsonResponse(
        {
          ok: false,
          error: `Use one of these image types: ${getAllowedCatalogImageTypes().join(', ')}.`,
        },
        400,
      );
    }

    const key = createCatalogImageKey(code, file.type);
    const bucket = await getCatalogImagesBucket();
    const fileBuffer = await file.arrayBuffer();

    await bucket.put(key, fileBuffer, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000, immutable',
      },
      customMetadata: {
        source: 'farsha-admin-catalog',
        originalName: file.name,
      },
    });

    return jsonResponse({
      ok: true,
      data: {
        key,
        url: catalogImageKeyToUrl(key),
        contentType: file.type,
        size: file.size,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed.';

    return jsonResponse(
      {
        ok: false,
        error: `Upload failed: ${message}`,
      },
      500,
    );
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await ensureAdmin())) {
      return jsonResponse({ ok: false, error: 'Unauthorized.' }, 401);
    }

    const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
    const url = typeof body?.url === 'string' ? body.url : '';

    if (!url) {
      return jsonResponse({ ok: false, error: 'Missing image URL.' }, 400);
    }

    const deleted = await deleteCatalogImageByUrl(url);

    return jsonResponse({ ok: true, data: { deleted } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delete failed.';

    return jsonResponse(
      {
        ok: false,
        error: `Delete failed: ${message}`,
      },
      500,
    );
  }
}
