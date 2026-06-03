# تقرير ربط محتوى Hotelbeds بنتائج البحث وصفحة الفندق

## ملخص التنفيذ

تم ربط Hotelbeds Content API كطبقة إثراء اختيارية فوق نتائج البحث، بدون تفعيل Booking API الحقيقي وبدون تنفيذ أي حجز حقيقي.

الإثراء يعمل فقط على نتائج المورد `hotelbeds`، ويحافظ على الأسعار والغرف والعروض كما جاءت من طبقة المورد الحالية.

## الملفات التي تم تعديلها

- `app/api/hotels/search/route.ts`
- `lib/hotels/normalize-hotels.ts`
- `lib/suppliers/types.ts`
- `types/travellanda.ts`
- `components/hotel/hotel-card.tsx`
- `app/[locale]/hotel/[hotelId]/page.tsx`

## الملفات التي تم إضافتها

- `lib/suppliers/hotelbeds-content-enrichment.ts`
- `docs/hotelbeds-content-enrichment-ar.md`

## طبقة إثراء محتوى Hotelbeds

تمت إضافة ملف:

`lib/suppliers/hotelbeds-content-enrichment.ts`

ويحتوي على الدوال التالية:

- `enrichHotelbedsHotelsWithContent`
- `enrichHotelbedsHotelWithContent`
- `mapHotelbedsContentToUnifiedHotel`

وظيفة هذه الطبقة:

- قراءة hotel code من نتيجة Hotelbeds.
- طلب تفاصيل الفندق من Hotelbeds Content API باستخدام `getHotelDetails`.
- إضافة بيانات المحتوى إلى شكل الفندق الموحد.
- استخدام كاش في الذاكرة لمدة 6 ساعات.
- تجاهل فشل Content API وإرجاع النتائج الأصلية كما هي.
- عدم رمي خطأ إذا كانت مفاتيح Hotelbeds غير موجودة.

## كيف تم ربط الصور والتفاصيل

حسب توثيق Hotelbeds، الصور القادمة من `/hotels` أو `hoteldetails` لا تأتي كرابط كامل، بل كمسار صورة فقط. لذلك يتم بناء الرابط باستخدام:

`https://photos.hotelbeds.com/giata/bigger/{path}`

تم ترتيب الصور حسب `visualOrder` ثم `order` عند توفرها، لأن توثيق Hotelbeds يوضح أن `visualOrder = 0` يمثل غالبًا الصورة الرئيسية.

تم تحويل الصور إلى الشكل الحالي الذي تستخدمه الواجهة:

```ts
Images: [{ Url, Description }]
```

وتم تحويل المرافق إلى:

```ts
Facilities: string[]
```

كما تم تمرير:

- `Description`
- `Address`
- `CityName`
- `CountryName`
- `Latitude`
- `Longitude`
- `StarRating`

عند توفرها في Content API.

## ربط نتائج البحث

تم تعديل `app/api/hotels/search/route.ts` بحيث يتم إثراء نتائج Hotelbeds قبل تحويلها إلى شكل Travellanda القديم المستخدم في الواجهة.

تم الحفاظ على:

- `Options`
- `supplierOffers`
- `bestPrice`
- الأسعار
- العملة
- الغرف
- سياسات الإلغاء الموجودة في نتائج المورد

إذا فشل Content API، يرجع البحث كما كان قبل هذا التعديل.

## صفحة الفندق

صفحة:

`app/[locale]/hotel/[hotelId]/page.tsx`

أصبحت تستخدم `Description` و`Images` القادمة من نتيجة البحث المحفوظة في `selectedHotel` إذا كانت موجودة.

لم يتم تغيير تصميم الصفحة أو توزيعها.

إذا لم تكن البيانات موجودة، يستمر السلوك الحالي ويظهر المحتوى المتاح أو الحالة الفارغة الحالية.

## بطاقات الفنادق

تم تعديل:

`components/hotel/hotel-card.tsx`

لكي تستخدم الصور الموجودة في نتيجة البحث مباشرة عند توفرها، بدل طلب تفاصيل إضافية من `/api/travellanda`.

إذا لم توجد صور في نتيجة البحث، يبقى السلوك القديم كما هو ويحاول تحميل الصور بالطريقة السابقة.

## ماذا يحدث إذا فشل Content API

في الحالات التالية لا يفشل البحث:

