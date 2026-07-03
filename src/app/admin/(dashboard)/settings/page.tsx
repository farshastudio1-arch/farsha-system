'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Eye,
  Images,
  MessageCircle,
  Palette,
  Save,
  SlidersHorizontal,
  Store,
} from 'lucide-react';

import MediaLibraryPicker from '@/components/admin/MediaLibraryPicker';
import { KebayaItem, mockKebayas, SiteSettings } from '@/data/mockData';
import { fetchSiteSettingsAction, saveSiteSettingsAction } from '@/lib/farsha-actions';
import {
  applyCatalogCardMode,
  useSavedSiteSettings,
  writeSavedSiteSettings,
} from '@/lib/site-settings';

type TextField = Extract<
  keyof SiteSettings,
  | 'studioName'
  | 'tagline'
  | 'locationLabel'
  | 'whatsappNumber'
  | 'email'
  | 'address'
  | 'instagramUrl'
  | 'tiktokUrl'
  | 'mapsUrl'
  | 'logoUrl'
  | 'faviconUrl'
>;

type BooleanField = Extract<
  keyof SiteSettings,
  | 'showPrices'
  | 'showAvailabilityBadges'
  | 'showProductCode'
  | 'showProductModel'
  | 'showProductSize'
  | 'showProductColor'
  | 'showProductDescription'
  | 'showCardCta'
>;

type ThemeColorField = Extract<
  keyof SiteSettings,
  'backgroundColor' | 'textColor' | 'primaryColor' | 'accentColor' | 'surfaceColor' | 'borderColor'
>;

const statusOptions: Array<{
  value: SiteSettings['status'];
  label: string;
  description: string;
}> = [
  {
    value: 'active',
    label: 'Active',
    description: 'Public catalog is ready for normal customer browsing.',
  },
  {
    value: 'maintenance',
    label: 'Maintenance',
    description: 'Use when catalog data is being cleaned up.',
  },
  {
    value: 'coming-soon',
    label: 'Coming Soon',
    description: 'Use before a launch or major catalog refresh.',
  },
];

const catalogCardModeOptions: Array<{
  value: SiteSettings['catalogCardMode'];
  label: string;
  description: string;
}> = [
  {
    value: 'minimal',
    label: 'Minimal',
    description: 'Image-first browsing with only core availability.',
  },
  {
    value: 'standard',
    label: 'Standard',
    description: 'Best default balance for shoppers scanning the catalog.',
  },
  {
    value: 'detailed',
    label: 'Detailed',
    description: 'Shows more context before opening product detail.',
  },
];

const catalogCardToggleOptions: Array<{
  key: BooleanField;
  title: string;
  description: string;
}> = [
  {
    key: 'showAvailabilityBadges',
    title: 'Availability badge',
    description: 'Shows available, rented, or maintenance status.',
  },
  {
    key: 'showPrices',
    title: 'Rental price',
    description: 'Shows rental price before opening product details.',
  },
  {
    key: 'showProductModel',
    title: 'Model label',
    description: 'Shows Modern, Klasik, Kartini, or Kutubaru.',
  },
  {
    key: 'showProductSize',
    title: 'Size chip',
    description: 'Shows the size label directly on catalog cards.',
  },
  {
    key: 'showProductCode',
    title: 'Inventory code',
    description: 'Useful internally, but noisier for customers.',
  },
  {
    key: 'showProductColor',
    title: 'Color chip',
    description: 'Shows the main color as a quick comparison cue.',
  },
  {
    key: 'showProductDescription',
    title: 'Short description',
    description: 'Adds copy on spacious card layouts.',
  },
  {
    key: 'showCardCta',
    title: 'Detail button',
    description: 'Adds a clear card-level command.',
  },
];

const themeColorOptions: Array<{
  key: ThemeColorField;
  label: string;
  description: string;
}> = [
  {
    key: 'backgroundColor',
    label: 'Background',
    description: 'Page background color.',
  },
  {
    key: 'surfaceColor',
    label: 'Surface',
    description: 'Cards, forms, and panels.',
  },
  {
    key: 'textColor',
    label: 'Text',
    description: 'Primary copy and icon color.',
  },
  {
    key: 'primaryColor',
    label: 'Primary',
    description: 'Main CTAs and selected states.',
  },
  {
    key: 'accentColor',
    label: 'Accent',
    description: 'Dark supporting surfaces.',
  },
  {
    key: 'borderColor',
    label: 'Border',
    description: 'Dividers and outlines.',
  },
];

