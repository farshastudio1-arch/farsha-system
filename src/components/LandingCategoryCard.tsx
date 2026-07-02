'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';

import { LandingCategory } from '@/lib/landing-categories';

interface LandingCategoryCardProps {
  category: LandingCategory;
}

export default function LandingCategoryCard({ category }: LandingCategoryCardProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const imageUrls = category.imageUrls.length > 0 ? category.imageUrls : [category.imageUrl];

  const scrollToImage = (index: number) => {
    carouselRef.current?.scrollTo({
      left: index * carouselRef.current.clientWidth,
      behavior: 'smooth',
    });
    setActiveImageIndex(index);
  };

  return (
    <div className="theme-surface theme-border group flex min-h-[340px] flex-col border transition-all duration-300 hover:-translate-y-1 hover:shadow-md sm:min-h-[380px]">
      <Link href={`/catalog?category=${category.slug}`} className="theme-border flex items-center justify-between border-b px-4 py-3">
        <span className="text-base" aria-hidden="true">
          {category.emoji}
        </span>
        <span
          className={`border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest ${
            category.availabilityTone === 'ready'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-amber-200 bg-amber-50 text-amber-700'
          }`}
        >
          {category.availabilityCue}
        </span>
      </Link>

      <div className="theme-soft-surface relative mx-3 mt-3 aspect-[4/3] overflow-hidden sm:aspect-[3/4]">
        <div
          ref={carouselRef}
          onScroll={(event) => {
            const container = event.currentTarget;
            setActiveImageIndex(Math.round(container.scrollLeft / container.clientWidth));
          }}
          className="no-scrollbar flex h-full w-full snap-x snap-mandatory overflow-x-auto"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {imageUrls.map((url, index) => (
            <Link
              key={`${category.slug}-${index}-${url}`}
              href={`/catalog?category=${category.slug}`}
              className="h-full w-full shrink-0 snap-center"
              aria-label={`${category.title} foto ${index + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={index === 0 ? category.title : `${category.title} ${index + 1}`}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading={index === 0 ? 'eager' : 'lazy'}
              />
            </Link>
          ))}
        </div>

        {imageUrls.length > 1 && (
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 bg-[color-mix(in_srgb,var(--theme-text)_58%,transparent)] px-2.5 py-1 backdrop-blur-xs">
            {imageUrls.map((_, index) => (
              <button
                key={`${category.slug}-page-${index}`}
                type="button"
                onClick={() => scrollToImage(index)}
                className={`h-1.5 rounded-full transition-all ${
                  activeImageIndex === index
                    ? 'w-3 bg-[var(--theme-surface)]'
                    : 'w-1.5 bg-[color-mix(in_srgb,var(--theme-surface)_45%,transparent)] hover:bg-[color-mix(in_srgb,var(--theme-surface)_75%,transparent)]'
                }`}
                aria-label={`Show ${category.title} image ${index + 1}`}
                aria-current={activeImageIndex === index ? 'true' : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <Link href={`/catalog?category=${category.slug}`} className="flex flex-1 flex-col p-4">
        <h3 className="font-serif text-lg font-semibold leading-tight text-[var(--theme-text)] sm:text-xl">
          {category.title}
        </h3>
        <p className="theme-muted-strong mt-2 mb-5 text-sm leading-relaxed">
          {category.descriptor}
        </p>
        <span className="theme-border mt-auto inline-flex border-t pt-4 font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--theme-text)]">
          {category.action}
        </span>
      </Link>
    </div>
  );
}
