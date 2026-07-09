import { permanentRedirect } from 'next/navigation';

export default async function PosDashboardPage() {
  permanentRedirect('/pos');
}
