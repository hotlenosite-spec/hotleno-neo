import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const reportSections = [
  "Agency balance",
  "Sales",
  "Bookings",
  "Commission",
];

export default function AgencyReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Reports</h2>
        <p className="text-muted-foreground">
          Financial and operational reports will be available after real B2B transactions exist.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {reportSections.map((section) => (
          <Card key={section}>
            <CardHeader>
              <CardTitle>{section}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">No data</Badge>
              <p className="mt-3 text-sm text-muted-foreground">
                This report is intentionally empty. No placeholder numbers are displayed.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
