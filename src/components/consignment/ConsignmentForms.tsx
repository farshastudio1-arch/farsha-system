'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  acceptTermsAction,
  consignorLoginAction,
  consignorLogoutAction,
  consignorRequestResetAction,
  consignorSetPasswordAction,
  requestPayoutAction,
  requestWithdrawalAction,
  resendConsignorInviteAction,
  settlePayoutRequestAction,
  resolveWithdrawalAction,
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
          setFeedback(result.ok ? result.data.consignor.inviteLink : result.error);
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
    <button
      type="button"
      className="border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await resendConsignorInviteAction(consignorId);
          setFeedback(result.ok ? result.data.inviteLink : result.error);
        });
      }}
    >
      Resend invite
      {feedback && <span className="ml-2 text-xs text-neutral-500">{feedback}</span>}
    </button>
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

export function AdminResolveWithdrawalButton({
  requestId,
  status,
}: {
  requestId: string;
  status: 'approved' | 'rejected';
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState('');

  return (
    <button
      type="button"
      className="border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700"
      disabled={pending}
      onClick={() => {
        const adminNote = window.prompt('Admin note') || '';
        startTransition(async () => {
          const result = await resolveWithdrawalAction({ requestId, status, adminNote });
          setFeedback(result.ok ? 'Saved' : result.error);
        });
      }}
    >
      {status === 'approved' ? 'Approve' : 'Reject'}
      {feedback && <span className="ml-2 text-xs text-neutral-500">{feedback}</span>}
    </button>
  );
}

export function PayoutRequestForm() {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState('');

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await requestPayoutAction({
            bankAccountName: String(formData.get('bankAccountName') ?? ''),
            bankName: String(formData.get('bankName') ?? ''),
            bankAccountNumber: String(formData.get('bankAccountNumber') ?? ''),
          });
          setFeedback(result.ok ? `Requested Rp ${result.data.amount.toLocaleString('id-ID')}` : result.error);
        });
      }}
    >
      <Field label="Nama rekening">
        <input name="bankAccountName" className={inputClass()} required />
      </Field>
      <Field label="Bank">
        <input name="bankName" className={inputClass()} required />
      </Field>
      <Field label="No rekening">
        <input name="bankAccountNumber" className={inputClass()} required />
      </Field>
      <button disabled={pending} className={buttonClass()}>
        Request payout
      </button>
      {feedback && <p className="text-sm text-neutral-600">{feedback}</p>}
    </form>
  );
}

export function WithdrawalRequestForm({ itemId }: { itemId: string }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState('');

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await requestWithdrawalAction({
            itemId,
            note: String(formData.get('note') ?? ''),
          });
          setFeedback(result.ok ? `Requested ${result.data.requestId}` : result.error);
        });
      }}
    >
      <Field label="Catatan">
        <textarea name="note" className={inputClass()} rows={3} />
      </Field>
      <button disabled={pending} className={buttonClass()}>
        Request withdrawal
      </button>
      {feedback && <p className="text-sm text-neutral-600">{feedback}</p>}
    </form>
  );
}
