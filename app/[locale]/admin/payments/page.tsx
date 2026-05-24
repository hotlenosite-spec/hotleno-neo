"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Money01Icon,
  Search01Icon,
  CreditCardIcon,
  ChartIncreaseIcon,
  Alert02Icon,
} from "@hugeicons/core-free-icons";

interface PaymentItem {
  id: string;
  bookingReference: string;
  customer: string;
  method: string;
  amount: number;
  currency: string;
  status: "succeeded" | "pending" | "failed" | "refund_required";
  provider: string;
  createdAt: string;
}

const payments: PaymentItem[] = [
  {
    id: "PAY-001",
    bookingReference: "HTL-250525-001",
    customer: "Sarah Alqahtani",
    method: "Card",
    amount: 2450,
    currency: "SAR",
    status: "succeeded",
    provider: "Stripe",
    createdAt: "2026-05-23",
  },
  {
    id: "PAY-002",
    bookingReference: "HTL-250525-002",
    customer: "Mohammed Alotaibi",
    method: "Card",
    amount: 1820,
    currency: "SAR",
    status: "pending",
    provider: "Stripe",
    createdAt: "2026-05-23",
  },
  {
    id: "PAY-003",
    bookingReference: "HTL-250525-003",
    customer: "Noura Aljuhani",
    method: "Card",
    amount: 3120,
    currency: "SAR",
    status: "refund_required",
    provider: "Stripe",
    createdAt: "2026-05-22",
  },
];

export default function AdminPaymentsPage() {
  const [search, setSearch] = useState("");

  const filteredPayments = payments.filter((payment) => {
    const keyword = search.toLowerCase();

    return (
      payment.id.toLowerCase().includes(keyword) ||
      payment.bookingReference.toLowerCase().includes(keyword) ||
      payment.customer.toLowerCase().includes(keyword) ||
      payment.status.toLowerCase().includes(keyword)
    );
  });

  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const succeededAmount = payments
    .filter((payment) => payment.status === "succeeded")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const pendingCount = payments.filter((payment) => payment.status === "pending").length;
  const failedCount = payments.filter(
    (payment) => payment.status === "failed" || payment.status === "refund_required",
  ).length;

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const getStatusBadge = (status: PaymentItem["status"]) => {
    switch (status) {
      case "succeeded":
        return (
          <Badge className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50">
            succeeded
          </Badge>
        );
      case "pending":
        return (
          <Badge className="rounded-full bg-amber-50 px-3 py-1 text-amber-700 hover:bg-amber-50">
            pending
          </Badge>
        );
      case "failed":
        return (
          <Badge className="rounded-full bg-red-50 px-3 py-1 text-red-700 hover:bg-red-50">
            failed
          </Badge>
        );
      case "refund_required":
        return (
          <Badge className="rounded-full bg-red-50 px-3 py-1 text-red-700 hover:bg-red-50">
            refund required
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-orange-100 bg-[linear-gradient(135deg,#0F172A,#F97316)] p-6 text-white shadow-xl shadow-orange-500/10">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black text-[#f4d58d]">
              HOTLENO Payments Control
            </div>

            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              المدفوعات
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
              متابعة عمليات الدفع، الحالات المعلقة، والمبالغ التي تحتاج مراجعة.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <HeroMiniCard title="Payments" value={payments.length.toString()} />
            <HeroMiniCard title="Pending" value={pendingCount.toString()} />
            <HeroMiniCard title="Issues" value={failedCount.toString()} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="إجمالي العمليات"
          value={payments.length.toString()}
          description="جميع عمليات الدفع"
          icon={CreditCardIcon}
          color="bg-orange-50 text-orange-700"
        />

        <StatsCard
          title="إجمالي المبالغ"
          value={formatCurrency(totalAmount, "SAR")}
          description="إجمالي المدفوعات المسجلة"
          icon={Money01Icon}
          color="bg-emerald-50 text-emerald-700"
        />

        <StatsCard
          title="المدفوعات الناجحة"
          value={formatCurrency(succeededAmount, "SAR")}
          description="عمليات مكتملة"
          icon={ChartIncreaseIcon}
          color="bg-orange-50 text-orange-700"
        />

        <StatsCard
          title="تحتاج مراجعة"
          value={failedCount.toString()}
          description="فشل أو استرداد مطلوب"
          icon={Alert02Icon}
          color="bg-red-50 text-red-700"
        />
      </section>

      <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm">
        <CardContent className="p-5">
          <div className="relative">
            <HugeiconsIcon
              icon={Search01Icon}
              className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            />

            <Input
              placeholder="ابحث برقم الدفع، رقم الحجز، العميل أو الحالة..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-12 rounded-2xl border-slate-200 bg-slate-50 pr-12 font-medium"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-xl font-black text-slate-950">
            قائمة المدفوعات
          </CardTitle>
        </CardHeader>

        <CardContent className="p-5">
          {filteredPayments.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm font-medium text-slate-500">
              لا توجد عمليات دفع مطابقة
            </p>
          ) : (
            <div className="space-y-4">
              {filteredPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-3xl border border-slate-100 bg-slate-50 p-5 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:shadow-slate-900/5"
                >
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-black text-slate-950">
                          {payment.bookingReference}
                        </span>
                        {getStatusBadge(payment.status)}
                        <Badge className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-100">
                          {payment.provider}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-500">
                        <span>Payment ID: {payment.id}</span>
                        <span>Customer: {payment.customer}</span>
                        <span>Method: {payment.method}</span>
                        <span>Date: {payment.createdAt}</span>
                      </div>
                    </div>

                    <div className="text-left">
                      <p className="text-2xl font-black text-slate-950">
                        {formatCurrency(payment.amount, payment.currency)}
                      </p>

                      <Button
                        variant="outline"
                        className="mt-3 rounded-2xl border-slate-200 font-bold"
                      >
                        عرض التفاصيل
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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

function StatsCard({
  title,
  value,
  description,
  icon,
  color,
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof Money01Icon;
  color: string;
}) {
  return (
    <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5">
      <CardContent className="p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${color}`}>
            <HugeiconsIcon icon={icon} className="h-6 w-6" />
          </div>
        </div>

        <p className="text-sm font-bold text-slate-500">{title}</p>
        <p className="mt-2 truncate text-2xl font-black tracking-tight text-slate-950">
          {value}
        </p>
        <p className="mt-2 text-xs font-medium text-slate-400">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
