import { AdminCreateConsignorForm, AdminResolveWithdrawalButton, AdminResendInviteButton, AdminSettlePayoutButton } from '@/components/consignment/ConsignmentForms';
import { getD1Database } from '@/lib/cloudflare';
import { listConsignors } from '@/lib/consignor-db';

type PayoutRequestRow = {
  id: string;
  consignor_id: string;
  amount: number;
  status: string;
  requested_at: string;
  reference: string | null;
};

type WithdrawalRow = {
  id: string;
  consignor_id: string;
  item_name: string;
  item_code: string;
  status: string;
  requested_at: string;
  note: string | null;
};

function currency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

async function loadPendingRequests() {
  try {
    const db = await getD1Database();
    const [payoutRequests, withdrawalRequests] = await Promise.all([
      db
        .prepare(
          `SELECT id, consignor_id, amount, status, requested_at, reference
           FROM consignor_payout_requests
           ORDER BY requested_at DESC`,
        )
        .all<PayoutRequestRow>(),
      db
        .prepare(
          `SELECT wr.id, wr.consignor_id, wr.status, wr.requested_at, wr.note,
            ki.name AS item_name, ki.code AS item_code
           FROM consignor_withdrawal_requests wr
           JOIN kebaya_items ki ON ki.id = wr.item_id
           ORDER BY wr.requested_at DESC`,
        )
        .all<WithdrawalRow>(),
    ]);

    return { payoutRequests: payoutRequests.results, withdrawalRequests: withdrawalRequests.results };
  } catch {
    return { payoutRequests: [], withdrawalRequests: [] };
  }
}

export default async function ConsignmentAdminPage() {
  const [consignors, pending] = await Promise.all([listConsignors(), loadPendingRequests()]);

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      <section className="border border-neutral-200 bg-white p-5">
        <h1 className="text-2xl font-semibold">Consignment</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Provision consignors, send invites, settle payouts, and review withdrawal requests.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="border border-neutral-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Create consignor</h2>
          <div className="mt-4">
            <AdminCreateConsignorForm />
          </div>
        </div>

        <div className="space-y-4">
          {consignors.map((consignor) => (
            <div key={consignor.id} className="border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{consignor.name}</p>
                  <p className="text-sm text-neutral-500">{consignor.email} · {consignor.status}</p>
                </div>
                <AdminResendInviteButton consignorId={consignor.id} />
              </div>
              <div className="mt-3 grid gap-2 text-sm text-neutral-600 sm:grid-cols-3">
                <span>Items {consignor.activeItemCount}</span>
                <span>Accrued {currency(consignor.accruedBalance)}</span>
                <span>Paid {currency(consignor.paidBalance)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="border border-neutral-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Payout requests</h2>
          <div className="mt-4 space-y-3">
            {pending.payoutRequests.map((request) => (
              <div key={request.id} className="border border-neutral-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{currency(request.amount)}</p>
                    <p className="text-sm text-neutral-500">{request.status}</p>
                  </div>
                  {request.status === 'pending' ? (
                    <AdminSettlePayoutButton requestId={request.id} />
                  ) : (
                    <span className="text-sm text-neutral-500">{request.reference ?? '-'}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-neutral-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Withdrawal requests</h2>
          <div className="mt-4 space-y-3">
            {pending.withdrawalRequests.map((request) => (
              <div key={request.id} className="border border-neutral-200 p-4">
                <p className="font-semibold">{request.item_name}</p>
                <p className="text-sm text-neutral-500">{request.item_code} · {request.status}</p>
                <p className="mt-2 text-sm text-neutral-600">{request.note || '-'}</p>
                {request.status === 'pending' && (
                  <div className="mt-3 flex gap-2">
                    <AdminResolveWithdrawalButton requestId={request.id} status="approved" />
                    <AdminResolveWithdrawalButton requestId={request.id} status="rejected" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
