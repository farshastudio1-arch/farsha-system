import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import PosShellNav from '@/components/pos/PosShellNav';
import { auth } from '../../../auth';

export const metadata: Metadata = {
  title: 'PoS - Farsha Studio',
  description: 'Point of Sale interface for Farsha Studio',
};

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (session?.user?.role !== 'admin') {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen bg-neutral-100 font-sans text-neutral-950">
      <PosShellNav />
      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-[1480px] px-3 py-4 sm:px-4 lg:px-6 lg:py-5">
          {children}
        </div>
      </main>
    </div>
  );
}
