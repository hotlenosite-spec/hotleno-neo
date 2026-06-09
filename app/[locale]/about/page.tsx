import { LegalPage, getLegalMetadata } from "@/components/legal/legal-page";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  return getLegalMetadata(locale, "about");
}

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params;
  return <LegalPage locale={locale} type="about" />;
}
