import { LegalPage, getLegalMetadata } from "@/components/legal/legal-page";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  return getLegalMetadata(locale, "cancellationRefund");
}

export default async function CancellationRefundPage({ params }: PageProps) {
  const { locale } = await params;
  return <LegalPage locale={locale} type="cancellationRefund" />;
}
