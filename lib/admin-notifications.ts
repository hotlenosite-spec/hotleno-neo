import { randomUUID } from "node:crypto";
import type { Document } from "mongodb";
import { getFirestoreMongoDb } from "@/lib/firestore-mongo";
import type { StaffActor, StaffRole } from "@/lib/staff-permissions";

export const ADMIN_NOTIFICATION_TYPES = [
  "booking_created",
  "booking_failed",
  "payment_received",
  "payment_failed",
  "support_ticket_created",
  "support_ticket_replied",
  "manual_review_required",
  "user_created",
  "system_warning",
] as const;

export type AdminNotificationType =
  (typeof ADMIN_NOTIFICATION_TYPES)[number];
export type AdminNotificationSeverity =
  | "info"
  | "success"
  | "warning"
  | "error";
export type AdminNotificationRelatedType =
  | "booking"
  | "payment"
  | "support_ticket"
  | "user"
  | "system";

export type AdminNotificationDocument = Document & {
  _id: string;
  id: string;
  type: AdminNotificationType;
  title: string;
  message: string;
  severity: AdminNotificationSeverity;
  targetRole?: StaffRole | "admin";
  targetUserId?: string;
  relatedType?: AdminNotificationRelatedType;
  relatedId?: string;
  data?: Record<string, string | number | boolean>;
  isRead: boolean;
  readAt?: Date | null;
  readBy?: string[];
  createdAt: Date;
};

type CreateAdminNotificationInput = {
  type: AdminNotificationType;
  title: string;
  message: string;
  severity?: AdminNotificationSeverity;
  targetRole?: StaffRole | "admin";
  targetUserId?: string;
  relatedType?: AdminNotificationRelatedType;
  relatedId?: string;
  data?: Record<string, string | number | boolean>;
};

function isVisibleToActor(
  notification: AdminNotificationDocument,
  actor: StaffActor,
) {
  if (
    notification.targetUserId &&
    notification.targetUserId !== actor.userId
  ) {
    return false;
  }

  if (
    notification.targetRole &&
    notification.targetRole !== "admin" &&
    notification.targetRole !== actor.role
  ) {
    return false;
  }

  return true;
}

function isReadByActor(
  notification: AdminNotificationDocument,
  actor: StaffActor,
) {
  if (notification.targetUserId === actor.userId) {
    return notification.isRead === true;
  }
  return Array.isArray(notification.readBy)
    ? notification.readBy.includes(actor.userId)
    : false;
}

function toIsoDate(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function serializeAdminNotification(
  notification: AdminNotificationDocument,
  actor: StaffActor,
) {
  return {
    id: notification.id || notification._id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    severity: notification.severity,
    targetRole: notification.targetRole || null,
    targetUserId: notification.targetUserId || null,
    relatedType: notification.relatedType || null,
    relatedId: notification.relatedId || null,
    data: notification.data || {},
    isRead: isReadByActor(notification, actor),
    readAt: toIsoDate(notification.readAt),
    createdAt: toIsoDate(notification.createdAt),
  };
}

export async function createAdminNotification(
  input: CreateAdminNotificationInput,
) {
  const db = await getFirestoreMongoDb();
  const now = new Date();
  const id = `notification-${randomUUID()}`;
  const notification: AdminNotificationDocument = {
    _id: id,
    id,
    type: input.type,
    title: input.title,
    message: input.message,
    severity: input.severity || "info",
    targetRole: input.targetRole || "admin",
    targetUserId: input.targetUserId,
    relatedType: input.relatedType,
    relatedId: input.relatedId,
    data: input.data || {},
    isRead: false,
    readAt: null,
    readBy: [],
    createdAt: now,
  };

  await db
    .collection<AdminNotificationDocument>("admin_notifications")
    .insertOne(notification);
  return notification;
}

export async function createAdminNotificationSafely(
  input: CreateAdminNotificationInput,
) {
  try {
    return await createAdminNotification(input);
  } catch (error) {
    console.error(
      "[admin-notifications] create failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return null;
  }
}

export async function listAdminNotifications(params: {
  actor: StaffActor;
  read?: "all" | "read" | "unread";
  limit?: number;
}) {
  const db = await getFirestoreMongoDb();
  const requestedLimit = Math.min(Math.max(params.limit || 50, 1), 100);
  const records = await db
    .collection<AdminNotificationDocument>("admin_notifications")
    .find({})
    .sort({ createdAt: -1 })
    .limit(300)
    .toArray();

  const visible = records.filter((item) => isVisibleToActor(item, params.actor));
  const unreadCount = visible.filter(
    (item) => !isReadByActor(item, params.actor),
  ).length;
  const filtered = visible
    .filter((item) => {
      if (!params.read || params.read === "all") return true;
      const read = isReadByActor(item, params.actor);
      return params.read === "read" ? read : !read;
    })
    .slice(0, requestedLimit)
    .map((item) => serializeAdminNotification(item, params.actor));

  return { notifications: filtered, unreadCount };
}

export async function markAdminNotificationRead(
  actor: StaffActor,
  notificationId: string,
) {
  const db = await getFirestoreMongoDb();
  const collection =
    db.collection<AdminNotificationDocument>("admin_notifications");
  const notification = await collection.findOne({ _id: notificationId });
  if (!notification || !isVisibleToActor(notification, actor)) return null;

  const now = new Date();
  if (notification.targetUserId === actor.userId) {
    await collection.updateOne(
      { _id: notificationId },
      { $set: { isRead: true, readAt: now } },
    );
  } else {
    await collection.updateOne(
      { _id: notificationId },
      { $addToSet: { readBy: actor.userId } } as Document,
    );
  }

  const updated = await collection.findOne({ _id: notificationId });
  return updated ? serializeAdminNotification(updated, actor) : null;
}

export async function markAllAdminNotificationsRead(actor: StaffActor) {
  const db = await getFirestoreMongoDb();
  const collection =
    db.collection<AdminNotificationDocument>("admin_notifications");
  const records = await collection.find({}).limit(300).toArray();
  const visibleUnread = records.filter(
    (item) => isVisibleToActor(item, actor) && !isReadByActor(item, actor),
  );
  const now = new Date();

  await Promise.all(
    visibleUnread.map((notification) =>
      notification.targetUserId === actor.userId
        ? collection.updateOne(
            { _id: notification._id },
            { $set: { isRead: true, readAt: now } },
          )
        : collection.updateOne(
            { _id: notification._id },
            { $addToSet: { readBy: actor.userId } } as Document,
          ),
    ),
  );

  return visibleUnread.length;
}
