import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { cairo } from "@/lib/config/font";
import Footer from "@/components/shared/footer";
import { HeroHeader } from "@/components/shared/header";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DirectionProvider } from "@/components/ui/direction";
import { buildLocalizedMetadata, normalizeSeoLocale } from "@/lib/seo";
import "../globals.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const metadata = buildLocalizedMetadata({ locale });

  return {
    ...metadata,
    applicationName: "HOTLENO",
    manifest: "/manifest.json",
    icons: {
      icon: [
        { url: "/favicon.ico" },
        { url: "/favicon.jpg", type: "image/jpeg" },
      ],
      apple: "/icon-192x192.png",
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "HOTLENO",
    },
    formatDetection: {
      telephone: false,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

type ValidLocale = "en" | "ar";

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as ValidLocale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html
      lang={normalizeSeoLocale(locale)}
      className={cairo.variable}
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body dir={locale === "ar" ? "rtl" : "ltr"} className="antialiased">
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            <AuthProvider>
              <DirectionProvider dir={locale === "ar" ? "rtl" : "ltr"}>
                <TooltipProvider>
                  <HeroHeader />
                  <main className="min-h-screen pt-20">{children}</main>
                  <Toaster />
                  <Footer />
                </TooltipProvider>
              </DirectionProvider>
            </AuthProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
