import Link from 'next/link';

import { LoginForm } from '@/components/consignment/ConsignmentForms';

export default function ConsignorLoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <div className="w-full border border-neutral-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neutral-500">Consignor login</p>
        <h1 className="mt-3 text-2xl font-semibold">Masuk dashboard</h1>
        <div className="mt-6">
          <LoginForm />
        </div>
        <div className="mt-6 flex items-center justify-between text-sm">
          <Link href="/forgot" className="text-neutral-600 underline">
            Lupa password
          </Link>
          <Link href="/" className="text-neutral-600 underline">
            Kembali
          </Link>
        </div>
      </div>
    </main>
  );
}
