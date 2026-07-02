'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Image as ImageIcon, Save } from 'lucide-react';

import { CMSContent, mockCMS } from '@/data/mockData';
import { fetchCmsContentAction, saveCmsContentAction } from '@/lib/farsha-actions';

type CmsField = keyof CMSContent;

const inputCls =
  'w-full border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900';

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

function getValidationErrors(content: CMSContent) {
  const errors: Partial<Record<CmsField, string>> = {};

  if (!content.heroTitle.trim()) {
    errors.heroTitle = 'Hero title is required.';
  }

  if (!content.heroSubtitle.trim()) {
    errors.heroSubtitle = 'Hero subtitle is required.';
  }

  if (!isValidOptionalUrl(content.heroImageUrl)) {
    errors.heroImageUrl = 'Use a valid image URL that starts with http or https.';
  }

  if (!content.aboutTitle.trim()) {
    errors.aboutTitle = 'About title is required.';
  }

  if (!content.aboutText.trim()) {
    errors.aboutText = 'About copy is required.';
  }

  if (!content.studioAddress.trim()) {
    errors.studioAddress = 'Studio address is required.';
  }

  if (!content.studioPhone.trim()) {
    errors.studioPhone = 'Studio phone is required.';
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
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-neutral-950">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-neutral-500">{description}</p>
      </div>
      <div className="space-y-4 p-4 sm:p-5">{children}</div>
    </section>
  );
}

export default function CMSManagement() {
  const [savedContent, setSavedContent] = useState<CMSContent>(mockCMS);
  const [draftContent, setDraftContent] = useState<CMSContent>(mockCMS);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    let active = true;

    async function loadContent() {
      setIsLoading(true);
      const result = await fetchCmsContentAction();

      if (!active) {
        return;
      }

      if (result.ok) {
        setSavedContent(result.data);
        setDraftContent(result.data);
        setLoadError('');
      } else {
        setLoadError(result.error);
      }

      setIsLoading(false);
    }

    loadContent();

    return () => {
      active = false;
    };
  }, []);

  const validationErrors = useMemo(() => getValidationErrors(draftContent), [draftContent]);
  const hasErrors = Object.keys(validationErrors).length > 0;
  const hasChanges = JSON.stringify(draftContent) !== JSON.stringify(savedContent);

  const updateField =
    (field: CmsField) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setSaveState('idle');
      setSaveError('');
      setDraftContent((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const discardChanges = () => {
    setDraftContent(savedContent);
    setSaveError('');
    setSaveState('idle');
  };

  const saveContent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (hasErrors || isSaving) {
      setSaveState('error');
      return;
    }

    setIsSaving(true);
    setSaveError('');
    const result = await saveCmsContentAction(draftContent);

    if (result.ok) {
      setSavedContent(result.data);
      setDraftContent(result.data);
      setSaveState('saved');
    } else {
      setSaveError(result.error);
      setSaveState('error');
    }

    setIsSaving(false);
  };

  return (
    <form
      onSubmit={saveContent}
      className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Content management
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
            Public website copy
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500 sm:text-base">
            Edit homepage copy, public contact references, and the hero image used by customer
            pages.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {saveState === 'saved' && (
            <span className="inline-flex items-center justify-center gap-1.5 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              <Check className="h-4 w-4" />
              Saved to database
            </span>
          )}
          {(saveState === 'error' || loadError) && (
            <span className="inline-flex items-center justify-center gap-1.5 border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              <AlertTriangle className="h-4 w-4" />
              {saveError || loadError || 'Review fields'}
            </span>
          )}
          {hasChanges && (
            <button
              type="button"
              onClick={discardChanges}
              disabled={isSaving}
              className="border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Discard
            </button>
          )}
          <button
            type="submit"
            disabled={!hasChanges || hasErrors || isSaving}
            className="inline-flex items-center justify-center gap-2 bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving to database...' : 'Save changes'}
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-600">
          Loading CMS content from database...
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <SectionPanel
            title="Homepage hero"
            description="This controls the first message and image customers see on the landing page."
          >
            <div>
              <label className="mb-1 block text-sm font-semibold text-neutral-700">
                Hero title
              </label>
              <input
                type="text"
                value={draftContent.heroTitle}
                onChange={updateField('heroTitle')}
                className={inputCls}
              />
              <FieldError>{validationErrors.heroTitle}</FieldError>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-neutral-700">
                Hero subtitle
              </label>
              <textarea
                rows={3}
                value={draftContent.heroSubtitle}
                onChange={updateField('heroSubtitle')}
                className={`${inputCls} resize-none`}
              />
              <FieldError>{validationErrors.heroSubtitle}</FieldError>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-neutral-700">
                Hero image URL
              </label>
              <input
                type="url"
                value={draftContent.heroImageUrl}
                onChange={updateField('heroImageUrl')}
                className={inputCls}
              />
              <FieldError>{validationErrors.heroImageUrl}</FieldError>
            </div>
          </SectionPanel>

          <SectionPanel
            title="Promotion and about copy"
            description="These fields feed the homepage reminder strip and final catalog section."
          >
            <div>
              <label className="mb-1 block text-sm font-semibold text-neutral-700">
                Promo text
              </label>
              <input
                type="text"
                value={draftContent.promoText}
                onChange={updateField('promoText')}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-neutral-700">
                About title
              </label>
              <input
                type="text"
                value={draftContent.aboutTitle}
                onChange={updateField('aboutTitle')}
                className={inputCls}
              />
              <FieldError>{validationErrors.aboutTitle}</FieldError>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-neutral-700">
                About copy
              </label>
              <textarea
                rows={5}
                value={draftContent.aboutText}
                onChange={updateField('aboutText')}
                className={`${inputCls} resize-none`}
              />
              <FieldError>{validationErrors.aboutText}</FieldError>
            </div>
          </SectionPanel>

          <SectionPanel
            title="Public contact references"
            description="These values appear in the footer, legal pages, and product inquiry links."
          >
            <div>
              <label className="mb-1 block text-sm font-semibold text-neutral-700">
                Studio address
              </label>
              <textarea
                rows={3}
                value={draftContent.studioAddress}
                onChange={updateField('studioAddress')}
                className={`${inputCls} resize-none`}
              />
              <FieldError>{validationErrors.studioAddress}</FieldError>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-neutral-700">
                Studio phone
              </label>
              <input
                type="tel"
                value={draftContent.studioPhone}
                onChange={updateField('studioPhone')}
                className={inputCls}
              />
              <FieldError>{validationErrors.studioPhone}</FieldError>
            </div>
          </SectionPanel>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <section className="border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Hero image preview
            </p>
            <div className="mt-4 aspect-[4/5] overflow-hidden border border-neutral-200 bg-neutral-100">
              {draftContent.heroImageUrl && isValidOptionalUrl(draftContent.heroImageUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draftContent.heroImageUrl}
                  alt={draftContent.heroTitle}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-neutral-300">
                  <ImageIcon className="h-8 w-8" />
                  <span className="text-xs font-semibold">No valid image URL</span>
                </div>
              )}
            </div>
          </section>

          <section className="border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Contact preview
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <span className="block text-xs font-semibold uppercase tracking-widest text-neutral-400">
                  Address
                </span>
                <p className="mt-1 leading-relaxed text-neutral-700">
                  {draftContent.studioAddress}
                </p>
              </div>
              <div>
                <span className="block text-xs font-semibold uppercase tracking-widest text-neutral-400">
                  Phone
                </span>
                <p className="mt-1 font-semibold text-neutral-900">{draftContent.studioPhone}</p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </form>
  );
}
