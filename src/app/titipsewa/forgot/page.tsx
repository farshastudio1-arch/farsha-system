import Link from 'next/link';

import { ForgotForm } from '@/components/consignment/ConsignmentForms';

export default function ConsignorForgotPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <div className="w-full border border-neutral-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neutral-500">Reset</p>
        <h1 className="mt-3 text-2xl font-semibold">Lupa password</h1>
        <div className="mt-6">
          <ForgotForm />
        </div>
        <div className="mt-6">
          <Link href="/login" className="text-sm text-neutral-600 underline">
            Kembali ke login
          </Link>
        </div>
      </div>
    </main>
  );
}
