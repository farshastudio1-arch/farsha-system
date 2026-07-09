import PosDashboardClient from '@/components/pos/PosDashboardClient';
import { getPosFinanceSummary } from '@/lib/pos-finance';
import { listPosLedger } from '@/lib/pos-db';

export default async function PosPage() {
  const [initialLedger, financeSummary] = await Promise.all([
    listPosLedger(),
    getPosFinanceSummary(),
  ]);

  return <PosDashboardClient initialLedger={initialLedger} financeSummary={financeSummary} />;
}
