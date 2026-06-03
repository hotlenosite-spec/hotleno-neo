# تقرير جاهزية Hotleno قبل تكامل الموردين

تاريخ التقرير: 2026-05-24

هذا التقرير مبني على فحص الكود الحالي فقط، وليس على README.

## 1. ما أصبح جاهزًا قبل وصول مفاتيح الموردين

### دورة الحجز والدفع

- يوجد موديل `Booking` جاهز لدورة تجارية آمنة: إنشاء حجز داخلي، انتظار الدفع، نجاح الدفع، معالجة حجز المورد، تأكيد المورد، الفشل، المراجعة اليدوية، الإلغاء، والاسترجاع.
- يوجد `Booking Orchestrator` في `lib/booking/booking-orchestrator.ts` لتشغيل حجز المورد بعد نجاح الدفع فقط.
- لا يتم تنفيذ حجز مورد قبل الدفع.
- يوجد نظام retry و idempotency داخل الحجز عبر `idempotencyKey`, `retryCount`, `maxRetryCount`, `lastRetryAt`, و `lastFailureReason`.
- يوجد نظام إلغاء تجريبي في `lib/booking/cancellation-service.ts` مع حالة `cancellation_requested` و `refund_pending`.
- الإلغاء يستخدم mock supplier فقط في التطوير، ولا ينفذ refund حقيقي.

### Stripe test flow

- Stripe checkout موجود في `app/api/payments/stripe/checkout/route.ts`.
- Stripe webhook موجود في `app/api/payments/stripe/webhook/route.ts`.
- webhook يعتمد على `bookingId` من metadata، ولا يحدّث حجزًا بدون `bookingId` واضح.
- Stripe محصور في test mode عبر `STRIPE_MODE` أو `STRIPE_ENV`.
- `STRIPE_CHECKOUT_ENABLED` يتحكم بتفعيل إنشاء Checkout Session.

### Supplier Layer

- طبقة الموردين موجودة في `lib/suppliers`.
- الواجهة الموحدة موجودة في `lib/suppliers/types.ts`.
- مزودو Hotelbeds وTBO وTravellanda موجودون كـ stubs ترجع mock responses موحدة:
  - `lib/suppliers/hotelbeds-provider.ts`
  - `lib/suppliers/tbo-provider.ts`
  - `lib/suppliers/travellanda-provider.ts`
- mock provider موجود في `lib/suppliers/mock-provider.ts`.
- اختيار المورد يتم عبر `SUPPLIER_PROVIDER` أو `SUPPLIER_PROVIDERS`.
- mock ممنوع في production داخل `getConfiguredSupplierProvider` وفي mock provider نفسه.

### البحث الموحد والفشل الجزئي

- API البحث الموحد موجود في `app/api/hotels/search/route.ts`.
- البحث يدعم أكثر من مورد عبر `SUPPLIER_PROVIDERS`.
- إذا فشل مورد أو انتهت مهلة انتظاره، لا يفشل البحث بالكامل.
- يتم تسجيل حالة كل مورد في `SupplierLog` بحالات: success, failed, timeout, skipped.
- مهلة المورد قابلة للتعديل عبر `SUPPLIER_SEARCH_TIMEOUT_MS`.
- يوجد normalize لنتائج الفنادق في `lib/hotels/normalize-hotels.ts` لدمج عروض الموردين وترتيب النتائج.

### B2B ووكالات السفر

- يوجد موديل `Agency`.
- يوجد ربط للمستخدمين بالوكالات عبر `agencyId` و`agencyRole`.
- توجد APIs B2B:
  - `/api/b2b/search`
  - `/api/b2b/availability`
  - `/api/b2b/booking`
  - `/api/b2b/booking-status`
  - `/api/b2b/cancel`
- B2B يستخدم API key authentication وrate limiting.
- لا يتم تنفيذ حجز مورد حقيقي من B2B الآن.

### Hotel Owner Portal

- توجد موديلات للفنادق الداخلية:
  - `HotelPartner`
  - `HotelProperty`
  - `HotelRoom`
  - `HotelRoomAvailability`
  - `HotelRoomRate`
- Booking يدعم مستقبلًا `inventorySource=hotel_partner`.
- بوابة صاحب الفندق موجودة كواجهة محلية فقط ولا تنشر الفنادق في بحث العملاء.

### السجلات والإشعارات

- توجد سجلات:
  - `BookingLog`
  - `PaymentLog`
  - `SupplierLog`
  - `AdminActionLog`
