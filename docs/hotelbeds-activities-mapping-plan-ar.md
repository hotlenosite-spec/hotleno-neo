# خطة تغطية Mapping بنسبة 90% لـ Hotelbeds Activities

## الحالة الحالية

تكامل Hotelbeds Activities الحالي يملك:

- بحث Availability مباشر حسب الوجهة والتواريخ.
- بحث وجهات من Content API عبر countries/destinations.
- استخراج صور من أكثر من شكل داخل رد Hotelbeds.
- عرض الاسم، الوجهة، الصورة، السعر، اللغة، التصنيف، المدة، والإلغاء عند توفرها.

لكن لا توجد حتى الآن مزامنة كاملة أو تخزين cache دائم لمحفظة المنتجات، لذلك التغطية ليست 90% بعد.

## الهدف

الوصول إلى تغطية قريبة من 90% من منتجات Hotelbeds Activities الموزعة للحساب، مع استخدام Availability live فقط للسعر والتوفر.

## خطة التنفيذ المقترحة

1. جلب الدول من Content API:
   - تخزين countryCode.
   - تخزين countryName.
   - ربطها بالوجهات.

2. جلب الوجهات من Content API:
   - تخزين destinationCode.
   - تخزين destinationName.
   - تخزين countryCode.

3. جلب portfolio/content حسب الوجهات:
   - تخزين activityCode.
   - تخزين destinationCode.
   - تخزين الاسم والوصف.
   - تخزين الصور من `content.media.images` وأي مسارات صور بديلة.
   - تخزين التصنيفات والميزات والمسارات والتعليقات.
   - تخزين ملخص modalities واللغات والجلسات عند توفرها.

4. استخدام Availability API للأسعار والتوفر:
   - لا يتم الاعتماد على سعر مخزن قديم.
   - السعر النهائي والتوفر يجب أن يأتي من Availability أو Details/CheckRate.

5. تحديث دوري:
   - بناء sync job يومي أو حسب توصية Hotelbeds.
   - استخدام cache دائم في قاعدة البيانات بدل الاعتماد على استدعاء لحظي فقط.

6. الربط مع صفحة العميل:
   - البحث يستخدم destinationCode والمنتجات المخزنة للعرض الأولي.
   - Details/CheckRate يجلب السعر والسياسات والأسئلة والجلسات بشكل حي.
   - Booking لا يتم إلا بعد الدفع في الإنتاج.

## الحقول المهمة للتخزين

- `activityCode`
- `destinationCode`
- `countryCode`
- `name`
- `description`
- `images`
- `modalitiesSummary`
- `features`
- `routes`
- `comments`
- `languages`
- `currency`
- `lastSyncedAt`

## ملاحظات الإنتاج

- لا يجب استخدام بيانات content القديمة لتأكيد السعر.
- يجب الاعتماد على Details/CheckRate قبل الحجز.
- يجب حفظ الأسئلة المطلوبة وإجابات العميل قبل confirm booking.
- إذا عاد Hotelbeds بـ PDF vouchers، يجب عرضها كتذكرة رسمية وعدم استبدالها بفاتشر داخلي.
