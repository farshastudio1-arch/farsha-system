import CatalogWorkbench from '@/components/admin/catalog/CatalogWorkbench';
import { listConsignors } from '@/lib/consignor-db';

export default async function CatalogProductsPage() {
  const consignors = await listConsignors();

  return (
    <CatalogWorkbench
      mode="published"
      consignorOptions={consignors.map((consignor) => ({
        id: consignor.id,
        name: consignor.name,
        email: consignor.email,
      }))}
    />
  );
}
