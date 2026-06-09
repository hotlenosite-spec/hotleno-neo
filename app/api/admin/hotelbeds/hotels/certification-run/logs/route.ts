import { NextRequest, NextResponse } from "next/server";
import { requireHotelbedsAccommodationCertificationAccess } from "@/lib/certification/hotelbeds-accommodation-certification-auth";
import {
  clearAccommodationCertificationLog,
  readAccommodationCertificationLog,
} from "@/lib/certification/hotelbeds-accommodation-certification-log";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const access = requireHotelbedsAccommodationCertificationAccess(req);
  if (access.response) return access.response;

  const log = await readAccommodationCertificationLog();
  return NextResponse.json({ success: true, log });
}

export async function DELETE(req: NextRequest) {
  const access = requireHotelbedsAccommodationCertificationAccess(req);
  if (access.response) return access.response;

  const log = await clearAccommodationCertificationLog();
  return NextResponse.json({ success: true, log });
}
