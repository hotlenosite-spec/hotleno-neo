"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  HOTEL_OWNER_LOCAL_KEYS,
  LocalHotelAvailability,
  LocalHotelProperty,
  LocalHotelRoom,
  readLocalItems,
} from "@/lib/hotel-owner-local-store";

interface LocalCounts {
  properties: number;
  rooms: number;
  availability: number;
}

export default function HotelOwnerDashboardPage() {
  const [counts, setCounts] = useState<LocalCounts>(() => getLocalCounts());

  useEffect(() => {
    const loadCounts = () => {
      setCounts(getLocalCounts());
    };

    window.addEventListener("hotleno:hotel-owner-local-updated", loadCounts);
    return () => {
      window.removeEventListener("hotleno:hotel-owner-local-updated", loadCounts);
    };
  }, []);

  const hasLocalData =
    counts.properties > 0 || counts.rooms > 0 || counts.availability > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground">
          Local workspace for testing Hotel Owner Portal setup before production.
        </p>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm text-muted-foreground">
          <Badge variant="secondary">Local draft mode</Badge>
          <span>No database, payments, supplier calls, or customer search publishing are active here.</span>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <DashboardCard label="Properties" value={counts.properties} />
        <DashboardCard label="Rooms" value={counts.rooms} />
        <DashboardCard label="Availability" value={counts.availability} />
        <DashboardCard label="Bookings" value={null} />
        <DashboardCard label="Payouts" value={null} />
      </div>

      {!hasLocalData && (
        <Card>
          <CardContent className="space-y-3 p-8 text-center">
            <Badge variant="secondary">Empty state</Badge>
            <h3 className="text-xl font-semibold">No local setup data yet</h3>
            <p className="text-sm text-muted-foreground">
              Add a property, room, or availability entry to preview the local owner workflow.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Publishing status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Local drafts are not saved to MongoDB.</p>
          <p>Local drafts are not published to customer search.</p>
          <p>No internal booking, payout, Stripe, or supplier operation is active here.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function getLocalCounts(): LocalCounts {
  return {
    properties: readLocalItems<LocalHotelProperty>(
      HOTEL_OWNER_LOCAL_KEYS.properties,
    ).length,
    rooms: readLocalItems<LocalHotelRoom>(HOTEL_OWNER_LOCAL_KEYS.rooms).length,
    availability: readLocalItems<LocalHotelAvailability>(
      HOTEL_OWNER_LOCAL_KEYS.availability,
    ).length,
  };
}

function DashboardCard({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {value === null ? (
          <Badge variant="secondary">Not connected</Badge>
        ) : value === 0 ? (
          <Badge variant="secondary">Empty</Badge>
        ) : (
          <p className="text-3xl font-bold">{value}</p>
        )}
        <p className="mt-3 text-sm text-muted-foreground">
          {value === null
            ? "Production workflow not enabled."
            : "Count reflects this browser only."}
        </p>
      </CardContent>
    </Card>
  );
}
