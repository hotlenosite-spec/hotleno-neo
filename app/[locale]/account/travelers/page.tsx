"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Traveler = {
  _id: string;
  title?: string;
  firstName: string;
  lastName: string;
  gender?: string;
  dateOfBirth?: string;
  birthDate?: string;
  nationality?: string;
  documentType?: string;
  documentNumber?: string;
  passportNumber?: string;
  nationalId?: string;
  passportExpiryDate?: string;
  phone?: string;
  email?: string;
};

export default function AccountTravelersPage() {
  const t = useTranslations("account");
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: "",
    firstName: "",
    lastName: "",
    gender: "",
    dateOfBirth: "",
    nationality: "",
    documentType: "passport",
    documentNumber: "",
    passportNumber: "",
    nationalId: "",
    passportExpiryDate: "",
    phone: "",
    email: "",
  });

  const loadTravelers = async () => {
    await Promise.resolve();
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    fetch("/api/account/travelers", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then((data) => setTravelers(data.travelers || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTravelers();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const token = localStorage.getItem("token");
    if (!token || !form.firstName || !form.lastName) return;

    await fetch("/api/account/travelers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });
    setForm({
      title: "",
      firstName: "",
      lastName: "",
      gender: "",
      dateOfBirth: "",
      nationality: "",
      documentType: "passport",
      documentNumber: "",
      passportNumber: "",
      nationalId: "",
      passportExpiryDate: "",
      phone: "",
      email: "",
    });
    void loadTravelers();
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">{t("travelers.eyebrow")}</p>
        <h1 className="text-3xl font-bold">{t("travelers.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("travelers.description")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("travelers.addTraveler")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submit}>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label={t("travelers.titleField")} value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
                <Field label={t("travelers.gender")} value={form.gender} onChange={(value) => setForm({ ...form, gender: value })} />
                <Field label={t("travelers.firstName")} value={form.firstName} onChange={(value) => setForm({ ...form, firstName: value })} required />
                <Field label={t("travelers.lastName")} value={form.lastName} onChange={(value) => setForm({ ...form, lastName: value })} required />
                <Field label={t("travelers.dateOfBirth")} type="date" value={form.dateOfBirth} onChange={(value) => setForm({ ...form, dateOfBirth: value })} />
                <Field label={t("travelers.nationality")} value={form.nationality} onChange={(value) => setForm({ ...form, nationality: value })} />
                <Field label={t("travelers.documentType")} value={form.documentType} onChange={(value) => setForm({ ...form, documentType: value })} />
                <Field label={t("travelers.documentNumber")} value={form.documentNumber} onChange={(value) => setForm({ ...form, documentNumber: value })} />
                <Field label={t("travelers.passportNumber")} value={form.passportNumber} onChange={(value) => setForm({ ...form, passportNumber: value })} />
                <Field label={t("travelers.nationalId")} value={form.nationalId} onChange={(value) => setForm({ ...form, nationalId: value })} />
                <Field label={t("travelers.passportExpiryDate")} type="date" value={form.passportExpiryDate} onChange={(value) => setForm({ ...form, passportExpiryDate: value })} />
                <Field label={t("travelers.phone")} value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
                <Field label={t("travelers.email")} type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
              </div>
              <Button type="submit">{t("actions.save")}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("travelers.savedTravelers")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">{t("loading")}</p>
            ) : travelers.length === 0 ? (
              <div className="rounded-md bg-muted p-8 text-center">
                <h2 className="font-semibold">{t("travelers.emptyTitle")}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{t("travelers.empty")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {travelers.map((traveler) => (
                  <div key={traveler._id} className="rounded-md border p-4">
                    <p className="font-semibold">
                      {[traveler.title, traveler.firstName, traveler.lastName].filter(Boolean).join(" ")}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {traveler.documentType || "-"} · {traveler.documentNumber || traveler.passportNumber || traveler.nationalId || "-"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {traveler.gender || "-"} · {traveler.birthDate || "-"} · {traveler.nationality || "-"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
