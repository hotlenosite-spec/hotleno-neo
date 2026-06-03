import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const REVIEW_DATA = path.join(
  process.cwd(),
  "hotelbeds-hotels-certification-logs",
  "review-data.json",
);

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { success: false, error: "HOTELBEDS_HOTELS_CERTIFICATION_REVIEW_DISABLED" },
      { status: 404 },
    );
  }

  const text = await readFile(REVIEW_DATA, "utf8").catch(() => "");

  if (!text) {
    return NextResponse.json({
      success: true,
      scenarios: [],
      message: "No final Hotelbeds Accommodation certification logs are available yet.",
    });
  }

  return NextResponse.json({
    success: true,
    ...JSON.parse(text),
  });
}
