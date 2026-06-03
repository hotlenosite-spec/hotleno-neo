# تقرير إصلاح ملاحظات TBO Certification

## نطاق العمل

تمت مراجعة تكامل TBO فقط داخل المشروع، مع التركيز على سكربت الشهادة:

- `scripts/tbo-certification.mjs`

لم يتم تعديل Travellanda أو Hotelbeds أو Stripe أو مسارات الدفع أو التصميم أو `.env.local`.

ملاحظة: لم يتم العثور على ملف `Naif JSON.xlsx` داخل جذر المشروع أثناء البحث المحلي، لذلك تم الاعتماد على ملاحظات الطلب وسجلات TBO الحالية داخل `logs/tbo-certification/`.

## الملفات المعدلة

- `scripts/tbo-certification.mjs`
- `docs/tbo-certification-fixes-ar.md`

## GuestNationality

لم يعد `GuestNationality` ثابتًا على `AE`.

السلوك الحالي:

- يستخدم `TBO_GUEST_NATIONALITY` إذا تم تمريره من البيئة.
- إذا لم يتم تمريره، يستخدم fallback مؤقت واضح: `SA`.
- يتم التحقق أن القيمة كود دولة من حرفين.
- يمكن تمرير `AE` فقط عند الحاجة لمقيم في الإمارات، لكنه لم يعد مستخدمًا لجميع المستخدمين.

## Title في Book API

تم إزالة `Master` من بيانات الحجز في سكربت الشهادة.

السلوك الحالي:

- البالغون يستخدمون `Mr` أو `Ms`.
- الأطفال يستخدمون `Mr` بدل `Master`.
- القيم المرسلة الآن ضمن القيم المقبولة من TBO: `Mr`, `Ms`, `Mrs`.

## BookingDetails API

تم تعديل منطق BookingDetail ليستخدم `BookingReferenceId` أولًا عند توفره.

السلوك الحالي:

- يتم حفظ `BookingReferenceId` من طلب الحجز أو رد TBO عند توفره.
- يتم إرسال محاولة BookingDetail الأولى باستخدام `BookingReferenceId`.
- إذا لم تنجح أو لم تتوفر، يتم تجربة `ConfirmationNumber` ثم `BookingId`.

## ResponseTime

تم جعل `ResponseTime` قابلًا للتكوين عبر:

```env
TBO_RESPONSE_TIME_SECONDS=23
```

القيمة يجب أن تكون ضمن نطاق TBO المسموح من 5 إلى 23 ثانية. القيمة الافتراضية هي `23` لأنها الحد الأعلى المسموح والمقصود لتقليل نقص النتائج في اختبارات الشهادة.

## Check-in / Check-out

تم تعديل تواريخ الاختبار بحيث تختلف حسب رقم الحالة بدل استخدام نفس التاريخ لكل الحالات. كل حالة تبدأ بعد عدد أيام مختلف مع مدة إقامة ثابتة يومين.

## Search limits

تمت إضافة guard واضح قبل Search:

- لا يسمح بأكثر من 100 `HotelCodes` في الطلب الواحد.
- لا يسمح بأكثر من 6 `PaxRooms`.
- لا يسمح بأكثر من 6 بالغين في الغرفة.
- لا يسمح بأكثر من 4 أطفال في الغرفة.
- يجب أن يطابق عدد `ChildrenAges` عدد الأطفال.
- أعمار الأطفال يجب أن تكون من 0 إلى 18.

## Supplements

يستمر السكربت في اختيار غرفة تحتوي `Supplements` لحالة الاختبار الخاصة بها.

تمت إضافة ملخص تجاري من PreBook داخل نتيجة الحالة:

- عدد `supplements`
- السعر النهائي
- عدد سياسات الإلغاء
- عدد شروط السعر
- عدد عروض الغرفة

هذا يجعل الـ supplements محفوظة وجاهزة للمراجعة قبل الحجز بدل إخفائها.

## PreBook

السلوك الحالي يعتمد PreBook قبل Book:

- يتم استخدام غرفة PreBook عند توفرها بدل غرفة Search.
- يتم إرسال `TotalFare` النهائي من PreBook في طلب Book.
- يتم حفظ عدد `CancelPolicies` من PreBook في ملخص الحالة.
- يتم حفظ `Inclusion` و`RateConditions` و`RoomPromotion` كجزء من ملخص الشروط التجارية الجاهزة للعرض أو المراجعة قبل الحجز.

## PaymentMode

لم يتم تغيير `PaymentMode`.

تم إبقاؤه:

```json
"PaymentMode": "Limit"
```

مع تعليق في الكود يوضح أنه mode الموصى به من TBO لتدفقات الشهادة.

## Cancel API

لم يتم بناء نظام إلغاء جديد.

مزود TBO داخل التطبيق ما زال mock provider موحدًا، وسكربت الشهادة الحالي لا ينفذ Cancel API. لذلك تبقى ملاحظة Cancel API pending لتكامل TBO الحقيقي لاحقًا. عند إضافة Cancel API الحقيقي، يجب بعد timeout أو error استدعاء BookingDetail لمعرفة الحالة النهائية.

## نتيجة الفحوصات

- `npm.cmd run lint`: نجح.
- `npm.cmd run build`: نجح.

ملاحظة: ظهر تحذير غير مانع أثناء build من `baseline-browser-mapping` بأنه قديم، ولم يؤثر على نجاح البناء.
