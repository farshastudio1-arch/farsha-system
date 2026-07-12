'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarCheck,
  CalendarDays,
  LayoutDashboard,
  LineChart,
  ReceiptText,
  ShoppingBag,
  Store,
  Users,
} from 'lucide-react';

import LogoutButton from '@/components/admin/LogoutButton';

const navItems = [
  {
    href: '/pos',
    label: 'Dashboard',
    description: 'Daily overview',
    icon: LayoutDashboard,
  },
  {
    href: '/pos/transactions',
    label: 'Transactions',
    description: 'Cashier workflow',
    icon: ReceiptText,
  },
  {
    href: '/pos/bookings',
    label: 'Bookings',
    description: 'Booking control',
    icon: CalendarCheck,
  },
  {
    href: '/pos/customers',
    label: 'Customers',
    description: 'Customer control',
    icon: Users,
  },
  {
    href: '/pos/fitting',
    label: 'Fitting',
    description: 'Schedule control',
    icon: CalendarDays,
  },
  {
    href: '/pos/finance',
    label: 'Finance',
    description: 'Read-only report',
    icon: LineChart,
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === '/pos') {
    return pathname === '/pos' || pathname === '/pos/dashboard';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function PosShellNav() {
  const pathname = usePathname();

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-neutral-200 bg-white lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-neutral-200 px-5">
          <div className="flex h-9 w-9 items-center justify-center border border-neutral-900 bg-neutral-950 text-white">
            <Store className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-950">Farsha POS</p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">Operations</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 border px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'border-neutral-900 bg-neutral-950 text-white'
                    : 'border-transparent text-neutral-600 hover:border-neutral-200 hover:bg-neutral-50 hover:text-neutral-950'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-neutral-400'}`} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{item.label}</span>
                  <span className={`block text-[11px] ${isActive ? 'text-neutral-300' : 'text-neutral-400'}`}>
                    {item.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-neutral-200 p-3">
          <Link
            href="/"
            className="flex items-center gap-3 border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-950"
          >
            <ShoppingBag className="h-4 w-4 text-neutral-400" />
            Storefront
          </Link>
          <LogoutButton variant="compact" />
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white lg:hidden">
        <div className="flex h-14 items-center justify-between px-3">
          <Link href="/pos" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center bg-neutral-950 text-white">
              <Store className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-neutral-950">Farsha POS</span>
          </Link>
          <LogoutButton variant="pos" />
        </div>
        <nav className="flex gap-2 overflow-x-auto border-t border-neutral-100 px-3 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex min-h-9 shrink-0 items-center gap-2 border px-3 text-xs font-semibold uppercase tracking-wider ${
                  isActive
                    ? 'border-neutral-900 bg-neutral-950 text-white'
                    : 'border-neutral-200 bg-white text-neutral-600'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
    </>
  );
}
