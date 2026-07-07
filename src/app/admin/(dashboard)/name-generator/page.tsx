'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Edit,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

import {
  bulkAddNameGeneratorPoolEntriesAction,
  checkGeneratedNameAvailabilityAction,
  deleteNameGeneratorPoolEntryAction,
  fetchNameGeneratorAction,
  saveNameGeneratorPoolEntryAction,
} from '@/lib/farsha-actions';
import type {
  NameGeneratorPoolEntry,
  NameGeneratorTableKey,
  NameGeneratorUsedName,
} from '@/lib/farsha-db';

type PoolFormState = {
  tableKey: NameGeneratorTableKey;
  value: string;
};

type BulkFormState = {
  tableKey: NameGeneratorTableKey;
  values: string;
};

const tableLabels: Record<NameGeneratorTableKey, string> = {
  table_1: 'Table 1',
  table_2: 'Table 2',
};

const emptyForm: PoolFormState = {
  tableKey: 'table_1',
  value: '',
};

const emptyBulkForm: BulkFormState = {
  tableKey: 'table_1',
  values: '',
};

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

function formatDate(value: string) {
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

function getEntriesByTable(entries: NameGeneratorPoolEntry[], tableKey: NameGeneratorTableKey) {
  return entries.filter((entry) => entry.tableKey === tableKey);
}

function normalizeGeneratedNameForClient(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function buildAvailableNames(
  tableOneEntries: NameGeneratorPoolEntry[],
  tableTwoEntries: NameGeneratorPoolEntry[],
  usedNames: NameGeneratorUsedName[],
) {
  const usedSet = new Set(usedNames.map((usedName) => usedName.normalizedName));
  const names: string[] = [];

  tableOneEntries.forEach((tableOneEntry) => {
    tableTwoEntries.forEach((tableTwoEntry) => {
      const candidate = `${tableOneEntry.value} ${tableTwoEntry.value}`;

      if (!usedSet.has(normalizeGeneratedNameForClient(candidate))) {
        names.push(candidate);
      }
    });
  });

  return names;
}

function pickName(names: string[], previousName: string) {
  if (names.length === 0) {
    return '';
  }

  if (names.length === 1) {
    return names[0];
  }

  const nextNames = names.filter((name) => name !== previousName);
  return nextNames[Math.floor(Math.random() * nextNames.length)];
}

export default function NameGeneratorPage() {
  const [poolEntries, setPoolEntries] = useState<NameGeneratorPoolEntry[]>([]);
  const [usedNames, setUsedNames] = useState<NameGeneratorUsedName[]>([]);
  const [form, setForm] = useState<PoolFormState>(emptyForm);
  const [bulkForm, setBulkForm] = useState<BulkFormState>(emptyBulkForm);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [showPoolTools, setShowPoolTools] = useState(false);
  const [showPoolData, setShowPoolData] = useState(false);
  const [searchByTable, setSearchByTable] = useState<Record<NameGeneratorTableKey, string>>({
    table_1: '',
    table_2: '',
  });
  const [generatedName, setGeneratedName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const tableOneEntries = useMemo(() => getEntriesByTable(poolEntries, 'table_1'), [poolEntries]);
  const tableTwoEntries = useMemo(() => getEntriesByTable(poolEntries, 'table_2'), [poolEntries]);
  const availableNames = useMemo(
    () => buildAvailableNames(tableOneEntries, tableTwoEntries, usedNames),
    [tableOneEntries, tableTwoEntries, usedNames],
  );
  const totalCombinations = tableOneEntries.length * tableTwoEntries.length;
  const usedCombinationCount = Math.max(totalCombinations - availableNames.length, 0);
  const isPoolReady = tableOneEntries.length > 0 && tableTwoEntries.length > 0;

  useEffect(() => {
    let isMounted = true;

    async function loadGenerator() {
      setIsLoading(true);
      setError('');

      const result = await fetchNameGeneratorAction();

      if (!isMounted) {
        return;
      }

      if (result.ok) {
        setPoolEntries(result.data.poolEntries);
        setUsedNames(result.data.usedNames);
      } else {
        setError(result.error);
      }

      setIsLoading(false);
    }

    loadGenerator();

    return () => {
      isMounted = false;
    };
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingEntryId(null);
  };

  const bulkAddEntries = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isBulkSaving) {
      return;
    }

    const values = bulkForm.values
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);

    if (values.length === 0) {
      setError('Paste at least one entry, one per line.');
      return;
    }

    setIsBulkSaving(true);
    setError('');
    setMessage('');

    const result = await bulkAddNameGeneratorPoolEntriesAction({
      tableKey: bulkForm.tableKey,
      values,
    });

    if (result.ok) {
      setPoolEntries(result.data.entries);
      setBulkForm((current) => ({
        ...current,
        values: '',
      }));
      setMessage(
        `Bulk add complete: ${result.data.addedCount} added, ${result.data.skippedCount} skipped.`,
      );
    } else {
      setError(result.error);
    }

    setIsBulkSaving(false);
  };

  const saveEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    const value = form.value.trim();

    if (!value) {
      setError('Pool entry cannot be empty.');
      return;
    }

    setIsSaving(true);
    setError('');
    setMessage('');

    const result = await saveNameGeneratorPoolEntryAction({
      id: editingEntryId ?? undefined,
      tableKey: form.tableKey,
      value,
    });

    if (result.ok) {
      setPoolEntries(result.data);
      resetForm();
      setMessage('Pool entry saved.');
    } else {
      setError(result.error);
    }

    setIsSaving(false);
  };

  const startEdit = (entry: NameGeneratorPoolEntry) => {
    setForm({
      tableKey: entry.tableKey,
      value: entry.value,
    });
    setEditingEntryId(entry.id);
    setShowPoolTools(true);
    setError('');
    setMessage('');
  };

  const deleteEntry = async (entry: NameGeneratorPoolEntry) => {
    if (isDeletingId) {
      return;
    }

    setIsDeletingId(entry.id);
    setError('');
    setMessage('');

    const result = await deleteNameGeneratorPoolEntryAction(entry.id);

    if (result.ok) {
      setPoolEntries(result.data);
      if (editingEntryId === entry.id) {
        resetForm();
      }
      setMessage('Pool entry deleted.');
    } else {
      setError(result.error);
    }

    setIsDeletingId(null);
  };

  const generateName = async () => {
    if (isGenerating) {
      return;
    }

    setIsGenerating(true);
    setError('');
    setMessage('');
    setCopied(false);

    if (!isPoolReady) {
      setGeneratedName('');
      setError('Add at least one entry in Table 1 and Table 2 first.');
      setIsGenerating(false);
      return;
    }

    if (availableNames.length === 0) {
      setGeneratedName('');
      setError('All Table 1 + Table 2 name combinations are already used.');
      setIsGenerating(false);
      return;
    }

    const candidate = pickName(availableNames, generatedName);
    const result = await checkGeneratedNameAvailabilityAction(candidate);

    if (result.ok && result.data.available) {
      setGeneratedName(candidate);
      setMessage('Generated name is available.');
    } else if (result.ok) {
      setGeneratedName('');
      setError('That name was already used. Refreshing the page will reload the latest history.');
    } else {
      setGeneratedName('');
      setError(result.error);
    }

    setIsGenerating(false);
  };

  const copyGeneratedName = async () => {
    if (!generatedName) {
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedName);
      setCopied(true);
      setMessage('Name copied. It will be marked used only after catalog save.');
    } catch {
      setError('Copy failed. Select and copy the name manually.');
    }
  };

  const renderPoolTable = (tableKey: NameGeneratorTableKey) => {
    const query = searchByTable[tableKey].trim().toLowerCase();
    const entries = getEntriesByTable(poolEntries, tableKey).filter((entry) => {
      if (!query) {
        return true;
      }

      return entry.value.toLowerCase().includes(query);
    });

    return (
      <SectionPanel
        title={tableLabels[tableKey]}
        description={`${tableLabels[tableKey]} entries are combined with the other table to create item names.`}
      >
        <div className="mb-4 flex items-center gap-2 border border-neutral-200 bg-neutral-50 px-3 py-2">
          <Search className="h-4 w-4 text-neutral-400" />
          <input
            value={searchByTable[tableKey]}
            onChange={(event) =>
              setSearchByTable((current) => ({
                ...current,
                [tableKey]: event.target.value,
              }))
            }
            placeholder={`Search ${tableLabels[tableKey]}`}
            className="min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
          />
        </div>

        {entries.length === 0 ? (
          <div className="border border-dashed border-neutral-200 bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-500">
            No entries found.
          </div>
        ) : (
          <div className="overflow-x-auto border border-neutral-200">
            <table className="min-w-full divide-y divide-neutral-200 text-sm">
              <thead className="bg-neutral-50 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                <tr>
                  <th className="px-3 py-3 text-left">Entry</th>
                  <th className="px-3 py-3 text-left">Used</th>
                  <th className="px-3 py-3 text-left">Updated</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-3 py-3 font-medium text-neutral-950">{entry.value}</td>
                    <td className="px-3 py-3 text-neutral-600">{entry.usageCount}</td>
                    <td className="px-3 py-3 text-neutral-500">{formatDate(entry.updatedAt)}</td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(entry)}
                          className="inline-flex h-8 w-8 items-center justify-center border border-neutral-200 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-950"
                          aria-label={`Edit ${entry.value}`}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteEntry(entry)}
                          disabled={isDeletingId === entry.id}
                          className="inline-flex h-8 w-8 items-center justify-center border border-neutral-200 text-neutral-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Delete ${entry.value}`}
                          title="Delete"
                        >
                          {isDeletingId === entry.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionPanel>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 border border-neutral-200 bg-white p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">
              Admin tool
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
              Kebaya Name Generator
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500">
              Combine Table 1 and Table 2 entries into item names. Catalog saves mark names as used.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-80">
            <div className="border border-neutral-200 px-3 py-2">
              <p className="text-lg font-semibold text-neutral-950">{totalCombinations}</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                Combos
              </p>
            </div>
            <div className="border border-neutral-200 px-3 py-2">
              <p className="text-lg font-semibold text-neutral-950">{availableNames.length}</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                Available
              </p>
            </div>
            <div className="border border-neutral-200 px-3 py-2">
              <p className="text-lg font-semibold text-neutral-950">{usedCombinationCount}</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                Used
              </p>
            </div>
          </div>
        </div>

        {(message || error) && (
          <div
            className={`border px-4 py-3 text-sm ${
              error
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {error || message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <SectionPanel
            title="Generate"
            description="Preview names freely. Copying does not mark a name as used."
          >
            <div className="space-y-5">
              <div className="border border-neutral-200 bg-neutral-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
                  Available name
                </p>
                <div className="mt-3 min-h-16 border border-neutral-200 bg-white p-4">
                  <p className="break-words text-2xl font-semibold tracking-tight text-neutral-950">
                    {generatedName || 'No name generated yet'}
                  </p>
                </div>
              </div>

              {!isPoolReady && !isLoading && (
                <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Add at least one entry in both tables before generating names.
                </div>
              )}

              {isPoolReady && availableNames.length === 0 && (
                <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  All current combinations are already used. Add more pool entries to create new names.
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={generateName}
                  disabled={isLoading || isGenerating || !isPoolReady || availableNames.length === 0}
                  className="inline-flex flex-1 items-center justify-center gap-2 bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
                >
                  {isGenerating ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Generate
                </button>
                <button
                  type="button"
                  onClick={copyGeneratedName}
                  disabled={!generatedName}
                  className="inline-flex items-center justify-center gap-2 border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  Copy
                </button>
              </div>
            </div>
          </SectionPanel>

          <section className="border border-neutral-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <h2 className="text-base font-semibold text-neutral-950">Pool tools</h2>
                <p className="mt-1 text-sm leading-relaxed text-neutral-500">
                  Add or bulk add entries only when you need to update the pool.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPoolTools((current) => !current)}
                className="inline-flex items-center justify-center gap-2 border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                {showPoolTools ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {showPoolTools ? 'Hide tools' : 'Manage pool'}
              </button>
            </div>

            {showPoolTools && (
              <div className="space-y-6 p-4 sm:p-5">
                <div className="border border-neutral-200 p-4">
                  <h3 className="text-sm font-semibold text-neutral-950">
                    {editingEntryId ? 'Edit pool entry' : 'Add pool entry'}
                  </h3>
                  <form onSubmit={saveEntry} className="mt-4 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
                      <div className="space-y-2">
                        <FieldLabel>Pool table</FieldLabel>
                        <select
                          value={form.tableKey}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              tableKey: event.target.value as NameGeneratorTableKey,
                            }))
                          }
                          className="w-full border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-900"
                        >
                          <option value="table_1">Table 1</option>
                          <option value="table_2">Table 2</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <FieldLabel>Entry</FieldLabel>
                        <input
                          value={form.value}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              value: event.target.value,
                            }))
                          }
                          placeholder="Aurora, Sage, Brokat, Velvet"
                          className="w-full border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex flex-1 items-center justify-center gap-2 bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
                      >
                        {isSaving ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : editingEntryId ? (
                          <Save className="h-4 w-4" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        {editingEntryId ? 'Save changes' : 'Add entry'}
                      </button>
                      {editingEntryId && (
                        <button
                          type="button"
                          onClick={resetForm}
                          disabled={isSaving}
                          className="inline-flex items-center justify-center gap-2 border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                <div className="border border-neutral-200 p-4">
                  <h3 className="text-sm font-semibold text-neutral-950">Bulk add</h3>
                  <form onSubmit={bulkAddEntries} className="mt-4 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
                      <div className="space-y-2">
                        <FieldLabel>Pool table</FieldLabel>
                        <select
                          value={bulkForm.tableKey}
                          onChange={(event) =>
                            setBulkForm((current) => ({
                              ...current,
                              tableKey: event.target.value as NameGeneratorTableKey,
                            }))
                          }
                          className="w-full border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-900"
                        >
                          <option value="table_1">Table 1</option>
                          <option value="table_2">Table 2</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <FieldLabel>Entries</FieldLabel>
                        <textarea
                          value={bulkForm.values}
                          onChange={(event) =>
                            setBulkForm((current) => ({
                              ...current,
                              values: event.target.value,
                            }))
                          }
                          rows={6}
                          placeholder={`Aurora\nSage\nVelvet\nBrokat Premium`}
                          className="w-full resize-y border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="submit"
                        disabled={isBulkSaving}
                        className="inline-flex flex-1 items-center justify-center gap-2 bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
                      >
                        {isBulkSaving ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        Bulk add entries
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </section>
        </div>

        <section className="border border-neutral-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h2 className="text-base font-semibold text-neutral-950">Pool data</h2>
              <p className="mt-1 text-sm leading-relaxed text-neutral-500">
                Review and edit the underlying table entries when needed.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPoolData((current) => !current)}
              className="inline-flex items-center justify-center gap-2 border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              {showPoolData ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
              {showPoolData ? 'Hide data' : 'View pool data'}
            </button>
          </div>

          {showPoolData &&
            (isLoading ? (
              <div className="px-4 py-10 text-center text-sm text-neutral-500">
                Loading name generator.
              </div>
            ) : (
              <div className="grid gap-6 p-4 sm:p-5 xl:grid-cols-2">
                {renderPoolTable('table_1')}
                {renderPoolTable('table_2')}
              </div>
            ))}
        </section>
      </div>
    </div>
  );
}
