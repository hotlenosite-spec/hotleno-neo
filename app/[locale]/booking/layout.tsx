import { buildLocalizedMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === "ar";

  return buildLocalizedMetadata({
    locale,
    path: "booking",
    title: isAr ? "إتمام الحجز" : "Complete Your Booking",
    description: isAr
      ? "راجع بيانات الحجز والمسافرين وأكمل خطوات التأكيد بأمان."
      : "Review booking and traveler details and complete the confirmation steps.",
    noIndex: true,
  });
}

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
