import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkBadge01Icon, ClockIcon } from "@hugeicons/core-free-icons";

export default async function PaymentSuccessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <Card className="border-green-500/60">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <HugeiconsIcon
              icon={CheckmarkBadge01Icon}
              className="h-9 w-9 text-green-600"
            />
          </div>
          <h1 className="mb-3 text-3xl font-bold">Payment Successful</h1>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Your payment was received. Your request is now being processed and
            supplier booking will be handled in the next step.
          </p>
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
            <div className="flex gap-3">
              <HugeiconsIcon
                icon={ClockIcon}
                className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
              />
              <div>
                <p className="font-semibold text-amber-900">
                  Processing status
                </p>
                <p className="mt-1 text-sm text-amber-800">
                  payment_succeeded_pending_supplier_booking
                </p>
              </div>
            </div>
          </div>
          <Button asChild className="mt-7">
            <Link href={`/${locale}`}>Return to Home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
