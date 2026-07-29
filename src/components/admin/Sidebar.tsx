'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  FileText,
  Images,
  LayoutDashboard,
  Megaphone,
  Newspaper,
  ShoppingBag,
  Sparkles,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import LogoutButton from '@/components/admin/LogoutButton';

type NavChild = { name: string; href: string };
type NavLeaf = { name: string; href: string; icon: LucideIcon };
type NavGroup = { name: string; basePath: string; icon: LucideIcon; children: NavChild[] };
type NavEntry = NavLeaf | NavGroup;

const navItems: NavEntry[] = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  {
    name: 'Catalog',
    basePath: '/admin/catalog',
    icon: ShoppingBag,
    children: [
      { name: 'Overview', href: '/admin/catalog' },
      { name: 'Products', href: '/admin/catalog/products' },
      { name: 'Upcoming', href: '/admin/catalog/upcoming' },
      { name: 'Report', href: '/admin/catalog/report' },
    ],
  },
  { name: 'CMS', href: '/admin/cms', icon: FileText },
  { name: 'Blog', href: '/admin/blog', icon: Newspaper },
  { name: 'Media', href: '/admin/media', icon: Images },
  { name: 'Marketing', href: '/admin/marketing', icon: Megaphone },
  { name: 'Name Generator', href: '/admin/name-generator', icon: Sparkles },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

function isGroup(entry: NavEntry): entry is NavGroup {
  return 'children' in entry;
}

function isActivePath(pathname: string | null, href: string) {
  return pathname === href || (href !== '/admin' && Boolean(pathname?.startsWith(href)));
}

// Overview shares the section root, so it must match exactly; deeper links match
// exactly or by prefix (e.g. a future /products/[id] still lights up Products).
function isActiveChild(pathname: string | null, href: string, basePath: string) {
  if (href === basePath) {
    return pathname === basePath;
  }

  return pathname === href || Boolean(pathname?.startsWith(`${href}/`));
}

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2';

export default function Sidebar() {
  const pathname = usePathname();
  const activeMobileItemRef = useRef<HTMLAnchorElement>(null);

  // User-controlled expand for when you're *outside* the section. Inside the
  // section the group is forced open in render (`open = catalogOpen || sectionActive`),
  // so no effect is needed to auto-expand on navigation.
  const [catalogOpen, setCatalogOpen] = useState(false);

  // Keep the current section visible in the horizontally-scrolling mobile nav.
  useEffect(() => {
    activeMobileItemRef.current?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [pathname]);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-neutral-200 bg-white lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-neutral-200 px-6">
          <span className="text-xl font-semibold tracking-tight text-neutral-900">Farsha Studio</span>
          <span className="ml-2 bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-500">
            Admin
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-6">
          {navItems.map((entry) => {
            if (isGroup(entry)) {
              const sectionActive = Boolean(pathname?.startsWith(entry.basePath));
              const open = catalogOpen || sectionActive;

              return (
                <div key={entry.name}>
                  <button
                    type="button"
                    onClick={() => setCatalogOpen((value) => !value)}
                    aria-expanded={open}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${focusRing} ${
                      sectionActive
                        ? 'text-neutral-900'
                        : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                    }`}
                  >
                    <entry.icon
                      className={`h-4 w-4 ${sectionActive ? 'text-neutral-900' : 'text-neutral-500'}`}
                    />
                    {entry.name}
                    <ChevronDown
                      className={`ml-auto h-4 w-4 text-neutral-400 transition-transform ${
                        open ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {open && (
                    <div className="mt-1 flex flex-col gap-1 border-l border-neutral-200 pl-3">
                      {entry.children.map((child) => {
                        const childActive = isActiveChild(pathname, child.href, entry.basePath);

                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            aria-current={childActive ? 'page' : undefined}
                            className={`px-3 py-2 text-sm font-medium transition-colors ${focusRing} ${
                              childActive
                                ? 'bg-neutral-900 text-white'
                                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                            }`}
                          >
                            {child.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = isActivePath(pathname, entry.href);

            return (
              <Link
                key={entry.name}
                href={entry.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${focusRing} ${
                  isActive
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                <entry.icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-neutral-500'}`} />
                {entry.name}
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
          <Link
            href="/admin"
            className={`min-w-0 ${focusRing}`}
            aria-label="Farsha Studio admin dashboard"
          >
            <span className="block truncate text-base font-semibold tracking-tight text-neutral-900">
              Farsha Studio
            </span>
            <span className="block font-mono text-[9px] font-bold uppercase tracking-widest text-neutral-500">
              Admin
            </span>
          </Link>
          <LogoutButton variant="compact" />
        </div>

        <nav className="flex gap-2 overflow-x-auto px-3 pb-3">
          {navItems.map((entry) => {
            if (isGroup(entry)) {
              const sectionActive = Boolean(pathname?.startsWith(entry.basePath));

              // Collapsed to a single pill until you enter the section, then the
              // sub-pages fan out inline so the mobile bar stays shallow.
              if (!sectionActive) {
                return (
                  <Link
                    key={entry.name}
                    href={entry.basePath}
                    className={`flex min-w-max items-center gap-2 border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-600 transition-colors ${focusRing} hover:bg-neutral-50 hover:text-neutral-900`}
                  >
                    <entry.icon className="h-3.5 w-3.5" />
                    {entry.name}
                  </Link>
                );
              }

              return entry.children.map((child, index) => {
                const childActive = isActiveChild(pathname, child.href, entry.basePath);

                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    ref={childActive ? activeMobileItemRef : undefined}
                    aria-current={childActive ? 'page' : undefined}
                    className={`flex min-w-max items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${focusRing} ${
                      childActive
                        ? 'bg-neutral-900 text-white'
                        : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                    }`}
                  >
                    {index === 0 && <entry.icon className="h-3.5 w-3.5" />}
                    {entry.name} · {child.name}
                  </Link>
                );
              });
            }

            const isActive = isActivePath(pathname, entry.href);

            return (
              <Link
                key={entry.name}
                href={entry.href}
                ref={isActive ? activeMobileItemRef : undefined}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-w-max items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${focusRing} ${
                  isActive
                    ? 'bg-neutral-900 text-white'
                    : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                }`}
              >
                <entry.icon className="h-3.5 w-3.5" />
                {entry.name}
              </Link>
            );
          })}
        </nav>
      </header>
    </>
  );
}
