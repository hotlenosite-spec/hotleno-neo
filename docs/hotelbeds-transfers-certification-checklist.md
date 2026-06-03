# Hotelbeds Transfers Certification Checklist

## حالة ملف Excel

لم يتم العثور على ملف `Certification Points Transfers.xlsx` داخل المشروع الحالي `C:\development\hotleno-main` عند الفحص المحلي. لذلك لم يتم تعديل ملف Excel، وتم تجهيز هذه الملاحظات كمسودة قابلة للمراجعة قبل تعبئة أعمدة `Checked` و`Comments` داخل الملف عند توفره.

## مصادر Hotelbeds الرسمية

- Transfers API Documentation: `https://developer.hotelbeds.com/documentation/transfers/`
- Transfers Certification Process: `https://developer.hotelbeds.com/documentation/transfers/knowledge-base/certification-process/`
- Availability Simple: `https://developer.hotelbeds.com/documentation/transfers/booking-api/search-availability/availability-simple/`

## متطلبات التشغيل

- استخدام Hotelbeds Transfers test/validation فقط.
- قراءة المفاتيح من البيئة فقط:
  - `HOTELBEDS_TRANSFERS_API_KEY`
  - `HOTELBEDS_TRANSFERS_SECRET`
  - `HOTELBEDS_TRANSFERS_BASE_URL`
- يجب أن تكون `HOTELBEDS_TRANSFERS_BASE_URL` على بيئة test.
- يجب تفعيل التشغيل الصريح عبر:
  - `HOTELBEDS_TRANSFERS_CERTIFICATION_CONFIRM=true`
- لا يتم تسجيل API key أو secret أو X-Signature في ملفات اللوق.

## السيناريو 1: DEPARTURE service only

**Checked المقترح:** بعد تشغيل السكربت ونجاح السيناريو.

**Comments المقترحة:**

تم تنفيذ Availability Simple من Hotel Sistina باستخدام Atlas code `5643` إلى Rome Ciampino Airport باستخدام IATA code `CIA`. يتم اختيار خدمة تحتوي `mustCheckPickupTime=true` فقط، ثم تنفيذ booking، وتوليد voucher يحتوي وقت الالتقاط، ثم إلغاء الحجز.

**اللوقات المتوقعة:**

- `main-availability-request.json`
- `main-availability-response.json`
- `booking-request.json`
- `booking-response.json`
- `booking-detail-request.json`
- `booking-detail-response.json`
- `voucher.json`
- `voucher.html`
- `cancel-request.json`
- `cancel-response.json`

## السيناريو 2: Round Trip ARRIVAL + DEPARTURE

**Checked المقترح:** بعد تشغيل السكربت ونجاح السيناريو.

**Comments المقترحة:**

تم تنفيذ طلبين منفصلين للـ Availability: خدمة ARRIVAL من Port of Barcelona `PORT/BCNP` إلى Hotel Barcelona Universal `ATLAS/57`، وخدمة DEPARTURE من Hotel Barcelona Universal `ATLAS/57` إلى Port of Barcelona `PORT/BCNP`. يتم تأكيد الحجز بالخدمتين، ثم توليد voucher، ثم إلغاء الحجز.

**اللوقات المتوقعة:**

- `leg-1-availability-request.json`
- `leg-1-availability-response.json`
- `leg-2-availability-request.json`
- `leg-2-availability-response.json`
- `booking-request.json`
- `booking-response.json`
- `booking-detail-request.json`
- `booking-detail-response.json`
- `voucher.json`
- `voucher.html`
- `cancel-request.json`
- `cancel-response.json`

## السيناريو 3: ARRIVAL service only

**Checked المقترح:** بعد تشغيل السكربت ونجاح السيناريو.

**Comments المقترحة:**

تم تجهيز سيناريو ARRIVAL من Sants Terminal باستخدام `STATION/BCNE` إلى Hotel Hilton Barcelona باستخدام `ATLAS/651`، ثم تنفيذ Availability وbooking وتوليد voucher. لم يتم تضمين cancel لأن طلب Hotelbeds لهذا السيناريو لا يذكر الإلغاء.

**اللوقات المتوقعة:**

- `main-availability-request.json`
- `main-availability-response.json`
- `booking-request.json`
- `booking-response.json`
- `booking-detail-request.json`
- `booking-detail-response.json`
- `voucher.json`
- `voucher.html`

## السيناريو 4: Service + Optional Extras

**Checked المقترح:** بعد تشغيل السكربت ونجاح السيناريو.

**Comments المقترحة:**

تم تنفيذ Availability من Hotel Barcelona Universal `ATLAS/57` إلى Barcelona El Prat Airport `IATA/BCN`. يتم اختيار خدمة تحتوي optional extras، وتضمين extra واحد على الأقل في طلب booking، ثم توليد voucher، ثم إلغاء الحجز.

**اللوقات المتوقعة:**

- `main-availability-request.json`
- `main-availability-response.json`
- `booking-request.json`
- `booking-response.json`
- `booking-detail-request.json`
- `booking-detail-response.json`
- `voucher.json`
- `voucher.html`
- `cancel-request.json`
- `cancel-response.json`

## السيناريو 5: Website booking flow review

**Checked المقترح:** بعد مراجعة اللوقات والـ vouchers.

**Comments المقترحة:**

تم تجهيز سكربت certification مع logs منظمة لكل خطوة وملفات voucher JSON/HTML قابلة للإرسال والمراجعة. إذا طلبت Hotelbeds screenshots للواجهة، يمكن لاحقًا إضافة صفحة اختبار محلية أو التقاط screenshots من صفحة Transfers الحالية، بدون تغيير التصميم العام أو تنفيذ booking إنتاجي.

## ملاحظات عامة للإرسال

- كل booking يعمل في Hotelbeds test/validation فقط.
- لا يتم استخدام Hotelbeds Accommodation API.
- لا يتم استخدام Transfers live booking.
- لا يتم استخدام Stripe أو أي payment route.
- الـ voucher يحتوي:
  - Hotelbeds reference
  - Service full name
  - From / To
  - Passenger name
  - Pax distribution
  - Pickup information
  - Pickup time
  - Service date
  - Currency
  - Cancellation policy
  - `Booked and paid by HBX Group`
