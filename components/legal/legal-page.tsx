import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  CheckmarkCircle02Icon,
  CustomerServiceIcon,
  InformationCircleIcon,
  Shield02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { buildLocalizedMetadata } from "@/lib/seo";

export type LegalPageType =
  | "about"
  | "contact"
  | "privacy"
  | "terms"
  | "cancellationRefund";

const sections: Record<LegalPageType, string[]> = {
  about: [
    "whatWeDo",
    "howItWorks",
    "providerAvailability",
    "customerCare",
    "responsibleInformation",
  ],
  contact: [
    "supportTickets",
    "bookingHelp",
    "accountHelp",
    "responseTimes",
    "urgentIssues",
  ],
  privacy: [
    "informationCollected",
    "informationUse",
    "informationSharing",
    "retention",
    "security",
    "yourChoices",
    "cookies",
    "updates",
  ],
  terms: [
    "usingPlatform",
    "bookingConfirmation",
    "pricesAndPayment",
    "changesAndCancellation",
    "userResponsibilities",
    "serviceAvailability",
    "liability",
    "updates",
  ],
  cancellationRefund: [
    "rateConditions",
    "requestingCancellation",
    "supplierProcessing",
    "refundEligibility",
    "nonRefundableBookings",
    "refundTiming",
    "support",
  ],
};

const pageIcons: Record<LegalPageType, typeof Shield02Icon> = {
  about: InformationCircleIcon,
  contact: CustomerServiceIcon,
  privacy: Shield02Icon,
  terms: CheckmarkCircle02Icon,
  cancellationRefund: InformationCircleIcon,
};

export async function getLegalMetadata(
  locale: string,
  type: LegalPageType,
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: `legal.${type}` });
  const paths: Record<LegalPageType, string> = {
    about: "about",
    contact: "contact",
    privacy: "privacy",
    terms: "terms",
    cancellationRefund: "cancellation-refund",
  };

  return buildLocalizedMetadata({
    locale,
    path: paths[type],
    title: t("title"),
    description: t("description"),
  });
}

export async function LegalPage({
  locale,
  type,
}: {
  locale: string;
  type: LegalPageType;
}) {
  const t = await getTranslations({ locale, namespace: `legal.${type}` });
  const common = await getTranslations({ locale, namespace: "legal.common" });
  const Icon = pageIcons[type];
  const isContact = type === "contact";

  return (
    <main className="min-h-screen bg-slate-50 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-orange-100 bg-orange-50 px-6 py-8 sm:px-10 sm:py-10">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm">
                <HugeiconsIcon icon={Icon} size={28} />
              </span>
              <div>
                <p className="mb-2 text-sm font-semibold text-orange-700">
                  HOTLENO
                </p>
                <h1 className="text-3xl font-bold text-slate-950 sm:text-4xl">
                  {t("title")}
                </h1>
                <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                  {t("description")}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-8 px-6 py-8 sm:px-10 sm:py-10 lg:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <p className="mb-3 text-sm font-bold text-slate-900">
                {common("onThisPage")}
              </p>
              <nav className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
                {sections[type].map((section) => (
                  <a
                    key={section}
                    href={`#${section}`}
                    className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-orange-50 hover:text-orange-700"
                  >
                    {t(`sections.${section}.title`)}
                  </a>
                ))}
              </nav>
            </aside>

            <div className="min-w-0 space-y-8">
              {sections[type].map((section, index) => (
                <section
                  id={section}
                  key={section}
                  className="scroll-mt-28 border-b border-slate-100 pb-8 last:border-0 last:pb-0"
                >
                  <div className="flex gap-4">
                    <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
                      {index + 1}
                    </span>
                    <div>
                      <h2 className="text-xl font-bold text-slate-950">
                        {t(`sections.${section}.title`)}
                      </h2>
                      <p className="mt-3 whitespace-pre-line leading-8 text-slate-600">
                        {t(`sections.${section}.body`)}
                      </p>
                    </div>
                  </div>
                </section>
              ))}

              <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 text-sm leading-7 text-orange-950">
                {t("notice")}
              </div>

              {isContact ? (
                <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-bold text-slate-950">
                      {t("ctaTitle")}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {t("ctaDescription")}
                    </p>
                  </div>
                  <Link
                    href={`/${locale}/support`}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-orange-500 px-5 py-2.5 font-semibold text-white transition hover:bg-orange-600"
                  >
                    {t("ctaAction")}
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </header>
      </div>
    </main>
  );
}
