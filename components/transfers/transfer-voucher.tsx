import { Badge } from "@/components/ui/badge";
import type {
  TransferBookingHolder,
  TransferBookingPassenger,
  TransferCancellationPolicy,
  TransferLocation,
  TransferOptionalExtra,
  TransferVoucher as TransferVoucherType,
} from "@/types/transfers";

const CHECKPICKUP_TEXT = "To be confirmed on Checkpickup.com";

function clean(value?: string | null) {
  const text = String(value || "").trim();
  return text && text !== "undefined" && text !== "null" ? text : undefined;
}

function formatLocation(location?: TransferLocation) {
  if (!location) return undefined;
  return clean(`${location.name || ""}${location.code || location.codeType ? ` (${location.codeType || "CODE"}/${location.code || "not provided"})` : ""}`);
}

function isDeparture(voucher: TransferVoucherType) {
  const raw = JSON.stringify(voucher.raw || {}).toUpperCase();
  return (
    voucher.dropoff?.codeType === "IATA" ||
    voucher.dropoff?.codeType === "PORT" ||
    voucher.dropoff?.codeType === "STATION" ||
    raw.includes("DEPARTURE")
  );
}

function getServiceDate(voucher: TransferVoucherType) {
  return clean(voucher.serviceDate) || clean(voucher.pickupDateTime?.slice(0, 10));
}

function getTransportTime(voucher: TransferVoucherType) {
  return clean(voucher.flightTime) || clean(voucher.transportTime) || clean(voucher.pickupDateTime);
}

function getPickupTime(voucher: TransferVoucherType) {
  if (voucher.mustCheckPickupTime && isDeparture(voucher)) return CHECKPICKUP_TEXT;
  return clean(voucher.pickupTime) || clean(voucher.pickupDateTime);
}

function HolderView({ holder }: { holder?: TransferBookingHolder }) {
  if (!holder) return null;
  const name = clean(`${holder.name || ""} ${holder.surname || ""}`);
  const contact = clean(holder.email) || clean(holder.phone);
  if (!name && !contact) return null;

  return (
    <div>
      <p className="text-xs font-black uppercase tracking-normal text-slate-500">Lead passenger</p>
      {name ? <p className="mt-1 font-black">{name}</p> : null}
      {contact ? <p className="text-sm text-slate-500">{contact}</p> : null}
    </div>
  );
}

function PassengersView({ passengers }: { passengers?: TransferBookingPassenger[] }) {
  if (!passengers?.length) return null;

  return (
    <div>
      <p className="text-xs font-black uppercase tracking-normal text-slate-500">Passengers</p>
      <div className="mt-2 space-y-1">
        {passengers.map((passenger, index) => {
          const name = clean(`${passenger.title || "Mr"} ${passenger.name || ""} ${passenger.surname || ""}`);
          if (!name) return null;
          return (
            <p key={`${name}-${index}`} className="text-sm font-bold">
              {name}
              {passenger.age ? `, age ${passenger.age}` : ""}
            </p>
          );
        })}
      </div>
    </div>
  );
}

function ExtrasView({ extras }: { extras?: TransferOptionalExtra[] }) {
  if (!extras?.length) return null;

  return (
    <div>
      <p className="text-xs font-black uppercase tracking-normal text-slate-500">Optional extras</p>
      <div className="mt-2 space-y-1">
        {extras.map((extra) => (
          <p key={extra.code} className="text-sm font-bold">
            {clean(extra.name) || clean(extra.description) || extra.code} x {extra.units || 1}
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
      <p className="text-xs font-black uppercase tracking-normal text-slate-500">Cancellation policies</p>
      <div className="mt-2 space-y-1">
        {policies.map((policy, index) => {
          const text =
            policy.amount !== undefined && policy.currency
              ? `${policy.amount} ${policy.currency} from ${policy.from || "not provided"}`
              : clean(policy.description);
          return text ? (
            <p key={`${policy.from}-${index}`} className="text-sm font-bold">
              {text}
            </p>
          ) : null;
        })}
      </div>
    </div>
  );
}

export function TransferVoucher({ voucher }: { voucher: TransferVoucherType }) {
  const pickupTime = getPickupTime(voucher);
  const showCheckpickup = voucher.mustCheckPickupTime || clean(voucher.checkPickupInfo);

  return (
    <section className="rounded-[2rem] border border-orange-200 bg-orange-50 p-6 text-[#0F172A]">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge className="bg-[#F97316] text-white">HOTLENO generated voucher</Badge>
        <Badge variant="outline">Supplier: Hotelbeds Transfers</Badge>
      </div>

      <div className="border-b border-orange-200 pb-5">
        <p className="text-xs font-black uppercase tracking-normal text-slate-500">HOTLENO</p>
        <h2 className="mt-1 text-2xl font-black">Transfer Booking Voucher</h2>
        <p className="mt-2 text-sm font-bold text-slate-600">
          Flight, ship, or train time is shown separately from pickup time.
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Info label="HOTLENO reference" value={voucher.clientReference} />
        <Info label="Hotelbeds reference" value={voucher.bookingReference} />
        <Info label="Service" value={voucher.serviceName} />
        <Info label="Type / category" value={[voucher.transferType, voucher.categoryName].filter(Boolean).join(" / ")} />
        <Info label="Vehicle" value={voucher.vehicleName || voucher.vehicleType} />
        <Info label="From" value={formatLocation(voucher.pickup)} />
        <Info label="To" value={formatLocation(voucher.dropoff)} />
        <Info label="Service date" value={getServiceDate(voucher)} />
        <Info label="Flight / ship / train time" value={getTransportTime(voucher)} />
        <Info label="Pickup time" value={pickupTime} />
        <Info
          label="Pax distribution"
          value={
            voucher.paxDistribution
              ? `Adults ${voucher.paxDistribution.adults}, Children ${voucher.paxDistribution.children || 0}, Infants ${voucher.paxDistribution.infants || 0}`
              : undefined
          }
        />
      </div>

      {showCheckpickup ? (
        <div className="mt-5 rounded-2xl bg-white p-4">
          <p className="text-sm font-black text-amber-700">Checkpickup.com information</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {voucher.mustCheckPickupTime && isDeparture(voucher)
              ? "Pickup time must be confirmed on Checkpickup.com. Do not use the flight departure time as the pickup time."
              : "Check pickup instructions are available for this service."}
            {clean(voucher.checkPickupInfo) ? `\n${voucher.checkPickupInfo}` : ""}
          </p>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <HolderView holder={voucher.holder} />
        <PassengersView passengers={voucher.passengers} />
        <ExtrasView extras={voucher.optionalExtras} />
        <PoliciesView policies={voucher.cancellationPolicies} />
      </div>

      <TextBlock title="Pickup description" text={voucher.pickupDescription} />
      <TextBlock title="Meeting point" text={voucher.meetingPoint} />
      <TextBlock title="Remarks" text={voucher.remarks?.join("\n")} />

      <p className="mt-5 rounded-2xl bg-white p-4 text-sm font-black">
        {clean(voucher.paymentNote) || "Booked and paid by HBX Group"}
      </p>
    </section>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  if (!clean(value)) return null;

  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="text-xs font-black uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  );
}

function TextBlock({ title, text }: { title: string; text?: string }) {
  if (!clean(text)) return null;

  return (
    <p className="mt-5 whitespace-pre-wrap rounded-2xl bg-white p-4 text-sm font-bold">
      <span className="block text-xs font-black uppercase tracking-normal text-slate-500">{title}</span>
      <span className="mt-2 block">{text}</span>
    </p>
  );
}
