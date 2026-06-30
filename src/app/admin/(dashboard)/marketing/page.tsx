'use client';

import { FormEvent, useMemo, useState } from 'react';
import {
  CalendarDays,
  Copy,
  Edit,
  Megaphone,
  NotebookPen,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  WandSparkles,
  X,
} from 'lucide-react';

import {
  MarketingCampaign,
  MarketingCampaignStatus,
  MarketingNote,
  useSavedMarketingCampaigns,
  useSavedMarketingNotes,
  writeSavedMarketingCampaigns,
  writeSavedMarketingNotes,
} from '@/lib/marketing-storage';

type GeneratorForm = {
  occasion: string;
  audience: string;
  goal: string;
  channel: string;
  style: string;
};

type GeneratedIdea = {
  hook: string;
  concept: string;
  shotList: string[];
  caption: string;
  cta: string;
};

type NoteForm = {
  title: string;
  category: string;
  body: string;
};

type CampaignForm = {
  name: string;
  objective: string;
  channel: string;
  status: MarketingCampaignStatus;
  startDate: string;
  endDate: string;
  budget: string;
  notes: string;
};

const generatorDefaults: GeneratorForm = {
  occasion: 'Wisuda',
  audience: 'Students preparing graduation outfits',
  goal: 'Increase WhatsApp fitting inquiries',
  channel: 'TikTok',
  style: 'Educational',
};

const emptyNoteForm: NoteForm = {
  title: '',
  category: 'Idea dump',
  body: '',
};

const emptyCampaignForm: CampaignForm = {
  name: '',
  objective: '',
  channel: 'Instagram + TikTok',
  status: 'idea',
  startDate: '',
  endDate: '',
  budget: '',
  notes: '',
};

const occasionOptions = ['Wisuda', 'Lamaran', 'Kondangan', 'Bridesmaid', 'Custom fitting'];
const channelOptions = ['Instagram Reels', 'TikTok', 'Instagram + TikTok'];
const styleOptions = ['Educational', 'Behind the scenes', 'Transformation', 'FAQ', 'Trend remix'];
const campaignStatusOptions: Array<{ value: MarketingCampaignStatus; label: string }> = [
  { value: 'idea', label: 'Idea' },
  { value: 'planned', label: 'Planned' },
  { value: 'active', label: 'Active' },
  { value: 'done', label: 'Done' },
];

const hookTemplates = [
  'Before you rent a kebaya for {occasion}, check these 3 details first.',
  'Most people forget this when choosing a {occasion} look.',
  'Here is how we pick a kebaya rental for {audience}.',
  'Do not book your {occasion} outfit before asking this question.',
  'A quick fitting checklist for {audience}.',
];

const conceptTemplates = [
  'Start with the customer problem, show 2-3 product details, then end with a simple booking prompt.',
  'Film a fast comparison between two kebaya looks and explain which customer each one fits best.',
  'Use a fitting-room style video: hook, close-up fabric shot, full outfit reveal, then WhatsApp CTA.',
  'Answer one common customer question with a product example from the catalog.',
  'Show the rental journey from browsing, choosing, fitting, to pickup preparation.',
];

