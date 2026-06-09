import { NextRequest, NextResponse } from "next/server";
import type { Document } from "mongodb";
import { z } from "zod";
import { verifyToken } from "@/lib/jwt";
import { getFirestoreMongoDb } from "@/lib/firestore-mongo";
import { createLog, getUserById } from "@/lib/firebase-store";
import { requireStaffPermission } from "@/lib/staff-permissions";

type StringIdDocument = Document & { _id: string };

const HOTEL_PROPERTY_STATUSES = ["draft", "pending_review", "approved", "rejected", "suspended"] as const;
const HOTEL_PARTNER_VERIFICATION_STATUSES = ["pending", "verified", "rejected"] as const;
const propertyStatusSchema = z.enum(HOTEL_PROPERTY_STATUSES);
const partnerVerificationStatusSchema = z.enum(HOTEL_PARTNER_VERIFICATION_STATUSES);

async function getAdminUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const decoded = verifyToken(token);
  const user = await getUserById(decoded.userId);
  return user && user.role === "admin" ? user : null;
}

function matchesProperty(property: Record<string, unknown>, partner: Record<string, unknown> | null, searchParams: URLSearchParams) {
  const status = searchParams.get("status");
  const city = searchParams.get("city")?.toLowerCase();
  const country = searchParams.get("country")?.toLowerCase();
  const search = searchParams.get("search")?.toLowerCase();
  if (status && status !== "all" && String(property.status ?? "") !== status) return false;
  if (city && !String(property.city ?? "").toLowerCase().includes(city)) return false;
  if (country && !String(property.country ?? "").toLowerCase().includes(country)) return false;
  if (search) {
    const searchable = [
      property.name,
      property.city,
      property.country,
      property.address,
      partner?.companyName,
      partner?.legalName,
      partner?.contactEmail,
    ].map((value) => String(value ?? "").toLowerCase());
    if (!searchable.some((value) => value.includes(search))) return false;
  }
  return true;
}

