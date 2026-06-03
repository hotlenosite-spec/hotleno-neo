import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const overviewCards = [
  {
    label: "الحجوزات",
    status: "لا يوجد نشاط",
    description: "ستظهر هنا الحجوزات المرتبطة بالوكالة بعد تفعيل دفع B2B.",
  },
  {
    label: "المحفظة / الائتمان",
    status: "غير مهيأ",
    description: "حدود الائتمان والحجوزات المؤقتة وحركات الرصيد جاهزة للإعداد لاحقًا.",
  },
  {
    label: "العمولة",
    status: "غير مهيأ",
    description: "قواعد هامش الربح والعمولة ظاهرة في مساحة عمل العمولة.",
  },
  {
    label: "التقارير",
    status: "بانتظار البيانات",
    description: "تبقى التقارير فارغة حتى يتم تسجيل معاملات وكالة حقيقية.",
  },
];

const workflowItems = [
  "البحث وعرض الأسعار يتمان عبر طبقة الموردين الموحدة.",
  "إنشاء حجوزات الوكالة يتم فقط بعد تفعيل دفع B2B أو قواعد الائتمان.",
  "تتبع المحفظة والعمولة وقيود السجل سيتم من أحداث الحجز الإنتاجية.",
];

export default function AgencyDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">لوحة التحكم</h2>
        <p className="text-muted-foreground">
          ستظهر نظرة عامة على الوكالة هنا بعد تفعيل مسارات حجوزات B2B.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {overviewCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">{card.status}</Badge>
              <p className="mt-3 text-sm text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>جاهزية التشغيل</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {workflowItems.map((item) => (
              <div key={item} className="rounded-lg border bg-muted/30 p-3">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>الوضع الحالي</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <Badge variant="outline">حالة محلية مؤقتة</Badge>
            <p>
              لا يوجد حجز مورد أو دفع Stripe live أو خصم من المحفظة أو إجراء ائتماني
              للوكالة مفعل من هذه البوابة حتى الآن.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
