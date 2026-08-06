import { redirect } from 'next/navigation';

import { TermsForm } from '@/components/consignment/ConsignmentForms';
import { CONSIGNMENT_TERMS_TEXT, CONSIGNMENT_TERMS_VERSION } from '@/lib/consignment-terms';
import { getCurrentConsignor } from '@/lib/consignor-session';

export default async function ConsignorTermsPage() {
  const consignor = await getCurrentConsignor();

  if (!consignor) {
    redirect('/login');
  }

  if (consignor.termsAcceptedAt) {
    redirect('/dashboard');
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <section className="border border-neutral-200 bg-white p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neutral-500">
          Terms {CONSIGNMENT_TERMS_VERSION}
        </p>
        <h1 className="mt-3 text-2xl font-semibold">Syarat consignment</h1>
        <pre className="mt-6 whitespace-pre-wrap text-sm leading-7 text-neutral-700">{CONSIGNMENT_TERMS_TEXT}</pre>
        <div className="mt-6">
          <TermsForm version={CONSIGNMENT_TERMS_VERSION} />
        </div>
      </section>
    </main>
  );
}
