import { randomUUID } from "node:crypto";
import type { Document } from "mongodb";
import { getFirestoreMongoDb } from "@/lib/firestore-mongo";
import type { TokenPayload } from "@/lib/jwt";

export type AccountBooking = Document & {
  _id: string;
  userId?: string;
  customerEmail?: string;
  bookingReference?: string;
  supplier?: string;
  supplierBookingId?: string;
  supplierConfirmationNo?: string;
  supplierReference?: string;
  supplierBookingReference?: string;
  cancellationStatus?: string;
  metadata?: Record<string, unknown>;
  hotelName?: string;
  serviceType?: string;
  checkInDate?: Date | string;
  checkOutDate?: Date | string;
  totalPrice?: number;
  currency?: string;
  status?: string;
  paymentStatus?: string;
  supplierStatus?: string;
  archived?: boolean;
  hiddenFromAdminMainList?: boolean;
  hiddenFromCustomerBookings?: boolean;
  rooms?: unknown[];
  travelers?: unknown[];
  leadGuest?: string;
  contactEmail?: string;
  contactPhone?: string;
  cancellationPolicies?: unknown[];
  alerts?: unknown[];
  restrictions?: unknown[];
  createdAt?: Date;
  updatedAt?: Date;
};

export type TravelerDocument = Document & {
  _id: string;
  userId: string;
  customerEmail: string;
  title?: string;
  firstName: string;
  lastName: string;
  gender?: string;
  dateOfBirth?: string;
  birthDate?: string;
  nationality?: string;
  documentType?: string;
  documentNumber?: string;
  passportNumber?: string;
  nationalId?: string;
  passportExpiryDate?: string;
  phone?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
};

type WalletDocument = Document & {
  _id: string;
};

function ownerFilter(user: TokenPayload) {
  return {
    $or: [{ userId: user.userId }, { customerEmail: user.email }],
  };
}

function isHiddenTesterBooking(booking?: AccountBooking | null) {
  return (
    booking?.archived === true ||
    booking?.hiddenFromAdminMainList === true ||
    booking?.hiddenFromCustomerBookings === true
  );
}

export async function listCustomerBookings(
  user: TokenPayload,
  options: { limit?: number; status?: string | null } = {},
) {
  const db = await getFirestoreMongoDb();
  const filter: Record<string, unknown> = ownerFilter(user);

  if (options.status) {
    filter.status = options.status;
  }

  const bookings = await db
    .collection<AccountBooking>("bookings")
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(options.limit ?? 50)
    .toArray();

  if (user.email.toLowerCase() !== "tbo.tester@hotleno.com") return bookings;

  return bookings.filter((booking) => !isHiddenTesterBooking(booking));
}

export async function getCustomerBooking(user: TokenPayload, bookingId: string) {
  const db = await getFirestoreMongoDb();
  const booking = await db.collection<AccountBooking>("bookings").findOne({
    _id: bookingId,
    ...ownerFilter(user),
  });

  if (
    user.email.toLowerCase() === "tbo.tester@hotleno.com" &&
    isHiddenTesterBooking(booking)
  ) {
    return null;
  }

  return booking;
}

export async function updateCustomerBookingStatus(
  user: TokenPayload,
  bookingId: string,
  updates: Record<string, unknown>,
) {
  const db = await getFirestoreMongoDb();
  const now = new Date();
  await db.collection<AccountBooking>("bookings").updateOne(
    {
      _id: bookingId,
      ...ownerFilter(user),
    },
    {
      $set: {
        ...updates,
        updatedAt: now,
      },
    },
  );

  return getCustomerBooking(user, bookingId);
}

export async function getCustomerWallet(user: TokenPayload) {
  const db = await getFirestoreMongoDb();
  const wallet = await db.collection<WalletDocument>("wallets").findOne({ _id: user.userId });
  const transactions = await db
    .collection("wallet_transactions")
    .find({ userId: user.userId })
    .sort({ createdAt: -1 })
    .limit(25)
    .toArray();

  return {
    balance: Number(wallet?.balance ?? 0),
    currency: String(wallet?.currency ?? "USD"),
    refunds: Number(wallet?.refunds ?? 0),
    credits: Number(wallet?.credits ?? 0),
    transactions,
  };
}

export async function listTravelers(user: TokenPayload) {
  const db = await getFirestoreMongoDb();
  return db
    .collection<TravelerDocument>("travelers")
    .find({ userId: user.userId })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function createTraveler(
  user: TokenPayload,
  input: {
    title?: string;
    firstName: string;
    lastName: string;
    gender?: string;
    dateOfBirth?: string;
    birthDate?: string;
    nationality?: string;
    documentType?: string;
    documentNumber?: string;
    passportNumber?: string;
    nationalId?: string;
    passportExpiryDate?: string;
    phone?: string;
    email?: string;
  },
) {
  const db = await getFirestoreMongoDb();
  const now = new Date();
  const traveler: TravelerDocument = {
    _id: `traveler-${randomUUID()}`,
    userId: user.userId,
    customerEmail: user.email,
    title: input.title || "",
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    gender: input.gender || "",
    dateOfBirth: input.dateOfBirth || input.birthDate || "",
    birthDate: input.birthDate || input.dateOfBirth || "",
    nationality: input.nationality || "",
    documentType: input.documentType || "",
    documentNumber: input.documentNumber || "",
    passportNumber: input.passportNumber || "",
    nationalId: input.nationalId || "",
    passportExpiryDate: input.passportExpiryDate || "",
    phone: input.phone || "",
    email: input.email || "",
    createdAt: now,
    updatedAt: now,
  };

  await db.collection<TravelerDocument>("travelers").insertOne(traveler);
  return traveler;
}

export async function getCustomerDashboard(user: TokenPayload) {
  const [bookings, wallet, travelers] = await Promise.all([
    listCustomerBookings(user, { limit: 5 }),
    getCustomerWallet(user),
    listTravelers(user),
  ]);
  const activeBookings = bookings.filter((booking) =>
    ["pending_payment", "payment_succeeded", "supplier_booking_processing", "supplier_booking_confirmed"].includes(
      String(booking.status || ""),
    ) ||
    ["payment_disabled_created", "supplier_booking_not_started"].includes(
      String(booking.status || ""),
    ),
  ).length;

  return {
    bookings,
    wallet,
    travelersCount: travelers.length,
    stats: {
      totalBookings: bookings.length,
      activeBookings,
      completedTrips: bookings.filter((booking) => booking.status === "supplier_booking_confirmed").length,
    },
  };
}
