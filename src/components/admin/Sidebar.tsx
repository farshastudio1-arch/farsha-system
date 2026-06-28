'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Settings, 
  LogOut, 
  FileText
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Catalog', href: '/admin/catalog', icon: ShoppingBag },
  { name: 'CMS', href: '/admin/cms', icon: FileText },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-neutral-200 flex flex-col">
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-neutral-200">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
          Farsha Studio
        </h1>
        <span className="ml-2 text-xs font-medium px-2 py-1 bg-neutral-100 rounded-md text-neutral-500">
          Admin
        </span>
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-4 py-6 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href));
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
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

      <div className="p-4 border-t border-neutral-200">
        <button className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors">
          <LogOut className="h-4 w-4 text-neutral-500" />
          Logout
        </button>
      </div>
    </aside>
  );
}
