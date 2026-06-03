import { NextRequest } from "next/server";

import { runHotelbedsContentRoute } from "@/lib/suppliers/hotelbeds-content-route";

export async function GET(request: NextRequest) {
  return runHotelbedsContentRoute(request, (client, query) =>
    client.getCategories(query),
  );
}
