import { redirect } from 'next/navigation';

import {
  LogoutButton,
  PayoutRequestForm,
  WithdrawalRequestForm,
} from '@/components/consignment/ConsignmentForms';
import { getConsignorDashboard } from '@/lib/consignor-db';
import { getCurrentConsignor } from '@/lib/consignor-session';

function currency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function ConsignorDashboardPage() {
  const consignor = await getCurrentConsignor();

  if (!consignor) {
    redirect('/login');
  }

  const dashboard = await getConsignorDashboard(consignor.id);

  if (!dashboard) {
    return <main className="px-4 py-10">Dashboard not found.</main>;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neutral-500">Dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold">{dashboard.consignor.name}</h1>
        </div>
        <LogoutButton />
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <Card label="Available" value={currency(dashboard.availableBalance)} />
        <Card label="Requested" value={currency(dashboard.requestedBalance)} />
        <Card label="Paid" value={currency(dashboard.paidBalance)} />
        <Card label="Items" value={String(dashboard.items.length)} />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Panel title="Items">
            <div className="space-y-3">
              {dashboard.items.map((item) => (
                <div key={item.id} className="border border-neutral-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-neutral-500">
                        {item.code} · {item.status} · {item.consignorId ? 'consignment' : 'studio'}
                      </p>
                    </div>
                    <span className="text-sm font-semibold">{currency(item.rentalPrice)}</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-neutral-600 sm:grid-cols-3">
                    <span>Payout {currency(item.payoutBalance)}</span>
                    <span>Count {item.payoutCount}</span>
                    <span>{item.lastPayoutAt ? item.lastPayoutAt.slice(0, 10) : 'No payout yet'}</span>
                  </div>
                  <div className="mt-4">
                    <WithdrawalRequestForm itemId={item.id} />
                  </div>
                </div>
              ))}
              {dashboard.items.length === 0 && <p className="text-sm text-neutral-500">No items yet.</p>}
            </div>
          </Panel>

          <Panel title="Recent payouts">
            <div className="space-y-3">
              {dashboard.payouts.map((payout) => (
                <div key={payout.id} className="border border-neutral-200 p-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{payout.itemName}</p>
                      <p className="text-neutral-500">
                        {payout.transactionNumber} · {payout.ratePercent}% · {payout.status}
                      </p>
                    </div>
                    <strong>{currency(payout.payoutAmount)}</strong>
                  </div>
                </div>
              ))}
              {dashboard.payouts.length === 0 && <p className="text-sm text-neutral-500">No payouts yet.</p>}
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Request payout">
            <PayoutRequestForm />
          </Panel>

          <Panel title="Payout requests">
            <div className="space-y-3">
              {dashboard.payoutRequests.map((request) => (
                <div key={request.id} className="border border-neutral-200 p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{currency(request.amount)}</p>
                      <p className="text-neutral-500">{request.status}</p>
                    </div>
                    <span>{request.reference || '-'}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Withdrawal requests">
            <div className="space-y-3">
              {dashboard.withdrawalRequests.map((request) => (
                <div key={request.id} className="border border-neutral-200 p-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{request.itemName}</p>
                      <p className="text-neutral-500">{request.status}</p>
                    </div>
                    <span>{request.requestedAt.slice(0, 10)}</span>
                  </div>
                </div>
              ))}
              {dashboard.withdrawalRequests.length === 0 && (
                <p className="text-sm text-neutral-500">No withdrawal requests.</p>
              )}
            </div>
          </Panel>
        </div>
      </section>
    </main>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-neutral-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-neutral-200 bg-white p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
