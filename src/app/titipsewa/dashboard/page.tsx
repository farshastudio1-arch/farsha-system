import { redirect } from 'next/navigation';

import ConsignorDashboard from '@/components/consignment/ConsignorDashboard';
import { getConsignorDashboard } from '@/lib/consignor-db';
import { getCurrentConsignor } from '@/lib/consignor-session';

export default async function ConsignorDashboardPage() {
  const consignor = await getCurrentConsignor();

  if (!consignor) {
    redirect('/login');
  }

  const dashboard = await getConsignorDashboard(consignor.id);

  if (!dashboard) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center text-sm text-neutral-500">
        Dashboard tidak ditemukan.
      </main>
    );
  }

  return <ConsignorDashboard dashboard={dashboard} />;
}
