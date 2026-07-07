import PosWorkspaceClient from '@/components/pos/PosWorkspaceClient';
import { listPosLedger } from '@/lib/pos-db';

export default async function PosPage() {
  const initialLedger = await listPosLedger();

  return <PosWorkspaceClient initialLedger={initialLedger} />;
}
