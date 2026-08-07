import {
  AdminCreateConsignorForm,
  AdminDeleteConsignorButton,
  AdminResendInviteButton,
  AdminSettlePayoutButton,
} from '@/components/consignment/ConsignmentForms';
import { crittersAvatarSvg, resolveAvatarSeed } from '@/lib/consignor-avatar';
import type { AdminPayoutRequestRow, listConsignors } from '@/lib/consignor-db';

type ConsignorSummary = Awaited<ReturnType<typeof listConsignors>>[number];

function currency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

const dateFmt = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

function formatDate(iso: string | null) {
  if (!iso) return '';
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso.slice(0, 10) : dateFmt.format(parsed);
}

const statusTone: Record<string, string> = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  invited: 'border-amber-200 bg-amber-50 text-amber-700',
  suspended: 'border-rose-200 bg-rose-50 text-rose-700',
};

const requestStatusTone: Record<string, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  settled: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected: 'border-rose-200 bg-rose-50 text-rose-700',
};

function StatusPill({ status, tone }: { status: string; tone?: string }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap border px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${
        tone ?? 'border-neutral-200 bg-neutral-50 text-neutral-600'
      }`}
    >
      {status}
    </span>
  );
}

export default function ConsignmentAdmin({
  consignors,
  payoutRequests,
}: {
  consignors: ConsignorSummary[];
  payoutRequests: AdminPayoutRequestRow[];
}) {
  const totals = {
    consignors: consignors.length,
    active: consignors.filter((c) => c.status === 'active').length,
    pendingPayouts: payoutRequests.filter((r) => r.status === 'pending').length,
    accrued: consignors.reduce((sum, c) => sum + c.accruedBalance, 0),
  };

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Header + summary */}
      <section className="border border-neutral-200 bg-white p-5 sm:p-6">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-neutral-500">
          Kontrol Akun Partner
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Konsinyasi</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Kelola akun consignor: buat akun &amp; undangan, pantau saldo, atur pencairan, dan hapus akun.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-px border border-neutral-200 bg-neutral-200 sm:grid-cols-4">
          <Stat label="Consignor" value={String(totals.consignors)} />
          <Stat label="Aktif" value={String(totals.active)} />
          <Stat label="Pencairan pending" value={String(totals.pendingPayouts)} />
          <Stat label="Total terkumpul" value={currency(totals.accrued)} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
        {/* Create consignor */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="border border-neutral-200 bg-white p-5">
            <h2 className="text-lg font-semibold">Buat consignor</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Undangan aktivasi dikirim ke email consignor.
            </p>
            <div className="mt-4">
              <AdminCreateConsignorForm />
            </div>
          </div>
        </div>

        {/* Consignor accounts */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Akun consignor</h2>
            <span className="font-mono text-xs font-bold text-neutral-400">({consignors.length})</span>
            <span className="h-px flex-1 bg-neutral-200" />
          </div>

          {consignors.length === 0 && (
            <p className="border border-dashed border-neutral-200 px-4 py-10 text-center text-sm text-neutral-500">
              Belum ada consignor.
            </p>
          )}

          {consignors.map((consignor) => {
            const avatar = crittersAvatarSvg(resolveAvatarSeed(consignor), 72);
            const isEwallet = consignor.payoutMethod === 'ewallet';
            const hasPayout = Boolean(consignor.bankName && consignor.bankAccountNumber);
            return (
              <article key={consignor.id} className="border border-neutral-200 bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className="h-12 w-12 shrink-0 overflow-hidden border border-neutral-200 bg-neutral-50 [&>svg]:h-full [&>svg]:w-full"
                      // eslint-disable-next-line react/no-danger
                      dangerouslySetInnerHTML={{ __html: avatar }}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{consignor.name}</p>
                        <StatusPill status={consignor.status} tone={statusTone[consignor.status]} />
                      </div>
                      <p className="truncate text-sm text-neutral-500">{consignor.email}</p>
                      {consignor.phone && <p className="text-sm text-neutral-500">{consignor.phone}</p>}
                    </div>
                  </div>
                  <AdminResendInviteButton consignorId={consignor.id} />
                </div>

                {/* Payout destination */}
                <div className="mt-4 border-t border-neutral-200 pt-4">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    {isEwallet ? 'E-Wallet' : 'Rekening bank'}
                  </p>
                  {hasPayout ? (
                    <p className="mt-1 text-sm text-neutral-700">
                      <span className="font-medium">{consignor.bankName}</span> ·{' '}
                      {consignor.bankAccountNumber} · a.n. {consignor.bankAccountName || '—'}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-neutral-400">Belum diatur consignor.</p>
                  )}
                </div>

                {/* Stats */}
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-neutral-200 pt-4 text-sm sm:grid-cols-4">
                  <StatInline label="Baju" value={String(consignor.activeItemCount)} />
                  <StatInline label="Terkumpul" value={currency(consignor.accruedBalance)} />
                  <StatInline label="Diproses" value={currency(consignor.requestedBalance)} />
                  <StatInline label="Dibayar" value={currency(consignor.paidBalance)} />
                </div>

                {/* Danger zone */}
                <div className="mt-4 flex justify-end border-t border-neutral-200 pt-4">
                  <AdminDeleteConsignorButton consignorId={consignor.id} consignorName={consignor.name} />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Payout requests */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-lg font-semibold">Permintaan pencairan</h2>
          <span className="font-mono text-xs font-bold text-neutral-400">({payoutRequests.length})</span>
          <span className="h-px flex-1 bg-neutral-200" />
        </div>

        {payoutRequests.length === 0 ? (
          <p className="border border-dashed border-neutral-200 px-4 py-10 text-center text-sm text-neutral-500">
            Belum ada permintaan pencairan.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {payoutRequests.map((request) => (
              <div key={request.id} className="border border-neutral-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold">{currency(request.amount)}</p>
                    <p className="truncate text-sm text-neutral-600">{request.consignorName ?? '—'}</p>
                    <p className="mt-1 text-xs text-neutral-500">{formatDate(request.requestedAt)}</p>
                  </div>
                  <StatusPill status={request.status} tone={requestStatusTone[request.status]} />
                </div>

                <div className="mt-3 border-t border-neutral-200 pt-3">
                  <p className="text-sm text-neutral-700">
                    {request.bankName ?? '—'} · {request.bankAccountNumber ?? '—'}
                  </p>
                  <p className="text-xs text-neutral-500">a.n. {request.bankAccountName ?? '—'}</p>
                </div>

                <div className="mt-3">
                  {request.status === 'pending' ? (
                    <AdminSettlePayoutButton requestId={request.id} />
                  ) : (
                    <p className="text-xs text-neutral-500">Ref: {request.reference ?? '—'}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-4">
      <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-neutral-400">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function StatInline({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-neutral-400">{label}</p>
      <p className="mt-0.5 font-medium text-neutral-800">{value}</p>
    </div>
  );
}
