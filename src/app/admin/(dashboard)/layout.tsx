import { redirect } from 'next/navigation';

import { auth } from '../../../../auth';
import Sidebar from '@/components/admin/Sidebar';

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (session?.user?.role !== 'admin') {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen bg-neutral-50 lg:flex">
      <Sidebar />
      <main className="min-h-screen flex-1 lg:ml-64">{children}</main>
    </div>
  );
}
