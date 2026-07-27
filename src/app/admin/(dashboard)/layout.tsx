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
    // The sidebar is position:fixed (out of flow), so the main column only needs
    // a left margin to clear it — no flex row. Combining flex-1 with lg:ml-64 used
    // to double-offset the content and push it past the viewport (horizontal scroll).
    <div className="min-h-screen bg-neutral-50">
      <Sidebar />
      <main className="min-h-screen lg:ml-64">{children}</main>
    </div>
  );
}
