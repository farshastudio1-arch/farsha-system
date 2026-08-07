'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  acceptTermsAction,
  consignorLoginAction,
  consignorLogoutAction,
  consignorRequestResetAction,
  consignorSetPasswordAction,
  deleteConsignorAction,
  requestPayoutAction,
  resendConsignorInviteAction,
  settlePayoutRequestAction,
  createConsignorAction,
} from '@/lib/consignor-actions';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-widest text-neutral-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function inputClass() {
  return 'w-full border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-950 outline-none focus:border-neutral-900';
}

function buttonClass() {
  return 'inline-flex items-center justify-center border border-neutral-900 bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50';
}

function inviteFeedback(inviteLink: string, emailSent: boolean) {
  return emailSent
    ? `Activation email sent. Link: ${inviteLink}`
    : `Activation link created, but email was not sent. Configure RESEND_API_KEY and RESEND_FROM. Link: ${inviteLink}`;
}

export function LoginForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError('');
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await consignorLoginAction({
            email: String(formData.get('email') ?? ''),
            password: String(formData.get('password') ?? ''),
          });
          if (result.ok) {
            router.push('/dashboard');
            router.refresh();
          } else {
            setError(result.error);
          }
        });
      }}
    >
      <Field label="Email">
        <input name="email" type="email" className={inputClass()} required />
      </Field>
      <Field label="Password">
        <input name="password" type="password" className={inputClass()} required />
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={pending} className={buttonClass()}>
        Masuk
      </button>
    </form>
  );
}

export function SetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError('');
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          try {
            const result = await consignorSetPasswordAction({
              token,
              password: String(formData.get('password') ?? ''),
            });
            if (result.ok) {
              router.push('/dashboard');
              router.refresh();
            } else {
              setError(result.error);
            }
          } catch {
            setError('Gagal menyimpan password. Refresh halaman ini lalu coba link invite terbaru.');
          }
        });
      }}
    >
      <Field label="Password baru">
        <input name="password" type="password" className={inputClass()} minLength={8} required />
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={pending} className={buttonClass()}>
        Simpan password
      </button>
    </form>
  );
}

export function ForgotForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage('');
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await consignorRequestResetAction({
            email: String(formData.get('email') ?? ''),
          });
          if (result.ok) {
            setMessage('Jika email terdaftar, reset link sudah dikirim.');
          } else {
            setMessage(result.error);
          }
        });
      }}
    >
      <Field label="Email">
        <input name="email" type="email" className={inputClass()} required />
      </Field>
      {message && <p className="text-sm text-neutral-600">{message}</p>}
      <button disabled={pending} className={buttonClass()}>
        Kirim reset link
      </button>
    </form>
  );
}

export function TermsForm({ version }: { version: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError('');
        startTransition(async () => {
          const result = await acceptTermsAction(version);
          if (result.ok) {
            router.push('/dashboard');
            router.refresh();
          } else {
            setError(result.error);
          }
        });
      }}
    >
      <button disabled={pending} className={buttonClass()}>
        Saya setuju
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

export function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await consignorLogoutAction();
          router.push('/login');
          router.refresh();
        });
      }}
    >
      Keluar
    </button>
  );
}

export function AdminCreateConsignorForm() {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string>('');

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await createConsignorAction({
            name: String(formData.get('name') ?? ''),
            email: String(formData.get('email') ?? ''),
            phone: String(formData.get('phone') ?? ''),
          });
          setFeedback(
            result.ok
              ? inviteFeedback(result.data.consignor.inviteLink, result.data.inviteEmailSent)
              : result.error,
          );
        });
      }}
    >
      <Field label="Nama">
        <input name="name" className={inputClass()} required />
      </Field>
      <Field label="Email">
        <input name="email" type="email" className={inputClass()} required />
      </Field>
      <Field label="Telepon">
        <input name="phone" className={inputClass()} />
      </Field>
      <button disabled={pending} className={buttonClass()}>
        Buat consignor
      </button>
      {feedback && <p className="break-all text-sm text-neutral-600">{feedback}</p>}
    </form>
  );
}

