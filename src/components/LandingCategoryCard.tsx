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
    <div className="group relative overflow-hidden bg-neutral-950 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="relative aspect-[4/5] w-full overflow-hidden">
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

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-neutral-950/72 via-neutral-950/28 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1/2 bg-gradient-to-t from-neutral-950/88 via-neutral-950/46 to-transparent" />
        <div className="pointer-events-none absolute left-4 right-4 top-4 z-20 flex items-start justify-between gap-3">
          <span className="inline-flex min-h-10 min-w-10 items-center justify-center text-base text-white drop-shadow-md" aria-hidden="true">
            {category.emoji}
          </span>
          <span
            className={`px-3 py-2 text-right font-mono text-[10px] font-semibold uppercase tracking-widest text-neutral-950 shadow-sm ${
              category.availabilityTone === 'ready'
                ? 'bg-[#bde0fe]'
                : 'bg-[#ffc8dd]'
            }`}
          >
            {category.availabilityCue}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-20 p-4 sm:p-5">
          <Link href={`/catalog?category=${category.slug}`} className="block max-w-[92%] pr-12 text-white">
            <h3 className="font-serif text-xl font-semibold leading-tight sm:text-2xl">
              {category.title}
            </h3>
            <p className="mt-2 max-w-[24rem] text-sm leading-relaxed text-white/85">
              {category.descriptor}
            </p>
            <span className="mt-4 inline-flex font-mono text-[10px] font-semibold uppercase tracking-widest text-white underline decoration-white/45 underline-offset-4 drop-shadow-md transition-colors group-hover:decoration-white">
              {category.action}
            </span>
          </Link>
        </div>

        {imageUrls.length > 1 && (
          <div className="absolute bottom-4 right-4 z-30 flex items-center gap-1.5">
            {imageUrls.map((_, index) => (
              <button
                key={`${category.slug}-page-${index}`}
                type="button"
                onClick={() => scrollToImage(index)}
                className={`h-1.5 rounded-full transition-all ${
                  activeImageIndex === index
                    ? 'w-3 bg-white'
                    : 'w-1.5 bg-white/45 hover:bg-white/75'
                }`}
                aria-label={`Show ${category.title} image ${index + 1}`}
                aria-current={activeImageIndex === index ? 'true' : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
