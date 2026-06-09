"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TransferVoucher } from "@/components/transfers/transfer-voucher";
import type {
  TransferBookingResponse,
  TransferOption,
  TransferOptionalExtra,
  TransferSearchRequest,
} from "@/types/transfers";

type CheckoutPayload = {
  option: TransferOption;
  request: TransferSearchRequest;
  selectedAt: string;
};

type BookApiResponse = {
  success: boolean;
  data?: TransferBookingResponse;
  error?: string;
  message?: string;
};

type ExtraSelection = Record<string, number>;

function getCancellationText(option: TransferOption) {
  const policy = option.cancellationPolicies?.[0];
  if (!policy) return "سياسة الإلغاء غير متوفرة من المورد";
  if (policy.amount !== undefined && policy.currency) {
    return `رسوم ${policy.amount} ${policy.currency} ابتداءً من ${policy.from || "وقت غير محدد"}`;
  }
  return policy.description || "سياسة الإلغاء متوفرة ضمن بيانات المورد";
}

function needsTransportDetails(option: TransferOption) {
  return (
    option.pickup.codeType === "IATA" ||
    option.dropoff.codeType === "IATA" ||
    option.pickup.codeType === "PORT" ||
    option.dropoff.codeType === "PORT" ||
    option.pickup.codeType === "STATION" ||
    option.dropoff.codeType === "STATION"
  );
}

function getDetailDefaults(option: TransferOption) {
  if (option.pickup.codeType === "PORT" || option.dropoff.codeType === "PORT") {
    return { type: "SHIP", direction: "ARRIVAL" };
  }
  if (option.pickup.codeType === "STATION" || option.dropoff.codeType === "STATION") {
    return { type: "TRAIN", direction: "ARRIVAL" };
  }
  return { type: "FLIGHT", direction: option.dropoff.codeType === "IATA" ? "DEPARTURE" : "ARRIVAL" };
}

function isDepartureOption(option: TransferOption) {
  return (
    option.dropoff.codeType === "IATA" ||
    option.dropoff.codeType === "PORT" ||
    option.dropoff.codeType === "STATION"
  );
}

function getPickupTimeDisplay(option: TransferOption) {
  if (option.mustCheckPickupTime && isDepartureOption(option)) {
    return "To be confirmed on Checkpickup.com";
  }

  return option.pickupDateTime;
}

function buildPassengers({
  firstName,
  lastName,
  adults,
  children,
  infants,
}: {
  firstName: string;
  lastName: string;
  adults: number;
  children: number;
  infants: number;
}) {
  return [
    ...Array.from({ length: adults }).map((_, index) => ({
      title: "Mr" as const,
      name: index === 0 ? firstName : `ADULT${index + 1}`,
      surname: lastName,
      age: 30,
      type: "AD" as const,
    })),
    ...Array.from({ length: children }).map((_, index) => ({
      title: "Mr" as const,
      name: `CHILD${index + 1}`,
      surname: lastName,
      age: 8,
      type: "CH" as const,
    })),
    ...Array.from({ length: infants }).map((_, index) => ({
      title: "Mr" as const,
      name: `INFANT${index + 1}`,
      surname: lastName,
      age: 1,
      type: "IN" as const,
    })),
  ];
}

