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
  createLocalId,
  readLocalItems,
  writeLocalItems,
} from "@/lib/hotel-owner-local-store";

const emptyProperty = {
  name: "",
  description: "",
  starRating: "",
  country: "",
  city: "",
  address: "",
  phone: "",
  email: "",
  checkInTime: "",
  checkOutTime: "",
  amenities: "",
  policies: "",
};

export default function HotelOwnerPropertiesPage() {
  const [properties, setProperties] = useState<LocalHotelProperty[]>(() =>
    readLocalItems<LocalHotelProperty>(HOTEL_OWNER_LOCAL_KEYS.properties),
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyProperty);

  const updateField = (field: keyof typeof emptyProperty, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextProperty: LocalHotelProperty = {
      id: createLocalId("property"),
      ...form,
      createdAt: new Date().toISOString(),
    };
    const nextProperties = [nextProperty, ...properties];

    setProperties(nextProperties);
    writeLocalItems(HOTEL_OWNER_LOCAL_KEYS.properties, nextProperties);
    setForm(emptyProperty);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold">Properties</h2>
          <p className="text-muted-foreground">
            Create local draft hotel records for testing the owner workflow.
          </p>
        </div>
        <Button onClick={() => setShowForm((value) => !value)}>
          {showForm ? "Close form" : "Add Property"}
        </Button>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm text-muted-foreground">
          <Badge variant="secondary">Draft/local only</Badge>
          <span>
            These records stay in this browser localStorage and are not saved to MongoDB or shown in customer search.
          </span>
        </CardContent>
      </Card>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add Property</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <Field label="Name" required>
                <Input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  required
                />
              </Field>
              <Field label="Star rating">
                <Input
                  type="number"
                  min="0"
                  max="5"
                  value={form.starRating}
                  onChange={(event) => updateField("starRating", event.target.value)}
                />
              </Field>
              <Field label="Country">
                <Input
                  value={form.country}
                  onChange={(event) => updateField("country", event.target.value)}
                />
              </Field>
              <Field label="City">
                <Input
                  value={form.city}
                  onChange={(event) => updateField("city", event.target.value)}
                />
              </Field>
              <Field label="Address">
                <Input
                  value={form.address}
                  onChange={(event) => updateField("address", event.target.value)}
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                />
              </Field>
              <Field label="Check-in time">
                <Input
                  type="time"
                  value={form.checkInTime}
                  onChange={(event) => updateField("checkInTime", event.target.value)}
                />
              </Field>
              <Field label="Check-out time">
                <Input
                  type="time"
                  value={form.checkOutTime}
                  onChange={(event) => updateField("checkOutTime", event.target.value)}
                />
              </Field>
              <Field label="Amenities">
                <Textarea
                  value={form.amenities}
                  onChange={(event) => updateField("amenities", event.target.value)}
                  placeholder="Pool, Wi-Fi, parking"
                />
              </Field>
              <Field label="Policies">
                <Textarea
                  value={form.policies}
                  onChange={(event) => updateField("policies", event.target.value)}
                />
              </Field>
              <Field label="Description" className="md:col-span-2">
                <Textarea
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                />
              </Field>
              <div className="md:col-span-2">
                <Button type="submit">Save local draft</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {properties.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 p-8 text-center">
            <Badge variant="secondary">Empty state</Badge>
            <h3 className="text-xl font-semibold">No local properties yet</h3>
            <p className="text-sm text-muted-foreground">
              Add a property to test the local Hotel Owner Portal experience.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {properties.map((property) => (
            <Card key={property.id}>
              <CardContent className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{property.name}</h3>
                      <Badge variant="outline">Local draft</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[property.city, property.country].filter(Boolean).join(", ") || "Location not set"}
                    </p>
                    {property.description && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        {property.description}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Not published
                  </p>
                </div>
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
