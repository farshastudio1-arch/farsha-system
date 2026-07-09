'use client';

import { useMemo, useState } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  FileUp,
  ImageUp,
  Mail,
  MessageCircle,
  Plus,
  Printer,
  RefreshCw,
  ReceiptText,
  Send,
  Search,
  XCircle,
  WalletCards,
  X,
} from 'lucide-react';

import type { KebayaItem } from '@/data/mockData';
import type { BookingQueueRow, BookingStatus } from '@/lib/booking-db';

type QueueFilter = 'active' | 'all' | 'requested' | 'payment_submitted' | 'dp_confirmed' | 'closed';
type CloseBookingAction = 'reject' | 'cancel';

type ApiResponse<T> = {
  ok?: boolean;
  data?: T;
  error?: string;
  code?: string;
};

type CreateBookingResponse = {
  id: string;
  bookingNumber: string;
};

type BookingInvoiceSnapshot = {
  bookingNumber: string;
  customerName: string;
  customerWhatsapp: string;
  customerEmail: string | null;
  customerInstagram: string | null;
  pickupMethod: 'store' | 'gosend';
  deliveryAddress: string | null;
  notes: string;
  itemCount: number;
  items: Array<{
    itemCode: string;
    itemName: string;
    rentalPrice: number;
    dpAmount: number;
    extraReturnFee: number;
    pickupDate: string;
    eventDate: string;
    returnDueDate: string;
  }>;
  paymentReference: string | null;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  rentalEstimateTotal: number;
  extraReturnFeeTotal: number;
  bank: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    isConfigured: boolean;
  };
};

type BookingInvoiceRecord = {
  id: string;
  bookingId: string;
  invoiceNumber: string;
  invoiceType: string;
  status: string;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  htmlSnapshot: string | null;
  r2Key: string | null;
  url: string | null;
  issuedAt: string;
};

type BookingReceiptRecord = {
  id: string;
  bookingId: string;
  receiptNumber: string;
  receiptType: string;
  status: string;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  htmlSnapshot: string | null;
  r2Key: string | null;
  url: string | null;
  issuedAt: string;
};

type BookingDocumentRecord = BookingInvoiceRecord | BookingReceiptRecord;
type BookingDocumentKind = 'invoice' | 'receipt';

type ManualBookingForm = {
  itemId: string;
  pickupDate: string;
  returnDueDate: string;
  customerName: string;
  customerWhatsapp: string;
  customerEmail: string;
  customerInstagram: string;
  pickupMethod: 'store' | 'gosend';
  deliveryAddress: string;
  paymentReference: string;
  notes: string;
};

const queueFilters: Array<{ value: QueueFilter; label: string }> = [
  { value: 'active', label: 'Aktif' },
  { value: 'all', label: 'Semua' },
  { value: 'requested', label: 'Request' },
  { value: 'payment_submitted', label: 'Bukti masuk' },
  { value: 'dp_confirmed', label: 'Biaya Booking verified' },
  { value: 'closed', label: 'Ditutup' },
];

const closedBookingStatuses: BookingStatus[] = ['completed', 'rejected', 'cancelled', 'expired'];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function parseDatePart(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatDatePart(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function addDays(value: string, days: number) {
  const date = parseDatePart(value);
  date.setDate(date.getDate() + days);

  return formatDatePart(date);
}

function getDayDifference(startDate: string, endDate: string) {
  const start = parseDatePart(startDate).getTime();
  const end = parseDatePart(endDate).getTime();

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 0;
  }

  return Math.max(0, Math.round((end - start) / 86400000));
}

function todayPlusDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);

  return formatDatePart(date);
}

function createEmptyManualBookingForm(itemId: string): ManualBookingForm {
  const pickupDate = todayPlusDays(14);

  return {
    itemId,
    pickupDate,
    returnDueDate: addDays(pickupDate, 2),
    customerName: '',
    customerWhatsapp: '',
    customerEmail: '',
    customerInstagram: '',
    pickupMethod: 'store',
    deliveryAddress: '',
    paymentReference: '',
    notes: '',
  };
}

function getStatusLabel(status: BookingStatus) {
  switch (status) {
    case 'requested':
      return 'Request';
    case 'payment_submitted':
      return 'Bukti masuk';
    case 'dp_confirmed':
      return 'Biaya Booking verified';
    case 'fitting_link_sent':
      return 'Fitting sent';
    case 'picked_up':
      return 'Picked up';
    case 'completed':
      return 'Completed';
    case 'rejected':
      return 'Rejected';
    case 'cancelled':
      return 'Cancelled';
    case 'expired':
      return 'Expired';
    default:
      return status;
  }
}

function getStatusClass(status: BookingStatus) {
  switch (status) {
    case 'requested':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'payment_submitted':
      return 'border-sky-200 bg-sky-50 text-sky-800';
    case 'dp_confirmed':
    case 'fitting_link_sent':
    case 'picked_up':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'rejected':
    case 'cancelled':
    case 'expired':
      return 'border-red-200 bg-red-50 text-red-700';
    default:
      return 'border-neutral-200 bg-neutral-50 text-neutral-600';
  }
}

function parseDocumentSnapshot(document: BookingDocumentRecord | null): BookingInvoiceSnapshot | null {
  if (!document?.htmlSnapshot) {
    return null;
  }

  try {
    return JSON.parse(document.htmlSnapshot) as BookingInvoiceSnapshot;
  } catch {
    return null;
  }
}

function normalizeWhatsAppNumber(value: string) {
  const digits = value.replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  if (digits.startsWith('0')) {
    return `62${digits.slice(1)}`;
  }

  return digits.startsWith('62') ? digits : digits;
}

function getDocumentNumber(document: BookingDocumentRecord, kind: BookingDocumentKind) {
  return kind === 'receipt'
    ? (document as BookingReceiptRecord).receiptNumber
    : (document as BookingInvoiceRecord).invoiceNumber;
}

