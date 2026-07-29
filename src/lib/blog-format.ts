// Human-readable Indonesian date for the public blog (feed cards + article
// byline). D1 stores timestamps as `YYYY-MM-DD HH:MM:SS` in UTC.
export function formatBlogDate(value: string | null): string {
  if (!value) {
    return '';
  }

  const iso = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const parsed = new Date(iso);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
