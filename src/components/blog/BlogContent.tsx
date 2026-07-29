import { Fragment, type ReactNode } from 'react';

import type { TiptapDoc, TiptapMark, TiptapNode } from '@/lib/blog-content';

// Controlled Tiptap-JSON → React renderer.
//
// This is the security boundary described in the spec (§5): the public body is
// built from an allowlist of node/mark types only — no `dangerouslySetInnerHTML`,
// no HTML sanitizer. Anything not explicitly handled below is dropped, so the
// stored JSON can never inject markup or scripts.
//
// Allowed nodes: paragraph, heading, bulletList, orderedList, listItem,
//                blockquote, image, horizontalRule, hardBreak, text.
// Allowed marks: bold, italic, link.

function attrString(node: TiptapNode, key: string): string {
  const value = node.attrs?.[key];
  return typeof value === 'string' ? value : '';
}

function attrNumber(node: TiptapNode, key: string): number | null {
  const value = node.attrs?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

// Only http(s), mailto, and site-relative links survive. Everything else
// (javascript:, data:, etc.) is stripped to plain text.
function safeLinkHref(raw: string): string | null {
  const href = raw.trim();

  if (!href) {
    return null;
  }

  if (href.startsWith('/') || href.startsWith('#')) {
    return href;
  }

  try {
    const url = new URL(href);

    if (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:') {
      return url.href;
    }
  } catch {
    return null;
  }

  return null;
}

function safeImageSrc(raw: string): string | null {
  const src = raw.trim();

  if (!src) {
    return null;
  }

  if (src.startsWith('/')) {
    return src;
  }

  try {
    const url = new URL(src);

    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.href;
    }
  } catch {
    return null;
  }

  return null;
}

// Wrap a text node in its allowed marks. Link is applied outermost so it can
// carry the safe-rel attributes.
function renderText(node: TiptapNode, key: string): ReactNode {
  const text = typeof node.text === 'string' ? node.text : '';

  if (!text) {
    return null;
  }

  let element: ReactNode = text;
  const marks: TiptapMark[] = Array.isArray(node.marks) ? node.marks : [];

  for (const mark of marks) {
    if (mark.type === 'bold') {
      element = <strong>{element}</strong>;
    } else if (mark.type === 'italic') {
      element = <em>{element}</em>;
    }
  }

  const linkMark = marks.find((mark) => mark.type === 'link');

  if (linkMark) {
    const href = safeLinkHref(
      typeof linkMark.attrs?.href === 'string' ? linkMark.attrs.href : '',
    );

    if (href) {
      const external = /^https?:/i.test(href);

      element = (
        <a
          href={href}
          // Untrusted outbound links: nofollow so authored links don't leak
          // ranking equity, noopener/noreferrer to close the tab-nabbing vector.
          rel="nofollow noopener noreferrer"
          target={external ? '_blank' : undefined}
          className="font-medium underline decoration-[color-mix(in_srgb,var(--theme-text)_40%,transparent)] underline-offset-2 transition-colors hover:decoration-[var(--theme-text)]"
        >
          {element}
        </a>
      );
    }
  }

  return <Fragment key={key}>{element}</Fragment>;
}

function renderChildren(nodes: TiptapNode[] | null | undefined, keyPrefix: string): ReactNode[] {
  if (!Array.isArray(nodes)) {
    return [];
  }

  return nodes
    .map((child, index) => renderNode(child, `${keyPrefix}-${index}`))
    .filter((child): child is ReactNode => child !== null);
}

function renderNode(node: TiptapNode | undefined, key: string): ReactNode {
  if (!node || typeof node !== 'object') {
    return null;
  }

  switch (node.type) {
    case 'text':
      return renderText(node, key);

    case 'hardBreak':
      return <br key={key} />;

    case 'paragraph':
      return (
        <p key={key} className="my-5 leading-relaxed">
          {renderChildren(node.content, key)}
        </p>
      );

    case 'heading': {
      const level = attrNumber(node, 'level') ?? 1;
      // Collapse editor heading levels into h2–h4 so the article keeps a single
      // h1 (the post title) for a clean document outline.
      const tag = level <= 1 ? 'h2' : level === 2 ? 'h3' : 'h4';
      const sizes: Record<string, string> = {
        h2: 'mt-10 mb-4 text-2xl font-semibold tracking-tight sm:text-3xl',
        h3: 'mt-8 mb-3 text-xl font-semibold tracking-tight sm:text-2xl',
        h4: 'mt-6 mb-2 text-lg font-semibold tracking-tight',
      };
      const HeadingTag = tag as 'h2' | 'h3' | 'h4';

      return (
        <HeadingTag key={key} className={sizes[tag]}>
          {renderChildren(node.content, key)}
        </HeadingTag>
      );
    }

    case 'bulletList':
      return (
        <ul key={key} className="my-5 list-disc space-y-2 pl-6 leading-relaxed">
          {renderChildren(node.content, key)}
        </ul>
      );

    case 'orderedList':
      return (
        <ol key={key} className="my-5 list-decimal space-y-2 pl-6 leading-relaxed">
          {renderChildren(node.content, key)}
        </ol>
      );

    case 'listItem':
      return <li key={key}>{renderChildren(node.content, key)}</li>;

    case 'blockquote':
      return (
        <blockquote
          key={key}
          className="my-6 border-l-2 border-[var(--theme-border)] pl-4 italic text-[color-mix(in_srgb,var(--theme-text)_75%,transparent)]"
        >
          {renderChildren(node.content, key)}
        </blockquote>
      );

    case 'horizontalRule':
      return <hr key={key} className="my-10 border-t border-[var(--theme-border)]" />;

    case 'image': {
      const src = safeImageSrc(attrString(node, 'src'));

      if (!src) {
        return null;
      }

      const alt = attrString(node, 'alt');
      const title = attrString(node, 'title');

      return (
        <figure key={key} className="my-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className="w-full rounded-sm object-cover"
          />
          {title ? (
            <figcaption className="mt-2 text-center text-xs text-[color-mix(in_srgb,var(--theme-text)_55%,transparent)]">
              {title}
            </figcaption>
          ) : null}
        </figure>
      );
    }

    // Unknown / disallowed node type — dropped entirely (XSS-safe by construction).
    default:
      return null;
  }
}

export default function BlogContent({ doc }: { doc: TiptapDoc }) {
  const children = renderChildren(doc?.content, 'node');

  if (children.length === 0) {
    return null;
  }

  return (
    <div className="text-[15px] text-[var(--theme-text)] sm:text-base">{children}</div>
  );
}
