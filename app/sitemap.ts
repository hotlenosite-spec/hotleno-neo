import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

const publicRoutes = [
  "",
  "about",
  "contact",
  "privacy",
  "terms",
  "cancellation-refund",
  "support",
  "blog",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const now = new Date();

  return ["ar", "en"].flatMap((locale) =>
    publicRoutes.map((route) => ({
      url: new URL(`/${locale}${route ? `/${route}` : ""}`, siteUrl).toString(),
      lastModified: now,
      changeFrequency: route === "" ? ("daily" as const) : ("monthly" as const),
      priority: route === "" ? 1 : 0.6,
      alternates: {
        languages: {
          ar: new URL(`/ar${route ? `/${route}` : ""}`, siteUrl).toString(),
          en: new URL(`/en${route ? `/${route}` : ""}`, siteUrl).toString(),
        },
      },
    })),
  );
}
