import { getD1Database } from '@/lib/cloudflare';
import { getMediaBucket } from '@/lib/media-library';

export type PosAttachmentKind = 'customer_photo' | 'id_document';
export type PosAttachmentCaptureSource = 'webcam' | 'upload';
export type PosAttachmentStatus = 'active' | 'deleted';

export type PosTransactionAttachment = {
  id: string;
  transactionId: string;
  kind: PosAttachmentKind;
  r2Key: string;
  contentType: string;
  size: number;
  width: number | null;
  height: number | null;
  originalFilename: string;
  captureSource: PosAttachmentCaptureSource;
  status: PosAttachmentStatus;
  createdBy: string | null;
  createdAt: string;
  deletedBy: string | null;
  deletedAt: string | null;
};

export type CreateRentalAttachmentInput = {
  kind: PosAttachmentKind;
  file: File;
  captureSource: PosAttachmentCaptureSource;
  width?: number | null;
  height?: number | null;
};

export type UploadedPosAttachmentObject = {
  id: string;
  transactionId: string;
  kind: PosAttachmentKind;
  r2Key: string;
  contentType: string;
  size: number;
  width: number | null;
  height: number | null;
  originalFilename: string;
  captureSource: PosAttachmentCaptureSource;
  actor: string | null;
};

type PosTransactionAttachmentRow = {
  id: string;
  transaction_id: string;
  kind: PosAttachmentKind;
  r2_key: string;
  content_type: string;
  size: number;
  width: number | null;
  height: number | null;
  original_filename: string | null;
  capture_source: PosAttachmentCaptureSource;
  status: PosAttachmentStatus;
  created_by: string | null;
  created_at: string;
  deleted_by: string | null;
  deleted_at: string | null;
};

const allowedAttachmentTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

export const POS_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;

function rowToAttachment(row: PosTransactionAttachmentRow): PosTransactionAttachment {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    kind: row.kind,
    r2Key: row.r2_key,
    contentType: row.content_type,
    size: row.size,
    width: row.width,
    height: row.height,
    originalFilename: row.original_filename ?? '',
    captureSource: row.capture_source,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    deletedBy: row.deleted_by,
    deletedAt: row.deleted_at,
  };
}

function createAttachmentId() {
  return `pos-att-${crypto.randomUUID()}`;
}

function sanitizeSegment(value: string, fallback: string) {
  const segment = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return segment || fallback;
}

export function isAllowedPosAttachmentType(contentType: string) {
  return allowedAttachmentTypes.has(contentType.toLowerCase());
}

export function getAllowedPosAttachmentTypes() {
  return Array.from(allowedAttachmentTypes.keys());
}

export function createPosAttachmentKey(
  transactionId: string,
  kind: PosAttachmentKind,
  contentType: string,
) {
  const extension = allowedAttachmentTypes.get(contentType.toLowerCase()) ?? 'jpg';
  const month = new Date().toISOString().slice(0, 7);
  const transactionSegment = sanitizeSegment(transactionId, 'transaction');

  return `pos-attachments/${month}/${transactionSegment}/${kind}-${crypto.randomUUID()}.${extension}`;
}

export function isPosAttachmentKey(key: string) {
  return (
    key.startsWith('pos-attachments/') &&
    !key.includes('..') &&
    !key.includes('\\') &&
    key.split('/').every(Boolean)
  );
}

function assertValidAttachmentFile(file: File) {
  if (file.size <= 0) {
    throw new Error('Photo file is empty.');
  }

  if (file.size > POS_ATTACHMENT_MAX_BYTES) {
    throw new Error('Photo must be 5 MB or smaller.');
  }

  if (!isAllowedPosAttachmentType(file.type)) {
    throw new Error(`Use one of these image types: ${getAllowedPosAttachmentTypes().join(', ')}.`);
  }
}

export async function uploadPosTransactionAttachmentObject(input: {
  transactionId: string;
  kind: PosAttachmentKind;
  file: File;
  captureSource: PosAttachmentCaptureSource;
  actor?: string | null;
  width?: number | null;
  height?: number | null;
}): Promise<UploadedPosAttachmentObject> {
  assertValidAttachmentFile(input.file);

  const id = createAttachmentId();
  const r2Key = createPosAttachmentKey(input.transactionId, input.kind, input.file.type);
  const bucket = await getMediaBucket();
  const buffer = await input.file.arrayBuffer();

  await bucket.put(r2Key, buffer, {
    httpMetadata: {
      contentType: input.file.type,
      cacheControl: 'private, no-store',
    },
    customMetadata: {
      source: 'farsha-pos-attachment',
      transactionId: input.transactionId,
      kind: input.kind,
      originalName: input.file.name,
      captureSource: input.captureSource,
    },
  });

  return {
    id,
    transactionId: input.transactionId,
    kind: input.kind,
    r2Key,
    contentType: input.file.type,
    size: input.file.size,
    width: Number.isFinite(input.width) && input.width ? input.width : null,
    height: Number.isFinite(input.height) && input.height ? input.height : null,
    originalFilename: input.file.name,
    captureSource: input.captureSource,
    actor: input.actor ?? null,
  };
}

