import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const reportSections = [
  {
    title: "رصيد الوكالة",
    description: "سيظهر هنا الرصيد والحجوزات المؤقتة واستخدام الائتمان وتصدير السجل.",
  },
  {
    title: "المبيعات",
    description: "سيتم حساب إجمالي المبيعات وأسعار البيع النهائية من الحجوزات الحقيقية.",
  },
  {
    title: "الحجوزات",
    description: "ستتوفر إحصاءات حجم الحجوزات وحركة الحالات والإلغاءات.",
  },
  {
    title: "العمولة",
    description: "ستعتمد تقارير العمولة وهامش الربح على قواعد الوكالة المهيأة.",
  },
];

export default function AgencyReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">التقارير</h2>
        <p className="text-muted-foreground">
          ستتوفر التقارير المالية والتشغيلية بعد وجود معاملات B2B حقيقية.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {reportSections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">بانتظار البيانات</Badge>
              <p className="mt-3 text-sm text-muted-foreground">
                {section.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
