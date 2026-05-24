export const BOOKING_STATUSES = [
  "pending_payment",
  "payment_succeeded",
  "supplier_booking_pending",
  "supplier_booking_confirmed",
  "supplier_booking_failed",
  "cancelled",
  "refund_required",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PAID_BOOKING_STATUSES: BookingStatus[] = [
  "payment_succeeded",
  "supplier_booking_pending",
  "supplier_booking_confirmed",
];

export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  "pending_payment",
  "payment_succeeded",
  "supplier_booking_pending",
  "supplier_booking_confirmed",
];

export const CANCELLABLE_BOOKING_STATUSES: BookingStatus[] = [
  "pending_payment",
  "payment_succeeded",
  "supplier_booking_pending",
  "supplier_booking_confirmed",
];

export function isBookingStatus(value: unknown): value is BookingStatus {
  return (
    typeof value === "string" &&
    BOOKING_STATUSES.includes(value as BookingStatus)
  );
}

export function formatBookingStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
