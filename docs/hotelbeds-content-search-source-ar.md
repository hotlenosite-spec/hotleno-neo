# تقرير مصدر بحث Hotelbeds للوجهات

## سبب التعديل

التعديل السابق جعل خانة الوجهة تعتمد على MongoDB فقط. هذا مناسب لاحقًا بعد استيراد بيانات Hotelbeds Content API إلى قاعدة بيانات محلية، لكنه غير مناسب الآن لأن بيئة التطوير لا تملك قاعدة MongoDB جاهزة أو ممتلئة ببيانات Hotelbeds.

تم تعديل المنطق ليحافظ على MongoDB كمصدر مستقبلي، ويضيف خيار استخدام Hotelbeds Content API مباشرة في التطوير بدون أي قوائم ثابتة أو بيانات وهمية.

## كيف يعمل البحث الآن بدون قاعدة بيانات

تمت إضافة مصدر بحث قابل للضبط عبر:

```env
HOTELBEDS_CONTENT_SEARCH_SOURCE=api
```

القيم المدعومة:

- `api`: يستخدم Hotelbeds Content API مباشرة.
- `database`: يستخدم MongoDB فقط.
- `auto`: يحاول MongoDB أولًا، وإذا لم تتوفر نتائج أو فشل الاتصال، يستخدم Content API مباشرة في development فقط.

القيمة الحالية في `.env.local`:

```env
HOTELBEDS_CONTENT_SEARCH_SOURCE=api
```

بهذا الوضع يستطيع حقل الوجهة في الصفحة الرئيسية جلب اقتراحات من Hotelbeds Content API مباشرة أثناء التطوير، بدون الحاجة إلى MongoDB.

## مصدر بيانات Autocomplete

المصدر الآن يمر عبر route داخلي:

`GET /api/integrations/hotelbeds/content/search?query=...`

هذا route يستدعي:

- MongoDB عند اختيار `database`.
- Hotelbeds Content API عند اختيار `api`.
- MongoDB ثم Hotelbeds Content API في development عند اختيار `auto`.

عند استخدام Content API مباشرة يتم طلب:

- `getHotels`
- `getDestinations`
- `getCountries`

ثم تحويل النتائج إلى الشكل المستخدم في الواجهة:

- `label`
- `type`
- `hotelCode`
- `destinationCode`
- `countryCode`
- `zoneCode`

لا توجد أي قائمة مدن أو دول ثابتة داخل الكود.

## الكاش

تمت إضافة كاش ذاكرة بسيط لاقتراحات autocomplete لمدة 30 دقيقة.

الهدف هو تقليل طلبات Hotelbeds Content API أثناء التطوير عند تكرار نفس البحث.

## ماذا يحدث عند فشل MongoDB أو Content API؟

إذا لم تتوفر MongoDB ولم ينجح Content API، يرجع route قائمة فارغة وتعرض الواجهة:

`لا توجد نتائج مطابقة`

ولا يتم استخدام أي fallback وهمي.

## ماذا يحدث لاحقًا عند توفر MongoDB؟

بعد استيراد بيانات Hotelbeds Content API إلى MongoDB يمكن تغيير:

```env
HOTELBEDS_CONTENT_SEARCH_SOURCE=database
```

أو استخدام:

```env
HOTELBEDS_CONTENT_SEARCH_SOURCE=auto
```

في هذه الحالة سيحاول النظام قراءة البيانات المخزنة أولًا، وهذا أفضل للإنتاج لتقليل الاستدعاءات المباشرة إلى Hotelbeds Content API.

## الملفات المعدلة

- `.env.example`
- `.env.local.example`
- `.env.local` محلي فقط
- `app/api/integrations/hotelbeds/content/search/route.ts`

## الملفات المضافة

- `lib/suppliers/hotelbeds-content-search.ts`
- `docs/hotelbeds-content-search-source-ar.md`

## ما لم يتغير

- لم يتم تغيير تصميم الصفحة الرئيسية.
- لم يتم استخدام أي بيانات وهمية.
- لم يتم تفعيل Stripe live.
- لم يتم تنفيذ أي حجز حقيقي.
- لم يتم وضع مفاتيح Hotelbeds داخل الكود أو التقارير.
- بقي حقل الوجهة يمرر:
  - `destination`
  - `type`
  - `hotelCode`
  - `destinationCode`
  - `countryCode`
  - `zoneCode`

## نتيجة الفحوصات

- `npm.cmd run lint`: نجح.
- `npm.cmd run typecheck`: نجح.
- `npm.cmd run build`: نجح.

ملاحظة: ظهر تحذير غير مانع أثناء build من حزمة `baseline-browser-mapping` بأنها قديمة، ولم يؤثر على نجاح البناء.
