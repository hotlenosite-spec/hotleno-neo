import { TransferVoucher } from "@/components/transfers/transfer-voucher";
import { PrintButton } from "@/components/vouchers/print-button";
import type { TransferVoucher as TransferVoucherType } from "@/types/transfers";

const sampleVoucher: TransferVoucherType = {
  supplier: "hotelbeds-transfers",
  bookingReference: "SAMPLE-HBX-TRF-001",
  clientReference: "SAMPLE-HOTLENO-TRF-001",
  serviceName: "Private transfer - Hotel Sistina to Rome Ciampino Airport",
  transferType: "DEPARTURE",
  categoryName: "Private",
  vehicleName: "Standard car",
  vehicleType: "CAR",
  pickup: { name: "Hotel Sistina", code: "5643", codeType: "ATLAS", type: "hotel" },
  dropoff: { name: "Rome Ciampino Airport", code: "CIA", codeType: "IATA", type: "airport" },
  serviceDate: "2026-07-02",
  flightTime: "10:00 AM",
  pickupTime: "10:00 AM",
  mustCheckPickupTime: true,
  checkPickupInfo: "Checkpickup.com must be consulted before the service date for the final departure pickup time.",
  pickupDescription: "Departure pickup time is not the flight departure time.",
  paxDistribution: { adults: 1, children: 0, infants: 0 },
  holder: {
    name: "Naif",
    surname: "Alotaibi",
    email: "hotelbeds.tester@hotleno.com",
    phone: "+966500000000",
  },
  passengers: [{ title: "Mr", name: "Naif", surname: "Alotaibi", age: 30, type: "AD" }],
  cancellationPolicies: [{ description: "Cancellation policy available from Hotelbeds Transfers response." }],
  paymentNote: "Booked and paid by HBX Group",
  raw: { direction: "DEPARTURE" },
};

export default function TransferVoucherSamplePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[#F97316]">Hotelbeds Transfers certification</p>
          <h1 className="text-3xl font-black text-[#0F172A]">Transfer voucher sample</h1>
        </div>
        <PrintButton />
      </div>
      <TransferVoucher voucher={sampleVoucher} />
    </div>
  );
}
