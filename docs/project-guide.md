# حالة مشروع Travneeds CRM

آخر تحديث 19 نوفمبر 2026.

تمت استعادة تصميم اللوجين والداشبورد والبروفايل والإشعارات وسجل النشاط من النسخة المحفوظة. أزيلت Landing بطلب المالك. البروفايل مستقل عن إعدادات المشروع ومتصل بحفظ بيانات الحساب الحقيقية. تغييرات اللوجيك والبيانات تحافظ على تصميم الشاشات القائمة، وأي إعادة تصميم تحتاج طلبًا صريحًا من المالك.

## الأساس المنفّذ

| الجزء | الحالة الفعلية |
| --- | --- |
| Frontend | React وTypeScript، والموديولز تحت `src/modules/` |
| Backend | Express 5 وTypeScript، والموديولز تحت `server/src/modules/` |
| Database | قاعدة `travneeds_crm` الموجودة، عبر XAMPP / MariaDB 10.4.32 |
| حساب اتصال قاعدة البيانات | `travneeds_app` للاتصال من 127.0.0.1، بصلاحيات DML على القاعدة فقط |
| Authentication | حسابات حقيقية في users، تشفير كلمات المرور، جلسات Cookie على السيرفر، CSRF وOrigin checks |
| أول أدمن | يتم إنشاؤه ببيانات المالك الفعلية عبر `npm run admin:create` |
| Settings | حفظ الاسم واللون ومسار اللوجو وfavicon والعملة الأساسية في قاعدة البيانات |
| Audit | أحداث الدخول والخروج وإعداد الأدمن وحفظ الإعدادات الفعلية |
| Activation | تفعيل شهري محلي من الأدمن، مع عداد مرتبط بوقت السيرفر ورابط إدارة الترخيص |
| Documentation | AGENTS وREADME في الجذر، وباقي المراجع والسكريبتات تحت docs |

الجداول الحالية موثّقة في [ERD](ERD.md). لا توجد حسابات أو بيانات أعمال تجريبية. صفا admin وemployee وإعدادات الهوية الافتراضية وحالة التفعيل غير المفعّلة إعدادات تقنية لازمة للنظام.

## الموديولز الحالية

Leads وCustomers وSuppliers مجمّعين تحت CRM، مع استعادة البانر والكروت والفلاتر والجداول وأسلوب النماذج الأصلية. الإضافة والتعديل والتفاصيل والبحث والفلاتر والصفحات والتصدير للصفحة الحالية متصلة بقاعدة البيانات. الأرشفة والاستعادة للأدمن فقط، مع حفظ نسخة السجل لمنع الكتابة فوق تعديل أحدث. تحويل Lead إلى Customer معاملة واحدة قابلة لإعادة الطلب دون إنشاء عميل مكرر. التعيين لموظف ينشئ إشعارًا حقيقيًا، والداشبورد يقرأ توزيع مصادر العملاء المحتملين ومتابعات الحساب من الجداول.

User Management يتضمن إنشاء الحسابات وتعديل بياناتها وحالتها واختيار الافتار والقسم والمسمى الوظيفي، الأدوار الفعلية admin/employee، عدد الجلسات وإنهاءها، روابط دعوة منتهية الصلاحية بعد 72 ساعة، وسجل النظام. لا يتم إرسال بريد دعوة تلقائي؛ الأدمن ينسخ الرابط ويشاركه مع الشخص المقصود. قبول الدعوة مرة واحدة ينشئ حسابًا حقيقيًا بكلمة مرور يختارها صاحبه. تغيير دور الحساب أو تعطيله ينهي جلساته. النظام يمنع سحب صلاحيات الأدمن من نفسه أو فقدان آخر أدمن نشط.

افتارات Male/Female الأصلية أصول تصميم محلية مش داتا وهمية. الاختيار محفوظ في user_profiles ويظهر في الهيدر والسايدبار والبروفايل وإدارة المستخدمين؛ لا يتم استنتاجه من الاسم. Finance يقرأ الحجوزات المؤكدة والمكتملة من موديول الحجوزات. المدفوعات تعتمد على القيود المثبتة. لا توجد حجوزات ومدفوعات أو مؤشرات أداء موردين مختلقة.

