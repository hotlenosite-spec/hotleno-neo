import type { HotelbedsHotelVoucher } from "@/types/hotelbeds-hotels-certification";

function clean(value?: string | number | null) {
  const text = String(value ?? "").trim();
  return text && text !== "undefined" && text !== "null" ? text : undefined;
}

function formatPrice(voucher: HotelbedsHotelVoucher) {
  if (voucher.amount === undefined && !voucher.currency) return undefined;
  return [voucher.amount, voucher.currency].map((item) => clean(item)).filter(Boolean).join(" ");
}

export function HotelbedsHotelVoucher({ voucher }: { voucher: HotelbedsHotelVoucher }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 text-[#0F172A]">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-4">
        <p className="text-xs font-black uppercase tracking-normal text-slate-500">HOTLENO</p>
        <h2 className="text-2xl font-black">Hotel Booking Voucher</h2>
        <p className="text-sm font-bold text-slate-500">Supplier: Hotelbeds Accommodation</p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <VoucherField label="HOTLENO reference" value={voucher.hotlenoReference} />
        <VoucherField label="Hotelbeds reference" value={voucher.bookingReference || voucher.supplierReference} />
        <VoucherField label="Hotel" value={voucher.hotelName} />
        <VoucherField label="Hotel address" value={voucher.hotelAddress} />
        <VoucherField label="Status" value={voucher.status} />
        <VoucherField label="Check-in" value={voucher.checkIn} />
        <VoucherField label="Check-out" value={voucher.checkOut} />
        <VoucherField label="Room" value={voucher.roomName} />
        <VoucherField label="Board" value={voucher.boardName} />
        <VoucherField label="Lead guest" value={voucher.holderName} />
        <VoucherField label="Customer contact" value={[voucher.customerEmail, voucher.customerPhone].filter(Boolean).join(" / ")} />
        <VoucherField label="Price" value={formatPrice(voucher)} />
        <VoucherField label="Cancellation" value={voucher.cancellationStatus} />
      </div>

      {voucher.rooms?.length ? (
        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-normal text-slate-500">Rooms and pax</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {voucher.rooms.map((room, index) => (
              <div key={`${room.name || "room"}-${index}`} className="rounded-2xl bg-white p-4">
                <p className="font-black">Room {index + 1}</p>
                <p className="mt-1 text-sm font-bold text-slate-600">{clean(room.name) || "Room details not provided"}</p>
                {clean(room.board) ? <p className="text-sm font-bold text-slate-600">Board: {room.board}</p> : null}
                <p className="text-sm font-bold text-slate-600">
                  Adults {room.adults || 0}, Children {room.children || 0}
                  {room.childAges?.length ? `, child ages ${room.childAges.join(", ")}` : ""}
                </p>
                {room.guestNames?.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-bold">
                    {room.guestNames.map((guest, guestIndex) => (
                      <li key={`${guest}-${guestIndex}`}>{guest}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {voucher.guestNames?.length ? (
        <ListBlock title="Guests" items={voucher.guestNames} />
      ) : null}

      {voucher.cancellationPolicies?.length ? (
        <div className="mt-5 rounded-2xl bg-orange-50 p-4 text-sm font-bold text-orange-800">
          Cancellation policies captured from CheckRate / BookingDetails.
        </div>
      ) : null}

      <ListBlock title="Remarks" items={voucher.remarks} />
    </section>
  );
}

function VoucherField({ label, value }: { label: string; value?: string }) {
  if (!clean(value)) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-1 text-base font-black">{value}</p>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items?: string[] }) {
  const cleanItems = (items || []).filter((item) => clean(item));
  if (!cleanItems.length) return null;

  return (
    <div className="mt-5 rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-normal text-slate-500">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-bold">
        {cleanItems.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
