import { getFirestoreMongoDb } from "@/lib/firestore-mongo";

export type AdminCustomerType = "normal" | "vip";
export type AdminCustomerStatus = "active" | "blocked";

type CustomerUserDocument = {
  _id: string;
  [key: string]: unknown;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  accountType?: string;
  customerType?: AdminCustomerType;
  isActive?: boolean;
  internalNotes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  lastLoginAt?: unknown;
};

function toIsoDate(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function latestIso(...values: unknown[]): string | null {
  const dates = values
    .map(toIsoDate)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value));

  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map((date) => date.getTime()))).toISOString();
}

function isB2cCustomer(user: CustomerUserDocument): boolean {
  const role = String(user.role || "").toLowerCase();
  const accountType = String(user.accountType || "").toLowerCase();
  const excludedRoles = new Set([
    "admin",
    "super_admin",
    "support",
    "finance",
    "sales",
    "content_manager",
    "supplier_tester",
    "agency",
    "hotel",
  ]);

  if (excludedRoles.has(role)) return false;
  return role === "customer" || role === "user" || accountType === "b2c";
}

function customerOwnerFilter(user: CustomerUserDocument) {
  const email = String(user.email || user._id || "").trim().toLowerCase();
  return {
    $or: [{ userId: String(user._id) }, { customerEmail: email }],
  };
}

function getCustomerType(user: CustomerUserDocument): AdminCustomerType {
  return user.customerType === "vip" ? "vip" : "normal";
}

function getCustomerStatus(user: CustomerUserDocument): AdminCustomerStatus {
  return user.isActive === false ? "blocked" : "active";
}

export async function listAdminCustomers(input: {
  search?: string;
  customerType?: AdminCustomerType | "all";
  status?: AdminCustomerStatus | "all";
  page?: number;
  limit?: number;
}) {
  const db = await getFirestoreMongoDb();
  const users = await db.collection<CustomerUserDocument>("users").find({}).toArray();
  const search = String(input.search || "").trim().toLowerCase();
  const page = Math.max(1, Number(input.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(input.limit) || 20));

  const filtered = users.filter((user) => {
    if (!isB2cCustomer(user)) return false;
    if (input.customerType && input.customerType !== "all" && getCustomerType(user) !== input.customerType) {
      return false;
    }
    if (input.status && input.status !== "all" && getCustomerStatus(user) !== input.status) {
      return false;
    }
    if (!search) return true;
    const haystack = [user.name, user.email, user.phone, user._id]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(search);
  });

  const paginated = filtered.slice((page - 1) * limit, page * limit);
  const customers = await Promise.all(
    paginated.map(async (user) => {
      const ownerFilter = customerOwnerFilter(user);
      const [bookingCount, latestBooking, latestTicket] = await Promise.all([
        db.collection("bookings").countDocuments(ownerFilter),
        db.collection("bookings").find(ownerFilter).sort({ createdAt: -1 }).limit(1).toArray(),
        db.collection("support_tickets").find(ownerFilter).sort({ lastMessageAt: -1 }).limit(1).toArray(),
      ]);

      return {
        id: String(user._id),
        name: String(user.name || ""),
        email: String(user.email || user._id || ""),
        phone: String(user.phone || ""),
        customerType: getCustomerType(user),
        status: getCustomerStatus(user),
        bookingCount,
        lastActivityAt: latestIso(
          user.lastLoginAt,
          user.updatedAt,
          latestBooking[0]?.createdAt,
          latestTicket[0]?.lastMessageAt,
          latestTicket[0]?.updatedAt,
        ),
        createdAt: toIsoDate(user.createdAt),
      };
    }),
  );

  return {
    customers,
    pagination: {
      page,
      limit,
      total: filtered.length,
      pages: Math.max(1, Math.ceil(filtered.length / limit)),
    },
  };
}

