import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/ar/admin/",
        "/en/admin/",
        "/ar/account/",
        "/en/account/",
        "/ar/booking/",
        "/en/booking/",
        "/ar/support/tickets/",
        "/en/support/tickets/",
      ],
    },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
