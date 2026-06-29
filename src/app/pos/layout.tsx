import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Store } from 'lucide-react';
import LogoutButton from '@/components/admin/LogoutButton';
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
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Store className="h-6 w-6 text-indigo-600 mr-2" />
              <span className="font-semibold text-xl tracking-tight text-gray-900 mr-8">
                Farsha PoS
              </span>
              <nav className="hidden md:flex space-x-6">
                <Link
                  href="/pos"
                  className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
                >
                  Katalog
                </Link>
                <Link
                  href="/pos/reports"
                  className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
                >
                  Laporan
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center transition-colors"
              >
                Storefront
              </Link>
              <LogoutButton variant="pos" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
