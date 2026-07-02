'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Image as ImageIcon, Save } from 'lucide-react';

import { CMSContent, mockCMS } from '@/data/mockData';
import { fetchCmsContentAction, saveCmsContentAction } from '@/lib/farsha-actions';
import { maxLandingCategoryImages } from '@/lib/cms-normalization';

type CmsField = Exclude<keyof CMSContent, 'landingCategories'>;
type LandingCategoryField = keyof CMSContent['landingCategories'][number];

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

function isValidRequiredUrl(value: string) {
  return Boolean(value.trim()) && isValidOptionalUrl(value);
}

function getValidationErrors(content: CMSContent) {
  const errors: Partial<Record<CmsField, string>> & {
    landingCategories?: Array<Partial<Record<LandingCategoryField, string>>>;
  } = {};

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

  const categoryErrors = content.landingCategories.map((category) => {
    const itemErrors: Partial<Record<LandingCategoryField, string>> = {};

    if (!category.title.trim()) {
      itemErrors.title = 'Title is required.';
    }

    if (!category.descriptor.trim()) {
      itemErrors.descriptor = 'Description is required.';
    }

    if (!category.action.trim()) {
      itemErrors.action = 'Action text is required.';
    }

    if (!category.availabilityCue.trim()) {
      itemErrors.availabilityCue = 'Badge text is required.';
    }

    const filledImageUrls = category.imageUrls.map((url) => url.trim()).filter(Boolean);

    if (filledImageUrls.length === 0) {
      itemErrors.imageUrls = 'At least one image URL is required.';
    } else if (filledImageUrls.some((url) => !isValidRequiredUrl(url))) {
      itemErrors.imageUrls = 'Use valid image URLs that start with http or https.';
    }

    return itemErrors;
  });

  if (categoryErrors.some((item) => Object.keys(item).length > 0)) {
    errors.landingCategories = categoryErrors;
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

  const updateLandingCategoryField =
    (
      index: number,
      field: keyof CMSContent['landingCategories'][number],
    ) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setSaveState('idle');
      setSaveError('');
      setDraftContent((current) => ({
        ...current,
        landingCategories: current.landingCategories.map((category, categoryIndex) =>
          categoryIndex === index
            ? {
                ...category,
                [field]: event.target.value,
              }
            : category,
        ),
      }));
    };

  const updateLandingCategoryImageUrl =
    (index: number, imageIndex: number) => (event: ChangeEvent<HTMLInputElement>) => {
      setSaveState('idle');
      setSaveError('');
      setDraftContent((current) => ({
        ...current,
        landingCategories: current.landingCategories.map((category, categoryIndex) => {
          if (categoryIndex !== index) {
            return category;
          }

          const imageUrls = Array.from(
            { length: maxLandingCategoryImages },
            (_, slotIndex) => category.imageUrls[slotIndex] ?? '',
          );
          imageUrls[imageIndex] = event.target.value;
          const coverImageUrl = imageUrls.find((url) => url.trim()) ?? category.imageUrl;

          return {
            ...category,
            imageUrl: coverImageUrl,
            imageUrls,
          };
        }),
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
            title="Landing category cards"
            description="These four cards appear on the homepage and open filtered catalog views."
          >
            <div className="grid gap-4">
              {draftContent.landingCategories.map((category, index) => {
                const categoryErrors = validationErrors.landingCategories?.[index] ?? {};

                return (
                  <div
                    key={category.slug}
                    className="grid gap-4 border border-neutral-200 bg-neutral-50 p-4"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                          {category.slug}
                        </p>
                        <h3 className="mt-1 text-sm font-semibold text-neutral-950">
                          {category.title || 'Untitled category'}
                        </h3>
                      </div>
                      <select
                        value={category.availabilityTone}
                        onChange={updateLandingCategoryField(index, 'availabilityTone')}
                        className="border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      >
                        <option value="ready">Ready badge</option>
                        <option value="soon">Soon badge</option>
                      </select>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[80px_minmax(0,1fr)]">
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-neutral-700">
                          Emoji
                        </label>
                        <input
                          type="text"
                          value={category.emoji}
                          onChange={updateLandingCategoryField(index, 'emoji')}
                          className={`${inputCls} text-center`}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-neutral-700">
                          Title
                        </label>
                        <input
                          type="text"
                          value={category.title}
                          onChange={updateLandingCategoryField(index, 'title')}
                          className={inputCls}
                        />
                        <FieldError>{categoryErrors.title}</FieldError>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-neutral-700">
                        Description
                      </label>
                      <textarea
                        rows={2}
                        value={category.descriptor}
                        onChange={updateLandingCategoryField(index, 'descriptor')}
                        className={`${inputCls} resize-none`}
                      />
                      <FieldError>{categoryErrors.descriptor}</FieldError>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-neutral-700">
                          Action text
                        </label>
                        <input
                          type="text"
                          value={category.action}
                          onChange={updateLandingCategoryField(index, 'action')}
                          className={inputCls}
                        />
                        <FieldError>{categoryErrors.action}</FieldError>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-neutral-700">
                          Badge text
                        </label>
                        <input
                          type="text"
                          value={category.availabilityCue}
                          onChange={updateLandingCategoryField(index, 'availabilityCue')}
                          className={inputCls}
                        />
                        <FieldError>{categoryErrors.availabilityCue}</FieldError>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-end justify-between gap-3">
                        <label className="block text-sm font-semibold text-neutral-700">
                          Photo URLs
                        </label>
                        <span className="text-xs font-medium text-neutral-400">
                          Maximum {maxLandingCategoryImages}
                        </span>
                      </div>
                      <div className="grid gap-2">
                        {Array.from({ length: maxLandingCategoryImages }).map((_, imageIndex) => (
                          <input
                            key={`${category.slug}-image-${imageIndex}`}
                            type="url"
                            value={category.imageUrls[imageIndex] ?? ''}
                            onChange={updateLandingCategoryImageUrl(index, imageIndex)}
                            placeholder={`Photo URL ${imageIndex + 1}`}
                            className={inputCls}
                          />
                        ))}
                      </div>
                      <FieldError>{categoryErrors.imageUrls}</FieldError>
                    </div>
                  </div>
                );
              })}
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

          <section className="border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Landing cards
            </p>
            <div className="mt-4 space-y-3">
              {draftContent.landingCategories.map((category) => (
                <div key={category.slug} className="border border-neutral-200 bg-neutral-50 p-3">
                  <div className="flex items-start gap-3">
                    <div className="h-16 w-14 shrink-0 overflow-hidden bg-neutral-100">
                      {isValidRequiredUrl(category.imageUrls[0] ?? category.imageUrl) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={category.imageUrls[0] ?? category.imageUrl}
                          alt={category.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-neutral-300">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span aria-hidden="true">{category.emoji}</span>
                        <span
                          className={`border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            category.availabilityTone === 'ready'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-amber-200 bg-amber-50 text-amber-700'
                          }`}
                        >
                          {category.availabilityCue}
                        </span>
                      </div>
                      <h3 className="mt-1 truncate text-sm font-semibold text-neutral-950">
                        {category.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-neutral-500">
                        {category.descriptor}
                      </p>
                      <div className="mt-2 flex items-center gap-1">
                        {category.imageUrls
                          .map((url) => url.trim())
                          .filter(Boolean)
                          .slice(0, maxLandingCategoryImages)
                          .map((url, imageIndex) => (
                            <span
                              key={`${category.slug}-preview-dot-${url}-${imageIndex}`}
                              className="h-1.5 w-1.5 bg-neutral-400"
                            />
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </form>
  );
}
