// Shared, dependency-free helpers for working with Tiptap ProseMirror JSON.
//
// These run on both server (excerpt / reading-time derivation, controlled
// rendering) and client (the editor). Nothing here trusts the JSON: the public
// renderer (see BlogContent.tsx) only emits an allowlist of node/mark types, so
// unknown shapes degrade to nothing rather than injecting markup.

export type TiptapMark = {
  type?: string;
  attrs?: Record<string, unknown> | null;
};

export type TiptapNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown> | null;
  marks?: TiptapMark[] | null;
  content?: TiptapNode[] | null;
};

export type TiptapDoc = {
  type?: string;
  content?: TiptapNode[] | null;
};

const emptyDoc: TiptapDoc = { type: 'doc', content: [] };

// Block-level node types that should read as separate "lines" when we flatten
// the document to plain text (for excerpts and word counts).
const blockNodeTypes = new Set([
  'paragraph',
  'heading',
  'listItem',
  'blockquote',
  'horizontalRule',
]);

export function parseTiptapDoc(value: unknown): TiptapDoc {
  if (!value) {
    return emptyDoc;
  }

  let candidate: unknown = value;

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (!trimmed) {
      return emptyDoc;
    }

    try {
      candidate = JSON.parse(trimmed);
    } catch {
      return emptyDoc;
    }
  }

  if (
    candidate &&
    typeof candidate === 'object' &&
    Array.isArray((candidate as TiptapDoc).content)
  ) {
    return candidate as TiptapDoc;
  }

  return emptyDoc;
}

export function serializeTiptapDoc(doc: TiptapDoc): string {
  try {
    return JSON.stringify(doc ?? emptyDoc);
  } catch {
    return JSON.stringify(emptyDoc);
  }
}

// Flatten a document to plain text, inserting spaces between block nodes so
// word counts and excerpts don't glue the end of one paragraph to the next.
export function extractPlainText(value: unknown): string {
  const doc = parseTiptapDoc(value);
  const parts: string[] = [];

  const walk = (node: TiptapNode | undefined) => {
    if (!node) {
      return;
    }

    if (typeof node.text === 'string') {
      parts.push(node.text);
    }

    if (Array.isArray(node.content)) {
      node.content.forEach(walk);
    }

    if (node.type && blockNodeTypes.has(node.type)) {
      parts.push(' ');
    }
  };

  (doc.content ?? []).forEach(walk);

  return parts.join('').replace(/\s+/g, ' ').trim();
}

export function computeReadingTimeMinutes(value: unknown): number {
  const words = extractPlainText(value).split(/\s+/).filter(Boolean).length;

  // ~200 wpm; never advertise "0 min read".
  return Math.max(1, Math.round(words / 200));
}

const excerptMaxLength = 160;

// Optional excerpt with auto-fallback: use the explicit excerpt when present,
// otherwise the first ~160 chars of body text, cut at a word boundary.
export function deriveExcerpt(bodyValue: unknown, explicit?: string | null): string {
  const trimmedExplicit = (explicit ?? '').trim();

  if (trimmedExplicit) {
    return trimmedExplicit;
  }

  const text = extractPlainText(bodyValue);

  if (text.length <= excerptMaxLength) {
    return text;
  }

  const slice = text.slice(0, excerptMaxLength);
  const lastSpace = slice.lastIndexOf(' ');
  const clipped = lastSpace > 40 ? slice.slice(0, lastSpace) : slice;

  return `${clipped.trimEnd()}…`;
}

// URL-safe slug from a title. ASCII-only (D1 `slug` is a UNIQUE key hit from the
// public route), spaces → hyphens, punctuation dropped.
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
