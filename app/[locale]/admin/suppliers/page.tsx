"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

type SupplierSetting = {
  supplier: "tbo" | "hotelbeds" | "travellanda" | "mock";
  enabled: boolean;
  environment: string;
  updatedAt?: string;
  updatedBy?: string | null;
};

const LABELS: Record<SupplierSetting["supplier"], string> = {
  tbo: "TBO",
  hotelbeds: "Hotelbeds",
  travellanda: "Travellanda",
  mock: "Mock",
};

export default function SuppliersControlPage() {
  const [settings, setSettings] = useState<SupplierSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadSettings() {
    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("token") || "";
      const response = await fetch("/api/admin/suppliers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load suppliers");
      setSettings(data.settings || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load suppliers");
    } finally {
      setLoading(false);
    }
  }

  async function updateSetting(setting: SupplierSetting, enabled: boolean) {
    setMessage("");

    try {
      const token = localStorage.getItem("token") || "";
      const response = await fetch("/api/admin/suppliers", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supplier: setting.supplier,
          enabled,
          environment: setting.environment,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update supplier");
      setSettings(data.settings || []);
      setMessage("Supplier settings updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update supplier");
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <Badge className="mb-3 bg-[#F97316] text-white">Suppliers Control</Badge>
        <h1 className="text-3xl font-black text-[#0F172A]">Suppliers Control</h1>
        <p className="mt-2 text-sm font-bold text-slate-500">
          تشغيل وإيقاف موردي البحث من MongoDB. Mock يتم تعطيله دائمًا في production.
        </p>
      </div>

      {message ? (
        <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm font-bold text-orange-800">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading
          ? [0, 1, 2, 3].map((item) => (
              <Card key={item} className="rounded-[2rem]">
                <CardContent className="h-48 p-6 text-sm font-bold text-slate-400">
                  Loading...
                </CardContent>
              </Card>
            ))
          : settings.map((setting) => (
              <Card key={setting.supplier} className="rounded-[2rem]">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-xl font-black">
                    <span>{LABELS[setting.supplier]}</span>
                    <Badge
                      className={
                        setting.enabled
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 text-slate-700"
                      }
                    >
                      {setting.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl bg-[#F8FAFC] p-4">
                    <p className="text-xs font-black uppercase text-slate-500">
                      Environment
                    </p>
                    <p className="mt-1 text-base font-black text-[#0F172A]">
                      {setting.environment}
                    </p>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                    <span className="text-sm font-black text-slate-600">
                      تشغيل المورد
                    </span>
                    <Switch
                      checked={setting.enabled}
                      disabled={
                        setting.supplier === "mock" &&
                        process.env.NODE_ENV === "production"
                      }
                      onCheckedChange={(checked) => updateSetting(setting, checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      <Button variant="outline" onClick={loadSettings}>
        Refresh
      </Button>
    </div>
  );
}
