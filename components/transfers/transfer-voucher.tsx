import { Badge } from "@/components/ui/badge";
import type {
  TransferBookingHolder,
  TransferBookingPassenger,
  TransferCancellationPolicy,
  TransferLocation,
  TransferOptionalExtra,
  TransferVoucher as TransferVoucherType,
} from "@/types/transfers";

function formatLocation(location?: TransferLocation) {
  if (!location) return "-";
  return `${location.name || "-"} (${location.codeType || "CODE"}/${location.code || "-"})`;
}

function HolderView({ holder }: { holder?: TransferBookingHolder }) {
  if (!holder) return null;

  return (
    <div>
      <p className="text-xs font-black uppercase tracking-normal text-slate-500">
        Holder
      </p>
      <p className="mt-1 font-black">
        {holder.name} {holder.surname}
      </p>
      <p className="text-sm text-slate-500">{holder.email || holder.phone || "-"}</p>
    </div>
  );
}

function PassengersView({ passengers }: { passengers?: TransferBookingPassenger[] }) {
  if (!passengers?.length) return null;

  return (
    <div>
      <p className="text-xs font-black uppercase tracking-normal text-slate-500">
        Passengers
      </p>
      <div className="mt-2 space-y-1">
        {passengers.map((passenger, index) => (
          <p key={`${passenger.name}-${passenger.surname}-${index}`} className="text-sm font-bold">
            {passenger.title || "Mr"} {passenger.name} {passenger.surname}
            {passenger.age ? `, age ${passenger.age}` : ""}
          </p>
        ))}
      </div>
    </div>
  );
}

function ExtrasView({ extras }: { extras?: TransferOptionalExtra[] }) {
  if (!extras?.length) return null;

  return (
    <div>
      <p className="text-xs font-black uppercase tracking-normal text-slate-500">
        Optional extras
      </p>
      <div className="mt-2 space-y-1">
        {extras.map((extra) => (
          <p key={extra.code} className="text-sm font-bold">
            {extra.name || extra.description || extra.code} x {extra.units || 1}
          </p>
        ))}
      </div>
    </div>
  );
}

function PoliciesView({ policies }: { policies?: TransferCancellationPolicy[] }) {
  if (!policies?.length) return null;

  return (
    <div>
      <p className="text-xs font-black uppercase tracking-normal text-slate-500">
        Cancellation policies
      </p>
      <div className="mt-2 space-y-1">
        {policies.map((policy, index) => (
          <p key={`${policy.from}-${index}`} className="text-sm font-bold">
            {policy.amount !== undefined && policy.currency
              ? `${policy.amount} ${policy.currency} from ${policy.from || "-"}`
              : policy.description || "Cancellation policy available"}
          </p>
        ))}
      </div>
    </div>
  );
}

export function TransferVoucher({ voucher }: { voucher: TransferVoucherType }) {
  return (
    <section className="rounded-[2rem] border border-orange-200 bg-orange-50 p-6 text-[#0F172A]">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge className="bg-[#F97316] text-white">Supplier: Hotelbeds Transfers</Badge>
        <Badge variant="outline">Voucher</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Info label="Booking reference" value={voucher.bookingReference} />
        <Info label="Client reference" value={voucher.clientReference} />
        <Info label="Service" value={voucher.serviceName} />
        <Info label="Vehicle" value={voucher.vehicleName || voucher.vehicleType} />
        <Info label="Pickup" value={formatLocation(voucher.pickup)} />
        <Info label="Dropoff" value={formatLocation(voucher.dropoff)} />
        <Info label="Date / time" value={voucher.pickupDateTime || voucher.pickupTime} />
        <Info
          label="mustCheckPickupTime"
          value={voucher.mustCheckPickupTime ? "true" : "false"}
        />
      </div>

      {voucher.checkPickupInfo ? (
        <div className="mt-5 rounded-2xl bg-white p-4">
          <p className="text-sm font-black text-amber-700">CheckPickup instructions</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {voucher.checkPickupInfo}
          </p>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <HolderView holder={voucher.holder} />
        <PassengersView passengers={voucher.passengers} />
        <ExtrasView extras={voucher.optionalExtras} />
        <PoliciesView policies={voucher.cancellationPolicies} />
      </div>

      {voucher.meetingPoint ? (
        <p className="mt-5 rounded-2xl bg-white p-4 text-sm font-bold">
          Meeting point: {voucher.meetingPoint}
        </p>
      ) : null}

      <p className="mt-5 rounded-2xl bg-white p-4 text-sm font-black">
        {voucher.paymentNote || "Booked and paid by HBX Group"}
      </p>
    </section>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="text-xs font-black uppercase tracking-normal text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-black">{value || "-"}</p>
    </div>
  );
}
