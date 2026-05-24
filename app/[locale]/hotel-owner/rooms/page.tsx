"use client";

import { FormEvent, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  HOTEL_OWNER_LOCAL_KEYS,
  LocalHotelProperty,
  LocalHotelRoom,
  createLocalId,
  readLocalItems,
  writeLocalItems,
} from "@/lib/hotel-owner-local-store";

const emptyRoom = {
  propertyId: "",
  name: "",
  roomType: "",
  description: "",
  maxAdults: "",
  maxChildren: "",
  maxOccupancy: "",
  bedType: "",
  basePrice: "",
  currency: "USD",
  mealPlan: "",
  cancellationPolicy: "",
  amenities: "",
};

export default function HotelOwnerRoomsPage() {
  const [properties] = useState<LocalHotelProperty[]>(() =>
    readLocalItems<LocalHotelProperty>(HOTEL_OWNER_LOCAL_KEYS.properties),
  );
  const [rooms, setRooms] = useState<LocalHotelRoom[]>(() =>
    readLocalItems<LocalHotelRoom>(HOTEL_OWNER_LOCAL_KEYS.rooms),
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => ({
    ...emptyRoom,
    propertyId:
      readLocalItems<LocalHotelProperty>(HOTEL_OWNER_LOCAL_KEYS.properties)[0]
        ?.id || "",
  }));

  const updateField = (field: keyof typeof emptyRoom, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextRoom: LocalHotelRoom = {
      id: createLocalId("room"),
      ...form,
      createdAt: new Date().toISOString(),
    };
    const nextRooms = [nextRoom, ...rooms];

    setRooms(nextRooms);
    writeLocalItems(HOTEL_OWNER_LOCAL_KEYS.rooms, nextRooms);
    setForm({ ...emptyRoom, propertyId: form.propertyId });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold">Rooms</h2>
          <p className="text-muted-foreground">
            Build local room drafts for hotel partner testing.
          </p>
        </div>
        <Button onClick={() => setShowForm((value) => !value)}>
          {showForm ? "Close form" : "Add Room"}
        </Button>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm text-muted-foreground">
          <Badge variant="secondary">Local only</Badge>
          <span>Rooms are saved only in this browser and never exposed to booking or search.</span>
        </CardContent>
      </Card>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add Room</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <Field label="Property">
                <select
                  value={form.propertyId}
                  onChange={(event) => updateField("propertyId", event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">No property selected</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Room name" required>
                <Input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  required
                />
              </Field>
              <Field label="Room type">
                <Input
                  value={form.roomType}
                  onChange={(event) => updateField("roomType", event.target.value)}
                />
              </Field>
              <Field label="Bed type">
                <Input
                  value={form.bedType}
                  onChange={(event) => updateField("bedType", event.target.value)}
                />
              </Field>
              <Field label="Max adults">
                <Input
                  type="number"
                  min="0"
                  value={form.maxAdults}
                  onChange={(event) => updateField("maxAdults", event.target.value)}
                />
              </Field>
              <Field label="Max children">
                <Input
                  type="number"
                  min="0"
                  value={form.maxChildren}
                  onChange={(event) => updateField("maxChildren", event.target.value)}
                />
              </Field>
              <Field label="Max occupancy">
                <Input
                  type="number"
                  min="0"
                  value={form.maxOccupancy}
                  onChange={(event) => updateField("maxOccupancy", event.target.value)}
                />
              </Field>
              <Field label="Base price">
                <Input
                  type="number"
                  min="0"
                  value={form.basePrice}
                  onChange={(event) => updateField("basePrice", event.target.value)}
                />
              </Field>
              <Field label="Currency">
                <Input
                  value={form.currency}
                  onChange={(event) => updateField("currency", event.target.value.toUpperCase())}
                  maxLength={3}
                />
              </Field>
              <Field label="Meal plan">
                <Input
                  value={form.mealPlan}
                  onChange={(event) => updateField("mealPlan", event.target.value)}
                />
              </Field>
              <Field label="Cancellation policy">
                <Textarea
                  value={form.cancellationPolicy}
                  onChange={(event) => updateField("cancellationPolicy", event.target.value)}
                />
              </Field>
              <Field label="Amenities">
                <Textarea
                  value={form.amenities}
                  onChange={(event) => updateField("amenities", event.target.value)}
                />
              </Field>
              <Field label="Description" className="md:col-span-2">
                <Textarea
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                />
              </Field>
              <div className="md:col-span-2">
                <Button type="submit">Save local room</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {rooms.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 p-8 text-center">
            <Badge variant="secondary">Empty state</Badge>
            <h3 className="text-xl font-semibold">No local rooms yet</h3>
            <p className="text-sm text-muted-foreground">
              Add a room to continue testing the local setup flow.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rooms.map((room) => (
            <Card key={room.id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold">{room.name}</h3>
                  <Badge variant="outline">Local draft</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {room.roomType || "Room type not set"}
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Occupancy: {room.maxOccupancy || "not set"} | Price:{" "}
                  {room.basePrice || "not set"} {room.currency || ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="mb-2 block">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </Label>
      {children}
    </div>
  );
}
