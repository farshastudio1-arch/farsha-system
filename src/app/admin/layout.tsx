import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard - Farsha Studio',
  description: 'Admin dashboard for Farsha Studio catalog and content management.',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