المصدر الأول هو `web-source/`. النسخة السابقة في `Travneeds-CRM-old-modules/`. أي مصدر إضافي يوضع داخل `module-sources/`. تظل هذه المجلدات محلية وخارج Git والفحوص، والكود المختار ينتقل إلى الموديول الذي يملكه.

## حدود التنفيذ الحالية

- يدير الأدمن أسعار الصرف الفعلية ويجرب التحويل من الإعدادات. التحويل يستخدم السعر المباشر الساري المحفوظ، وغياب السعر يظهر بوضوح.
- السيريال لا يتم توليده أو التحقق منه في هذه المرحلة. الخانة وخيارات المدة ظاهرة مع وصف واضح لتأجيل التحقق.
- الأدوار الحالية ثابتة وتعمل فعليًا على السيرفر. إضافة أدوار مخصصة بمصفوفة صلاحيات قابلة للتعديل تحتاج تصميم صلاحيات مستقل، ولا توجد أزرار تدّعي حفظ أدوار غير منفذة.
- تظهر أعداد حجوزات العميل المؤكدة والمكتملة حسب صلاحية الحساب. إنفاق العملاء ومؤشرات أداء الموردين تعتمد على المدفوعات والعمليات التي يدعمها النظام. إرسال كوتيشن محدد متاح بعد إعداد SMTP.
- اختبارات التكامل تستخدم حساب الهجرة الموجود في قاعدة اختبار محلية مؤقتة منفصلة. لا يتم إنشاء حسابات MySQL إضافية أو إدخال سجلات اختبار في travneeds_crm.
- حد محاولات الدخول يعمل داخل عملية API واحدة. توزيع التشغيل على عدة عمليات يتطلب مخزنًا مشتركًا للحدود.
- معلومات الهوية العامة متاحة للصفحات العامة. تعديل الإعدادات يتطلب أدمن وجلسة وCSRF ونسخة إعدادات حديثة.
- التحقق البصري ومراجعة إنسان فعلي يُسجلان فقط عندما يحدثان. لا تُنسب فحوص API إلى مراجعة بصرية.

## المراجع اليومية

[قواعد العمل](../AGENTS.md)، [الدستور](constitution.md)، [التصميم](DESIGN_SYSTEM.md)، [التشغيل](operations/local-setup.md)، [API](operations/api.md)، [الأدوات](tooling/skills.md)، [التحقق](quality/foundation-verification.md).


## استعادة تفاصيل المستخدم وسجل النظام

صفحة المستخدم الأصلية متاحة من View Profile في جدول المستخدمين، وبها Personal Info وWork Info وSecurity وPermissions وActivity وPerformance بنفس البانر والقائمة الجانبية وكارت المحتوى. تعمل أيضًا وصلة /users/view للحساب الحالي عند عدم تحديد معرّف. المعلومات الشخصية الجديدة اختيارية ومحفوظة بقاعدة البيانات من Edit User. الأمان يعرض الجلسات الفعلية، والصلاحيات تتبع الدور المطبق، والنشاط والأداء من الجداول الفعلية. إرسال رسالة داخلية ينتج إشعارًا محفوظًا؛ الدعم والمهام والتقويم غير مربوطين، ولا توجد رسائل نجاح وهمية لها.

System Audit Trail عاد بجدوله الأصلي ذي السبعة أعمدة، وفلاتر الموديول والخطورة والبحث والصفحات والتصدير الكامل للنتائج حتى 10 آلاف سجل. صارت محاولات الدخول المرفوضة تسجل كأحداث فعلية بحالة فشل، مع بيانات الطلب الموجودة فقط. اختبارات هذه المرحلة 30 اختبارًا، مع التحقق البصري وملف CSV فعلي. راجع docs/quality/user-detail-audit-restoration.md للتفاصيل والحدود.

## Finance restoration

General Finance, invoice directory/details, client/supplier invoice layouts, payment entry and overview/profit/agent reports are implemented. The Travel Bookings adapter feeds the administrator read APIs. Reporting counts confirmed and completed bookings. Payment posting, supplier invoice entry and payment gateways are deferred. No operational data is seeded.

