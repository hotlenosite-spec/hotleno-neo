import Link from "next/link";

const cards = [
  {
    title: "Activities voucher sample",
    href: "activities/voucher-sample",
    text: "HOTLENO generated activity voucher, with official Hotelbeds PDF handling when returned.",
  },
  {
    title: "Transfers voucher sample",
    href: "transfers/voucher-sample",
    text: "Departure pickup time is separated from flight time and Checkpickup.com is shown.",
  },
  {
    title: "Accommodation live certification run",
    href: "hotels/certification-run",
    text: "Run multi-room child test, capture full logs, generate voucher, and cancel booking.",
  },
  {
    title: "Hotels voucher sample",
    href: "hotels/voucher-sample",
    text: "Accommodation voucher with multi-room, different occupancy, child age, price, and cancellation status.",
  },
];

export default function HotelbedsCertificationEvidencePage({
  params,
}: {
  params: { locale: string };
}) {
  const base = `/${params.locale}/admin/hotelbeds`;

  return (
    <div className="mx-auto max-w-6xl space-y-6 text-[#0F172A]">
      <section className="rounded-[2rem] border border-orange-200 bg-orange-50 p-6">
        <p className="text-sm font-black text-[#F97316]">Hotelbeds certification evidence</p>
        <h1 className="mt-2 text-3xl font-black">Hotelbeds tester dashboard</h1>
        <p className="mt-3 max-w-3xl text-sm font-bold text-slate-700">
          This page is for Hotelbeds certification evidence only. It does not run booking calls on load and does not expose TBO tests.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={`${base}/${card.href}`}
            className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-orange-300"
          >
            <h2 className="text-lg font-black">{card.title}</h2>
            <p className="mt-2 text-sm font-bold text-slate-500">{card.text}</p>
          </Link>
        ))}
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">Accommodation workflow notes</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Note title="AvailabilityRQ" text="Sent when the customer searches or modifies search criteria." />
          <Note title="CheckRateRQ" text="Sent after selecting a room/rate and before confirming the booking." />
          <Note title="BookingRQ" text="Sent only after confirming traveler details and the selected rate remains bookable." />
          <Note title="BookingDetails / Cancellation" text="Available through Hotelbeds Accommodation endpoints for evidence and final status." />
          <Note title="Multiple suppliers" text="Hotelbeds products are identified internally with supplier = hotelbeds or supplierName = Hotelbeds Accommodation/Transfers/Activities." />
          <Note title="Payment" text="Certification/test environment does not capture production payment. Test flow is isolated for Hotelbeds certification." />
          <Note title="Business rules" text="No destinations, rooms, boards, or hotels are intentionally excluded unless supplier availability or technical validity requires it." />
          <Note title="Tester isolation" text="Hotelbeds tester mode is prepared to show Hotelbeds content only, without TBO certification links." />
        </div>
      </section>
    </div>
  );
}

function Note({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="font-black">{title}</p>
      <p className="mt-1 text-sm font-bold text-slate-600">{text}</p>
    </div>
  );
}
