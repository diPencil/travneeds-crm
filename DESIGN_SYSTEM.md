# Travneeds Design System

مرجع تصميم الـ CRM قبل إعادة بناء الموديولز. تاريخ الالتقاط 18 نوفمبر 2026.
القيم مستخرجة من نسخة المشروع المحلية، وتشمل التعديلات التي كانت موجودة قبل التنظيف.

## مصدر التصميم

الهوية المرجعية هي واجهة Travneeds الحالية. عند نقل منطق من أي مشروع مصدر، نستخدم هذا المرجع والمكوّنات المشتركة لبناء الواجهة.

| الجزء | المصدر المستمر داخل المشروع |
| --- | --- |
| Shell | `src/components/layout/Layout.tsx` |
| Sidebar | `src/components/layout/Sidebar.tsx` |
| Header | `src/components/layout/Header.tsx` |
| Shared components | `src/components/ui/` |
| Global styles | `src/index.css` |
| Tailwind theme | `tailwind.config.js` |
| Fonts and document metadata | `index.html` |
| Language provider | `src/localization/LocaleProvider.tsx` |
| Direction helpers | `src/localization/direction.ts` |
| Formatting | `src/utils/format.ts` |
| Login | `src/components/auth/LoginPage.tsx` |
| Landing | `src/components/landing/LandingPage.tsx`, `landing.css` |

النسخة المحلية المرجعية للموديولز السابقة في `Travneeds-CRM-old-modules/`. هذا المجلد مستبعد من Git. المواصفات التالية داخل الريبو حتى يظل التصميم متاحًا عند استخدام نسخة مستقلة منه.

## الألوان

| الاستخدام | Light | Dark |
| --- | --- | --- |
| خلفية مساحة العمل | `#F4F7FE` | `gray-950` = `#030712` |
| Sidebar / Card / Modal | `#FFFFFF` | `gray-900` = `#111827` |
| Primary / Page banner | `blue-600` = `#2563EB` | نفس اللون |
| Primary hover | `blue-700` = `#1D4ED8` | نفس اللون |
| Navigation active text | `blue-500` = `#3B82F6` | `blue-400` = `#60A5FA` |
| Navigation active background | `#EFF6FF` | `blue-600 / 20%` |
| Form field | `slate-50` = `#F8FAFC` | `gray-800` = `#1F2937` |
| Main text | `gray-900` = `#111827` | `#FFFFFF` |
| Secondary text | `gray-500` = `#6B7280` | `gray-400` = `#9CA3AF` |
| Label | `gray-700` = `#374151` | `gray-300` = `#D1D5DB` |
| Border | `gray-100` = `#F3F4F6` | `gray-800` = `#1F2937` |
| Focus ring | `blue-500` = `#3B82F6` | نفس اللون |
| Destructive | `red-600` = `#DC2626` | النص غالبًا `red-400` |
| Positive trend | `emerald-500` = `#10B981` | نفس اللون |
| Negative trend | `rose-500` = `#F43F5E` | نفس اللون |
| Verified avatar | `teal-600` = `#0D9488` | `teal-400` = `#2DD4BF` |

سلم الرمادي المخصص في Tailwind مطابق للقيم التالية.

| Token | Hex |
| --- | --- |
| gray-50 | `#F9FAFB` |
| gray-100 | `#F3F4F6` |
| gray-200 | `#E5E7EB` |
| gray-300 | `#D1D5DB` |
| gray-400 | `#9CA3AF` |
| gray-500 | `#6B7280` |
| gray-600 | `#4B5563` |
| gray-700 | `#374151` |
| gray-800 | `#1F2937` |
| gray-900 | `#111827` |

باقي مجموعات الألوان تستخدم Tailwind 3 القياسي. الـ Header سطح أبيض بشفافية 90% مع `backdrop-blur-md`. بطاقة المستخدم في السايدبار تستخدم تدرجًا من `#2563EB` إلى `#1D4ED8`.

## الخطوط

| الاستخدام | Font family | الأوزان المحملة |
| --- | --- | --- |
| النصوص والحقول والجداول | `Inter, sans-serif` | 400, 500, 600, 700, 800 |
| العناوين h1–h6 | `Outfit, sans-serif` | 400, 500, 600, 700, 800 |

