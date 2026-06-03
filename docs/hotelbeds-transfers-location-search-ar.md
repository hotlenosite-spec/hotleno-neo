# تقرير ربط بحث مواقع Hotelbeds Transfers

## ملخص التنفيذ

تم ربط بحث مواقع النقل في صفحة `/ar/transfers` مع Hotelbeds Transfers Cache API بشكل منفصل عن Hotelbeds Hotel API. لم يتم تفعيل الحجز الحقيقي، ولم يتم تفعيل Stripe live، ولم يتم استخدام مفاتيح الفنادق.

## endpoints الرسمية المستخدمة

تم تجهيز البحث اعتمادًا على توثيق Hotelbeds Transfers:

- Transfers Cache API - Destinations:
  `GET /locations/destinations`
- Transfers Cache API - Terminals:
  `GET /locations/terminals`
- Transfers Booking API - Availability Simple:
  مستخدم سابقًا للبحث عن التوفر فقط، وليس للحجز.

## الملفات المعدلة والمضافة

- `.env.example`
- `.env.local.example`
- `.env.local` محليًا فقط لإضافة `HOTELBEDS_TRANSFERS_CACHE_BASE_URL`
- `types/transfers.ts`
- `lib/suppliers/hotelbeds-transfers-auth.ts`
- `lib/suppliers/hotelbeds-transfers-client.ts`
- `app/api/transfers/locations/search/route.ts`
- `app/[locale]/transfers/page.tsx`
- `docs/hotelbeds-transfers-location-search-ar.md`

## كيف تعمل حقول From و To الآن

حقلا `من` و`إلى` في صفحة النقل لم يعودا يطلبان الأكواد من المستخدم في الواجهة الأساسية.

عند الكتابة في أي حقل:

- يتم استدعاء:
  `GET /api/transfers/locations/search?query=...`
- يستدعي هذا route:
  - `GET /locations/terminals`
  - `GET /locations/destinations`
- يتم فلترة النتائج محليًا حسب الاسم والكود والمدينة والدولة عند توفرها.
- عند اختيار اقتراح، يتم حفظ الكود داخليًا لاستخدامه في بحث Availability.

## شكل الاقتراحات الموحد

يرجع route البحث اقتراحات بالشكل التالي بدون أسرار:

```json
{
  "label": "El Prat Airport, Barcelona",
  "value": "BCN",
  "code": "BCN",
  "type": "terminal",
  "subType": "airport",
  "countryCode": "ES",
  "destinationCode": "BCN"
}
```

للوجهات:

```json
{
  "label": "Barcelona",
  "value": "BCN",
  "code": "BCN",
  "type": "destination",
  "countryCode": "ES"
}
```

## حفظ الأكواد داخليًا

عند اختيار موقع من الاقتراحات، يتم حفظ:

- `label`
- `code`
- `type`
- `subType`
- `countryCode`
- `destinationCode`
- `codeType`

ثم يتم إرسالها إلى `POST /api/transfers/search` بالشكل المناسب لطبقة Availability Simple.

## ماذا يحدث إذا فشل API

إذا فشل Hotelbeds Transfers Cache API، يرجع route:

```json
{
  "success": false,
  "error": "HOTELBEDS_TRANSFERS_LOCATION_SEARCH_FAILED"
}
```

وتعرض الصفحة رسالة عربية:

`تعذر جلب مواقع النقل من Hotelbeds Transfers مؤقتًا`

لا يتم كسر الصفحة ولا يتم استخدام mock أو قوائم ثابتة.

## تقليل استهلاك الكوتا

- تمت إضافة memory cache لمدة 30 دقيقة داخل route البحث عن المواقع.
- تم إبقاء limit الافتراضي 20.
- تمت إضافة debounce في الصفحة لمدة 350ms قبل استدعاء البحث.
- لا يتم الاستدعاء إذا كان نص البحث أقل من حرفين.
- لا يتم جلب كل العالم دفعة واحدة.

ملاحظة: إذا كانت Cache API لا تدعم بحثًا نصيًا مباشرًا وتحتاج pagination/codes فقط، فالربط الحالي يجلب صفحة صغيرة ويفلتر محليًا. البحث الكامل عالي الجودة يحتاج لاحقًا مزامنة cache دورية محلية لبيانات destinations وterminals.

## ما الذي ما زال ينتظر الحجز الحقيقي

- لم يتم تفعيل `HOTELBEDS_TRANSFERS_BOOKING_ENABLED`.
- لم يتم تنفيذ أي حجز Transfers حقيقي.
- لم يتم تفعيل Stripe live.
- الحجز الحقيقي يحتاج مراجعة منفصلة بعد اعتماد البحث والتوفر.

## نتيجة الفحوصات

- `npm.cmd run lint`: نجح.
- `npm.cmd run typecheck`: نجح.
- `npm.cmd run build`: نجح.

ملاحظة: ظهر تحذير غير مانع أثناء build من `baseline-browser-mapping` بأنه قديم، ولم يؤثر على نجاح البناء.
