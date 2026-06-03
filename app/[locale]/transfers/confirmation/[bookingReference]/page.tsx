"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransferVoucher } from "@/components/transfers/transfer-voucher";
import type {
  TransferBookingResponse,
  TransferCancellationResponse,
} from "@/types/transfers";

type DetailsResponse = {
  success: boolean;
  data?: TransferBookingResponse;
  error?: string;
  message?: string;
};

type CancelResponse = {
  success: boolean;
  data?: TransferCancellationResponse;
  error?: string;
  message?: string;
};

export default function TransferConfirmationPage() {
  const params = useParams<{ bookingReference: string }>();
  const bookingReference = decodeURIComponent(params.bookingReference || "");
  const [booking, setBooking] = useState<TransferBookingResponse | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const local = sessionStorage.getItem(`hotleno-transfer-booking-${bookingReference}`);
    if (local) {
      try {
        setBooking(JSON.parse(local) as TransferBookingResponse);
      } catch {
        setMessage("تعذر قراءة تفاصيل الحجز المحلية.");
      }
      return;
    }

    async function loadDetails() {
      setLoading(true);
      try {
        const response = await fetch("/api/transfers/booking-details", {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ bookingReference }),
        });
        const payload = (await response.json()) as DetailsResponse;
        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.message || payload.error || "تعذر جلب تفاصيل الحجز.");
        }
        setBooking(payload.data);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "تعذر جلب تفاصيل الحجز.");
      } finally {
        setLoading(false);
      }
    }

    if (bookingReference) void loadDetails();
  }, [bookingReference]);

  async function cancelBooking() {
    if (!bookingReference) return;
    const confirmed = window.confirm("هل تريد إلغاء حجز النقل؟ سيتم إرسال طلب إلغاء للمورد.");
    if (!confirmed) return;

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/transfers/cancel", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ bookingReference, reason: "Customer requested cancellation" }),
      });
      const payload = (await response.json()) as CancelResponse;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message || payload.error || "فشل إلغاء الحجز.");
      }
      setBooking((current) =>
        current
          ? {
              ...current,
              status: payload.data?.status || "cancelled",
              message: payload.data?.message,
            }
          : current,
      );
      setMessage("تم إرسال طلب الإلغاء وتحديث حالة الحجز.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "فشل إلغاء الحجز.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 text-[#0F172A]">
      <div className="mx-auto max-w-5xl space-y-6">
        <Card className="rounded-[2rem]">
          <CardHeader>
            <Badge className="w-fit bg-orange-50 text-[#F97316] hover:bg-orange-50">
              Supplier: Hotelbeds Transfers
            </Badge>
            <CardTitle className="text-2xl font-black">تأكيد حجز النقل</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Info label="رقم الحجز" value={bookingReference} />
              <Info label="الحالة" value={booking?.status || (loading ? "جاري التحميل" : "-")} />
              <Info label="Client reference" value={booking?.clientReference} />
            </div>

            {booking?.voucher?.mustCheckPickupTime ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                وقت الالتقاط يحتاج تأكيد من المورد. يرجى مراجعة تعليمات checkPickup قبل موعد الرحلة.
              </div>
            ) : null}

            {message ? (
              <p className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                {message}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                className="rounded-2xl bg-[#0F172A] text-white hover:bg-slate-800"
                onClick={() => window.print()}
                disabled={!booking?.voucher}
              >
                عرض / طباعة الفاتشر
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl"
                onClick={cancelBooking}
                disabled={loading || booking?.status === "cancelled"}
              >
                إلغاء الحجز
              </Button>
            </div>
          </CardContent>
        </Card>

        {booking?.voucher ? (
          <TransferVoucher voucher={booking.voucher} />
        ) : (
          <Card className="rounded-[2rem]">
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-black">لا توجد بيانات فاتشر معروضة</h2>
              <p className="mt-3 text-sm text-slate-500">
                ستظهر بيانات الفاتشر بعد تأكيد المورد أو عند توفر تفاصيل الحجز من Hotelbeds Transfers.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-normal text-slate-500">
        {label}
      </p>
      <p className="mt-2 font-black">{value || "-"}</p>
    </div>
  );
}