الخطوط محملة من Google Fonts في `index.html`. النص العربي يستخدم الـ fallback المتاح في الجهاز لأن النسخة الأصلية لا تعرّف خطًا عربيًا منفصلًا. لذلك قد يختلف رسم الحروف العربية بين الأجهزة. هذه ملاحظة عن التصميم الملتقط، واختيار خط عربي موحد يمكن تنفيذه بقرار لاحق.

| العنصر | الحجم والوزن |
| --- | --- |
| Page title | 24px، ومن `sm` يصبح 30px، bold، tracking-tight |
| Card title | 18px، semibold |
| Main text / buttons | 14px، medium أو bold |
| Page description | 14px، blue-100، opacity 90% |
| Sidebar item | 13.5px، semibold |
| Sidebar child | 12.5px، medium |
| Sidebar group | 9px، bold، uppercase، tracking-widest |
| KPI value | 24px، bold |
| KPI label / table heading | 10px، bold، uppercase، tracking-widest |
| Status badge | 10px، bold |

العناوين تستخدم `font-display tracking-tight`. العربية في `StatusBadge` تستخدم `tracking-normal` وتستغني عن تحويل الأحرف إلى uppercase.

## المسافات والزوايا والظلال

الأساس وحدة 4px. المسافات الأكثر استخدامًا 4، 8، 12، 16، 20، 24، 32px.

| العنصر | القياس |
| --- | --- |
| Page vertical sections | `space-y-6` = 24px |
| Main content padding | 16px أفقيًا، 24px من `sm`، 8px رأسيًا |
| Card content | 24px |
| Card header | 24px أفقيًا × 20px رأسيًا |
| Page banner | 24px، ثم 32px من `sm` |
| Banner bottom margin | 32px |
| Control radius | `rounded-2xl` = 16px |
| Button radius | `rounded-xl` = 12px |
| Main card/banner/header/modal radius | `rounded-3xl` = 24px |
| Tab/menu small radius | 6px، 8px، 12px حسب النمط |
| Badge/avatar | `rounded-full` |
| Card shadow | `0 8px 30px rgb(0 0 0 / 0.04)` |
| Header shadow | `0 8px 30px rgb(0 0 0 / 0.06)` |
| Sidebar shadow | `8px 0 24px rgba(15,23,42,0.04)`، مع عكس X في RTL |
| Interactive KPI hover | `0 8px 32px -8px rgba(37,99,235,0.15)` |

## Layouts

### Application shell

`min-h-screen bg-[#F4F7FE] dark:bg-gray-950 overflow-x-clip`.
السايدبار ثابت على كامل الارتفاع. المساحة الرئيسية تتحرك بإضافة padding في جهة بداية اللغة.

| الحالة | عرض Sidebar | مساحة Main |
| --- | --- | --- |
| Desktop expanded | 256px | `ltr:lg:pl-64 rtl:lg:pr-64` |
| Desktop collapsed | 72px | `ltr:lg:pl-[72px] rtl:lg:pr-[72px]` |
| Mobile | drawer، 256px | بدون حجز عرض للسايدبار |

الـ drawer خارج الشاشة عند الإغلاق، يتحرك من اليسار في LTR ومن اليمين في RTL. الـ overlay رمادي بشفافية 50%. الـ Sidebar يستخدم `z-[120]`، والـ overlay الخاص به `z-[110]`. انتقالات العرض والتحريك 300ms.

### Sidebar

السطح أبيض أو gray-900. منطقة الشعار ارتفاعها 80px وpadding أفقي 24px. الشعار `/logo.png` بارتفاع 40px و`object-contain`.
Navigation container يستخدم `py-3 px-2.5` وتمريرًا رأسيًا مع إخفاء الـ scrollbar.

| العنصر | الشكل |
| --- | --- |
| Parent row | ارتفاع 44px، padding أفقي 16px، radius 16px |
| Icon | 18px، ومسافة 12px عن العنوان |
| Active row | `bg-[#eff6ff] text-[#3b82f6] dark:bg-blue-600/20 dark:text-blue-400` |
| Inactive row | gray-500، hover gray-50، dark hover gray-800/50 |
| Submenu | إزاحة 36px، خط بداية gray-100 أو gray-800 |
| Child row | ارتفاع 36px، radius 12px، active blue-50/50 |
| Collapsed tooltip | gray-900، نص أبيض 12px، يظهر على hover خارج السايدبار |
| User footer | تدرج أزرق، radius 24px، shadow-blue-500/20 |

