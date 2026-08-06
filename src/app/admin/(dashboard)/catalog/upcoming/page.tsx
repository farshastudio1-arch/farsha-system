import CatalogWorkbench from '@/components/admin/catalog/CatalogWorkbench';
import { listConsignors } from '@/lib/consignor-db';

export default async function CatalogUpcomingPage() {
  const consignors = await listConsignors();

  return (
    <CatalogWorkbench
      mode="draft"
      consignorOptions={consignors.map((consignor) => ({
        id: consignor.id,
        name: consignor.name,
        email: consignor.email,
      }))}
    />
  );
}
