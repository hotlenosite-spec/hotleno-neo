import type { HotelbedsHotelVoucher } from "@/types/hotelbeds-hotels-certification";

function clean(value?: string | number | null) {
  const text = String(value ?? "").trim();
  return text && text !== "undefined" && text !== "null" ? text : undefined;
}

function formatPolicy(policy: unknown) {
  if (!policy || typeof policy !== "object") return clean(String(policy ?? ""));
  const record = policy as Record<string, unknown>;
  const amount = clean(record.amount as string | number | null) || clean(record.Amount as string | number | null);
  const from = clean(record.from as string | number | null) || clean(record.From as string | number | null);
  const description =
    clean(record.description as string | number | null) ||
    clean(record.Description as string | number | null);

  return [description, amount ? `Amount: ${amount}` : "", from ? `From: ${String(from).slice(0, 10)}` : ""]
    .filter(Boolean)
    .join(" - ");
}

export function HotelbedsHotelVoucher({ voucher }: { voucher: HotelbedsHotelVoucher }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 text-[#0F172A] print:rounded-none print:border-0 print:p-0">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-4">
        <p className="text-xs font-black uppercase tracking-normal text-slate-500">HOTLENO</p>
        <h2 className="text-2xl font-black">Hotel Booking Voucher</h2>
        <p className="text-sm font-bold text-slate-500">Supplier: Hotelbeds Accommodation</p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <VoucherField label="HOTLENO Reference" value={voucher.hotlenoReference} fallback="-" />
        <VoucherField label="Hotelbeds Reference" value={voucher.bookingReference || voucher.supplierReference} fallback="-" />
        <VoucherField label="Hotel" value={voucher.hotelName} fallback="-" />
        <VoucherField label="Hotel address" value={voucher.hotelAddress} fallback="-" />
        <VoucherField label="Hotel phone" value={voucher.hotelPhone} fallback="-" />
        <VoucherField label="Status" value={voucher.status} />
        <VoucherField label="Check-in" value={voucher.checkIn} />
        <VoucherField label="Check-out" value={voucher.checkOut} />
        <VoucherField label="Room" value={voucher.roomName} />
        <VoucherField label="Board" value={voucher.boardName} />
        <VoucherField label="Lead guest" value={voucher.holderName} />
        <VoucherField label="Customer contact" value={[voucher.customerEmail, voucher.customerPhone].filter(Boolean).join(" / ")} />
        <VoucherField label="Cancellation" value={voucher.cancellationStatus} />
      </div>

      {voucher.rooms?.length ? (
        <div data-print-card className="mt-5 rounded-2xl bg-slate-50 p-4 print:bg-white print:p-0">
          <p className="text-xs font-black uppercase tracking-normal text-slate-500">Rooms and pax</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {voucher.rooms.map((room, index) => (
              <div key={`${room.name || "room"}-${index}`} data-print-card className="rounded-2xl bg-white p-4 print:border print:border-slate-200">
                <p className="font-black">Room {index + 1}</p>
                <p className="mt-1 text-sm font-bold text-slate-600">{clean(room.name) || "Room details not provided"}</p>
                {clean(room.board) ? <p className="text-sm font-bold text-slate-600">Board: {room.board}</p> : null}
                <p className="text-sm font-bold text-slate-600">
                  Adults {room.adults || 0}, Children {room.children || 0}
                </p>
                {room.childAges?.length ? (
                  <p className="text-sm font-bold text-slate-600">Child ages: {room.childAges.join(", ")}</p>
                ) : null}
                {room.guests?.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-bold">
                    {room.guests.map((guest, guestIndex) => (
                      <li key={`${guest.name}-${guestIndex}`}>
                        {guest.name}
                        {guest.type === "CH" && guest.age !== undefined ? `, Child age: ${guest.age}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : room.guestNames?.length ? (
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

      <ListBlock
        title="Cancellation policy"
        items={
          voucher.cancellationPolicies?.length
            ? voucher.cancellationPolicies
                .map(formatPolicy)
                .filter((item): item is string => Boolean(item))
            : ["No cancellation policy provided"]
        }
      />

      <ListBlock
        title="Remarks"
        items={voucher.remarks?.length ? voucher.remarks : ["No remarks provided"]}
      />
    </section>
  );
}

function VoucherField({ label, value, fallback }: { label: string; value?: string; fallback?: string }) {
  const displayValue = clean(value) || fallback;
  if (!clean(displayValue)) return null;

  return (
    <div data-print-card className="rounded-2xl border border-slate-200 bg-slate-50 p-4 print:bg-white">
      <p className="text-xs font-black uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-1 text-base font-black">{displayValue}</p>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items?: string[] }) {
  const cleanItems = (items || []).filter((item) => clean(item));
  if (!cleanItems.length) return null;

  return (
    <div data-print-card className="mt-5 rounded-2xl bg-slate-50 p-4 print:bg-white">
      <p className="text-xs font-black uppercase tracking-normal text-slate-500">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-bold">
        {cleanItems.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
