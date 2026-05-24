"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";

const hotelOwnerNavItems = [
  { title: "Dashboard", href: "/hotel-owner/dashboard" },
  { title: "Properties", href: "/hotel-owner/properties" },
  { title: "Rooms", href: "/hotel-owner/rooms" },
  { title: "Availability", href: "/hotel-owner/availability" },
  { title: "Bookings", href: "/hotel-owner/bookings" },
  { title: "Payouts", href: "/hotel-owner/payouts" },
];

function canAccessHotelOwner(role?: string, hotelPartnerId?: string) {
  return Boolean(hotelPartnerId) || Boolean(role?.startsWith("hotel_"));
}

export default function HotelOwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = useLocale();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();
  const hasHotelAccess = canAccessHotelOwner(user?.role, user?.hotelPartnerId);

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

  if (!isAuthenticated || !hasHotelAccess) {
    return (
      <div className="min-h-screen bg-background px-4 py-12">
        <Card className="mx-auto max-w-xl">
          <CardContent className="space-y-4 p-8 text-center">
            <Badge variant="secondary">Hotel owner access</Badge>
            <h1 className="text-2xl font-bold">Access restricted</h1>
            <p className="text-muted-foreground">
              This area is available only for users linked to a hotel partner account.
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
              <h1 className="text-2xl font-bold">Hotel Owner Portal</h1>
              <Badge variant="outline">{user?.hotelRole || user?.role}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Operational workspace for hotel partners before customer publication.
            </p>
          </div>

          <nav className="flex flex-wrap gap-2">
            {hotelOwnerNavItems.map((item) => {
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
