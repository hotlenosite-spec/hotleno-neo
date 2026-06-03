import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const foundationItems = [
  {
    title: "المسوقون / Affiliates",
    description:
      "نموذج `Affiliate` موجود كبنية أولية لتخزين المسوقين وحالة الحساب ونسبة العمولة.",
  },
  {
    title: "روابط الإحالة",
    description:
      "مسار `/api/affiliate/referral-link` موجود كبداية لإنشاء روابط إحالة، لكنه غير مربوط بتدفق حجز حقيقي الآن.",
  },
  {
    title: "أكواد الخصم",
    description:
      "نموذج `PromoCode` ومسار التحقق موجودان، ولا يتم تطبيق الخصم على checkout الحقيقي حاليًا.",
  },
  {
    title: "الإحالات",
    description:
      "نموذج `Referral` جاهز لتسجيل الزيارات والإحالات، وسيحتاج ربطًا واضحًا بالحجز لاحقًا.",
  },
  {
    title: "العمولات",
    description:
      "نموذج `AffiliateCommission` موجود، لكن احتساب العمولة الحقيقي مؤجل حتى تأكيد حجز المورد.",
  },
  {
    title: "حالة الدفع / Payouts لاحقًا",
    description:
      "لا يوجد payout حقيقي الآن، ولا توجد أي عملية دفع أو تحويل مرتبطة بهذه الصفحة.",
  },
];

const lifecycleItems = [
  "تسجيل المسوق واعتماده من الأدمن.",
  "إنشاء رابط إحالة أو كود خصم قابل للتتبع.",
  "تسجيل الزيارة أو الإحالة بدون تنفيذ حجز أو دفع.",
  "ربط الإحالة بالحجز لاحقًا عند اكتمال مسار الحجز الحقيقي.",
  "احتساب العمولة فقط بعد وصول الحجز إلى `supplier_booking_confirmed`.",
  "تجهيز payout لاحق بعد مراجعة العمولات واعتمادها.",
];

const apiItems = [
  {
    title: "إنشاء المسوقين",
    path: "/api/affiliate/affiliates",
    status: "بنية أولية",
  },
  {
    title: "رابط الإحالة",
    path: "/api/affiliate/referral-link",
    status: "بنية أولية",
  },
  {
    title: "التحقق من كود الخصم",
    path: "/api/affiliate/promo-code/validate",
    status: "معلوماتي فقط الآن",
  },
  {
    title: "تتبع الإحالة",
    path: "/api/affiliate/track",
    status: "غير مربوط بالحجز",
  },
  {
    title: "حساب العمولة",
    path: "/api/affiliate/commission/calculate",
    status: "وضع mock فقط",
  },
];

export default function AdminAffiliatesPage() {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-orange-100 bg-[linear-gradient(135deg,#0F172A,#F97316)] p-6 text-white shadow-xl shadow-orange-500/10">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black text-[#f4d58d]">
              إدارة الأفلييت / التسويق بالعمولة
            </div>

            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              نظام الأفلييت
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
              واجهة إدارية لمراجعة بنية التسويق بالعمولة وتجهيز الربط لاحقًا
              بدون ربط فعلي بالحجوزات أو الدفع.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <HeroMiniCard title="الحالة" value="معاينة" />
            <HeroMiniCard title="الدفع" value="غير مفعل" />
            <HeroMiniCard title="الربط" value="لاحقًا" />
          </div>
        </div>
      </section>

      <Card className="border-dashed border-orange-200 bg-orange-50/60">
        <CardContent className="space-y-3 p-5 text-sm leading-7 text-orange-950">
          <Badge variant="secondary">Developer Preview / معاينة المطور</Badge>
          <p>
            نظام الأفلييت مجهز كبنية أولية فقط. لا يرتبط بالحجوزات الحقيقية بعد،
            ولا يتم احتساب أي عمولة من حجز فعلي الآن. سيتم احتساب العمولة لاحقًا
            عند وصول الحجز إلى حالة `supplier_booking_confirmed`. لا يوجد payout
            حقيقي حاليًا.
          </p>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {foundationItems.map((item) => (
          <Card key={item.title} className="rounded-[2rem] border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-lg font-black text-slate-950">
                  {item.title}
                </CardTitle>
                <Badge variant="outline">جاهز كبنية</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-slate-500">
                {item.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-xl font-black text-slate-950">
              ملخص عام
            </CardTitle>
            <p className="mt-1 text-sm font-medium text-slate-500">
              لا توجد بيانات أفلييت حتى الآن. سيتم ربط هذه البيانات بالحجوزات
              المؤكدة لاحقًا.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
            <SummaryRow label="المسوقون" value="لا توجد بيانات" />
            <SummaryRow label="الإحالات" value="لا توجد بيانات" />
            <SummaryRow label="أكواد الخصم" value="غير مطبقة على checkout" />
            <SummaryRow label="العمولات" value="غير محسوبة من حجوزات حقيقية" />
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-xl font-black text-slate-950">
              مسار الربط المتوقع
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-5 text-sm text-slate-600">
            {lifecycleItems.map((item) => (
              <div key={item} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-xl font-black text-slate-950">
            APIs والنماذج الموجودة
          </CardTitle>
          <p className="mt-1 text-sm font-medium text-slate-500">
            هذه العناصر موجودة في الكود، لكن الصفحة لا تستدعيها حتى لا تكسر
            المعاينة أو تتطلب بيانات ومصادقة إضافية.
          </p>
        </CardHeader>
        <CardContent className="p-5">
          <div className="divide-y rounded-2xl border border-slate-100">
            {apiItems.map((item) => (
              <div
                key={item.path}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-black text-slate-950">{item.title}</p>
                  <p className="mt-1 font-mono text-xs text-slate-500">
                    {item.path}
                  </p>
                </div>
                <Badge variant="secondary">{item.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border-dashed border-slate-200 bg-white">
        <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 p-8 text-center">
          <Badge variant="secondary">Empty State</Badge>
          <h2 className="text-2xl font-black text-slate-950">
            لا توجد بيانات أفلييت حتى الآن
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-slate-500">
            سيتم عرض المسوقين وروابط الإحالة وأكواد الخصم والإحالات والعمولات
            هنا بعد ربط النظام بالحجوزات المؤكدة وقواعد الاعتماد والدفع.
          </p>
        </CardContent>
      </Card>
    </div>
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}
