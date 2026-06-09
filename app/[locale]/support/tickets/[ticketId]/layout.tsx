import { buildLocalizedMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; ticketId: string }>;
}) {
  const { locale, ticketId } = await params;
  const isAr = locale === "ar";

  return buildLocalizedMetadata({
    locale,
    path: `support/tickets/${encodeURIComponent(ticketId)}`,
    title: isAr ? "تفاصيل تذكرة الدعم" : "Support Ticket Details",
    description: isAr
      ? "راجع محادثة الدعم وحالة التذكرة."
      : "Review the support conversation and ticket status.",
    noIndex: true,
  });
}

export default function SupportTicketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
