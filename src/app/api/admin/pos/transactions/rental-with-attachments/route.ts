import { revalidatePath } from 'next/cache';

import { auth } from '../../../../../../../auth';
import { findCatalogItemById } from '@/lib/farsha-db';
import { upsertCustomerFromContact } from '@/lib/customer-db';
import { listPosLedger, savePosLedgerSnapshotWithAttachments } from '@/lib/pos-db';
import {
  buildRentalTransactionLedger,
  type PosLedgerState,
  type PosPaymentMethod,
  type PosTransactionLineItem,
} from '@/lib/pos-ledger';
import {
  deletePosAttachmentObjectByKey,
  type PosAttachmentCaptureSource,
  uploadPosTransactionAttachmentObject,
  uploadedPosAttachmentToModel,
  type UploadedPosAttachmentObject,
} from '@/lib/pos-attachments';

export const dynamic = 'force-dynamic';

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status });
}

async function getAdminEmail() {
  const session = await auth();

  if (session?.user?.role !== 'admin') {
    return null;
  }

  return session.user.email ?? null;
}

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function getNumber(formData: FormData, key: string) {
  const value = Number(getRequiredString(formData, key));
  return Number.isFinite(value) ? value : 0;
}

function getOptionalNumber(formData: FormData, key: string) {
  const value = Number(getRequiredString(formData, key));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function getPaymentMethod(value: string): PosPaymentMethod {
  return value === 'transfer' || value === 'qris' || value === 'card' || value === 'other'
    ? value
    : 'cash';
}

function getCaptureSource(value: string): PosAttachmentCaptureSource {
  return value === 'webcam' ? 'webcam' : 'upload';
}

function normalizeLineItemAmount(value: unknown, fallback = 0) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : fallback;
}

function parseLineItemPayload(value: string): Partial<PosTransactionLineItem>[] {
  if (!value) {
    return [];
  }

  const parsed = JSON.parse(value);
  return Array.isArray(parsed) ? parsed : [];
}

async function getValidatedLineItems(formData: FormData): Promise<PosTransactionLineItem[]> {
  const itemPayload = parseLineItemPayload(getRequiredString(formData, 'items'));
  const legacyItemId = getRequiredString(formData, 'itemId');
  const lineItemPayloads =
    itemPayload.length > 0
      ? itemPayload
      : legacyItemId
        ? [
            {
              itemId: legacyItemId,
              itemPrice: getNumber(formData, 'itemPrice'),
              deposit: getNumber(formData, 'depositReceived'),
            },
          ]
        : [];

  if (lineItemPayloads.length === 0) {
    throw new Error('Pilih minimal satu kebaya untuk transaksi sewa.');
  }

  const seenItemIds = new Set<string>();
  const lineItems: PosTransactionLineItem[] = [];

  for (const lineItem of lineItemPayloads) {
    const itemId = typeof lineItem.itemId === 'string' ? lineItem.itemId.trim() : '';

    if (!itemId) {
      throw new Error('Selected item was not found.');
    }

    if (seenItemIds.has(itemId)) {
      throw new Error('Satu kebaya tidak bisa dimasukkan dua kali dalam transaksi yang sama.');
    }

    seenItemIds.add(itemId);

    const item = await findCatalogItemById(itemId);

    if (!item) {
      throw new Error('Selected item was not found.');
    }

    if (item.published === false) {
      throw new Error('Draft upcoming items must be published before rental.');
    }

    lineItems.push({
      itemId: item.id,
      itemCode: item.code,
      itemName: item.name,
      itemPrice: normalizeLineItemAmount(lineItem.itemPrice, item.rentalPrice),
      deposit: normalizeLineItemAmount(lineItem.deposit, 0),
    });
  }

  return lineItems;
}

function getRequiredFile(formData: FormData, key: string, label: string) {
  const file = formData.get(key);

  if (!(file instanceof File)) {
    throw new Error(`${label} wajib ditambahkan.`);
  }

  return file;
}

