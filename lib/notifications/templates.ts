import type {
  NotificationLocale,
  NotificationTemplateKey,
  NotificationTemplateVariables,
  RenderedNotificationTemplate,
} from "./types";

type TemplateRenderer = (
  variables: Required<NotificationTemplateVariables>,
) => RenderedNotificationTemplate;

type TemplateMap = Record<
  NotificationTemplateKey,
  Record<NotificationLocale, TemplateRenderer>
>;

const defaultVariables: Required<NotificationTemplateVariables> = {
  bookingReference: "N/A",
  customerName: "Guest",
  hotelName: "Hotleno",
  reason: "Our team is reviewing the request.",
  agencyName: "Agency",
  supportEmail: "support@hotleno.com",
};

export const notificationTemplates: TemplateMap = {
  "booking-confirmed": {
    ar: (v) => ({
      subject: `تم تأكيد حجزك ${v.bookingReference}`,
      body: `مرحبًا ${v.customerName}، تم تأكيد حجزك في ${v.hotelName}. رقم الحجز: ${v.bookingReference}.`,
    }),
    en: (v) => ({
      subject: `Your booking is confirmed ${v.bookingReference}`,
      body: `Hello ${v.customerName}, your booking at ${v.hotelName} has been confirmed. Booking reference: ${v.bookingReference}.`,
    }),
  },
  "booking-failed": {
    ar: (v) => ({
      subject: `تعذر تأكيد حجزك ${v.bookingReference}`,
      body: `مرحبًا ${v.customerName}، لم نتمكن من تأكيد حجزك في ${v.hotelName}. السبب: ${v.reason}. سيتابع فريق Hotleno الطلب.`,
    }),
    en: (v) => ({
      subject: `We could not confirm your booking ${v.bookingReference}`,
      body: `Hello ${v.customerName}, we could not confirm your booking at ${v.hotelName}. Reason: ${v.reason}. The Hotleno team will review it.`,
    }),
  },
  "cancellation-confirmed": {
    ar: (v) => ({
      subject: `تم إلغاء الحجز ${v.bookingReference}`,
      body: `مرحبًا ${v.customerName}، تم تأكيد إلغاء الحجز ${v.bookingReference}.`,
    }),
    en: (v) => ({
      subject: `Booking cancellation confirmed ${v.bookingReference}`,
      body: `Hello ${v.customerName}, cancellation for booking ${v.bookingReference} has been confirmed.`,
    }),
  },
  "refund-processed": {
    ar: (v) => ({
      subject: `تمت معالجة الاسترداد ${v.bookingReference}`,
      body: `مرحبًا ${v.customerName}، تمت معالجة الاسترداد المرتبط بالحجز ${v.bookingReference}.`,
    }),
    en: (v) => ({
      subject: `Refund processed ${v.bookingReference}`,
      body: `Hello ${v.customerName}, the refund for booking ${v.bookingReference} has been processed.`,
    }),
  },
  "manual-review-required": {
    ar: (v) => ({
      subject: `حجزك قيد المراجعة ${v.bookingReference}`,
      body: `مرحبًا ${v.customerName}، حجزك ${v.bookingReference} يحتاج مراجعة يدوية. السبب: ${v.reason}. سنقوم بتحديثك عند اكتمال المراجعة.`,
    }),
    en: (v) => ({
      subject: `Your booking needs review ${v.bookingReference}`,
      body: `Hello ${v.customerName}, booking ${v.bookingReference} requires manual review. Reason: ${v.reason}. We will update you when the review is complete.`,
    }),
  },
  "agency-booking-created": {
    ar: (v) => ({
      subject: `تم إنشاء طلب حجز وكالة ${v.bookingReference}`,
      body: `تم استلام طلب حجز من ${v.agencyName}. رقم الطلب: ${v.bookingReference}. الطلب مسجل داخليًا ولم يتم تنفيذ حجز مورد بعد.`,
    }),
    en: (v) => ({
      subject: `Agency booking request created ${v.bookingReference}`,
      body: `A booking request from ${v.agencyName} has been received. Reference: ${v.bookingReference}. This is an internal draft and no supplier booking has been executed.`,
    }),
  },
};

export function renderNotificationTemplate(
  templateKey: NotificationTemplateKey,
  locale: NotificationLocale = "en",
  variables: NotificationTemplateVariables = {},
): RenderedNotificationTemplate {
  const safeLocale = locale === "ar" ? "ar" : "en";
  const renderer = notificationTemplates[templateKey][safeLocale];

  return renderer({
    ...defaultVariables,
    ...variables,
  });
}
