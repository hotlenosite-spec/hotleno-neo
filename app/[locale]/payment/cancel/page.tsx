import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, ArrowLeft01Icon } from "@hugeicons/core-free-icons";

export default async function PaymentCancelPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const copy = {
    title: isAr ? "تم إلغاء الدفع" : "Payment Not Completed",
    description: isAr
      ? "لم تكتمل عملية الدفع أو تم إلغاؤها. لم يتم إنشاء أي حجز لدى المورد."
      : "The payment was canceled or did not complete. No supplier booking has been created.",
    returnHome: isAr ? "العودة للرئيسية" : "Return to Home",
    tryAgain: isAr ? "المحاولة مرة أخرى" : "Try Again",
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-16 text-[#0F172A]">
      <Card className="mx-auto max-w-3xl rounded-[28px] border-[#E5E7EB] bg-white shadow-xl shadow-slate-900/10">
        <CardContent className="p-8 text-center sm:p-10">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50">
            <HugeiconsIcon
              icon={AlertCircleIcon}
              className="h-9 w-9 text-[#F97316]"
            />
          </div>
          <h1 className="mb-3 text-3xl font-black text-[#0F172A]">
            {copy.title}
          </h1>
          <p className="mx-auto max-w-xl leading-7 text-slate-600">
            {copy.description}
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              asChild
              variant="outline"
              className="rounded-xl border-[#E5E7EB] font-black text-[#0F172A] hover:bg-orange-50 hover:text-[#F97316]"
            >
              <Link href={`/${locale}`}>
                <HugeiconsIcon icon={ArrowLeft01Icon} className="mr-2 h-4 w-4" />
                {copy.returnHome}
              </Link>
            </Button>
            <Button
              asChild
              className="rounded-xl bg-[#F97316] font-black text-white hover:bg-[#ea580c]"
            >
              <Link href={`/${locale}/booking/checkout`}>{copy.tryAgain}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
