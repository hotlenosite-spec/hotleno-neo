import { renderNotificationTemplate } from "./templates";
import type {
  NotificationLocale,
  NotificationSendInput,
  NotificationSendResult,
  NotificationTemplateKey,
  NotificationTemplateVariables,
} from "./types";

export async function sendEmailMock(
  input: NotificationSendInput,
): Promise<NotificationSendResult> {
  const locale = input.to.locale || "en";
  const rendered = renderNotificationTemplate(
    input.templateKey,
    locale,
    input.variables,
  );

  return {
    provider: "mock",
    channel: "email",
    delivered: false,
    templateKey: input.templateKey,
    recipient: input.to,
    rendered,
    metadata: input.metadata,
    message:
      "Mock email prepared only. No real email provider was called.",
  };
}

export async function sendWhatsAppMock(
  input: NotificationSendInput,
): Promise<NotificationSendResult> {
  const locale = input.to.locale || "en";
  const rendered = renderNotificationTemplate(
    input.templateKey,
    locale,
    input.variables,
  );

  return {
    provider: "mock",
    channel: "whatsapp",
    delivered: false,
    templateKey: input.templateKey,
    recipient: input.to,
    rendered,
    metadata: input.metadata,
    message:
      "Mock WhatsApp message prepared only. No real WhatsApp provider was called.",
  };
}

export async function sendNotificationMock(
  input: NotificationSendInput,
): Promise<NotificationSendResult> {
  return sendEmailMock(input);
}

export async function safeSendNotificationMock(
  input: NotificationSendInput,
): Promise<NotificationSendResult | null> {
  try {
    return await sendNotificationMock(input);
  } catch {
    return null;
  }
}

export function normalizeNotificationLocale(
  locale: unknown,
): NotificationLocale {
  return locale === "ar" ? "ar" : "en";
}

export function buildNotificationInput(args: {
  templateKey: NotificationTemplateKey;
  email?: string;
  phone?: string;
  name?: string;
  locale?: unknown;
  variables?: NotificationTemplateVariables;
  metadata?: Record<string, unknown>;
}): NotificationSendInput {
  return {
    to: {
      email: args.email,
      phone: args.phone,
      name: args.name,
      locale: normalizeNotificationLocale(args.locale),
    },
    templateKey: args.templateKey,
    variables: args.variables,
    metadata: args.metadata,
  };
}
