import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AgencyBookingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Agency Bookings</h2>
        <p className="text-muted-foreground">
          This page is reserved for bookings linked to the current agency only.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bookings</CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
          <Badge variant="secondary">Empty</Badge>
          <h3 className="text-xl font-semibold">No agency bookings to show</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            B2B booking creation is not enabled yet. When it is added, this page should query
            only records scoped to the authenticated user&apos;s agency.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
