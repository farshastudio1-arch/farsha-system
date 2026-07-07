import PosDashboardClient from '@/components/pos/PosDashboardClient';
import { listPosLedger } from '@/lib/pos-db';

export default async function PosDashboardPage() {
  const initialLedger = await listPosLedger();

  return <PosDashboardClient initialLedger={initialLedger} />;
}