export default function TransfersCheckoutPage() {
  const locale = useLocale();
  const router = useRouter();
  const [payload, setPayload] = useState<CheckoutPayload | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [remark, setRemark] = useState("");
  const [detailType, setDetailType] = useState("FLIGHT");
  const [detailDirection, setDetailDirection] = useState("DEPARTURE");
  const [detailCode, setDetailCode] = useState("");
  const [detailCompany, setDetailCompany] = useState("");
  const [extras, setExtras] = useState<ExtraSelection>({});
  const [message, setMessage] = useState("");
  const [booking, setBooking] = useState<TransferBookingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const canConfirmTestBooking = process.env.NODE_ENV !== "production";

  useEffect(() => {
    const raw = sessionStorage.getItem("hotleno-transfer-checkout");
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as CheckoutPayload;
      setPayload(parsed);
      const defaults = getDetailDefaults(parsed.option);
      setDetailType(defaults.type);
      setDetailDirection(defaults.direction);
    } catch {
      setMessage("تعذر قراءة الخدمة المختارة. يرجى الرجوع إلى صفحة النقل والبحث مرة أخرى.");
    }
  }, []);

  const selectedExtras = useMemo(() => {
    if (!payload?.option.optionalExtras?.length) return [];

    return payload.option.optionalExtras
      .map((extra) => {
        const units = extras[extra.code] || 0;
        if (units <= 0) return null;
        return { ...extra, units };
      })
      .filter(Boolean) as TransferOptionalExtra[];
  }, [extras, payload?.option.optionalExtras]);

  async function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canConfirmTestBooking) {
      setMessage("تأكيد حجز Hotelbeds Transfers في الإنتاج يجب أن يتم بعد نجاح الدفع فقط.");
      return;
    }

    if (!payload?.option.rateKey) {
      setMessage("انتهت صلاحية الخدمة المختارة أو لا يوجد rateKey صالح.");
      return;
    }

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
      setMessage("يرجى تعبئة بيانات العميل الأساسية.");
      return;
    }

    if (needsTransportDetails(payload.option) && !detailCode.trim()) {
      setMessage("يرجى تعبئة بيانات الرحلة المطلوبة من المورد قبل تأكيد الحجز.");
      return;
    }

    setLoading(true);
    setMessage("");

    const transferDetails = detailCode.trim()
      ? [
          {
            type: detailType,
            direction: detailDirection,
            code: detailCode.trim(),
            companyName: detailCompany.trim() || "Customer provided",
          },
        ]
      : undefined;

    try {
      const response = await fetch("/api/transfers/book", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          language: locale === "ar" ? "ar" : "en",
          clientReference: `HOTLENO-${Date.now()}`,
          holder: {
            name: firstName.trim(),
            surname: lastName.trim(),
            email: email.trim(),
            phone: phone.trim(),
          },
          passengers: buildPassengers({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            adults: payload.request.passengers.adults,
            children: payload.request.passengers.children || 0,
            infants: payload.request.passengers.infants || 0,
          }),
          services: [
            {
              rateKey: payload.option.rateKey,
              transferDetails,
              ...(selectedExtras.length ? { extras: selectedExtras } : {}),
            },
          ],
          metadata: {
            source: "customer-transfer-checkout",
            remark,
          },
        }),
      });

      const result = (await response.json()) as BookApiResponse;

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message || result.error || "فشل تأكيد المورد.");
      }

      setBooking(result.data);
      sessionStorage.setItem(
        `hotleno-transfer-booking-${result.data.bookingReference}`,
        JSON.stringify(result.data),
      );

      if (result.data.bookingReference && result.data.status === "confirmed") {
        router.push(`/${locale}/transfers/confirmation/${result.data.bookingReference}`);
      } else {
        setMessage(result.data.message || "الحجز غير مفعل في هذه البيئة.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "فشل تأكيد الحجز.");
    } finally {
      setLoading(false);
    }
  }

  if (!payload) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] px-4 py-10">
        <Card className="mx-auto max-w-3xl rounded-[2rem]">
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-black">لا توجد خدمة نقل مختارة</h1>
            <p className="mt-3 text-sm text-slate-500">
              يرجى الرجوع إلى صفحة النقل واختيار خدمة من نتائج Hotelbeds Transfers.
            </p>
            <Button className="mt-6 rounded-2xl bg-[#F97316] text-white" onClick={() => router.push(`/${locale}/transfers`)}>
              العودة إلى البحث
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const option = payload.option;

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 text-[#0F172A]">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_420px]">
        <section className="space-y-6">
          <Card className="rounded-[2rem]">
            <CardHeader>
              <Badge className="w-fit bg-orange-50 text-[#F97316] hover:bg-orange-50">
                Supplier: Hotelbeds Transfers
              </Badge>
              <CardTitle className="text-2xl font-black">تفاصيل خدمة النقل</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Info label="الخدمة" value={option.vehicle.name || option.vehicle.type} />
                <Info label="السعر" value={`${option.price.amount.toFixed(2)} ${option.price.currency}`} />
                <Info label="من" value={`${option.pickup.name} (${option.pickup.codeType}/${option.pickup.code})`} />
                <Info label="إلى" value={`${option.dropoff.name} (${option.dropoff.codeType}/${option.dropoff.code})`} />
                <Info label="وقت الرحلة" value={option.pickupDateTime} />
                <Info label="وقت الالتقاط" value={getPickupTimeDisplay(option)} />
                <Info label="سياسة الإلغاء" value={getCancellationText(option)} />
              </div>

              {option.mustCheckPickupTime ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                  وقت الالتقاط يحتاج تأكيد من المورد. يرجى مراجعة تعليمات checkPickup قبل موعد الرحلة.
                  {option.checkPickup?.url ? (
                    <span className="mt-1 block">
                      يمكن تأكيد وقت الالتقاط من خلال {option.checkPickup.url}
                      {option.checkPickup.hoursBeforeConsulting
                        ? ` قبل الرحلة بـ ${option.checkPickup.hoursBeforeConsulting} ساعة`
                        : ""}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem]">
            <CardHeader>
              <CardTitle className="text-xl font-black">بيانات العميل والحجز</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleConfirm}>
                <Field label="الاسم الأول" value={firstName} onChange={setFirstName} />
                <Field label="اسم العائلة" value={lastName} onChange={setLastName} />
                <Field label="البريد الإلكتروني" value={email} onChange={setEmail} type="email" />
                <Field label="رقم الجوال" value={phone} onChange={setPhone} />

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">نوع بيانات الرحلة</label>
                  <Select value={detailType} onValueChange={setDetailType}>
                    <SelectTrigger className="h-12 rounded-2xl bg-slate-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FLIGHT">Flight</SelectItem>
                      <SelectItem value="TRAIN">Train</SelectItem>
                      <SelectItem value="SHIP">Vessel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">الاتجاه</label>
                  <Select value={detailDirection} onValueChange={setDetailDirection}>
                    <SelectTrigger className="h-12 rounded-2xl bg-slate-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARRIVAL">Arrival</SelectItem>
                      <SelectItem value="DEPARTURE">Departure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Field label="رقم الرحلة / القطار / السفينة" value={detailCode} onChange={setDetailCode} />
                <Field label="اسم الشركة" value={detailCompany} onChange={setDetailCompany} />

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700">ملاحظات العميل</label>
                  <Input value={remark} onChange={(event) => setRemark(event.target.value)} className="h-12 rounded-2xl bg-slate-50" />
                </div>

                {option.optionalExtras?.length ? (
                  <div className="space-y-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 md:col-span-2">
                    <p className="font-black text-emerald-800">إضافات اختيارية</p>
                    {option.optionalExtras.map((extra) => (
                      <div key={extra.code} className="grid gap-3 rounded-2xl bg-white p-3 md:grid-cols-[1fr_120px]">
                        <div>
                          <p className="font-bold">{extra.name || extra.description || extra.code}</p>
                          <p className="text-sm text-slate-500">
                            {extra.price ? `${extra.price.amount} ${extra.price.currency}` : "السعر حسب المورد"}
                          </p>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          value={extras[extra.code] || 0}
                          onChange={(event) =>
                            setExtras((prev) => ({
                              ...prev,
                              [extra.code]: Number(event.target.value),
                            }))
                          }
                          className="h-11 rounded-xl"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}

                {message ? (
                  <p className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-800 md:col-span-2">
                    {message}
                  </p>
                ) : null}

                <div className="md:col-span-2">
                  <Button disabled={loading || !canConfirmTestBooking} className="h-12 rounded-2xl bg-[#F97316] px-8 font-black text-white hover:bg-[#EA580C]">
                    {loading ? "جاري التأكيد..." : canConfirmTestBooking ? "Confirm Test Booking" : "متابعة للدفع"}
                  </Button>
                  <p className="mt-2 text-xs font-bold text-slate-500">
                    لا يتم تأكيد الحجز إلا عند الضغط على هذا الزر. في الإنتاج يجب ربط التأكيد بنجاح الدفع قبل استدعاء المورد.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-4">
          <Card className="rounded-[2rem]">
            <CardContent className="p-5">
              <h2 className="text-lg font-black">ملخص الخدمة</h2>
              <p className="mt-3 text-sm text-slate-500">
                لا يتم عرض raw response أو rateKey كامل للعميل. يتم الاحتفاظ به داخليًا لإرسال الحجز للمورد.
              </p>
              <p className="mt-4 text-2xl font-black text-[#F97316]">
                {option.price.amount.toFixed(2)} {option.price.currency}
              </p>
            </CardContent>
          </Card>

          {booking?.voucher ? <TransferVoucher voucher={booking.voucher} /> : null}
        </aside>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-slate-700">{label}</label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} type={type} className="h-12 rounded-2xl bg-slate-50" />
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-normal text-slate-500">
        {label}
      </p>
      <p className="mt-2 font-black">{value || "-"}</p>
    </div>
  );
}