المجموعات الجديدة تجمع Leads وCustomers وSuppliers تحت CRM، مع Finance وUser Management وSettings. أسماء وروابط الموديولز قابلة للتطوير مع الحفاظ على هذه القياسات.

### Header

`sticky top-4 z-[100] mx-4 sm:mx-6 mb-6 rounded-3xl`، padding أفقي 16px ورأسي 8px ثم 10px من `sm`.
البحث سطح slate-50 أو gray-800 مع radius 16px وأيقونة Search 20px. يظهر البحث المباشر من `md`، ويظهر زر البحث والمربع المنبثق على الهاتف.
مبدّل اللغة شرائح داخل سطح slate-100/80، الخيار المختار أبيض أو gray-900 مع shadow-sm وscale-105. على الهاتف مبدّل E/ع بقياس 60×34px ومؤشر 26px. يظهر ترحيب المستخدم من `xl`.
القائمة الشخصية بعرض 256px على الشاشات الأكبر، وعلى الهاتف تستخدم `fixed top-20 inset-x-4`. قوائم الإشعارات كانت بعرض 384px. محاذاة هذه القوائم ناحية نهاية اللغة.

### Standard module page

```tsx
<div className="page-container">
  <PageHeader title={title} description={description} actions={actions} />
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {/* StatCard instances when backed by module data */}
  </div>
  <Card>
    <CardHeader><CardTitle>{sectionTitle}</CardTitle></CardHeader>
    <CardContent>{content}</CardContent>
  </Card>
</div>
```

### Page banner

المرجع `PageHeader`. سطح أزرق `#2563EB`، نص أبيض، radius 24px، shadow-lg مع blue-500/20. على الهاتف العناصر عمودية، ومن `sm` تصبح أفقية. العنوان والشرح في كتلة، والإجراءات في كتلة مستقلة بـ gap 8px ثم 12px.
أزرار البانر غالبًا بيضاء مع نص blue-600، أو شفافة بحد أبيض منخفض الشفافية. داخل `.banner-actions` وتحت 640px تتحول الأزرار إلى 36×36px وتُخفى نصوصها بصريًا، والأيقونات 18px. يلزم اسم مفهوم للزر عند إخفاء نصه.
النسخة الأصلية تضيف `sm:flex-row-reverse` في RTL إلى PageHeader وتعكس مجموعة الإجراءات. هذا السلوك محفوظ في المكوّن المشترك.

### List / detail / form layouts

صفحات القوائم تستخدم PageHeader ثم مؤشرات ثم كارت فلاتر أو كارت جدول. التفاصيل تستخدم بطاقة تعريف وتابات ومحتوى التاب. النماذج تستخدم بطاقة بفواصل `space-y-6` وحقول تتدرج من عمود واحد إلى عمودين حسب العرض. Footer النموذج يجمع الإلغاء والحفظ. وصف الحقل ورسالة الخطأ أسفل الحقل.

## المكوّنات

### Cards

`Card` سطح أبيض أو gray-900 بدون border، radius 24px، وظل 4%. `CardHeader` بحد سفلي gray-100 أو gray-800. `CardContent` padding 24px. `CardTitle` بحجم 18px.
يوجد أيضًا النمط القديم `.card-premium` بحد gray-100، radius 12px، shadow-sm، وhover يرفع العنصر 2px ويضيف حد blue-500/30 وshadow-md. المكوّن `Card` هو نمط الكارت الرئيسي الحالي.

### StatCard

Props تشمل `label`, `value`, `icon`, `trend`, `trendType`, `iconColor`, `iconBg`, `onClick`, `isActive`.
Padding 20px. أيقونة العلامة المائية 96px ثم 112px من `sm`، خارج الركن السفلي بمقدار 16px، opacity 10% أو 20% في dark. تتحرك وتكبر إلى 125% عند hover. تنعكس جهة الأيقونة في العربية. الحالة المختارة `ring-2 ring-blue-500`. الكارت القابل للنقر يرتفع 4px، والكارت العادي 2px عند hover. `iconBg` موجود في API الأصلي لكنه لا يرسم خلفية مستقلة حاليًا.

### Buttons

`inline-flex items-center justify-center gap-2 rounded-xl font-bold`، انتقال 300ms، hover يرفع 2px ويضيف shadow-md، focus ring بعرض 2px وoffset 2px.

