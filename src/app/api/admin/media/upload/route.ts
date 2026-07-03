import { auth } from '../../../../../../auth';
import { upsertMediaAsset } from '@/lib/farsha-db';
import {
  MEDIA_IMAGE_MAX_BYTES,
  createMediaAssetKey,
  getAllowedMediaImageTypes,
  getMediaBucket,
  isAllowedMediaImageType,
  mediaKeyToUrl,
  normalizeMediaSourceArea,
  sanitizeMediaSegment,
} from '@/lib/media-library';

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
    const filenameHint = String(formData.get('filenameHint') ?? formData.get('code') ?? 'upload');
    const albumIdValue = formData.get('albumId');
    const sourceArea = normalizeMediaSourceArea(formData.get('sourceArea'));
    const originalFilename = String(formData.get('originalFilename') ?? '');
    const originalSize = Number(formData.get('originalSize') ?? 0);
    const optimized = String(formData.get('optimized') ?? 'false') === 'true';
    const width = Number(formData.get('width') ?? 0);
    const height = Number(formData.get('height') ?? 0);
    const albumId =
      typeof albumIdValue === 'string' && albumIdValue.trim() ? albumIdValue.trim() : null;

    if (!(file instanceof File)) {
      return jsonResponse({ ok: false, error: 'Choose an image file first.' }, 400);
    }

    if (file.size <= 0) {
      return jsonResponse({ ok: false, error: 'Image file is empty.' }, 400);
    }

    if (file.size > MEDIA_IMAGE_MAX_BYTES) {
      return jsonResponse({ ok: false, error: 'Image must be 5 MB or smaller.' }, 400);
    }

    if (!isAllowedMediaImageType(file.type)) {
      return jsonResponse(
        {
          ok: false,
          error: `Use one of these image types: ${getAllowedMediaImageTypes().join(', ')}.`,
        },
        400,
      );
    }

    const key = createMediaAssetKey(
      sourceArea,
      sanitizeMediaSegment(filenameHint, 'upload'),
      file.type,
    );
    const bucket = await getMediaBucket();
    const fileBuffer = await file.arrayBuffer();

    await bucket.put(key, fileBuffer, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000, immutable',
      },
      customMetadata: {
        source: `farsha-admin-${sourceArea}`,
        originalName: originalFilename || file.name,
        originalSize: Number.isFinite(originalSize) && originalSize > 0 ? String(originalSize) : '',
        optimized: String(optimized),
      },
    });

    const asset = await upsertMediaAsset({
      key,
      filename: file.name,
      contentType: file.type,
      size: file.size,
      width: Number.isFinite(width) && width > 0 ? width : null,
      height: Number.isFinite(height) && height > 0 ? height : null,
      title: file.name.replace(/\.[^.]+$/, ''),
      albumId,
      sourceArea,
    });

    return jsonResponse({
      ok: true,
      data: {
        key,
        url: mediaKeyToUrl(key),
        contentType: file.type,
        size: file.size,
        asset,
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

export async function DELETE() {
  try {
    if (!(await ensureAdmin())) {
      return jsonResponse({ ok: false, error: 'Unauthorized.' }, 401);
    }

    return jsonResponse(
      {
        ok: false,
        error: 'Use the media library to delete stored images.',
      },
      409,
    );
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
