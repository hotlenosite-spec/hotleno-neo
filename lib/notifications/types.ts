export type NotificationLocale = "ar" | "en";

export type NotificationTemplateKey =
  | "booking-confirmed"
  | "booking-failed"
  | "cancellation-confirmed"
  | "refund-processed"
  | "manual-review-required"
  | "agency-booking-created";

export interface NotificationTemplateVariables {
  bookingReference?: string;
  customerName?: string;
  hotelName?: string;
  reason?: string;
  agencyName?: string;
  supportEmail?: string;
}

export interface RenderedNotificationTemplate {
  subject: string;
  body: string;
}

export interface NotificationRecipient {
  email?: string;
  phone?: string;
  name?: string;
  locale?: NotificationLocale;
}

export interface NotificationSendInput {
  to: NotificationRecipient;
  templateKey: NotificationTemplateKey;
  variables?: NotificationTemplateVariables;
  metadata?: Record<string, unknown>;
}

export interface NotificationSendResult {
  provider: "mock";
  channel: "email" | "whatsapp";
  delivered: false;
  templateKey: NotificationTemplateKey;
  recipient: NotificationRecipient;
  rendered: RenderedNotificationTemplate;
  metadata?: Record<string, unknown>;
  message: string;
}
