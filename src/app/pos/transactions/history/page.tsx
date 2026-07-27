import PosWorkspaceClient from '@/components/pos/PosWorkspaceClient';
import { listPosLedger } from '@/lib/pos-db';

export default async function PosTransactionsHistoryPage() {
  const initialLedger = await listPosLedger();

  return <PosWorkspaceClient initialLedger={initialLedger} mode="history" />;
}
