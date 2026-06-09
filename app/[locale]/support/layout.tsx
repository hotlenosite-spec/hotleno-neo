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
    path: "support",
    title: isAr ? "مركز الدعم" : "Support Center",
    description: isAr
      ? "أنشئ تذكرة دعم وتابع الاستفسارات المتعلقة بالحجوزات والحساب والمدفوعات."
      : "Create and track support requests related to bookings, accounts, and payments.",
  });
}

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
