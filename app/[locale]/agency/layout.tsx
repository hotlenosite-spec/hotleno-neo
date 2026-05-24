"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const agencyNavItems = [
  { title: "Dashboard", href: "/agency/dashboard" },
  { title: "Bookings", href: "/agency/bookings" },
  { title: "Users", href: "/agency/users" },
  { title: "Reports", href: "/agency/reports" },
];

function canAccessAgency(role?: string, agencyId?: string) {
  return Boolean(agencyId) || Boolean(role?.startsWith("agency_"));
}

export default function AgencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = useLocale();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();
  const hasAgencyAccess = canAccessAgency(user?.role, user?.agencyId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto max-w-6xl space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !hasAgencyAccess) {
    return (
      <div className="min-h-screen bg-background px-4 py-12">
        <Card className="mx-auto max-w-xl">
          <CardContent className="space-y-4 p-8 text-center">
            <Badge variant="secondary">Agency access</Badge>
            <h1 className="text-2xl font-bold">Access restricted</h1>
            <p className="text-muted-foreground">
              This area is available only for users linked to an agency account.
            </p>
            <Button asChild variant="outline">
              <Link href={`/${locale}`}>Back to site</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">Agency Portal</h1>
              <Badge variant="outline">{user?.agencyRole || user?.role}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Operational workspace for B2B agency users.
            </p>
          </div>
          <nav className="flex flex-wrap gap-2">
            {agencyNavItems.map((item) => {
              const href = `/${locale}${item.href}`;
              const active = pathname === href;

              return (
                <Button
                  key={item.href}
                  asChild
                  variant={active ? "secondary" : "ghost"}
                  className={cn(active && "bg-secondary")}
                >
                  <Link href={href}>{item.title}</Link>
                </Button>
              );
            })}
          </nav>
        </div>
      </div>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