export async function deletePosAttachmentObjectByKey(key: string) {
  if (!isPosAttachmentKey(key)) {
    return false;
  }

  const bucket = await getMediaBucket();
  await bucket.delete(key);

  return true;
}

export function uploadedPosAttachmentToModel(
  upload: UploadedPosAttachmentObject,
  createdAt = new Date().toISOString(),
): PosTransactionAttachment {
  return {
    id: upload.id,
    transactionId: upload.transactionId,
    kind: upload.kind,
    r2Key: upload.r2Key,
    contentType: upload.contentType,
    size: upload.size,
    width: upload.width,
    height: upload.height,
    originalFilename: upload.originalFilename,
    captureSource: upload.captureSource,
    status: 'active',
    createdBy: upload.actor,
    createdAt,
    deletedBy: null,
    deletedAt: null,
  };
}

export async function createPosTransactionAttachment(input: {
  transactionId: string;
  kind: PosAttachmentKind;
  file: File;
  captureSource: PosAttachmentCaptureSource;
  actor?: string | null;
  width?: number | null;
  height?: number | null;
}): Promise<PosTransactionAttachment> {
  const upload = await uploadPosTransactionAttachmentObject(input);

  try {
    const db = await getD1Database();
    const row = await db
      .prepare(
        `INSERT INTO pos_transaction_attachments (
          id, transaction_id, kind, r2_key, content_type, size, width, height,
          original_filename, capture_source, status, created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
        RETURNING *`,
      )
      .bind(
        upload.id,
        upload.transactionId,
        upload.kind,
        upload.r2Key,
        upload.contentType,
        upload.size,
        upload.width,
        upload.height,
        upload.originalFilename,
        upload.captureSource,
        upload.actor,
      )
      .first<PosTransactionAttachmentRow>();

    if (!row) {
      throw new Error('Attachment record was not created.');
    }

    return rowToAttachment(row);
  } catch (error) {
    await deletePosAttachmentObjectByKey(upload.r2Key);
    throw error;
  }
}

export async function listPosTransactionAttachments(
  transactionIds: string[],
): Promise<PosTransactionAttachment[]> {
  const ids = Array.from(new Set(transactionIds.filter(Boolean)));

  if (ids.length === 0) {
    return [];
  }

  const db = await getD1Database();
  const placeholders = ids.map(() => '?').join(', ');
  const result = await db
    .prepare(
      `SELECT *
       FROM pos_transaction_attachments
       WHERE status = 'active'
         AND transaction_id IN (${placeholders})
       ORDER BY created_at ASC`,
    )
    .bind(...ids)
    .all<PosTransactionAttachmentRow>();

  return result.results.map(rowToAttachment);
}

export async function getPosTransactionAttachment(
  transactionId: string,
  attachmentId: string,
): Promise<PosTransactionAttachment | null> {
  const db = await getD1Database();
  const row = await db
    .prepare(
      `SELECT *
       FROM pos_transaction_attachments
       WHERE id = ?
         AND transaction_id = ?
         AND status = 'active'
       LIMIT 1`,
    )
    .bind(attachmentId, transactionId)
    .first<PosTransactionAttachmentRow>();

  return row ? rowToAttachment(row) : null;
}

export async function readPosTransactionAttachmentObject(
  transactionId: string,
  attachmentId: string,
) {
  const attachment = await getPosTransactionAttachment(transactionId, attachmentId);

  if (!attachment || !isPosAttachmentKey(attachment.r2Key)) {
    return null;
  }

  const bucket = await getMediaBucket();
  const object = await bucket.get(attachment.r2Key);

  if (!object) {
    return null;
  }

  return { attachment, object };
}

export async function deletePosTransactionAttachment(input: {
  transactionId: string;
  attachmentId: string;
  actor?: string | null;
}) {
  const attachment = await getPosTransactionAttachment(input.transactionId, input.attachmentId);

  if (!attachment) {
    return false;
  }

  const db = await getD1Database();
  await db
    .prepare(
      `UPDATE pos_transaction_attachments
       SET status = 'deleted',
           deleted_by = ?,
           deleted_at = CURRENT_TIMESTAMP
       WHERE id = ?
         AND transaction_id = ?
         AND status = 'active'`,
    )
    .bind(input.actor ?? null, input.attachmentId, input.transactionId)
    .run();

  if (isPosAttachmentKey(attachment.r2Key)) {
    const bucket = await getMediaBucket();
    await bucket.delete(attachment.r2Key).catch(() => undefined);
  }

  return true;
}
