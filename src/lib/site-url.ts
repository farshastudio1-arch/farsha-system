// Canonical public origin, used for absolute URLs in metadata (Open Graph) and
// the sitemap. Mirrors the auth origin so previews/staging resolve correctly.
const fallbackBaseUrl = 'https://farshastudio.com';

export function getSiteBaseUrl(): string {
  const raw = process.env.AUTH_URL?.trim();

  if (!raw) {
    return fallbackBaseUrl;
  }

  return raw.replace(/\/+$/, '');
}

export function absoluteUrl(path: string): string {
  const base = getSiteBaseUrl();

  if (!path) {
    return base;
  }

  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
}
