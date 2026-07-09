import PosWorkspaceClient from '@/components/pos/PosWorkspaceClient';
import { listPosLedger } from '@/lib/pos-db';

type PosTransactionsPageProps = {
  searchParams: Promise<{
    transactionId?: string | string[];
  }>;
};

export default async function PosTransactionsPage({ searchParams }: PosTransactionsPageProps) {
  const params = await searchParams;
  const transactionIdParam = Array.isArray(params.transactionId)
    ? params.transactionId[0]
    : params.transactionId;
  const initialLedger = await listPosLedger();

  return <PosWorkspaceClient initialLedger={initialLedger} initialTransactionId={transactionIdParam ?? ''} />;
}
