"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Wallet = {
  balance: number;
  currency: string;
  refunds: number;
  credits: number;
  transactions: Array<{
    _id?: string;
    type?: string;
    amount?: number;
    currency?: string;
    description?: string;
    createdAt?: string;
  }>;
};

export default function AccountWalletPage() {
  const t = useTranslations("account");
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      await Promise.resolve();
      const token = localStorage.getItem("token");
      if (!token) {
        if (active) setLoading(false);
        return;
      }

      fetch("/api/account/wallet", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((response) => response.json())
        .then((data) => {
          if (active) setWallet(data.wallet || null);
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

  if (loading) {
    return <div className="rounded-lg border p-6">{t("loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">{t("wallet.eyebrow")}</p>
        <h1 className="text-3xl font-bold">{t("wallet.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("wallet.description")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{t("wallet.balance")}</p>
            <p className="mt-2 text-3xl font-bold">{wallet?.currency || "USD"} {wallet?.balance ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{t("wallet.credits")}</p>
            <p className="mt-2 text-3xl font-bold">{wallet?.currency || "USD"} {wallet?.credits ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{t("wallet.refunds")}</p>
            <p className="mt-2 text-3xl font-bold">{wallet?.currency || "USD"} {wallet?.refunds ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("wallet.transactions")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!wallet?.transactions?.length ? (
            <div className="rounded-md bg-muted p-8 text-center">
              <h2 className="font-semibold">{t("wallet.emptyTitle")}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t("wallet.empty")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {wallet.transactions.map((item, index) => (
                <div key={item._id || index} className="flex justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium">{item.description || item.type}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-"}
                    </p>
                  </div>
                  <p className="font-semibold">{item.currency || wallet.currency} {item.amount ?? 0}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
