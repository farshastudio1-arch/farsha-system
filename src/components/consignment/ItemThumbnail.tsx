'use client';

import { useState } from 'react';
import { ImageOff } from 'lucide-react';

export default function ItemThumbnail({ src, alt }: { src?: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div className="theme-soft-surface theme-border relative aspect-[4/5] w-16 shrink-0 overflow-hidden border">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <ImageOff className="h-4 w-4 text-[var(--theme-text)] opacity-25" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
