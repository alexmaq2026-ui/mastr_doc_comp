/**
 * ═══════════════════════════════════════════════════════════════════════════
 * نظام المساعد التفاعلي ودليل النظام الذكي الشامل (Interactive System Guide)
 * تطوير وتنفيذ: ماقتك للحلول البرمجية (MAQATECH) لصالح جامعة صنعاء © 2026
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─── 1. قاعدة البيانات المعرفية المركزية لدليل النظام ─────────────────────────
const SYSTEM_GUIDE_DATA = {
    systemInfo: {
        title: "نظام المفاضلة والتنافس الإلكتروني للكادر الإداري",
        organization: "جامعـة صنعـاء - مجلـس الجامعـة",
        developer: "ماقتك للحلول البرمجية (MAQATECH Software Solutions)",
        version: "2026.1 Enterprise Pro",
        description: "منظومة إلكترونية ريادية مؤتمتة بنسبة 100% لإجراء المفاضلات الأكاديمية والإدارية لمنح الماجستير والدكتوراه وفق أدق معايير العدالة، الشفافية، وتراتبية كسر التعادل والتوثيق والرقابة السحابية."
    },

    // فهرس كافة شاشات النظام الـ 13
    screens: [
        {
            id: "tab-home",
            name: "الرئيسية ولوحة المؤشرات",
            navGroup: "الرئيسية",
            icon: "🏠",
            badge: "لوحة القيادة",
            summary: "الشاشة المركزية لمتابعة الإحصائيات العامة، معدلات الجاهزية، وفحص نواقص المتنافسين مع زر التنفيذ الشامل.",
            details: "تمنح متخذي القرار ورئيس اللجنة نظرة بانورامية فورية على أعداد المتقدمين للماجستير والدكتوراه، وعدد المنح المتاحة (6 منح: 4 ماجستير + 2 دكتوراه)، وتفحص آلياً 420 عنصراً بيانياً لكشف أي نقص قبل بدء المعالجة الحسابية.",
            keyFeatures: [
                "عدادات إحصائية ذكية لأعداد المتقدمين والمنح المتوفرة.",
                "رادار فحص الجاهزية والتوافق الآلي وحصر النواقص بالأرقام والنسب المئوية.",
                "زر التنفيذ الأسطوري لتشغيل المفاضلة الفورية لكافة السجلات.",
                "أزرار الإجراءات السريعة لكسر التعادل والاعتماد الرسمي وتصفير التجربة."
            ],
            buttons: [
                { id: "btn-run-nav", name: "تنفيذ وتطبيق المفاضلة", icon: "⚡", role: "admin", desc: "يقوم بحساب نقاط جميع المتنافسين وفق الأوزان المعيارية وترتيب الفائزين واحتياطهم فورياً." },
                { id: "btn-home-tiebreaker", name: "تراتبية كسر التعادل والمفاضلة الاستثنائية", icon: "⚖️", role: "committee", desc: "يفتح نافذة ضبط وإدارة معايير كسر التعادل الآلي وحالات التساوي النقطي." },
                { id: "btn-home-lock", name: "اعتماد وإغلاق المفاضلة", icon: "🔒", role: "admin", desc: "يفتح نافذة قفل الجلسة برمز الأمان لمنع أي تعديل لاحق وحفظ المحضر كنسخة نهائية." },
                { id: "btn-home-reset", name: "تصفير سجلات التجربة", icon: "🧹", role: "admin", desc: "يمسح سجلات الجلسات الاختبارية لإعادة النظام إلى حالته الابتدائية الرسمية." }
            ]
        },
        {
            id: "tab-dashboard",
            name: "كشف الفائزين الأولي (الملكي)",
            navGroup: "البيانات والمفاضلة",
            icon: "👑",
            badge: "الكشف المعتمد",
            summary: "عرض الكشف النهائي للمستحقين الأساسيين للمنح والاحتياط بتصميم ملكي فاخر جاهز للطباعة والاعتماد.",
            details: "يبرز الفائزين المستحقين لمنح الماجستير (4 فائزين) والدكتوراه (2 فائزين) مع الترتيب والاحتياط، ويعرض مجاميع النقاط وتفاصيل التخصص وملاحظات الاستحقاق.",
            keyFeatures: [
                "تصفية مرنة لعرض كشف الماجستير فقط، الدكتوراه فقط، أو كلاهما معاً.",
                "طباعة مسودة مؤمنة بعلامة مائية للمراجعة والتدقيق.",
                "طباعة النسخة الرسمية الملكية الجاهزة للتوقيعات والختم الإداري.",
                "ربط مباشر مع شاشة التقرير التفصيلي والمحضر الرسمي."
            ],
            buttons: [
                { id: "btn-dash-filter", name: "تصفية الدرجة (ماجستير/دكتوراه/الكل)", icon: "🎓", role: "all", desc: "تحديد عرض الفائزين حسب الدرجة العلمية المطلوبة." },
                { id: "btn-dash-print-draft", name: "طباعة مسودة", icon: "📝", role: "committee", desc: "توليد نسخة طباعة رسمية مسودة موسومة بعلامة مائية لغرض التدقيق والمراجعة." },
                { id: "btn-dash-print-final", name: "طباعة نهائية", icon: "🖨️", role: "admin", desc: "توليد كشف الفائزين النهائي المعتمد بأعلى جودة تنسيقية للتوقيع والاعتماد." },
                { id: "btn-dash-go-report", name: "التقرير التفصيلي", icon: "📊", role: "all", desc: "الانتقال السريع لشاشة التقرير التفصيلي الموسع لكافة النقاط." }
            ]
        },
        {
            id: "tab-candidates",
            name: "إدارة المتنافسين والكشوفات",
            navGroup: "البيانات والمفاضلة",
            icon: "👥",
            badge: "إدارة السجلات",
            summary: "إدارة سجلات الموظفين المتنافسين، الإضافة والتعديل والحذف، الاستيراد من إكسل، وطباعة البطائق وسجلات التسجيل.",
            details: "توفر سجلاً إدارياً دقيقاً لكل موظف متنافس يشمل: الاسم، الدرجة المطلوبة، التخصص، تاريخ التعيين، تاريخ الميلاد، سنة التخرج، والتقدير، مع إمكانية طباعة بطاقة فردية لكل متنافس لإقرار بياناته.",
            keyFeatures: [
                "إضافة وتعديل وحذف المتنافسين مع التحقق الصارم من صحة البيانات والتواريخ.",
                "محرك استيراد ذكي من ملفات Excel مع تصحيح الأخطاء واستخراج الحقول آلياً.",
                "تصدير السجل الكامل إلى Excel بنقرة واحدة.",
                "طباعة سجل التسجيل العام أو طباعة بطائق بيانات المتنافسين (مسودة أو نهائية)."
            ],
            buttons: [
                { id: "btn-cand-add", name: "إضافة متنافس جديد", icon: "➕", role: "admin", desc: "فتح نموذج تسجيل متنافس جديد وإدخال بياناته الأكاديمية والوظيفية." },
                { id: "btn-cand-import", name: "استيراد ملف إكسل", icon: "📥", role: "admin", desc: "رفع ملف Excel يحتوي كشوفات الموظفين وتضمينهم في قاعدة البيانات فوراً." },
                { id: "btn-cand-export-excel", name: "تصدير سجل المتنافسين (Excel)", icon: "📊", role: "all", desc: "تنزيل جدول المتنافسين كملف Excel كامل." },
                { id: "btn-cand-print-pdf", name: "طباعة سجل المتنافسين (PDF)", icon: "🖨️", role: "all", desc: "طباعة السجل الرسمي للمسجلين بالتنسيق الأكاديمي المعتمد." },
                { id: "btn-cand-print-cards-draft", name: "طباعة مسودة البطائق", icon: "📝", role: "committee", desc: "طباعة بطاقات المراجعة والتدقيق الفردية لجميع المتقدمين." },
                { id: "btn-cand-print-cards-final", name: "طباعة البطائق النهائية", icon: "🖨️", role: "admin", desc: "طباعة بطاقات إقرار البيانات الرسمية المعتمدة لتوقيع الموظفين." }
            ]
        },
        {
            id: "tab-scoring",
            name: "مصفوفة المفاضلة والترتيب",
            navGroup: "البيانات والمفاضلة",
            icon: "🔢",
            badge: "المعالجة والترتيب",
            summary: "عرض مصفوفة النقاط التفصيلية لكل متنافس حسب المعايير الأربعة الأساسية مع الترتيب الدقيق والحالة.",
            details: "توضح بالتفصيل توزيع النقاط الممنوحة لكل متنافس: نقاط الأقدمية، نقاط العمر، نقاط التخصص، ونقاط التقدير، مع إظهار المجموع الكلي، الترتيب التنازلي، وحالة الاستحقاق (مستحق أصيل / احتياط / لم يحالفه الحظ).",
            keyFeatures: [
                "تفكيك تفصيلي لنقاط كل معيار في أعمدة مستقلة وواضحة.",
                "زر استعراض بطاقة المتنافس ونظام إبداء ملاحظات التدقيق (للمراجع).",
                "طباعة مسودة المصفوفة للمراجعة أو طباعة المصفوفة النهائية المعتمدة.",
                "تصدير المصفوفة الحسابية كاملة إلى ملف Excel."
            ],
            buttons: [
                { id: "btn-score-filter", name: "عرض درجة (ماجستير / دكتوراه)", icon: "🔍", role: "all", desc: "التبديل بين مصفوفة تنافس الماجستير ومصفوفة تنافس الدكتوراه." },
                { id: "btn-score-draft", name: "طباعة مسودة للمراجعة", icon: "📝", role: "committee", desc: "توليد مسودة المصفوفة للتدقيق الداخلي للجنة المفاضلة." },
                { id: "btn-score-final", name: "طباعة مصفوفة نهائية", icon: "🖨️", role: "admin", desc: "طباعة مصفوفة المفاضلة والترتيب النهائية للتوقيع والاعتماد." },
                { id: "btn-score-excel", name: "تصدير Excel", icon: "📊", role: "all", desc: "تصدير مصفوفة النقاط والترتيب إلى جدول Excel." }
            ]
        },
        {
            id: "tab-minutes",
            name: "المحضر الرسمي لجلسة المفاضلة",
            navGroup: "البيانات والمفاضلة",
            icon: "📜",
            badge: "المحضر السيادي",
            summary: "توليد المحضر الرسمي القانوني المعتمد لجلسة المفاضلة وتأمينها وقفله رسمياً برمز الأمان السيادي.",
            details: "الوثيقة القانونية السيادية الأهم؛ تحتوي على ديباجة الاجتماع الرسمية، السند القانوني، أسماء أعضاء اللجنة، كشوفات الفائزين والاحتياط، وأسباب الاستحقاق مع مساحات التوقيعات الحية والأقفال المشفرة.",
            keyFeatures: [
                "متاح ومخصص لرئيس اللجنة ومدير النظام المعتمد.",
                "سحب تلقائي وفوري للبيانات من قاعدة البيانات ومصفوفة المفاضلة.",
                "قفل الجلسة وتشفيرها رسمياً لمنع أي تلاعب أو تغيير لاحق في النتائج.",
                "طباعة المسودة للمراجعة وطباعة المحضر النهائي المعتمد."
            ],
            buttons: [
                { id: "btn-min-draft", name: "طباعة مسودة للمراجعة", icon: "📝", role: "committee", desc: "طباعة مسودة المحضر الرسمي للتدقيق قبل الإغلاق النهائي." },
                { id: "btn-min-final", name: "طباعة المحضر النهائي", icon: "🖨️", role: "admin", desc: "طباعة المحضر الرسمي النهائي المعد للاجتماع والختم." },
                { id: "btn-min-lock", name: "اعتماد وتأمين المفاضلة نهائياً", icon: "🔒", role: "admin", desc: "إقفال الجلسة وتطبيق الحماية المشفرة ومنع أي تعديل أو إضافة لاحقة." },
                { id: "btn-min-reset-sessions", name: "تصفير سجلات التجربة", icon: "🧹", role: "admin", desc: "إعادة تعيين تاريخ الجلسات الاختبارية وبدء الجلسة الأولى الحقيقية." }
            ]
        },
        {
            id: "tab-report",
            name: "التقرير التفصيلي المعتمد",
            navGroup: "التقارير",
            icon: "📊",
            badge: "التقرير الشامل",
            summary: "التقرير الشامل الموجه لمجلس الجامعة متضمناً التحليل الكامل لنقاط كل مرشح وأسباب القبول والتفضيل.",
            details: "يقدم بياناً تحليلياً شاملاً لكل متنافس في جدول موحد، مع إيضاح أسباب الاستحقاق والأولوية ومعايير كسر التعادل المطبقة لكل مرشح، مما يوفر أعلى درجات الحجة والبرهان والشفافية.",
            keyFeatures: [
                "تصفية لكافة المتقدمين أو حسب الدرجة العلمية.",
                "عرض شامل يجمع بين البيانات الشخصية، الوظيفية، الأكاديمية، ونتائج المفاضلة.",
                "طباعة مسودة مدققة أو طباعة النسخة النهائية المعتمدة للتوقيعات."
            ],
            buttons: [
                { id: "btn-rep-filter", name: "تصفية الدرجة", icon: "🎓", role: "all", desc: "تحديد الفئة المعروضة في التقرير التفصيلي." },
                { id: "btn-rep-excel", name: "تصدير Excel", icon: "📊", role: "all", desc: "تصدير التقرير التفصيلي بصيغة إكسل." },
                { id: "btn-rep-draft", name: "طباعة مسودة للتدقيق", icon: "🖨️", role: "committee", desc: "طباعة مسودة التقرير التفصيلي بعلامة مائية." },
                { id: "btn-rep-final", name: "طباعة النسخة النهائية المعتمدة", icon: "📜", role: "admin", desc: "طباعة النسخة المعتمدة الموجهة لمجلس الجامعة." }
            ]
        },
        {
            id: "tab-criterion-report",
            name: "التقرير بحسب المعيار",
            navGroup: "التقارير",
            icon: "🎯",
            badge: "فرز تفاعلي",
            summary: "تقرير مخصص يتيح فرز وتصفية المتقدمين وترتيبهم استناداً إلى معيار محدد من معايير المفاضلة.",
            details: "يمكن للجنة والمراجعين فرز المتنافسين وفق الأقدمية فقط، أو العمر فقط، أو التخصصات، أو التقديرات، مع إمكانية تطبيق فلاتر متعددة للتحقق والتدقيق المستقل لكل ركيزة تقييمية.",
            keyFeatures: [
                "لوحة تحكم ديناميكية تفاعلية لتحديد معيار الفرز الرئيسي والفرعي.",
                "فرز تصاعدي أو تنازلي فوري للجداول.",
                "تصدير نتائج الفرز المخصص إلى Excel وطباعتها PDF."
            ],
            buttons: [
                { id: "btn-crit-rep-excel", name: "تصدير Excel", icon: "📊", role: "all", desc: "تصدير نتائج التقرير المعياري المفلتر إلى ملف إكسل." },
                { id: "btn-crit-rep-print", name: "طباعة التقرير المعياري PDF", icon: "🖨️", role: "all", desc: "طباعة تقرير الفرز المعياري المخصص بالتنسيق الرسمي." }
            ]
        },
        {
            id: "tab-analytics",
            name: "التقارير التحليلية والرقابية",
            navGroup: "التقارير",
            icon: "📈",
            badge: "رادار الفحص والتحليل",
            summary: "منظومة إحصائية ورقابية تضم رادار فحص النواقص، تحليل نقاط القوة والضعف، حصر التخصصات، والرسوم البيانية.",
            details: "تتضمن 4 تبويبات فرعية تحليلية: 1. تحليل نقاط القوة والضعف، 2. رادار فحص النواقص، 3. حصر التخصصات المجرد بدون أسماء، 4. الرسوم البيانية التفاعلية للهرم العمري والفئات الوظيفية.",
            keyFeatures: [
                "كشف فوري ودقيق لأي حقول ناقصة مع توجيه مباشر لاستكمالها.",
                "إحصائيات مجردة للتخصصات المطلوبة لدعم التخطيط الأكاديمي لجامعة صنعاء.",
                "رسوم بيانية توضح التوزيعات التكرارية والنسب المئوية.",
                "تصدير كافة التحليلات إلى Excel أو طباعتها PDF."
            ],
            buttons: [
                { id: "btn-ana-filter", name: "تصفية التقرير لـ", icon: "🔍", role: "all", desc: "اختيار نطاق التحليل (الكل / ماجستير / دكتوراه)." },
                { id: "btn-ana-excel", name: "تصدير التقارير Excel", icon: "📊", role: "all", desc: "تصدير كافة الجداول الإحصائية والتحليلية كملف إكسل." },
                { id: "btn-ana-print", name: "طباعة التقرير الحالي PDF", icon: "🖨️", role: "all", desc: "طباعة التبويب التحليلي النشط حالياً." }
            ]
        },
        {
            id: "tab-criteria-doc",
            name: "وثيقة المعايير والأوزان المعتمدة",
            navGroup: "التقارير",
            icon: "📋",
            badge: "الوثيقة المعيارية",
            summary: "عرض وتوثيق المعايير الأربعة والشرائح النقاطية والأوزان المعتمدة رسمياً في لائحة المفاضلة وطباعتها.",
            details: "تعرض بالتفصيل جدول الأوزان المعتمد (الأقدمية 30 نقطة، العمر 25 نقطة، التخصص 25 نقطة، التقدير 20 نقطة = 100 نقطة إجمالية) مع الشرائح التفصيلية ومعادلات الاحتساب وطباعتها كمرجع رسمي موثق.",
            keyFeatures: [
                "توضيح القواعد الحسابية والشرائح العمرية والوظيفية.",
                "طباعة وثيقة المعايير المعتمدة الموقعة من مجلس الجامعة."
            ],
            buttons: [
                { id: "btn-crit-doc-print", name: "طباعة وثيقة المعايير (PDF)", icon: "🖨️", role: "all", desc: "توليد وطباعة وثيقة المعايير والأوزان والشرائح النقاطية." }
            ]
        },
        {
            id: "tab-criteria",
            name: "تهيئة المعايير والأوزان",
            navGroup: "الإدارة والتهيئة",
            icon: "⚙️",
            badge: "المحرك الحسابي",
            summary: "شاشة تحكم لمدير النظام لتعديل الأوزان المعيارية، الشرائح النقاطية، وقواعد احتساب النقاط لكل معيار.",
            details: "تمنح مرونة تامة لتعديل أوزان المعايير بما يضمن الحفاظ على المجموع الكلي (100 نقطة)، مع إمكانية تعديل حدود الشرائح العمرية وسنوات الخدمة وتقديرات التخرج.",
            keyFeatures: [
                "تعديل وتخصيص نقاط كل معيار ونسبته المئوية.",
                "تعديل شرائح الأقدمية والعمر والتخصص والتقدير التراكمي.",
                "أقفال أمان لمنع التعديل في حال تم اعتماد وقفل الجلسة رسمياً."
            ],
            buttons: [
                { id: "btn-crit-save", name: "حفظ تعديلات المعايير", icon: "💾", role: "admin", desc: "اعتماد وحفظ الأوزان والشرائح النقاطية الجديدة وتطبيقها فوراً." },
                { id: "btn-crit-restore", name: "استعادة الإعدادات الافتراضية", icon: "🔄", role: "admin", desc: "إعادة الأوزان والشرائح إلى معايير لائحة جامعة صنعاء الأصلية." }
            ]
        },
        {
            id: "tab-tiebreaker",
            name: "⚖️ كسر التعادل والمفاضلة الاستثنائية",
            navGroup: "الإدارة والتهيئة",
            icon: "⚖️",
            badge: "التراتبية والعدالة",
            summary: "تهيئة وتطبيق القواعد الصارمة والتراتبية الحسابية لفض حالات التساوي في مجموع النقاط بين المتنافسين.",
            details: "في حال تساوى متنافسان في المجموع الكلي للنقاط، يطبق النظام آلياً تراتبية كسر التعادل المعتمدة: 1. الأقدم في تاريخ التعيين، 2. الأكبر سناً، 3. الأسبق في سنة التخرج، 4. التقدير التراكمي، مما يضمن الشفافية المطلقة والعدالة دون أي تدخل بشري.",
            keyFeatures: [
                "توضيح القواعد الأربع لكسر التعادل بالترتيب الإلزامي.",
                "تطبيق آلي ودقيق على النتائج واستخراج تقرير حالات التعادل المفضوضة.",
                "حفظ وتوثيق أسباب التفضيل في المحضر والتقرير النهائي."
            ],
            buttons: [
                { id: "btn-tie-apply", name: "تطبيق وحفظ معايير كسر التعادل", icon: "⚖️", role: "admin", desc: "حفظ وتفعيل خيارات التراتبية الحسابية لفض حالات التساوي." }
            ]
        },
        {
            id: "tab-admin",
            name: "إدارة النظام والصلاحيات",
            navGroup: "الإدارة والتهيئة",
            icon: "🛡️",
            badge: "الأمان والمزامنة",
            summary: "الربط السحابي مع Supabase، إدارة حسابات المستخدمين وصلاحياتهم، والنسخ الاحتياطي واستعادة البيانات.",
            details: "تتيح لمدير النظام ربط التطبيق بقاعدة البيانات السحابية Supabase لمزامنة السجلات لحظياً، إضافة وتعديل مستخدمي النظام (مدير، رئيس لجنة، مراجع، مستعرض)، وتصدير واستيراد النسخ الاحتياطية المشفرة.",
            keyFeatures: [
                "إعدادات الربط السحابي ومفتاح الاتصال بـ Supabase مع فحص الاتصال الحي.",
                "إدارة المستخدمين والأدوار وكلمات المرور وسياسات الأمان.",
                "النسخ الاحتياطي اليدوي والتلقائي واستعادة قاعدة البيانات.",
                "سجلات النشاط وفتح الأقفال الطارئة برموز الحماية."
            ],
            buttons: [
                { id: "btn-adm-save-sb", name: "حفظ إعدادات الربط السحابي", icon: "⚡", role: "admin", desc: "حفظ رابط ومفتاح مشروع Supabase واختبار الاتصال فوراً." },
                { id: "btn-adm-sync-now", name: "مزامنة سحابية فورية", icon: "🔄", role: "admin", desc: "رفع ومطابقة كافة البيانات المحلية مع قاعدة البيانات السحابية." },
                { id: "btn-adm-add-user", name: "إضافة مستخدم جديد", icon: "👤", role: "admin", desc: "إنشاء حساب جديد وتحديد صلاحياته (مدير / مراجع / مستعرض)." },
                { id: "btn-adm-export-backup", name: "تصدير نسخة احتياطية (JSON)", icon: "💾", role: "admin", desc: "حفظ نسخة احتياطية كاملة من قاعدة البيانات والإعدادات كملف JSON." },
                { id: "btn-adm-import-backup", name: "استعادة نسخة احتياطية", icon: "📥", role: "admin", desc: "استرجاع بيانات النظام من ملف نسخة احتياطية سابقة." }
            ]
        },
        {
            id: "tab-auditlog",
            name: "🛡️ سجل الرقابة والأمان",
            navGroup: "الإدارة والتهيئة",
            icon: "🛡️",
            badge: "التدقيق والشفافية",
            summary: "سجل تاريخي مشفر يسجل بدقة كل حركة وإجراء وتعديل ومحاولة دخول أو تغيير في النظام مع التوقيت والمستخدم.",
            details: "يوفر حماية رقابية صارمة حيث يدون آلياً: اسم المستخدم، نوع العملية، البيانات السابقة والحالية، الوقت والتاريخ الدقيق، وعنوان الجهاز، مما يضمن التوافق مع أعلى معايير الحوكمة والنزاهة المؤسسية.",
            keyFeatures: [
                "تسجيل غير قابل للتلاعب لكافة العمليات الحساسة (إضافة، تعديل، حذف، اعتماد، فك قفل).",
                "مزامنة فورية لسجل الرقابة مع خوادم Supabase السحابية.",
                "تصدير سجل الرقابة إلى PDF أو CSV للجهات الرقابية والمراجعة الداخلية.",
                "مسح السجل مقتصر على المدير السيادي مع تدوين عملية المسح نفسها."
            ],
            buttons: [
                { id: "btn-aud-export-pdf", name: "تصدير تقرير PDF", icon: "📄", role: "admin", desc: "توليد وطباعة تقرير سجل الرقابة والأمان الشامل كـ PDF رسمي." },
                { id: "btn-aud-export-csv", name: "تصدير CSV", icon: "📥", role: "admin", desc: "تنزيل سجل الأحداث كملف بيانات CSV للمطابقة والتحليل الخارجي." },
                { id: "btn-aud-clear", name: "مسح السجل كاملاً", icon: "🗑️", role: "admin", desc: "تفريغ سجل العمليات (يتطلب تأكيداً وصلاحيات مدير سيادي)." }
            ]
        }
    ],

    // سيناريوهات العمل العملية (Workflows)
    workflows: [
        {
            id: "wf-full-competition",
            title: "دورة المفاضلة الكاملة من الصفر حتى الاعتماد الرسمي",
            icon: "🏆",
            summary: "الدليل الشامل لإجراء عملية المفاضلة والتنافس السنوية لجامعة صنعاء بأعلى معايير الدقة والشفافية.",
            steps: [
                { num: 1, title: "تهيئة المعايير وأوزان المفاضلة", desc: "انتقل إلى شاشة [تهيئة المعايير والأوزان] وتحقق من مطابقة الأوزان المعيارية للائحة (الأقدمية 30، العمر 25، التخصص 25، التقدير 20)." },
                { num: 2, title: "استيراد وتدقيق بيانات المتنافسين", desc: "انتقل إلى شاشة [إدارة المتنافسين] وقم برفع كشف Excel للمتقدمين أو إضافة الموظفين يدوياً وتدقيق تواريخ التعيين والميلاد والتخصصات." },
                { num: 3, title: "فحص الجاهزية ورادار النواقص", desc: "من [الشاشة الرئيسية] و [التقارير التحليلية]، تأكد من أن نسبة الجاهزية 100% وخلو الكشوفات من أي بيانات ناقصة." },
                { num: 4, title: "تنفيذ وتطبيق المفاضلة الآلية", desc: "انقر على زر [تنفيذ وتطبيق المفاضلة] في الشاشة الرئيسية؛ ليقوم المحرك الحسابي باحتساب نقاط كل متنافس وترتيب الفائزين والاحتياط فوراً." },
                { num: 5, title: "مراجعة مصفوفة النقاط وكشف الفائزين", desc: "انتقل لشاشة [مصفوفة المفاضلة] وشاشة [كشف الفائزين الأولي] للمراجعة وتوليد مسودة المراجعة للجنة." },
                { num: 6, title: "المحضر الرسمي والاعتماد النهائي وتأمين الجلسة", desc: "انتقل إلى شاشة [المحضر الرسمي]، انقر على [اعتماد وتأمين المفاضلة نهائياً] وأدخل رمز الأمان لقفل النظام وتوليد المحضر والتقرير النهائي للتوقيع والختم." }
            ]
        },
        {
            id: "wf-excel-import",
            title: "استيراد بيانات المتنافسين من ملف Excel وتدقيقها",
            icon: "📥",
            summary: "كيفية تحضير ورفع ملف الإكسل ومعالجة البيانات المتنافسة بدون أخطاء.",
            steps: [
                { num: 1, title: "تجهيز ملف Excel بالأعمدة المطلوبة", desc: "تأكد من احتواء الملف على الأعمدة: (الاسم، الدرجة المطلوبة، التخصص، تاريخ التعيين، تاريخ الميلاد، سنة التخرج، التقدير)." },
                { num: 2, title: "الضغط على زر استيراد ملف إكسل", desc: "في شاشة [إدارة المتنافسين والكشوفات]، اضغط على زر [استيراد ملف إكسل] واختر الملف من جهازك." },
                { num: 3, title: "التدقيق الآلي والتأكيد", desc: "يقوم النظام بفحص السجلات وتوحيد صيغ التواريخ تلقائياً وحفظها في قاعدة البيانات المحلية والسحابية." },
                { num: 4, title: "طباعة بطاقات التأكيد", desc: "يمكن طباعة بطاقات إقرار البيانات الفردية لكل موظف للتوقيع عليها ومطابقتها مع الملف الورقي." }
            ]
        },
        {
            id: "wf-tiebreaker-handling",
            title: "معالجة حالات التعادل وقواعد التراتبية الحسابية",
            icon: "⚖️",
            summary: "فهم كيفية تطبيق النظام لتراتبية كسر التعادل عند تساوي مجموع النقاط.",
            steps: [
                { num: 1, title: "التعرف على حالة التعادل", desc: "عند تساوي متنافسين أو أكثر في إجمالي النقاط (مثلاً 75.00 نقطة لكلا المرشحين)." },
                { num: 2, title: "تطبيق المعيار الأول: أقدمية التعيين", desc: "يقارن النظام تاريخ التعيين، ويمنح الأولوية للموظف الأسبق في تاريخ مباشرة الخدمة في الجامعة." },
                { num: 3, title: "تطبيق المعيار الثاني: الأكبر سناً", desc: "في حال التساوي في تاريخ التعيين، يقارن النظام تاريخ الميلاد ويمنح الأولوية للمرشح الأكبر سناً." },
                { num: 4, title: "تطبيق المعيار الثالث: سنة التخرج والتقدير", desc: "في حال التساوي، يُقارن تاريخ التخرج والتقدير التراكمي في المؤهل السابق." },
                { num: 5, title: "التوثيق الشفاف في المحضر", desc: "يُسجل النظام سبب التفضيل وكسر التعادل كتابياً وبشكل تلقائي في عمود الملاحظات بالمحضر والتقرير التفصيلي." }
            ]
        },
        {
            id: "wf-locking-security",
            title: "إجراءات الاعتماد والقفل الرسمي وسجل الرقابة",
            icon: "🔒",
            summary: "آلية تأمين الجلسة ضد أي تعديل لاحق وتوثيق العمليات في سجل الرقابة.",
            steps: [
                { num: 1, title: "إتمام جلسة المفاضلة والمراجعة", desc: "التأكد من اكتمال كافة أعمال التدقيق والمفاضلة بحضور أعضاء اللجنة." },
                { num: 2, title: "فتح نافذة القفل الرسمي", desc: "الضغط على زر [اعتماد وتأمين المفاضلة نهائياً] في شاشة المحضر أو [اعتماد وإغلاق المفاضلة] في الرئيسية." },
                { num: 3, title: "إدخال رمز الأمان وتأكيد الإقفال", desc: "إدخال كود التأكيد، حيث يتم تجميد كافة أزرار التعديل والحذف والاستيراد وتتحول الشاشات إلى وضع العرض المعتمد فقط." },
                { num: 4, title: "تدوين الحركة في سجل الرقابة", desc: "يتم توثيق عملية القفل واسم المستخدم والتاريخ والوقت تلقائياً في [سجل الرقابة والأمان] ورفعه لسحابة Supabase." }
            ]
        }
    ],

    // معايير المفاضلة الحسابية والأوزان
    scoringCriteria: [
        {
            name: "الأقدمية في الخدمة الوظيفية",
            weight: "30 نقطة (30%)",
            icon: "⏳",
            desc: "تُمنح بناءً على عدد سنوات الخدمة الفعلية في جامعة صنعاء من تاريخ التعيين حتى تاريخ فتح باب التنافس.",
            formula: "تحتسب بنظام الشرائح التراكمية من تاريخ التعيين (حد أقصى 30 نقطة)."
        },
        {
            name: "العمر والمرحلة العمرية",
            weight: "25 نقطة (25%)",
            icon: "🎂",
            desc: "تُمنح بناءً على تاريخ الميلاد، مع إعطاء الأولوية للشرائح العمرية الأكثر استحقاقاً لفرصة إكمال الدراسات العليا.",
            formula: "تُحسب بالسنوات والأشهر بناءً على تاريخ الميلاد المسجل (حد أقصى 25 نقطة)."
        },
        {
            name: "مطابقة التخصص وطبيعة العمل",
            weight: "25 نقطة (25%)",
            icon: "🎯",
            desc: "تقييم مدى مطابقة التخصص المطلوب مع المؤهل السابق والاحتياج الإداري والتخصصي لجهة العمل بالجامعة.",
            formula: "مطابق تماماً = 25 نقطة، مطابق جزئياً = 18 نقطة، مغاير = 10 نقاط."
        },
        {
            name: "التقدير الأكاديمي في المؤهل السابق",
            weight: "20 نقطة (20%)",
            icon: "📜",
            desc: "تُمنح وفق التقدير التراكمي الحاصل عليه الموظف في البكالوريوس (للمفاضلة على الماجستير) أو في الماجستير (للمفاضلة على الدكتوراه).",
            formula: "ممتاز = 20 نقطة، جيد جداً = 15 نقطة، جيد = 10 نقاط، مقبول = 5 نقاط."
        }
    ]
};

// ─── 2. الحالة العامة لمحرك المساعد التفاعلي ─────────────────────────────────
let activeAssistantSubTab = "screens";
let activeScreenIdForDetail = "tab-home";
let isInspectModeActive = false;
let currentTourStep = 0;
let activeTourSteps = [];

// ─── 3. خطوات الجولة التفاعلية الحية (Spotlight Guided Tour Steps) ─────────────
const SYSTEM_TOUR_STEPS = [
    {
        targetId: "dropdown-nav",
        tabId: "tab-home",
        title: "شريط التنقل الذكي",
        desc: "يحتوي على كافة مجموعات الشاشات: البيانات والمفاضلة، التقارير المعتمدة، وإدارة النظام والتهيئة.",
        position: "bottom"
    },
    {
        targetId: "home-stats-grid",
        tabId: "tab-home",
        title: "لوحة الإحصائيات الفورية",
        desc: "تعرض إجمالي المتقدمين وتوزيعهم بين الماجستير والدكتوراه، وعدد المنح المعتمدة (6 منح تنافسية).",
        position: "bottom"
    },
    {
        targetId: "main-box-readiness",
        tabId: "tab-home",
        title: "رادار الجاهزية وفحص النواقص",
        desc: "يفحص 420 عنصراً بيانياً آلياً للتأكد من خلو ملفات المتنافسين من أي نواقص قبل بدء الحساب.",
        position: "bottom"
    },
    {
        targetId: "btn-run-nav",
        tabId: "tab-home",
        title: "زر تنفيذ وتطبيق المفاضلة",
        desc: "الزر الأسطوري الذي يطلق المعالجة الحسابية وترتيب الفائزين والاحتياط في أجزاء من الثانية!",
        position: "top"
    },
    {
        targetId: "home-bottom-actions-box",
        tabId: "tab-home",
        title: "أزرار الإجراءات السريعة",
        desc: "وصول فوري لتراتبية كسر التعادل، اعتماد وإغلاق المفاضلة، وتصفير سجلات التجربة.",
        position: "top"
    },
    {
        targetId: "tab-btn-dashboard",
        tabId: "tab-dashboard",
        title: "كشف الفائزين الملكي",
        desc: "يعرض النتائج النهائية المعتمدة للمستحقين والاحتياط مع خيارات الطباعة المسودة والنهائية.",
        position: "bottom"
    },
    {
        targetId: "tab-btn-candidates",
        tabId: "tab-candidates",
        title: "إدارة المتنافسين واستيراد Excel",
        desc: "سجل كامل للمرشحين مع إمكانية استيراد وتصدير إكسل وطباعة بطاقات إقرار البيانات الفردية.",
        position: "bottom"
    },
    {
        targetId: "tab-btn-scoring",
        tabId: "tab-scoring",
        title: "مصفوفة المفاضلة وتفاصيل النقاط",
        desc: "توزيع دقيق لنقاط الأقدمية، العمر، التخصص، والتقدير لكل متنافس مع الترتيب والملاحظات.",
        position: "bottom"
    },
    {
        targetId: "tab-btn-minutes",
        tabId: "tab-minutes",
        title: "المحضر الرسمي والاعتماد السيادي",
        desc: "الوثيقة القانونية الرسمية المعتمدة لاجتماع جلسة المفاضلة مع أقفال الأمان والتوثيق النهائي.",
        position: "bottom"
    }
];

// ─── 4. دوال فتح وإغلاق والتحكم في نافذة المساعد الشامل ───────────────────────

/**
 * فتح نافذة المساعد الذكي
 * @param {string} subTab - اسم التبويب المطلوب (screens, buttons, workflows, scoring)
 * @param {string} targetScreenId - معرف الشاشة المستهدفة للتركيز عليها
 */