function revalidatePosRentalPaths() {
  [
    '/',
    '/catalog',
    '/admin',
    '/admin/catalog',
    '/pos',
    '/pos/dashboard',
    '/pos/transactions',
    '/pos/customers',
    '/pos/finance',
  ].forEach((path) => revalidatePath(path));
}

export async function POST(request: Request) {
  const uploadedAttachments: UploadedPosAttachmentObject[] = [];

  try {
    const adminEmail = await getAdminEmail();

    if (!adminEmail) {
      return jsonResponse({ ok: false, error: 'Unauthorized.' }, 401);
    }

    const formData = await request.formData();
    const customerName = getRequiredString(formData, 'customerName');
    const customerPhone = getRequiredString(formData, 'customerPhone');
    const startDate = getRequiredString(formData, 'startDate');
    const dueDate = getRequiredString(formData, 'dueDate');
    const customerPhoto = getRequiredFile(formData, 'customerPhoto', 'Customer photo');
    const idDocumentPhoto = getRequiredFile(formData, 'idDocumentPhoto', 'ID document photo');
    const ledgerValue = getRequiredString(formData, 'ledger');
    const ledger = ledgerValue ? (JSON.parse(ledgerValue) as PosLedgerState) : await listPosLedger();

    if (!customerName) {
      throw new Error('Nama pelanggan wajib diisi.');
    }

    if (!customerPhone) {
      throw new Error('No. WhatsApp pelanggan wajib diisi untuk customer database.');
    }

    if (!startDate || !dueDate) {
      throw new Error('Tanggal sewa dan pengembalian wajib diisi.');
    }

    const lineItems = await getValidatedLineItems(formData);

    const customer = await upsertCustomerFromContact({
      displayName: customerName,
      primaryPhone: customerPhone,
      source: 'pos',
      actor: adminEmail,
    });
    const { ledger: nextLedger, transaction } = buildRentalTransactionLedger(ledger, {
      items: lineItems,
      customerId: customer.id,
      customerName,
      customerPhone,
      startDate,
      dueDate,
      paymentMethod: getPaymentMethod(getRequiredString(formData, 'paymentMethod')),
      notes: getRequiredString(formData, 'notes'),
    });

    uploadedAttachments.push(
      await uploadPosTransactionAttachmentObject({
        transactionId: transaction.id,
        kind: 'customer_photo',
        file: customerPhoto,
        captureSource: getCaptureSource(getRequiredString(formData, 'customerPhotoCaptureSource')),
        width: getOptionalNumber(formData, 'customerPhotoWidth'),
        height: getOptionalNumber(formData, 'customerPhotoHeight'),
        actor: adminEmail,
      }),
    );
    uploadedAttachments.push(
      await uploadPosTransactionAttachmentObject({
        transactionId: transaction.id,
        kind: 'id_document',
        file: idDocumentPhoto,
        captureSource: getCaptureSource(getRequiredString(formData, 'idDocumentPhotoCaptureSource')),
        width: getOptionalNumber(formData, 'idDocumentPhotoWidth'),
        height: getOptionalNumber(formData, 'idDocumentPhotoHeight'),
        actor: adminEmail,
      }),
    );
    const savedLedger = await savePosLedgerSnapshotWithAttachments(nextLedger, uploadedAttachments);

    revalidatePosRentalPaths();

    return jsonResponse({
      ok: true,
      data: {
        ledger: savedLedger,
        transactionId: transaction.id,
        customer,
        attachments: uploadedAttachments.map((attachment) => uploadedPosAttachmentToModel(attachment)),
      },
    });
  } catch (error) {
    await Promise.all(
      uploadedAttachments.map((attachment) =>
        deletePosAttachmentObjectByKey(attachment.r2Key).catch(() => false),
      ),
    );

    const message = error instanceof Error ? error.message : 'Failed to create rental with photos.';
    return jsonResponse({ ok: false, error: message }, 400);
  }
}
