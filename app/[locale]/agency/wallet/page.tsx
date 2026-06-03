import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const walletItems = [
  {
    title: "الرصيد المتاح",
    status: "غير مهيأ",
    description: "لن يظهر رصيد الوكالة حتى يتم ربط المحفظة الإنتاجية.",
  },
  {
    title: "حد الائتمان",
    status: "غير مهيأ",
    description: "سيتم التحكم بحدود الائتمان من إعدادات الأدمن قبل أي خصم B2B.",
  },
  {
    title: "الحجوزات المؤقتة النشطة",
    status: "لا يوجد",
    description: "ستظهر حجوزات المبالغ المستقبلية هنا دون تنفيذ حجز المورد مبكرًا.",
  },
  {
    title: "تسويات معلقة",
    status: "لا يوجد",
    description: "سيتم حساب حالات التسوية والفواتير من المعاملات الحقيقية.",
  },
];

export default function AgencyWalletPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">المحفظة / الائتمان</h2>
        <p className="text-muted-foreground">
          مساحة جاهزة لرصيد الوكالة وحدود الائتمان والحجوزات المؤقتة وحركة السجل.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {walletItems.map((item) => (
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
          <CardTitle>السجل المالي</CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
          <Badge variant="secondary">فارغ</Badge>
          <h3 className="text-xl font-semibold">لا توجد حركات محفظة بعد</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            ستظهر هنا عمليات الخصم والإضافة والحجز والتحرير والاسترداد والتسوية
            بعد ربط مسار محفظة B2B النهائي.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
