import { HotelbedsHotelVoucher } from "@/components/hotels/hotelbeds-hotel-voucher";
import { PrintButton } from "@/components/vouchers/print-button";
import type { HotelbedsHotelVoucher as HotelbedsHotelVoucherType } from "@/types/hotelbeds-hotels-certification";

const sampleVoucher: HotelbedsHotelVoucherType = {
  supplier: "hotelbeds-accommodation",
  hotlenoReference: "SAMPLE-HOTLENO-HTL-001",
  bookingReference: "102-20736378",
  supplierReference: "102-20736378",
  hotelName: "Sercotel Rosellon",
  hotelAddress: "Barcelona, Spain",
  checkIn: "2026-07-03",
  checkOut: "2026-07-04",
  roomName: "CLASSIC TWIN",
  boardName: "ROOM ONLY",
  holderName: "Naif Alotaibi",
  customerEmail: "hotelbeds.tester@hotleno.com",
  customerPhone: "+966500000000",
  amount: 150.85,
  currency: "EUR",
  status: "Booking Confirmed",
  cancellationStatus: "Cancellation Completed",
  rooms: [
    {
      name: "CLASSIC TWIN",
      board: "ROOM ONLY",
      adults: 1,
      children: 0,
      childAges: [],
      guestNames: ["Naif Alotaibi"],
    },
    {
      name: "CLASSIC TWIN",
      board: "ROOM ONLY",
      adults: 1,
      children: 1,
      childAges: [7],
      guestNames: ["Test Adult", "Test Child"],
    },
  ],
  cancellationPolicies: [{ amount: 0, currency: "EUR" }],
  remarks: [
    "Certification sample prepared for more than one room, different occupancies, and at least one child.",
    "Supplier: Hotelbeds Accommodation.",
  ],
};

export default function HotelVoucherSamplePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[#F97316]">Hotelbeds Accommodation certification</p>
          <h1 className="text-3xl font-black text-[#0F172A]">Hotel voucher sample</h1>
        </div>
        <PrintButton />
      </div>
      <HotelbedsHotelVoucher voucher={sampleVoucher} />
    </div>
  );
}
