import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const settingCards = [
  {
    title: "نسبة هامش الربح",
    status: "يتحكم بها الأدمن",
    description: "سيتم تطبيق هامش ربح الوكالة عبر طبقة التسعير عند تفعيل دفع B2B.",
  },
  {
    title: "نسبة العمولة",
    status: "يتحكم بها الأدمن",
    description: "سيتم حساب العمولة من بيانات الحجوزات والتسويات الإنتاجية.",
  },
  {
    title: "قواعد العملة",
    status: "جاهز",
    description: "معالجة العملات جاهزة لتتبع إعدادات عملة الوكالة والحجز.",
  },
  {
    title: "الفواتير",
    status: "غير مفعل",
    description: "إنشاء الفواتير غير مفعل عمدًا حتى تكتمل قواعد المحاسبة.",
  },
];

export default function AgencyCommissionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">إعدادات العمولة</h2>
        <p className="text-muted-foreground">
          عناصر جاهزة للمراجعة لقواعد هامش الربح والعمولة والفوترة المستقبلية.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {settingCards.map((item) => (
          <Card key={item.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">{item.status}</Badge>
              <p className="mt-3 text-sm text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>مسار الحساب المستقبلي</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="rounded-lg border bg-muted/30 p-3">
            يتم تسجيل صافي سعر المورد أولًا، ثم يتم حساب هامش ربح الوكالة.
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            يتم تسجيل العمولة بشكل منفصل لأغراض التقارير والتسوية.
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            لا يتم تشغيل أي عمولة أو فاتورة أو عملية محفظة من هذه الصفحة حاليًا.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
