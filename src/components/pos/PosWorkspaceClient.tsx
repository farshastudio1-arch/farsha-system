'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Camera,
  ChevronDown,
  ChevronUp,
  Filter,
  Image as ImageIcon,
  Receipt,
  Search,
  CheckCircle2,
  Printer,
  Trash2,
  Upload,
  X,
  Store,
  MapPin,
  Sparkles,
  MessageCircle,
  RefreshCw,
  Phone,
  Users,
} from 'lucide-react';

import {
  deletePosTransactionAttachmentAction,
  fetchAdminCatalogItemsAction,
  fetchCustomersAction,
  fetchPosLedgerAction,
  fetchPosTransactionAttachmentsAction,
  savePosLedgerAction,
} from '@/lib/farsha-actions';
import type { CustomerRecord } from '@/lib/customer-db';
import type {
  PosAttachmentCaptureSource,
  PosAttachmentKind,
  PosTransactionAttachment,
} from '@/lib/pos-attachments';
import { useSavedCatalogItems, writeSavedCatalogItems } from '@/lib/catalog-storage';
import {
  closeRentalTransaction,
  completeMaintenanceHold,
  deriveAvailabilityProjection,
  getOpenMaintenanceHolds,
  getOverdueTransactions,
  writeSavedPosLedger,
  type PosLedgerState,
  type PosPaymentMethod,
  type PosReceipt,
  type PosTransaction,
} from '@/lib/pos-ledger';
import { useSavedPosLedger } from '@/lib/pos-ledger-client';
import { addPreviewDays, previewMaintenanceBlockDays } from '@/lib/booking-preview';

type PosTab = 'rent' | 'return' | 'maintenance';
type CatalogStatusFilter = 'all' | 'available' | 'rented' | 'maintenance';
type PendingRentalAction = 'print' | 'cancel';
type PendingPosAction = 'return' | 'maintenance';
type ReceiptHistoryStatus = 'open' | 'closed';
type RentalPhotoField = 'customerPhoto' | 'idDocumentPhoto';

type RentalPhotoDraft = {
  file: File;
  previewUrl: string;
  captureSource: PosAttachmentCaptureSource;
  width: number | null;
  height: number | null;
};

type CameraState = {
  field: RentalPhotoField;
  stream: MediaStream;
};

type RentalWithAttachmentsResponse =
  | {
      ok: true;
      data: {
        ledger: PosLedgerState;
        transactionId: string;
        customer: CustomerRecord;
        attachments: PosTransactionAttachment[];
      };
    }
  | {
      ok: false;
      error: string;
    };

const extraReturnDayPenalty = 100000;
const defaultSecurityDeposit = 100000;

