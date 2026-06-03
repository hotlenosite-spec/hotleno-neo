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
  LocalHotelReviewStatus,
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
  status: "draft" as LocalHotelReviewStatus,
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
          <h2 className="text-3xl font-bold">الغرف</h2>
          <p className="text-muted-foreground">
            أنشئ مسودات غرف محلية لاختبار شريك الفندق.
          </p>
        </div>
        <Button onClick={() => setShowForm((value) => !value)}>
          {showForm ? "إغلاق النموذج" : "إضافة غرفة"}
        </Button>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm text-muted-foreground">
          <Badge variant="secondary">محلي فقط</Badge>
          <span>يتم حفظ الغرف في هذا المتصفح فقط ولا تظهر في الحجز أو البحث.</span>
        </CardContent>
      </Card>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>إضافة غرفة</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <Field label="المنشأة">
                <select
                  value={form.propertyId}
                  onChange={(event) => updateField("propertyId", event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">لم يتم اختيار منشأة</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="اسم الغرفة" required>
                <Input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  required
                />
              </Field>
              <Field label="نوع الغرفة">
                <Input
                  value={form.roomType}
                  onChange={(event) => updateField("roomType", event.target.value)}
                />
              </Field>
              <Field label="نوع السرير">
                <Input
                  value={form.bedType}
                  onChange={(event) => updateField("bedType", event.target.value)}
                />
              </Field>
              <Field label="الحد الأقصى للبالغين">
                <Input
                  type="number"
                  min="0"
                  value={form.maxAdults}
                  onChange={(event) => updateField("maxAdults", event.target.value)}
                />
              </Field>
              <Field label="الحد الأقصى للأطفال">
                <Input
                  type="number"
                  min="0"
                  value={form.maxChildren}
                  onChange={(event) => updateField("maxChildren", event.target.value)}
                />
              </Field>
              <Field label="الحد الأقصى للإشغال">
                <Input
                  type="number"
                  min="0"
                  value={form.maxOccupancy}
                  onChange={(event) => updateField("maxOccupancy", event.target.value)}
                />
              </Field>
              <Field label="السعر الأساسي">
                <Input
                  type="number"
                  min="0"
                  value={form.basePrice}
                  onChange={(event) => updateField("basePrice", event.target.value)}
                />
              </Field>
              <Field label="العملة">
                <Input
                  value={form.currency}
                  onChange={(event) => updateField("currency", event.target.value.toUpperCase())}
                  maxLength={3}
                />
              </Field>
              <Field label="خطة الوجبات">
                <Input
                  value={form.mealPlan}
                  onChange={(event) => updateField("mealPlan", event.target.value)}
                />
              </Field>
              <Field label="سياسة الإلغاء">
                <Textarea
                  value={form.cancellationPolicy}
                  onChange={(event) => updateField("cancellationPolicy", event.target.value)}
                />
              </Field>
              <Field label="المرافق">
                <Textarea
                  value={form.amenities}
                  onChange={(event) => updateField("amenities", event.target.value)}
                />
              </Field>
              <Field label="الحالة">
                <select
                  value={form.status}
                  onChange={(event) =>
                    updateField(
                      "status",
                      event.target.value as LocalHotelReviewStatus,
                    )
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="draft">مسودة</option>
                  <option value="pending_review">بانتظار المراجعة</option>
                  <option value="approved">معتمد محليًا</option>
                  <option value="rejected">مرفوض محليًا</option>
                </select>
              </Field>
              <Field label="الوصف" className="md:col-span-2">
                <Textarea
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                />
              </Field>
              <div className="md:col-span-2">
                <Button type="submit">حفظ الغرفة محليًا</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {rooms.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 p-8 text-center">
            <Badge variant="secondary">حالة فارغة</Badge>
            <h3 className="text-xl font-semibold">لا توجد غرف محلية بعد</h3>
            <p className="text-sm text-muted-foreground">
              أضف غرفة لمتابعة اختبار مسار الإعداد المحلي.
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
                  <Badge variant="outline">{formatStatus(room.status)}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {room.roomType || "لم يتم تحديد نوع الغرفة"}
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  الإشغال: {room.maxOccupancy || "غير محدد"} | السعر:{" "}
                  {room.basePrice || "غير محدد"} {room.currency || ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function formatStatus(status?: LocalHotelReviewStatus) {
  if (status === "pending_review") return "بانتظار المراجعة";
  if (status === "approved") return "معتمد محليًا";
  if (status === "rejected") return "مرفوض محليًا";
  return "مسودة";
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