const shotListTemplates = [
  ['Close-up fabric detail', 'Full-body outfit reveal', 'Size/detail explanation', 'WhatsApp booking screen'],
  ['Before fitting rack shot', 'Owner selects 2 options', 'Mirror try-on moment', 'CTA text overlay'],
  ['Problem text overlay', 'Product comparison', 'Detail zoom', 'Customer action prompt'],
  ['Catalog scroll shot', 'Chosen kebaya detail', 'Occasion styling tip', 'Booking reminder'],
];

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}`;
}

function formatDate(value: string) {
  if (!value) {
    return 'No date';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatBudget(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

function statusClass(status: MarketingCampaignStatus) {
  const classes: Record<MarketingCampaignStatus, string> = {
    idea: 'border-neutral-200 bg-neutral-100 text-neutral-700',
    planned: 'border-sky-200 bg-sky-50 text-sky-700',
    active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    done: 'border-amber-200 bg-amber-50 text-amber-700',
  };

  return classes[status];
}

function replaceTokens(template: string, form: GeneratorForm) {
  return template
    .replaceAll('{occasion}', form.occasion.toLowerCase())
    .replaceAll('{audience}', form.audience.toLowerCase())
    .replaceAll('{goal}', form.goal.toLowerCase());
}

function generateIdea(form: GeneratorForm, variant: number): GeneratedIdea {
  const hook = replaceTokens(hookTemplates[variant % hookTemplates.length], form);
  const concept = conceptTemplates[(variant + form.occasion.length) % conceptTemplates.length];
  const shotList = shotListTemplates[(variant + form.style.length) % shotListTemplates.length];

  return {
    hook,
    concept: `${concept} Keep the tone ${form.style.toLowerCase()} and optimize for ${form.channel}.`,
    shotList,
    caption: `${form.occasion} rental idea for ${form.audience}. Save this before choosing your kebaya. DM or WhatsApp Farsha Studio for fitting availability.`,
    cta: `Ask admin for ${form.occasion.toLowerCase()} availability`,
  };
}

function noteToForm(note: MarketingNote): NoteForm {
  return {
    title: note.title,
    category: note.category,
    body: note.body,
  };
}

function campaignToForm(campaign: MarketingCampaign): CampaignForm {
  return {
    name: campaign.name,
    objective: campaign.objective,
    channel: campaign.channel,
    status: campaign.status,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    budget: String(campaign.budget),
    notes: campaign.notes,
  };
}

function parseBudget(value: string) {
  return Number(value.replace(/[^\d]/g, ''));
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
    <section className="border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-neutral-950">{title}</h2>
        {description && <p className="mt-1 text-sm leading-relaxed text-neutral-500">{description}</p>}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-semibold uppercase tracking-widest text-neutral-500">{children}</label>;
}

export default function MarketingPage() {
  const notes = useSavedMarketingNotes();
  const campaigns = useSavedMarketingCampaigns();
  const [generatorForm, setGeneratorForm] = useState(generatorDefaults);
  const [generatorVariant, setGeneratorVariant] = useState(0);
  const generatedIdea = useMemo(
    () => generateIdea(generatorForm, generatorVariant),
    [generatorForm, generatorVariant],
  );

  const [noteForm, setNoteForm] = useState(emptyNoteForm);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteSearch, setNoteSearch] = useState('');

  const [campaignForm, setCampaignForm] = useState(emptyCampaignForm);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [campaignFilter, setCampaignFilter] = useState<MarketingCampaignStatus | 'all'>('all');

  const filteredNotes = notes.filter((note) => {
    const query = noteSearch.toLowerCase().trim();

    if (!query) {
      return true;
    }

    return `${note.title} ${note.category} ${note.body}`.toLowerCase().includes(query);
  });

  const filteredCampaigns = campaigns.filter(
    (campaign) => campaignFilter === 'all' || campaign.status === campaignFilter,
  );

  function saveGeneratedIdeaToNotes() {
    const now = new Date().toISOString();
    const nextNote: MarketingNote = {
      id: createId('marketing-note'),
      title: generatedIdea.hook,
      category: 'Generated video idea',
      body: [
        `Concept: ${generatedIdea.concept}`,
        `Shot list: ${generatedIdea.shotList.join(' / ')}`,
        `Caption: ${generatedIdea.caption}`,
        `CTA: ${generatedIdea.cta}`,
      ].join('\n\n'),
      createdAt: now,
      updatedAt: now,
    };

    writeSavedMarketingNotes([nextNote, ...notes]);
  }

  function copyGeneratedIdea() {
    const text = [
      generatedIdea.hook,
      generatedIdea.concept,
      `Shot list: ${generatedIdea.shotList.join(', ')}`,
      `Caption: ${generatedIdea.caption}`,
      `CTA: ${generatedIdea.cta}`,
    ].join('\n');

    void navigator.clipboard?.writeText(text);
  }

  function handleNoteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!noteForm.title.trim() && !noteForm.body.trim()) {
      return;
    }

    const now = new Date().toISOString();

    if (editingNoteId) {
      writeSavedMarketingNotes(
        notes.map((note) =>
          note.id === editingNoteId
            ? {
                ...note,
                title: noteForm.title.trim() || 'Untitled idea',
                category: noteForm.category.trim() || 'Idea dump',
                body: noteForm.body.trim(),
                updatedAt: now,
              }
            : note,
        ),
      );
    } else {
      writeSavedMarketingNotes([
        {
          id: createId('marketing-note'),
          title: noteForm.title.trim() || 'Untitled idea',
          category: noteForm.category.trim() || 'Idea dump',
          body: noteForm.body.trim(),
          createdAt: now,
          updatedAt: now,
        },
        ...notes,
      ]);
    }

    setNoteForm(emptyNoteForm);
    setEditingNoteId(null);
  }

  function editNote(note: MarketingNote) {
    setEditingNoteId(note.id);
    setNoteForm(noteToForm(note));
  }

  function deleteNote(noteId: string) {
    writeSavedMarketingNotes(notes.filter((note) => note.id !== noteId));

    if (editingNoteId === noteId) {
      setEditingNoteId(null);
      setNoteForm(emptyNoteForm);
    }
  }

  function handleCampaignSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!campaignForm.name.trim()) {
      return;
    }

    const now = new Date().toISOString();
    const campaignPayload = {
      name: campaignForm.name.trim(),
      objective: campaignForm.objective.trim(),
      channel: campaignForm.channel.trim() || 'Instagram + TikTok',
      status: campaignForm.status,
      startDate: campaignForm.startDate,
      endDate: campaignForm.endDate,
      budget: parseBudget(campaignForm.budget),
      notes: campaignForm.notes.trim(),
      updatedAt: now,
    };

    if (editingCampaignId) {
      writeSavedMarketingCampaigns(
        campaigns.map((campaign) =>
          campaign.id === editingCampaignId ? { ...campaign, ...campaignPayload } : campaign,
        ),
      );
    } else {
      writeSavedMarketingCampaigns([
        {
          id: createId('marketing-campaign'),
          ...campaignPayload,
          createdAt: now,
        },
        ...campaigns,
      ]);
    }

    setCampaignForm(emptyCampaignForm);
    setEditingCampaignId(null);
  }

  function editCampaign(campaign: MarketingCampaign) {
    setEditingCampaignId(campaign.id);
    setCampaignForm(campaignToForm(campaign));
  }

  function deleteCampaign(campaignId: string) {
    writeSavedMarketingCampaigns(campaigns.filter((campaign) => campaign.id !== campaignId));

    if (editingCampaignId === campaignId) {
      setEditingCampaignId(null);
      setCampaignForm(emptyCampaignForm);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="border-b border-neutral-200 pb-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Owner marketing tools
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">Marketing</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-500">
            Generate short-form kebaya rental video ideas, dump raw notes, and manage campaign
            lists. Notes and campaigns are saved in this browser.
          </p>
        </header>

        <SectionPanel
          title="Short-Form Video Idea Generator"
          description="Template-based generator for kebaya rental content ideas. No external AI or posting integration."
        >
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(360px,1.15fr)]">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div>
                <FieldLabel>Occasion</FieldLabel>
                <select
                  value={generatorForm.occasion}
                  onChange={(event) =>
                    setGeneratorForm({ ...generatorForm, occasion: event.target.value })
                  }
                  className="mt-2 w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                >
                  {occasionOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Channel</FieldLabel>
                <select
                  value={generatorForm.channel}
                  onChange={(event) =>
                    setGeneratorForm({ ...generatorForm, channel: event.target.value })
                  }
                  className="mt-2 w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                >
                  {channelOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Style</FieldLabel>
                <select
                  value={generatorForm.style}
                  onChange={(event) =>
                    setGeneratorForm({ ...generatorForm, style: event.target.value })
                  }
                  className="mt-2 w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                >
                  {styleOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Audience</FieldLabel>
                <input
                  value={generatorForm.audience}
                  onChange={(event) =>
                    setGeneratorForm({ ...generatorForm, audience: event.target.value })
                  }
                  className="mt-2 w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <FieldLabel>Goal</FieldLabel>
                <input
                  value={generatorForm.goal}
                  onChange={(event) =>
                    setGeneratorForm({ ...generatorForm, goal: event.target.value })
                  }
                  className="mt-2 w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                />
              </div>
            </div>

            <div className="border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                    <WandSparkles className="h-3.5 w-3.5" />
                    Generated idea
                  </div>
                  <h3 className="mt-3 text-xl font-semibold tracking-tight text-neutral-950">
                    {generatedIdea.hook}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setGeneratorVariant((current) => current + 1)}
                  className="inline-flex items-center justify-center gap-2 border border-neutral-900 bg-neutral-900 px-3 py-2 text-sm font-semibold text-white"
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerate
                </button>
              </div>

              <div className="mt-4 grid gap-3 text-sm">
                <div className="border border-neutral-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
                    Concept
                  </p>
                  <p className="mt-2 leading-relaxed text-neutral-700">{generatedIdea.concept}</p>
                </div>
                <div className="border border-neutral-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
                    Shot list
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {generatedIdea.shotList.map((shot) => (
                      <span
                        key={shot}
                        className="border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs font-medium text-neutral-700"
                      >
                        {shot}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="border border-neutral-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
                    Caption
                  </p>
                  <p className="mt-2 leading-relaxed text-neutral-700">{generatedIdea.caption}</p>
                </div>
                <div className="border border-neutral-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
                    CTA
                  </p>
                  <p className="mt-2 font-medium text-neutral-900">{generatedIdea.cta}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={saveGeneratedIdeaToNotes}
                  className="inline-flex items-center justify-center gap-2 border border-neutral-900 bg-neutral-900 px-3 py-2 text-sm font-semibold text-white"
                >
                  <Plus className="h-4 w-4" />
                  Save to Notes
                </button>
                <button
                  type="button"
                  onClick={copyGeneratedIdea}
                  className="inline-flex items-center justify-center gap-2 border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  <Copy className="h-4 w-4" />
                  Copy Idea
                </button>
              </div>
            </div>
          </div>
        </SectionPanel>

        <div className="grid gap-6 xl:grid-cols-2">
          <SectionPanel
            title="Idea Dump Notes"
            description="Create, edit, search, and delete raw content notes."
          >
            <form onSubmit={handleNoteSubmit} className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel>Title</FieldLabel>
                  <input
                    value={noteForm.title}
                    onChange={(event) => setNoteForm({ ...noteForm, title: event.target.value })}
                    className="mt-2 w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                    placeholder="Example: Fitting FAQ hooks"
                  />
                </div>
                <div>
                  <FieldLabel>Category</FieldLabel>
                  <input
                    value={noteForm.category}
                    onChange={(event) =>
                      setNoteForm({ ...noteForm, category: event.target.value })
                    }
                    className="mt-2 w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                    placeholder="Idea dump"
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Note</FieldLabel>
                <textarea
                  value={noteForm.body}
                  onChange={(event) => setNoteForm({ ...noteForm, body: event.target.value })}
                  rows={4}
                  className="mt-2 w-full resize-none border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                  placeholder="Dump rough hooks, captions, customer questions, or product angles."
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 border border-neutral-900 bg-neutral-900 px-3 py-2 text-sm font-semibold text-white"
                >
                  <Save className="h-4 w-4" />
                  {editingNoteId ? 'Update Note' : 'Add Note'}
                </button>
                {editingNoteId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingNoteId(null);
                      setNoteForm(emptyNoteForm);
                    }}
                    className="inline-flex items-center justify-center gap-2 border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="mt-5 border-t border-neutral-200 pt-5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                <input
                  value={noteSearch}
                  onChange={(event) => setNoteSearch(event.target.value)}
                  className="w-full border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                  placeholder="Search notes"
                />
              </div>

              <div className="mt-4 grid gap-3">
                {filteredNotes.map((note) => (
                  <article key={note.id} className="border border-neutral-200 bg-neutral-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                          <NotebookPen className="h-3.5 w-3.5" />
                          {note.category}
                        </div>
                        <h3 className="mt-2 text-sm font-semibold text-neutral-950">{note.title}</h3>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => editNote(note)}
                          className="border border-neutral-200 bg-white p-2 text-neutral-600 hover:text-neutral-950"
                          aria-label={`Edit ${note.title}`}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteNote(note.id)}
                          className="border border-neutral-200 bg-white p-2 text-red-600 hover:text-red-700"
                          aria-label={`Delete ${note.title}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-neutral-600">
                      {note.body || 'No note body yet.'}
                    </p>
                  </article>
                ))}
                {filteredNotes.length === 0 && (
                  <div className="border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center text-sm text-neutral-500">
                    No notes found.
                  </div>
                )}
              </div>
            </div>
          </SectionPanel>

          <SectionPanel
            title="Campaign List"
            description="Create, edit, filter, and delete marketing campaigns."
          >
            <form onSubmit={handleCampaignSubmit} className="grid gap-3">
              <div>
                <FieldLabel>Campaign name</FieldLabel>
                <input
                  value={campaignForm.name}
                  onChange={(event) =>
                    setCampaignForm({ ...campaignForm, name: event.target.value })
                  }
                  className="mt-2 w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                  placeholder="Example: July Wisuda Push"
                />
              </div>
              <div>
                <FieldLabel>Objective</FieldLabel>
                <textarea
                  value={campaignForm.objective}
                  onChange={(event) =>
                    setCampaignForm({ ...campaignForm, objective: event.target.value })
                  }
                  rows={2}
                  className="mt-2 w-full resize-none border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                  placeholder="What should this campaign achieve?"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel>Channel</FieldLabel>
                  <input
                    value={campaignForm.channel}
                    onChange={(event) =>
                      setCampaignForm({ ...campaignForm, channel: event.target.value })
                    }
                    className="mt-2 w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                  />
                </div>
                <div>
                  <FieldLabel>Status</FieldLabel>
                  <select
                    value={campaignForm.status}
                    onChange={(event) =>
                      setCampaignForm({
                        ...campaignForm,
                        status: event.target.value as MarketingCampaignStatus,
                      })
                    }
                    className="mt-2 w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                  >
                    {campaignStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Start date</FieldLabel>
                  <input
                    type="date"
                    value={campaignForm.startDate}
                    onChange={(event) =>
                      setCampaignForm({ ...campaignForm, startDate: event.target.value })
                    }
                    className="mt-2 w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                  />
                </div>
                <div>
                  <FieldLabel>End date</FieldLabel>
                  <input
                    type="date"
                    value={campaignForm.endDate}
                    onChange={(event) =>
                      setCampaignForm({ ...campaignForm, endDate: event.target.value })
                    }
                    className="mt-2 w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                  />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Budget</FieldLabel>
                  <input
                    inputMode="numeric"
                    value={campaignForm.budget}
                    onChange={(event) =>
                      setCampaignForm({ ...campaignForm, budget: event.target.value })
                    }
                    className="mt-2 w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                    placeholder="350000"
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Notes</FieldLabel>
                <textarea
                  value={campaignForm.notes}
                  onChange={(event) =>
                    setCampaignForm({ ...campaignForm, notes: event.target.value })
                  }
                  rows={3}
                  className="mt-2 w-full resize-none border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                  placeholder="Campaign angle, offer, content reminders, or owner notes."
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 border border-neutral-900 bg-neutral-900 px-3 py-2 text-sm font-semibold text-white"
                >
                  <Save className="h-4 w-4" />
                  {editingCampaignId ? 'Update Campaign' : 'Add Campaign'}
                </button>
                {editingCampaignId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCampaignId(null);
                      setCampaignForm(emptyCampaignForm);
                    }}
                    className="inline-flex items-center justify-center gap-2 border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="mt-5 border-t border-neutral-200 pt-5">
              <div className="flex flex-wrap gap-2">
                {[{ value: 'all', label: 'All' }, ...campaignStatusOptions].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setCampaignFilter(option.value as MarketingCampaignStatus | 'all')
                    }
                    className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                      campaignFilter === option.value
                        ? 'bg-neutral-900 text-white'
                        : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid gap-3">
                {filteredCampaigns.map((campaign) => (
                  <article key={campaign.id} className="border border-neutral-200 bg-neutral-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`border px-2 py-1 text-xs font-semibold ${statusClass(
                              campaign.status,
                            )}`}
                          >
                            {campaign.status.toUpperCase()}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500">
                            <Megaphone className="h-3.5 w-3.5" />
                            {campaign.channel}
                          </span>
                        </div>
                        <h3 className="mt-2 text-sm font-semibold text-neutral-950">
                          {campaign.name}
                        </h3>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => editCampaign(campaign)}
                          className="border border-neutral-200 bg-white p-2 text-neutral-600 hover:text-neutral-950"
                          aria-label={`Edit ${campaign.name}`}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCampaign(campaign.id)}
                          className="border border-neutral-200 bg-white p-2 text-red-600 hover:text-red-700"
                          aria-label={`Delete ${campaign.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                      {campaign.objective || 'No objective yet.'}
                    </p>
                    <div className="mt-3 grid gap-2 text-xs text-neutral-500 sm:grid-cols-3">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                      </span>
                      <span>{formatBudget(campaign.budget)}</span>
                      <span>{campaign.notes || 'No notes'}</span>
                    </div>
                  </article>
                ))}
                {filteredCampaigns.length === 0 && (
                  <div className="border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center text-sm text-neutral-500">
                    No campaigns found.
                  </div>
                )}
              </div>
            </div>
          </SectionPanel>
        </div>
      </div>
    </div>
  );
}
