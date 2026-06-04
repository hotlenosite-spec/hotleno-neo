import { NextRequest } from "next/server";
import { verifyToken, type TokenPayload } from "@/lib/jwt";

export function getAuthUserFromRequest(req: NextRequest): TokenPayload | null {
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
  if (!token) return null;

  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function requireAdminFromRequest(req: NextRequest) {
  const user = getAuthUserFromRequest(req);
  if (!user || user.role !== "admin") {
    return null;
  }

  return user;
}
