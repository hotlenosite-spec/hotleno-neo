import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AgencyUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Agency Users</h2>
        <p className="text-muted-foreground">
          User management for agency staff will be added after agency permissions are finalized.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team access</CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
          <Badge variant="secondary">Placeholder</Badge>
          <h3 className="text-xl font-semibold">No team data is loaded</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            This placeholder does not fetch users. Future implementation should scope every
            query by the authenticated user&apos;s agency.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
