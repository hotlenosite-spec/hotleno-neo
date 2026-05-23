// next
import Link from 'next/link'
// Next Intl
import { useTranslations, useLocale } from "next-intl"
// shadcn/ui
import { Separator } from "@/components/ui/separator"

export default function Footer() {
    const t = useTranslations('components.shared.footer')
    const lang = useLocale();

    const links = [
        { title: t('nav.nav1'), href: `/${lang}/` },
        { title: t('nav.nav2'), href: `/${lang}/about` },
        { title: t('nav.nav3'), href: `/${lang}/contact` },
        { title: t('nav.nav4'), href: `/${lang}/app` },
        { title: t('nav.nav5'), href: `/${lang}/terms` },
        { title: t('nav.nav6'), href: `/${lang}/privacy` },
    ]

    return (
        <footer className="bg-background">
            <div className="container mx-auto py-8">
                <Separator className="mb-8" />
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-muted-foreground order-last md:order-first">
                        © {new Date().getFullYear()} {t('copyright')}
                    </p>
                    <nav className="flex flex-wrap justify-center gap-6 order-first md:order-last">
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                                {link.title}
                            </Link>
                        ))}
                    </nav>
                </div>
            </div>
        </footer>
    )
}
