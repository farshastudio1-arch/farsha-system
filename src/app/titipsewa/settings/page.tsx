import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

import {
  AvatarPicker,
  ChangePasswordForm,
  DisplayNameForm,
  PayoutDetailsForm,
} from '@/components/consignment/AccountSettingsForms';
import { AVATAR_SEED_OPTIONS, crittersAvatarSvg, resolveAvatarSeed } from '@/lib/consignor-avatar';
import { getCurrentConsignor } from '@/lib/consignor-session';

export default async function ConsignorSettingsPage() {
  const consignor = await getCurrentConsignor();

  if (!consignor) {
    redirect('/login');
  }

  if (!consignor.termsAcceptedAt) {
    redirect('/terms');
  }

  const currentSeed = resolveAvatarSeed(consignor);
  const seedList = [currentSeed, ...AVATAR_SEED_OPTIONS.filter((seed) => seed !== currentSeed)];
  const avatarOptions = seedList.map((seed) => ({ seed, svg: crittersAvatarSvg(seed, 96) }));
  const currentAvatarSvg = crittersAvatarSvg(currentSeed, 128);

  return (
    <div className="theme-surface flex min-h-screen flex-col font-sans antialiased">
      <header className="theme-surface theme-border sticky top-0 z-40 border-b bg-[color-mix(in_srgb,var(--theme-surface)_88%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <Link
            href="/dashboard"
            aria-label="Kembali ke dashboard"
            className="theme-border flex h-9 w-9 shrink-0 items-center justify-center border"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
          <div className="min-w-0">
            <p className="theme-muted font-mono text-[9px] font-bold uppercase tracking-[0.3em]">
              Farsha Consign
            </p>
            <p className="truncate font-display text-sm font-semibold text-[var(--theme-text)]">
              Pengaturan akun
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-grow space-y-8 px-4 py-6 sm:py-8">
        {/* Profile */}
        <Section title="Profil" desc="Nama dan avatar yang tampil di dashboard kamu.">
          <div className="flex items-center gap-4">
            <div
              className="theme-soft-surface theme-border h-20 w-20 shrink-0 overflow-hidden border [&>svg]:h-full [&>svg]:w-full"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: currentAvatarSvg }}
            />
            <div className="min-w-0">
              <p className="font-display text-lg font-semibold text-[var(--theme-text)]">
                {consignor.name}
              </p>
              <p className="theme-muted truncate text-sm">{consignor.email}</p>
            </div>
          </div>

          <div className="mt-6">
            <DisplayNameForm currentName={consignor.name} />
          </div>

          <div className="mt-8">
            <p className="theme-muted-strong mb-3 font-mono text-[10px] font-bold uppercase tracking-widest">
              Pilih avatar
            </p>
            <AvatarPicker options={avatarOptions} currentSeed={currentSeed} />
          </div>
        </Section>

        {/* Payout details */}
        <Section
          title="Detail pembayaran"
          desc="Tujuan pencairan penghasilan. Pilih transfer bank atau e-wallet."
        >
          <PayoutDetailsForm
            defaultMethod={consignor.payoutMethod}
            defaultAccountName={consignor.bankAccountName ?? ''}
            defaultInstitution={consignor.bankName ?? ''}
            defaultNumber={consignor.bankAccountNumber ?? ''}
          />
        </Section>

        {/* Security */}
        <Section title="Keamanan" desc="Ubah password login akun partner kamu.">
          <ChangePasswordForm />
        </Section>
      </main>
    </div>
  );
}

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section className="theme-surface theme-border border p-5 sm:p-6">
      <h2 className="font-display text-base font-semibold text-[var(--theme-text)]">{title}</h2>
      <p className="theme-muted mt-1 text-[13px] leading-relaxed">{desc}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}