function createDocumentMessage(
  document: BookingDocumentRecord,
  snapshot: BookingInvoiceSnapshot,
  kind: BookingDocumentKind,
) {
  const bankLine = snapshot.bank.isConfigured
    ? `${snapshot.bank.bankName} ${snapshot.bank.accountNumber} a/n ${snapshot.bank.accountName}`
    : 'rekening Farsha Studio';
  const documentNumber = getDocumentNumber(document, kind);

  if (kind === 'receipt') {
    return [
      `Halo ${snapshot.customerName}, pembayaran Biaya Booking Farsha Studio sudah kami terima.`,
      '',
      `No. Booking: ${snapshot.bookingNumber}`,
      `No. Receipt: ${documentNumber}`,
      `Biaya Booking diterima: ${formatCurrency(document.totalAmount)}`,
      '',
      'Tanggal booking sudah terkunci. Link jadwal fitting akan dikirimkan setelah ini.',
    ].join('\n');
  }

  return [
    `Halo ${snapshot.customerName}, berikut invoice booking Farsha Studio.`,
    '',
    `No. Booking: ${snapshot.bookingNumber}`,
    `No. Invoice: ${documentNumber}`,
    `Total Biaya Booking: ${formatCurrency(document.totalAmount)}`,
    `Pembayaran ke: ${bankLine}`,
    '',
    'Setelah transfer, mohon kirim bukti pembayaran agar admin bisa mengunci tanggal booking.',
  ].join('\n');
}

function getItemLabel(booking: BookingQueueRow) {
  const label = booking.itemLabel ?? booking.firstItemName ?? 'Booking item';

  return booking.itemCount > 1 ? `${label} +${booking.itemCount - 1} item` : label;
}

function canConfirmDp(booking: BookingQueueRow) {
  return booking.proofCount > 0 && booking.status !== 'dp_confirmed' && !closedBookingStatuses.includes(booking.status);
}

function canGenerateReceipt(booking: BookingQueueRow) {
  return ['dp_confirmed', 'fitting_link_sent', 'picked_up', 'completed'].includes(booking.status);
}

function canSendFittingLink(booking: BookingQueueRow) {
  return booking.status === 'dp_confirmed' && Boolean(booking.receiptNumber);
}

function canCloseBooking(booking: BookingQueueRow) {
  return !closedBookingStatuses.includes(booking.status);
}