| Variant | Default | Hover / focus |
| --- | --- | --- |
| primary | blue-600، text-white | blue-700، ring-blue-500 |
| secondary | gray-600، text-white | gray-700، ring-gray-500 |
| outline | أبيض، border-gray-300، text-gray-700 | gray-50، ring-blue-500 |
| ghost | text-gray-700 | gray-100، ring-gray-500 |
| danger | red-600، text-white | red-700، ring-red-500 |

| Size | Padding | Text |
| --- | --- | --- |
| sm | 12×6px | 14px |
| md | 16×8px | 14px |
| lg | 24×12px | 16px |

Disabled أو loading يضيفان opacity 50% وcursor-not-allowed ويعطّلان الزر. loading يظهر spinner 16px. `.ui-button` يستخدم `min-inline-size: max-content` ويعكس ترتيب الأيقونة والنص في RTL. ألوان dark للـ outline والـ ghost تحتاج className من المستدعي في النسخة الأصلية.

### Inputs and Select

ارتفاع 48px، radius 16px، border-0، padding أفقي 16px، shadow-sm. Light slate-50، Dark gray-800. النص medium gray-900/white، والـ placeholder gray-400/gray-500. Focus ring-blue-500 بعرض 2px، والانتقال 200ms.
Label 14px medium، ورسالة الخطأ 14px red-600 أو red-400. المسافة بين العناصر 4px. Error يغيّر focus إلى الأحمر، ويضيف border-red-500 مع بقاء عرض الحد الأصلي صفرًا.
`Input` يجعل email/url/tel/number/date/datetime-local/time بقيم LTR مع عزل bidi. النص العادي يتبع اللغة. `Select` يتبع اتجاه الصفحة ويستخدم native browser arrow.
ربط label بالحقل عبر id/htmlFor وخصائص aria الخاصة بالأخطاء نقطة تحسين مستقبلية للمكوّنات الأصلية.

### Tabs

المشروع السابق يحتوي أكثر من نمط تاب. نختار النمط وفق مساحة الصفحة مع الحفاظ على الوضوح في الحالتين.

| النمط | Container | Inactive | Active |
| --- | --- | --- | --- |
| Supplier detail tabs | flex، overflow-x-auto، gap-2 | `shrink-0 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50` | `bg-blue-50 text-blue-700` |
| Header segmented language | `rounded-2xl bg-slate-100/80 p-1.5 dark:bg-gray-800` | gray-500، hover white/50 | `rounded-xl bg-white text-blue-600 shadow-sm dark:bg-gray-900 dark:text-blue-400 scale-105` |
| Notification filter pills | flex gap-2 | `rounded-full px-3 py-1.5 text-[13px] font-semibold text-gray-600` | `bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400` |

الـ tab row يمرر أفقيًا على الشاشات الصغيرة. يحتفظ النص العربي باتجاهه، مع محاذاة المحتوى إلى start. عند إنشاء مكوّن tabs عام نضيف tablist/tab/tabpanel والتنقل بلوحة المفاتيح. هذه الخصائص لم تكن موحّدة في الشاشات الأصلية.

### Tables

`.table-container` يستخدم overflow-x-auto، radius 12px، border gray-100/gray-800، خلفية white/gray-900، shadow-sm. `.table-premium` بعرض كامل، نص 14px، محاذاة يسار في LTR ويمين في RTL.
الرأس gray-50 أو gray-800/50، نص 10px bold gray-500، uppercase وtracking-widest في الإنجليزية، tracking-normal في العربية. الخلايا padding 24×16px، وحد علوي gray-100/gray-800. Hover gray-50 أو gray-800/50. النص الطويل داخل خلية قد يستخدم truncate، مع منع كسر أرقام المرجع والمبالغ.

### TableActionsDropdown

زر MoreHorizontal وقائمة عبر portal إلى body. القائمة تتموضع وفق حدود الشاشة والاتجاه ويمكن فتحها لأعلى عند نقص المساحة. تُغلق بالنقر خارجها أو scroll/resize، مع استثناء تمرير القائمة نفسها. Props تشمل actions بأيقونة وعنوان وonClick وvariant default/danger وhidden. انقل إجراءات كل موديول إلى هذا المكوّن بدل تكرار القوائم.

### StatusBadge

`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold` مع عزل bidi.

