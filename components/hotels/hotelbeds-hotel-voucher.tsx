import type { HotelbedsHotelVoucher } from "@/types/hotelbeds-hotels-certification";

export function HotelbedsHotelVoucher({ voucher }: { voucher: HotelbedsHotelVoucher }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 text-[#0F172A]">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-4">
        <p className="text-xs font-black uppercase tracking-normal text-slate-500">
          Supplier: Hotelbeds Accommodation
        </p>
        <h2 className="text-2xl font-black">Hotel Voucher</h2>
        <p className="text-sm font-bold text-slate-500">
          Booking reference: {voucher.bookingReference || "-"}
        </p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <VoucherField label="Hotel" value={voucher.hotelName} />
        <VoucherField label="Status" value={voucher.status} />
        <VoucherField label="Check-in" value={voucher.checkIn} />
        <VoucherField label="Check-out" value={voucher.checkOut} />
        <VoucherField label="Room" value={voucher.roomName} />
        <VoucherField label="Board" value={voucher.boardName} />
        <VoucherField label="Holder" value={voucher.holderName} />
        <VoucherField label="Supplier reference" value={voucher.supplierReference} />
      </div>

      {voucher.guestNames?.length ? (
        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-normal text-slate-500">
            Guests
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-bold">
            {voucher.guestNames.map((guest, index) => (
              <li key={`${guest}-${index}`}>{guest}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {voucher.cancellationPolicies?.length ? (
        <div className="mt-5 rounded-2xl bg-orange-50 p-4 text-sm font-bold text-orange-800">
          Cancellation policies captured from Check Rate / Booking Details.
        </div>
      ) : null}

      {voucher.remarks?.length ? (
        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-normal text-slate-500">
            Remarks
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-bold">
            {voucher.remarks.slice(0, 4).map((remark, index) => (
              <li key={`${remark}-${index}`}>{remark}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function VoucherField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-normal text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-base font-black">{value || "-"}</p>
    </div>
  );
}
