"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Settings01Icon,
  Building02Icon,
  Notification01Icon,
  Money01Icon,
  ShieldUserIcon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const [platformName, setPlatformName] = useState("HOTLENO");
  const [supportEmail, setSupportEmail] = useState("support@hotleno.com");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [bookingPrefix, setBookingPrefix] = useState("HTL");

  const handleSave = () => {
    toast.success("Settings saved locally");
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-orange-100 bg-[linear-gradient(135deg,#0F172A,#F97316)] p-6 text-white shadow-xl shadow-orange-500/10">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black text-[#f4d58d]">
              HOTLENO Platform Settings
            </div>

            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              الإعدادات
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
              إدارة إعدادات المنصة العامة، العملة، الحجوزات، والتنبيهات.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <HeroMiniCard title="Platform" value="OTA" />
            <HeroMiniCard title="Mode" value="Dev" />
            <HeroMiniCard title="Status" value="Active" />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SettingsCard
          title="إعدادات المنصة"
          description="الاسم والبريد والهوية الأساسية"
          icon={Building02Icon}
        >
          <div className="space-y-4">
            <Field label="Platform name">
              <Input
                value={platformName}
                onChange={(event) => setPlatformName(event.target.value)}
                className="h-12 rounded-2xl border-slate-200 bg-slate-50 font-medium"
              />
            </Field>

            <Field label="Support email">
              <Input
                value={supportEmail}
                onChange={(event) => setSupportEmail(event.target.value)}
                className="h-12 rounded-2xl border-slate-200 bg-slate-50 font-medium"
              />
            </Field>

            <Field label="Booking reference prefix">
              <Input
                value={bookingPrefix}
                onChange={(event) => setBookingPrefix(event.target.value)}
                className="h-12 rounded-2xl border-slate-200 bg-slate-50 font-medium"
              />
            </Field>
          </div>
        </SettingsCard>

        <SettingsCard
          title="إعدادات مالية"
          description="العملة الافتراضية وإعدادات الدفع"
          icon={Money01Icon}
        >
          <div className="space-y-4">
            <Field label="Default currency">
              <Input
                value={defaultCurrency}
                onChange={(event) => setDefaultCurrency(event.target.value)}
                className="h-12 rounded-2xl border-slate-200 bg-slate-50 font-medium"
              />
            </Field>

            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-black text-slate-950">Stripe payments</p>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    حالة بوابة الدفع في المنصة
                  </p>
                </div>
                <Badge className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50">
                  Ready
                </Badge>
              </div>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          title="الأمان والصلاحيات"
          description="إعدادات دخول الأدمن والصلاحيات"
          icon={ShieldUserIcon}
        >
          <div className="space-y-3">
            <InfoRow label="Development admin bypass" value="Enabled" />
            <InfoRow label="Admin protection" value="Restore before production" />
            <InfoRow label="Role control" value="Available from Users page" />
          </div>
        </SettingsCard>

        <SettingsCard
          title="التنبيهات"
          description="إعدادات تنبيهات النظام"
          icon={Notification01Icon}
        >
          <div className="space-y-3">
            <InfoRow label="Payment alerts" value="Enabled" />
            <InfoRow label="Booking failure alerts" value="Enabled" />
            <InfoRow label="Supplier API alerts" value="Enabled" />
          </div>
        </SettingsCard>
      </section>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          className="h-12 rounded-2xl bg-[#071b33] px-8 font-bold text-white hover:bg-[#0a2a4f]"
        >
          حفظ الإعدادات
        </Button>
      </div>
    </div>
  );
}

function HeroMiniCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 p-4 text-center backdrop-blur">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-300">{title}</p>
    </div>
  );
}

function SettingsCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof Settings01Icon;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#F97316]">
            <HugeiconsIcon icon={icon} className="h-6 w-6" />
          </div>

          <div>
            <CardTitle className="text-xl font-black text-slate-950">
              {title}
            </CardTitle>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {description}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5">{children}</CardContent>
    </Card>
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
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <span className="text-sm font-bold text-slate-500">{label}</span>
      <span className="text-sm font-black text-slate-950">{value}</span>
    </div>
  );
}
