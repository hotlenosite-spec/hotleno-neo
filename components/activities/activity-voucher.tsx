import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ActivityVoucher as ActivityVoucherType } from "@/types/activities";

function listValue(values?: string[]) {
  return values?.length ? values.join("، ") : "-";
}

export function ActivityVoucher({ voucher }: { voucher: ActivityVoucherType }) {
  const officialVouchers = voucher.officialVouchers?.filter((item) => item.url) || [];

  if (officialVouchers.length > 0) {
    return (
      <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 text-[#0F172A]">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Badge className="bg-emerald-600 text-white">Official Hotelbeds voucher</Badge>
          <Badge variant="outline">Supplier: Hotelbeds Activities</Badge>
        </div>
        <h2 className="text-2xl font-black">التذكرة الرسمية للدخول</h2>
        <p className="mt-3 text-sm font-bold text-emerald-800">
          عاد Hotelbeds بقسيمة رسمية. يجب استخدام ملف PDF/الرابط الرسمي بدل إنشاء فاتشر داخلي بديل.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {officialVouchers.map((file, index) => (
            <Button key={`${file.url}-${index}`} asChild className="rounded-2xl bg-emerald-700 text-white hover:bg-emerald-800">
              <a href={file.url} target="_blank" rel="noreferrer">
                فتح / تحميل التذكرة الرسمية {index + 1}
              </a>
            </Button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-orange-200 bg-orange-50 p-6 text-[#0F172A]">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge className="bg-[#F97316] text-white">Internal voucher</Badge>
        <Badge variant="outline">Supplier: Hotelbeds Activities</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Info label="Booking reference" value={voucher.bookingReference} />
        <Info label="Client reference" value={voucher.clientReference} />
        <Info label="Confirmation date" value={voucher.confirmationDate} />
        <Info label="Activity" value={voucher.activityName} />
        <Info label="Date from/to" value={[voucher.dateFrom, voucher.dateTo].filter(Boolean).join(" - ")} />
        <Info label="Modality" value={voucher.modalityName} />
        <Info label="Destination" value={voucher.destinationName} />
        <Info label="Selected language" value={voucher.selectedLanguage} />
        <Info label="Selected session" value={voucher.selectedSession} />
        <Info label="Holder" value={`${voucher.holder?.name || ""} ${voucher.holder?.surname || ""}`.trim()} />
        <Info label="Children ages" value={voucher.childrenAges?.join(", ")} />
        <Info label="Provider" value={voucher.providerInfo || voucher.supplierInfo} />
      </div>

      <TextBlock title="Pax distribution" text={voucher.paxes?.map((pax) => `Age ${pax.age}`).join("، ")} />
      <TextBlock title="Contract remarks / redeem information" text={listValue([...(voucher.contractRemarks || []), ...(voucher.redeemInformation || [])])} />
      <TextBlock
        title="Cancellation policies"
        text={voucher.cancellationPolicies
          ?.map((policy) =>
            policy.amount !== undefined && policy.currency
              ? `${policy.amount} ${policy.currency} from ${policy.from || "-"}`
              : policy.description || "Cancellation policy available",
          )
          .join("، ")}
      />
    </section>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="text-xs font-black uppercase tracking-normal text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-black">{value || "-"}</p>
    </div>
  );
}

function TextBlock({ title, text }: { title: string; text?: string }) {
  if (!text) return null;

  return (
    <div className="mt-5 rounded-2xl bg-white p-4">
      <p className="text-sm font-black text-slate-500">{title}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm font-bold leading-7">{text}</p>
    </div>
  );
}
