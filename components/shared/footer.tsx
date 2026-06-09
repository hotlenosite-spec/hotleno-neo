"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

export default function Footer() {
  const locale = useLocale();
  const t = useTranslations("footer");

  const groups = [
    {
      title: t("company"),
      links: [
        { title: t("about"), href: `/${locale}/about` },
        { title: t("blog"), href: `/${locale}/blog` },
      ],
    },
    {
      title: t("legal"),
      links: [
        { title: t("terms"), href: `/${locale}/terms` },
        { title: t("privacy"), href: `/${locale}/privacy` },
        {
          title: t("cancellationRefund"),
          href: `/${locale}/cancellation-refund`,
        },
      ],
    },
    {
      title: t("help"),
      links: [
        { title: t("supportCenter"), href: `/${locale}/support` },
        { title: t("contact"), href: `/${locale}/contact` },
        {
          title: t("manageBookings"),
          href: `/${locale}/account/bookings`,
        },
      ],
    },
  ];

  return (
    <footer className="bg-[#0F172A] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F97316] text-lg font-black text-white">
                H
              </span>
              <span className="text-2xl font-black">HOTLENO</span>
            </div>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">
              {t("description")}
            </p>
            <Link
              href={`/${locale}/support`}
              className="mt-5 inline-flex text-sm font-bold text-orange-400 transition hover:text-orange-300"
            >
              {t("needHelp")}
            </Link>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {groups.map((group) => (
              <div key={group.title}>
                <h3 className="text-sm font-black text-white">{group.title}</h3>
                <div className="mt-4 space-y-3">
                  {group.links.map((link) => (
                    <Link
                      key={`${group.title}-${link.title}`}
                      href={link.href}
                      className="block text-sm font-medium text-slate-300 transition hover:text-[#F97316]"
                    >
                      {link.title}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-sm text-slate-400">
          © {new Date().getFullYear()} HOTLENO. {t("rights")}
        </div>
      </div>
    </footer>
  );
}
