# تقرير وضع معاينة صفحات المطور

تاريخ التقرير: 2026-05-25

تم الاعتماد على الكود الحالي فقط، ولم يتم الاعتماد على README. لم يتم تفعيل Stripe live، ولم يتم استخدام أي API حقيقي للموردين، ولم يتم تغيير تصميم صفحات العملاء.

## الملفات المعدلة

- `.env.local`
- `.env.example`
- `.env.local.example`
- `lib/security/dev-flags.ts`
- `app/[locale]/dev/pages/page.tsx`
- `app/[locale]/admin/layout.tsx`
- `app/[locale]/agency/layout.tsx`
- `app/[locale]/hotel-owner/layout.tsx`
- `app/[locale]/profile/page.tsx`
- `app/[locale]/booking/checkout/page.tsx`
- `app/[locale]/booking/confirmation/page.tsx`
- `components/features/auth/protected-route.tsx`

## رابط صفحة كل الصفحات

المسار المحلي:

```text
/ar/dev/pages
/en/dev/pages
```

مثال عند تشغيل dev server على المنفذ الافتراضي:

```text
http://localhost:3000/ar/dev/pages
```

الصفحة تعرض روابط منظمة لصفحات العميل، الأدمن، الوكالات، Hotel Owner Portal، الحجز، الملف الشخصي، والصفحات الديناميكية الموجودة داخل `app/[locale]`.

## كيف أشغل وضع المعاينة

في `.env.local` تمت إضافة السطر التالي:

```text
NEXT_PUBLIC_DEV_PREVIEW_ALL_PAGES=true
```

بعد تغيير هذا المتغير يجب إعادة تشغيل dev server:

```text
npm.cmd run dev
```

عند التفعيل يظهر التحذير التالي في كونسول المتصفح عند دخول صفحات المعاينة:

```text
[HOTLENO SECURITY] DEV_PREVIEW_ALL_PAGES is enabled for local development only.
```

## كيف أقفله قبل الإنتاج

في `.env.example` و`.env.local.example` القيمة الافتراضية هي:

```text
NEXT_PUBLIC_DEV_PREVIEW_ALL_PAGES=false
```

قبل الإنتاج يجب أن تكون القيمة غير مفعلة في بيئة النشر:

```text
NEXT_PUBLIC_DEV_PREVIEW_ALL_PAGES=false
```

حتى لو تم ضبطها بالخطأ إلى `true` في production، فإن helper المركزي `isDevPreviewAllPagesEnabled()` يقفلها دائمًا لأن الشرط يتطلب:

```text
process.env.NODE_ENV !== "production"
NEXT_PUBLIC_DEV_PREVIEW_ALL_PAGES=true
```

## ملاحظات أمنية وسلوكية

- الحماية الأصلية لم تُحذف.
- تم إضافة bypass محلي للمعاينة فقط أثناء development.
- صفحات الأدمن والوكالات وصاحب الفندق يمكن فتحها محليًا للمعاينة بدون حسابات حقيقية عند تفعيل المتغير.
- صفحة الملف الشخصي وصفحات الحجز التي تحتاج بيانات حقيقية تعرض Developer Preview أو Empty State واضح بدل حقن بيانات وهمية مضللة.
- لا يوجد اتصال Stripe live.
- لا يوجد استدعاء مزودين حقيقيين بسبب هذا التغيير.

## نتائج التحقق

تم تشغيل:

```text
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

النتائج:

- `lint`: ناجح.
- `typecheck`: ناجح.
- `build`: ناجح، وظهر المسار الجديد `/[locale]/dev/pages`.
- فحص صفحة الفهرس على dev server المحلي أعاد HTTP `200` من:
  - `http://localhost:3000/ar/dev/pages`

ملاحظة: كان هناك dev server يعمل مسبقًا على المنفذ `3000`. محاولة تشغيل نسخة ثانية انتقلت إلى `3001` ثم توقفت بسبب lock الخاص بـ `.next/dev/lock` لأن نسخة أخرى من `next dev` كانت تعمل بالفعل.

تحذير غير مانع ظهر أثناء البناء:

```text
baseline-browser-mapping data is over two months old
```

هذا التحذير لا يمنع التشغيل أو البناء.