function openAssistantGuide(subTab = "screens", targetScreenId = null) {
    const modal = document.getElementById("modal-assistant-guide");
    if (!modal) {
        injectAssistantModalDOM();
    }
    
    const activeModal = document.getElementById("modal-assistant-guide");
    activeModal.classList.add("active");
    
    // المساعد السياقي: إذا لم يتم تحديد شاشة، استكشف الشاشة النشطة حالياً في النظام
    if (!targetScreenId) {
        const activeTabEl = document.querySelector(".tab-content.active");
        if (activeTabEl && activeTabEl.id) {
            targetScreenId = activeTabEl.id;
        } else {
            targetScreenId = "tab-home";
        }
    }
    
    activeScreenIdForDetail = targetScreenId;
    switchAssistantSubTab(subTab);
    
    // تركيز البحث
    const searchInput = document.getElementById("assistant-guide-search");
    if (searchInput) {
        searchInput.value = "";
        searchInput.focus();
    }
}

/**
 * إغلاق نافذة المساعد الذكي
 */
function closeAssistantGuide() {
    const modal = document.getElementById("modal-assistant-guide");
    if (modal) {
        modal.classList.remove("active");
    }
}

/**
 * التبديل بين التبويبات الرئيسية داخل نافذة المساعد
 */
function switchAssistantSubTab(subTab) {
    activeAssistantSubTab = subTab;
    
    // تحديث أزرار التبويبات
    document.querySelectorAll(".assistant-tab-item").forEach(btn => {
        if (btn.getAttribute("data-subtab") === subTab) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    const sidebar = document.getElementById("assistant-sidebar-container");
    const contentPane = document.getElementById("assistant-content-pane");
    if (!contentPane) return;

    if (subTab === "screens") {
        if (sidebar) sidebar.style.display = "flex";
        renderAssistantScreensList();
        renderAssistantScreenDetail(activeScreenIdForDetail);
    } else if (subTab === "buttons") {
        if (sidebar) sidebar.style.display = "none";
        renderAssistantButtonsDirectory();
    } else if (subTab === "workflows") {
        if (sidebar) sidebar.style.display = "none";
        renderAssistantWorkflows();
    } else if (subTab === "scoring") {
        if (sidebar) sidebar.style.display = "none";
        renderAssistantScoringGuide();
    }
}

// ─── 5. دوال العرض والـ Rendering داخل نافذة المساعد ─────────────────────────

/**
 * عرض القائمة الجانبية للشاشات الـ 13
 */
function renderAssistantScreensList() {
    const sidebar = document.getElementById("assistant-sidebar-container");
    if (!sidebar) return;

    let html = `<div class="assistant-sidebar-title">فهرس شاشات النظام (13 شاشة)</div>`;
    
    SYSTEM_GUIDE_DATA.screens.forEach(screen => {
        const isActive = screen.id === activeScreenIdForDetail ? "active" : "";
        html += `
            <button class="assistant-nav-link ${isActive}" onclick="selectAssistantScreen('${screen.id}')">
                <span style="display:flex; align-items:center; gap:8px;">
                    <span>${screen.icon}</span>
                    <span>${screen.name}</span>
                </span>
                <span class="link-badge">${screen.buttons.length} أزرار</span>
            </button>
        `;
    });

    sidebar.innerHTML = html;
}

/**
 * تحديد شاشة وعرض تفاصيلها
 */
function selectAssistantScreen(screenId) {
    activeScreenIdForDetail = screenId;
    renderAssistantScreensList();
    renderAssistantScreenDetail(screenId);
}

/**
 * عرض تفاصيل شاشة معينة وأزرارها
 */
function renderAssistantScreenDetail(screenId) {
    const contentPane = document.getElementById("assistant-content-pane");
    if (!contentPane) return;

    const screen = SYSTEM_GUIDE_DATA.screens.find(s => s.id === screenId) || SYSTEM_GUIDE_DATA.screens[0];

    let buttonsTableRows = "";
    screen.buttons.forEach(btn => {
        const roleClass = btn.role === "admin" ? "role-admin" : (btn.role === "committee" ? "role-committee" : "role-all");
        const roleLabel = btn.role === "admin" ? "مدير النظام" : (btn.role === "committee" ? "لجنة المفاضلة" : "الجميع");

        buttonsTableRows += `
            <tr>
                <td style="font-weight:800; color:#f1f5f9; white-space:nowrap;">
                    <span class="guide-btn-badge" style="background:rgba(37,99,235,0.2); color:#60a5fa; border:1px solid rgba(37,99,235,0.4);">
                        <span>${btn.icon}</span>
                        <span>${btn.name}</span>
                    </span>
                </td>
                <td style="color:#cbd5e1; line-height:1.5;">${btn.desc}</td>
                <td><span class="guide-role-badge ${roleClass}">${roleLabel}</span></td>
            </tr>
        `;
    });

    let keyFeaturesList = "";
    screen.keyFeatures.forEach(feat => {
        keyFeaturesList += `<li style="margin-bottom:6px; color:#e2e8f0;">${feat}</li>`;
    });

    contentPane.innerHTML = `
        <div class="guide-card" style="border-right: 4px solid #2dd4bf; background: linear-gradient(135deg, rgba(13,148,136,0.1), rgba(15,23,42,0.8));">
            <div class="guide-card-header">
                <div>
                    <h3 class="guide-card-title">
                        <span>${screen.icon}</span>
                        <span>${screen.name}</span>
                        <span style="font-size:0.75rem; background:rgba(45,212,191,0.2); color:#2dd4bf; padding:3px 10px; border-radius:12px; border:1px solid rgba(45,212,191,0.4);">${screen.badge}</span>
                    </h3>
                    <p class="guide-card-subtitle">المجموعة: ${screen.navGroup} | معرف الشاشة: <code>${screen.id}</code></p>
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-primary btn-sm" onclick="jumpToScreen('${screen.id}')" style="background:linear-gradient(135deg,#0d9488,#2563eb); font-weight:800; font-size:0.82rem; border-radius:8px;">
                        🚀 الانتقال للشاشة الآن
                    </button>
                    <button class="btn btn-warning btn-sm" onclick="startGuidedTour('single', '${screen.id}')" style="background:linear-gradient(135deg,#d97706,#b45309); font-weight:800; font-size:0.82rem; border-radius:8px; border:none; color:#fff;">
                        ✨ جولة في هذه الشاشة
                    </button>
                </div>
            </div>
            
            <div style="margin-bottom:16px;">
                <h4 style="color:#2dd4bf; font-size:0.92rem; font-weight:800; margin-bottom:6px;">📌 الوظيفة والهدف الأساسي:</h4>
                <p style="color:#cbd5e1; font-size:0.88rem; line-height:1.7; margin:0;">${screen.details}</p>
            </div>

            <div style="margin-bottom:16px;">
                <h4 style="color:#2dd4bf; font-size:0.92rem; font-weight:800; margin-bottom:6px;">🌟 أبرز المميزات والإمكانيات:</h4>
                <ul style="padding-right:20px; margin:0; font-size:0.86rem;">
                    ${keyFeaturesList}
                </ul>
            </div>
        </div>

        <div class="guide-card">
            <h4 style="color:#f8fafc; font-size:1rem; font-weight:800; margin:0 0 12px 0; display:flex; align-items:center; gap:8px;">
                <span>🔘</span>
                <span>دليل وشرح أزرار وعمليات هذه الشاشة (${screen.buttons.length} أزرار):</span>
            </h4>
            <div style="overflow-x:auto;">
                <table class="guide-table">
                    <thead>
                        <tr>
                            <th style="width:25%;">اسم الزر / الإجراء</th>
                            <th style="width:55%;">الوظيفة والأثر المترتب على الضغط عليه</th>
                            <th style="width:20%;">الصلاحية المسموحة</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${buttonsTableRows}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

/**
 * عرض قاموس كافة الأزرار والعمليات مع التصفية بالبحث
 */
function renderAssistantButtonsDirectory(searchQuery = "") {
    const contentPane = document.getElementById("assistant-content-pane");
    if (!contentPane) return;

    let allButtons = [];
    SYSTEM_GUIDE_DATA.screens.forEach(scr => {
        scr.buttons.forEach(btn => {
            allButtons.push({
                ...btn,
                screenName: scr.name,
                screenId: scr.id,
                screenIcon: scr.icon
            });
        });
    });

    if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase().trim();
        allButtons = allButtons.filter(b => 
            b.name.toLowerCase().includes(q) || 
            b.desc.toLowerCase().includes(q) || 
            b.screenName.toLowerCase().includes(q)
        );
    }

    let rows = "";
    allButtons.forEach(btn => {
        const roleClass = btn.role === "admin" ? "role-admin" : (btn.role === "committee" ? "role-committee" : "role-all");
        const roleLabel = btn.role === "admin" ? "مدير النظام" : (btn.role === "committee" ? "لجنة المفاضلة" : "الجميع");

        rows += `
            <tr>
                <td style="font-weight:800; color:#f1f5f9; white-space:nowrap;">
                    <span class="guide-btn-badge" style="background:rgba(37,99,235,0.2); color:#60a5fa; border:1px solid rgba(37,99,235,0.4);">
                        <span>${btn.icon}</span>
                        <span>${btn.name}</span>
                    </span>
                </td>
                <td>
                    <button onclick="jumpToScreen('${btn.screenId}')" style="background:none; border:none; color:#2dd4bf; cursor:pointer; font-weight:700; display:inline-flex; align-items:center; gap:4px; font-size:0.84rem; text-decoration:underline;">
                        <span>${btn.screenIcon}</span>
                        <span>${btn.screenName}</span>
                    </button>
                </td>
                <td style="color:#cbd5e1; line-height:1.5;">${btn.desc}</td>
                <td><span class="guide-role-badge ${roleClass}">${roleLabel}</span></td>
            </tr>
        `;
    });

    contentPane.innerHTML = `
        <div class="guide-card">
            <div class="guide-card-header">
                <div>
                    <h3 class="guide-card-title">📖 قاموس أزرار وإجراءات النظام الشامل</h3>
                    <p class="guide-card-subtitle">دليل موحد لكافة الأزرار والعمليات في جميع الشاشات مع توضيح الصلاحيات والأثر المترتب.</p>
                </div>
                <div style="font-size:0.85rem; color:#94a3b8; font-weight:700;">
                    إجمالي الأزرار المعروضة: <span style="color:#2dd4bf; font-weight:900;">${allButtons.length}</span>
                </div>
            </div>

            <div style="overflow-x:auto;">
                <table class="guide-table">
                    <thead>
                        <tr>
                            <th style="width:22%;">اسم الزر</th>
                            <th style="width:20%;">الشاشة التابع لها</th>
                            <th style="width:43%;">الوظيفة والأثر المترتب</th>
                            <th style="width:15%;">الصلاحية</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length > 0 ? rows : `<tr><td colspan="4" style="text-align:center; padding:30px; color:#94a3b8;">لم يتم العثور على أزرار تطابق عبارة البحث</td></tr>`}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

/**
 * عرض أدلة سيناريوهات العمل التفصيلية (Workflows)
 */
function renderAssistantWorkflows() {
    const contentPane = document.getElementById("assistant-content-pane");
    if (!contentPane) return;

    let html = `
        <div style="margin-bottom:20px;">
            <h3 style="font-size:1.15rem; font-weight:900; color:#f8fafc; margin:0 0 6px 0;">🎯 أدلة سيناريوهات العمل التنفيذية (خطوة بخطوة)</h3>
            <p style="font-size:0.85rem; color:#94a3b8; margin:0;">أدلة إرشادية عملية توضح بالتسلسل المنطقي كيفية إنجاز المهام الكبرى وإجراء المفاضلة بدقة متناهية.</p>
        </div>
    `;

    SYSTEM_GUIDE_DATA.workflows.forEach(wf => {
        let stepsHtml = "";
        wf.steps.forEach(step => {
            stepsHtml += `
                <div class="workflow-step-item">
                    <div class="workflow-step-circle">${step.num}</div>
                    <div class="workflow-step-box">
                        <h4>${step.title}</h4>
                        <p>${step.desc}</p>
                    </div>
                </div>
            `;
        });

        html += `
            <div class="guide-card" style="margin-bottom:24px;">
                <div class="guide-card-header">
                    <h3 class="guide-card-title">
                        <span>${wf.icon}</span>
                        <span>${wf.title}</span>
                    </h3>
                </div>
                <p style="color:#cbd5e1; font-size:0.88rem; margin:0 0 16px 0;">${wf.summary}</p>
                <div class="workflow-step-list">
                    ${stepsHtml}
                </div>
            </div>
        `;
    });

    contentPane.innerHTML = html;
}

/**
 * عرض وثيقة معايير المفاضلة والأوزان وطريقة الحساب
 */
function renderAssistantScoringGuide() {
    const contentPane = document.getElementById("assistant-content-pane");
    if (!contentPane) return;

    let criteriaCards = "";
    SYSTEM_GUIDE_DATA.scoringCriteria.forEach(c => {
        criteriaCards += `
            <div class="guide-card" style="margin-bottom:14px; background:rgba(15,23,42,0.6); border-right:4px solid #3b82f6;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <h4 style="margin:0; font-size:0.98rem; font-weight:800; color:#f8fafc; display:flex; align-items:center; gap:8px;">
                        <span>${c.icon}</span>
                        <span>${c.name}</span>
                    </h4>
                    <span style="background:rgba(37,99,235,0.2); color:#60a5fa; border:1px solid rgba(37,99,235,0.4); padding:3px 10px; border-radius:10px; font-size:0.8rem; font-weight:800;">${c.weight}</span>
                </div>
                <p style="color:#cbd5e1; font-size:0.86rem; margin:0 0 8px 0; line-height:1.6;">${c.desc}</p>
                <div style="background:rgba(0,0,0,0.3); padding:8px 12px; border-radius:8px; font-size:0.8rem; color:#93c5fd; font-family:monospace;">
                    🧮 معادلة الاحتساب: ${c.formula}
                </div>
            </div>
        `;
    });

    contentPane.innerHTML = `
        <div class="guide-card">
            <div class="guide-card-header">
                <div>
                    <h3 class="guide-card-title">⚖️ معايير وقوانين المفاضلة الأكاديمية وتراتبية كسر التعادل</h3>
                    <p class="guide-card-subtitle">المجموع الكلي للنقاط (100 نقطة) موزع بدقة متناهية على 4 ركائز وفق لائحة جامعة صنعاء المعتمدة.</p>
                </div>
                <button class="btn btn-outline btn-sm" onclick="jumpToScreen('tab-criteria')" style="border-color:#2dd4bf; color:#2dd4bf; font-weight:800;">
                    ⚙️ تعديل الأوزان في الإدارة
                </button>
            </div>

            <div style="display:grid; grid-template-columns:1fr; gap:12px; margin-top:16px;">
                ${criteriaCards}
            </div>

            <div style="margin-top:20px; background:linear-gradient(135deg, rgba(217,119,6,0.15), rgba(15,23,42,0.8)); border:1.5px solid rgba(245,158,11,0.4); border-radius:12px; padding:16px;">
                <h4 style="color:#fbbf24; font-size:0.95rem; font-weight:900; margin:0 0 8px 0; display:flex; align-items:center; gap:8px;">
                    <span>⚖️</span>
                    <span>تراتبية كسر التعادل الإلزامية عند تساوي مجموع النقاط:</span>
                </h4>
                <ol style="padding-right:24px; margin:0; font-size:0.86rem; color:#f1f5f9; line-height:1.7;">
                    <li><strong>المعيار الأول:</strong> الأقدم في تاريخ التعيين والمباشرة بالجامعة.</li>
                    <li><strong>المعيار الثاني:</strong> الأكبر سناً بناءً على تاريخ الميلاد المسجل.</li>
                    <li><strong>المعيار الثالث:</strong> الأسبق في سنة التخرج والحصول على المؤهل السابق.</li>
                    <li><strong>المعيار الرابع:</strong> التقدير التراكمي الأعلى في المؤهل السابق.</li>
                </ol>
            </div>
        </div>
    `;
}

/**
 * معالجة البحث الفوري في المساعد
 */
function handleAssistantSearch(event) {
    const query = event.target.value;
    if (activeAssistantSubTab === "buttons") {
        renderAssistantButtonsDirectory(query);
    } else {
        // إذا كان يبحث في الشاشات
        if (query.trim() === "") {
            renderAssistantScreensList();
            renderAssistantScreenDetail(activeScreenIdForDetail);
            return;
        }
        
        const q = query.toLowerCase().trim();
        const matchedScreens = SYSTEM_GUIDE_DATA.screens.filter(s => 
            s.name.toLowerCase().includes(q) || 
            s.details.toLowerCase().includes(q) || 
            s.summary.toLowerCase().includes(q) ||
            s.buttons.some(b => b.name.toLowerCase().includes(q) || b.desc.toLowerCase().includes(q))
        );

        if (matchedScreens.length > 0) {
            activeScreenIdForDetail = matchedScreens[0].id;
            renderAssistantScreensList();
            renderAssistantScreenDetail(activeScreenIdForDetail);
        }
    }
}

/**
 * القفز المباشر لشاشة معينة وإغلاق المساعد
 */
function jumpToScreen(screenId) {
    closeAssistantGuide();
    if (typeof switchTab === "function") {
        const screen = SYSTEM_GUIDE_DATA.screens.find(s => s.id === screenId);
        const label = screen ? screen.name : "";
        switchTab(screenId, label);
    }
}

/**
 * طباعة أو تصدير دليل المستخدم الرسمي
 */
function printAssistantOfficialGuide() {
    window.print();
}

// ─── 6. محرك الجولة التفاعلية الحية (Spotlight Tour Engine) ───────────────────

/**
 * بدء الجولة التفاعلية
 * @param {string} mode - 'all' لكامل النظام، أو 'single' لشاشة واحدة
 * @param {string} specificScreenId - معرف الشاشة في حال كان النمط فردياً
 */
function startGuidedTour(mode = "all", specificScreenId = null) {
    closeAssistantGuide();

    if (mode === "single" && specificScreenId) {
        // إنشاء خطوات الجولة الخاصة بالشاشة المحددة
        const screen = SYSTEM_GUIDE_DATA.screens.find(s => s.id === specificScreenId);
        if (screen) {
            activeTourSteps = [
                {
                    targetId: screen.id,
                    tabId: screen.id,
                    title: `جولة في ${screen.name}`,
                    desc: screen.details,
                    position: "bottom"
                }
            ];
            screen.buttons.forEach(b => {
                activeTourSteps.push({
                    targetId: b.id,
                    tabId: screen.id,
                    title: `زر: ${b.name}`,
                    desc: b.desc,
                    position: "top"
                });
            });
        }
    } else {
        activeTourSteps = [...SYSTEM_TOUR_STEPS];
    }

    currentTourStep = 0;
    injectTourElementsDOM();
    showTourStep(currentTourStep);
}

/**
 * عرض خطوة معينة في الجولة التفاعلية
 */
function showTourStep(index) {
    if (index < 0 || index >= activeTourSteps.length) {
        endGuidedTour();
        return;
    }

    currentTourStep = index;
    const step = activeTourSteps[index];

    // الانتقال للشاشة المطلوبة أولاً إن لزم الأمر
    if (step.tabId && typeof switchTab === "function") {
        switchTab(step.tabId);
    }

    setTimeout(() => {
        const targetEl = document.getElementById(step.targetId) || document.querySelector(`[data-tab="${step.targetId}"]`);
        const backdrop = document.getElementById("tour-backdrop");
        const highlight = document.getElementById("tour-highlight");
        const popover = document.getElementById("tour-popover");

        if (!backdrop || !highlight || !popover) return;

        backdrop.classList.add("active");

        if (targetEl && targetEl.offsetParent !== null) {
            const rect = targetEl.getBoundingClientRect();
            
            // تحديد أبعاد التركيز
            highlight.style.display = "block";
            highlight.style.top = `${rect.top - 6}px`;
            highlight.style.left = `${rect.left - 6}px`;
            highlight.style.width = `${rect.width + 12}px`;
            highlight.style.height = `${rect.height + 12}px`;

            // موضع بطاقة الشرح
            let popTop = rect.bottom + 16;
            let popLeft = rect.left;

            if (popTop + 240 > window.innerHeight) {
                popTop = Math.max(20, rect.top - 240);
            }
            if (popLeft + 380 > window.innerWidth) {
                popLeft = Math.max(20, window.innerWidth - 400);
            }

            popover.style.top = `${popTop}px`;
            popover.style.left = `${popLeft}px`;
            popover.style.display = "block";
        } else {
            // توسيط البطاقة في حال عدم العثور على العنصر بدقة
            highlight.style.display = "none";
            popover.style.top = "50%";
            popover.style.left = "50%";
            popover.style.transform = "translate(-50%, -50%)";
            popover.style.display = "block";
        }

        // محتوى بطاقة الخطوة
        popover.innerHTML = `
            <div class="tour-card-header">
                <span class="tour-step-badge">خطوة ${index + 1} من ${activeTourSteps.length}</span>
                <button onclick="endGuidedTour()" style="background:none;border:none;color:#94a3b8;font-size:1.1rem;cursor:pointer;">✕</button>
            </div>
            <h3 class="tour-card-title">💡 ${step.title}</h3>
            <p class="tour-card-desc">${step.desc}</p>
            <div class="tour-card-footer">
                <button class="tour-btn-skip" onclick="endGuidedTour()">إنهاء الجولة</button>
                <div style="display:flex; gap:8px;">
                    ${index > 0 ? `<button class="tour-nav-btn tour-btn-prev" onclick="showTourStep(${index - 1})">السابق ➡️</button>` : ''}
                    <button class="tour-nav-btn tour-btn-next" onclick="showTourStep(${index + 1})">
                        ${index === activeTourSteps.length - 1 ? '🎉 إنهاء الجولة' : 'التالي ⬅️'}
                    </button>
                </div>
            </div>
        `;
    }, 250);
}

/**
 * إنهاء وإغلاق الجولة التفاعلية
 */
function endGuidedTour() {
    const backdrop = document.getElementById("tour-backdrop");
    const highlight = document.getElementById("tour-highlight");
    const popover = document.getElementById("tour-popover");

    if (backdrop) backdrop.classList.remove("active");
    if (highlight) highlight.style.display = "none";
    if (popover) popover.style.display = "none";
}

// ─── 7. وضع استكشاف وفحص الأزرار التفاعلي (Interactive Inspect Mode) ─────────

/**
 * تفعيل / تعطيل وضع فحص الأزرار
 */
function toggleInspectMode() {
    isInspectModeActive = !isInspectModeActive;
    closeAssistantGuide();

    let banner = document.getElementById("inspect-banner");
    if (isInspectModeActive) {
        document.body.classList.add("guide-inspect-active");
        if (!banner) {
            banner = document.createElement("div");
            banner.id = "inspect-banner";
            banner.className = "inspect-floating-banner";
            banner.innerHTML = `
                <span>🔍 وضع استكشاف الأزرار نشط (حرك الفأرة فوق أي زر لمعرفة عمله)</span>
                <button onclick="toggleInspectMode()" style="background:rgba(255,255,255,0.2); border:none; color:#fff; padding:4px 12px; border-radius:15px; font-weight:800; cursor:pointer;">✕ إنهاء الفحص</button>
            `;
            document.body.appendChild(banner);
        } else {
            banner.style.display = "flex";
        }
        enableInspectHoverListeners();
    } else {
        document.body.classList.remove("guide-inspect-active");
        if (banner) banner.style.display = "none";
        hideInspectPopover();
    }
}

function enableInspectHoverListeners() {
    document.addEventListener("mouseover", handleInspectMouseOver);
}

function handleInspectMouseOver(e) {
    if (!isInspectModeActive) return;
    const target = e.target.closest("button, a, select, input, .stat-card, .home-stat-card");
    if (!target) {
        hideInspectPopover();
        return;
    }

    const text = target.innerText || target.getAttribute("title") || target.placeholder || target.id;
    if (!text) return;

    showInspectPopover(target, text);
}

function showInspectPopover(element, text) {
    let pop = document.getElementById("inspect-popover");
    if (!pop) {
        pop = document.createElement("div");
        pop.id = "inspect-popover";
        pop.className = "inspect-tooltip-popover";
        document.body.appendChild(pop);
    }

    const rect = element.getBoundingClientRect();
    pop.innerHTML = `
        <div class="inspect-tooltip-title">💡 عنصر تفاعلي:</div>
        <div>${text.substring(0, 100)}</div>
    `;
    pop.style.top = `${rect.bottom + 10}px`;
    pop.style.left = `${Math.min(window.innerWidth - 300, Math.max(10, rect.left))}px`;
    pop.style.display = "block";
}

function hideInspectPopover() {
    const pop = document.getElementById("inspect-popover");
    if (pop) pop.style.display = "none";
}

// ─── 8. بناء وتضمين عناصر الـ DOM للمساعد والجولة تلقائياً ───────────────────

function injectAssistantModalDOM() {
    if (document.getElementById("modal-assistant-guide")) return;

    const modalDiv = document.createElement("div");
    modalDiv.id = "modal-assistant-guide";
    modalDiv.className = "assistant-modal-backdrop";
    modalDiv.innerHTML = `
        <div class="assistant-modal-dialog">
            <!-- الترويسة -->
            <div class="assistant-header">
                <div class="assistant-title-group">
                    <div class="assistant-title-badge">💡</div>
                    <div class="assistant-title-text">
                        <h2>المساعد الذكي ودليل استخدام النظام</h2>
                        <p>جامعة صنعاء - مجلس الجامعة | تطوير ماقتك للحلول البرمجية (MAQATECH)</p>
                    </div>
                </div>
                <div class="assistant-header-actions">
                    <button class="btn btn-warning btn-sm" onclick="startGuidedTour('all')" style="background:linear-gradient(135deg,#d97706,#b45309); color:#fff; font-weight:800; border-radius:8px; border:none;">
                        ✨ جولة النظام التفاعلية
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="toggleInspectMode()" style="border-color:#38bdf8; color:#38bdf8; font-weight:800; border-radius:8px;">
                        🔍 وضع استكشاف الأزرار
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="printAssistantOfficialGuide()" style="background:linear-gradient(135deg,#0d9488,#0f766e); font-weight:800; border-radius:8px;">
                        🖨️ طباعة الدليل
                    </button>
                    <button onclick="closeAssistantGuide()" style="background:rgba(255,255,255,0.08); border:none; color:#f8fafc; font-size:1.2rem; width:36px; height:36px; border-radius:8px; cursor:pointer;">✕</button>
                </div>
            </div>

            <!-- التبويبات العلوية -->
            <div class="assistant-nav-bar">
                <button class="assistant-tab-item active" data-subtab="screens" onclick="switchAssistantSubTab('screens')">
                    <span>🖥️</span>
                    <span>دليل الشاشات (13 شاشة)</span>
                </button>
                <button class="assistant-tab-item" data-subtab="buttons" onclick="switchAssistantSubTab('buttons')">
                    <span>🔘</span>
                    <span>قاموس الأزرار والإجراءات</span>
                </button>
                <button class="assistant-tab-item" data-subtab="workflows" onclick="switchAssistantSubTab('workflows')">
                    <span>🎯</span>
                    <span>أدلة سيناريوهات العمل (خطوة بخطوة)</span>
                </button>
                <button class="assistant-tab-item" data-subtab="scoring" onclick="switchAssistantSubTab('scoring')">
                    <span>⚖️</span>
                    <span>معايير المفاضلة وكسر التعادل</span>
                </button>
            </div>

            <!-- شريط البحث -->
            <div class="assistant-search-bar">
                <div class="assistant-search-input-wrap">
                    <span class="assistant-search-icon">🔍</span>
                    <input type="text" id="assistant-guide-search" placeholder="ابحث عن اسم أي شاشة، زر، عملية، أو سيناريو عمل..." oninput="handleAssistantSearch(event)">
                </div>
            </div>

            <!-- جسم المساعد -->
            <div class="assistant-body">
                <div class="assistant-sidebar" id="assistant-sidebar-container">
                    <!-- يُملأ ديناميكياً -->
                </div>
                <div class="assistant-content-pane" id="assistant-content-pane">
                    <!-- يُملأ ديناميكياً -->
                </div>
            </div>

            <!-- التذييل -->
            <div class="assistant-footer">
                <div>نظام التنافس على درجتي الماجستير والدكتوراه © 2026 | MAQATECH Software Solutions</div>
                <div>للمساعدة والدعم الفني: ماقتك للحلول البرمجية</div>
            </div>
        </div>
    `;
    document.body.appendChild(modalDiv);
}

function injectTourElementsDOM() {
    if (!document.getElementById("tour-backdrop")) {
        const backdrop = document.createElement("div");
        backdrop.id = "tour-backdrop";
        backdrop.className = "tour-overlay-backdrop";
        document.body.appendChild(backdrop);
    }
    if (!document.getElementById("tour-highlight")) {
        const highlight = document.createElement("div");
        highlight.id = "tour-highlight";
        highlight.className = "tour-highlight-box";
        highlight.style.display = "none";
        document.body.appendChild(highlight);
    }
    if (!document.getElementById("tour-popover")) {
        const popover = document.createElement("div");
        popover.id = "tour-popover";
        popover.className = "tour-popover-card";
        popover.style.display = "none";
        document.body.appendChild(popover);
    }
}

// ─── 9. التهيئة التلقائية واختصارات لوحة المفاتيح ─────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    injectAssistantModalDOM();
    injectTourElementsDOM();
});

// دعم اختصارات لوحة المفاتيح: F1 لفتح المساعد، Escape لإغلاقه
document.addEventListener("keydown", (e) => {
    if (e.key === "F1") {
        e.preventDefault();
        openAssistantGuide();
    } else if (e.key === "Escape") {
        closeAssistantGuide();
        endGuidedTour();
        if (isInspectModeActive) toggleInspectMode();
    }
});

