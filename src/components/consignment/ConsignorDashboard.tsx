import Link from 'next/link';
import { ChevronDown, PackageOpen, Wallet } from 'lucide-react';

import { LogoutButton, PayoutRequestForm } from '@/components/consignment/ConsignmentForms';
import ItemThumbnail from '@/components/consignment/ItemThumbnail';
import { crittersAvatarSvg, resolveAvatarSeed } from '@/lib/consignor-avatar';
import type { ConsignorDashboard } from '@/lib/consignor-db';

function currency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

const dateFmt = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function formatDate(iso: string | null) {
  if (!iso) return null;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso.slice(0, 10) : dateFmt.format(parsed);
}

type Tone = 'neutral' | 'positive' | 'warning' | 'negative';

const toneClass: Record<Tone, string> = {
  neutral: 'border-neutral-200 bg-neutral-50 text-neutral-600',
  positive: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  negative: 'border-rose-200 bg-rose-50 text-rose-700',
};

function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest ${toneClass[tone]}`}
    >
      {label}
    </span>
  );
}

const itemStatusMap: Record<string, { label: string; tone: Tone }> = {
  available: { label: 'Tersedia', tone: 'neutral' },
  rented: { label: 'Disewa', tone: 'positive' },
  maintenance: { label: 'Perawatan', tone: 'warning' },
};

const payoutRequestStatusMap: Record<string, { label: string; tone: Tone }> = {
  pending: { label: 'Diproses', tone: 'warning' },
  settled: { label: 'Selesai', tone: 'positive' },
  rejected: { label: 'Ditolak', tone: 'negative' },
};

export default function ConsignorDashboard({ dashboard }: { dashboard: ConsignorDashboard }) {
  const firstName = dashboard.consignor.name.split(' ')[0];
  const canCashOut = dashboard.availableBalance > 0;
  const avatarSvg = crittersAvatarSvg(resolveAvatarSeed(dashboard.consignor), 80);
  const payoutMethod = dashboard.consignor.payoutMethod;

  return (
    <div className="theme-surface flex min-h-screen flex-col font-sans antialiased">
      {/* Sticky top bar */}
      <header className="theme-surface theme-border sticky top-0 z-40 border-b bg-[color-mix(in_srgb,var(--theme-surface)_88%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-3 px-4">
          <Link
            href="/settings"
            aria-label="Pengaturan akun"
            className="flex min-w-0 items-center gap-3"
          >
            <span
              className="theme-soft-surface theme-border h-9 w-9 shrink-0 overflow-hidden border [&>svg]:h-full [&>svg]:w-full"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: avatarSvg }}
            />
            <span className="min-w-0">
              <span className="theme-muted block font-mono text-[9px] font-bold uppercase tracking-[0.3em]">
                Farsha Consign
              </span>
              <span className="block truncate font-display text-sm font-semibold text-[var(--theme-text)]">
                Halo, {firstName}
              </span>
            </span>
          </Link>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-grow px-4 py-6 sm:py-8">
        {/* Balance hero */}
        <section className="theme-border border bg-[var(--theme-soft-surface)] p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-[var(--theme-text)]" aria-hidden="true" />
            <p className="theme-muted-strong font-mono text-[10px] font-bold uppercase tracking-widest">
              Saldo bisa dicairkan
            </p>
          </div>
          <p className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--theme-text)] sm:text-5xl">
            {currency(dashboard.availableBalance)}
          </p>
          <p className="theme-muted mt-2 text-[13px] leading-relaxed">
            Saldo bertambah otomatis setiap baju kamu selesai disewa.
          </p>

          <div className="mt-5">
            {canCashOut ? (
              <details className="group theme-surface theme-border border">
                <summary className="theme-primary-action flex cursor-pointer list-none items-center justify-between px-5 py-4 font-mono text-xs font-bold uppercase tracking-widest [&::-webkit-details-marker]:hidden">
                  <span>Cairkan saldo</span>
                  <ChevronDown
                    className="h-4 w-4 shrink-0 transition-transform duration-300 group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <div className="border-t border-[var(--theme-border)] p-5">
                  <p className="theme-muted mb-4 text-[13px] leading-relaxed">
                    {payoutMethod === 'ewallet' ? 'Konfirmasi e-wallet tujuan' : 'Konfirmasi rekening tujuan'}. Dana
                    ditransfer setelah diverifikasi tim kami.
                  </p>
                  <PayoutRequestForm
                    method={payoutMethod}
                    defaultAccountName={dashboard.consignor.bankAccountName ?? ''}
                    defaultInstitution={dashboard.consignor.bankName ?? ''}
                    defaultNumber={dashboard.consignor.bankAccountNumber ?? ''}
                  />
                </div>
              </details>
            ) : (
              <p className="theme-border border border-dashed px-5 py-4 text-center text-[13px] text-[var(--theme-text)] opacity-60">
                Belum ada saldo untuk dicairkan.
              </p>
            )}
          </div>
        </section>

        {/* Secondary stats */}
        <section className="mt-4 grid grid-cols-2 gap-3">
          <StatTile label="Sedang diproses" value={currency(dashboard.requestedBalance)} />
          <StatTile label="Sudah dibayar" value={currency(dashboard.paidBalance)} />
        </section>

        {/* Items */}
        <Section title="Baju kamu" count={dashboard.items.length}>
          {dashboard.items.length === 0 ? (
            <EmptyState icon={<PackageOpen className="h-6 w-6" />} text="Belum ada baju yang dititipkan." />
          ) : (
            <div className="space-y-3">
              {dashboard.items.map((item) => {
                const status = itemStatusMap[item.status] ?? { label: item.status, tone: 'neutral' as Tone };
                const lastPayout = formatDate(item.lastPayoutAt);
                return (
                  <article key={item.id} className="theme-surface theme-border border p-4">
                    <div className="flex items-start gap-3">
                      <ItemThumbnail src={item.imageUrls[0]} alt={item.name} />
                      <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-display font-semibold text-[var(--theme-text)]">
                            {item.name}
                          </p>
                          <p className="theme-muted mt-0.5 font-mono text-[11px] uppercase tracking-wider">
                            {item.code}
                          </p>
                        </div>
                        <StatusPill label={status.label} tone={status.tone} />
                      </div>
                    </div>

                    <div className="mt-4 flex items-end justify-between gap-3 border-t border-[var(--theme-border)] pt-4">
                      <div>
                        <p className="theme-muted font-mono text-[10px] font-bold uppercase tracking-widest">
                          Penghasilan
                        </p>
                        <p className="mt-1 font-display text-xl font-semibold text-[var(--theme-text)]">
                          {currency(item.payoutBalance)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="theme-muted-strong text-sm">{item.payoutCount}× disewa</p>
                        <p className="theme-muted text-[12px]">
                          {lastPayout ? `Terakhir ${lastPayout}` : 'Belum ada penghasilan'}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Section>

        {/* Earnings history */}
        <Section title="Riwayat penghasilan" count={dashboard.payouts.length}>
          {dashboard.payouts.length === 0 ? (
            <EmptyState icon={<Wallet className="h-6 w-6" />} text="Belum ada penghasilan." />
          ) : (
            <ul className="theme-border divide-y divide-[var(--theme-border)] border">
              {dashboard.payouts.map((payout) => (
                <li key={payout.id} className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-semibold text-[var(--theme-text)]">
                      {payout.itemName}
                    </p>
                    <p className="theme-muted mt-0.5 font-mono text-[11px] uppercase tracking-wider">
                      {payout.transactionNumber} · bagi hasil {payout.ratePercent}%
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-display text-sm font-semibold text-[var(--theme-text)]">
                      {currency(payout.payoutAmount)}
                    </p>
                    <StatusPill
                      label={payout.status === 'paid' ? 'Dibayar' : 'Terkumpul'}
                      tone={payout.status === 'paid' ? 'positive' : 'neutral'}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Payout requests */}
        {dashboard.payoutRequests.length > 0 && (
          <Section title="Pencairan" count={dashboard.payoutRequests.length}>
            <ul className="theme-border divide-y divide-[var(--theme-border)] border">
              {dashboard.payoutRequests.map((request) => {
                const status = payoutRequestStatusMap[request.status] ?? {
                  label: request.status,
                  tone: 'neutral' as Tone,
                };
                return (
                  <li key={request.id} className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="font-display text-sm font-semibold text-[var(--theme-text)]">
                        {currency(request.amount)}
                      </p>
                      <p className="theme-muted mt-0.5 text-[12px]">
                        {formatDate(request.requestedAt) ?? ''}
                        {request.reference ? ` · Ref ${request.reference}` : ''}
                      </p>
                    </div>
                    <StatusPill label={status.label} tone={status.tone} />
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

      </main>

      <footer className="theme-border border-t px-4 py-6">
        <p className="theme-muted mx-auto max-w-2xl text-center font-mono text-[10px] uppercase tracking-widest">
          Farsha Consign · Dashboard Partner
        </p>
      </footer>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="theme-surface theme-border border p-4">
      <p className="theme-muted font-mono text-[9px] font-bold uppercase tracking-widest">{label}</p>
      <p className="mt-1.5 font-display text-lg font-semibold text-[var(--theme-text)]">{value}</p>
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-display text-base font-semibold text-[var(--theme-text)]">{title}</h2>
        {typeof count === 'number' && (
          <span className="theme-muted font-mono text-[11px] font-bold">({count})</span>
        )}
        <span className="ml-1 h-px flex-1 bg-[var(--theme-border)]" />
      </div>
      {children}
    </section>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="theme-border flex flex-col items-center gap-2 border border-dashed px-4 py-10 text-center">
      <span className="theme-muted" aria-hidden="true">
        {icon}
      </span>
      <p className="theme-muted text-sm">{text}</p>
    </div>
  );
}
