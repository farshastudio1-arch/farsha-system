import { auth } from '../../../../../../../auth';
import { getPosFinanceSummary, makeFinancePeriod } from '@/lib/pos-finance';

export const dynamic = 'force-dynamic';

function getParamValue(value: string | null) {
  return value ?? undefined;
}

function csvCell(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? '' : String(value);

  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const session = await auth();

  if (session?.user?.role !== 'admin') {
    return Response.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  const url = new URL(request.url);
  const period = makeFinancePeriod({
    preset: getParamValue(url.searchParams.get('preset')),
    fromDate: getParamValue(url.searchParams.get('from')),
    toDate: getParamValue(url.searchParams.get('to')),
  });
  const finance = await getPosFinanceSummary(period);
  const headers = [
    'date',
    'source_type',
    'source_number',
    'accounting_type',
    'customer_or_vendor',
    'description',
    'payment_method',
    'cash_in',
    'cash_out',
    'revenue',
    'deposit_liability',
    'expense',
  ];
  const rows = finance.activity.map((entry) => [
    entry.occurredAt.slice(0, 10),
    entry.sourceType,
    entry.sourceNumber,
    entry.accountingType,
    entry.customerName,
    entry.description,
    entry.paymentMethod,
    Math.max(entry.cashAmount, 0),
    Math.max(-entry.cashAmount, 0),
    entry.revenueAmount,
    entry.depositAmount,
    entry.expenseAmount,
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
  const filename = `farsha-finance-${period.fromDate}-to-${period.toDate}.csv`;

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
