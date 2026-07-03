import { decodeMediaKey, getMediaBucket, isMediaAssetKey } from '@/lib/media-library';

export const dynamic = 'force-dynamic';

type MediaRouteContext = {
  params: Promise<{
    key: string[];
  }>;
};

export async function GET(_request: Request, context: MediaRouteContext) {
  const params = await context.params;
  const key = decodeMediaKey(params.key.join('/'));

  if (!isMediaAssetKey(key)) {
    return new Response('Invalid image key.', { status: 400 });
  }

  const bucket = await getMediaBucket();
  const object = await bucket.get(key);

  if (!object) {
    return new Response('Image not found.', { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');

  return new Response(object.body, { headers });
}
