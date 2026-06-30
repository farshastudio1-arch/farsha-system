'use client';

import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 400) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-40 p-3 rounded-full theme-surface theme-border border shadow-lg hover:shadow-xl text-[var(--theme-text)] transition-all duration-300 hover:scale-110 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-5 cursor-pointer backdrop-blur-md bg-[color-mix(in_srgb,var(--theme-surface)_88%,transparent)]"
      aria-label="Kembali ke atas"
    >
      <ArrowUp className="w-5 h-5" strokeWidth={2.2} />
    </button>
  );
}
