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
    path: "results",
    title: isAr ? "نتائج الفنادق" : "Hotel Results",
    description: isAr
      ? "استعرض نتائج الفنادق المتاحة وفق معايير البحث."
      : "Browse hotel results available for your search criteria.",
    noIndex: true,
  });
}

export default function ResultsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
