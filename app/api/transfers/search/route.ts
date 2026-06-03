import { NextRequest } from "next/server";
import {
  createTransfersError,
  createTransfersSuccess,
  getTransfersClient,
  handleTransfersError,
  parseTransfersJsonBody,
} from "@/lib/transfers/api";
import type { TransferSearchRequest } from "@/types/transfers";

function sanitizeSearchResult<T extends { rawSupplierRequest?: unknown; rawSupplierResponse?: unknown }>(
  result: T,
) {
  if (process.env.NODE_ENV !== "production") return result;

  return {
    ...result,
    rawSupplierRequest: undefined,
    rawSupplierResponse: undefined,
  };
}

export async function POST(req: NextRequest) {
  const body = await parseTransfersJsonBody(req);

  if (!body) {
    return createTransfersError(
      400,
      "TRANSFERS_INVALID_JSON",
      "Invalid transfers search request body.",
    );
  }

  try {
    const result = await getTransfersClient().searchTransfers(
      body as unknown as TransferSearchRequest,
    );

    return createTransfersSuccess(sanitizeSearchResult(result));
  } catch (error) {
    const response = handleTransfersError(error);
    const payload = await response.json().catch(() => null);

    return createTransfersError(
      response.status,
      payload?.error || "TRANSFERS_SEARCH_FAILED",
      "فشل البحث في Hotelbeds Transfers. تحقق من بيانات الطلب أو إعدادات Transfers ثم حاول مرة أخرى.",
    );
  }
}
