import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const agencyRoles = [
  {
    role: "مالك الوكالة",
    description: "يدير إعدادات الوكالة والمستخدمين وصلاحيات الائتمان المستقبلية.",
  },
  {
    role: "مدير الوكالة",
    description: "يمكنه إدارة المستخدمين التشغيليين باستثناء صلاحيات المالك.",
  },
  {
    role: "موظف الوكالة",
    description: "جاهز لمسارات البحث وعرض الأسعار والحجز.",
  },
  {
    role: "محاسب الوكالة",
    description: "جاهز للفواتير والمحفظة والعمولة والتقارير.",
  },
];

export default function AgencyUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">مستخدمو الوكالة</h2>
        <p className="text-muted-foreground">
          ستتم إضافة إدارة مستخدمي الوكالة بعد اعتماد صلاحيات الوكالات.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {agencyRoles.map((item) => (
          <Card key={item.role}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{item.role}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline">دور جاهز</Badge>
              <p className="mt-3 text-sm text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>وصول الفريق</CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
          <Badge variant="secondary">حالة مؤقتة</Badge>
          <h3 className="text-xl font-semibold">لم يتم تحميل بيانات الفريق</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            هذه الحالة المؤقتة لا تجلب المستخدمين. يجب أن يقيّد التنفيذ المستقبلي
            كل استعلام بوكالة المستخدم المصادق عليه.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
