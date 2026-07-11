import PosFittingClient from '@/components/pos/PosFittingClient';
import { listFittingAppointments } from '@/lib/fitting-db';

export default async function PosFittingPage() {
  const appointments = await listFittingAppointments();

  return <PosFittingClient initialAppointments={appointments} />;
}