const paymentMethods: { value: PosPaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'qris', label: 'QRIS' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatDateTime(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function parseCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

function formatCurrencyInput(value: string | number) {
  const amount = typeof value === 'number' ? value : parseCurrencyInput(value);
  return amount ? new Intl.NumberFormat('id-ID').format(amount) : '';
}

function getAttachmentLabel(kind: PosAttachmentKind) {
  return kind === 'customer_photo' ? 'Customer photo' : 'ID document';
}

function getAttachmentUrl(attachment: PosTransactionAttachment) {
  return `/api/admin/pos/transactions/${encodeURIComponent(attachment.transactionId)}/attachments/${encodeURIComponent(attachment.id)}`;
}

function RentalPhotoControl({
  title,
  description,
  draft,
  field,
  onUpload,
  onOpenCamera,
  onClear,
}: {
  title: string;
  description: string;
  draft: RentalPhotoDraft | null;
  field: RentalPhotoField;
  onUpload: (field: RentalPhotoField, file: File | null) => void;
  onOpenCamera: (field: RentalPhotoField) => void;
  onClear: (field: RentalPhotoField) => void;
}) {
  const inputId = `pos-${field}-upload`;

  return (
    <div className="border border-neutral-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-700">{title}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">{description}</p>
        </div>
        <span
          className={`shrink-0 border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
            draft
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {draft ? 'Ready' : 'Required'}
        </span>
      </div>

      {draft ? (
        <div className="mt-3 flex gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={draft.previewUrl}
            alt={title}
            className="h-24 w-20 shrink-0 border border-neutral-200 object-cover"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="truncate text-xs font-semibold text-neutral-900">{draft.file.name}</p>
            <p className="text-[11px] text-neutral-500">
              {draft.captureSource === 'webcam' ? 'Taken from webcam' : 'Uploaded image'} / {(draft.file.size / 1024).toFixed(0)} KB
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onOpenCamera(field)}
                className="inline-flex min-h-8 items-center gap-1 border border-neutral-300 bg-white px-2 text-[10px] font-bold uppercase tracking-wider text-neutral-700 hover:border-neutral-900"
              >
                <Camera className="h-3.5 w-3.5" />
                Retake
              </button>
              <label
                htmlFor={inputId}
                className="inline-flex min-h-8 cursor-pointer items-center gap-1 border border-neutral-300 bg-white px-2 text-[10px] font-bold uppercase tracking-wider text-neutral-700 hover:border-neutral-900"
              >
                <Upload className="h-3.5 w-3.5" />
                Replace
              </label>
              <button
                type="button"
                onClick={() => onClear(field)}
                className="inline-flex min-h-8 items-center gap-1 border border-red-200 bg-red-50 px-2 text-[10px] font-bold uppercase tracking-wider text-red-700 hover:border-red-400"
              >
                <X className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onOpenCamera(field)}
            className="inline-flex min-h-10 items-center justify-center gap-2 border border-neutral-300 bg-neutral-50 px-3 text-xs font-bold uppercase tracking-wider text-neutral-700 hover:border-neutral-900 hover:bg-white"
          >
            <Camera className="h-4 w-4" />
            Take photo
          </button>
          <label
            htmlFor={inputId}
            className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 border border-neutral-300 bg-neutral-50 px-3 text-xs font-bold uppercase tracking-wider text-neutral-700 hover:border-neutral-900 hover:bg-white"
          >
            <Upload className="h-4 w-4" />
            Upload photo
          </label>
        </div>
      )}

      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          onUpload(field, event.target.files?.[0] ?? null);
          event.currentTarget.value = '';
        }}
      />
    </div>
  );
}

function TransactionAttachmentStrip({
  attachments,
  onDelete,
  deletingAttachmentId,
}: {
  attachments: PosTransactionAttachment[];
  onDelete: (attachment: PosTransactionAttachment) => void;
  deletingAttachmentId: string;
}) {
  if (attachments.length === 0) {
    return (
      <div className="border border-dashed border-neutral-200 bg-white px-2 py-1.5 text-[11px] text-neutral-400">
        No customer/ID photos attached.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {attachments.map((attachment) => (
        <div key={attachment.id} className="border border-neutral-200 bg-white p-2">
          <a
            href={getAttachmentUrl(attachment)}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getAttachmentUrl(attachment)}
              alt={getAttachmentLabel(attachment.kind)}
              className="h-20 w-full bg-neutral-100 object-cover"
            />
          </a>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="truncate text-[10px] font-bold uppercase tracking-wider text-neutral-600">
              {getAttachmentLabel(attachment.kind)}
            </span>
            <button
              type="button"
              onClick={() => onDelete(attachment)}
              disabled={deletingAttachmentId === attachment.id}
              className="shrink-0 text-red-600 hover:text-red-800 disabled:opacity-50"
              aria-label={`Delete ${getAttachmentLabel(attachment.kind)}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function createRentalPhotoDraft(
  file: File,
  captureSource: PosAttachmentCaptureSource,
  width: number | null,
  height: number | null,
): RentalPhotoDraft {
  return {
    file,
    previewUrl: URL.createObjectURL(file),
    captureSource,
    width,
    height,
  };
}

function addDaysToInputDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getDayDiff(startValue: string, endValue: string) {
  const start = new Date(`${startValue}T00:00:00`);
  const end = new Date(`${endValue}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function getReceiptActionLabel(action: PosReceipt['action']) {
  switch (action) {
    case 'create':
      return 'Sewa dibuat';
    case 'close':
      return 'Sewa ditutup';
    case 'deposit':
      return 'Deposit';
    case 'refund':
      return 'Refund';
    case 'penalty':
      return 'Denda';
    case 'adjustment':
      return 'Adjustment';
    case 'print':
      return 'Cetak ulang';
    case 'maintenance_open':
      return 'Masuk cuci';
    case 'maintenance_close':
      return 'Selesai cuci';
    case 'void':
      return 'Void';
    default:
      return 'Update';
  }
}

function getReceiptDisplayAmount(receipt: PosReceipt) {
  return receipt.eventAmount !== 0 ? receipt.eventAmount : receipt.totalCollected;
}

function matchesReceiptHistory(receipt: PosReceipt, query: string) {
  if (!query) return true;

  return [
    receipt.receiptNumber,
    receipt.transactionNumber,
    receipt.customerName,
    receipt.customerPhone,
    receipt.itemCode,
    receipt.itemName,
    receipt.paymentMethod,
    receipt.title,
  ].some((value) => value.toLowerCase().includes(query));
}

interface PosWorkspaceClientProps {
  initialLedger: PosLedgerState;
  initialTransactionId?: string;
}

export default function PosWorkspaceClient({ initialLedger, initialTransactionId = '' }: PosWorkspaceClientProps) {
  const catalogItems = useSavedCatalogItems();
  const ledger = useSavedPosLedger(initialLedger);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [isLoadingLedger, setIsLoadingLedger] = useState(true);
  const [ledgerError, setLedgerError] = useState('');
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [customerError, setCustomerError] = useState('');

  // Projections and Metrics
  const projections = useMemo(
    () => deriveAvailabilityProjection(catalogItems, ledger),
    [catalogItems, ledger]
  );

  // Main UI States
  const [activeTab, setActiveTab] = useState<PosTab>('rent');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>(initialTransactionId);
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState<string>('');

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CatalogStatusFilter>('all');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [receiptHistoryStatus, setReceiptHistoryStatus] = useState<ReceiptHistoryStatus>('open');
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');

  // Flow 1: Rental Form States
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerLookupQuery, setCustomerLookupQuery] = useState('');
  const [isCustomerDatabaseOpen, setIsCustomerDatabaseOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [startDate, setStartDate] = useState(getTodayInputValue());
  const [dueDate, setDueDate] = useState('');
  const [priceOverride, setPriceOverride] = useState('');
  const [depositReceived, setDepositReceived] = useState(formatCurrencyInput(defaultSecurityDeposit));
  const [rentalNotes, setRentalNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>('cash');
  const [customerPhoto, setCustomerPhoto] = useState<RentalPhotoDraft | null>(null);
  const [idDocumentPhoto, setIdDocumentPhoto] = useState<RentalPhotoDraft | null>(null);
  const [cameraState, setCameraState] = useState<CameraState | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [isCreatingRental, setIsCreatingRental] = useState(false);
  const [transactionAttachments, setTransactionAttachments] = useState<PosTransactionAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState('');
  const [deletingAttachmentId, setDeletingAttachmentId] = useState('');
  const [pendingRentalAction, setPendingRentalAction] = useState<PendingRentalAction | null>(null);
  const [pendingPosAction, setPendingPosAction] = useState<PendingPosAction | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const customerPhotoRef = useRef<RentalPhotoDraft | null>(null);
  const idDocumentPhotoRef = useRef<RentalPhotoDraft | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Flow 2: Return Form States
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10));
  const [refundAmount, setRefundAmount] = useState('0');
  const [penaltyAmount, setPenaltyAmount] = useState('0');
  const [returnAdjustmentAmount, setReturnAdjustmentAmount] = useState('0');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnPaymentMethod, setReturnPaymentMethod] = useState<PosPaymentMethod>('cash');

  // Flow 3: Maintenance Form States
  const [maintenanceNote, setMaintenanceNote] = useState('');

  // Info alerts
  const [statusMessage, setStatusMessage] = useState('');

  // Invoice Modal State
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [invoiceTransaction, setInvoiceTransaction] = useState<PosTransaction | null>(null);
  const baseRentalPrice = parseCurrencyInput(priceOverride);
  const securityDepositAmount = parseCurrencyInput(depositReceived);
  const defaultDueDate = startDate ? addDaysToInputDate(startDate, 3) : '';
  const extraReturnDays =
    startDate && dueDate ? Math.max(getDayDiff(defaultDueDate || startDate, dueDate), 0) : 0;
  const extraReturnPenalty = extraReturnDays * extraReturnDayPenalty;
  const rentTotalDue = baseRentalPrice + securityDepositAmount + extraReturnPenalty;
  const attachmentsByTransaction = useMemo(() => {
    const grouped = new Map<string, PosTransactionAttachment[]>();

    transactionAttachments.forEach((attachment) => {
      const current = grouped.get(attachment.transactionId) ?? [];
      grouped.set(attachment.transactionId, [...current, attachment]);
    });

    return grouped;
  }, [transactionAttachments]);
  const customerLookupMatches = useMemo(() => {
    const query = customerLookupQuery.trim().toLowerCase();

    if (!query) {
      return customers.slice(0, 5);
    }

    return customers
      .filter((customer) =>
        [
          customer.displayName,
          customer.primaryPhone,
          customer.normalizedPhone,
          customer.email ?? '',
          customer.instagram ?? '',
        ].some((value) => value.toLowerCase().includes(query)),
      )
      .slice(0, 5);
  }, [customers, customerLookupQuery]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  useEffect(() => {
    let active = true;

    async function loadCatalogItems() {
      setIsLoadingCatalog(true);
      const result = await fetchAdminCatalogItemsAction();

      if (!active) {
        return;
      }

      if (result.ok) {
        writeSavedCatalogItems(result.data);
        setCatalogError('');
      } else {
        setCatalogError(result.error);
      }

      setIsLoadingCatalog(false);
    }

    loadCatalogItems();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadAttachments() {
      const transactionIds = ledger.transactions.map((transaction) => transaction.id);

      if (transactionIds.length === 0) {
        setTransactionAttachments([]);
        setAttachmentError('');
        return;
      }

      const result = await fetchPosTransactionAttachmentsAction(transactionIds);

      if (!active) {
        return;
      }

      if (result.ok) {
        setTransactionAttachments(result.data);
        setAttachmentError('');
      } else {
        setAttachmentError(result.error);
      }
    }

    void loadAttachments();

    return () => {
      active = false;
    };
  }, [ledger.transactions]);

  useEffect(() => {
    if (cameraVideoRef.current && cameraState?.stream) {
      cameraVideoRef.current.srcObject = cameraState.stream;
    }
  }, [cameraState]);

  useEffect(
    () => () => {
      if (customerPhotoRef.current) {
        URL.revokeObjectURL(customerPhotoRef.current.previewUrl);
      }

      if (idDocumentPhotoRef.current) {
        URL.revokeObjectURL(idDocumentPhotoRef.current.previewUrl);
      }

      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  useEffect(() => {
    let active = true;

    async function loadCustomers() {
      setIsLoadingCustomers(true);
      const result = await fetchCustomersAction({ status: 'active', limit: 300 });

      if (!active) {
        return;
      }

      if (result.ok) {
        setCustomers(result.data);
        setCustomerError('');
      } else {
        setCustomerError(result.error);
      }

      setIsLoadingCustomers(false);
    }

    loadCustomers();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadPosLedger() {
      setIsLoadingLedger(true);
      const result = await fetchPosLedgerAction();

      if (!active) {
        return;
      }

      if (result.ok) {
        writeSavedPosLedger(result.data);
        setLedgerError('');
      } else {
        setLedgerError(result.error);
      }

      setIsLoadingLedger(false);
    }

    loadPosLedger();

    return () => {
      active = false;
    };
  }, []);

  async function persistLedger(nextLedger: PosLedgerState) {
    const result = await savePosLedgerAction(nextLedger);

    if (result.ok) {
      writeSavedPosLedger(result.data);
      setLedgerError('');
      return result.data;
    }

    setLedgerError(result.error);
    return nextLedger;
  }

  function rememberCustomer(customer: CustomerRecord) {
    setCustomers((current) => {
      const withoutCustomer = current.filter((entry) => entry.id !== customer.id);
      return [customer, ...withoutCustomer].slice(0, 300);
    });
  }

  function selectCustomer(customer: CustomerRecord) {
    setSelectedCustomerId(customer.id);
    setCustomerName(customer.displayName);
    setCustomerPhone(customer.primaryPhone);
    setCustomerLookupQuery('');
    setCustomerError('');
    setIsCustomerDatabaseOpen(false);
  }

  function setPhotoDraft(field: RentalPhotoField, draft: RentalPhotoDraft | null) {
    if (field === 'customerPhoto') {
      setCustomerPhoto((current) => {
        if (current) {
          URL.revokeObjectURL(current.previewUrl);
        }

        customerPhotoRef.current = draft;
        return draft;
      });
      return;
    }

    setIdDocumentPhoto((current) => {
      if (current) {
        URL.revokeObjectURL(current.previewUrl);
      }

      idDocumentPhotoRef.current = draft;
      return draft;
    });
  }

  async function handlePhotoUpload(field: RentalPhotoField, file: File | null) {
    if (!file) {
      return;
    }

    setPhotoDraft(field, createRentalPhotoDraft(file, 'upload', null, null));
    setStatusMessage('');
  }

  async function openCamera(field: RentalPhotoField) {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Browser ini tidak mendukung akses kamera. Gunakan tombol upload photo.');
      return;
    }

    try {
      cameraState?.stream.getTracks().forEach((track) => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
        },
        audio: false,
      });
      setCameraError('');
      cameraStreamRef.current = stream;
      setCameraState({ field, stream });
    } catch {
      setCameraError('Kamera tidak bisa dibuka. Pastikan webcam terhubung dan izin kamera diberikan.');
    }
  }

  function closeCamera() {
    cameraState?.stream.getTracks().forEach((track) => track.stop());
    if (cameraStreamRef.current === cameraState?.stream) {
      cameraStreamRef.current = null;
    }
    setCameraState(null);
  }

  function captureCameraPhoto() {
    const video = cameraVideoRef.current;

    if (!video || !cameraState) {
      return;
    }

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')?.drawImage(video, 0, 0, width, height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError('Foto gagal diambil. Coba ulangi capture.');
          return;
        }

        const file = new File(
          [blob],
          `${cameraState.field === 'customerPhoto' ? 'customer-photo' : 'id-document'}-${Date.now()}.jpg`,
          { type: 'image/jpeg' },
        );
        setPhotoDraft(cameraState.field, createRentalPhotoDraft(file, 'webcam', width, height));
        setCameraError('');
        closeCamera();
      },
      'image/jpeg',
      0.9,
    );
  }

  async function deleteAttachment(attachment: PosTransactionAttachment) {
    setDeletingAttachmentId(attachment.id);
    const result = await deletePosTransactionAttachmentAction({
      transactionId: attachment.transactionId,
      attachmentId: attachment.id,
    });

    if (result.ok) {
      setTransactionAttachments((current) => current.filter((entry) => entry.id !== attachment.id));
      setAttachmentError('');
    } else {
      setAttachmentError(result.error);
      setStatusMessage(result.error);
    }

    setDeletingAttachmentId('');
  }

  // Auto-calculated defaults when selecting items or transactions
  const selectedItem = useMemo(
    () => catalogItems.find((item) => item.id === selectedItemId) ?? null,
    [catalogItems, selectedItemId]
  );

  const selectedProjection = useMemo(
    () => (selectedItem ? projections[selectedItem.id] : null),
    [selectedItem, projections]
  );

  const selectedTransaction = useMemo(
    () =>
      ledger.transactions.find((t) => t.id === selectedTransactionId) ??
      ledger.transactions.find((t) => t.itemId === selectedItemId && t.status === 'open') ??
      null,
    [ledger.transactions, selectedTransactionId, selectedItemId]
  );

  const selectedMaintenance = useMemo(
    () =>
      ledger.maintenanceHolds.find((m) => m.id === selectedMaintenanceId) ??
      ledger.maintenanceHolds.find((m) => m.itemId === selectedItemId && m.status === 'open') ??
      null,
    [ledger.maintenanceHolds, selectedMaintenanceId, selectedItemId]
  );

  // Set default values when item changes
  useEffect(() => {
    if (selectedItem) {
      const projection = projections[selectedItem.id];
      if (projection?.effectiveStatus === 'available') {
        // Prefill Rental details
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPriceOverride(formatCurrencyInput(selectedItem.rentalPrice));
        setDepositReceived(formatCurrencyInput(defaultSecurityDeposit));
        // Prefill default 3 days return due date
        setStartDate(getTodayInputValue());
        setDueDate(addDaysToInputDate(getTodayInputValue(), 3));
        setCustomerName('');
        setCustomerPhone('');
        setSelectedCustomerId('');
        setCustomerLookupQuery('');
        setIsCustomerDatabaseOpen(false);
        setPhotoDraft('customerPhoto', null);
        setPhotoDraft('idDocumentPhoto', null);
        setRentalNotes('');
        setPaymentMethod('cash');
        setStatusMessage('');
      } else if (projection?.effectiveStatus === 'rented' && selectedTransaction) {
        // Prefill Return details
        setReturnDate(new Date().toISOString().slice(0, 10));
        setRefundAmount(selectedTransaction.depositReceived.toString());
        setReturnNotes('');
        setReturnPaymentMethod(selectedTransaction.paymentMethod);
        setStatusMessage('');

        // Calculate late penalty (e.g. 20,000 IDR per day late)
        if (selectedTransaction.dueDate) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const due = new Date(selectedTransaction.dueDate);
          const diffTime = today.getTime() - due.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays > 0) {
            setPenaltyAmount((diffDays * 20000).toString());
          } else {
            setPenaltyAmount('0');
          }
        } else {
          setPenaltyAmount('0');
        }
        setReturnAdjustmentAmount('0');
      } else if (projection?.effectiveStatus === 'maintenance') {
        setMaintenanceNote('Dry cleaned, pressed and inspected');
        setStatusMessage('');
      }
    } else {
      // Clear states
      setPriceOverride('');
      setDueDate('');
    }
  }, [selectedItemId, selectedItem, projections, selectedTransaction]);

  // Catalog filtered view (Rent tab)
  const filteredCatalog = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return catalogItems.filter((item) => {
      const projection = projections[item.id];
      const effectiveStatus = projection?.effectiveStatus ?? item.status;
      const matchesStatus = statusFilter === 'all' || effectiveStatus === statusFilter;
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query) ||
        item.color.toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [catalogItems, projections, searchQuery, statusFilter]);

  // Active Rentals Queue
  const activeRentals = useMemo(
    () =>
      ledger.transactions.filter(
        (t) =>
          t.status === 'open' &&
          (historySearchQuery === '' ||
            t.customerName.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
            t.transactionNumber.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
            t.itemCode.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
            t.itemName.toLowerCase().includes(historySearchQuery.toLowerCase()))
      ),
    [ledger.transactions, historySearchQuery]
  );

  // Overdue Queue List
  const overdueTransactions = useMemo(() => getOverdueTransactions(ledger), [ledger]);

  // Open Maintenance Holds Queue
  const openMaintenanceHolds = useMemo(
    () =>
      getOpenMaintenanceHolds(ledger).filter(
        (h) =>
          historySearchQuery === '' ||
          h.itemName.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
          h.itemCode.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
          h.maintenanceNumber.toLowerCase().includes(historySearchQuery.toLowerCase())
      ),
    [ledger, historySearchQuery]
  );

  const receiptHistoryCounts = useMemo(
    () => ({
      open: ledger.receipts.filter((receipt) => receipt.status === 'open').length,
      closed: ledger.receipts.filter((receipt) => receipt.status === 'closed').length,
    }),
    [ledger.receipts]
  );

  const visibleReceiptHistory = useMemo(() => {
    const normalizedQuery = receiptSearchQuery.trim().toLowerCase();

    return ledger.receipts
      .filter((receipt) => receipt.status === receiptHistoryStatus)
      .filter((receipt) => matchesReceiptHistory(receipt, normalizedQuery))
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [ledger.receipts, receiptHistoryStatus, receiptSearchQuery]);

  const transactionsById = useMemo(
    () => new Map(ledger.transactions.map((transaction) => [transaction.id, transaction])),
    [ledger.transactions]
  );

  // FLOW ACTIONS
  const clearRentalSelection = () => {
    setSelectedItemId('');
    setSelectedTransactionId('');
    setSelectedMaintenanceId('');
    setPhotoDraft('customerPhoto', null);
    setPhotoDraft('idDocumentPhoto', null);
    setPendingRentalAction(null);
  };

  const handleRentSubmit = async () => {
    if (!selectedItem) return;

    if (!customerName.trim()) {
      setStatusMessage('Nama pelanggan wajib diisi.');
      return;
    }

    if (!customerPhone.trim()) {
      setStatusMessage('No. WhatsApp pelanggan wajib diisi untuk customer database.');
      return;
    }

    if (!dueDate) {
      setStatusMessage('Tanggal pengembalian wajib diisi.');
      return;
    }

    if (!customerPhoto) {
      setStatusMessage('Customer photo wajib ditambahkan sebelum transaksi dibuat.');
      return;
    }

    if (!idDocumentPhoto) {
      setStatusMessage('ID document photo wajib ditambahkan sebelum transaksi dibuat.');
      return;
    }

    const price = baseRentalPrice || selectedItem.rentalPrice;
    setIsCreatingRental(true);
    const formData = new FormData();
    formData.set('ledger', JSON.stringify(ledger));
    formData.set('itemId', selectedItem.id);
    formData.set('customerName', customerName.trim());
    formData.set('customerPhone', customerPhone.trim());
    formData.set('startDate', startDate);
    formData.set('dueDate', dueDate);
    formData.set('depositReceived', String(securityDepositAmount));
    formData.set('paymentMethod', paymentMethod);
    formData.set(
      'notes',
      [
        rentalNotes,
        extraReturnDays > 0
          ? `Tambahan return ${extraReturnDays} hari: ${formatCurrency(extraReturnPenalty)}.`
          : '',
      ].filter(Boolean).join('\n'),
    );
    formData.set('itemPrice', String(price + extraReturnPenalty));
    formData.set('customerPhoto', customerPhoto.file);
    formData.set('customerPhotoCaptureSource', customerPhoto.captureSource);
    formData.set('customerPhotoWidth', String(customerPhoto.width ?? ''));
    formData.set('customerPhotoHeight', String(customerPhoto.height ?? ''));
    formData.set('idDocumentPhoto', idDocumentPhoto.file);
    formData.set('idDocumentPhotoCaptureSource', idDocumentPhoto.captureSource);
    formData.set('idDocumentPhotoWidth', String(idDocumentPhoto.width ?? ''));
    formData.set('idDocumentPhotoHeight', String(idDocumentPhoto.height ?? ''));

    const response = await fetch('/api/admin/pos/transactions/rental-with-attachments', {
      method: 'POST',
      body: formData,
    });
    const result = (await response.json()) as RentalWithAttachmentsResponse;
    setIsCreatingRental(false);

    if (!result.ok) {
      setStatusMessage(result.error);
      setPendingRentalAction(null);
      return;
    }

    rememberCustomer(result.data.customer);
    setSelectedCustomerId(result.data.customer.id);
    writeSavedPosLedger(result.data.ledger);
    setLedgerError('');
    setTransactionAttachments((current) => {
      const withoutNew = current.filter(
        (attachment) => attachment.transactionId !== result.data.transactionId,
      );
      return [...withoutNew, ...result.data.attachments];
    });

    const newTransaction =
      result.data.ledger.transactions.find((transaction) => transaction.id === result.data.transactionId) ??
      result.data.ledger.transactions[0] ??
      null;

    if (newTransaction) {
      setInvoiceTransaction(newTransaction);
      setIsInvoiceOpen(true);
    }

    // Reset fields
    setCustomerName('');
    setCustomerPhone('');
    setSelectedCustomerId('');
    setCustomerLookupQuery('');
    setIsCustomerDatabaseOpen(false);
    setPhotoDraft('customerPhoto', null);
    setPhotoDraft('idDocumentPhoto', null);
    setRentalNotes('');
    setSelectedItemId('');
    setStatusMessage('');
    setPendingRentalAction(null);
  };

  const handleReturnSubmit = async () => {
    if (!selectedTransaction) return;

    const nextLedger = closeRentalTransaction(selectedTransaction.id, {
      returnDate,
      refundedAmount: Number(refundAmount) || 0,
      penaltyAmount: Number(penaltyAmount) || 0,
      adjustmentAmount: Number(returnAdjustmentAmount) || 0,
      note: returnNotes || 'Kebaya dikembalikan.',
      paymentMethod: returnPaymentMethod,
    });

    // Load invoice for the closed transaction
    await persistLedger(nextLedger);

    const refreshed = nextLedger.transactions.find((t) => t.id === selectedTransaction.id);
    if (refreshed) {
      setInvoiceTransaction(refreshed);
      setIsInvoiceOpen(true);
    }

    // Reset selection and outputs
    setSelectedTransactionId('');
    setSelectedItemId('');
    setReturnNotes('');
    setRefundAmount('0');
    setPenaltyAmount('0');
    setReturnAdjustmentAmount('0');
    setStatusMessage('');
    setPendingPosAction(null);
  };

  const handleCompleteMaintenanceSubmit = async (holdId: string) => {
    const nextLedger = completeMaintenanceHold(holdId, {
      note: maintenanceNote || 'Cuci bersih dan setrika siap sewa.',
    });
    await persistLedger(nextLedger);
    setMaintenanceNote('');
    setSelectedItemId('');
    setSelectedMaintenanceId('');
    setPendingPosAction(null);
  };

  const triggerInvoiceModal = (trx: PosTransaction) => {
    setInvoiceTransaction(trx);
    setIsInvoiceOpen(true);
  };

  const refreshWorkspaceData = async () => {
    setIsLoadingCatalog(true);
    setIsLoadingLedger(true);
    setIsLoadingCustomers(true);
    setCatalogError('');
    setLedgerError('');
    setCustomerError('');
    setStatusMessage('');

    const [catalogResult, ledgerResult] = await Promise.all([
      fetchAdminCatalogItemsAction(),
      fetchPosLedgerAction(),
    ]);
    const customersResult = await fetchCustomersAction({ status: 'active', limit: 300 });

    if (catalogResult.ok) {
      writeSavedCatalogItems(catalogResult.data);
    } else {
      setCatalogError(catalogResult.error);
    }

    if (ledgerResult.ok) {
      writeSavedPosLedger(ledgerResult.data);
    } else {
      setLedgerError(ledgerResult.error);
    }

    if (customersResult.ok) {
      setCustomers(customersResult.data);
      setCustomerError('');
    } else {
      setCustomerError(customersResult.error);
    }

    setIsLoadingCatalog(false);
    setIsLoadingLedger(false);
    setIsLoadingCustomers(false);
  };

  return (
    <div className="space-y-4">
      {/* 1. Clean Header without Summary Metrics */}
      <section className="border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Transactions
            </p>
            <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
              Cashier Workspace
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-neutral-500">
              Sewa baru, pengembalian, deposit/refund, denda, dan status cuci dalam satu alur kasir.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                document.getElementById('pos-receipt-history')?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                });
              }}
              className="inline-flex min-h-10 items-center gap-2 border border-neutral-300 bg-white px-3 text-xs font-bold uppercase tracking-wider text-neutral-700 transition-colors hover:border-neutral-900"
            >
              <Receipt className="h-4 w-4" /> Lihat History Open and Close Receipt
            </button>
            <button
              type="button"
              onClick={() => void refreshWorkspaceData()}
              disabled={isLoadingCatalog || isLoadingLedger || isLoadingCustomers}
              className="inline-flex min-h-10 items-center gap-2 bg-neutral-950 px-3 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-neutral-800"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingCatalog || isLoadingLedger || isLoadingCustomers ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 border-t border-neutral-100 pt-3 sm:grid-cols-3">
          <div className="flex items-center justify-between border border-neutral-200 bg-neutral-50 px-3 py-2">
            <span className="text-xs font-semibold text-neutral-500">Active rentals</span>
            <strong className="text-sm text-neutral-950">{activeRentals.length}</strong>
          </div>
          <div className="flex items-center justify-between border border-neutral-200 bg-neutral-50 px-3 py-2">
            <span className="text-xs font-semibold text-neutral-500">Overdue</span>
            <strong className={overdueTransactions.length > 0 ? 'text-sm text-red-700' : 'text-sm text-neutral-950'}>
              {overdueTransactions.length}
            </strong>
          </div>
          <div className="flex items-center justify-between border border-neutral-200 bg-neutral-50 px-3 py-2">
            <span className="text-xs font-semibold text-neutral-500">In laundry</span>
            <strong className="text-sm text-neutral-950">{openMaintenanceHolds.length}</strong>
          </div>
        </div>
      </section>

      {(isLoadingLedger || ledgerError) && (
        <div
          className={`border px-4 py-3 text-xs ${
            ledgerError
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-neutral-200 bg-neutral-50 text-neutral-500'
          }`}
        >
          {ledgerError || 'Memuat ledger POS dari database...'}
        </div>
      )}

      {/* Overdue alert strip */}
      {overdueTransactions.length > 0 && (
        <div className="border-l-4 border-red-600 bg-red-50 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-red-800">
                  Perhatian: {overdueTransactions.length} Persewaan Kebaya Terlambat Dikembalikan
                </p>
                <p className="text-xs text-red-700">
                  Silakan buka tab &quot;Pengembalian&quot; untuk menghubungi WhatsApp penyewa atau memproses denda keterlambatan.
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveTab('return');
                  setHistorySearchQuery('');
                }}
                className="text-xs font-semibold uppercase tracking-widest text-red-800 underline hover:text-red-950 shrink-0 sm:self-center"
              >
                Tinjau Terlambat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Split Layout Workspace */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        
        {/* LEFT COLUMN: The Sub-views for Cashier Flow tabs */}
        <section className="flex flex-col border border-neutral-200 bg-white shadow-sm">
          
          {/* Sub-navigation Tabs (Clean 3-Tab Layout) */}
          <div className="grid gap-2 border-b border-neutral-200 bg-neutral-50 p-2 sm:grid-cols-3">
            {(
              [
                { id: 'rent', label: '1. Sewa Kebaya', desc: 'Sewa offline baru' },
                { id: 'return', label: '2. Pengembalian', desc: 'Kembali & denda' },
                { id: 'maintenance', label: '3. Cuci & Laundry', desc: 'Kontrol kebersihan' },
              ] as { id: PosTab; label: string; desc: string }[]
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTab(t.id);
                }}
                className={`min-h-14 border px-3 py-2 text-left transition-colors ${
                  activeTab === t.id
                    ? 'border-neutral-900 bg-neutral-950 text-white'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400'
                }`}
              >
                <span className="block text-[11px] font-bold uppercase tracking-wider">{t.label}</span>
                <span className={`mt-0.5 block text-[10px] ${activeTab === t.id ? 'text-neutral-300' : 'text-neutral-400'}`}>
                  {t.desc}
                </span>
              </button>
            ))}
          </div>

          <div className="flex-grow p-3 sm:p-4">
            
            {/* FLOW 1: Rent Kebaya View */}
            {activeTab === 'rent' && (
              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari nama kebaya, kode inventaris, warna..."
                      className="h-10 w-full border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-4 text-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  </div>

                  <div className="relative w-full sm:w-44">
                    <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as CatalogStatusFilter)}
                      className="h-10 w-full border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-3 text-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    >
                      <option value="all">Semua Status</option>
                      <option value="available">AVAILABLE</option>
                      <option value="rented">RENTED</option>
                      <option value="maintenance">DICUCI</option>
                    </select>
                  </div>
                </div>

                {/* Catalog Grid */}
                <div className="grid max-h-[620px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {filteredCatalog.map((item) => {
                    const projection = projections[item.id];
                    const effStatus = projection?.effectiveStatus ?? item.status;
                    const isSelected = selectedItemId === item.id;
                    
                    let statusColor = 'border-emerald-200 bg-emerald-50 text-emerald-800';
                    if (effStatus === 'rented') {
                      statusColor = 'border-amber-200 bg-amber-50 text-amber-800';
                    } else if (effStatus === 'maintenance') {
                      statusColor = 'border-rose-200 bg-rose-50 text-rose-800';
                    }

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSelectedItemId(item.id);
                          setSelectedTransactionId('');
                          setSelectedMaintenanceId('');
                        }}
                        className={`flex min-h-[92px] gap-3 border p-2.5 text-left transition-colors ${
                          isSelected
                            ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900'
                            : 'border-neutral-200 bg-white hover:border-neutral-400'
                        }`}
                      >
                        <div className="h-16 w-14 shrink-0 overflow-hidden bg-neutral-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imageUrls[0]}
                            alt={item.name}
                            className="h-full w-full object-cover grayscale-30 hover:grayscale-0 transition-all"
                          />
                        </div>
                        <div className="min-w-0 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-1">
                              <h3 className="truncate text-sm font-semibold leading-tight text-neutral-950">
                                {item.name}
                              </h3>
                              <span className={`text-[9px] font-mono shrink-0 border px-1.5 py-0.5 uppercase ${statusColor}`}>
                                {effStatus === 'available' ? 'AVAILABLE' : effStatus === 'rented' ? 'RENTED' : 'DICUCI'}
                              </span>
                            </div>
                            <p className="text-[10px] font-mono text-neutral-400 mt-0.5">{item.code}</p>
                          </div>
                          <div className="flex items-center justify-between text-xs text-neutral-500 mt-2">
                            <span>{formatCurrency(item.rentalPrice)}</span>
                            {effStatus === 'rented' && projection.dueDate && (
                              <span className={`text-[10px] font-medium ${projection.isOverdue ? 'text-red-600' : 'text-neutral-500'}`}>
                                Kembali: {formatDate(projection.dueDate)}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {filteredCatalog.length === 0 && (
                    <div className="col-span-2 border border-dashed border-neutral-300 p-8 text-center text-xs text-neutral-500">
                      {isLoadingCatalog
                        ? 'Memuat katalog kebaya...'
                        : catalogError || 'Tidak ada kebaya dalam filter pencarian ini.'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* FLOW 2: Returns / Active Queue View */}
            {activeTab === 'return' && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    placeholder="Cari transaksi sewa aktif..."
                    className="h-10 w-full border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-4 text-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                </div>

                <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
                  {activeRentals.map((trx) => {
                    const isOverdue = overdueTransactions.some((o) => o.id === trx.id);
                    const attachments = attachmentsByTransaction.get(trx.id) ?? [];

                    return (
                      <div
                        key={trx.id}
                        className={`flex flex-col gap-3 border p-3 sm:flex-row sm:items-center sm:justify-between ${
                          selectedTransactionId === trx.id
                            ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900'
                            : isOverdue
                              ? 'border-red-300 bg-red-50/50'
                              : 'border-neutral-200 bg-white'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-neutral-900">
                              {trx.transactionNumber}
                            </span>
                            {isOverdue ? (
                              <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5">
                                TERLAMBAT
                              </span>
                            ) : (
                              <span className="border border-amber-200 bg-amber-50 text-amber-700 text-[9px] font-bold px-1.5 py-0.5">
                                RENTED
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-neutral-950">{trx.itemName}</p>
                          <p className="text-xs text-neutral-500">
                            Penyewa: <strong className="text-neutral-800">{trx.customerName}</strong> ({trx.customerPhone || 'no WhatsApp'})
                          </p>
                          <div className="text-[11px] text-neutral-400">
                            Batas Kembali: <span className="font-mono">{formatDate(trx.dueDate)}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {(['customer_photo', 'id_document'] as PosAttachmentKind[]).map((kind) => {
                              const attachment = attachments.find((entry) => entry.kind === kind);

                              return (
                                <span
                                  key={kind}
                                  className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                    attachment
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                      : 'border-red-200 bg-red-50 text-red-700'
                                  }`}
                                >
                                  <ImageIcon className="h-3 w-3" />
                                  {getAttachmentLabel(kind)}
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:self-center shrink-0">
                          {trx.customerPhone && (
                            <a
                              href={`https://wa.me/${trx.customerPhone.replace(/^0/, '62')}?text=${encodeURIComponent(
                                `Halo Kak ${trx.customerName}, pengingat dari Farsha Studio Paccerakkang. Sewa kebaya "${trx.itemName}" (${trx.itemCode}) dengan batas kembali tanggal ${formatDate(trx.dueDate)} sudah jatuh tempo. Mohon segera dikembalikan ya Kak. Terima kasih!`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 border border-emerald-300 bg-emerald-50 text-emerald-800 px-3 py-1.5 text-xs font-semibold hover:bg-emerald-100"
                            >
                              <MessageCircle className="h-3 w-3" /> WA
                            </a>
                          )}
                          <button
                            onClick={() => {
                              setSelectedTransactionId(trx.id);
                              setSelectedItemId(trx.itemId);
                              setSelectedMaintenanceId('');
                            }}
                            className="bg-neutral-900 hover:bg-neutral-800 text-white px-3 py-1.5 text-xs font-semibold"
                          >
                            Kembalikan
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {activeRentals.length === 0 && (
                    <div className="border border-dashed border-neutral-300 p-8 text-center text-xs text-neutral-500">
                      Tidak ada sewa aktif yang cocok dengan pencarian.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* FLOW 3: Maintenance Control View */}
            {activeTab === 'maintenance' && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    placeholder="Cari baju cuci..."
                    className="h-10 w-full border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-4 text-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                </div>

                <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
                  {openMaintenanceHolds.map((hold) => (
                    <div
                      key={hold.id}
                      className={`flex flex-col gap-3 border p-3 sm:flex-row sm:items-center sm:justify-between ${
                        selectedMaintenanceId === hold.id
                          ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900'
                          : 'border-neutral-200 bg-white'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-neutral-400">
                            {hold.maintenanceNumber}
                          </span>
                          <span className="border border-red-200 bg-red-50 text-red-800 text-[9px] font-bold px-1.5 py-0.5 uppercase">
                            Dicuci
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-neutral-950">{hold.itemName}</h4>
                        <p className="text-xs text-neutral-400 font-mono">{hold.itemCode}</p>
                        <p className="text-xs text-neutral-500">
                          Masuk cuci: <strong className="text-neutral-700">{formatDate(hold.openedAt)}</strong>
                        </p>
                        {hold.openedNote && (
                          <p className="text-xs italic text-neutral-400 mt-1">Catatan: &quot;{hold.openedNote}&quot;</p>
                        )}
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setSelectedMaintenanceId(hold.id);
                            setSelectedItemId(hold.itemId);
                            setSelectedTransactionId(hold.sourceTransactionId);
                          }}
                          className="border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 px-3 py-1.5 text-xs font-semibold"
                        >
                          Catatan
                        </button>
                      </div>
                    </div>
                  ))}

                  {openMaintenanceHolds.length === 0 && (
                    <div className="border border-dashed border-neutral-300 p-8 text-center text-xs text-neutral-500">
                      Tidak ada baju yang sedang dicuci.
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </section>

        {/* RIGHT COLUMN: Dynamic Action Workspace (Cashier operations context) */}
        <aside className="sticky top-4 flex max-h-[calc(100vh-2rem)] min-h-[620px] flex-col justify-between overflow-y-auto border border-neutral-200 bg-white p-4 shadow-sm">
          
          {/* Status alerting container */}
          {statusMessage && (
            <div className="mb-4 bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="flex-1">{statusMessage}</p>
              <button onClick={() => setStatusMessage('')} className="text-amber-500 hover:text-amber-700 shrink-0">
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* DYNAMIC VIEW SELECTOR */}
          <div>
            
            {/* IDLE VIEW */}
            {!selectedItem && !selectedTransaction && !selectedMaintenance && (
              <div className="space-y-4 px-4 py-20 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center border border-dashed border-neutral-400 bg-neutral-50 text-neutral-400">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="mx-auto max-w-xs space-y-1">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-900">
                    Select a work item
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Pilih baju, transaksi aktif, atau item laundry untuk membuka aksi kasir di panel ini.
                  </p>
                </div>
              </div>
            )}

            {/* FLOW 1 WORKSPACE: Create Rent (Selected available item) */}
            {selectedItem && selectedProjection?.effectiveStatus === 'available' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                
                {/* Item card overview */}
                <div className="flex gap-3 border border-neutral-200 bg-neutral-50 p-3">
                  <div className="h-16 w-14 shrink-0 overflow-hidden bg-neutral-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedItem.imageUrls[0]} alt={selectedItem.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold leading-tight text-neutral-950">
                      {selectedItem.name}
                    </h3>
                    <p className="text-[10px] font-mono text-neutral-400 uppercase mt-0.5">{selectedItem.code}</p>
                    <span className="mt-2 inline-flex bg-emerald-50 text-emerald-800 text-[9px] font-bold border border-emerald-200 px-1.5 py-0.5 uppercase">
                      AVAILABLE
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="border-b border-neutral-100 pb-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Rental Details
                  </h4>

                  <div className="border border-neutral-200 bg-neutral-50">
                    <div className="flex items-center justify-between gap-2 p-3">
                      <button
                        type="button"
                        onClick={() => setIsCustomerDatabaseOpen((current) => !current)}
                        className="inline-flex min-h-9 items-center gap-2 text-left text-xs font-bold uppercase tracking-wider text-neutral-700 hover:text-neutral-950"
                        aria-expanded={isCustomerDatabaseOpen}
                      >
                        <Users className="h-3.5 w-3.5" />
                        Customer database
                        {isCustomerDatabaseOpen ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <div className="flex items-center gap-3">
                        {selectedCustomer ? (
                          <span className="hidden max-w-[160px] truncate text-[11px] text-emerald-700 sm:inline">
                            Linked: {selectedCustomer.displayName}
                          </span>
                        ) : (
                          <span className="hidden text-[11px] text-neutral-400 sm:inline">
                            Optional picker
                          </span>
                        )}
                        <Link
                          href="/pos/customers"
                          className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 underline hover:text-neutral-950"
                        >
                          Open
                        </Link>
                      </div>
                    </div>

                    {selectedCustomer ? (
                      <div className="mx-3 mb-3 flex items-center justify-between gap-2 border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[11px] text-emerald-800">
                        <span className="min-w-0 truncate">
                          Linked: <strong>{selectedCustomer.displayName}</strong> ({selectedCustomer.primaryPhone})
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerId('')}
                          className="shrink-0 font-bold uppercase tracking-wider text-emerald-900 underline"
                        >
                          Clear
                        </button>
                      </div>
                    ) : null}

                    {isCustomerDatabaseOpen && (
                      <div className="space-y-2 border-t border-neutral-200 p-3">
                        <label className="block space-y-1">
                          <span className="text-xs font-semibold text-neutral-600">Cari / pilih customer lama</span>
                          <input
                            value={customerLookupQuery}
                            onChange={(event) => {
                              setCustomerLookupQuery(event.target.value);
                              setSelectedCustomerId('');
                            }}
                            placeholder={isLoadingCustomers ? 'Memuat customer...' : 'Nama, WhatsApp, email, Instagram'}
                            className="h-10 w-full border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                          />
                        </label>

                        {customerError && (
                          <p className="border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] text-red-700">
                            {customerError}
                          </p>
                        )}

                        {customerLookupQuery || customerLookupMatches.length > 0 ? (
                          <div className="max-h-36 overflow-y-auto border border-neutral-200 bg-white">
                            {customerLookupMatches.map((customer) => (
                              <button
                                key={customer.id}
                                type="button"
                                onClick={() => selectCustomer(customer)}
                                className="flex w-full items-center justify-between gap-2 border-b border-neutral-100 px-2 py-2 text-left text-xs last:border-b-0 hover:bg-neutral-50"
                              >
                                <span className="min-w-0">
                                  <span className="block truncate font-semibold text-neutral-950">{customer.displayName}</span>
                                  <span className="block truncate text-[11px] text-neutral-500">
                                    {customer.primaryPhone}
                                    {customer.instagram ? ` / @${customer.instagram.replace(/^@/, '')}` : ''}
                                  </span>
                                </span>
                                <span className="shrink-0 font-mono text-[10px] text-neutral-400">
                                  {customer.posTransactionCount + customer.bookingCount + customer.fittingCount}x
                                </span>
                              </button>
                            ))}

                            {customerLookupMatches.length === 0 && (
                              <p className="px-2 py-3 text-xs text-neutral-500">
                                Tidak ada customer cocok. Data baru akan dibuat saat transaksi disimpan.
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-[11px] leading-relaxed text-neutral-500">
                            Open this only when you want to reuse an existing customer. Manual name and WhatsApp below still create or update the customer record.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-neutral-600">Nama Pelanggan</span>
                    <input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Adelia Safitri"
                      className="h-10 w-full border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-neutral-600">No. WhatsApp Pelanggan</span>
                    <input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="e.g. 081234567890"
                      className="h-10 w-full border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1">
                      <span className="text-xs font-semibold text-neutral-600">Tanggal Sewa</span>
                      <input
                        type="date"
                        value={startDate}
                        min={getTodayInputValue()}
                        onChange={(e) => {
                          const nextStartDate = e.target.value;
                          const nextDefaultDueDate = addDaysToInputDate(nextStartDate, 3);
                          setStartDate(nextStartDate);
                          setDueDate((currentDueDate) =>
                            !currentDueDate || currentDueDate < nextDefaultDueDate
                              ? nextDefaultDueDate
                              : currentDueDate,
                          );
                        }}
                        className="h-10 w-full border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono"
                      />
                    </label>

                    <label className="block space-y-1">
                      <span className="text-xs font-semibold text-neutral-600">Tanggal Pengembalian</span>
                      <input
                        type="date"
                        value={dueDate}
                        min={defaultDueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="h-10 w-full border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono"
                      />
                      <span className="block text-[10px] leading-relaxed text-neutral-400">
                        Default 3 hari. Tambahan {formatCurrency(extraReturnDayPenalty)} per hari setelah {formatDate(defaultDueDate)}.
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1">
                      <span className="text-xs font-semibold text-neutral-600">Harga Sewa (Override)</span>
                      <input
                        inputMode="numeric"
                        value={priceOverride}
                        onChange={(e) => setPriceOverride(formatCurrencyInput(e.target.value))}
                        className="h-10 w-full border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono"
                      />
                    </label>

                    <label className="block space-y-1">
                      <span className="text-xs font-semibold text-neutral-600">Uang Jaminan (Deposit)</span>
                      <input
                        inputMode="numeric"
                        value={depositReceived}
                        onChange={(e) => setDepositReceived(formatCurrencyInput(e.target.value))}
                        className="h-10 w-full border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono"
                      />
                    </label>
                  </div>

                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-neutral-600">Metode Pembayaran</span>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PosPaymentMethod)}
                      className="h-10 w-full border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    >
                      {paymentMethods.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-neutral-600">Catatan Khusus</span>
                    <textarea
                      rows={2}
                      value={rentalNotes}
                      onChange={(e) => setRentalNotes(e.target.value)}
                      placeholder="e.g. Diambil sore, kancing kendur"
                      className="min-h-20 w-full resize-none border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  </label>

                  <div className="space-y-2 border-t border-neutral-100 pt-3">
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                        Customer Evidence
                      </h5>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-red-600">
                        Required
                      </span>
                    </div>
                    <RentalPhotoControl
                      title="Customer photo"
                      description="Foto customer saat transaksi sewa dibuat."
                      draft={customerPhoto}
                      field="customerPhoto"
                      onUpload={(field, file) => void handlePhotoUpload(field, file)}
                      onOpenCamera={(field) => void openCamera(field)}
                      onClear={(field) => setPhotoDraft(field, null)}
                    />
                    <RentalPhotoControl
                      title="ID document photo"
                      description="Foto dokumen identitas customer. Tidak masuk public media library."
                      draft={idDocumentPhoto}
                      field="idDocumentPhoto"
                      onUpload={(field, file) => void handlePhotoUpload(field, file)}
                      onOpenCamera={(field) => void openCamera(field)}
                      onClear={(field) => setPhotoDraft(field, null)}
                    />
                    {cameraError && (
                      <p className="border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
                        {cameraError}
                      </p>
                    )}
                  </div>
                </div>

                {/* Total Summary Box */}
                <div className="mt-4 space-y-2 border border-neutral-900 bg-neutral-950 p-4 text-white">
                  <div className="flex justify-between text-xs text-neutral-300">
                    <span>Biaya Sewa Pakaian</span>
                    <span>{formatCurrency(baseRentalPrice)}</span>
                  </div>
                  {extraReturnDays > 0 && (
                    <div className="flex justify-between text-xs text-amber-200">
                      <span>Tambahan return ({extraReturnDays} hari)</span>
                      <span>{formatCurrency(extraReturnPenalty)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-neutral-300 border-b border-white/10 pb-1.5">
                    <span>Security Deposit</span>
                    <span>{formatCurrency(securityDepositAmount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-sm">TOTAL HARUS BAYAR</span>
                    <span className="text-base text-amber-400">
                      {formatCurrency(rentTotalDue)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setPendingRentalAction('cancel')}
                    className="flex-grow border border-neutral-300 bg-white hover:bg-neutral-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-700"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => setPendingRentalAction('print')}
                    disabled={!customerPhoto || !idDocumentPhoto || isCreatingRental}
                    className="flex-grow bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-3 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:bg-neutral-300"
                  >
                    <Receipt className="h-4 w-4" />
                    {isCreatingRental ? 'Menyimpan...' : 'Cetak Sewa'}
                  </button>
                </div>

              </div>
            )}

            {/* FLOW 2 WORKSPACE: Return processing & active transaction management */}
            {selectedTransaction && selectedTransaction.status === 'open' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                
                {/* Transaction details card */}
                <div className="border border-[var(--theme-border)] bg-neutral-50 p-4 space-y-3">
                  <div className="flex justify-between items-start border-b border-neutral-200 pb-2">
                    <div>
                      <p className="font-mono text-[9px] font-bold text-neutral-400">NOMOR SEWA</p>
                      <h3 className="font-mono text-sm font-semibold text-neutral-900">
                        {selectedTransaction.transactionNumber}
                      </h3>
                    </div>
                    <span className="border border-amber-300 bg-amber-50 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 uppercase shrink-0">
                      Proses Kembali
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <p className="text-neutral-500">Penyewa:</p>
                    <p className="font-semibold text-neutral-950 text-right">{selectedTransaction.customerName}</p>

                    <p className="text-neutral-500">Nama Baju:</p>
                    <p className="font-semibold text-neutral-950 text-right">{selectedTransaction.itemName}</p>

                    <p className="text-neutral-500">Sewa Pokok:</p>
                    <p className="font-semibold text-neutral-950 text-right">{formatCurrency(selectedTransaction.itemPrice)}</p>

                    <p className="text-neutral-500">Deposit Dipegang:</p>
                    <p className="font-semibold text-neutral-950 text-right">{formatCurrency(selectedTransaction.depositReceived)}</p>

                    <p className="text-neutral-500">Jatuh Tempo:</p>
                    <p className="font-semibold text-neutral-950 text-right font-mono">{formatDate(selectedTransaction.dueDate)}</p>
                  </div>
                  <div className="border-t border-neutral-200 pt-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                        Private customer evidence
                      </p>
                      {attachmentError && (
                        <span className="text-[10px] text-red-600">{attachmentError}</span>
                      )}
                    </div>
                    <TransactionAttachmentStrip
                      attachments={attachmentsByTransaction.get(selectedTransaction.id) ?? []}
                      onDelete={(attachment) => void deleteAttachment(attachment)}
                      deletingAttachmentId={deletingAttachmentId}
                    />
                  </div>
                </div>

                {/* Return Form fields */}
                <div className="space-y-3 border-t border-neutral-100 pt-3">
                  <h4 className="border-b border-neutral-100 pb-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Return Details
                  </h4>

                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-neutral-600">Tanggal Pengembalian Real</span>
                    <input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="h-10 w-full border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1">
                      <span className="text-xs font-semibold text-neutral-600">Denda Terlambat/Rusak</span>
                      <input
                        type="number"
                        value={penaltyAmount}
                        onChange={(e) => setPenaltyAmount(e.target.value)}
                        className="h-10 w-full border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono"
                      />
                    </label>

                    <label className="block space-y-1">
                      <span className="text-xs font-semibold text-neutral-600">Pengembalian Deposit</span>
                      <input
                        type="number"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        className="h-10 w-full border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1">
                      <span className="text-xs font-semibold text-neutral-600">Penyesuaian (Adjustment)</span>
                      <input
                        type="number"
                        value={returnAdjustmentAmount}
                        onChange={(e) => setReturnAdjustmentAmount(e.target.value)}
                        placeholder="e.g. -10000"
                        className="h-10 w-full border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono"
                      />
                    </label>

                    <label className="block space-y-1">
                      <span className="text-xs font-semibold text-neutral-600">Metode Bayar Kembali</span>
                      <select
                        value={returnPaymentMethod}
                        onChange={(e) => setReturnPaymentMethod(e.target.value as PosPaymentMethod)}
                        className="h-10 w-full border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                      >
                        {paymentMethods.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-neutral-600">Catatan Kembali</span>
                    <input
                      value={returnNotes}
                      onChange={(e) => setReturnNotes(e.target.value)}
                      placeholder="Warna bersih, tidak melar"
                      className="h-10 w-full border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  </label>
                </div>

                {/* Return Summary Calculator Box */}
                <div className="space-y-2 border border-neutral-200 bg-neutral-50 p-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Security Deposit Dikembalikan:</span>
                    <span className="font-semibold text-emerald-700">-{formatCurrency(Number(refundAmount) || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Denda Diterima Kasir:</span>
                    <span className="font-semibold text-red-600">+{formatCurrency(Number(penaltyAmount) || 0)}</span>
                  </div>
                  <div className="flex justify-between border-t border-neutral-200 pt-2 font-bold text-neutral-800">
                    <span>Kas Bersih (Net Kembalian)</span>
                    <span>
                      {formatCurrency((Number(penaltyAmount) || 0) + (Number(returnAdjustmentAmount) || 0) - (Number(refundAmount) || 0))}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setPendingPosAction('return')}
                    className="w-full bg-neutral-900 hover:bg-neutral-800 text-white py-3 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Proses Pengembalian
                  </button>
                  <button
                    onClick={() => triggerInvoiceModal(selectedTransaction)}
                    className="w-full border border-neutral-300 hover:bg-neutral-50 py-2.5 text-xs font-semibold uppercase text-neutral-700 flex items-center justify-center gap-2"
                  >
                    <Printer className="h-4 w-4 text-neutral-400" /> Pratinjau Invoice
                  </button>
                </div>

              </div>
            )}

            {/* FLOW 3 WORKSPACE: Cleaning & Maintenance Release */}
            {selectedMaintenance && selectedMaintenance.status === 'open' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                
                <div className="space-y-3 border border-neutral-200 bg-neutral-50 p-4">
                  <div className="flex items-start justify-between border-b border-neutral-200 pb-2">
                    <div>
                      <p className="font-mono text-[9px] font-bold text-neutral-400">PEMELIHARAAN</p>
                      <h3 className="font-mono text-sm font-semibold text-neutral-900">
                        {selectedMaintenance.maintenanceNumber}
                      </h3>
                    </div>
                    <span className="border border-red-200 bg-red-50 text-red-800 text-[9px] font-bold px-1.5 py-0.5 uppercase shrink-0">
                      Sedang Dicuci
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <p className="text-neutral-500">Nama Baju:</p>
                    <p className="font-semibold text-neutral-950 text-right">{selectedMaintenance.itemName}</p>

                    <p className="text-neutral-500">Kode Pakaian:</p>
                    <p className="font-semibold text-neutral-950 text-right font-mono">{selectedMaintenance.itemCode}</p>

                    <p className="text-neutral-500">Sumber Sewa:</p>
                    <p className="font-semibold text-neutral-950 text-right font-mono">{selectedMaintenance.transactionNumber}</p>

                    <p className="text-neutral-500">Mulai Masuk:</p>
                    <p className="font-semibold text-neutral-950 text-right">{formatDate(selectedMaintenance.openedAt)}</p>

                    <p className="text-neutral-500">Blokir Kalender:</p>
                    <p className="font-semibold text-neutral-950 text-right">
                      Sampai {formatDate(addPreviewDays(selectedMaintenance.openedAt.slice(0, 10), previewMaintenanceBlockDays - 1))}
                    </p>
                  </div>
                  <p className="text-[11px] leading-relaxed text-neutral-500">
                    Selama status masih Dicuci, cek tanggal customer otomatis tertutup {previewMaintenanceBlockDays} hari.
                    Tandai selesai untuk membuat kebaya tersedia lebih cepat.
                  </p>
                </div>

                <div className="space-y-3 pt-3">
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-neutral-600">Catatan Pembersihan / Laundry</span>
                    <textarea
                      rows={3}
                      value={maintenanceNote}
                      onChange={(e) => setMaintenanceNote(e.target.value)}
                      placeholder="e.g. Dicuci kering, disetrika uap..."
                      className="min-h-24 w-full resize-none border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  </label>

                  <button
                    onClick={() => setPendingPosAction('maintenance')}
                    className="w-full bg-neutral-900 hover:bg-neutral-800 text-white py-3 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Tandai Selesai Cuci & Siap Sewa
                  </button>
                </div>

              </div>
            )}

          </div>

          {/* Quick instructions or credits in the context panel footer */}
          <div className="border-t border-neutral-100 pt-3 text-[10px] text-neutral-400 text-center font-mono leading-relaxed mt-6">
            Farsha Studio POS Workspace v2.0
            <br />
            Paccerakkang, Makassar, Sulawesi Selatan
          </div>
        </aside>

      </div>

      <section id="pos-receipt-history" className="scroll-mt-6 border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Receipt History
            </p>
            <h2 className="mt-1 font-serif text-xl font-semibold text-neutral-950">
              Open & Closed Receipts
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              Riwayat bukti transaksi POS berdasarkan status receipt saat dibuat.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="grid grid-cols-2 gap-1 border border-neutral-200 bg-neutral-50 p-1">
              {(
                [
                  { value: 'open', label: 'Open', count: receiptHistoryCounts.open },
                  { value: 'closed', label: 'Closed', count: receiptHistoryCounts.closed },
                ] as { value: ReceiptHistoryStatus; label: string; count: number }[]
              ).map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setReceiptHistoryStatus(tab.value)}
                  className={`min-h-9 px-3 text-xs font-bold uppercase tracking-wider ${
                    receiptHistoryStatus === tab.value
                      ? 'bg-neutral-950 text-white'
                      : 'bg-white text-neutral-500 hover:text-neutral-950'
                  }`}
                >
                  {tab.label}
                  <span className={receiptHistoryStatus === tab.value ? 'ml-2 text-neutral-300' : 'ml-2 text-neutral-400'}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <label className="flex min-h-10 items-center gap-2 border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-500 sm:w-72">
              <Search className="h-4 w-4" />
              <input
                value={receiptSearchQuery}
                onChange={(event) => setReceiptSearchQuery(event.target.value)}
                placeholder="Cari receipt, customer, baju..."
                className="w-full bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
              />
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
              <tr>
                <th className="px-3 py-2">Receipt</th>
                <th className="px-3 py-2">Transaction</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Issued</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {visibleReceiptHistory.map((receipt) => {
                const transaction = transactionsById.get(receipt.transactionId) ?? null;
                const amount = getReceiptDisplayAmount(receipt);

                return (
                  <tr key={receipt.id} className="hover:bg-neutral-50">
                    <td className="px-3 py-2">
                      <p className="font-mono text-xs font-semibold text-neutral-900">{receipt.receiptNumber}</p>
                      <span
                        className={`mt-1 inline-flex border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          receipt.status === 'open'
                            ? 'border-amber-200 bg-amber-50 text-amber-800'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        }`}
                      >
                        {receipt.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-mono text-xs font-semibold text-neutral-900">{receipt.transactionNumber}</p>
                      {transaction && transaction.status !== receipt.status && (
                        <p className="mt-0.5 text-[10px] text-neutral-400">
                          Current: {transaction.status}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-neutral-700">
                      <p>{receipt.customerName}</p>
                      {receipt.customerPhone && (
                        <p className="mt-0.5 text-[10px] text-neutral-400">{receipt.customerPhone}</p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-neutral-500">
                      <p className="font-medium text-neutral-700">{receipt.itemName}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-neutral-400">{receipt.itemCode}</p>
                    </td>
                    <td className="px-3 py-2">
                      <p className="text-xs font-semibold text-neutral-800">{getReceiptActionLabel(receipt.action)}</p>
                      <p className="mt-0.5 text-[10px] text-neutral-400">{receipt.title}</p>
                    </td>
                    <td className={`px-3 py-2 text-right font-semibold ${amount < 0 ? 'text-red-600' : 'text-neutral-900'}`}>
                      {amount < 0 ? '-' : ''}
                      {formatCurrency(Math.abs(amount))}
                      <p className="mt-0.5 text-[10px] font-normal uppercase text-neutral-400">{receipt.paymentMethod}</p>
                    </td>
                    <td className="px-3 py-2 text-xs text-neutral-500">{formatDateTime(receipt.createdAt)}</td>
                    <td className="px-3 py-2 text-right">
                      {transaction ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTransactionId(transaction.id);
                            setSelectedItemId(transaction.itemId);
                            setSelectedMaintenanceId('');
                            setInvoiceTransaction(transaction);
                            setIsInvoiceOpen(true);
                          }}
                          className="inline-flex min-h-8 items-center gap-1 border border-neutral-300 bg-white px-2 text-xs font-semibold uppercase tracking-wider text-neutral-700 hover:border-neutral-900 hover:text-neutral-950"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          Lihat
                        </button>
                      ) : (
                        <span className="text-xs text-neutral-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {visibleReceiptHistory.length === 0 && (
          <div className="border-t border-neutral-100 px-4 py-10 text-center text-sm text-neutral-500">
            Belum ada receipt {receiptHistoryStatus} yang cocok.
          </div>
        )}
      </section>

      {pendingRentalAction && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md border border-neutral-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-4">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Konfirmasi
                </p>
                <h3 className="mt-1 font-serif text-xl font-semibold text-neutral-950">
                  {pendingRentalAction === 'print' ? 'Cetak Sewa?' : 'Batalkan input sewa?'}
                </h3>
              </div>
              <button
                onClick={() => setPendingRentalAction(null)}
                className="p-1 text-neutral-400 hover:text-neutral-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {pendingRentalAction === 'print' ? (
              <div className="space-y-3 py-4 text-sm text-neutral-600">
                <p>
                  Transaksi untuk <strong className="text-neutral-950">{selectedItem.name}</strong> akan dibuat dan
                  langsung masuk ledger POS.
                </p>
                <div className="border border-neutral-200 bg-neutral-50 p-3 text-xs">
                  <div className="flex justify-between">
                    <span>Tanggal sewa</span>
                    <span className="font-mono text-neutral-950">{formatDate(startDate)}</span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span>Tanggal pengembalian</span>
                    <span className="font-mono text-neutral-950">{formatDate(dueDate)}</span>
                  </div>
                  {extraReturnDays > 0 && (
                    <div className="mt-1 flex justify-between text-amber-700">
                      <span>Tambahan return</span>
                      <span>{formatCurrency(extraReturnPenalty)}</span>
                    </div>
                  )}
                  <div className="mt-2 flex justify-between border-t border-neutral-200 pt-2 font-semibold text-neutral-950">
                    <span>Total dibayar</span>
                    <span>{formatCurrency(rentTotalDue)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="py-4 text-sm leading-relaxed text-neutral-600">
                Data yang sedang diisi untuk transaksi ini akan dibersihkan dari form. Tidak ada data POS yang dibuat.
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setPendingRentalAction(null)}
                disabled={isCreatingRental}
                className="flex-1 border border-neutral-300 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-50"
              >
                Kembali
              </button>
              <button
                onClick={() => {
                  if (pendingRentalAction === 'print') {
                    void handleRentSubmit();
                  } else {
                    clearRentalSelection();
                  }
                }}
                disabled={isCreatingRental}
                className={`flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white ${
                  pendingRentalAction === 'print'
                    ? 'bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {pendingRentalAction === 'print'
                  ? isCreatingRental
                    ? 'Menyimpan...'
                    : 'Ya, Cetak Sewa'
                  : 'Ya, Batal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cameraState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg border border-neutral-200 bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-3">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Webcam Capture
                </p>
                <h3 className="mt-1 font-serif text-xl font-semibold text-neutral-950">
                  {cameraState.field === 'customerPhoto' ? 'Customer photo' : 'ID document photo'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeCamera}
                className="p-1 text-neutral-400 hover:text-neutral-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="py-4">
              <video
                ref={cameraVideoRef}
                autoPlay
                playsInline
                muted
                className="aspect-[4/3] w-full bg-neutral-950 object-cover"
              />
              {cameraError && (
                <p className="mt-2 border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
                  {cameraError}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeCamera}
                className="flex-1 border border-neutral-300 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={captureCameraPhoto}
                className="flex-1 bg-neutral-900 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white hover:bg-neutral-800"
              >
                Capture photo
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingPosAction && (selectedTransaction || selectedMaintenance) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md border border-neutral-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-4">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Konfirmasi
                </p>
                <h3 className="mt-1 font-serif text-xl font-semibold text-neutral-950">
                  {pendingPosAction === 'return'
                    ? 'Proses pengembalian?'
                    : 'Tandai cuci selesai?'}
                </h3>
              </div>
              <button
                onClick={() => setPendingPosAction(null)}
                className="p-1 text-neutral-400 hover:text-neutral-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {pendingPosAction === 'return' && selectedTransaction ? (
              <div className="space-y-3 py-4 text-sm text-neutral-600">
                <p>
                  Transaksi <strong className="text-neutral-950">{selectedTransaction.transactionNumber}</strong> akan
                  ditutup dan item masuk status cuci/laundry.
                </p>
                <div className="border border-neutral-200 bg-neutral-50 p-3 text-xs">
                  <div className="flex justify-between">
                    <span>Kebaya</span>
                    <span className="font-semibold text-neutral-950">{selectedTransaction.itemName}</span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span>Tanggal kembali</span>
                    <span className="font-mono text-neutral-950">{formatDate(returnDate)}</span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span>Deposit dikembalikan</span>
                    <span className="text-emerald-700">-{formatCurrency(Number(refundAmount) || 0)}</span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span>Denda/adjustment</span>
                    <span className="text-red-600">
                      +{formatCurrency((Number(penaltyAmount) || 0) + (Number(returnAdjustmentAmount) || 0))}
                    </span>
                  </div>
                </div>
              </div>
            ) : selectedMaintenance ? (
              <div className="space-y-3 py-4 text-sm text-neutral-600">
                <p>
                  <strong className="text-neutral-950">{selectedMaintenance.itemName}</strong> akan ditandai selesai
                  cuci dan kembali tersedia untuk disewa.
                </p>
                <div className="border border-neutral-200 bg-neutral-50 p-3 text-xs">
                  <div className="flex justify-between">
                    <span>Kode</span>
                    <span className="font-mono text-neutral-950">{selectedMaintenance.itemCode}</span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span>Maintenance</span>
                    <span className="font-mono text-neutral-950">{selectedMaintenance.maintenanceNumber}</span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span>Mulai cuci</span>
                    <span>{formatDate(selectedMaintenance.openedAt)}</span>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex gap-2">
              <button
                onClick={() => setPendingPosAction(null)}
                className="flex-1 border border-neutral-300 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-50"
              >
                Kembali
              </button>
              <button
                onClick={() => {
                  if (pendingPosAction === 'return') {
                    void handleReturnSubmit();
                  } else if (selectedMaintenance) {
                    void handleCompleteMaintenanceSubmit(selectedMaintenance.id);
                  }
                }}
                className="flex-1 bg-neutral-900 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white hover:bg-neutral-800"
              >
                {pendingPosAction === 'return' ? 'Ya, Proses' : 'Ya, Selesai'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. PRINTABLE RECEIPT MODAL SYSTEM */}
      {isInvoiceOpen && invoiceTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:bg-white print:p-0">
          <div className="bg-white shadow-2xl w-full max-w-md overflow-hidden flex flex-col print:shadow-none print:w-full print:max-w-none">
            
            {/* Modal Controls (Hidden in Print) */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-100 bg-neutral-50 print:hidden">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
                Pratinjau Bukti Transaksi
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center px-3 py-1.5 border border-neutral-900 bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800"
                >
                  <Printer className="h-3.5 w-3.5 mr-1" /> Cetak (Print)
                </button>
                <button
                  onClick={() => {
                    setIsInvoiceOpen(false);
                    setInvoiceTransaction(null);
                  }}
                  className="text-neutral-500 hover:text-neutral-800 p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable Content Block */}
            <div className="p-8 space-y-6 print:p-0 print:m-0" id="farsha-invoice-print-area">
              
              {/* Receipt Header branding */}
              <div className="text-center space-y-1.5 border-b border-dashed border-neutral-300 pb-5">
                <div className="flex items-center justify-center gap-1.5 text-neutral-900">
                  <Store className="h-5 w-5 shrink-0" />
                  <span className="font-serif font-bold text-lg tracking-tight uppercase">
                    Farsha Studio
                  </span>
                </div>
                <div className="text-[10px] text-neutral-500 leading-normal">
                  <p className="flex items-center justify-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" /> Paccerakkang, Makassar, Sulawesi Selatan
                  </p>
                  <p className="flex items-center justify-center gap-1">
                    <Phone className="h-3 w-3 shrink-0" /> +62 821-9457-3759
                  </p>
                </div>
              </div>

              {/* Receipt metadata section */}
              <div className="grid grid-cols-2 gap-y-1 text-xs border-b border-dashed border-neutral-200 pb-3">
                <p className="text-neutral-400">Nomor Transaksi:</p>
                <p className="font-semibold text-neutral-900 text-right font-mono">#{invoiceTransaction.transactionNumber}</p>

                <p className="text-neutral-400">Tanggal Cetak:</p>
                <p className="text-neutral-800 text-right">{new Date().toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>

                <p className="text-neutral-400">Kasir:</p>
                <p className="text-neutral-800 text-right">Admin Studio</p>

                <p className="text-neutral-400">Status Transaksi:</p>
                <p className="font-semibold text-neutral-900 text-right uppercase text-[10px]">{invoiceTransaction.status}</p>
              </div>

              {/* Customer details section */}
              <div className="space-y-1 text-xs">
                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Detail Pelanggan</p>
                <div className="bg-neutral-50 p-2 text-neutral-800">
                  <p className="font-semibold">{invoiceTransaction.customerName}</p>
                  {invoiceTransaction.customerPhone && (
                    <p className="text-[11px] text-neutral-500 mt-0.5">{invoiceTransaction.customerPhone}</p>
                  )}
                </div>
              </div>

              {/* Line items list */}
              <div className="space-y-2">
                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Pakaian Disewa</p>
                <table className="w-full text-left text-xs text-neutral-700">
                  <thead className="border-b border-neutral-300 text-[10px] uppercase text-neutral-500">
                    <tr>
                      <th className="pb-1">Baju / Kode</th>
                      <th className="pb-1 text-center">Batas Kembali</th>
                      <th className="pb-1 text-right">Biaya</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-neutral-100">
                      <td className="py-2.5">
                        <p className="font-semibold text-neutral-900">{invoiceTransaction.itemName}</p>
                        <p className="text-[10px] text-neutral-400 font-mono mt-0.5">{invoiceTransaction.itemCode}</p>
                      </td>
                      <td className="py-2.5 text-center text-neutral-800 font-mono">
                        {formatDate(invoiceTransaction.dueDate)}
                      </td>
                      <td className="py-2.5 text-right font-medium text-neutral-900">
                        {formatCurrency(invoiceTransaction.itemPrice)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Total calculations list */}
              <div className="space-y-2 border-t border-neutral-200 pt-3">
                <div className="flex justify-between text-xs text-neutral-600">
                  <span>Biaya Persewaan Pokok</span>
                  <span>{formatCurrency(invoiceTransaction.itemPrice)}</span>
                </div>
                
                {invoiceTransaction.depositReceived > 0 && (
                  <div className="flex justify-between text-xs text-neutral-600">
                    <span>Uang Jaminan (Security Deposit)</span>
                    <span>{formatCurrency(invoiceTransaction.depositReceived)}</span>
                  </div>
                )}

                {invoiceTransaction.penaltyAmount > 0 && (
                  <div className="flex justify-between text-xs text-red-600 font-medium">
                    <span>Denda Terlambat / Kerusakan (+)</span>
                    <span>{formatCurrency(invoiceTransaction.penaltyAmount)}</span>
                  </div>
                )}

                {invoiceTransaction.adjustmentAmount !== 0 && (
                  <div className="flex justify-between text-xs text-neutral-600">
                    <span>Koreksi Penyesuaian Kasir (+/-)</span>
                    <span>{invoiceTransaction.adjustmentAmount > 0 ? '+' : ''}{formatCurrency(invoiceTransaction.adjustmentAmount)}</span>
                  </div>
                )}

                {invoiceTransaction.refundedAmount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-700 font-medium">
                    <span>Pengembalian Security Deposit (-)</span>
                    <span>-{formatCurrency(invoiceTransaction.refundedAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center border-t border-neutral-900 pt-2 font-bold text-neutral-900 text-sm">
                  <span>TOTAL NET DIBAYAR</span>
                  <span className="text-base text-neutral-950">
                    {formatCurrency(
                      invoiceTransaction.itemPrice +
                      invoiceTransaction.depositReceived +
                      invoiceTransaction.penaltyAmount +
                      invoiceTransaction.adjustmentAmount -
                      invoiceTransaction.refundedAmount
                    )}
                  </span>
                </div>

                <div className="text-[10px] text-neutral-400 font-mono">
                  <span>Metode Bayar: </span>
                  <span className="font-semibold text-neutral-700 uppercase">{invoiceTransaction.paymentMethod}</span>
                </div>
              </div>

              {/* Receipt bottom Terms */}
              <div className="pt-6 border-t border-dashed border-neutral-200 text-center text-[10px] text-neutral-400 space-y-1">
                <p className="font-medium text-neutral-500">
                  Terima kasih atas kunjungan Anda di Farsha Studio!
                </p>
                <p className="leading-relaxed">
                  Harap periksa kelengkapan pakaian sewaan sebelum meninggalkan toko. Keterlambatan pengembalian dikenakan denda sesuai peraturan studio yang berlaku.
                </p>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Global CSS Inject to support clean full page printing of receipt */}
      <style jsx global>{`
        @media print {
          /* Hide everything in layout and background */
          body * {
            visibility: hidden;
            background: none !important;
          }
          
          /* Only display the designated print area div */
          #farsha-invoice-print-area,
          #farsha-invoice-print-area * {
            visibility: visible;
          }
          
          /* Position the print block correctly at absolute top left page boundary */
          #farsha-invoice-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          
          /* Hide scrollbars, dialog controls, and close buttons on printed paper */
          .fixed, 
          .fixed * {
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
