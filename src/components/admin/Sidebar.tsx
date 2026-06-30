'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Megaphone, ShoppingBag, Settings } from 'lucide-react';
import LogoutButton from '@/components/admin/LogoutButton';

const navItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Catalog', href: '/admin/catalog', icon: ShoppingBag },
  { name: 'Marketing', href: '/admin/marketing', icon: Megaphone },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-neutral-200 bg-white lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-neutral-200 px-6">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Farsha Studio</h1>
          <span className="ml-2 bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-500">
            Admin
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-6">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                <item.icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-neutral-500'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-neutral-200 p-4">
          <LogoutButton />
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 shadow-sm backdrop-blur lg:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <Link href="/admin" className="min-w-0" aria-label="Farsha Studio admin dashboard">
            <span className="block truncate text-base font-semibold tracking-tight text-neutral-900">
              Farsha Studio
            </span>
            <span className="block font-mono text-[9px] font-bold uppercase tracking-widest text-neutral-400">
              Admin
            </span>
          </Link>
          <LogoutButton variant="compact" />
        </div>

        <nav className="flex gap-2 overflow-x-auto px-3 pb-3">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex min-w-max items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  isActive
                    ? 'bg-neutral-900 text-white'
                    : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </header>
    </>
  );
}
