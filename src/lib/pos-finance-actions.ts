'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { auth } from '../../auth';
import { createPosExpense } from '@/lib/pos-finance';

async function ensureAdminEmail() {
  const session = await auth();

  if (session?.user?.role !== 'admin') {
    throw new Error('Unauthorized');
  }

  return session.user.email ?? null;
}

function stringValue(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function numberValue(value: FormDataEntryValue | null) {
  const raw = stringValue(value).replace(/\D/g, '');
  return raw ? Number(raw) : 0;
}

function returnPath(formData: FormData) {
  const value = stringValue(formData.get('returnTo'));

  return value.startsWith('/pos/finance') ? value : '/pos/finance';
}

export async function createPosExpenseAction(formData: FormData) {
  const adminEmail = await ensureAdminEmail();

  await createPosExpense({
    expenseDate: stringValue(formData.get('expenseDate')),
    categoryId: stringValue(formData.get('categoryId')),
    categoryName: stringValue(formData.get('categoryName')),
    vendor: stringValue(formData.get('vendor')),
    amount: numberValue(formData.get('amount')),
    paymentMethod: stringValue(formData.get('paymentMethod')),
    note: stringValue(formData.get('note')),
    createdBy: adminEmail,
  });

  revalidatePath('/pos');
  revalidatePath('/pos/dashboard');
  revalidatePath('/pos/finance');
  redirect(returnPath(formData));
}
