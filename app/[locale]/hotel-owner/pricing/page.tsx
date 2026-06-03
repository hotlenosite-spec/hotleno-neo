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
  LocalHotelPricing,
  LocalHotelProperty,
  LocalHotelReviewStatus,
  LocalHotelRoom,
  createLocalId,
  readLocalItems,
  writeLocalItems,
} from "@/lib/hotel-owner-local-store";

const emptyPricing = {
  propertyId: "",
  roomId: "",
  ratePlanName: "",
  price: "",
  currency: "USD",
  mealPlan: "",
  cancellationPolicy: "",
  minNights: "1",
  maxNights: "",
  status: "draft" as LocalHotelReviewStatus,
};

export default function HotelOwnerPricingPage() {
  const [properties] = useState<LocalHotelProperty[]>(() =>
    readLocalItems<LocalHotelProperty>(HOTEL_OWNER_LOCAL_KEYS.properties),
  );
  const [rooms] = useState<LocalHotelRoom[]>(() =>
    readLocalItems<LocalHotelRoom>(HOTEL_OWNER_LOCAL_KEYS.rooms),
  );
  const [pricing, setPricing] = useState<LocalHotelPricing[]>(() =>
    readLocalItems<LocalHotelPricing>(HOTEL_OWNER_LOCAL_KEYS.pricing),
  );
  const [form, setForm] = useState(() => ({
    ...emptyPricing,
    propertyId:
      readLocalItems<LocalHotelProperty>(HOTEL_OWNER_LOCAL_KEYS.properties)[0]
        ?.id || "",
    roomId:
      readLocalItems<LocalHotelRoom>(HOTEL_OWNER_LOCAL_KEYS.rooms)[0]?.id ||
      "",
  }));

  const updateField = (field: keyof typeof emptyPricing, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextPricing: LocalHotelPricing = {
      id: createLocalId("pricing"),
      ...form,
      createdAt: new Date().toISOString(),
    };
    const nextPricingItems = [nextPricing, ...pricing];

    setPricing(nextPricingItems);
    writeLocalItems(HOTEL_OWNER_LOCAL_KEYS.pricing, nextPricingItems);
    setForm({
      ...emptyPricing,
      propertyId: form.propertyId,
      roomId: form.roomId,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">الأسعار</h2>
        <p className="text-muted-foreground">
          أنشئ خطط أسعار محلية للتسعير المستقبلي المدعوم بقاعدة البيانات.
        </p>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm text-muted-foreground">
          <Badge variant="secondary">محلي فقط</Badge>
          <span>
            خطط الأسعار هنا غير مرتبطة بالبحث أو الدفع أو المدفوعات المستحقة أو حجز الموردين.
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>إضافة سعر</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Field label="المنشأة">
              <select
                value={form.propertyId}
                onChange={(event) =>
                  updateField("propertyId", event.target.value)
                }
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
            <Field label="الغرفة">
              <select
                value={form.roomId}
                onChange={(event) => updateField("roomId", event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">لم يتم اختيار غرفة</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="اسم خطة السعر" required>
              <Input
                value={form.ratePlanName}
                onChange={(event) =>
                  updateField("ratePlanName", event.target.value)
                }
                required
              />
            </Field>
            <Field label="السعر">
              <Input
                type="number"
                min="0"
                value={form.price}
                onChange={(event) => updateField("price", event.target.value)}
              />
            </Field>
            <Field label="العملة">
              <Input
                value={form.currency}
                onChange={(event) =>
                  updateField("currency", event.target.value.toUpperCase())
                }
                maxLength={3}
              />
            </Field>
            <Field label="خطة الوجبات">
              <Input
                value={form.mealPlan}
                onChange={(event) =>
                  updateField("mealPlan", event.target.value)
                }
              />
            </Field>
            <Field label="الحد الأدنى لليالي">
              <Input
                type="number"
                min="1"
                value={form.minNights}
                onChange={(event) =>
                  updateField("minNights", event.target.value)
                }
              />
            </Field>
            <Field label="الحد الأقصى لليالي">
              <Input
                type="number"
                min="0"
                value={form.maxNights}
                onChange={(event) =>
                  updateField("maxNights", event.target.value)
                }
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
            <Field label="سياسة الإلغاء" className="md:col-span-2 lg:col-span-4">
              <Textarea
                value={form.cancellationPolicy}
                onChange={(event) =>
                  updateField("cancellationPolicy", event.target.value)
                }
              />
            </Field>
            <div className="md:col-span-2 lg:col-span-4">
              <Button type="submit">حفظ السعر محليًا</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {pricing.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 p-8 text-center">
            <Badge variant="secondary">حالة فارغة</Badge>
            <h3 className="text-xl font-semibold">لا توجد أسعار محلية بعد</h3>
            <p className="text-sm text-muted-foreground">
              أضف سعرًا لاختبار كيفية إدارة خطط الأسعار مستقبلًا.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pricing.map((item) => {
            const room = rooms.find((candidate) => candidate.id === item.roomId);
            return (
              <Card key={item.id}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{item.ratePlanName}</h3>
                    <Badge variant="outline">{formatStatus(item.status)}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {room?.name || "غرفة غير مخصصة"} | {item.price || "0"}{" "}
                    {item.currency}
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

function formatStatus(status?: LocalHotelReviewStatus) {
  if (status === "pending_review") return "بانتظار المراجعة";
  if (status === "approved") return "معتمد محليًا";
  if (status === "rejected") return "مرفوض محليًا";
  return "مسودة";
}
