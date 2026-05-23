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

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <Card>
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <HugeiconsIcon
              icon={AlertCircleIcon}
              className="h-9 w-9 text-amber-600"
            />
          </div>
          <h1 className="mb-3 text-3xl font-bold">Payment Not Completed</h1>
          <p className="mx-auto max-w-xl text-muted-foreground">
            The payment was canceled or did not complete. No supplier booking
            has been created.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild variant="outline">
              <Link href={`/${locale}`}>
                <HugeiconsIcon icon={ArrowLeft01Icon} className="mr-2 h-4 w-4" />
                Return to Home
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/${locale}/booking/checkout`}>Try Again</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
