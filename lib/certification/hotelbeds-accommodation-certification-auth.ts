import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-user";

export function canAccessHotelbedsAccommodationCertification(user: {
  role?: string | null;
  supplierScope?: string | null;
}) {
  return (
    user.role === "admin" ||
    (user.role === "supplier_tester" && user.supplierScope === "hotelbeds")
  );
}

export function requireHotelbedsAccommodationCertificationAccess(req: NextRequest) {
  const user = getAuthUserFromRequest(req);

  if (!user || !canAccessHotelbedsAccommodationCertification(user)) {
    return {
      user,
      response: NextResponse.json(
        {
          success: false,
          error: "HOTELBEDS_CERTIFICATION_FORBIDDEN",
          message: "Hotelbeds Accommodation certification is available only to admins or Hotelbeds supplier testers.",
        },
        { status: 403 },
      ),
    };
  }

  return { user, response: null };
}
