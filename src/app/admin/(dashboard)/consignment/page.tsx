import ConsignmentAdmin from '@/components/consignment/ConsignmentAdmin';
import { listConsignorPayoutRequests, listConsignors } from '@/lib/consignor-db';

export default async function ConsignmentAdminPage() {
  const [consignors, payoutRequests] = await Promise.all([
    listConsignors(),
    listConsignorPayoutRequests(),
  ]);

  return <ConsignmentAdmin consignors={consignors} payoutRequests={payoutRequests} />;
}
