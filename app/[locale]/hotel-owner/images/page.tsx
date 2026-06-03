"use client";

import { FormEvent, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  HOTEL_OWNER_LOCAL_KEYS,
  LocalHotelImage,
  LocalHotelProperty,
  LocalHotelReviewStatus,
  LocalHotelRoom,
  createLocalId,
  readLocalItems,
  writeLocalItems,
} from "@/lib/hotel-owner-local-store";

const emptyImage = {
  propertyId: "",
  roomId: "",
  imageUrl: "",
  fileName: "",
  caption: "",
  status: "draft" as LocalHotelReviewStatus,
};

export default function HotelOwnerImagesPage() {
  const [properties] = useState<LocalHotelProperty[]>(() =>
    readLocalItems<LocalHotelProperty>(HOTEL_OWNER_LOCAL_KEYS.properties),
  );
  const [rooms] = useState<LocalHotelRoom[]>(() =>
    readLocalItems<LocalHotelRoom>(HOTEL_OWNER_LOCAL_KEYS.rooms),
  );
  const [images, setImages] = useState<LocalHotelImage[]>(() =>
    readLocalItems<LocalHotelImage>(HOTEL_OWNER_LOCAL_KEYS.images),
  );
  const [form, setForm] = useState(() => ({
    ...emptyImage,
    propertyId:
      readLocalItems<LocalHotelProperty>(HOTEL_OWNER_LOCAL_KEYS.properties)[0]
        ?.id || "",
  }));

  const updateField = (field: keyof typeof emptyImage, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextImage: LocalHotelImage = {
      id: createLocalId("image"),
      ...form,
      createdAt: new Date().toISOString(),
    };
    const nextImages = [nextImage, ...images];

    setImages(nextImages);
    writeLocalItems(HOTEL_OWNER_LOCAL_KEYS.images, nextImages);
    setForm({
      ...emptyImage,
      propertyId: form.propertyId,
      roomId: form.roomId,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">رفع الصور</h2>
        <p className="text-muted-foreground">
          جهّز مراجع صور محلية لمعارض المنشآت والغرف المستقبلية.
        </p>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm text-muted-foreground">
          <Badge variant="secondary">بيانات صور محلية</Badge>
          <span>
            لا يتم رفع الملفات إلى الخادم. خزّن رابطًا مؤقتًا أو اسم ملف لاختبار الواجهة فقط.
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>إضافة مرجع صورة</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
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
            <Field label="الغرفة اختيارية">
              <select
                value={form.roomId}
                onChange={(event) => updateField("roomId", event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">صورة على مستوى المنشأة</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="رابط الصورة">
              <Input
                value={form.imageUrl}
                onChange={(event) =>
                  updateField("imageUrl", event.target.value)
                }
                placeholder="https://example.com/hotel.jpg"
              />
            </Field>
            <Field label="اسم الملف المحلي">
              <Input
                value={form.fileName}
                onChange={(event) =>
                  updateField("fileName", event.target.value)
                }
                placeholder="lobby-photo.jpg"
              />
            </Field>
            <Field label="التسمية">
              <Input
                value={form.caption}
                onChange={(event) => updateField("caption", event.target.value)}
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
            <div className="md:col-span-2">
              <Button type="submit">حفظ مرجع الصورة محليًا</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {images.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 p-8 text-center">
            <Badge variant="secondary">حالة فارغة</Badge>
            <h3 className="text-xl font-semibold">لا توجد صور محلية بعد</h3>
            <p className="text-sm text-muted-foreground">
              أضف مرجع صورة لمعاينة مسار المعرض المستقبلي.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {images.map((image) => (
            <Card key={image.id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">
                    {image.caption || image.fileName || "مرجع صورة"}
                  </h3>
                  <Badge variant="outline">{formatStatus(image.status)}</Badge>
                </div>
                <p className="mt-2 break-all text-sm text-muted-foreground">
                  {image.imageUrl || image.fileName || "لم يتم تحديد رابط أو اسم ملف"}
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

function formatStatus(status?: LocalHotelReviewStatus) {
  if (status === "pending_review") return "بانتظار المراجعة";
  if (status === "approved") return "معتمد محليًا";
  if (status === "rejected") return "مرفوض محليًا";
  return "مسودة";
}
