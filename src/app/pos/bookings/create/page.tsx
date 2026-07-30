import PosBookingCreateClient from '@/components/pos/PosBookingCreateClient';
import { listCatalogItems } from '@/lib/farsha-db';

interface PosBookingCreatePageProps {
  searchParams: Promise<{
    itemId?: string | string[];
  }>;
}

export default async function PosBookingCreatePage({ searchParams }: PosBookingCreatePageProps) {
  const params = await searchParams;
  const itemIdParam = Array.isArray(params.itemId) ? params.itemId[0] : params.itemId;
  const catalogItems = await listCatalogItems({ includeUnpublished: true });

  return <PosBookingCreateClient initialItems={catalogItems} initialItemId={itemIdParam ?? ''} />;
}
