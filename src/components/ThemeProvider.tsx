'use client';

import { useEffect } from 'react';

import { SiteSettings } from '@/data/mockData';
import { useSavedSiteSettings } from '@/lib/site-settings';

export default function ThemeProvider({ initialSettings }: { initialSettings: SiteSettings }) {
  const settings = useSavedSiteSettings(initialSettings);

  useEffect(() => {
    const root = document.documentElement;
    const radius = `${settings.borderRadius}px`;

    root.style.setProperty('--theme-background', settings.backgroundColor);
    root.style.setProperty('--theme-text', settings.textColor);
    root.style.setProperty('--theme-primary', settings.primaryColor);
    root.style.setProperty('--theme-accent', settings.accentColor);
    root.style.setProperty('--theme-surface', settings.surfaceColor);
    root.style.setProperty('--theme-border', settings.borderColor);
    root.style.setProperty('--theme-radius', radius);
  }, [
    settings.accentColor,
    settings.backgroundColor,
    settings.borderColor,
    settings.borderRadius,
    settings.primaryColor,
    settings.surfaceColor,
    settings.textColor,
  ]);

  return null;
}