| Variant | Light background / text | Dark background / text |
| --- | --- | --- |
| blue | blue-100 / blue-700 | blue-900/30 / blue-400 |
| emerald | emerald-100 / emerald-700 | emerald-900/30 / emerald-400 |
| amber | amber-100 / amber-700 | amber-900/30 / amber-400 |
| rose | rose-100 / rose-700 | rose-900/30 / rose-400 |
| purple | purple-100 / purple-700 | purple-900/30 / purple-400 |
| indigo | indigo-100 / indigo-700 | indigo-900/30 / indigo-400 |
| gray | gray-100 / gray-700 | gray-800 / gray-400 |

النمط `.badge-standard` القديم يستخدم padding أفقي 10px. أسماء الحالات تأتي من لغة التطبيق.

### Modals and confirmation

`Modal` يستخدم portal، overlay أسود 50%، z-index 200، padding خارجي 16px، سطح white/gray-900 radius 24px shadow-2xl. أقصى ارتفاع 90vh ومحتوى قابل للتمرير. Header وcontent padding 24px، title 18px semibold، close icon 24px.

| Size | Maximum width |
| --- | --- |
| sm | 448px |
| md | 512px |
| lg | 672px |
| xl | 896px |

`ConfirmationModal` بعرض 448px وradius 16px وpadding 24px. Overlay أسود 60% مع blur. أيقونة الحالة 24px داخل مربع 48px radius 12px. العنوان 20px bold، الوصف 14px medium. variants danger/red، warning/orange، success/green، info/blue. مسافة الإجراءات العلوية 32px وgap 12px. الحالة isLoading تتصل بزر التأكيد.
المكوّنات الأصلية تغلق عبر overlay وزر الإغلاق. Focus trap وEscape وdialog semantics ليست مكتملة في النسخة الملتقطة.

### Avatars, toasts and scrollbars

`UserAvatar` صورة دائرية object-cover، ring-teal-600 بعرض 2px وoffset 2px، وdark teal-400. المقاس الافتراضي 40×40px، والهيدر 32×32px، والسايدبار المطوي 28×28px. علامة verified بحجم 40% وبحد أدنى 14px، وأيقونة Check بيضاء. موضع علامة التوثيق ثابت bottom-right في الأصل.
`ToastContainer` أعلى نهاية الصفحة، 16px من الحافتين، z-index 100، gap 8px. الأنواع success/error/warning/info، مع إغلاق وإزالة تلقائية عبر الـ toast hooks. الموضع يمين في LTR ويسار في RTL.
أثناء تجهيز القاعدة الجديدة تم توصيل الرسائل بنفس حالة ToastProvider، وتصحيح ترتيب تعريف معالج الإغلاق. الطبقة الحالية للرسائل 210 حتى تظهر فوق Modal العام ذي الطبقة 200.
Scrollbars بعرض وارتفاع 6px، thumb gray-200/gray-700، hover gray-300/gray-600، radius full، track شفاف. `.scrollbar-hide` يخفي الشريط ويحتفظ بالتمرير.

## العربية RTL والإنجليزية LTR

`LocaleProvider` يدعم `en` و`ar`. الافتراضي en. يحفظ الاختيار في `travneeds-locale` داخل localStorage، ويضبط lang وdir وclasses `locale-en/locale-ar` و`dir-ltr/dir-rtl` على html. الرسائل في `src/localization/messages/`. fallback هو الإنجليزية ثم المفتاح.
التحويل يوقف animations/transitions مؤقتًا 100ms عبر `no-transitions` لمنع تحريك التخطيط أثناء عكس الاتجاه.

| Concern | LTR | RTL |
| --- | --- | --- |
| Sidebar position | left | right |
| Main reserved padding | left | right |
| Text | start/left | start/right |
| Submenu separator | border-left | border-right |
| Dropdown anchor | right | left |
| Toast anchor | right | left |
| Forward/back icons | original | directional flip |
| Email/phone/URL/ID | isolated LTR | isolated LTR |
| Numeric/date fields | LTR | LTR |

نستخدم `pickDirectionalValue`, `logical-start`, `logical-end`, `bidi-isolate`, `ltr-value`, `rtl-flip` كما هي في helpers والـ CSS. الأيقونات الاتجاهية مثل الأسهم تُعكس، وأيقونات المستخدم والإعدادات لا تحتاج عكسًا.
`formatDate` و`formatDateTime` يستخدمان en-US/ar-EG. النسخة الأصلية من `formatCurrency` تُرجع صيغة Western مسبوقة بـ US$ في الوضع العربي حتى عند تمرير عملة مختلفة. هذا قيد موجود يلزم معالجته أثناء بناء Settings والعملات. ملف التصميم يوثّق السلوك الحالي.

