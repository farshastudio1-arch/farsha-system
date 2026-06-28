import type { Metadata } from 'next';
import Sidebar from '@/components/admin/Sidebar';

export const metadata: Metadata = {
  title: 'Admin Dashboard - Farsha Studio',
  description: 'Admin dashboard for Farsha Studio catalog and content management.',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}
