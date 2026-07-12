import PosCustomersClient from '@/components/pos/PosCustomersClient';
import { listCustomers } from '@/lib/customer-db';

export default async function PosCustomersPage() {
  const initialCustomers = await listCustomers({ status: 'all', limit: 300 });

  return <PosCustomersClient initialCustomers={initialCustomers} />;
}
