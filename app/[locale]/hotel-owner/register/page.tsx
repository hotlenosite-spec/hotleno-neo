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
  LocalHotelPartnerDraft,
  LocalHotelReviewStatus,
  createLocalId,
  readLocalItems,
  writeLocalItems,
} from "@/lib/hotel-owner-local-store";

const emptyRegistration = {
  companyName: "",
  legalName: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  country: "",
  city: "",
  notes: "",
  status: "draft" as LocalHotelReviewStatus,
};

export default function HotelOwnerRegisterPage() {
  const [registrations, setRegistrations] = useState<LocalHotelPartnerDraft[]>(
    () =>
      readLocalItems<LocalHotelPartnerDraft>(
        HOTEL_OWNER_LOCAL_KEYS.registrations,
      ),
  );
  const [form, setForm] = useState(emptyRegistration);

  const updateField = (
    field: keyof typeof emptyRegistration,
    value: string,
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextRegistration: LocalHotelPartnerDraft = {
      id: createLocalId("hotel-partner"),
      ...form,
      status: "pending_review",
      createdAt: new Date().toISOString(),
    };
    const nextRegistrations = [nextRegistration, ...registrations];

    setRegistrations(nextRegistrations);
    writeLocalItems(
      HOTEL_OWNER_LOCAL_KEYS.registrations,
      nextRegistrations,
    );
    setForm(emptyRegistration);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">تسجيل فندق</h2>
        <p className="text-muted-foreground">
          جهّز تسجيل شريك فندقي محلي قبل تفعيل الانضمام الإنتاجي.
        </p>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm text-muted-foreground">
          <Badge variant="secondary">مسودة مراجعة محلية</Badge>
          <span>
            يتم حفظ الطلبات في هذا المتصفح فقط ولا تنشئ شريكًا فندقيًا حقيقيًا.
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>تفاصيل الشريك الفندقي</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <Field label="اسم الشركة" required>
              <Input
                value={form.companyName}
                onChange={(event) =>
                  updateField("companyName", event.target.value)
                }
                required
              />
            </Field>
            <Field label="الاسم القانوني">
              <Input
                value={form.legalName}
                onChange={(event) =>
                  updateField("legalName", event.target.value)
                }
              />
            </Field>
            <Field label="اسم جهة التواصل">
              <Input
                value={form.contactName}
                onChange={(event) =>
                  updateField("contactName", event.target.value)
                }
              />
            </Field>
            <Field label="بريد جهة التواصل">
              <Input
                type="email"
                value={form.contactEmail}
                onChange={(event) =>
                  updateField("contactEmail", event.target.value)
                }
              />
            </Field>
            <Field label="هاتف جهة التواصل">
              <Input
                value={form.contactPhone}
                onChange={(event) =>
                  updateField("contactPhone", event.target.value)
                }
              />
            </Field>
            <Field label="الدولة">
              <Input
                value={form.country}
                onChange={(event) => updateField("country", event.target.value)}
              />
            </Field>
            <Field label="المدينة">
              <Input
                value={form.city}
                onChange={(event) => updateField("city", event.target.value)}
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
              </select>
            </Field>
            <Field label="ملاحظات" className="md:col-span-2">
              <Textarea
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
              />
            </Field>
            <div className="md:col-span-2">
              <Button type="submit">إرسال مسودة مراجعة محلية</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>التسجيلات المحلية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {registrations.length === 0 ? (
            <div className="py-8 text-center">
              <Badge variant="secondary">فارغ</Badge>
              <p className="mt-3 text-sm text-muted-foreground">
                لم يتم تجهيز أي تسجيل شريك فندقي محلي بعد.
              </p>
            </div>
          ) : (
            registrations.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border bg-muted/20 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{item.companyName}</h3>
                  <Badge variant="outline">بانتظار المراجعة</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {[item.city, item.country].filter(Boolean).join(", ") ||
                    "لم يتم تحديد الموقع"}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
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