function isValidHexColor(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value.trim());
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function getStatusDetails(status: KebayaItem['status']) {
  switch (status) {
    case 'available':
      return { text: 'AVAILABLE', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'rented':
      return { text: 'RENTED', className: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'maintenance':
      return { text: 'DICUCI', className: 'bg-rose-50 text-rose-700 border-rose-200' };
    default:
      return { text: 'ARSIP', className: 'bg-slate-100 text-slate-700 border-slate-300' };
  }
}

function cleanPhone(value: string) {
  return value.replace(/\D/g, '');
}

function isValidOptionalUrl(value: string) {
  if (!value.trim()) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function getValidationErrors(settings: SiteSettings) {
  const errors: Record<string, string> = {};
  const urlFields: Array<{ key: TextField; label: string }> = [
    { key: 'instagramUrl', label: 'Instagram URL' },
    { key: 'tiktokUrl', label: 'TikTok URL' },
    { key: 'mapsUrl', label: 'Google Maps URL' },
    { key: 'logoUrl', label: 'Logo URL' },
    { key: 'faviconUrl', label: 'Favicon URL' },
  ];

  if (!settings.studioName.trim()) {
    errors.studioName = 'Studio name is required.';
  }

  if (!settings.whatsappNumber.trim()) {
    errors.whatsappNumber = 'WhatsApp number is required.';
  } else if (cleanPhone(settings.whatsappNumber).length < 9) {
    errors.whatsappNumber = 'Use a complete WhatsApp number.';
  }

  if (settings.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)) {
    errors.email = 'Use a valid email address.';
  }

  for (const field of urlFields) {
    const rawValue = settings[field.key].trim();

    if (!rawValue) {
      continue;
    }

    if (!isValidOptionalUrl(rawValue)) {
      errors[field.key] = `${field.label} must start with http or https.`;
    }
  }

  for (const option of themeColorOptions) {
    if (!isValidHexColor(settings[option.key])) {
      errors[option.key] = 'Use a 6-digit hex color, for example #111111.';
    }
  }

  if (
    !Number.isFinite(settings.borderRadius) ||
    settings.borderRadius < 0 ||
    settings.borderRadius > 32
  ) {
    errors.borderRadius = 'Use a value from 0 to 32.';
  }

  return errors;
}

function FieldError({ children }: { children?: string }) {
  if (!children) {
    return null;
  }

  return <p className="mt-1 text-xs font-semibold text-red-600">{children}</p>;
}

function SectionPanel({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon: typeof Store;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-neutral-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-neutral-200 p-4 sm:p-5">
        <div className="border border-neutral-200 bg-neutral-50 p-2 text-neutral-700">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-neutral-950">{title}</h2>
          {description && <p className="mt-1 text-sm leading-relaxed text-neutral-500">{description}</p>}
        </div>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-start justify-between gap-4 border p-4 text-left transition-colors ${
        checked
          ? 'border-neutral-900 bg-neutral-900 text-white'
          : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
      }`}
    >
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className={`mt-1 block text-xs ${checked ? 'text-neutral-300' : 'text-neutral-500'}`}>
          {description}
        </span>
      </span>
      <span
        className={`relative mt-0.5 h-6 w-11 shrink-0 transition-colors ${
          checked ? 'bg-white/25' : 'bg-neutral-200'
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </span>
    </button>
  );
}

function ThemeColorControl({
  option,
  value,
  onChange,
  error,
}: {
  option: (typeof themeColorOptions)[number];
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-neutral-700">{option.label}</label>
      <div className="flex items-center gap-3 border border-neutral-200 bg-neutral-50 px-3 py-2">
        <input
          type="color"
          value={value}
          onChange={onChange}
          className="h-9 w-11 cursor-pointer border border-neutral-200 bg-white"
          aria-label={`${option.label} color`}
        />
        <input
          type="text"
          value={value}
          onChange={onChange}
          className="min-w-0 flex-1 bg-transparent font-mono text-sm uppercase outline-none"
        />
        <span
          className="h-7 w-7 shrink-0 border border-neutral-200"
          style={{ backgroundColor: value }}
          aria-hidden="true"
        />
      </div>
      <p className="mt-1 text-xs text-neutral-500">{option.description}</p>
      <FieldError>{error}</FieldError>
    </div>
  );
}

function CatalogCardPreview({
  settings,
  product,
}: {
  settings: SiteSettings;
  product: KebayaItem;
}) {
  const statusInfo = getStatusDetails(product.status);

  return (
    <div className="border border-neutral-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
          Card preview
        </p>
        <Eye className="h-4 w-4 text-neutral-400" />
      </div>

      <div className="overflow-hidden border border-neutral-200 bg-white">
        <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.imageUrls[0]}
            alt={product.name}
            className="h-full w-full object-cover"
          />
          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {settings.showProductCode && (
              <span className="bg-black/80 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-white">
                {product.code}
              </span>
            )}
            {settings.showAvailabilityBadges && (
              <span
                className={`border px-2 py-0.5 text-[10px] font-semibold ${statusInfo.className}`}
              >
                {statusInfo.text}
              </span>
            )}
          </div>
        </div>

        <div className="p-4">
          {settings.showProductModel && (
            <span className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Koleksi {product.model}
            </span>
          )}
          <h3 className="font-serif text-base font-semibold leading-tight text-neutral-950">
            {product.name}
          </h3>
          {settings.showProductDescription && (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-neutral-600">
              {product.description}
            </p>
          )}

          {(settings.showPrices || settings.showProductSize || settings.showProductColor) && (
            <div className="mt-3 border-t border-neutral-200 pt-3">
              {settings.showPrices && (
                <div className="mb-2">
                  <span className="block font-mono text-[9px] uppercase tracking-wider text-neutral-500">
                    Biaya Sewa
                  </span>
                  <span className="font-mono text-sm font-semibold text-neutral-950">
                    {formatPrice(product.rentalPrice)}
                    <span className="text-[9px] font-normal text-neutral-500"> /hari</span>
                  </span>
                </div>
              )}
              {(settings.showProductSize || settings.showProductColor) && (
                <div className="flex flex-wrap gap-1.5">
                  {settings.showProductSize && (
                    <span className="bg-neutral-100 px-2 py-0.5 font-mono text-[10px] font-medium text-neutral-600">
                      Ukuran {product.size}
                    </span>
                  )}
                  {settings.showProductColor && (
                    <span className="bg-neutral-100 px-2 py-0.5 font-mono text-[10px] font-medium text-neutral-600">
                      {product.color}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {settings.showCardCta && (
            <button
              type="button"
              className="mt-4 w-full bg-neutral-900 py-3 text-xs font-semibold uppercase tracking-wider text-white"
            >
              Detail
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const savedSettings = useSavedSiteSettings();
  const [settingsDraft, setSettingsDraft] = useState<SiteSettings | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [pickerTarget, setPickerTarget] = useState<'logoUrl' | 'faviconUrl' | null>(null);
  const settings = settingsDraft ?? savedSettings;
  const previewProduct = mockKebayas[0];

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      setIsLoadingSettings(true);
      const result = await fetchSiteSettingsAction();

      if (!active) {
        return;
      }

      if (result.ok) {
        writeSavedSiteSettings(result.data);
        setSettingsError('');
      } else {
        setSettingsError(result.error);
      }

      setIsLoadingSettings(false);
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, []);

  const validationErrors = useMemo(() => getValidationErrors(settings), [settings]);
  const hasErrors = Object.keys(validationErrors).length > 0;
  const hasChanges = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [settings, savedSettings],
  );
  const whatsappReady = cleanPhone(settings.whatsappNumber).length >= 9;
  const publicStatusTone =
    settings.status === 'active'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-amber-200 bg-amber-50 text-amber-700';

  const updateField = <Key extends keyof SiteSettings>(key: Key, value: SiteSettings[Key]) => {
    setSaveState('idle');
    setSettingsDraft((current) => ({
      ...(current ?? savedSettings),
      [key]: value,
    }));
  };

  const updateTextField =
    (key: TextField) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      updateField(key, event.target.value);
    };

  const updateBooleanField = (key: BooleanField, value: boolean) => {
    updateField(key, value);
  };

  const updateCatalogCardMode = (mode: SiteSettings['catalogCardMode']) => {
    setSaveState('idle');
    setSettingsDraft((current) => applyCatalogCardMode(current ?? savedSettings, mode));
  };

  const updateColorField =
    (key: ThemeColorField) => (event: ChangeEvent<HTMLInputElement>) => {
      updateField(key, event.target.value);
    };

  const updateBorderRadius = (event: ChangeEvent<HTMLInputElement>) => {
    updateField('borderRadius', Number(event.target.value));
  };

  const selectLibraryImage = (url: string) => {
    if (!pickerTarget) {
      return;
    }

    updateField(pickerTarget, url);
  };

  const saveSettings = async () => {
    if (hasErrors) {
      setSaveState('error');
      return;
    }

    if (isSavingSettings) {
      return;
    }

    const nextSettings: SiteSettings = {
      ...settings,
      brandColor: settings.textColor,
      currency: 'IDR',
      updatedAt: new Date().toISOString(),
    };

    setIsSavingSettings(true);
    const result = await saveSiteSettingsAction(nextSettings);

    if (result.ok) {
      writeSavedSiteSettings(result.data);
      setSettingsDraft(null);
      setSaveState('saved');
      setSettingsError('');
    } else {
      setSaveState('error');
      setSettingsError(result.error);
    }

    setIsSavingSettings(false);
  };

  const discardChanges = () => {
    setSettingsDraft(null);
    setSaveState('idle');
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Studio settings
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
            Customer-facing controls
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500 sm:text-base">
            Settings here affect the catalog experience, saved contact references, and shared theme
            tokens. Logo and favicon can be selected from the media library.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {saveState === 'saved' && (
            <span className="inline-flex items-center justify-center gap-1.5 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              <Check className="h-4 w-4" />
              Saved to database
            </span>
          )}
          {saveState === 'error' && (
            <span className="inline-flex items-center justify-center gap-1.5 border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              <AlertTriangle className="h-4 w-4" />
              {settingsError || 'Review fields'}
            </span>
          )}
          {hasChanges && (
            <button
              type="button"
              onClick={discardChanges}
              disabled={isSavingSettings}
              className="border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              Discard
            </button>
          )}
          <button
            type="button"
            onClick={saveSettings}
            disabled={!hasChanges || hasErrors || isSavingSettings}
            className="inline-flex items-center justify-center gap-2 bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Save className="h-4 w-4" />
            {isSavingSettings ? 'Saving to database...' : 'Save changes'}
          </button>
        </div>
      </div>

      {(isLoadingSettings || settingsError) && (
        <div
          className={`border px-4 py-3 text-sm font-semibold ${
            settingsError
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-neutral-200 bg-neutral-50 text-neutral-600'
          }`}
        >
          {settingsError || 'Loading settings from database...'}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className={`border p-4 shadow-sm ${publicStatusTone}`}>
          <p className="text-xs font-semibold uppercase tracking-widest">Store status</p>
          <p className="mt-3 text-2xl font-semibold capitalize tracking-tight">
            {settings.status.replace('-', ' ')}
          </p>
          <p className="mt-2 text-sm opacity-80">Reference for admin readiness checks.</p>
        </div>
        <div className="border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            WhatsApp
          </p>
          <p className="mt-3 break-words text-lg font-semibold text-neutral-950">
            {whatsappReady ? settings.whatsappNumber : 'Needs number'}
          </p>
          <p className="mt-2 text-sm text-neutral-500">Used by admin dashboard readiness.</p>
        </div>
        <div className="border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Catalog mode
          </p>
          <p className="mt-3 text-2xl font-semibold capitalize tracking-tight text-neutral-950">
            {settings.catalogCardMode}
          </p>
          <p className="mt-2 text-sm text-neutral-500">Controls public catalog card density.</p>
        </div>
        <div className="border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Grid defaults
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
            {settings.defaultMobileGrid}/{settings.defaultDesktopGrid}
          </p>
          <p className="mt-2 text-sm text-neutral-500">Mobile and desktop catalog columns.</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <SectionPanel
            title="Public identity"
            description="Reference values used by admin readiness and future public integrations."
            icon={Store}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-neutral-700">
                  Studio name
                </label>
                <input
                  type="text"
                  value={settings.studioName}
                  onChange={updateTextField('studioName')}
                  className="w-full border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
                <FieldError>{validationErrors.studioName}</FieldError>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-neutral-700">
                  Location label
                </label>
                <input
                  type="text"
                  value={settings.locationLabel}
                  onChange={updateTextField('locationLabel')}
                  className="w-full border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
	              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-neutral-700">
                  Tagline
                </label>
                <textarea
                  rows={3}
                  value={settings.tagline}
                  onChange={updateTextField('tagline')}
                  className="w-full resize-none border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
	              </div>
	            </div>

            <div className="mt-5 border-t border-neutral-200 pt-5">
              <h3 className="text-sm font-semibold text-neutral-950">Brand media</h3>
              <p className="mt-1 text-sm text-neutral-500">
                Optional image references saved with site settings.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-neutral-700">
                    Logo URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={settings.logoUrl}
                      onChange={updateTextField('logoUrl')}
                      className="min-w-0 flex-1 border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                    <button
                      type="button"
                      onClick={() => setPickerTarget('logoUrl')}
                      aria-label="Choose logo from media library"
                      className="inline-flex shrink-0 items-center justify-center border border-neutral-200 bg-white px-3 text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
                    >
                      <Images className="h-4 w-4" />
                    </button>
                  </div>
                  <FieldError>{validationErrors.logoUrl}</FieldError>
                  <div className="mt-3 flex h-20 items-center justify-center border border-neutral-200 bg-neutral-50">
                    {settings.logoUrl && isValidOptionalUrl(settings.logoUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={settings.logoUrl} alt="Logo preview" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-xs font-semibold text-neutral-400">No logo</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-neutral-700">
                    Favicon URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={settings.faviconUrl}
                      onChange={updateTextField('faviconUrl')}
                      className="min-w-0 flex-1 border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                    <button
                      type="button"
                      onClick={() => setPickerTarget('faviconUrl')}
                      aria-label="Choose favicon from media library"
                      className="inline-flex shrink-0 items-center justify-center border border-neutral-200 bg-white px-3 text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
                    >
                      <Images className="h-4 w-4" />
                    </button>
                  </div>
                  <FieldError>{validationErrors.faviconUrl}</FieldError>
                  <div className="mt-3 flex h-20 items-center justify-center border border-neutral-200 bg-neutral-50">
                    {settings.faviconUrl && isValidOptionalUrl(settings.faviconUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={settings.faviconUrl} alt="Favicon preview" className="h-12 w-12 object-cover" />
                    ) : (
                      <span className="text-xs font-semibold text-neutral-400">No favicon</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateField('status', option.value)}
                  className={`border p-4 text-left transition-colors ${
                    settings.status === option.value
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span
                    className={`mt-1 block text-xs ${
                      settings.status === option.value ? 'text-neutral-300' : 'text-neutral-500'
                    }`}
                  >
                    {option.description}
                  </span>
                </button>
              ))}
            </div>
          </SectionPanel>

          <SectionPanel
            title="Contact and social"
            description="Saved contact references. The current public landing still has some hardcoded copy, so this section is intentionally conservative."
            icon={MessageCircle}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-neutral-700">
                  WhatsApp number
                </label>
                <input
                  type="tel"
                  value={settings.whatsappNumber}
                  onChange={updateTextField('whatsappNumber')}
                  className="w-full border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
                <FieldError>{validationErrors.whatsappNumber}</FieldError>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-neutral-700">Email</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={updateTextField('email')}
                  className="w-full border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
                <FieldError>{validationErrors.email}</FieldError>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-neutral-700">Address</label>
                <textarea
                  rows={3}
                  value={settings.address}
                  onChange={updateTextField('address')}
                  className="w-full resize-none border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-neutral-700">
                  Instagram URL
                </label>
                <input
                  type="url"
                  value={settings.instagramUrl}
                  onChange={updateTextField('instagramUrl')}
                  className="w-full border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
                <FieldError>{validationErrors.instagramUrl}</FieldError>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-neutral-700">
                  TikTok URL
                </label>
                <input
                  type="url"
                  value={settings.tiktokUrl}
                  onChange={updateTextField('tiktokUrl')}
                  className="w-full border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
                <FieldError>{validationErrors.tiktokUrl}</FieldError>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-neutral-700">
                  Google Maps URL
                </label>
                <input
                  type="url"
                  value={settings.mapsUrl}
                  onChange={updateTextField('mapsUrl')}
                  className="w-full border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
                <FieldError>{validationErrors.mapsUrl}</FieldError>
              </div>
            </div>
          </SectionPanel>

          <SectionPanel
            title="Catalog display"
            description="These controls are wired to the public catalog grid and product cards."
            icon={SlidersHorizontal}
          >
            <div className="grid gap-4 lg:grid-cols-3">
              {catalogCardModeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateCatalogCardMode(option.value)}
                  className={`border p-4 text-left transition-colors ${
                    settings.catalogCardMode === option.value
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span
                    className={`mt-1 block text-xs ${
                      settings.catalogCardMode === option.value
                        ? 'text-neutral-300'
                        : 'text-neutral-500'
                    }`}
                  >
                    {option.description}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {catalogCardToggleOptions.map((option) => (
                <ToggleRow
                  key={option.key}
                  title={option.title}
                  description={option.description}
                  checked={Boolean(settings[option.key])}
                  onChange={(checked) => updateBooleanField(option.key, checked)}
                />
              ))}
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-neutral-700">
                  Mobile grid
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        updateField('defaultMobileGrid', value as SiteSettings['defaultMobileGrid'])
                      }
                      className={`border px-3 py-2 text-sm font-semibold transition-colors ${
                        settings.defaultMobileGrid === value
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-neutral-700">
                  Desktop grid
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[2, 3, 4].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        updateField(
                          'defaultDesktopGrid',
                          value as SiteSettings['defaultDesktopGrid'],
                        )
                      }
                      className={`border px-3 py-2 text-sm font-semibold transition-colors ${
                        settings.defaultDesktopGrid === value
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SectionPanel>

          <SectionPanel
            title="Theme appearance"
            description="Shared visual tokens applied by the theme provider."
            icon={Palette}
          >
            <div className="grid gap-4 md:grid-cols-2">
              {themeColorOptions.map((option) => (
                <ThemeColorControl
                  key={option.key}
                  option={option}
                  value={settings[option.key]}
                  onChange={updateColorField(option.key)}
                  error={validationErrors[option.key]}
                />
              ))}
            </div>

            <div className="mt-5 border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <label
                    htmlFor="theme-radius"
                    className="block text-sm font-semibold text-neutral-700"
                  >
                    Border radius
                  </label>
                  <p className="mt-1 text-xs text-neutral-500">
                    Keep this low for the current sharp Farsha admin style.
                  </p>
                </div>
                <div className="flex items-center gap-3 md:min-w-80">
                  <input
                    id="theme-radius"
                    type="range"
                    min="0"
                    max="32"
                    step="1"
                    value={settings.borderRadius}
                    onChange={updateBorderRadius}
                    className="h-1 flex-1 appearance-none bg-neutral-200 accent-neutral-900"
                  />
                  <input
                    type="number"
                    min="0"
                    max="32"
                    value={settings.borderRadius}
                    onChange={updateBorderRadius}
                    className="w-20 border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                  <span className="text-sm font-semibold text-neutral-600">px</span>
                </div>
              </div>
              <FieldError>{validationErrors.borderRadius}</FieldError>
            </div>
          </SectionPanel>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <CatalogCardPreview settings={settings} product={previewProduct} />

          <section className="border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              What is wired now
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-neutral-600">
	              <li>Catalog card density, visible fields, and grid defaults are live.</li>
	              <li>Theme colors and radius are live through the theme provider.</li>
	              <li>Contact/status values are saved and used by admin readiness surfaces.</li>
	              <li>Logo and favicon URLs are saved and selectable from the media library.</li>
	            </ul>
	          </section>
	        </aside>
	      </div>
      <MediaLibraryPicker
        open={pickerTarget !== null}
        title="Choose settings image"
        onClose={() => setPickerTarget(null)}
        onSelect={selectLibraryImage}
      />
	    </div>
	  );
	}