export default function PosBookingsClient({
  initialItems,
  initialItemId,
  initialBookings,
}: {
  initialItems: KebayaItem[];
  initialItemId: string;
  initialBookings: BookingQueueRow[];
}) {
  const [bookings, setBookings] = useState<BookingQueueRow[]>(initialBookings);
  const [selectedBookingId, setSelectedBookingId] = useState(
    initialBookings.find((booking) => !closedBookingStatuses.includes(booking.status))?.id ??
      initialBookings[0]?.id ??
      '',
  );
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('active');
  const [itemFilter, setItemFilter] = useState(initialItemId);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [uploadingBookingId, setUploadingBookingId] = useState('');
  const [confirmingBookingId, setConfirmingBookingId] = useState('');
  const [closingBookingId, setClosingBookingId] = useState('');
  const [closeReason, setCloseReason] = useState('');
  const [isDocumentOpen, setIsDocumentOpen] = useState(false);
  const [documentData, setDocumentData] = useState<BookingDocumentRecord | null>(null);
  const [documentKind, setDocumentKind] = useState<BookingDocumentKind>('invoice');
  const [documentBookingId, setDocumentBookingId] = useState('');
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);
  const [sendingFittingBookingId, setSendingFittingBookingId] = useState('');
  const [isManualFormOpen, setIsManualFormOpen] = useState(false);
  const [isCreatingManualBooking, setIsCreatingManualBooking] = useState(false);
  const [manualBookingForm, setManualBookingForm] = useState<ManualBookingForm>(() =>
    createEmptyManualBookingForm(initialItemId || initialItems[0]?.id || ''),
  );
  const [manualItemSearch, setManualItemSearch] = useState('');

  const metrics = useMemo(
    () => ({
      requested: bookings.filter((booking) => booking.status === 'requested').length,
      paymentSubmitted: bookings.filter((booking) => booking.status === 'payment_submitted').length,
      dpConfirmed: bookings.filter((booking) => booking.status === 'dp_confirmed').length,
    }),
    [bookings],
  );

  const filteredBookings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return bookings.filter((booking) => {
      if (queueFilter === 'active' && closedBookingStatuses.includes(booking.status)) {
        return false;
      }

      if (queueFilter === 'closed' && !closedBookingStatuses.includes(booking.status)) {
        return false;
      }

      if (
        queueFilter !== 'active' &&
        queueFilter !== 'all' &&
        queueFilter !== 'closed' &&
        booking.status !== queueFilter
      ) {
        return false;
      }

      if (itemFilter && booking.firstItemId !== itemFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        booking.bookingNumber,
        booking.customerName,
        booking.customerWhatsapp,
        booking.customerEmail ?? '',
        booking.customerInstagram ?? '',
        booking.firstItemCode ?? '',
        booking.firstItemName ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [bookings, itemFilter, queueFilter, searchQuery]);

  const selectedBooking =
    bookings.find((booking) => booking.id === selectedBookingId) ?? filteredBookings[0] ?? null;
  const manualBookingItem = useMemo(
    () => initialItems.find((item) => item.id === manualBookingForm.itemId) ?? null,
    [initialItems, manualBookingForm.itemId],
  );
  const filteredManualItems = useMemo(() => {
    const query = manualItemSearch.trim().toLowerCase();

    if (!query) {
      return initialItems;
    }

    return initialItems.filter((item) =>
      [
        item.code,
        item.name,
        item.color,
        item.model,
        item.size,
        ...(item.categories ?? []),
        ...(item.wearStyles ?? []),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [initialItems, manualItemSearch]);
  const visibleManualItems = useMemo(() => {
    if (!manualBookingItem || filteredManualItems.some((item) => item.id === manualBookingItem.id)) {
      return filteredManualItems;
    }

    return [manualBookingItem, ...filteredManualItems];
  }, [filteredManualItems, manualBookingItem]);
  const manualPickupDate = manualBookingForm.pickupDate;
  const manualEventDate = manualPickupDate ? addDays(manualPickupDate, 1) : '';
  const manualDefaultReturnDueDate = manualPickupDate ? addDays(manualPickupDate, 2) : '';
  const manualReturnDueDate =
    manualDefaultReturnDueDate && manualBookingForm.returnDueDate < manualDefaultReturnDueDate
      ? manualDefaultReturnDueDate
      : manualBookingForm.returnDueDate;
  const manualExtraReturnDays = manualDefaultReturnDueDate
    ? getDayDifference(manualDefaultReturnDueDate, manualReturnDueDate)
    : 0;
  const manualExtraReturnFee = manualExtraReturnDays * 100000;
  const manualDpTotal = 100000;
  const manualInstagramDiscount = manualBookingForm.customerInstagram.trim()
    ? Math.round(manualDpTotal * 0.1)
    : 0;
  const manualPayNowTotal = Math.max(manualDpTotal - manualInstagramDiscount, 0);
  const manualRentalEstimateTotal = (manualBookingItem?.rentalPrice ?? 0) + manualExtraReturnFee;

  const refreshBookings = async (preferredBookingId?: string) => {
    setIsRefreshing(true);
    setActionError('');

    try {
      const response = await fetch('/api/admin/bookings', { cache: 'no-store' });
      const payload = (await response.json()) as ApiResponse<BookingQueueRow[]>;

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? 'Booking queue belum bisa dimuat.');
      }

      setBookings(payload.data);
      setSelectedBookingId((currentId) => {
        if (preferredBookingId && payload.data?.some((booking) => booking.id === preferredBookingId)) {
          return preferredBookingId;
        }

        if (payload.data?.some((booking) => booking.id === currentId)) {
          return currentId;
        }

        return payload.data?.[0]?.id ?? '';
      });
      setActionMessage('Antrean booking diperbarui dari database.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Booking queue belum bisa dimuat.';
      setActionError(message);
    } finally {
      setIsRefreshing(false);
    }
  };

  const updateManualBookingForm = <K extends keyof ManualBookingForm>(
    key: K,
    value: ManualBookingForm[K],
  ) => {
    setManualBookingForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updateManualPickupDate = (pickupDate: string) => {
    if (!pickupDate) {
      updateManualBookingForm('pickupDate', pickupDate);
      return;
    }

    setManualBookingForm((current) => ({
      ...current,
      pickupDate,
      returnDueDate: addDays(pickupDate, 2),
    }));
  };

  const createManualBooking = async () => {
    if (!manualBookingItem) {
      setActionError('Pilih item kebaya untuk booking WhatsApp.');
      return;
    }

    if (!manualBookingForm.customerName.trim() || !manualBookingForm.customerWhatsapp.trim()) {
      setActionError('Nama dan WhatsApp customer wajib diisi.');
      return;
    }

    if (manualBookingForm.pickupMethod === 'gosend' && !manualBookingForm.deliveryAddress.trim()) {
      setActionError('Alamat pengiriman wajib diisi untuk GoSend Instant.');
      return;
    }

    setIsCreatingManualBooking(true);
    setActionError('');
    setActionMessage('');

    try {
      const response = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemIds: [manualBookingItem.id],
          pickupDate: manualPickupDate,
          eventDate: manualEventDate,
          returnDueDate: manualReturnDueDate,
          customerName: manualBookingForm.customerName,
          customerWhatsapp: manualBookingForm.customerWhatsapp,
          customerEmail: manualBookingForm.customerEmail,
          customerInstagram: manualBookingForm.customerInstagram,
          pickupMethod: manualBookingForm.pickupMethod,
          deliveryAddress: manualBookingForm.deliveryAddress,
          notes: manualBookingForm.notes,
          source: 'whatsapp',
          status: 'requested',
          dpPerItem: manualDpTotal,
          instagramDiscountAmount: manualInstagramDiscount,
          extraReturnFeeTotal: manualExtraReturnFee,
          rentalEstimateTotal: manualRentalEstimateTotal,
          paymentReference: manualBookingForm.paymentReference,
        }),
      });
      const payload = (await response.json()) as ApiResponse<CreateBookingResponse>;

      if (!response.ok || !payload.ok || !payload.data?.id) {
        throw new Error(payload.error ?? 'Booking WhatsApp belum bisa dibuat.');
      }

      setActionMessage(`${payload.data.bookingNumber} dibuat dari chat WhatsApp.`);
      setIsManualFormOpen(false);
      setManualBookingForm(createEmptyManualBookingForm(manualBookingItem.id));
      await refreshBookings(payload.data.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Booking WhatsApp belum bisa dibuat.';
      setActionError(message);
    } finally {
      setIsCreatingManualBooking(false);
    }
  };

  const uploadPaymentProof = async (booking: BookingQueueRow, file: File | null) => {
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setUploadingBookingId(booking.id);
    setActionError('');
    setActionMessage('');

    try {
      const response = await fetch(`/api/admin/bookings/${booking.id}/payment-proof`, {
        method: 'POST',
        body: formData,
      });
      const payload = (await response.json()) as ApiResponse<unknown>;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Upload bukti transfer gagal.');
      }

      setActionMessage(`${booking.bookingNumber} menerima bukti transfer.`);
      await refreshBookings();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload bukti transfer gagal.';
      setActionError(message);
    } finally {
      setUploadingBookingId('');
    }
  };

  const confirmDp = async (booking: BookingQueueRow) => {
    setConfirmingBookingId(booking.id);
    setActionError('');
    setActionMessage('');

    try {
      const response = await fetch(`/api/admin/bookings/${booking.id}/confirm-dp`, {
        method: 'POST',
      });
      const payload = (await response.json()) as ApiResponse<unknown>;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Konfirmasi Biaya Booking gagal.');
      }

      await refreshBookings();
      setActionMessage(`${booking.bookingNumber} Biaya Booking verified. Buat paid receipt lalu kirim link fitting.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Konfirmasi Biaya Booking gagal.';
      setActionError(message);
    } finally {
      setConfirmingBookingId('');
    }
  };

  const closeBookingStatus = async (booking: BookingQueueRow, action: CloseBookingAction) => {
    const fallbackReason =
      action === 'reject'
        ? 'Ditolak admin / bukti Biaya Booking tidak valid.'
        : 'Dibatalkan customer/admin.';
    const reason = closeReason.trim() || fallbackReason;

    setClosingBookingId(booking.id);
    setActionError('');
    setActionMessage('');

    try {
      const response = await fetch(`/api/admin/bookings/${booking.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, reason }),
      });
      const payload = (await response.json()) as ApiResponse<unknown>;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Status booking belum bisa diubah.');
      }

      setActionMessage(
        action === 'reject'
          ? `${booking.bookingNumber} ditolak dan dipindah ke Ditutup.`
          : `${booking.bookingNumber} dibatalkan dan dipindah ke Ditutup.`,
      );
      setCloseReason('');
      await refreshBookings();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Status booking belum bisa diubah.';
      setActionError(message);
    } finally {
      setClosingBookingId('');
    }
  };

  const openInvoice = async (booking: BookingQueueRow) => {
    setDocumentBookingId(booking.id);
    setIsGeneratingInvoice(true);
    setActionError('');
    setActionMessage('');

    try {
      const response = await fetch(`/api/admin/bookings/${booking.id}/invoice`, {
        method: 'POST',
      });
      const payload = (await response.json()) as ApiResponse<BookingInvoiceRecord>;

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? 'Invoice belum bisa dibuat.');
      }

      setDocumentData(payload.data);
      setDocumentKind('invoice');
      setIsDocumentOpen(true);
      await refreshBookings(booking.id);
      setActionMessage(`${payload.data.invoiceNumber} siap dikirim ke customer.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invoice belum bisa dibuat.';
      setActionError(message);
    } finally {
      setIsGeneratingInvoice(false);
      setDocumentBookingId('');
    }
  };

  const openReceipt = async (booking: BookingQueueRow) => {
    setDocumentBookingId(booking.id);
    setIsGeneratingReceipt(true);
    setActionError('');
    setActionMessage('');

    try {
      const response = await fetch(`/api/admin/bookings/${booking.id}/receipt`, {
        method: 'POST',
      });
      const payload = (await response.json()) as ApiResponse<BookingReceiptRecord>;

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? 'Receipt belum bisa dibuat.');
      }

      setDocumentData(payload.data);
      setDocumentKind('receipt');
      setIsDocumentOpen(true);
      await refreshBookings(booking.id);
      setActionMessage(`${payload.data.receiptNumber} siap dikirim ke customer.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Receipt belum bisa dibuat.';
      setActionError(message);
    } finally {
      setIsGeneratingReceipt(false);
      setDocumentBookingId('');
    }
  };

  const sendFittingLink = async (booking: BookingQueueRow) => {
    setSendingFittingBookingId(booking.id);
    setActionError('');
    setActionMessage('');

    try {
      const response = await fetch(`/api/admin/bookings/${booking.id}/fitting-link`, {
        method: 'POST',
      });
      const payload = (await response.json()) as ApiResponse<unknown>;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Status fitting belum bisa dikirim.');
      }

      await refreshBookings(booking.id);
      setActionMessage(`${booking.bookingNumber} ditandai sudah dikirim link fitting.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Status fitting belum bisa dikirim.';
      setActionError(message);
    } finally {
      setSendingFittingBookingId('');
    }
  };

  const closeDocumentModal = () => {
    setIsDocumentOpen(false);
    setDocumentData(null);
  };

  const printDocument = () => {
    window.print();
  };

  const documentSnapshot = parseDocumentSnapshot(documentData);
  const documentNumber = documentData ? getDocumentNumber(documentData, documentKind) : '';
  const documentMessage =
    documentData && documentSnapshot ? createDocumentMessage(documentData, documentSnapshot, documentKind) : '';
  const documentWhatsAppUrl =
    documentSnapshot && documentMessage
      ? `https://wa.me/${normalizeWhatsAppNumber(documentSnapshot.customerWhatsapp)}?text=${encodeURIComponent(
          documentMessage,
        )}`
      : '';
  const documentEmailUrl =
    documentSnapshot?.customerEmail && documentMessage
      ? `mailto:${documentSnapshot.customerEmail}?subject=${encodeURIComponent(
          `${documentKind === 'receipt' ? 'Receipt' : 'Invoice'} ${documentNumber} Farsha Studio`,
        )}&body=${encodeURIComponent(documentMessage)}`
      : '';

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            margin: 12mm;
          }

          html,
          body {
            width: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            background: white !important;
          }

          body {
            margin: 0 !important;
          }

          body > div {
            display: block !important;
            min-height: 0 !important;
            background: white !important;
          }

          body > div > header {
            display: none !important;
          }

          body > div > main {
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          body * {
            visibility: hidden !important;
          }

          .booking-page-screen-shell {
            display: none !important;
          }

          .booking-invoice-print-modal {
            position: static !important;
            inset: auto !important;
            display: block !important;
            overflow: visible !important;
            background: white !important;
            padding: 0 !important;
          }

          .booking-invoice-print-frame {
            width: 100% !important;
            max-width: none !important;
            box-shadow: none !important;
          }

          #booking-invoice-print-area,
          #booking-invoice-print-area * {
            visibility: visible !important;
          }

          #booking-invoice-print-area {
            position: static !important;
            top: 0;
            left: 0;
            width: 100% !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
          }

          .booking-invoice-no-print {
            display: none !important;
          }
        }
      `}</style>
    <main className="booking-page-screen-shell theme-surface min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="border theme-border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-400">
                POS Booking
              </p>
              <h1 className="mt-1 font-serif text-4xl font-semibold text-neutral-950">
                Booking Control Desk
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-neutral-500">
                Antrean booking dari D1 untuk upload bukti transfer dan konfirmasi Biaya Booking.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setIsManualFormOpen((isOpen) => !isOpen)}
                className="inline-flex min-h-11 items-center justify-center gap-2 bg-neutral-950 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800"
              >
                {isManualFormOpen ? <X className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                {isManualFormOpen ? 'Tutup' : 'Booking WhatsApp'}
              </button>
              <button
                type="button"
                onClick={() => void refreshBookings()}
                disabled={isRefreshing}
                className="inline-flex min-h-11 items-center justify-center gap-2 border border-neutral-900 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-neutral-950 hover:bg-neutral-50 disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="border border-neutral-200 bg-neutral-50 p-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Request
              </p>
              <strong className="mt-2 block text-2xl text-neutral-950">{metrics.requested}</strong>
            </div>
            <div className="border border-neutral-200 bg-neutral-50 p-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Bukti Masuk
              </p>
              <strong className="mt-2 block text-2xl text-neutral-950">{metrics.paymentSubmitted}</strong>
            </div>
            <div className="border border-neutral-200 bg-neutral-50 p-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Biaya Booking Verified
              </p>
              <strong className="mt-2 block text-2xl text-neutral-950">{metrics.dpConfirmed}</strong>
            </div>
          </div>
        </section>

        {isManualFormOpen && (
          <section className="border theme-border bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-400">
                  Manual Booking
                </p>
                <h2 className="mt-1 font-serif text-2xl font-semibold text-neutral-950">
                  Booking dari Chat WhatsApp
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-neutral-500">
                  Booking dibuat sebagai request. Kalender baru terkunci setelah bukti transfer diupload dan Biaya Booking dikonfirmasi.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-1.5 md:col-span-2">
                  <span className="text-sm font-semibold text-neutral-700">Item kebaya</span>
                  <div className="flex min-h-12 items-center gap-3 border border-neutral-200 bg-white px-3">
                    <Search className="h-4 w-4 text-neutral-400" />
                    <input
                      value={manualItemSearch}
                      onChange={(event) => setManualItemSearch(event.target.value)}
                      placeholder="Cari kode, nama, warna, model..."
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                    />
                  </div>
                  <select
                    value={manualBookingForm.itemId}
                    onChange={(event) => updateManualBookingForm('itemId', event.target.value)}
                    className="min-h-12 w-full border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                  >
                    <option value="">Pilih item</option>
                    {visibleManualItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code} / {item.name}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-neutral-500">
                    {filteredManualItems.length} item cocok dari {initialItems.length} item katalog.
                  </span>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold text-neutral-700">Tanggal pickup</span>
                  <input
                    type="date"
                    min={todayPlusDays(0)}
                    value={manualBookingForm.pickupDate}
                    onChange={(event) => updateManualPickupDate(event.target.value)}
                    className="min-h-12 w-full border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold text-neutral-700">Tanggal return</span>
                  <input
                    type="date"
                    min={manualDefaultReturnDueDate}
                    value={manualReturnDueDate}
                    onChange={(event) => updateManualBookingForm('returnDueDate', event.target.value)}
                    className="min-h-12 w-full border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold text-neutral-700">Nama customer</span>
                  <input
                    value={manualBookingForm.customerName}
                    onChange={(event) => updateManualBookingForm('customerName', event.target.value)}
                    className="min-h-12 w-full border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold text-neutral-700">Nomor WhatsApp</span>
                  <input
                    value={manualBookingForm.customerWhatsapp}
                    onChange={(event) => updateManualBookingForm('customerWhatsapp', event.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="min-h-12 w-full border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold text-neutral-700">Email</span>
                  <input
                    type="email"
                    value={manualBookingForm.customerEmail}
                    onChange={(event) => updateManualBookingForm('customerEmail', event.target.value)}
                    placeholder="Opsional"
                    className="min-h-12 w-full border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold text-neutral-700">Instagram</span>
                  <input
                    value={manualBookingForm.customerInstagram}
                    onChange={(event) => updateManualBookingForm('customerInstagram', event.target.value)}
                    placeholder="Opsional, diskon Biaya Booking 10%"
                    className="min-h-12 w-full border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                  />
                </label>

                <div className="space-y-1.5">
                  <span className="text-sm font-semibold text-neutral-700">Metode pickup</span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => updateManualBookingForm('pickupMethod', 'store')}
                      className={`min-h-12 border px-3 text-xs font-bold uppercase tracking-wider ${
                        manualBookingForm.pickupMethod === 'store'
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 bg-white text-neutral-600'
                      }`}
                    >
                      Ambil store
                    </button>
                    <button
                      type="button"
                      onClick={() => updateManualBookingForm('pickupMethod', 'gosend')}
                      className={`min-h-12 border px-3 text-xs font-bold uppercase tracking-wider ${
                        manualBookingForm.pickupMethod === 'gosend'
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 bg-white text-neutral-600'
                      }`}
                    >
                      GoSend
                    </button>
                  </div>
                </div>

                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold text-neutral-700">Payment ref</span>
                  <input
                    value={manualBookingForm.paymentReference}
                    onChange={(event) => updateManualBookingForm('paymentReference', event.target.value)}
                    placeholder="Opsional"
                    className="min-h-12 w-full border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                  />
                </label>

                {manualBookingForm.pickupMethod === 'gosend' && (
                  <label className="block space-y-1.5 md:col-span-2">
                    <span className="text-sm font-semibold text-neutral-700">Alamat pengiriman</span>
                    <textarea
                      rows={3}
                      value={manualBookingForm.deliveryAddress}
                      onChange={(event) => updateManualBookingForm('deliveryAddress', event.target.value)}
                      className="w-full resize-none border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                    />
                    <span className="text-xs text-neutral-500">Ongkir GoSend dibayar oleh customer.</span>
                  </label>
                )}

                <label className="block space-y-1.5 md:col-span-2">
                  <span className="text-sm font-semibold text-neutral-700">Catatan dari chat</span>
                  <textarea
                    rows={3}
                    value={manualBookingForm.notes}
                    onChange={(event) => updateManualBookingForm('notes', event.target.value)}
                    placeholder="Contoh: request fitting, acara lamaran, warna tema"
                    className="w-full resize-none border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                  />
                </label>
              </div>

              <aside className="space-y-3">
                {manualBookingItem && (
                  <div className="border border-neutral-200 bg-neutral-50 p-3">
                    <div className="flex gap-3">
                      <div className="h-24 w-20 shrink-0 overflow-hidden bg-neutral-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={manualBookingItem.imageUrls[0]}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          {manualBookingItem.code}
                        </p>
                        <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-neutral-950">
                          {manualBookingItem.name}
                        </h3>
                        <p className="mt-1 text-xs text-neutral-500">
                          {formatCurrency(manualBookingItem.rentalPrice)} / 3 hari
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border border-neutral-200 bg-white p-3 text-sm">
                  <h3 className="font-semibold text-neutral-950">Ringkasan tanggal</h3>
                  <div className="mt-3 space-y-2 text-neutral-600">
                    <div className="flex justify-between gap-3">
                      <span>Pickup</span>
                      <strong className="text-right text-neutral-950">{formatDate(manualPickupDate)}</strong>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Acara</span>
                      <strong className="text-right text-neutral-950">
                        {formatDate(manualEventDate)}
                      </strong>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Return</span>
                      <strong className="text-right text-neutral-950">{formatDate(manualReturnDueDate)}</strong>
                    </div>
                  </div>
                </div>

                <div className="border border-neutral-200 bg-neutral-50 p-3 text-sm">
                  <h3 className="font-semibold text-neutral-950">Ringkasan biaya</h3>
                  <div className="mt-3 space-y-2 text-neutral-600">
                    <div className="flex justify-between gap-3">
                      <span>Biaya Booking</span>
                      <strong className="text-neutral-950">{formatCurrency(manualDpTotal)}</strong>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Diskon Instagram</span>
                      <strong className="text-neutral-950">-{formatCurrency(manualInstagramDiscount)}</strong>
                    </div>
                    <div className="flex justify-between gap-3 border-t border-neutral-200 pt-2">
                      <span>Biaya Booking dibayar</span>
                      <strong className="text-neutral-950">{formatCurrency(manualPayNowTotal)}</strong>
                    </div>
                    <div className="flex justify-between gap-3 text-xs">
                      <span>Estimasi sewa</span>
                      <strong className="text-neutral-950">{formatCurrency(manualRentalEstimateTotal)}</strong>
                    </div>
                    {manualExtraReturnDays > 0 && (
                      <p className="text-xs text-neutral-500">
                        Termasuk tambahan return {manualExtraReturnDays} hari.
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void createManualBooking()}
                  disabled={isCreatingManualBooking || !manualBookingItem}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-emerald-700 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500"
                >
                  <Plus className="h-4 w-4" />
                  {isCreatingManualBooking ? 'Membuat...' : 'Buat booking WhatsApp'}
                </button>
              </aside>
            </div>
          </section>
        )}

        {(actionMessage || actionError) && (
          <p
            className={`border p-3 text-sm font-semibold ${
              actionError
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            {actionError || actionMessage}
          </p>
        )}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="border theme-border bg-white p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
              <label className="flex min-h-12 items-center gap-3 border border-neutral-200 bg-white px-3">
                <Search className="h-5 w-5 text-neutral-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Cari booking, nama, WhatsApp, kode item..."
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </label>
              <select
                value={itemFilter}
                onChange={(event) => setItemFilter(event.target.value)}
                className="min-h-12 border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none"
              >
                <option value="">Semua item</option>
                {initialItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} / {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {queueFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setQueueFilter(filter.value)}
                  className={`border px-3 py-2 text-[10px] font-bold uppercase tracking-wider ${
                    queueFilter === filter.value
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-400'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {filteredBookings.map((booking) => {
                const isSelected = selectedBooking?.id === booking.id;

                return (
                  <button
                    key={booking.id}
                    type="button"
                    onClick={() => setSelectedBookingId(booking.id)}
                    className={`block w-full border p-4 text-left transition-colors ${
                      isSelected
                        ? 'border-neutral-900 bg-neutral-50'
                        : 'border-neutral-200 bg-white hover:border-neutral-400'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-400">
                          {booking.bookingNumber}
                        </p>
                        <h2 className="mt-1 text-base font-semibold text-neutral-950">
                          {booking.customerName}
                        </h2>
                        <p className="mt-1 text-sm text-neutral-500">{getItemLabel(booking)}</p>
                      </div>
                      <span
                        className={`inline-flex self-start border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusClass(
                          booking.status,
                        )}`}
                      >
                        {getStatusLabel(booking.status)}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-neutral-500 md:grid-cols-3">
                      <span>Pickup: {formatDate(booking.firstPickupDate)}</span>
                      <span>Acara: {formatDate(booking.firstEventDate)}</span>
                      <span>Return: {formatDate(booking.lastReturnDueDate)}</span>
                    </div>
                  </button>
                );
              })}

              {filteredBookings.length === 0 && (
                <div className="border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
                  Belum ada booking D1 dalam antrean ini.
                </div>
              )}
            </div>
          </div>

          <aside className="border theme-border bg-white p-5 shadow-sm">
            {selectedBooking ? (
              <div className="space-y-5">
                <header>
                  <p className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-400">
                    Booking File
                  </p>
                  <h2 className="mt-1 font-mono text-2xl font-bold text-neutral-950">
                    {selectedBooking.bookingNumber}
                  </h2>
                  <p className="mt-2 text-sm text-neutral-500">{getItemLabel(selectedBooking)}</p>
                </header>

                <div className="grid gap-3 text-sm">
                  <div className="border border-neutral-200 bg-neutral-50 p-3">
                    <p className="text-neutral-400">Pemesan</p>
                    <strong className="mt-1 block text-neutral-950">{selectedBooking.customerName}</strong>
                    <p className="mt-1 text-neutral-600">{selectedBooking.customerWhatsapp}</p>
                    {selectedBooking.customerEmail && (
                      <p className="text-neutral-600">{selectedBooking.customerEmail}</p>
                    )}
                    {selectedBooking.customerInstagram && (
                      <p className="text-neutral-600">@{selectedBooking.customerInstagram.replace(/^@/, '')}</p>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="border border-neutral-200 bg-neutral-50 p-3">
                      <p className="text-neutral-400">Biaya Booking</p>
                      <strong className="mt-1 block text-neutral-950">
                        {formatCurrency(Math.max(selectedBooking.dpTotal - selectedBooking.instagramDiscountAmount, 0))}
                      </strong>
                    </div>
                    <div className="border border-neutral-200 bg-neutral-50 p-3">
                      <p className="text-neutral-400">Status bayar</p>
                      <strong className="mt-1 block text-neutral-950">
                        {selectedBooking.paymentStatus ?? '-'}
                      </strong>
                    </div>
                  </div>

                  <div className="border border-neutral-200 bg-neutral-50 p-3">
                    <p className="text-neutral-400">Payment ref</p>
                    <strong className="mt-1 block text-neutral-950">
                      {selectedBooking.paymentReference || '-'}
                    </strong>
                    {selectedBooking.proofUrl && (
                      <a
                        href={selectedBooking.proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-950 underline"
                      >
                        <ImageUp className="h-4 w-4" />
                        Lihat bukti transfer
                      </a>
                    )}
                    {selectedBooking.proofFilename && (
                      <p className="mt-2 text-xs text-neutral-500">{selectedBooking.proofFilename}</p>
                    )}
                  </div>

                  <div className="grid gap-3 text-xs sm:grid-cols-2">
                    <div className="border border-neutral-200 p-3">
                      <CalendarCheck className="h-4 w-4 text-neutral-400" />
                      <p className="mt-2 text-neutral-500">Pickup</p>
                      <strong className="mt-1 block text-neutral-950">
                        {formatDate(selectedBooking.firstPickupDate)}
                      </strong>
                    </div>
                    <div className="border border-neutral-200 p-3">
                      <CalendarCheck className="h-4 w-4 text-neutral-400" />
                      <p className="mt-2 text-neutral-500">Return</p>
                      <strong className="mt-1 block text-neutral-950">
                        {formatDate(selectedBooking.lastReturnDueDate)}
                      </strong>
                    </div>
                  </div>

                  <div className="border border-neutral-200 bg-neutral-50 p-3">
                    <p className="text-neutral-400">Catatan</p>
                    <p className="mt-1 text-neutral-700">{selectedBooking.notes || '-'}</p>
                    {selectedBooking.pickupMethod === 'gosend' && selectedBooking.deliveryAddress && (
                      <p className="mt-2 text-neutral-700">Alamat: {selectedBooking.deliveryAddress}</p>
                    )}
                  </div>

                  {(selectedBooking.rejectedReason || selectedBooking.cancelledReason) && (
                    <div className="border border-red-200 bg-red-50 p-3">
                      <p className="text-neutral-500">Alasan ditutup</p>
                      <p className="mt-1 text-sm font-semibold text-red-700">
                        {selectedBooking.rejectedReason || selectedBooking.cancelledReason}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-3 border-t border-neutral-200 pt-5">
                  {canCloseBooking(selectedBooking) ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void openInvoice(selectedBooking)}
                        disabled={isGeneratingInvoice && documentBookingId === selectedBooking.id}
                        className="inline-flex min-h-12 w-full items-center justify-center gap-2 border border-neutral-900 bg-white px-4 py-3 text-xs font-bold uppercase tracking-wider text-neutral-950 hover:bg-neutral-50 disabled:cursor-wait disabled:opacity-60"
                      >
                        <ReceiptText className="h-4 w-4" />
                        {isGeneratingInvoice && documentBookingId === selectedBooking.id
                          ? 'Menyiapkan invoice...'
                          : 'Generate / Lihat Invoice'}
                      </button>

                      <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 border border-neutral-300 bg-white px-4 py-3 text-xs font-bold uppercase tracking-wider text-neutral-950 hover:border-neutral-900">
                        <FileUp className="h-4 w-4" />
                        {uploadingBookingId === selectedBooking.id ? 'Uploading...' : 'Upload bukti transfer'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          className="sr-only"
                          disabled={uploadingBookingId === selectedBooking.id}
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0] ?? null;
                            void uploadPaymentProof(selectedBooking, file);
                            event.currentTarget.value = '';
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        disabled={!canConfirmDp(selectedBooking) || confirmingBookingId === selectedBooking.id}
                        onClick={() => void confirmDp(selectedBooking)}
                        className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-emerald-700 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {selectedBooking.status === 'dp_confirmed'
                          ? 'Biaya Booking sudah dikonfirmasi'
                          : confirmingBookingId === selectedBooking.id
                            ? 'Confirming...'
                            : 'Konfirmasi Biaya Booking'}
                      </button>

                      {selectedBooking.proofCount <= 0 && (
                        <p className="text-xs text-neutral-500">
                          Konfirmasi Biaya Booking aktif setelah bukti transfer diupload.
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() => void openReceipt(selectedBooking)}
                        disabled={
                          !canGenerateReceipt(selectedBooking) ||
                          (isGeneratingReceipt && documentBookingId === selectedBooking.id)
                        }
                        className="inline-flex min-h-12 w-full items-center justify-center gap-2 border border-emerald-700 bg-white px-4 py-3 text-xs font-bold uppercase tracking-wider text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-400"
                      >
                        <ReceiptText className="h-4 w-4" />
                        {isGeneratingReceipt && documentBookingId === selectedBooking.id
                          ? 'Menyiapkan receipt...'
                          : selectedBooking.receiptNumber
                            ? 'Lihat Paid Receipt'
                            : 'Generate Paid Receipt'}
                      </button>

                      <button
                        type="button"
                        onClick={() => void sendFittingLink(selectedBooking)}
                        disabled={
                          selectedBooking.status === 'fitting_link_sent' ||
                          !canSendFittingLink(selectedBooking) ||
                          sendingFittingBookingId === selectedBooking.id
                        }
                        className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-neutral-950 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500"
                      >
                        <Send className="h-4 w-4" />
                        {selectedBooking.status === 'fitting_link_sent'
                          ? 'Link fitting sudah dikirim'
                          : sendingFittingBookingId === selectedBooking.id
                            ? 'Mengirim status...'
                            : 'Kirim link jadwal fitting'}
                      </button>

                      {!selectedBooking.receiptNumber && canGenerateReceipt(selectedBooking) && (
                        <p className="text-xs text-neutral-500">
                          Tombol link fitting aktif setelah paid receipt dibuat.
                        </p>
                      )}

                      <div className="space-y-2 border-t border-neutral-200 pt-3">
                        <label className="block space-y-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                            Alasan reject/cancel
                          </span>
                          <textarea
                            rows={2}
                            value={closeReason}
                            onChange={(event) => setCloseReason(event.target.value)}
                            placeholder="Opsional, akan masuk status history"
                            className="w-full resize-none border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900"
                          />
                        </label>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            disabled={closingBookingId === selectedBooking.id}
                            onClick={() => void closeBookingStatus(selectedBooking, 'reject')}
                            className="inline-flex min-h-11 items-center justify-center gap-2 border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold uppercase tracking-wider text-red-700 hover:border-red-400 disabled:cursor-wait disabled:opacity-60"
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </button>
                          <button
                            type="button"
                            disabled={closingBookingId === selectedBooking.id}
                            onClick={() => void closeBookingStatus(selectedBooking, 'cancel')}
                            className="inline-flex min-h-11 items-center justify-center gap-2 border border-neutral-300 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-neutral-700 hover:border-neutral-900 disabled:cursor-wait disabled:opacity-60"
                          >
                            <X className="h-4 w-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-500">
                      Booking ini sudah ditutup. Data tetap tersimpan untuk riwayat.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-sm text-neutral-500">
                <WalletCards className="mx-auto h-8 w-8 text-neutral-300" />
                <p className="mt-3">Pilih booking untuk melihat detail.</p>
              </div>
            )}
          </aside>
        </section>
      </div>
    </main>

      {isDocumentOpen && documentData && documentSnapshot && (
        <div className="booking-invoice-print-modal fixed inset-0 z-50 overflow-y-auto bg-black/55 px-4 py-6">
          <div className="booking-invoice-print-frame mx-auto max-w-4xl bg-white shadow-2xl">
            <div className="booking-invoice-no-print flex flex-col gap-3 border-b border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  {documentKind === 'receipt' ? 'Paid Receipt' : 'Invoice Booking'}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-neutral-950">{documentNumber}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={printDocument}
                  className="inline-flex min-h-10 items-center justify-center gap-2 border border-neutral-900 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-950 hover:bg-neutral-50"
                >
                  <Printer className="h-4 w-4" />
                  Print / Save PDF
                </button>
                {documentWhatsAppUrl && (
                  <a
                    href={documentWhatsAppUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center justify-center gap-2 bg-emerald-700 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-emerald-800"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </a>
                )}
                {documentEmailUrl && (
                  <a
                    href={documentEmailUrl}
                    className="inline-flex min-h-10 items-center justify-center gap-2 border border-neutral-300 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-950 hover:border-neutral-900"
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </a>
                )}
                <button
                  type="button"
                  onClick={closeDocumentModal}
                  className="inline-flex min-h-10 items-center justify-center gap-2 border border-neutral-300 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-950 hover:border-neutral-900"
                >
                  <X className="h-4 w-4" />
                  Tutup
                </button>
              </div>
            </div>

            <article id="booking-invoice-print-area" className="bg-white p-6 text-neutral-950 sm:p-8">
              <header className="flex flex-col gap-6 border-b border-neutral-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-400">
                    Farsha Studio
                  </p>
                  <h1 className="mt-2 font-serif text-3xl font-semibold text-neutral-950">
                    {documentKind === 'receipt' ? 'Receipt Biaya Booking Terbayar' : 'Invoice Biaya Booking'}
                  </h1>
                  <p className="mt-2 text-sm text-neutral-500">
                    {documentKind === 'receipt'
                      ? 'Biaya Booking sudah diverifikasi admin dan tanggal booking sudah terkunci.'
                      : 'Biaya Booking hanya untuk mengamankan tanggal dan bersifat non-refundable.'}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-mono text-lg font-bold text-neutral-950">{documentNumber}</p>
                  <p className="mt-1 text-sm text-neutral-500">{formatDateTime(documentData.issuedAt)}</p>
                  <p className="mt-1 text-sm text-neutral-500">Booking {documentSnapshot.bookingNumber}</p>
                </div>
              </header>

              <section className="grid gap-4 border-b border-neutral-200 py-6 sm:grid-cols-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    {documentKind === 'receipt' ? 'Diterima dari' : 'Ditagihkan kepada'}
                  </h3>
                  <p className="mt-2 text-base font-semibold text-neutral-950">{documentSnapshot.customerName}</p>
                  <p className="mt-1 text-sm text-neutral-600">{documentSnapshot.customerWhatsapp}</p>
                  {documentSnapshot.customerEmail && (
                    <p className="text-sm text-neutral-600">{documentSnapshot.customerEmail}</p>
                  )}
                  {documentSnapshot.customerInstagram && (
                    <p className="text-sm text-neutral-600">
                      @{documentSnapshot.customerInstagram.replace(/^@/, '')}
                    </p>
                  )}
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    {documentKind === 'receipt' ? 'Status pembayaran' : 'Rekening pembayaran'}
                  </h3>
                  {documentKind === 'receipt' ? (
                    <div className="mt-2 border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                      Biaya Booking telah diterima dan diverifikasi oleh admin. Simpan dokumen ini sebagai bukti pembayaran Biaya Booking.
                    </div>
                  ) : documentSnapshot.bank.isConfigured ? (
                    <div className="mt-2 border border-neutral-200 bg-neutral-50 p-3">
                      <p className="font-semibold text-neutral-950">{documentSnapshot.bank.bankName}</p>
                      <p className="mt-1 font-mono text-lg font-bold text-neutral-950">
                        {documentSnapshot.bank.accountNumber}
                      </p>
                      <p className="text-sm text-neutral-600">a/n {documentSnapshot.bank.accountName}</p>
                    </div>
                  ) : (
                    <div className="mt-2 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      Rekening belum dikonfigurasi. Set FARSHA_BANK_NAME,
                      FARSHA_BANK_ACCOUNT_NAME, dan FARSHA_BANK_ACCOUNT_NUMBER.
                    </div>
                  )}
                </div>
              </section>

              <section className="py-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Item booking</h3>
                <div className="mt-3 overflow-hidden border border-neutral-200">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500">
                      <tr>
                        <th className="px-3 py-3">Item</th>
                        <th className="px-3 py-3">Tanggal</th>
                        <th className="px-3 py-3 text-right">Biaya Booking</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documentSnapshot.items.map((item) => (
                        <tr key={`${item.itemCode}-${item.pickupDate}`} className="border-t border-neutral-200">
                          <td className="px-3 py-3 align-top">
                            <p className="font-semibold text-neutral-950">{item.itemName}</p>
                            <p className="font-mono text-xs text-neutral-500">{item.itemCode}</p>
                            <p className="mt-1 text-xs text-neutral-500">
                              Estimasi sewa {formatCurrency(item.rentalPrice)}
                            </p>
                          </td>
                          <td className="px-3 py-3 align-top text-neutral-600">
                            <p>Pickup: {formatDate(item.pickupDate)}</p>
                            <p>Acara: {formatDate(item.eventDate)}</p>
                            <p>Return: {formatDate(item.returnDueDate)}</p>
                          </td>
                          <td className="px-3 py-3 text-right align-top font-semibold text-neutral-950">
                            {formatCurrency(item.dpAmount)}
                            {item.extraReturnFee > 0 && (
                              <p className="mt-1 text-xs font-normal text-neutral-500">
                                Tambahan return {formatCurrency(item.extraReturnFee)}
                              </p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="grid gap-5 border-t border-neutral-200 pt-6 sm:grid-cols-[minmax(0,1fr)_320px]">
                <div className="text-sm text-neutral-600">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Catatan</h3>
                  <p className="mt-2">{documentSnapshot.notes || '-'}</p>
                  <p className="mt-3">
                    {documentKind === 'receipt'
                      ? 'Tanggal booking sudah terkunci. Link jadwal fitting dapat dikirimkan setelah receipt ini dibuat.'
                      : 'Setelah transfer, customer mengirim bukti pembayaran agar admin dapat memverifikasi Biaya Booking dan mengunci kalender booking.'}
                  </p>
                </div>
                <div className="border border-neutral-200 bg-neutral-50 p-4 text-sm">
                  <div className="flex justify-between gap-3">
                    <span>Subtotal Biaya Booking</span>
                    <strong>{formatCurrency(documentData.subtotalAmount)}</strong>
                  </div>
                  <div className="mt-2 flex justify-between gap-3">
                    <span>Diskon Instagram</span>
                    <strong>-{formatCurrency(documentData.discountAmount)}</strong>
                  </div>
                  <div className="mt-3 flex justify-between gap-3 border-t border-neutral-200 pt-3 text-base">
                    <span className="font-semibold">{documentKind === 'receipt' ? 'Biaya Booking diterima' : 'Total Biaya Booking'}</span>
                    <strong>{formatCurrency(documentData.totalAmount)}</strong>
                  </div>
                  <div className="mt-3 flex justify-between gap-3 text-xs text-neutral-500">
                    <span>Estimasi sewa</span>
                    <strong>{formatCurrency(documentSnapshot.rentalEstimateTotal)}</strong>
                  </div>
                  {documentSnapshot.extraReturnFeeTotal > 0 && (
                    <div className="mt-1 flex justify-between gap-3 text-xs text-neutral-500">
                      <span>Tambahan return</span>
                      <strong>{formatCurrency(documentSnapshot.extraReturnFeeTotal)}</strong>
                    </div>
                  )}
                </div>
              </section>
            </article>
          </div>
        </div>
      )}
    </>
  );
}
