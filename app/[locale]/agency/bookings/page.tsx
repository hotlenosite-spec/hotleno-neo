import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const bookingViews = [
  "بانتظار الدفع",
  "تم الدفع",
  "قيد معالجة المورد",
  "مراجعة يدوية",
  "ملغي",
];

export default function AgencyBookingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">حجوزات الوكالة</h2>
        <p className="text-muted-foreground">
          هذه الصفحة مخصصة للحجوزات المرتبطة بالوكالة الحالية فقط.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {bookingViews.map((view) => (
          <Card key={view}>
            <CardContent className="p-4">
              <p className="text-sm font-medium">{view}</p>
              <Badge className="mt-3" variant="secondary">
                فارغ
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الحجوزات</CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
          <Badge variant="secondary">فارغ</Badge>
          <h3 className="text-xl font-semibold">لا توجد حجوزات وكالة للعرض</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            إنشاء حجوزات B2B غير مفعل بعد. عند إضافته، يجب أن تستعلم هذه الصفحة
            عن السجلات التابعة لوكالة المستخدم المصادق عليه فقط.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
