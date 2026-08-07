'use server';

import { revalidatePath } from 'next/cache';

import { auth } from '../../auth';
import { hashPassword, verifyPassword } from '@/lib/consignor-crypto';
import {
  consumeConsignorToken,
  createConsignor,
  createConsignorToken,
  deleteConsignor,
  getConsignorByEmail,
  getConsignorById,
  getConsignorDashboard,
  listConsignors,
  requestConsignorPayout,
  setConsignorPassword,
  settleConsignorPayoutRequest,
  updateConsignorAvatar,
  updateConsignorDisplayName,
  updateConsignorProfile,
  updateConsignorTerms,
  type ConsignorDashboard,
  type ConsignorPayoutMethod,
  type ConsignorWithInvite,
} from '@/lib/consignor-db';
import {
  buildConsignorInviteLink,
  buildConsignorResetLink,
  sendConsignorInvite,
  sendConsignorReset,
} from '@/lib/email';
import { CONSIGNMENT_TERMS_VERSION } from '@/lib/consignment-terms';
import { clearConsignorSessionCookie, createConsignorSessionCookie, getCurrentConsignor } from '@/lib/consignor-session';

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function ensureAdmin() {
  const session = await auth();

  if (session?.user?.role !== 'admin') {
    throw new Error('Unauthorized');
  }
}

async function ensureConsignor() {
  const consignor = await getCurrentConsignor();

  if (!consignor) {
    throw new Error('Unauthorized');
  }

  return consignor;
}

function revalidateConsignment() {
  revalidatePath('/');
  revalidatePath('/titipsewa');
  revalidatePath('/titipsewa/login');
  revalidatePath('/titipsewa/forgot');
  revalidatePath('/titipsewa/set-password');
  revalidatePath('/titipsewa/dashboard');
  revalidatePath('/titipsewa/settings');
  revalidatePath('/titipsewa/terms');
  revalidatePath('/admin/consignment');
}

export async function createConsignorAction(input: {
  name: string;
  email: string;
  phone: string;
}): Promise<ActionResult<{ consignor: ConsignorWithInvite; inviteEmailSent: boolean }>> {
  try {
    await ensureAdmin();
    const consignor = await createConsignor(input);
    const token = await createConsignorToken({
      consignorId: consignor.id,
      purpose: 'set_password',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    });
    const inviteLink = buildConsignorInviteLink(token.token);
    const inviteEmail = await sendConsignorInvite(consignor.email, inviteLink);

    revalidateConsignment();

    return {
      ok: true,
      data: {
        consignor: { ...consignor, inviteToken: token.token, inviteLink },
        inviteEmailSent: inviteEmail.sent,
      },
    };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, 'Failed to create consignor.') };
  }
}

export async function resendConsignorInviteAction(
  consignorId: string,
): Promise<ActionResult<{ inviteLink: string; inviteEmailSent: boolean }>> {
  try {
    await ensureAdmin();
    const consignor = await getConsignorById(consignorId);

    if (!consignor) {
      throw new Error('Consignor not found.');
    }

    const token = await createConsignorToken({
      consignorId,
      purpose: 'set_password',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    });
    const inviteLink = buildConsignorInviteLink(token.token);
    const inviteEmail = await sendConsignorInvite(consignor.email, inviteLink);

    return { ok: true, data: { inviteLink, inviteEmailSent: inviteEmail.sent } };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, 'Failed to send invite.') };
  }
}

export async function consignorLoginAction(input: {
  email: string;
  password: string;
}): Promise<ActionResult<{ consignorId: string }>> {
  try {
    const consignor = await getConsignorByEmail(input.email);

    if (!consignor?.passwordHash || !consignor.passwordSalt) {
      throw new Error('Email atau password salah.');
    }

    if (consignor.status === 'suspended') {
      throw new Error('Akun consignor sedang ditangguhkan.');
    }

    const valid = await verifyPassword(input.password, consignor.passwordHash, consignor.passwordSalt);
    if (!valid) {
      throw new Error('Email atau password salah.');
    }

    await createConsignorSessionCookie(consignor.id);
    return { ok: true, data: { consignorId: consignor.id } };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, 'Login gagal.') };
  }
}

export async function consignorLogoutAction(): Promise<ActionResult<true>> {
  try {
    await clearConsignorSessionCookie();
    return { ok: true, data: true };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, 'Logout gagal.') };
  }
}

export async function consignorSetPasswordAction(input: {
  token: string;
  password: string;
}): Promise<ActionResult<{ consignorId: string }>> {
  try {
    const token = await consumeConsignorToken({
      token: input.token,
      purpose: ['set_password', 'reset_password'],
    });

    if (!token) {
      throw new Error('Token tidak valid atau sudah kedaluwarsa.');
    }

    const { hash, salt } = await hashPassword(input.password);
    await setConsignorPassword({
      consignorId: token.consignorId,
      passwordHash: hash,
      passwordSalt: salt,
    });
    await createConsignorSessionCookie(token.consignorId);

    revalidateConsignment();
    return { ok: true, data: { consignorId: token.consignorId } };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, 'Gagal menyimpan password.') };
  }
}

