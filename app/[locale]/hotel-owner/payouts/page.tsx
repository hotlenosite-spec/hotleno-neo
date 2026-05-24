import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HotelOwnerPayoutsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Payouts</h2>
        <p className="text-muted-foreground">
          Payout settings and settlement history will be connected later.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payout operations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Badge variant="secondary">Not configured</Badge>
          <h3 className="text-xl font-semibold">
            Payouts will be available after production setup
          </h3>
          <p className="text-sm text-muted-foreground">
            No payout method, balance, commission, Stripe connection, or settlement action is active here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
