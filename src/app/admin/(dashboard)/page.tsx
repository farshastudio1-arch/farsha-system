'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  ArrowUpRight,
  CheckCircle,
  Clock,
  Eye,
  MessageCircle,
  PackageCheck,
  ShoppingBag,
  Sparkles,
  Wrench,
} from 'lucide-react';

import { KebayaItem } from '@/data/mockData';
import { landingCategories, matchesLandingCategory } from '@/lib/landing-categories';
import { useSavedCatalogItems } from '@/lib/catalog-storage';
import { useSavedSiteSettings } from '@/lib/site-settings';
import { useSavedPosLedger, projectCatalogItems, getOverdueTransactions } from '@/lib/pos-ledger';

type StatusTone = 'good' | 'warning' | 'neutral';

function formatPrice(price: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Tanggal belum diisi';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Tanggal tidak valid';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function statusLabel(status: KebayaItem['status']) {
  const labels: Record<KebayaItem['status'], string> = {
    available: 'AVAILABLE',
    rented: 'RENTED',
    maintenance: 'DICUCI',
  };

  return labels[status];
}

function statusClass(status: KebayaItem['status']) {
  const classes: Record<KebayaItem['status'], string> = {
    available: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    rented: 'border-amber-200 bg-amber-50 text-amber-700',
    maintenance: 'border-rose-200 bg-rose-50 text-rose-700',
  };

  return classes[status];
}

function readinessClass(tone: StatusTone) {
  if (tone === 'good') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (tone === 'warning') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  return 'border-neutral-200 bg-neutral-50 text-neutral-700';
}

function cleanPhone(value: string) {
  return value.replace(/[^0-9]/g, '');
}

function countByStatus(items: KebayaItem[], status: KebayaItem['status']) {
  return items.filter((item) => item.status === status).length;
}

function getActionItems(items: KebayaItem[], overdueTransactions: Array<{ itemId: string }>) {
  return items
    .flatMap((item) => {
      const actions: Array<{
        key: string;
        title: string;
        detail: string;
        priority: 'high' | 'medium' | 'low';
        item: KebayaItem;
      }> = [];

      if (item.status === 'maintenance') {
        actions.push({
          key: `${item.id}-maintenance`,
          title: 'Maintenance item',
          detail: 'Item tidak tampil sebagai siap sewa. Cek cleaning atau repair.',
          priority: 'high',
          item,
        });
      }

      if (item.status === 'rented') {
        actions.push({
          key: `${item.id}-rented`,
          title: item.rentalEndDate ? 'Return scheduled' : 'Missing return date',
          detail: `Estimasi kembali: ${formatDate(item.rentalEndDate)}`,
          priority: item.rentalEndDate ? 'medium' : 'high',
          item,
        });
      }

      if (overdueTransactions.some((transaction) => transaction.itemId === item.id)) {
        actions.push({
          key: `${item.id}-overdue`,
          title: 'Overdue rental',
          detail: 'Ledger says the item is still open past due date.',
          priority: 'high',
          item,
        });
      }

      if (item.imageUrls.length < 2) {
        actions.push({
          key: `${item.id}-images`,
          title: 'Add more photos',
          detail: 'Catalog cards and detail pages work better with multiple product photos.',
          priority: 'medium',
          item,
        });
      }

      if (!item.description.trim()) {
        actions.push({
          key: `${item.id}-description`,
          title: 'Missing description',
          detail: 'Public detail modal needs copy for fit, material, and occasion context.',
          priority: 'medium',
          item,
        });
      }

      return actions;
    })
    .sort((a, b) => {
      const rank = { high: 0, medium: 1, low: 2 };
      return rank[a.priority] - rank[b.priority];
    })
    .slice(0, 6);
}

function OverviewCard({
  title,
  value,
  description,
  icon: Icon,
  tone = 'neutral',
}: {
  title: string;
  value: string | number;
  description: string;
  icon: typeof ShoppingBag;
  tone?: StatusTone;
}) {
  return (
    <div className="border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            {title}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">{value}</p>
        </div>
        <div className={`border p-2 ${readinessClass(tone)}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-neutral-500">{description}</p>
    </div>
  );
}

function SectionPanel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-neutral-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div>
          <h2 className="text-base font-semibold text-neutral-950">{title}</h2>
          {description && (
            <p className="mt-1 text-sm leading-relaxed text-neutral-500">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export default function AdminDashboard() {
  const catalogItems = useSavedCatalogItems();
  const settings = useSavedSiteSettings();
  const ledger = useSavedPosLedger();
  const projectedItems = useMemo(() => projectCatalogItems(catalogItems, ledger), [catalogItems, ledger]);
  const overdueTransactions = useMemo(() => getOverdueTransactions(ledger), [ledger]);

  const totalItems = projectedItems.length;
  const availableItems = countByStatus(projectedItems, 'available');
  const rentedItems = countByStatus(projectedItems, 'rented');
  const maintenanceItems = countByStatus(projectedItems, 'maintenance');
  const readyRatio = totalItems > 0 ? Math.round((availableItems / totalItems) * 100) : 0;
  const whatsappReady = cleanPhone(settings.whatsappNumber).length >= 10;
  const actionItems = getActionItems(projectedItems, overdueTransactions);
  const priceValues = projectedItems.map((item) => item.rentalPrice).filter((price) => price > 0);
  const lowestPrice = priceValues.length > 0 ? Math.min(...priceValues) : 0;
  const highestPrice = priceValues.length > 0 ? Math.max(...priceValues) : 0;
  const rentedSchedule = projectedItems
    .filter((item) => item.status === 'rented')
    .sort((a, b) => {
      const aTime = a.rentalEndDate ? new Date(a.rentalEndDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.rentalEndDate ? new Date(b.rentalEndDate).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    })
    .slice(0, 5);
  const maintenanceQueue = projectedItems.filter((item) => item.status === 'maintenance').slice(0, 5);

  const categoryCoverage = landingCategories.map((category) => {
    const matchedItems = projectedItems.filter((item) => matchesLandingCategory(item, category.slug));
    const readyItems = matchedItems.filter((item) => item.status === 'available');

    return {
      ...category,
      count: matchedItems.length,
      readyCount: readyItems.length,
      tone: readyItems.length > 0 ? ('good' as const) : ('warning' as const),
    };
  });

  const readinessItems = [
    {
      label: 'Public catalog items',
      value: `${totalItems} items`,
      detail: 'Catalog identity records managed in admin.',
      tone: totalItems > 0 ? ('good' as const) : ('warning' as const),
      icon: Eye,
    },
    {
      label: 'WhatsApp contact',
      value: whatsappReady ? settings.whatsappNumber : 'Needs number',
      detail: 'Used by customer inquiry links on public product flows.',
      tone: whatsappReady ? ('good' as const) : ('warning' as const),
      icon: MessageCircle,
    },
    {
      label: 'Store status',
      value: settings.status.replace('-', ' '),
      detail: 'Reference status from admin settings.',
      tone: settings.status === 'active' ? ('good' as const) : ('warning' as const),
      icon: PackageCheck,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Admin overview
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
            Public catalog readiness
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500 sm:text-base">
            Operational snapshot from the same catalog and settings data used by the landing and
            catalog pages.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/catalog"
            className="inline-flex items-center justify-center gap-2 border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            View catalog
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          <Link
            href="/admin/catalog"
            className="inline-flex items-center justify-center gap-2 bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
          >
            Manage items
            <ShoppingBag className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewCard
          title="Total items"
          value={totalItems}
          description="Catalog identity records"
          icon={ShoppingBag}
        />
        <OverviewCard
          title="Available"
          value={availableItems}
          description={`${readyRatio}% of catalog can be offered now`}
          icon={CheckCircle}
          tone={availableItems > 0 ? 'good' : 'warning'}
        />
        <OverviewCard
          title="Rented"
          value={rentedItems}
          description="Track return dates before promising availability"
          icon={Clock}
          tone={rentedItems > 0 ? 'warning' : 'neutral'}
        />
        <OverviewCard
          title="Maintenance"
          value={maintenanceItems}
          description="Cleaning or repair items needing follow-up"
          icon={Wrench}
          tone={maintenanceItems > 0 ? 'warning' : 'good'}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
        <SectionPanel
          title="Landing category coverage"
          description="Checks whether public occasion tiles have matching catalog inventory."
          action={
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700 hover:text-neutral-950"
            >
              Open landing
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {categoryCoverage.map((category) => (
              <Link
                key={category.slug}
                href={`/catalog?category=${category.slug}`}
                className="group border border-neutral-200 bg-neutral-50 p-4 transition-colors hover:border-neutral-300 hover:bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg" aria-hidden="true">
                      {category.emoji}
                    </p>
                    <h3 className="mt-2 text-sm font-semibold text-neutral-950">
                      {category.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                      {category.descriptor}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 border px-2.5 py-1 text-xs font-semibold ${readinessClass(category.tone)}`}
                  >
                    {category.readyCount} ready
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-3 text-xs text-neutral-500">
                  <span>{category.count} matching items</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-neutral-700 group-hover:text-neutral-950">
                    Review
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </SectionPanel>

        <SectionPanel title="Customer-facing readiness">
          <div className="space-y-3">
            {readinessItems.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="border border-neutral-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className={`border p-2 ${readinessClass(item.tone)}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                        {item.label}
                      </p>
                      <p className="mt-1 break-words text-sm font-semibold capitalize text-neutral-950">
                        {item.value}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                Price range
              </p>
              <p className="mt-2 text-sm font-semibold text-neutral-950">
                {priceValues.length > 0
                  ? `${formatPrice(lowestPrice)} - ${formatPrice(highestPrice)}`
                  : 'No public prices'}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                Based on catalog item prices.
              </p>
            </div>
          </div>
        </SectionPanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(340px,0.82fr)_minmax(0,1.18fr)]">
        <SectionPanel
          title="Action list"
          description="Fix these before relying on the public catalog for customer decisions."
        >
          {actionItems.length > 0 ? (
            <div className="space-y-3">
              {actionItems.map((action) => (
                <Link
                  key={action.key}
                  href="/admin/catalog"
                  className="block border border-neutral-200 p-4 transition-colors hover:bg-neutral-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-neutral-950">{action.title}</p>
                        <span
                          className={`border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
                            action.priority === 'high'
                              ? 'border-red-200 bg-red-50 text-red-700'
                              : action.priority === 'medium'
                                ? 'border-amber-200 bg-amber-50 text-amber-700'
                                : 'border-neutral-200 bg-neutral-50 text-neutral-600'
                          }`}
                        >
                          {action.priority}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-neutral-600">{action.item.name}</p>
                      <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                        {action.detail}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 border px-2.5 py-1 text-xs font-semibold ${statusClass(action.item.status)}`}
                    >
                      {statusLabel(action.item.status)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-5 w-5" />
                <div>
                  <p className="text-sm font-semibold">Catalog looks ready</p>
                  <p className="mt-1 text-sm leading-relaxed">
                    No maintenance, rented-date, image, or description issues were found.
                  </p>
                </div>
              </div>
            </div>
          )}
        </SectionPanel>

        <SectionPanel
          title="Return and maintenance queue"
          description="Operational items that need date tracking, cleaning, or repair follow-up."
          action={
            <Link
              href="/admin/catalog"
              className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700 hover:text-neutral-950"
            >
              Manage catalog
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          }
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-neutral-950">Rented returns</h3>
              </div>
              {rentedSchedule.length > 0 ? (
                <div className="space-y-3">
                  {rentedSchedule.map((item) => (
                    <Link
                      key={item.id}
                      href="/admin/catalog"
                      className="block border border-neutral-200 p-3 transition-colors hover:bg-neutral-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-950">
                            {item.name}
                          </p>
                          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-neutral-400">
                            {item.code}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 border px-2 py-0.5 text-[10px] font-semibold ${statusClass(item.status)}`}
                        >
                          {statusLabel(item.status)}
                        </span>
                      </div>
                      <p className="mt-3 border-t border-neutral-200 pt-2 text-xs font-semibold text-neutral-700">
                        Return: {formatDate(item.rentalEndDate)}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-500">
                  No rented items currently need return tracking.
                </div>
              )}
            </div>

            <div>
              <div className="mb-3 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-red-600" />
                <h3 className="text-sm font-semibold text-neutral-950">Maintenance queue</h3>
              </div>
              {maintenanceQueue.length > 0 ? (
                <div className="space-y-3">
                  {maintenanceQueue.map((item) => (
                    <Link
                      key={item.id}
                      href="/admin/catalog"
                      className="block border border-neutral-200 p-3 transition-colors hover:bg-neutral-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-950">
                            {item.name}
                          </p>
                          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-neutral-400">
                            {item.code}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 border px-2 py-0.5 text-[10px] font-semibold ${statusClass(item.status)}`}
                        >
                          {statusLabel(item.status)}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-neutral-200 pt-2">
                        <span className="border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">
                          {item.model} / {item.size}
                        </span>
                        <span className="border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">
                          {item.color}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  No items are currently in maintenance.
                </div>
              )}
            </div>
          </div>

          {rentedSchedule.length === 0 && maintenanceQueue.length === 0 && (
            <div className="mt-4 border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-5 w-5" />
                <div>
                  <p className="text-sm font-semibold">No operational queue today</p>
                  <p className="mt-1 text-sm leading-relaxed">
                    Rented returns and maintenance items are clear.
                  </p>
                </div>
              </div>
            </div>
          )}
        </SectionPanel>
      </div>
    </div>
  );
}
