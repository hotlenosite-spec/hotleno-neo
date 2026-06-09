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
    path: "search",
    title: isAr ? "نتائج البحث عن الفنادق" : "Hotel Search Results",
    description: isAr
      ? "راجع خيارات الفنادق المتاحة وتفاصيل الغرف والأسعار حسب بيانات البحث."
      : "Review available hotel options, room details, and prices for your search.",
    noIndex: true,
  });
}

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
