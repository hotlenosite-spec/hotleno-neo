# تقرير تعريب النصوص الظاهرة

تاريخ التقرير: 2026-05-25

تم الاعتماد على الكود الحالي فقط، ولم يتم الاعتماد على README. لم يتم تغيير التصميم أو الألوان أو توزيع العناصر، ولم يتم تغيير أسماء المتغيرات أو الملفات أو routes. لم يتم تفعيل Stripe live، ولم يتم استخدام أي API حقيقي للموردين.

## الملفات التي تم تعريبها

- `app/[locale]/dev/pages/page.tsx`
- `app/[locale]/agency/dashboard/page.tsx`
- `app/[locale]/agency/bookings/page.tsx`
- `app/[locale]/agency/wallet/page.tsx`
- `app/[locale]/agency/commission/page.tsx`
- `app/[locale]/agency/users/page.tsx`
- `app/[locale]/agency/reports/page.tsx`
- `app/[locale]/hotel-owner/register/page.tsx`
- `app/[locale]/hotel-owner/dashboard/page.tsx`
- `app/[locale]/hotel-owner/properties/page.tsx`
- `app/[locale]/hotel-owner/rooms/page.tsx`
- `app/[locale]/hotel-owner/pricing/page.tsx`
- `app/[locale]/hotel-owner/availability/page.tsx`
- `app/[locale]/hotel-owner/images/page.tsx`
- `app/[locale]/admin/settings/page.tsx`
- `app/[locale]/admin/bookings/page.tsx`
- `app/[locale]/profile/page.tsx`
- `app/[locale]/booking/confirmation/page.tsx`

## ما تم تغييره

- ترجمة النصوص الظاهرة مباشرة داخل JSX والـ arrays المحلية إلى العربية.
- تعريب حالات Developer Preview إلى "معاينة المطور".
- تعريب مصطلحات Agency وWallet وCommission وBookings وHotel Owner Portal وProperties وRooms وPricing وAvailability وReports.
- الإبقاء على المسارات، أسماء المتغيرات، قيم status الداخلية، وقيم النماذج كما هي.
- تعريب الحالات الفارغة بوضوح بدون إضافة بيانات وهمية مضللة.

## النصوص الإنجليزية المتبقية

بقيت بعض الكلمات أو الرموز اللاتينية لأنها أسماء تقنية أو علامات أو قيم نظامية وليست نصوص واجهة عادية:

- `HOTLENO`
- `Stripe`
- `B2B`
- `API`
- `MongoDB`
- `localStorage`
- متغيرات البيئة مثل `NEXT_PUBLIC_DEV_PREVIEW_ALL_PAGES`
- رموز العملات مثل `USD`, `EUR`, `GBP`, `AED`
- بعض معرفات تقنية داخل صفحة الأدمن مثل `supplierHotelId` و`supplierRateKey` عند عرضها مع شرح عربي.

## نتائج الفحوصات

تم تشغيل:

```text
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

النتائج:

- `lint`: ناجح.
- `typecheck`: ناجح.
- `build`: ناجح.

ظهر تحذير غير مانع أثناء البناء:

```text
baseline-browser-mapping data is over two months old
```

هذا التحذير لا يمنع التشغيل أو البناء.
