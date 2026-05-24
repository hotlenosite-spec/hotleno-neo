"use client";

import { FormEvent, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  HOTEL_OWNER_LOCAL_KEYS,
  LocalHotelAvailability,
  LocalHotelRoom,
  createLocalId,
  readLocalItems,
  writeLocalItems,
} from "@/lib/hotel-owner-local-store";

const emptyAvailability = {
  roomId: "",
  date: "",
  availableRooms: "",
  price: "",
  currency: "USD",
  stopSell: true,
  minNights: "1",
  maxNights: "",
};

export default function HotelOwnerAvailabilityPage() {
  const [rooms] = useState<LocalHotelRoom[]>(() =>
    readLocalItems<LocalHotelRoom>(HOTEL_OWNER_LOCAL_KEYS.rooms),
  );
  const [items, setItems] = useState<LocalHotelAvailability[]>(() =>
    readLocalItems<LocalHotelAvailability>(HOTEL_OWNER_LOCAL_KEYS.availability),
  );
  const [form, setForm] = useState(() => ({
    ...emptyAvailability,
    roomId:
      readLocalItems<LocalHotelRoom>(HOTEL_OWNER_LOCAL_KEYS.rooms)[0]?.id || "",
  }));

  const updateField = (
    field: keyof typeof emptyAvailability,
    value: string | boolean,
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextItem: LocalHotelAvailability = {
      id: createLocalId("availability"),
      ...form,
      createdAt: new Date().toISOString(),
    };
    const nextItems = [nextItem, ...items];

    setItems(nextItems);
    writeLocalItems(HOTEL_OWNER_LOCAL_KEYS.availability, nextItems);
    setForm({ ...emptyAvailability, roomId: form.roomId });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Availability</h2>
        <p className="text-muted-foreground">
          Add local room availability and prices without connecting search or booking.
        </p>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm text-muted-foreground">
          <Badge variant="secondary">Local only</Badge>
          <span>No availability or price here is applied to customer search or checkout.</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Availability and Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Field label="Room">
              <select
                value={form.roomId}
                onChange={(event) => updateField("roomId", event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">No room selected</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={form.date}
                onChange={(event) => updateField("date", event.target.value)}
              />
            </Field>
            <Field label="Available rooms">
              <Input
                type="number"
                min="0"
                value={form.availableRooms}
                onChange={(event) => updateField("availableRooms", event.target.value)}
              />
            </Field>
            <Field label="Price">
              <Input
                type="number"
                min="0"
                value={form.price}
                onChange={(event) => updateField("price", event.target.value)}
              />
            </Field>
            <Field label="Currency">
              <Input
                value={form.currency}
                onChange={(event) => updateField("currency", event.target.value.toUpperCase())}
                maxLength={3}
              />
            </Field>
            <Field label="Min nights">
              <Input
                type="number"
                min="1"
                value={form.minNights}
                onChange={(event) => updateField("minNights", event.target.value)}
              />
            </Field>
            <Field label="Max nights">
              <Input
                type="number"
                min="0"
                value={form.maxNights}
                onChange={(event) => updateField("maxNights", event.target.value)}
              />
            </Field>
            <div className="space-y-2">
              <Label>Stop sell</Label>
              <div className="flex h-10 items-center gap-3">
                <Switch
                  checked={form.stopSell}
                  onCheckedChange={(checked) => updateField("stopSell", checked)}
                />
                <span className="text-sm text-muted-foreground">
                  {form.stopSell ? "Closed" : "Open locally"}
                </span>
              </div>
            </div>
            <div className="lg:col-span-4">
              <Button type="submit">Save local availability</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 p-8 text-center">
            <Badge variant="secondary">Empty state</Badge>
            <h3 className="text-xl font-semibold">No local availability yet</h3>
            <p className="text-sm text-muted-foreground">
              Add a local date entry to test the calendar workflow.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => {
            const room = rooms.find((candidate) => candidate.id === item.roomId);
            return (
              <Card key={item.id}>
                <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{room?.name || "Unassigned room"}</h3>
                      <Badge variant="outline">Local only</Badge>
                      {item.stopSell && <Badge variant="secondary">Stop sell</Badge>}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.date || "No date"} | {item.availableRooms || "0"} rooms |{" "}
                      {item.price || "0"} {item.currency}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Not connected to booking
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      {children}
    </div>
  );
}
