export const BOOKING_STATUSES = [
  // Waiting for the customer to complete payment.
  "pending_payment",
  // Booking was amended and the customer must pay an additional difference.
  "pending_additional_payment",
  // Payment is disabled for this environment; the internal request was created.
  "payment_disabled_created",
  // Payment is confirmed; supplier booking has not started yet.
  "payment_succeeded",
  // Supplier booking is intentionally not started in this environment.
  "supplier_booking_not_started",
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
  // Supplier cancellation failed and operations must review.
  "cancellation_failed",
  // Booking was cancelled internally; no real supplier cancellation is implied here.
  "cancelled",
  // Cancellation is done and payment refund is waiting for test/manual processing.
  "refund_pending",
  // Booking was amended downward and money is due back to the customer.
  "refund_due",
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
  "cancellation_failed",
];

export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  "pending_payment",
  "pending_additional_payment",
  "payment_disabled_created",
  "payment_succeeded",
  "supplier_booking_not_started",
  "supplier_booking_processing",
  "supplier_booking_pending",
  "supplier_booking_confirmed",
  "manual_review_required",
  "cancellation_requested",
  "refund_pending",
  "refund_due",
];

export const CANCELLABLE_BOOKING_STATUSES: BookingStatus[] = [
  "pending_payment",
  "payment_disabled_created",
  "payment_succeeded",
  "supplier_booking_not_started",
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
    "pending_additional_payment",
    "payment_disabled_created",
    "payment_succeeded",
    "manual_review_required",
    "cancellation_requested",
    "cancellation_failed",
    "cancelled",
  ],
  payment_disabled_created: [
    "pending_additional_payment",
    "refund_due",
    "supplier_booking_not_started",
    "manual_review_required",
    "cancellation_requested",
    "cancellation_failed",
    "cancelled",
  ],
  payment_succeeded: [
    "pending_additional_payment",
    "refund_due",
    "supplier_booking_not_started",
    "supplier_booking_processing",
    "manual_review_required",
    "cancellation_requested",
    "cancellation_failed",
    "cancelled",
  ],
  supplier_booking_not_started: [
    "pending_additional_payment",
    "refund_due",
    "supplier_booking_processing",
    "manual_review_required",
    "cancellation_requested",
    "cancellation_failed",
    "cancelled",
  ],
  supplier_booking_processing: [
    "pending_additional_payment",
    "refund_due",
    "supplier_booking_confirmed",
    "supplier_booking_failed",
    "manual_review_required",
    "cancellation_requested",
    "cancellation_failed",
    "cancelled",
  ],
  supplier_booking_pending: [
    "pending_additional_payment",
    "refund_due",
    "supplier_booking_confirmed",
    "supplier_booking_failed",
    "manual_review_required",
    "cancellation_requested",
    "cancellation_failed",
    "cancelled",
  ],
  supplier_booking_confirmed: [
    "pending_additional_payment",
    "refund_due",
    "manual_review_required",
    "cancellation_requested",
    "cancellation_failed",
    "cancelled",
    "refund_pending",
    "refunded",
  ],
  supplier_booking_failed: [
    "pending_additional_payment",
    "refund_due",
    "supplier_booking_processing",
    "manual_review_required",
    "cancellation_requested",
    "cancellation_failed",
    "cancelled",
    "refund_pending",
    "refunded",
  ],
  manual_review_required: [
    "pending_additional_payment",
    "refund_due",
    "supplier_booking_processing",
    "cancellation_requested",
    "cancelled",
    "refund_pending",
    "refunded",
  ],
  cancellation_requested: ["cancelled", "manual_review_required"],
  cancellation_failed: ["cancellation_requested", "manual_review_required", "cancelled"],
  cancelled: ["refund_pending", "refunded"],
  pending_additional_payment: ["payment_succeeded", "manual_review_required", "cancelled"],
  refund_pending: ["refunded", "manual_review_required"],
  refund_due: ["refund_pending", "refunded", "manual_review_required"],
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
