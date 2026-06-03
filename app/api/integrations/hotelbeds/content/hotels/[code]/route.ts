import { NextRequest } from "next/server";

import { runHotelbedsContentRoute } from "@/lib/suppliers/hotelbeds-content-route";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  return runHotelbedsContentRoute(request, (client, query) =>
    client.getHotelDetails(code, query),
  );
}