## Itemized invoice workflow

Manual customer invoices now work without Trips: editable versioned drafts, item quantities/prices, fixed discount, explicit optional tax, immutable issued documents and locked sequential numbering. Company identity and billing details are stored as snapshots. A4-oriented document styling supports Arabic/English and native browser print/Save PDF. The booking selector prefills the saved customer, currency, traveler subtotal, selected extras and separately charged rooms as editable items. Supplier invoice entry, payment posting, invoice email delivery, tax registration/e-invoicing integrations and reversal/credit-note workflows are deferred. Invoice creation does not create a fake booking or increase booking reports.

## Travel and communications

Travel Catalogue has database-backed Destinations, Multi Day Categories, Hotels, Rooms, Meals, Amenities and Travel Add-ons. Destination/category records adapt bilingual names and descriptions, slugs, cover images, ordering and active state from the source catalogue. A selected hotel prefills its associated records as quotation snapshots. Quotation saves register new manually entered entries for reuse without overwriting existing master records. Settings supports uploaded logo/favicon files and an enabled currency list.

الكوتيشن مرتبط بالعميل وبإصدار محفوظ للرحلة والفندق والغرف والتسعير. واجهة المحتوى تقبل العربي والإنجليزي يدويًا، وتعرض اقتراحات ترجمة قابلة للمراجعة عند تشغيل مزوّد Google Cloud Translation. عرض العميل وملف PDF يستعملان نفس قالب العرض. الرابط محمي برمز قابل للإلغاء وله صلاحية. إنشاء الحجز خطوة صريحة، ويحفظ ارتباطه بنسخة الكوتيشن. الحجز المعلق لا يدخل أرقام المالية قبل التأكيد، والإلغاء يستبعده من التقارير التشغيلية مع حفظ السجل المالي.

صندوق Inbox يعرض المحادثات الفعلية لشات رابط الكوتيشن وقنوات Meta بعد ضبطها. سجل Emails يعرض محاولات SMTP التي بدأها الموظفون من الكوتيشن. إعداد Google Login يفعّل ربط هوية Google بحساب موظف موجود من البروفايل. راجع [إعداد القنوات والخدمات](operations/travel-communications.md).

الرسائل النصية الجديدة من قنوات Meta تنشئ Lead بمصدر القناة عند غياب الربط السابق. يستطيع الأدمن إنشاء الليد أو اختيار ليد موجود من Inbox، وتظهر الرسائل في ملف العميل بعد التحويل مع مراعاة صلاحيات المحادثة.

## Customer File

ملف العميل يفتح مباشرة من دليل العملاء. يعرض التسلسل الزمني والليدز المرتبطة ونسخ الكوتيشن والحجوزات ومراسلات رابط الكوتيشن ومحاولات البريد. الأدمن يقدر يراجع الفواتير والمدفوعات المسجلة وينشئ فاتورة يدوية مرتبطة بالعميل. يربط الأدمن المحادثة الاجتماعية بالعميل من Inbox. تظهر الرسائل المرتبطة حسب صلاحيات القناة.

## Business Overview

الداشبورد تعرض الكوتيشنات والحجوزات وفق صلاحيات كل مستخدم، مع إحصائيات العملاء والليدز على مستوى الشركة. نسبة التحويل هي الليدز المرتبطة بعميل من إجمالي الليدز غير المؤرشفة. كفاءة الحجوزات هي نسبة الحجوزات المؤكدة أو المكتملة من الحجوزات غير الملغاة، وتظهر شرطة عند غياب الحجوزات. يعرض النشاط أحدث ست رسائل واردة وفق صلاحيات Inbox. الرسم يجمع السجلات حسب تاريخ الإنشاء خلال آخر ثمانية أسابيع أو ستة أشهر تقويمية بالتوقيت العالمي ويستبعد الحجوزات الملغاة. قيمة الحجوزات المؤكدة والمكتملة تظهر للأدمن حسب العملة باستخدام نفس مصدر بيانات Finance.
