export const BOOKING_STATUSES = [
  // Waiting for the customer to complete payment.
  "pending_payment",
  // Payment is confirmed; supplier booking has not started yet.
  "payment_succeeded",
  // Supplier booking workflow is queued or running without a final result.
  "supplier_booking_processing",
  // Legacy alias kept for old bookings and filters; prefer supplier_booking_processing.
  "supplier_booking_pending",
  // Supplier returned a confirmed booking reference.
  "supplier_booking_confirmed",
  // Supplier booking failed and needs retry, review, or refund handling.
  "supplier_booking_failed",
  // Operations team must review before retry, cancellation, or refund.
  "manual_review_required",
  // Customer/admin requested cancellation; supplier cancellation is not final yet.
  "cancellation_requested",
  // Booking was cancelled internally; no real supplier cancellation is implied here.
  "cancelled",
  // Cancellation is done and payment refund is waiting for test/manual processing.
  "refund_pending",
  // Payment was refunded internally/externally and the booking is closed.
  "refunded",
  // Legacy alias kept for existing admin filters; prefer manual_review_required.
  "refund_required",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PAID_BOOKING_STATUSES: BookingStatus[] = [
  "payment_succeeded",
  "supplier_booking_processing",
  "supplier_booking_pending",
  "supplier_booking_confirmed",
  "manual_review_required",
  "cancellation_requested",
];

export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  "pending_payment",
  "payment_succeeded",
  "supplier_booking_processing",
  "supplier_booking_pending",
  "supplier_booking_confirmed",
  "manual_review_required",
  "cancellation_requested",
  "refund_pending",
];

export const CANCELLABLE_BOOKING_STATUSES: BookingStatus[] = [
  "pending_payment",
  "payment_succeeded",
  "supplier_booking_processing",
  "supplier_booking_pending",
  "supplier_booking_confirmed",
  "manual_review_required",
];

export const FINAL_BOOKING_STATUSES: BookingStatus[] = [
  "supplier_booking_confirmed",
  "supplier_booking_failed",
  "cancelled",
  "refund_pending",
  "refunded",
];

export const BOOKING_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending_payment: [
    "payment_succeeded",
    "manual_review_required",
    "cancellation_requested",
    "cancelled",
  ],
  payment_succeeded: [
    "supplier_booking_processing",
    "manual_review_required",
    "cancellation_requested",
    "cancelled",
  ],
  supplier_booking_processing: [
    "supplier_booking_confirmed",
    "supplier_booking_failed",
    "manual_review_required",
    "cancellation_requested",
    "cancelled",
  ],
  supplier_booking_pending: [
    "supplier_booking_confirmed",
    "supplier_booking_failed",
    "manual_review_required",
    "cancellation_requested",
    "cancelled",
  ],
  supplier_booking_confirmed: [
    "manual_review_required",
    "cancellation_requested",
    "cancelled",
    "refund_pending",
    "refunded",
  ],
  supplier_booking_failed: [
    "supplier_booking_processing",
    "manual_review_required",
    "cancellation_requested",
    "cancelled",
    "refund_pending",
    "refunded",
  ],
  manual_review_required: [
    "supplier_booking_processing",
    "cancellation_requested",
    "cancelled",
    "refund_pending",
    "refunded",
  ],
  cancellation_requested: ["cancelled", "manual_review_required"],
  cancelled: ["refund_pending", "refunded"],
  refund_pending: ["refunded", "manual_review_required"],
  refunded: [],
  refund_required: [
    "supplier_booking_processing",
    "manual_review_required",
    "cancellation_requested",
    "cancelled",
    "refund_pending",
    "refunded",
  ],
};

export function isBookingStatus(value: unknown): value is BookingStatus {
  return (
    typeof value === "string" &&
    BOOKING_STATUSES.includes(value as BookingStatus)
  );
}

export function canTransitionBookingStatus(
  currentStatus: BookingStatus,
  nextStatus: BookingStatus,
) {
  return BOOKING_STATUS_TRANSITIONS[currentStatus]?.includes(nextStatus) ?? false;
}

export function normalizeBookingStatus(status: BookingStatus): BookingStatus {
  if (status === "supplier_booking_pending") return "supplier_booking_processing";
  if (status === "refund_required") return "manual_review_required";
  return status;
}

export function getNextBookingStatus(
  currentStatus: BookingStatus,
  nextStatus: BookingStatus,
) {
  const normalizedCurrent = normalizeBookingStatus(currentStatus);
  const normalizedNext = normalizeBookingStatus(nextStatus);

  if (normalizedCurrent === normalizedNext) return normalizedNext;

  if (!canTransitionBookingStatus(normalizedCurrent, normalizedNext)) {
    throw new Error(
      `Invalid booking status transition from ${currentStatus} to ${nextStatus}`,
    );
  }

  return normalizedNext;
}

export function formatBookingStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