- توجد قوالب إشعارات mock في `lib/notifications`.
- القوالب تدعم العربية والإنجليزية.
- لا يوجد إرسال بريد أو WhatsApp حقيقي الآن.

### Affiliate System

- توجد موديلات أولية:
  - `Affiliate`
  - `Referral`
  - `PromoCode`
  - `AffiliateCommission`
- توجد APIs أولية تحت `/api/affiliate`.
- حساب العمولة حاليًا mock ولا يرتبط بحجز مؤكد فعليًا.

### الحماية والإعدادات

- `JWT_SECRET` مطلوب ولا يوجد fallback خطير.
- admin bypass لم يعد ثابتًا، بل يعتمد على `NEXT_PUBLIC_DEV_ADMIN_BYPASS` ويُمنع في production.
- B2B APIs لديها API key وrate limit.
- login/register وcheckout والبحث لديهم rate limiting أساسي.
- ملف `.env.example` محدث بقيم placeholder فقط.

## 2. ما الذي ما زال ينتظر Hotelbeds

- استبدال mock داخل `lib/suppliers/hotelbeds-provider.ts` باستدعاءات Hotelbeds الحقيقية.
- قراءة مفاتيح Hotelbeds من:
  - `HOTELBEDS_API_KEY`
  - `HOTELBEDS_SECRET`
- تنفيذ mapping حقيقي للعمليات:
  - `searchHotels`
  - `checkAvailability`
  - `checkRates` أو `preBook`
  - `book`
  - `getBookingDetails`
  - `cancelBooking`
- تحويل ردود Hotelbeds إلى الصيغة الموحدة في `lib/suppliers/types.ts`.
- حفظ `supplierHotelId`, `supplierRateKey`, و`supplierBookingReference` بشكل مؤكد داخل Booking.
- اختبار حالات الفشل، انتهاء الجلسة، السعر المتغير، عدم التوفر، وسياسات الإلغاء.

## 3. ما الذي ما زال ينتظر TBO

- استبدال mock داخل `lib/suppliers/tbo-provider.ts` باستدعاءات TBO الحقيقية.
- قراءة بيانات TBO من:
  - `TBO_BASE_URL`
  - `TBO_USERNAME`
  - `TBO_PASSWORD`
  - `TBO_ENV`
- تنفيذ search/rate/booking/cancel حسب عقود TBO.
- تطبيع ردود TBO إلى Unified Hotel وUnified Booking format.
- اختبار اختلاف العملات والضرائب والرسوم.
- التأكد من idempotency عند تنفيذ حجز TBO حقيقي.
- توثيق حالات TBO النهائية والمؤقتة وربطها بـ `supplierStatus`.

## 4. ما الذي ما زال ينتظر Travellanda

- يوجد كود Travellanda قديم في:
  - `lib/providers/travellanda/client.ts`
  - `app/api/travellanda/route.ts`
  - `app/api/test/travellanda/route.ts`
- يوجد Provider جديد stub في:
  - `lib/suppliers/travellanda-provider.ts`
- المطلوب لاحقًا نقل التكامل الحقيقي تدريجيًا إلى Supplier Layer بدل استدعاءات الواجهة المباشرة.
- قراءة إعدادات Travellanda الحالية من:
  - `NEXT_PUBLIC_TRAVELLANDA_API_URL`
  - `TRAVELLANDA_USERNAME`
  - `TRAVELLANDA_PASSWORD`
- `TRAVELLANDA_API_KEY` موجود في `.env.example` كاحتمال مستقبلي إذا تغير عقد المزود.
- يجب معالجة أخطاء IP whitelist من Travellanda قبل التشغيل الفعلي.
- يجب توحيد ردود Travellanda مع `SupplierHotelResult` و`SupplierBookResponse`.

## 5. ما الذي ما زال ينتظر Stripe live

- تفعيل live mode غير مسموح حاليًا في الكود.
- قبل Stripe live يجب:
  - ضبط `STRIPE_MODE=live` فقط بعد تعديل الحماية المقصود.
  - استخدام `sk_live_` وwebhook live secret.
  - مراجعة شرط `getStripeClient` في checkout وwebhook.
  - تفعيل `STRIPE_CHECKOUT_ENABLED=true` في البيئة المناسبة فقط.
  - إضافة refund حقيقي بدل `refund_pending` التجريبي.
  - التأكد من idempotency في webhooks.
  - اختبار أحداث:
    - `checkout.session.completed`
    - `payment_intent.succeeded`
    - `payment_intent.payment_failed`
    - refund events عند إضافتها.
- يجب ألا يتم إرسال تأكيد نهائي للعميل إلا بعد `supplier_booking_confirmed`.