export async function GET(req: NextRequest) {
  try {
    if (!(await requireStaffPermission(req, "suppliers.view"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const adminUser = await getAdminUser(req);
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "20")));
    const db = await getFirestoreMongoDb();
    const [properties, partners, rooms] = await Promise.all([
      db.collection<StringIdDocument>("hotel_properties").find({}).sort({ createdAt: -1 }).toArray(),
      db.collection<StringIdDocument>("hotel_partners").find({}).toArray(),
      db.collection<StringIdDocument>("hotel_rooms").find({}).toArray(),
    ]);
    const realProperties = properties.filter((property) => property._id !== "_meta");
    const realPartners = partners.filter((partner) => partner._id !== "_meta");
    const realRooms = rooms.filter((room) => room._id !== "_meta");
    const partnerMap = new Map(realPartners.map((partner) => [String(partner._id), partner]));
    const roomCountMap = new Map<string, number>();
    realRooms.forEach((room) => {
      const hotelPropertyId = String(room.hotelPropertyId ?? "");
      roomCountMap.set(hotelPropertyId, (roomCountMap.get(hotelPropertyId) ?? 0) + 1);
    });
    const filteredProperties = realProperties.filter((property) =>
      matchesProperty(
        property,
        partnerMap.get(String(property.hotelPartnerId ?? "")) ?? null,
        searchParams,
      ),
    );
    const skip = (page - 1) * limit;
    const hotels = filteredProperties.slice(skip, skip + limit).map((property) => {
      const partner = partnerMap.get(String(property.hotelPartnerId ?? "")) ?? null;
      return {
        id: String(property._id),
        name: property.name,
        city: property.city,
        country: property.country,
        status: property.status,
        isPublished: property.isPublished,
        adminNotes: property.adminNotes,
        createdAt: property.createdAt,
        roomCount: roomCountMap.get(String(property._id)) || 0,
        partner: partner
          ? {
              id: String(partner._id),
              companyName: partner.companyName || partner.legalName || "",
              verificationStatus: partner.verificationStatus,
              status: partner.status,
              contactEmail: partner.contactEmail,
            }
          : null,
      };
    });

    console.info("[admin/hotels] collections=hotel_properties,hotel_partners,hotel_rooms count=%d", filteredProperties.length);

    return NextResponse.json({
      hotels,
      pagination: {
        page,
        limit,
        total: filteredProperties.length,
        pages: Math.ceil(filteredProperties.length / limit),
      },
    });
  } catch (error) {
    console.error(
      "[admin/hotels] fetch failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json({ error: "Failed to fetch hotel properties" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!(await requireStaffPermission(req, "suppliers.manage"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const adminUser = await getAdminUser(req);
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const action = z
      .enum(["update_property_status", "add_admin_note", "update_partner_verification"])
      .safeParse(body.action);
    if (!action.success) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    const db = await getFirestoreMongoDb();
    if (action.data === "update_property_status") {
      const statusValidation = propertyStatusSchema.safeParse(body.status);
      if (!body.hotelPropertyId || !statusValidation.success) {
        return NextResponse.json({ error: "hotelPropertyId and valid status are required" }, { status: 400 });
      }
      await db.collection<StringIdDocument>("hotel_properties").updateOne(
        { _id: String(body.hotelPropertyId) },
        { $set: { status: statusValidation.data, isPublished: false, updatedAt: new Date() } },
      );
      const hotel = await db.collection<StringIdDocument>("hotel_properties").findOne({ _id: String(body.hotelPropertyId) });
      if (!hotel) return NextResponse.json({ error: "Hotel property not found" }, { status: 404 });
      await createLog({
        type: "admin_hotel_property_status_updated",
        status: "success",
        message: "Hotel property status changed",
        request: { status: statusValidation.data },
        response: { hotelPropertyId: body.hotelPropertyId },
      });
      return NextResponse.json({ success: true, hotel });
    }

    if (action.data === "add_admin_note") {
      const note = z.string().trim().min(1).max(5000).safeParse(body.note);
      if (!body.hotelPropertyId || !note.success) {
        return NextResponse.json({ error: "hotelPropertyId and note are required" }, { status: 400 });
      }
      await db.collection<StringIdDocument>("hotel_properties").updateOne(
        { _id: String(body.hotelPropertyId) },
        { $set: { adminNotes: note.data, updatedAt: new Date() } },
      );
      const hotel = await db.collection<StringIdDocument>("hotel_properties").findOne({ _id: String(body.hotelPropertyId) });
      if (!hotel) return NextResponse.json({ error: "Hotel property not found" }, { status: 404 });
      await createLog({
        type: "admin_hotel_property_admin_note_added",
        status: "success",
        message: "Admin note added to hotel property",
        request: { hotelPropertyId: body.hotelPropertyId },
      });
      return NextResponse.json({ success: true, hotel });
    }

    const verificationValidation = partnerVerificationStatusSchema.safeParse(body.verificationStatus);
    if (!body.hotelPartnerId || !verificationValidation.success) {
      return NextResponse.json({ error: "hotelPartnerId and valid verificationStatus are required" }, { status: 400 });
    }
    await db.collection<StringIdDocument>("hotel_partners").updateOne(
      { _id: String(body.hotelPartnerId) },
      { $set: { verificationStatus: verificationValidation.data, updatedAt: new Date() } },
    );
    const partner = await db.collection<StringIdDocument>("hotel_partners").findOne({ _id: String(body.hotelPartnerId) });
    if (!partner) return NextResponse.json({ error: "Hotel partner not found" }, { status: 404 });
    await createLog({
      type: "admin_hotel_partner_verification_updated",
      status: "success",
      message: "Hotel partner verification changed",
      request: { hotelPartnerId: body.hotelPartnerId },
    });
    return NextResponse.json({ success: true, partner });
  } catch (error) {
    console.error(
      "[admin/hotels] update failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json({ error: "Failed to update hotel property" }, { status: 500 });
  }
}
