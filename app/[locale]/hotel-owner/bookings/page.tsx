import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HotelOwnerBookingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Bookings</h2>
        <p className="text-muted-foreground">
          Internal hotel partner bookings will appear only after a real workflow is enabled.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booking queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Badge variant="secondary">No booking workflow</Badge>
          <h3 className="text-xl font-semibold">No hotel bookings yet</h3>
          <p className="text-sm text-muted-foreground">
            This page does not fetch from the database and does not accept, reject, or create any real hotel booking yet.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
