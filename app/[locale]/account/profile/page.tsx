"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Profile = {
  name: string;
  email: string;
  phone?: string;
  nationality?: string;
  birthDate?: string;
  nationalId?: string;
  passportNumber?: string;
  passportExpiryDate?: string;
  accountType?: string;
  role?: string;
  isActive?: boolean;
  createdAt?: string;
};

export default function AccountProfilePage() {
  const t = useTranslations("account");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    nationality: "",
    birthDate: "",
    nationalId: "",
    passportNumber: "",
    passportExpiryDate: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      await Promise.resolve();
      const token = localStorage.getItem("token");
      if (!token) {
        if (active) setLoading(false);
        return;
      }

      fetch("/api/user/profile", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((response) => response.json())
        .then((data) => {
          if (active) {
            const user = data.user || null;
            setProfile(user);
            setForm({
              name: user?.name || "",
              phone: user?.phone || "",
              nationality: user?.nationality || "",
              birthDate: toInputDate(user?.birthDate),
              nationalId: user?.nationalId || "",
              passportNumber: user?.passportNumber || "",
              passportExpiryDate: toInputDate(user?.passportExpiryDate),
            });
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const saveProfile = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setSaving(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => null);
      if (response.ok) setProfile(data.user || profile);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-lg border p-6">{t("loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">{t("profile.eyebrow")}</p>
        <h1 className="text-3xl font-bold">{t("profile.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("profile.description")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("profile.accountInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <EditableField label={t("profile.name")} value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
          <Info label={t("profile.email")} value={profile?.email || "-"} />
          <EditableField label={t("profile.phone")} value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
          <EditableField label={t("profile.nationality")} value={form.nationality} onChange={(value) => setForm({ ...form, nationality: value })} />
          <EditableField label={t("profile.birthDate")} type="date" value={form.birthDate} onChange={(value) => setForm({ ...form, birthDate: value })} />
          <EditableField label={t("profile.nationalId")} value={form.nationalId} onChange={(value) => setForm({ ...form, nationalId: value })} />
          <EditableField label={t("profile.passportNumber")} value={form.passportNumber} onChange={(value) => setForm({ ...form, passportNumber: value })} />
          <EditableField label={t("profile.passportExpiryDate")} type="date" value={form.passportExpiryDate} onChange={(value) => setForm({ ...form, passportExpiryDate: value })} />
          <Info label={t("profile.accountType")} value={profile?.accountType || "-"} />
          <Info label={t("profile.createdAt")} value={formatDate(profile?.createdAt)} />
          <div className="rounded-md border p-4">
            <p className="text-sm text-muted-foreground">{t("profile.status")}</p>
            <Badge className="mt-2" variant={profile?.isActive === false ? "destructive" : "secondary"}>
              {profile?.isActive === false ? t("status.inactive") : t("status.active")}
            </Badge>
          </div>
          <div className="md:col-span-2">
            <Button onClick={saveProfile} disabled={saving}>
              {saving ? t("actions.saving") : t("actions.save")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EditableField({
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
    <div className="rounded-md border p-4">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <Input className="mt-2" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

function toInputDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}
