'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  consignorChangePasswordAction,
  consignorUpdateAvatarAction,
  consignorUpdateNameAction,
  consignorUpdateProfileAction,
} from '@/lib/consignor-actions';

type Feedback = { tone: 'ok' | 'err'; text: string } | null;

function fieldLabelClass() {
  return 'mb-1 block text-xs font-semibold uppercase tracking-widest text-neutral-500';
}

function inputClass() {
  return 'w-full border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-950 outline-none focus:border-neutral-900';
}

function primaryButtonClass() {
  return 'inline-flex w-full items-center justify-center border border-neutral-900 bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50';
}

function FeedbackLine({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <p className={`text-sm ${feedback.tone === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>
      {feedback.text}
    </p>
  );
}

export function DisplayNameForm({ currentName }: { currentName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setFeedback(null);
        const name = String(new FormData(event.currentTarget).get('name') ?? '');
        startTransition(async () => {
          const result = await consignorUpdateNameAction({ name });
          if (result.ok) {
            setFeedback({ tone: 'ok', text: 'Nama tersimpan.' });
            router.refresh();
          } else {
            setFeedback({ tone: 'err', text: result.error });
          }
        });
      }}
    >
      <label className="block">
        <span className={fieldLabelClass()}>Nama tampilan</span>
        <input name="name" className={inputClass()} defaultValue={currentName} maxLength={60} required />
      </label>
      <button disabled={pending} className={primaryButtonClass()}>
        {pending ? 'Menyimpan…' : 'Simpan nama'}
      </button>
      <FeedbackLine feedback={feedback} />
    </form>
  );
}

export function AvatarPicker({
  options,
  currentSeed,
}: {
  options: { seed: string; svg: string }[];
  currentSeed: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [selected, setSelected] = useState(currentSeed);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {options.map((option) => {
          const isActive = option.seed === selected;
          return (
            <button
              key={option.seed}
              type="button"
              aria-pressed={isActive}
              aria-label={`Avatar ${option.seed}`}
              onClick={() => setSelected(option.seed)}
              className={`theme-soft-surface relative aspect-square overflow-hidden border transition-all ${
                isActive
                  ? 'border-[var(--theme-primary)] ring-2 ring-[var(--theme-primary)]'
                  : 'border-[var(--theme-border)] hover:border-[var(--theme-accent)]'
              }`}
            >
              <span
                className="block h-full w-full [&>svg]:h-full [&>svg]:w-full"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: option.svg }}
              />
            </button>
          );
        })}
      </div>
      <button
        disabled={pending || selected === currentSeed}
        className={primaryButtonClass()}
        onClick={() => {
          setFeedback(null);
          startTransition(async () => {
            const result = await consignorUpdateAvatarAction({ seed: selected });
            if (result.ok) {
              setFeedback({ tone: 'ok', text: 'Avatar tersimpan.' });
              router.refresh();
            } else {
              setFeedback({ tone: 'err', text: result.error });
            }
          });
        }}
      >
        {pending ? 'Menyimpan…' : 'Simpan avatar'}
      </button>
      <FeedbackLine feedback={feedback} />
    </div>
  );
}

export function PayoutDetailsForm({
  defaultMethod,
  defaultAccountName,
  defaultInstitution,
  defaultNumber,
}: {
  defaultMethod: 'bank' | 'ewallet';
  defaultAccountName: string;
  defaultInstitution: string;
  defaultNumber: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [method, setMethod] = useState<'bank' | 'ewallet'>(defaultMethod);
  const isEwallet = method === 'ewallet';

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setFeedback(null);
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await consignorUpdateProfileAction({
            payoutMethod: method,
            bankAccountName: String(formData.get('bankAccountName') ?? ''),
            bankName: String(formData.get('bankName') ?? ''),
            bankAccountNumber: String(formData.get('bankAccountNumber') ?? ''),
          });
          if (result.ok) {
            setFeedback({ tone: 'ok', text: 'Detail pembayaran tersimpan.' });
            router.refresh();
          } else {
            setFeedback({ tone: 'err', text: result.error });
          }
        });
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        {(['bank', 'ewallet'] as const).map((value) => {
          const active = method === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => setMethod(value)}
              className={`border px-3 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors ${
                active
                  ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)] text-[var(--theme-background)]'
                  : 'border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)]'
              }`}
            >
              {value === 'bank' ? 'Bank' : 'E-Wallet'}
            </button>
          );
        })}
      </div>

      <label className="block">
        <span className={fieldLabelClass()}>{isEwallet ? 'Nama pemilik' : 'Nama rekening'}</span>
        <input name="bankAccountName" className={inputClass()} defaultValue={defaultAccountName} required />
      </label>
      <label className="block">
        <span className={fieldLabelClass()}>
          {isEwallet ? 'E-wallet (GoPay/OVO/DANA/…)' : 'Bank'}
        </span>
        <input name="bankName" className={inputClass()} defaultValue={defaultInstitution} required />
      </label>
      <label className="block">
        <span className={fieldLabelClass()}>{isEwallet ? 'Nomor e-wallet' : 'No rekening'}</span>
        <input
          name="bankAccountNumber"
          inputMode="numeric"
          className={inputClass()}
          defaultValue={defaultNumber}
          required
        />
      </label>
      <button disabled={pending} className={primaryButtonClass()}>
        {pending ? 'Menyimpan…' : 'Simpan detail pembayaran'}
      </button>
      <FeedbackLine feedback={feedback} />
    </form>
  );
}

export function ChangePasswordForm() {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setFeedback(null);
        const form = event.currentTarget;
        const formData = new FormData(form);
        const newPassword = String(formData.get('newPassword') ?? '');
        const confirmPassword = String(formData.get('confirmPassword') ?? '');
        if (newPassword !== confirmPassword) {
          setFeedback({ tone: 'err', text: 'Konfirmasi password tidak cocok.' });
          return;
        }
        startTransition(async () => {
          const result = await consignorChangePasswordAction({
            currentPassword: String(formData.get('currentPassword') ?? ''),
            newPassword,
          });
          if (result.ok) {
            setFeedback({ tone: 'ok', text: 'Password berhasil diubah.' });
            form.reset();
          } else {
            setFeedback({ tone: 'err', text: result.error });
          }
        });
      }}
    >
      <label className="block">
        <span className={fieldLabelClass()}>Password saat ini</span>
        <input name="currentPassword" type="password" className={inputClass()} required />
      </label>
      <label className="block">
        <span className={fieldLabelClass()}>Password baru</span>
        <input name="newPassword" type="password" className={inputClass()} minLength={8} required />
      </label>
      <label className="block">
        <span className={fieldLabelClass()}>Ulangi password baru</span>
        <input name="confirmPassword" type="password" className={inputClass()} minLength={8} required />
      </label>
      <button disabled={pending} className={primaryButtonClass()}>
        {pending ? 'Menyimpan…' : 'Ubah password'}
      </button>
      <FeedbackLine feedback={feedback} />
    </form>
  );
}
