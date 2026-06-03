import type { IBooking } from "@/models/Booking";
import {
  buildNotificationInput,
  safeSendNotificationMock,
} from "./notification-service";
import type {
  NotificationSendResult,
  NotificationTemplateKey,
} from "./types";

function getBookingLocale(booking: IBooking) {
  return booking.metadata?.locale || booking.metadata?.language;
}

export async function sendBookingStatusNotification(args: {
  booking: IBooking;
  templateKey: NotificationTemplateKey;
  reason?: string;
}): Promise<NotificationSendResult | null> {
  const { booking, templateKey, reason } = args;

  return safeSendNotificationMock(
    buildNotificationInput({
      templateKey,
      email: booking.contactEmail,
      phone: booking.contactPhone,
      name: booking.leadGuest,
      locale: getBookingLocale(booking),
      variables: {
        bookingReference: booking.bookingReference,
        customerName: booking.leadGuest,
        hotelName: booking.hotelName,
        reason,
      },
      metadata: {
        bookingId: booking._id?.toString(),
        bookingStatus: booking.status,
        paymentStatus: booking.paymentStatus,
        supplierStatus: booking.supplierStatus,
      },
    }),
  );
}

export async function sendAgencyBookingCreatedNotification(args: {
  email?: string;
  phone?: string;
  locale?: unknown;
  agencyName?: string;
  bookingReference: string;
  metadata?: Record<string, unknown>;
}) {
  return safeSendNotificationMock(
    buildNotificationInput({
      templateKey: "agency-booking-created",
      email: args.email,
      phone: args.phone,
      locale: args.locale,
      variables: {
        agencyName: args.agencyName,
        bookingReference: args.bookingReference,
      },
      metadata: args.metadata,
    }),
  );
}