- عدم وجود `HOTELBEDS_API_KEY` أو `HOTELBEDS_SECRET`.
- خطأ شبكة.
- انتهاء المهلة.
- رد غير صالح من Hotelbeds.
- رفض 401 أو 403.
- عدم وجود محتوى للفندق.

يتم تسجيل تحذير آمن في الكونسول مثل:

`[Hotelbeds Content] enrichment skipped`

ولا يتم تسجيل:

- `HOTELBEDS_API_KEY`
- `HOTELBEDS_SECRET`
- `X-Signature`

## الكاش

تمت إضافة كاش بسيط في الذاكرة داخل طبقة الإثراء:

- TTL: ست ساعات.
- لا يوجد Redis.
- لا يوجد تخزين دائم.
- الهدف تقليل طلبات Content API أثناء التطوير والاختبار.

يوجد حد افتراضي لإثراء أول 25 فندقًا من Hotelbeds في نتيجة البحث لتجنب الطلبات الزائدة.

يمكن تغييره عبر:

```env
HOTELBEDS_CONTENT_ENRICHMENT_LIMIT=25
```

## ما تم تطبيقه تحديدًا من التوثيق الرسمي

اعتمد التنفيذ على Hotelbeds Content API الرسمي:

`https://developer.hotelbeds.com/documentation/hotels/content-api/api-reference/`

وتم تطبيق التالي:

- استخدام Content API كمصدر للبيانات الثابتة للفندق.
- استخدام عملية تفاصيل الفندق `hoteldetails` لجلب الصور والوصف والعنوان والمرافق.
- استخدام حقول `fields=all` و`language=ENG`.
- استخدام بيانات `images` عند توفرها.
- بناء روابط الصور من مسار Hotelbeds حسب توثيق الصور الرسمي.
- عدم استخدام Content API كبديل للحجز أو الدفع.
- عدم استخدام Booking API الحقيقي.

مراجع Hotelbeds الرسمية ذات الصلة:

- `https://developer.hotelbeds.com/documentation/hotels/content-api/api-reference/`
- `https://developer.hotelbeds.com/documentation/hotels/content-api/`
- `https://developer.hotelbeds.com/documentation/hotels/content-api/how-use-content-api/`
- `https://developer.hotelbeds.com/documentation/hotels/content-api/use-images/`

## هل بحث العملاء يستخدم الصور والتفاصيل الآن؟

نعم، عند توفر نتائج من المورد `hotelbeds` ومفاتيح Hotelbeds صالحة، يحاول البحث إثراء النتائج بمحتوى Hotelbeds.

الصور والتفاصيل تظهر في نفس الحقول التي تستخدمها الواجهة الحالية:

- `Images`
- `Facilities`
- `Description`
- `Address`
- `CityName`
- `CountryName`

إذا فشل الإثراء، تبقى نتائج البحث قابلة للاستخدام بنفس الشكل السابق.

## ما الذي ينتظر Go Live / Booking API

- تفعيل مزود Hotelbeds الحقيقي للبحث الديناميكي عندما يصبح جاهزًا.
- ربط مزامنة Content API بقاعدة بيانات دائمة بدل الكاش المؤقت.
- جدولة batch sync كما توصي Hotelbeds بدل الاعتماد على استدعاءات لحظية.
- مراجعة حدود الطلبات وصلاحيات الحساب قبل الإنتاج.
- تفعيل Booking API لاحقًا فقط بعد الاعتماد، ولم يتم ذلك الآن.

## ملاحظات قبل الإنتاج

- Hotelbeds توصي باستخدام Content API كعملية تحميل وتحديث دوري للبيانات الثابتة، وليس كاستدعاء لحظي كثيف من تجربة العميل.
- الكاش الحالي مناسب للتطوير والاختبار فقط.
- قبل الإنتاج الأفضل إنشاء جدول/مجموعة تخزين للمحتوى وتحديثها دوريًا.
- يجب ضبط `HOTELBEDS_CONTENT_ENRICHMENT_LIMIT` بعناية إذا تم استخدام الإثراء الحي مؤقتًا.
- يجب عدم طباعة أي headers حساسة في logs الإنتاج.

## نتيجة الفحوصات

- `npm.cmd run lint`: نجح.
- `npm.cmd run typecheck`: نجح.
- `npm.cmd run build`: نجح.

ملاحظة: ظهر تحذير غير مانع أثناء build من حزمة `baseline-browser-mapping` بأنها قديمة، ولم يؤثر على نجاح البناء.
