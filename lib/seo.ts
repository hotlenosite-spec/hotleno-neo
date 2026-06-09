import type { Metadata } from "next";

export type SeoLocale = "ar" | "en";

const siteCopy = {
  ar: {
    siteName: "HOTLENO",
    defaultTitle: "HOTLENO | حجز الفنادق وإدارة رحلتك بسهولة",
    defaultDescription:
      "HOTLENO منصة حجز فنادق تساعدك على البحث والمقارنة وإدارة حجوزاتك بسهولة.",
  },
  en: {
    siteName: "HOTLENO",
    defaultTitle: "HOTLENO | Hotel Search and Booking Management",
    defaultDescription:
      "HOTLENO is a hotel booking platform that helps you search, compare, and manage your bookings with ease.",
  },
} as const;

export function normalizeSeoLocale(locale: string): SeoLocale {
  return locale === "ar" ? "ar" : "en";
}

export function getSiteUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;
  const value = configuredUrl || "http://localhost:3000";
  return new URL(value.startsWith("http") ? value : `https://${value}`);
}

export function buildLocalizedMetadata({
  locale,
  title,
  description,
  path = "",
  noIndex = false,
}: {
  locale: string;
  title?: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
}): Metadata {
  const normalizedLocale = normalizeSeoLocale(locale);
  const copy = siteCopy[normalizedLocale];
  const cleanPath = path ? `/${path.replace(/^\/+|\/+$/g, "")}` : "";
  const localizedPath = `/${normalizedLocale}${cleanPath}`;
  const alternateLocale = normalizedLocale === "ar" ? "en" : "ar";

  return {
    metadataBase: getSiteUrl(),
    title: title ? `${title} | ${copy.siteName}` : copy.defaultTitle,
    description: description || copy.defaultDescription,
    alternates: {
      canonical: localizedPath,
      languages: {
        ar: `/ar${cleanPath}`,
        en: `/en${cleanPath}`,
        "x-default": `/en${cleanPath}`,
      },
    },
    openGraph: {
      type: "website",
      locale: normalizedLocale === "ar" ? "ar_SA" : "en_US",
      alternateLocale: alternateLocale === "ar" ? "ar_SA" : "en_US",
      siteName: copy.siteName,
      title: title || copy.defaultTitle,
      description: description || copy.defaultDescription,
      url: localizedPath,
      images: [{ url: "/design-assets/hotleno-logo.png", alt: "HOTLENO" }],
    },
    twitter: {
      card: "summary",
      title: title || copy.defaultTitle,
      description: description || copy.defaultDescription,
      images: ["/design-assets/hotleno-logo.png"],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}
