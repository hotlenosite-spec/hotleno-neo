import { buildLocalizedMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; hotelId: string }>;
}) {
  const { locale, hotelId } = await params;
  const isAr = locale === "ar";

  return buildLocalizedMetadata({
    locale,
    path: `hotel/${encodeURIComponent(hotelId)}`,
    title: isAr ? "تفاصيل الفندق والغرف" : "Hotel and Room Details",
    description: isAr
      ? "راجع تفاصيل الفندق والغرف المتاحة والسعر وسياسة الإلغاء قبل الحجز."
      : "Review hotel information, available rooms, prices, and cancellation terms before booking.",
  });
}

export default function HotelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
