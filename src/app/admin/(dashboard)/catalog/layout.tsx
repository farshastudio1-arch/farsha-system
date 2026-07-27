import { CatalogDataProvider } from '@/components/admin/catalog/CatalogDataProvider';

// Shared data + navigation shell for every /admin/catalog sub-page. The provider
// stays mounted across Overview / Products / Upcoming / Report navigation, so the
// catalog, ledger, and booking snapshot load once for the whole section.
export default function CatalogSectionLayout({ children }: { children: React.ReactNode }) {
  return <CatalogDataProvider>{children}</CatalogDataProvider>;
}
