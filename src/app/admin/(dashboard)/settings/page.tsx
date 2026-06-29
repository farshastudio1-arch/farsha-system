'use client';

import { ChangeEvent, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Download,
  Eye,
  Image as ImageIcon,
  Link as LinkIcon,
  Palette,
  RefreshCcw,
  Save,
  Settings as SettingsIcon,
  SlidersHorizontal,
  Store,
  Upload,
} from 'lucide-react';

import { KebayaItem, mockKebayas, mockSiteSettings, SiteSettings } from '@/data/mockData';
import {
  applyCatalogCardMode,
  normalizeSiteSettings,
  useSavedSiteSettings,
  writeSavedSiteSettings,
} from '@/lib/site-settings';

type SettingsTab = 'profile' | 'contact' | 'catalog' | 'display' | 'system';

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
  | 'showPromoBanner'
>;

type ColorField = Extract<keyof SiteSettings, 'brandColor' | 'accentColor'>;
type ThemeColorField = Extract<
  keyof SiteSettings,
  'backgroundColor' | 'textColor' | 'primaryColor' | 'accentColor' | 'surfaceColor' | 'borderColor'
>;

const tabs: Array<{
  id: SettingsTab;
  label: string;
  icon: typeof Store;
}> = [
  { id: 'profile', label: 'Profile', icon: Store },
  { id: 'contact', label: 'Contact', icon: LinkIcon },
  { id: 'catalog', label: 'Catalog', icon: SlidersHorizontal },
  { id: 'display', label: 'Display', icon: Palette },
  { id: 'system', label: 'System', icon: SettingsIcon },
];

const statusOptions: Array<{
  value: SiteSettings['status'];
  label: string;
  description: string;
}> = [
  {
    value: 'active',
    label: 'Active',
    description: 'Public catalog stays available.',
  },
  {
    value: 'maintenance',
    label: 'Maintenance',
    description: 'Use when catalog work is in progress.',
  },
  {
    value: 'coming-soon',
    label: 'Coming Soon',
    description: 'Use before public launch.',
  },
];

const productStatusOptions: Array<{
  value: SiteSettings['defaultProductStatus'];
  label: string;
}> = [
  { value: 'available', label: 'Available' },
  { value: 'rented', label: 'Rented' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'archived', label: 'Archived' },
];

const sortOptions: Array<{
  value: SiteSettings['defaultSort'];
  label: string;
}> = [
  { value: 'newest', label: 'Newest first' },
  { value: 'featured', label: 'Featured first' },
  { value: 'price-low', label: 'Price low to high' },
  { value: 'price-high', label: 'Price high to low' },
];

const catalogCardModeOptions: Array<{
  value: SiteSettings['catalogCardMode'];
  label: string;
  description: string;
}> = [
  {
    value: 'minimal',
    label: 'Minimal',
    description: 'Image, name, and availability.',
  },
  {
    value: 'standard',
    label: 'Standard',
    description: 'Best browsing balance for customers.',
  },
  {
    value: 'detailed',
    label: 'Detailed',
    description: 'Adds code, specs, description, and CTA.',
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
    description: 'Show whether an item is available, rented, maintenance, or archived.',
  },
  {
    key: 'showPrices',
    title: 'Rental price',
    description: 'Show the rental price on catalog cards.',
  },
  {
    key: 'showProductModel',
    title: 'Model',
    description: 'Show the kebaya model such as Modern, Klasik, Kartini, or Kutubaru.',
  },
  {
    key: 'showProductSize',
    title: 'Size',
    description: 'Show the item size directly on the card.',
  },
  {
    key: 'showProductCode',
    title: 'Product code',
    description: 'Show the unique inventory code on the image.',
  },
  {
    key: 'showProductColor',
    title: 'Color',
    description: 'Show the main color as a product spec chip.',
  },
  {
    key: 'showProductDescription',
    title: 'Short description',
    description: 'Show a compact description on larger cards.',
  },
  {
    key: 'showCardCta',
    title: 'Detail CTA',
    description: 'Show a card-level detail button.',
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
    description: 'Page background.',
  },
  {
    key: 'textColor',
    label: 'Text',
    description: 'Primary text and icon color.',
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
    key: 'surfaceColor',
    label: 'Surface',
    description: 'Cards, forms, and panels.',
  },
  {
    key: 'borderColor',
    label: 'Border',
    description: 'Default divider and outline color.',
  },
];

