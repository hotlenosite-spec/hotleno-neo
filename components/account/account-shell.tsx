"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { AuthDialog } from "@/components/features/auth/auth-dialog";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type IconProps = { className?: string };

function Icon({ className, path }: IconProps & { path: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {path}
    </svg>
  );
}

function HomeIcon(props: IconProps) {
  return <Icon {...props} path={<><path d="m3.5 11.2 8.5-7.1 8.5 7.1" /><path d="M6 10.5V20h12v-9.5" /><path d="M10 20v-5h4v5" /></>} />;
}

function UserIcon(props: IconProps) {
  return <Icon {...props} path={<><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7.5" r="4" /></>} />;
}

function CalendarIcon(props: IconProps) {
  return <Icon {...props} path={<><path d="M7 3.5v3" /><path d="M17 3.5v3" /><rect x="4" y="5.5" width="16" height="15" rx="2" /><path d="M4 10h16" /></>} />;
}

function WalletIcon(props: IconProps) {
  return <Icon {...props} path={<><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19v14H6.5A2.5 2.5 0 0 1 4 16.5z" /><path d="M16 12h4v4h-4a2 2 0 0 1 0-4Z" /></>} />;
}

function TravelersIcon(props: IconProps) {
  return <Icon {...props} path={<><circle cx="8" cy="8" r="3" /><path d="M2.8 19a5.2 5.2 0 0 1 10.4 0" /><circle cx="17" cy="9" r="2.5" /><path d="M14.5 18.5a4.3 4.3 0 0 1 6.7 0" /></>} />;
}

function SettingsIcon(props: IconProps) {
  return <Icon {...props} path={<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-2 3.4-.2-.1a1.8 1.8 0 0 0-2 .4l-.3.2-3.4-2 .1-.3a1.8 1.8 0 0 0-.8-1.8h-.6a1.8 1.8 0 0 0-1.8.8l-.1.3-3.4-2 .1-.2a1.8 1.8 0 0 0-.4-2l-.2-.3 2-3.4.3.1a1.8 1.8 0 0 0 1.8-.8v-.6a1.8 1.8 0 0 0-.8-1.8L8 6.9l2-3.4.3.1a1.8 1.8 0 0 0 2-.4l.2-.2 3.4 2-.1.3a1.8 1.8 0 0 0 .8 1.8h.6a1.8 1.8 0 0 0 1.8-.8l.1-.3 3.4 2-.1.3a1.8 1.8 0 0 0 .4 1.8l.2.2-2 3.4-.3-.1a1.8 1.8 0 0 0-1.3 1.4Z" /></>} />;
}

function SupportIcon(props: IconProps) {
  return <Icon {...props} path={<><path d="M12 20a8 8 0 1 0-8-8" /><path d="M4 20v-4h4" /><path d="M9.5 9a2.5 2.5 0 0 1 4.8 1c0 2-2.3 2-2.3 4" /><path d="M12 17h.01" /></>} />;
}

function LogoutIcon(props: IconProps) {
  return <Icon {...props} path={<><path d="M10 4H5v16h5" /><path d="M14 8l4 4-4 4" /><path d="M18 12H9" /></>} />;
}

export function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("account");
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const base = `/${locale}/account`;
  const navItems = [
    { href: base, label: t("nav.dashboard"), icon: HomeIcon },
    { href: `${base}/profile`, label: t("nav.profile"), icon: UserIcon },
    { href: `${base}/bookings`, label: t("nav.bookings"), icon: CalendarIcon },
    { href: `${base}/wallet`, label: t("nav.wallet"), icon: WalletIcon },
    { href: `${base}/travelers`, label: t("nav.travelers"), icon: TravelersIcon },
    { href: `${base}/settings`, label: t("nav.settings"), icon: SettingsIcon },
    { href: `/${locale}/support`, label: t("nav.support"), icon: SupportIcon },
  ];

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">{t("loading")}</div>;
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="mx-auto max-w-xl">
          <CardContent className="space-y-4 py-10 text-center">
            <h1 className="text-2xl font-bold">{t("authRequiredTitle")}</h1>
            <p className="text-muted-foreground">{t("authRequiredDescription")}</p>
            <AuthDialog />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  {user.name?.[0] || user.email?.[0] || "H"}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{user.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-2">
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const IconComponent = item.icon;
                  const active =
                    item.href === base
                      ? pathname === item.href
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <IconComponent className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 px-3 py-2.5 text-sm font-medium text-muted-foreground"
                  onClick={() => {
                    logout();
                    router.push(`/${locale}`);
                  }}
                >
                  <LogoutIcon className="h-4 w-4" />
                  {t("nav.logout")}
                </Button>
              </nav>
            </CardContent>
          </Card>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}

export function ServiceIcon({ type, className }: { type: string; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    hotel: <><path d="M4 20V5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5V20" /><path d="M8 20v-5h8v5" /><path d="M8 8h.01" /><path d="M12 8h.01" /><path d="M16 8h.01" /><path d="M8 11h.01" /><path d="M12 11h.01" /><path d="M16 11h.01" /></>,
    flight: <><path d="M3.5 12.5 21 5l-7.5 17-3-7-7-2.5Z" /><path d="m10.5 15 4-4" /></>,
    car: <><path d="M5 15h14l-1.5-5.2A2.5 2.5 0 0 0 15.1 8H8.9a2.5 2.5 0 0 0-2.4 1.8Z" /><path d="M6.5 18.5h.01" /><path d="M17.5 18.5h.01" /><path d="M4 15v4h16v-4" /></>,
    activity: <><path d="M6 20 18 4" /><path d="M8 5h8" /><path d="M4 17h8" /><path d="M15 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /></>,
    transfer: <><path d="M4 17V8a2 2 0 0 1 2-2h9l5 5v6" /><path d="M15 6v5h5" /><circle cx="7.5" cy="18" r="1.5" /><circle cx="17" cy="18" r="1.5" /></>,
    esim: <><rect x="7" y="3.5" width="10" height="17" rx="2" /><path d="M10 7h4" /><path d="M10 11h4" /><path d="M10 15h2" /></>,
  };

  return <Icon className={className} path={paths[type] || paths.hotel} />;
}