export async function getAdminCustomerDetail(customerId: string) {
  const db = await getFirestoreMongoDb();
  const user = await db.collection<CustomerUserDocument>("users").findOne({ _id: customerId });
  if (!user || !isB2cCustomer(user)) return null;

  const ownerFilter = customerOwnerFilter(user);
  const bookings = await db.collection("bookings").find(ownerFilter).sort({ createdAt: -1 }).limit(100).toArray();
  const bookingIds = new Set(
    bookings.flatMap((booking) => [
      String(booking._id || ""),
      String(booking.bookingId || ""),
      String(booking.bookingReference || ""),
    ]),
  );
  const email = String(user.email || user._id || "").trim().toLowerCase();
  const [tickets, adjustments] = await Promise.all([
    db.collection("support_tickets").find(ownerFilter).sort({ lastMessageAt: -1 }).limit(100).toArray(),
    db.collection("payment_adjustments").find({ customerEmail: email }).sort({ createdAt: -1 }).limit(100).toArray(),
  ]);

  const safeBookings = bookings.map((booking) => ({
    id: String(booking._id || booking.bookingId || ""),
    bookingReference: String(booking.bookingId || booking.bookingReference || booking._id || ""),
    service: String(booking.service || "hotel"),
    hotelName: String(booking.hotelName || booking.hotel?.name || ""),
    roomName: String(booking.roomName || booking.selectedRoom?.roomName || ""),
    checkInDate: toIsoDate(booking.checkInDate || booking.checkIn),
    checkOutDate: toIsoDate(booking.checkOutDate || booking.checkOut),
    totalPrice: Number(booking.totalPrice ?? booking.finalSellingPrice ?? booking.price ?? 0),
    currency: String(booking.currency || "USD"),
    status: String(booking.bookingStatus || booking.status || ""),
    paymentStatus: String(booking.paymentStatus || ""),
    createdAt: toIsoDate(booking.createdAt),
  }));

  const bookingPayments = bookings
    .filter((booking) => Boolean(booking.paymentStatus))
    .map((booking) => ({
      id: `booking-${String(booking._id || booking.bookingId || "")}`,
      bookingReference: String(booking.bookingId || booking.bookingReference || booking._id || ""),
      amount: Number(booking.totalPrice ?? booking.finalSellingPrice ?? booking.price ?? 0),
      currency: String(booking.currency || "USD"),
      status: String(booking.paymentStatus || ""),
      type: "booking",
      createdAt: toIsoDate(booking.createdAt),
    }));

  const adjustmentPayments = adjustments
    .filter((adjustment) => !adjustment.bookingId || bookingIds.has(String(adjustment.bookingId)))
    .map((adjustment) => ({
      id: String(adjustment._id || ""),
      bookingReference: String(adjustment.bookingId || adjustment.bookingReference || ""),
      amount: Number(adjustment.amount || 0),
      currency: String(adjustment.currency || "USD"),
      status: String(adjustment.status || ""),
      type: "adjustment",
      createdAt: toIsoDate(adjustment.createdAt),
    }));

  return {
    customer: {
      id: String(user._id),
      name: String(user.name || ""),
      email: String(user.email || user._id || ""),
      phone: String(user.phone || ""),
      customerType: getCustomerType(user),
      status: getCustomerStatus(user),
      internalNotes: String(user.internalNotes || ""),
      lastLoginAt: toIsoDate(user.lastLoginAt),
      createdAt: toIsoDate(user.createdAt),
      updatedAt: toIsoDate(user.updatedAt),
    },
    bookings: safeBookings,
    payments: [...bookingPayments, ...adjustmentPayments].sort((a, b) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
    ),
    tickets: tickets.map((ticket) => ({
      id: String(ticket._id || ""),
      ticketNumber: String(ticket.ticketNumber || ticket._id || ""),
      subject: String(ticket.subject || ""),
      status: String(ticket.status || ""),
      priority: String(ticket.priority || "normal"),
      createdAt: toIsoDate(ticket.createdAt),
      lastMessageAt: toIsoDate(ticket.lastMessageAt || ticket.updatedAt),
    })),
  };
}

export async function updateAdminCustomer(
  customerId: string,
  input: {
    customerType?: AdminCustomerType;
    status?: AdminCustomerStatus;
    internalNotes?: string;
  },
  changedBy: string,
) {
  const db = await getFirestoreMongoDb();
  const user = await db.collection<CustomerUserDocument>("users").findOne({ _id: customerId });
  if (!user || !isB2cCustomer(user)) return null;

  const update: Record<string, unknown> = {
    updatedAt: new Date(),
    updatedBy: changedBy,
  };
  if (input.customerType) update.customerType = input.customerType;
  if (input.status) update.isActive = input.status === "active";
  if (typeof input.internalNotes === "string") update.internalNotes = input.internalNotes.trim().slice(0, 4000);

  await db.collection<CustomerUserDocument>("users").updateOne({ _id: customerId }, { $set: update });
  return getAdminCustomerDetail(customerId);
}
