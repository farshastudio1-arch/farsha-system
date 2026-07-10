export type AvailabilityBlockWindow = {
  startDate: string;
  endDate: string;
};

function parseDatePart(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatDatePart(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function normalizeAvailabilityDatePart(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const datePart = value.slice(0, 10);
  const date = parseDatePart(datePart);

  return Number.isNaN(date.getTime()) ? null : formatDatePart(date);
}

export function addAvailabilityDays(value: string, days: number) {
  const date = parseDatePart(value);
  date.setDate(date.getDate() + days);
  return formatDatePart(date);
}

export function getPresentTransactionBlockWindow(
  startDateValue: string | null | undefined,
): AvailabilityBlockWindow | null {
  const startDate = normalizeAvailabilityDatePart(startDateValue);

  if (!startDate) {
    return null;
  }

  return {
    startDate,
    endDate: addAvailabilityDays(startDate, 4),
  };
}

export function getFutureBookingBlockWindow(
  pickupDateValue: string | null | undefined,
  returnDueDateValue: string | null | undefined,
): AvailabilityBlockWindow | null {
  const pickupDate = normalizeAvailabilityDatePart(pickupDateValue);
  const returnDueDate = normalizeAvailabilityDatePart(returnDueDateValue);

  if (!pickupDate || !returnDueDate) {
    return null;
  }

  return {
    startDate: addAvailabilityDays(pickupDate, -2),
    endDate: addAvailabilityDays(returnDueDate, 2),
  };
}
