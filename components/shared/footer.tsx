import Link from "next/link";
import { useLocale } from "next-intl";

export default function Footer() {
  const locale = useLocale();
  const isAr = locale === "ar";

  const groups = [
    {
      title: isAr ? "معلومات" : "Information",
      links: [
        { title: isAr ? "من نحن" : "About", href: `/${locale}/services` },
        { title: isAr ? "المدونة" : "Blog", href: `/${locale}/blog` },
        { title: isAr ? "الشروط" : "Terms", href: `/${locale}/terms` },
        { title: isAr ? "الخصوصية" : "Privacy", href: `/${locale}/privacy` },
      ],
    },
    {
      title: isAr ? "الدعم" : "Support",
      links: [
        { title: isAr ? "مركز الدعم" : "Support center", href: `/${locale}/support` },
        { title: isAr ? "تواصل معنا" : "Contact", href: `/${locale}/support` },
      ],
    },
    {
      title: isAr ? "تابعنا" : "Follow us",
      links: [
        { title: "Instagram", href: `/${locale}` },
        { title: "X", href: `/${locale}` },
        { title: "LinkedIn", href: `/${locale}` },
      ],
    },
    {
      title: isAr ? "حمّل تطبيقنا" : "Get the app",
      links: [
        { title: "iOS", href: `/${locale}` },
        { title: "Android", href: `/${locale}` },
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
              <span className="text-2xl font-black">Hotleno</span>
            </div>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">
              {isAr
                ? "منصة سفر ذكية تجمع الفنادق والطيران والخدمات في تجربة حجز واحدة سهلة وسريعة."
                : "A clean and simple travel platform for hotels and services worldwide."}
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
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
          © {new Date().getFullYear()} Hotleno LTD.{" "}
          {isAr ? "جميع الحقوق محفوظة." : "All rights reserved."}
        </div>
      </div>
    </footer>
  );
}