export function AdminResendInviteButton({ consignorId }: { consignorId: string }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState('');

  return (
    <div className="max-w-full text-left sm:text-right">
      <button
        type="button"
        className="border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const result = await resendConsignorInviteAction(consignorId);
            setFeedback(
              result.ok
                ? inviteFeedback(result.data.inviteLink, result.data.inviteEmailSent)
                : result.error,
            );
          });
        }}
      >
        Resend invite
      </button>
      {feedback && <p className="mt-2 max-w-xs break-all text-xs text-neutral-500">{feedback}</p>}
    </div>
  );
}

export function AdminSettlePayoutButton({ requestId }: { requestId: string }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState('');

  return (
    <button
      type="button"
      className="border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700"
      disabled={pending}
      onClick={() => {
        const reference = window.prompt('Transfer reference') || '';
        if (!reference) {
          return;
        }

        startTransition(async () => {
          const result = await settlePayoutRequestAction({ requestId, reference });
          setFeedback(result.ok ? 'Settled' : result.error);
        });
      }}
    >
      Settle
      {feedback && <span className="ml-2 text-xs text-neutral-500">{feedback}</span>}
    </button>
  );
}

export function AdminDeleteConsignorButton({
  consignorId,
  consignorName,
}: {
  consignorId: string;
  consignorName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState('');

  if (!armed) {
    return (
      <button
        type="button"
        className="border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50"
        onClick={() => setArmed(true)}
      >
        Hapus akun
      </button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <p className="max-w-xs text-xs text-rose-700">
        Hapus <strong>{consignorName}</strong> permanen? Riwayat payout ikut terhapus dan baju titipan
        dilepas ke studio. Aksi ini tidak bisa dibatalkan.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          className="border border-rose-600 bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
          onClick={() => {
            setError('');
            startTransition(async () => {
              const result = await deleteConsignorAction(consignorId);
              if (result.ok) {
                router.refresh();
              } else {
                setError(result.error);
                setArmed(false);
              }
            });
          }}
        >
          {pending ? 'Menghapus…' : 'Hapus permanen'}
        </button>
        <button
          type="button"
          disabled={pending}
          className="border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700"
          onClick={() => setArmed(false)}
        >
          Batal
        </button>
      </div>
      {error && <span className="text-xs text-rose-700">{error}</span>}
    </div>
  );
}

export function PayoutRequestForm({
  method = 'bank',
  defaultAccountName = '',
  defaultInstitution = '',
  defaultNumber = '',
}: {
  method?: 'bank' | 'ewallet';
  defaultAccountName?: string;
  defaultInstitution?: string;
  defaultNumber?: string;
} = {}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const isEwallet = method === 'ewallet';

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setFeedback(null);
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await requestPayoutAction({
            bankAccountName: String(formData.get('bankAccountName') ?? ''),
            bankName: String(formData.get('bankName') ?? ''),
            bankAccountNumber: String(formData.get('bankAccountNumber') ?? ''),
          });
          if (result.ok) {
            setFeedback({
              tone: 'ok',
              text: `Pencairan Rp ${result.data.amount.toLocaleString('id-ID')} sedang diproses.`,
            });
            router.refresh();
          } else {
            setFeedback({ tone: 'err', text: result.error });
          }
        });
      }}
    >
      <Field label={isEwallet ? 'Nama pemilik' : 'Nama rekening'}>
        <input name="bankAccountName" className={inputClass()} defaultValue={defaultAccountName} required />
      </Field>
      <Field label={isEwallet ? 'E-wallet (GoPay/OVO/DANA/…)' : 'Bank'}>
        <input name="bankName" className={inputClass()} defaultValue={defaultInstitution} required />
      </Field>
      <Field label={isEwallet ? 'Nomor e-wallet' : 'No rekening'}>
        <input
          name="bankAccountNumber"
          inputMode="numeric"
          className={inputClass()}
          defaultValue={defaultNumber}
          required
        />
      </Field>
      <button disabled={pending} className={`${buttonClass()} w-full`}>
        {pending ? 'Memproses…' : 'Cairkan sekarang'}
      </button>
      {feedback && (
        <p className={`text-sm ${feedback.tone === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>
          {feedback.text}
        </p>
      )}
    </form>
  );
}

