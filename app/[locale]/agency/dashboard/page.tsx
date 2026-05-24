import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AgencyDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground">
          Agency overview will appear here after B2B booking workflows are enabled.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {["Bookings", "Sales", "Commission", "Balance"].map((label) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">Not configured</Badge>
              <p className="mt-3 text-sm text-muted-foreground">
                No agency data is shown until real agency activity exists.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Next setup steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Agency-specific bookings will be listed only after a real B2B flow is added.</p>
          <p>No supplier booking, payment, balance, or credit operation is active here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