## 6. الخطوات القادمة بعد وصول الإيميلات

المقصود بالإيميلات هنا رسائل الموردين أو Stripe التي تحتوي بيانات الاعتماد، تعليمات التفعيل، أو روابط البيئات.

1. إضافة المفاتيح إلى بيئة التطوير أو staging بدون تعديل `.env.local` داخل الريبو.
2. تحديث `.env.example` فقط إذا ظهرت متغيرات جديدة غير موجودة.
3. تفعيل مورد واحد في البداية عبر `SUPPLIER_PROVIDER`.
4. اختبار `searchHotels` فقط قبل `book`.
5. اختبار `checkAvailability` أو `checkRates` قبل أي checkout.
6. تفعيل booking الحقيقي خلف feature flag أو بيئة staging فقط.
7. ربط `Booking Orchestrator` بالمورد الحقيقي بعد نجاح الدفع.
8. اختبار الإلغاء والاسترجاع في test mode قبل live.
9. تفعيل الإشعارات الحقيقية لاحقًا بعد التأكد من حالات الحجز.
10. توثيق كل اختلاف في ردود الموردين داخل ملفات provider الخاصة بهم.

## 7. ملفات يجب تعديلها عند وصول المفاتيح

### ملفات الموردين

- `lib/suppliers/hotelbeds-provider.ts`
- `lib/suppliers/tbo-provider.ts`
- `lib/suppliers/travellanda-provider.ts`
- `lib/suppliers/types.ts` إذا ظهرت حقول موحدة جديدة.
- `lib/suppliers/supplier-provider.ts` إذا تغيرت طريقة اختيار الموردين أو التحقق من production.
- `lib/hotels/normalize-hotels.ts` إذا احتجنا قواعد دمج أو ترتيب إضافية.
- `app/api/hotels/search/route.ts` إذا احتجنا مدخلات بحث إضافية أو logging إضافي.

### ملفات الحجز

- `lib/booking/booking-orchestrator.ts`
- `lib/booking/cancellation-service.ts`
- `models/Booking.ts` إذا ظهرت حقول مورد جديدة.
- `lib/booking-status.ts` إذا ظهرت حالات تشغيلية جديدة.

### ملفات الدفع

- `app/api/payments/stripe/checkout/route.ts`
- `app/api/payments/stripe/webhook/route.ts`

### ملفات B2B

- `lib/b2b/supplier.ts`
- `app/api/b2b/search/route.ts`
- `app/api/b2b/availability/route.ts`
- `app/api/b2b/booking/route.ts`
- `app/api/b2b/cancel/route.ts`

### ملفات الإعدادات

- `.env.example`
- `.env.local.example`
- إعدادات البيئة خارج الريبو في staging/production.

### ملفات الإشعارات

- `lib/notifications/notification-service.ts`
- `lib/notifications/templates.ts` إذا احتجنا نصوص إنتاجية إضافية.

## 8. مخاطر قبل الإنتاج

- تفعيل `NEXT_PUBLIC_DEV_ADMIN_BYPASS=true` في الإنتاج خطر، لكن الكود يمنعه عبر `NODE_ENV !== production`. يجب التأكد من ضبطه `false`.
- استخدام mock supplier في production ممنوع ويجب التحقق من `SUPPLIER_PROVIDER` و`SUPPLIER_PROVIDERS`.
- أي تكامل Travellanda قد يفشل إذا لم يتم تفعيل IP whitelist.
- يجب عدم تفعيل Stripe live قبل اختبار webhook وrefund وidempotency بالكامل.
- يجب اختبار اختلاف أسعار المورد بين البحث ومرحلة checkRates/preBook.
- يجب ألا يتم تنفيذ supplier booking قبل الدفع.
- يجب ألا يتم refund إذا فشل إلغاء المورد.
- يجب ضبط CORS بعناية إذا تم فتح APIs خارجية.
- يجب حماية APIs الخاصة بالـ Affiliate قبل استخدامها علنًا لأنها حاليًا أولية.
- يجب مراجعة تخزين rawSupplierRequest/rawSupplierResponse حتى لا يحتوي بيانات حساسة.
- يجب إضافة monitoring حقيقي قبل الإنتاج.
- يجب اختبار build وlint وtypecheck في CI قبل أي نشر.
- يجب اختبار حالات تعدد الموردين عندما ينجح مورد ويفشل آخر.
- يجب اختبار منع duplicate booking عند تكرار Stripe webhook.
- يجب اختبار صلاحيات admin وagency وhotel owner بعد تعطيل dev bypass.