function isValidHexColor(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value.trim());
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
  } else if (settings.whatsappNumber.replace(/\D/g, '').length < 9) {
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

    try {
      const url = new URL(rawValue);

      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        errors[field.key] = `${field.label} must start with http or https.`;
      }
    } catch {
      errors[field.key] = `${field.label} must be a valid URL.`;
    }
  }

  for (const option of themeColorOptions) {
    if (!isValidHexColor(settings[option.key])) {
      errors[option.key] = 'Use a 6-digit hex color, for example #FFDE00.';
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

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not saved yet';
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function FieldError({ children }: { children?: string }) {
  if (!children) {
    return null;
  }

  return <p className="mt-1 text-xs font-medium text-red-600">{children}</p>;
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
      <label className="mb-1 block text-sm font-medium text-neutral-700">{option.label}</label>
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
          className="w-full bg-transparent font-mono text-sm uppercase outline-none"
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

function SectionPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className=" border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
      </div>
      {children}
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
    <div className="flex items-center justify-between gap-4 border border-neutral-200 p-4">
      <div>
        <p className="text-sm font-medium text-neutral-900">{title}</p>
        <p className="mt-1 text-xs text-neutral-500">{description}</p>
      </div>
      <button
        type="button"
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 transition-colors ${
          checked ? 'bg-neutral-900' : 'bg-neutral-200'
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
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
      return { text: 'Tersedia', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    case 'rented':
      return { text: 'Disewa', className: 'bg-amber-50 text-amber-800 border-amber-200' };
    case 'maintenance':
      return { text: 'Perbaikan', className: 'bg-rose-50 text-rose-800 border-rose-200' };
    default:
      return { text: 'Arsip', className: 'bg-slate-100 text-slate-700 border-slate-300' };
  }
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
    <div className=" border border-neutral-200 p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
          Catalog Card Preview
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
              <span className=" bg-black/80 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-xs">
                {product.code}
              </span>
            )}
            {settings.showAvailabilityBadges && (
              <span
                className={` border px-2 py-0.5 text-[10px] font-semibold tracking-wide shadow-xs backdrop-blur-xs ${statusInfo.className}`}
              >
                {statusInfo.text}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col p-4">
          {settings.showProductModel && (
            <span className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Koleksi {product.model}
            </span>
          )}
          <h3 className="font-serif text-base font-medium leading-tight text-neutral-950">
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
                    <span className=" bg-neutral-100 px-2 py-0.5 font-mono text-[10px] font-medium text-neutral-600">
                      Ukuran {product.size}
                    </span>
                  )}
                  {settings.showProductColor && (
                    <span className=" bg-neutral-100 px-2 py-0.5 font-mono text-[10px] font-medium text-neutral-600">
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
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const savedSettings = useSavedSiteSettings();
  const [settingsDraft, setSettingsDraft] = useState<SiteSettings | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const settings = settingsDraft ?? savedSettings;
  const previewProduct = mockKebayas[0];

  const validationErrors = useMemo(() => getValidationErrors(settings), [settings]);
  const hasErrors = Object.keys(validationErrors).length > 0;
  const hasChanges = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [settings, savedSettings],
  );

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
    (key: ColorField | ThemeColorField) => (event: ChangeEvent<HTMLInputElement>) => {
      updateField(key, event.target.value);
    };

  const updateBorderRadius = (event: ChangeEvent<HTMLInputElement>) => {
    updateField('borderRadius', Number(event.target.value));
  };

  const saveSettings = () => {
    if (hasErrors) {
      setSaveState('error');
      return;
    }

    const nextSettings: SiteSettings = {
      ...settings,
      brandColor: settings.textColor,
      updatedAt: new Date().toISOString(),
    };

    writeSavedSiteSettings(nextSettings);
    setSettingsDraft(null);
    setSaveState('saved');
  };

  const discardChanges = () => {
    setSettingsDraft(null);
    setImportError('');
    setSaveState('idle');
  };

  const resetToDefaults = () => {
    const nextSettings: SiteSettings = {
      ...mockSiteSettings,
      updatedAt: new Date().toISOString(),
    };

    writeSavedSiteSettings(nextSettings);
    setSettingsDraft(null);
    setImportError('');
    setSaveState('saved');
  };

  const exportSettings = () => {
    const payload = JSON.stringify(settings, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'farsha-studio-settings.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const importSettings = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<SiteSettings>;
      const nextSettings = normalizeSiteSettings(parsed);
      const nextErrors = getValidationErrors(nextSettings);

      if (Object.keys(nextErrors).length > 0) {
        setImportError('Imported file has invalid settings values.');
        return;
      }

      setSettingsDraft(nextSettings);
      setImportError('');
      setSaveState('idle');
    } catch {
      setImportError('Choose a valid Farsha Studio settings JSON file.');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>
          <p className="mt-1 text-neutral-500">
            Manage global studio preferences and admin defaults.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {saveState === 'saved' && (
            <span className="inline-flex items-center gap-1.5 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
              <Check className="h-4 w-4" />
              Saved locally
            </span>
          )}
          {saveState === 'error' && (
            <span className="inline-flex items-center gap-1.5 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              <AlertTriangle className="h-4 w-4" />
              Review fields
            </span>
          )}
          {hasChanges && (
            <button
              type="button"
              onClick={discardChanges}
              className=" border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              Discard
            </button>
          )}
          <button
            type="button"
            onClick={saveSettings}
            disabled={!hasChanges || hasErrors}
            className="flex items-center gap-2 bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="flex gap-2 overflow-x-auto border border-neutral-200 bg-white p-2 shadow-sm xl:flex-col xl:self-start">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-w-max items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 space-y-6">
          {activeTab === 'profile' && (
            <>
              <SectionPanel
                title="Store Profile"
                description="These values identify the studio across admin and public surfaces."
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-700">
                      Studio Name
                    </label>
                    <input
                      type="text"
                      value={settings.studioName}
                      onChange={updateTextField('studioName')}
                      className="w-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                    <FieldError>{validationErrors.studioName}</FieldError>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-700">
                      Public Location Label
                    </label>
                    <input
                      type="text"
                      value={settings.locationLabel}
                      onChange={updateTextField('locationLabel')}
                      className="w-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-neutral-700">
                      Tagline
                    </label>
                    <textarea
                      rows={3}
                      value={settings.tagline}
                      onChange={updateTextField('tagline')}
                      className="w-full resize-none border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>
                </div>
              </SectionPanel>

              <SectionPanel title="Store Status">
                <div className="grid gap-3 md:grid-cols-3">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField('status', option.value)}
                      className={` border p-4 text-left transition-colors ${
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
            </>
          )}

          {activeTab === 'contact' && (
            <SectionPanel
              title="Contact & Social"
              description="Use one source for customer contact links and footer information."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    value={settings.whatsappNumber}
                    onChange={updateTextField('whatsappNumber')}
                    className="w-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                  <FieldError>{validationErrors.whatsappNumber}</FieldError>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">Email</label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={updateTextField('email')}
                    className="w-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                  <FieldError>{validationErrors.email}</FieldError>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-neutral-700">Address</label>
                  <textarea
                    rows={3}
                    value={settings.address}
                    onChange={updateTextField('address')}
                    className="w-full resize-none border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    Instagram URL
                  </label>
                  <input
                    type="url"
                    value={settings.instagramUrl}
                    onChange={updateTextField('instagramUrl')}
                    className="w-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                  <FieldError>{validationErrors.instagramUrl}</FieldError>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    TikTok URL
                  </label>
                  <input
                    type="url"
                    value={settings.tiktokUrl}
                    onChange={updateTextField('tiktokUrl')}
                    className="w-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                  <FieldError>{validationErrors.tiktokUrl}</FieldError>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    Google Maps URL
                  </label>
                  <input
                    type="url"
                    value={settings.mapsUrl}
                    onChange={updateTextField('mapsUrl')}
                    className="w-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                  <FieldError>{validationErrors.mapsUrl}</FieldError>
                </div>
              </div>
            </SectionPanel>
          )}

          {activeTab === 'catalog' && (
            <>
              <SectionPanel
                title="Catalog Defaults"
                description="Defaults used when creating or presenting collection items."
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-700">
                      Currency
                    </label>
                    <select
                      value={settings.currency}
                      onChange={() => updateField('currency', 'IDR')}
                      className="w-full border border-neutral-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
                    >
                      <option value="IDR">IDR - Indonesian Rupiah</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-700">
                      Default Product Status
                    </label>
                    <select
                      value={settings.defaultProductStatus}
                      onChange={(event) =>
                        updateField(
                          'defaultProductStatus',
                          event.target.value as SiteSettings['defaultProductStatus'],
                        )
                      }
                      className="w-full border border-neutral-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
                    >
                      {productStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-700">
                      Default Sort
                    </label>
                    <select
                      value={settings.defaultSort}
                      onChange={(event) =>
                        updateField(
                          'defaultSort',
                          event.target.value as SiteSettings['defaultSort'],
                        )
                      }
                      className="w-full border border-neutral-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
                    >
                      {sortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </SectionPanel>

              <SectionPanel
                title="Product Card Display"
                description="Choose how much information customers see before opening an item."
              >
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
                  <div>
                    <div className="mb-5 grid gap-3 md:grid-cols-3">
                      {catalogCardModeOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateCatalogCardMode(option.value)}
                          className={` border p-4 text-left transition-colors ${
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

                    <div className="grid gap-3 md:grid-cols-2">
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
                  </div>

                  <CatalogCardPreview settings={settings} product={previewProduct} />
                </div>
              </SectionPanel>
            </>
          )}

          {activeTab === 'display' && (
            <>
              <SectionPanel
                title="Theme Appearance"
                description="Global design tokens used by public, admin, and POS surfaces."
              >
                <div className="space-y-6">
                  <div className="grid gap-5 md:grid-cols-2">
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

                  <div className="border border-neutral-200 bg-neutral-50 p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <label
                          htmlFor="theme-radius"
                          className="block text-sm font-medium text-neutral-700"
                        >
                          Border Radius
                        </label>
                        <p className="mt-1 text-xs text-neutral-500">
                          Set to 0 for strict sharp edges across the app.
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
                        <span className="text-sm font-medium text-neutral-600">px</span>
                      </div>
                    </div>
                    <FieldError>{validationErrors.borderRadius}</FieldError>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-700">
                      Logo URL
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-neutral-200 bg-neutral-50">
                        <ImageIcon className="h-5 w-5 text-neutral-400" />
                      </div>
                      <input
                        type="url"
                        value={settings.logoUrl}
                        onChange={updateTextField('logoUrl')}
                        placeholder="https://..."
                        className="w-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      />
                    </div>
                    <FieldError>{validationErrors.logoUrl}</FieldError>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-700">
                      Favicon URL
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-neutral-200 bg-neutral-50">
                        <ImageIcon className="h-5 w-5 text-neutral-400" />
                      </div>
                      <input
                        type="url"
                        value={settings.faviconUrl}
                        onChange={updateTextField('faviconUrl')}
                        placeholder="https://..."
                        className="w-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      />
                    </div>
                    <FieldError>{validationErrors.faviconUrl}</FieldError>
                  </div>
                </div>
              </SectionPanel>

              <SectionPanel title="Public Catalog Layout">
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-neutral-700">
                      Mobile Grid
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            updateField(
                              'defaultMobileGrid',
                              value as SiteSettings['defaultMobileGrid'],
                            )
                          }
                          className={` border px-3 py-2 text-sm font-medium transition-colors ${
                            settings.defaultMobileGrid === value
                              ? 'border-neutral-900 bg-neutral-900 text-white'
                              : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                          }`}
                        >
                          {value} Column{value > 1 ? 's' : ''}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-neutral-700">
                      Desktop Grid
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
                          className={` border px-3 py-2 text-sm font-medium transition-colors ${
                            settings.defaultDesktopGrid === value
                              ? 'border-neutral-900 bg-neutral-900 text-white'
                              : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                          }`}
                        >
                          {value} Columns
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <ToggleRow
                      title="Show promotion banner"
                      description="Control the public promo strip globally."
                      checked={settings.showPromoBanner}
                      onChange={(checked) => updateBooleanField('showPromoBanner', checked)}
                    />
                  </div>
                </div>
              </SectionPanel>
            </>
          )}

          {activeTab === 'system' && (
            <>
              <SectionPanel
                title="Data Utilities"
                description="These actions affect the local settings copy used by this admin page."
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <button
                    type="button"
                    onClick={exportSettings}
                    className="flex items-center justify-center gap-2 border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                  >
                    <Download className="h-4 w-4" />
                    Export JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                  >
                    <Upload className="h-4 w-4" />
                    Import JSON
                  </button>
                  <button
                    type="button"
                    onClick={resetToDefaults}
                    className="flex items-center justify-center gap-2 border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Reset Defaults
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={(event) => void importSettings(event)}
                  className="hidden"
                />
                {importError && (
                  <p className="mt-3 text-sm font-medium text-red-600">{importError}</p>
                )}
              </SectionPanel>

              <SectionPanel title="System Snapshot">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className=" border border-neutral-200 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Save Mode
                    </p>
                    <p className="mt-1 text-sm font-semibold text-neutral-900">
                      Browser local storage
                    </p>
                  </div>
                  <div className=" border border-neutral-200 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Last Updated
                    </p>
                    <p className="mt-1 text-sm font-semibold text-neutral-900">
                      {formatDateTime(settings.updatedAt)}
                    </p>
                  </div>
                  <div className=" border border-neutral-200 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Settings Version
                    </p>
                    <p className="mt-1 text-sm font-semibold text-neutral-900">V1</p>
                  </div>
                  <div className=" border border-neutral-200 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Public Status
                    </p>
                    <p className="mt-1 text-sm font-semibold capitalize text-neutral-900">
                      {settings.status.replace('-', ' ')}
                    </p>
                  </div>
                </div>
              </SectionPanel>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