export async function consignorRequestResetAction(input: {
  email: string;
}): Promise<ActionResult<{ resetLink?: string }>> {
  try {
    const consignor = await getConsignorByEmail(input.email);

    if (!consignor) {
      return { ok: true, data: {} };
    }

    const token = await createConsignorToken({
      consignorId: consignor.id,
      purpose: 'reset_password',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
    });
    const resetLink = buildConsignorResetLink(token.token);
    await sendConsignorReset(consignor.email, resetLink);

    return { ok: true, data: { resetLink } };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, 'Gagal mengirim reset link.') };
  }
}

export async function acceptTermsAction(version: string): Promise<ActionResult<true>> {
  try {
    const consignor = await ensureConsignor();
    if (version !== CONSIGNMENT_TERMS_VERSION) {
      throw new Error('Terms version is outdated.');
    }
    await updateConsignorTerms(consignor.id, version);
    revalidateConsignment();
    return { ok: true, data: true };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, 'Gagal menyimpan persetujuan.') };
  }
}

export async function consignorUpdateNameAction(input: {
  name: string;
}): Promise<ActionResult<true>> {
  try {
    const consignor = await ensureConsignor();
    const name = input.name.trim();
    if (name.length < 2) {
      throw new Error('Nama minimal 2 karakter.');
    }
    if (name.length > 60) {
      throw new Error('Nama maksimal 60 karakter.');
    }
    await updateConsignorDisplayName(consignor.id, name);
    revalidateConsignment();
    return { ok: true, data: true };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, 'Gagal menyimpan nama.') };
  }
}

export async function consignorUpdateAvatarAction(input: {
  seed: string;
}): Promise<ActionResult<true>> {
  try {
    const consignor = await ensureConsignor();
    const seed = input.seed.trim();
    if (!seed) {
      throw new Error('Avatar tidak valid.');
    }
    await updateConsignorAvatar(consignor.id, seed);
    revalidateConsignment();
    return { ok: true, data: true };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, 'Gagal menyimpan avatar.') };
  }
}

export async function consignorUpdateProfileAction(input: {
  payoutMethod: ConsignorPayoutMethod;
  bankAccountName: string;
  bankName: string;
  bankAccountNumber: string;
}): Promise<ActionResult<true>> {
  try {
    const consignor = await ensureConsignor();
    const payoutMethod: ConsignorPayoutMethod = input.payoutMethod === 'ewallet' ? 'ewallet' : 'bank';
    if (!input.bankAccountName.trim() || !input.bankName.trim() || !input.bankAccountNumber.trim()) {
      throw new Error('Lengkapi semua kolom.');
    }
    await updateConsignorProfile(consignor.id, { ...input, payoutMethod });
    revalidateConsignment();
    return { ok: true, data: true };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, 'Gagal menyimpan profil.') };
  }
}

export async function consignorChangePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<ActionResult<true>> {
  try {
    const consignor = await ensureConsignor();

    if (!consignor.passwordHash || !consignor.passwordSalt) {
      throw new Error('Akun belum punya password.');
    }

    const valid = await verifyPassword(
      input.currentPassword,
      consignor.passwordHash,
      consignor.passwordSalt,
    );
    if (!valid) {
      throw new Error('Password saat ini salah.');
    }

    if (input.newPassword.length < 8) {
      throw new Error('Password baru minimal 8 karakter.');
    }

    const { hash, salt } = await hashPassword(input.newPassword);
    await setConsignorPassword({ consignorId: consignor.id, passwordHash: hash, passwordSalt: salt });
    revalidateConsignment();
    return { ok: true, data: true };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, 'Gagal mengubah password.') };
  }
}

export async function requestPayoutAction(input: {
  bankAccountName: string;
  bankName: string;
  bankAccountNumber: string;
}): Promise<ActionResult<{ requestId: string; amount: number }>> {
  try {
    const consignor = await ensureConsignor();
    const minimumAmount = Number(process.env.CONSIGNOR_MIN_PAYOUT ?? 100000);
    const result = await requestConsignorPayout({
      consignorId: consignor.id,
      bankAccountName: input.bankAccountName,
      bankName: input.bankName,
      bankAccountNumber: input.bankAccountNumber,
      minimumAmount,
    });

    revalidateConsignment();
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, 'Gagal request payout.') };
  }
}

export async function deleteConsignorAction(
  consignorId: string,
): Promise<ActionResult<true>> {
  try {
    await ensureAdmin();
    const consignor = await getConsignorById(consignorId);
    if (!consignor) {
      throw new Error('Consignor tidak ditemukan.');
    }
    await deleteConsignor(consignorId);
    revalidateConsignment();
    return { ok: true, data: true };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, 'Gagal menghapus akun.') };
  }
}

export async function settlePayoutRequestAction(input: {
  requestId: string;
  reference: string;
}): Promise<ActionResult<true>> {
  try {
    await ensureAdmin();
    await settleConsignorPayoutRequest(input);
    revalidateConsignment();
    return { ok: true, data: true };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, 'Gagal settlement payout.') };
  }
}

export async function getConsignorDashboardAction(): Promise<ActionResult<ConsignorDashboard>> {
  try {
    const consignor = await ensureConsignor();
    const dashboard = await getConsignorDashboard(consignor.id);

    if (!dashboard) {
      throw new Error('Dashboard not found.');
    }

    return { ok: true, data: dashboard };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, 'Failed to load dashboard.') };
  }
}

export async function listConsignorAdminAction() {
  try {
    await ensureAdmin();
    return { ok: true as const, data: await listConsignors() };
  } catch (error) {
    return { ok: false as const, error: getErrorMessage(error, 'Failed to load consignors.') };
  }
}
