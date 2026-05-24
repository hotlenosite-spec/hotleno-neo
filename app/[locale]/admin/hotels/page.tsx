"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Building02Icon,
  DatabaseIcon,
  Location01Icon,
  Search01Icon,
  StarIcon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type HotelStatus =
  | "draft"
  | "pending_review"
  | "active"
  | "suspended"
  | "rejected";

interface AdminHotel {
  id: string;
  name: string;
  city: string;
  country: string;
  status: HotelStatus;
  isPublished: boolean;
  adminNotes?: string;
  createdAt: string;
  roomCount: number;
  partner: {
    id: string;
    companyName: string;
    verificationStatus: string;
    status: string;
    contactEmail?: string;
  } | null;
}

const statusOptions: HotelStatus[] = [
  "draft",
  "pending_review",
  "active",
  "suspended",
  "rejected",
];

export default function AdminHotelsPage() {
  const [hotels, setHotels] = useState<AdminHotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedHotel, setSelectedHotel] = useState<AdminHotel | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);

  const fetchHotels = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        toast.error("Authentication required");
        return;
      }

      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "20");
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (country) params.set("country", country);
      if (city) params.set("city", city);

      const response = await fetch(`/api/admin/hotels?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch hotels");
      }

      setHotels(data.hotels || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch hotels");
      setHotels([]);
    } finally {
      setLoading(false);
    }
  }, [city, country, page, search, statusFilter]);

  useEffect(() => {
    fetchHotels();
  }, [fetchHotels]);

  const updateHotelStatus = async (hotel: AdminHotel, status: HotelStatus) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/admin/hotels", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "update_property_status",
          hotelPropertyId: hotel.id,
          status,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update hotel status");
      }

      toast.success("Hotel status updated");
      fetchHotels();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update hotel");
    }
  };

  const saveAdminNote = async () => {
    if (!selectedHotel) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/admin/hotels", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "add_admin_note",
          hotelPropertyId: selectedHotel.id,
          note: adminNote,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save admin note");
      }

      toast.success("Admin note saved");
      setIsNoteDialogOpen(false);
      setSelectedHotel(null);
      setAdminNote("");
      fetchHotels();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save note");
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchHotels();
  };

  const statusCounts = statusOptions.reduce<Record<string, number>>((counts, status) => {
    counts[status] = hotels.filter((hotel) => hotel.status === status).length;
    return counts;
  }, {});

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-orange-100 bg-[linear-gradient(135deg,#0F172A,#F97316)] p-6 text-white shadow-xl shadow-orange-500/10">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black text-[#f4d58d]">
              HOTLENO Hotel Partner Review
            </div>

            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              Hotel Properties
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
              Review hotel partner properties before any future customer-facing publication.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <HeroMiniCard title="Hotels" value={hotels.length.toString()} />
            <HeroMiniCard title="Pending" value={(statusCounts.pending_review || 0).toString()} />
            <HeroMiniCard title="Active" value={(statusCounts.active || 0).toString()} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Total hotels"
          value={hotels.length.toString()}
          description="Internal hotel partner properties"
          icon={Building02Icon}
          color="bg-orange-50 text-orange-700"
        />
        <StatsCard
          title="Pending review"
          value={(statusCounts.pending_review || 0).toString()}
          description="Waiting for admin review"
          icon={DatabaseIcon}
          color="bg-amber-50 text-amber-700"
        />
        <StatsCard
          title="Approved"
          value={(statusCounts.active || 0).toString()}
          description="Approved internally, not published"
          icon={StarIcon}
          color="bg-emerald-50 text-emerald-700"
        />
        <StatsCard
          title="Rejected"
          value={(statusCounts.rejected || 0).toString()}
          description="Rejected by admin review"
          icon={DatabaseIcon}
          color="bg-red-50 text-red-700"
        />
      </section>

      <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm">
        <CardContent className="p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_160px_160px_auto]">
            <div className="relative">
              <HugeiconsIcon
                icon={Search01Icon}
                className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              />
              <Input
                placeholder="Search by hotel, partner, city, or country"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleSearch()}
                className="h-12 rounded-2xl border-slate-200 bg-slate-50 pr-12 font-medium"
              />
            </div>

            <Select
              value={statusFilter || "all"}
              onValueChange={(value) => {
                setPage(1);
                setStatusFilter(value === "all" ? "" : value);
              }}
            >
              <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Country"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              className="h-12 rounded-2xl border-slate-200 bg-slate-50 font-medium"
            />

            <Input
              placeholder="City"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="h-12 rounded-2xl border-slate-200 bg-slate-50 font-medium"
            />

            <Button
              onClick={handleSearch}
              className="h-12 rounded-2xl bg-[#071b33] px-5 text-white hover:bg-[#0a2a4f]"
            >
              <HugeiconsIcon icon={Search01Icon} className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-xl font-black text-slate-950">
            Hotel partner properties
          </CardTitle>
        </CardHeader>

        <CardContent className="p-5">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-28 rounded-3xl" />
              ))}
            </div>
          ) : hotels.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm font-medium text-slate-500">
              No hotel partner properties found.
            </p>
          ) : (
            <div className="space-y-4">
              {hotels.map((hotel) => (
                <div
                  key={hotel.id}
                  className="rounded-3xl border border-slate-100 bg-slate-50 p-5 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:shadow-slate-900/5"
                >
                  <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-black text-slate-950">
                          {hotel.name}
                        </span>
                        {getStatusBadge(hotel.status)}
                        {getVerificationBadge(hotel.partner?.verificationStatus)}
                        {!hotel.isPublished && (
                          <Badge className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-100">
                            not published
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-500">
                        <span>{hotel.partner?.companyName || "No partner"}</span>
                        <span className="flex items-center gap-1">
                          <HugeiconsIcon icon={Location01Icon} className="h-4 w-4" />
                          {hotel.city || "-"}, {hotel.country || "-"}
                        </span>
                        <span>Rooms: {hotel.roomCount}</span>
                        <span>Created: {format(new Date(hotel.createdAt), "MMM d, yyyy")}</span>
                      </div>

                      {hotel.adminNotes && (
                        <p className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-500">
                          {hotel.adminNotes}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateHotelStatus(hotel, "active")}
                        className="rounded-2xl bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateHotelStatus(hotel, "rejected")}
                        className="rounded-2xl border-red-200 font-bold text-red-700 hover:bg-red-50"
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateHotelStatus(hotel, "suspended")}
                        className="rounded-2xl border-slate-200 font-bold"
                      >
                        Suspend
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedHotel(hotel);
                          setAdminNote(hotel.adminNotes || "");
                          setIsNoteDialogOpen(true);
                        }}
                        className="rounded-2xl border-slate-200 font-bold"
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
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page === 1}
                className="rounded-2xl"
              >
                Previous
              </Button>
              <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={page === totalPages}
                className="rounded-2xl"
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent className="rounded-3xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-950">
              Add admin note
            </DialogTitle>
            <DialogDescription className="font-medium text-slate-500">
              Save an internal review note for {selectedHotel?.name}.
            </DialogDescription>
          </DialogHeader>

          <textarea
            value={adminNote}
            onChange={(event) => setAdminNote(event.target.value)}
            className="min-h-32 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium outline-none focus:border-[#071b33]"
            placeholder="Write an internal note"
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsNoteDialogOpen(false)}
              className="rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              onClick={saveAdminNote}
              className="rounded-2xl bg-[#071b33] font-bold text-white hover:bg-[#0a2a4f]"
            >
              Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getStatusBadge(status: HotelStatus) {
  const classes: Record<HotelStatus, string> = {
    draft: "bg-slate-100 text-slate-700 hover:bg-slate-100",
    pending_review: "bg-amber-50 text-amber-700 hover:bg-amber-50",
    active: "bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
    suspended: "bg-orange-50 text-orange-700 hover:bg-orange-50",
    rejected: "bg-red-50 text-red-700 hover:bg-red-50",
  };

  return (
    <Badge className={`rounded-full px-3 py-1 ${classes[status]}`}>
      {status}
    </Badge>
  );
}

function getVerificationBadge(status?: string) {
  if (!status) {
    return (
      <Badge className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-100">
        partner unknown
      </Badge>
    );
  }

  return (
    <Badge className="rounded-full bg-orange-50 px-3 py-1 text-orange-700 hover:bg-orange-50">
      {status}
    </Badge>
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
  icon: typeof Building02Icon;
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
