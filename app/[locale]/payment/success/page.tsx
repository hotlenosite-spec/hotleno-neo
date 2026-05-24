import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkBadge01Icon, ClockIcon } from "@hugeicons/core-free-icons";
import { formatBookingStatus } from "@/lib/booking-status";

export default async function PaymentSuccessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const copy = {
    title: isAr ? "تم الدفع بنجاح" : "Payment Successful",
    description: isAr
      ? "تم استلام عملية الدفع بنجاح. طلبك الآن قيد المعالجة وسيتم التعامل مع حجز المورد في الخطوة التالية."
      : "Your payment was received. Your request is now being processed and supplier booking will be handled in the next step.",
    processing: isAr ? "حالة المعالجة" : "Processing status",
    returnHome: isAr ? "العودة للرئيسية" : "Return to Home",
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-16 text-[#0F172A]">
      <Card className="mx-auto max-w-3xl rounded-[28px] border-[#E5E7EB] bg-white shadow-xl shadow-slate-900/10">
        <CardContent className="p-8 text-center sm:p-10">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50">
            <HugeiconsIcon
              icon={CheckmarkBadge01Icon}
              className="h-9 w-9 text-[#F97316]"
            />
          </div>
          <h1 className="mb-3 text-3xl font-black text-[#0F172A]">
            {copy.title}
          </h1>
          <p className="mx-auto max-w-xl leading-7 text-slate-600">
            {copy.description}
          </p>
          <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-left">
            <div className="flex gap-3">
              <HugeiconsIcon
                icon={ClockIcon}
                className="mt-0.5 h-5 w-5 shrink-0 text-[#F97316]"
              />
              <div>
                <p className="font-black text-[#0F172A]">
                  {copy.processing}
                </p>
                <p className="mt-1 text-sm font-semibold text-orange-700">
                  {formatBookingStatus("payment_succeeded")}
                </p>
              </div>
            </div>
          </div>
          <Button
            asChild
            className="mt-7 rounded-xl bg-[#F97316] px-7 font-black text-white hover:bg-[#ea580c]"
          >
            <Link href={`/${locale}`}>{copy.returnHome}</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
