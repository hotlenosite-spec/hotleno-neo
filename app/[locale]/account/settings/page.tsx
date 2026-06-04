"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AccountSettingsPage() {
  const t = useTranslations("account");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">{t("settings.eyebrow")}</p>
        <h1 className="text-3xl font-bold">{t("settings.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("settings.description")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.preferences")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-muted p-6 text-sm text-muted-foreground">
            {t("settings.readOnly")}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
