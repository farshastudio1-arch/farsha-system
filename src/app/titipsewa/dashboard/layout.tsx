import { redirect } from 'next/navigation';

import { getCurrentConsignor } from '@/lib/consignor-session';

export default async function ConsignorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const consignor = await getCurrentConsignor();

  if (!consignor) {
    redirect('/login');
  }

  if (!consignor.termsAcceptedAt) {
    redirect('/terms');
  }

  return <>{children}</>;
}
