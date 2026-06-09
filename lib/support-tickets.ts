import { randomUUID } from "node:crypto";
import type { Document } from "mongodb";

export const SUPPORT_TICKET_STATUSES = [
  "open",
  "waiting_customer",
  "waiting_admin",
  "waiting_supplier",
  "resolved",
  "closed",
] as const;

export const SUPPORT_TICKET_PRIORITIES = [
  "low",
  "normal",
  "high",
  "urgent",
] as const;

export const SUPPORT_TICKET_CATEGORIES = [
  "booking_issue",
  "payment_issue",
  "cancellation_refund",
  "hotel_issue",
  "account_issue",
  "general",
] as const;

export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number];
export type SupportTicketPriority = (typeof SUPPORT_TICKET_PRIORITIES)[number];
export type SupportTicketCategory = (typeof SUPPORT_TICKET_CATEGORIES)[number];
export type SupportSenderType = "customer" | "admin" | "system";

export type SupportTicketMessage = {
  id: string;
  senderType: SupportSenderType;
  senderId?: string;
  senderName: string;
  message: string;
  createdAt: Date | string;
  attachments?: string[];
};

export type SupportTicketDocument = Document & {
  _id: string;
  ticketNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  bookingId?: string;
  bookingReference?: string;
  messages: SupportTicketMessage[];
  assignedTo?: string;
  assignedToName?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  lastMessageAt: Date | string;
  closedAt?: Date | string | null;
};

export function isSupportTicketStatus(value: unknown): value is SupportTicketStatus {
  return SUPPORT_TICKET_STATUSES.includes(value as SupportTicketStatus);
}

export function isSupportTicketPriority(value: unknown): value is SupportTicketPriority {
  return SUPPORT_TICKET_PRIORITIES.includes(value as SupportTicketPriority);
}

export function isSupportTicketCategory(value: unknown): value is SupportTicketCategory {
  return SUPPORT_TICKET_CATEGORIES.includes(value as SupportTicketCategory);
}

export function createSupportTicketId() {
  return `support-${randomUUID()}`;
}

export function createSupportMessageId() {
  return `message-${randomUUID()}`;
}

export function createSupportTicketNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const suffix = randomUUID().replace(/-/g, "").slice(0, 5).toUpperCase();
  return `SUP-${timestamp}-${suffix}`;
}

export function normalizeSupportText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function toIsoDate(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function serializeSupportTicket(ticket: SupportTicketDocument) {
  return {
    ...ticket,
    createdAt: toIsoDate(ticket.createdAt),
    updatedAt: toIsoDate(ticket.updatedAt),
    lastMessageAt: toIsoDate(ticket.lastMessageAt),
    closedAt: toIsoDate(ticket.closedAt),
    messages: Array.isArray(ticket.messages)
      ? ticket.messages.map((message) => ({
          ...message,
          createdAt: toIsoDate(message.createdAt),
          attachments: Array.isArray(message.attachments) ? message.attachments : [],
        }))
      : [],
  };
}
