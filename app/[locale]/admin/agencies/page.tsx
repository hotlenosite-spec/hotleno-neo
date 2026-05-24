"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

interface Agency {
  _id: string;
  name: string;
  commercialName?: string;
  country?: string;
  city?: string;
  phone?: string;
  email?: string;
  status: "pending" | "active" | "suspended" | "rejected";
  commissionRate: number;
  markupRate: number;
  creditLimit: number;
  balance: number;
  currency: string;
  notes?: string;
  createdAt: string;
}

const agencyStatuses = ["pending", "active", "suspended", "rejected"];

export default function AdminAgenciesPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAgencies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const fetchAgencies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "10");
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);
      if (countryFilter) params.append("country", countryFilter);
      if (cityFilter) params.append("city", cityFilter);

      const response = await fetch(`/api/admin/agencies?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch agencies");
      }

      const data = await response.json();
      setAgencies(data.agencies || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch agencies");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchAgencies();
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setCountryFilter("");
    setCityFilter("");
    setPage(1);
  };

  const patchAgency = async (
    agencyId: string,
    body: Record<string, unknown>,
  ) => {
    const token = localStorage.getItem("token");
    const response = await fetch("/api/admin/agencies", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        agencyId,
        ...body,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error || "Failed to update agency");
    }

    if (data?.agency) {
      setAgencies((current) =>
        current.map((agency) =>
          agency._id === agencyId ? data.agency : agency,
        ),
      );
    }
  };

  const changeStatus = async (agencyId: string, status: Agency["status"]) => {
    try {
      await patchAgency(agencyId, {
        action: "change_status",
        status,
      });
      toast.success(`Agency marked ${status}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update agency");
    }
  };

  const addAdminNote = async (agency: Agency) => {
    const note = noteDrafts[agency._id]?.trim();
    if (!note) return;

    const nextNotes = agency.notes
      ? `${agency.notes}\n\n${format(new Date(), "yyyy-MM-dd HH:mm")} - ${note}`
      : `${format(new Date(), "yyyy-MM-dd HH:mm")} - ${note}`;

    try {
      await patchAgency(agency._id, { notes: nextNotes });
      setNoteDrafts((current) => ({ ...current, [agency._id]: "" }));
      toast.success("Admin note added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add note");
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount || 0);
  };

  const getStatusBadge = (status: Agency["status"]) => {
    switch (status) {
      case "active":
        return (
          <Badge className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50">
            active
          </Badge>
        );
      case "suspended":
      case "rejected":
        return (
          <Badge className="rounded-full bg-red-50 px-3 py-1 text-red-700 hover:bg-red-50">
            {status}
          </Badge>
        );
      default:
        return (
          <Badge className="rounded-full bg-amber-50 px-3 py-1 text-amber-700 hover:bg-amber-50">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-orange-100 bg-[linear-gradient(135deg,#0F172A,#F97316)] p-6 text-white shadow-xl shadow-orange-500/10">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black text-[#f4d58d]">
              HOTLENO B2B Agencies
            </div>

            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              B2B Agencies
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
              Manage agency status and commercial settings.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <HeroMiniCard title="Agencies" value={agencies.length.toString()} />
            <HeroMiniCard title="Page" value={page.toString()} />
            <HeroMiniCard title="Pages" value={totalPages.toString()} />
          </div>
        </div>
      </section>

      <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm">
        <CardContent className="p-5">
          <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <HugeiconsIcon
                  icon={Search01Icon}
                  className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                />
                <Input
                  placeholder="Search name, email, or phone..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && handleSearch()}
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50 pr-12 font-medium"
                />
              </div>

              <Button
                onClick={handleSearch}
                className="h-12 rounded-2xl bg-[#071b33] px-4 text-white hover:bg-[#0a2a4f]"
              >
                <HugeiconsIcon icon={Search01Icon} className="h-4 w-4" />
              </Button>
            </div>

            <Select
              value={statusFilter || "all"}
              onValueChange={(value) => {
                setStatusFilter(value === "all" ? "" : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {agencyStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Country..."
              value={countryFilter}
              onChange={(event) => setCountryFilter(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleSearch()}
              className="h-12 rounded-2xl border-slate-200 bg-slate-50 font-medium"
            />

            <Input
              placeholder="City..."
              value={cityFilter}
              onChange={(event) => setCityFilter(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleSearch()}
              className="h-12 rounded-2xl border-slate-200 bg-slate-50 font-medium"
            />

            <Button
              variant="outline"
              onClick={clearFilters}
              className="h-12 rounded-2xl border-slate-200 px-5 font-bold"
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-xl font-black text-slate-950">
            Agencies
          </CardTitle>
        </CardHeader>

        <CardContent className="p-5">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((item) => (
                <Skeleton key={item} className="h-32 rounded-3xl" />
              ))}
            </div>
          ) : agencies.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm font-medium text-slate-500">
              No agencies found
            </p>
          ) : (
            <div className="space-y-4">
              {agencies.map((agency) => (
                <div
                  key={agency._id}
                  className="rounded-3xl border border-slate-100 bg-slate-50 p-5 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:shadow-slate-900/5"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xl font-black text-slate-950">
                          {agency.name}
                        </span>

                        {agency.commercialName && (
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 shadow-sm">
                            {agency.commercialName}
                          </span>
                        )}

                        {getStatusBadge(agency.status)}
                      </div>

                      <div className="grid gap-3 text-sm text-slate-500 sm:grid-cols-2 lg:grid-cols-4">
                        <InfoBox label="Email" value={agency.email || "-"} />
                        <InfoBox label="Phone" value={agency.phone || "-"} />
                        <InfoBox
                          label="Location"
                          value={`${agency.country || "-"} / ${agency.city || "-"}`}
                        />
                        <InfoBox
                          label="Created"
                          value={format(new Date(agency.createdAt), "MMM d, yyyy")}
                        />
                      </div>

                      <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                        <InfoBox label="Markup" value={`${agency.markupRate || 0}%`} />
                        <InfoBox
                          label="Commission"
                          value={`${agency.commissionRate || 0}%`}
                        />
                        <InfoBox
                          label="Balance"
                          value={formatCurrency(agency.balance, agency.currency)}
                        />
                        <InfoBox
                          label="Credit"
                          value={formatCurrency(agency.creditLimit, agency.currency)}
                        />
                      </div>

                      {agency.notes && (
                        <p className="whitespace-pre-wrap rounded-3xl border border-slate-100 bg-white p-4 text-sm font-medium leading-7 text-slate-600">
                          {agency.notes}
                        </p>
                      )}
                    </div>

                    <div className="min-w-72 space-y-3 rounded-3xl border border-slate-100 bg-white p-4">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => changeStatus(agency._id, "active")}
                          className="rounded-2xl border-emerald-200 font-bold text-emerald-700 hover:bg-emerald-50"
                        >
                          Activate agency
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => changeStatus(agency._id, "suspended")}
                          className="rounded-2xl border-amber-200 font-bold text-amber-700 hover:bg-amber-50"
                        >
                          Suspend agency
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => changeStatus(agency._id, "rejected")}
                          className="rounded-2xl border-red-200 font-bold text-red-700 hover:bg-red-50"
                        >
                          Reject agency
                        </Button>
                      </div>

                      <Textarea
                        placeholder="Add internal admin note..."
                        value={noteDrafts[agency._id] || ""}
                        onChange={(event) =>
                          setNoteDrafts((current) => ({
                            ...current,
                            [agency._id]: event.target.value,
                          }))
                        }
                        className="rounded-2xl border-slate-200"
                      />

                      <Button
                        size="sm"
                        onClick={() => addAdminNote(agency)}
                        disabled={!noteDrafts[agency._id]?.trim()}
                        className="rounded-2xl bg-[#071b33] font-bold text-white hover:bg-[#0a2a4f]"
                      >
                        Add admin note
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
                className="rounded-2xl"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4" />
              </Button>

              <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
                Page {page} of {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page === totalPages}
                className="rounded-2xl"
              >
                <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4" />
              </Button>
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

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-slate-800">
        {value}
      </p>
    </div>
  );
}