## Responsive and motion

| Breakpoint | Min width | الاستخدام |
| --- | --- | --- |
| base | 0 | عمود واحد، drawer، بحث الهاتف |
| sm | 640px | padding 24px، بانر أفقي، قوائم anchored |
| md | 768px | بحث الهيدر الكامل، لغة segmented |
| lg | 1024px | Sidebar ثابت، إمكانية collapse |
| xl | 1280px | ترحيب الهيدر، شبكات أعرض |
| 2xl | 1536px | Tailwind الافتراضي |

`.page-container` يطبق fade-in 500ms ease-in-out. الواجهة تستخدم transitions 200–300ms، watermark 500ms. لا نكرر عناصر مؤشرات أو badges بلا بيانات فعلية.
Landing scroll reveal يستخدم translateY(40px) وopacity 0 ثم 1 خلال 700ms، مع stagger 100–600ms. Floating cards تتحرك 14px خلال 5s، والنمط البطيء 10px وrotate(1deg) خلال 7s. Pulse glow يتدرج من 20px إلى 40px خلال 3s. reduced-motion لا يملك سياسة عامة مكتملة في الأصل.

## Login and Landing

Login يحتفظ بتصميمه الحالي بما فيه DotMap canvas، لون النقاط rgba(37,99,235,opacity)، وFramer Motion وDotLottie، وحالات إظهار كلمة المرور والتحقق من الحقول ورسائل الدخول. التحقق الحالي حساب تجريبي محدد في `useAuth`.
Landing تحتفظ بتركيبها وأنماطها في `landing.css`، والـ glassmorphism والخلفيات المتدرجة والأقسام والكروت والأنيميشن. النصوص الإنجليزية فيها مكتوبة مباشرة في المكوّن. دعم الترجمة الكامل لهاتين الصفحتين لم يكن موحّدًا مع `LocaleProvider` في النسخة الأصلية.

## تنظيم الـ tokens للتطوير القادم

القيم السابقة هي مرجع الشكل. عند إضافة تخصيص الألوان في Settings، يُطبّق الربط على ثلاث طبقات ثم تُوصَل المكوّنات بهذه المتغيرات.

```css
:root {
  /* Primitive */
  --blue-600: #2563eb;
  --blue-700: #1d4ed8;
  --white: #ffffff;
  --gray-900: #111827;
  --workspace-light: #f4f7fe;
  --radius-24: 24px;
  --space-24: 24px;

  /* Semantic */
  --color-primary: var(--blue-600);
  --color-primary-hover: var(--blue-700);
  --color-surface: var(--white);
  --color-workspace: var(--workspace-light);
  --color-text: var(--gray-900);

  /* Component */
  --card-background: var(--color-surface);
  --card-radius: var(--radius-24);
  --card-padding: var(--space-24);
  --page-banner-background: var(--color-primary);
}

.dark {
  --color-surface: var(--gray-900);
  --color-workspace: #030712;
  --color-text: var(--white);
}
```

هذا مثال للربط المستقبلي. النسخة الحالية تستخدم Tailwind والقيم الثابتة المبينة في هذا المستند. Settings القادمة تشمل ألوان المشروع واللوجو وfavicon واسم المشروع والعملات والتحويل بينها.

## مراجعة أي موديول منقول

- استخدام Shell وPageHeader وCard وButton والحقول المشتركة.
- فحص الاتجاهين en/ar، مع أرقام ومبالغ وبريد إلكتروني داخل نص عربي.
- فحص Light/Dark، والسايدبار expanded/collapsed/mobile.
- فحص عرض 375px و768px و1024px و1440px، وتمرير الجداول والتابات.
- التأكد من أسماء الأزرار، والحالة النشطة للتابات، وloading/error/empty/disabled حسب البيانات.
- مقارنة القيم والقياسات بالجدوال السابقة، وفصل منطق المصدر عن تصميم صفحاته أثناء الدمج.

هذا المرجع مستخرج من الكود. التحقق البصري في المتصفح يُسجّل بشكل مستقل عن استخراج المواصفات.
