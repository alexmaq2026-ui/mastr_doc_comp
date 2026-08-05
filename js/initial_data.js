// البيانات الأولية الافتراضية لنظام مفاضلة جامعة صنعاء
const DEFAULT_USERS = [
  { id: 1, username: 'admin', password: 'admin123', name: 'د. رئيس لجنة المفاضلة', role: 'super_admin', title: 'المدير الأعلى / رئيس اللجنة' },
  { id: 2, username: 'entry', password: 'entry123', name: 'أ. مدخل البيانات', role: 'data_entry', title: 'مُدخل بيانات' },
  { id: 3, username: 'reviewer', password: 'reviewer123', name: 'د. المراجع المطلع', role: 'auditor', title: 'مراجع مطلع' },
  { id: 4, username: 'member', password: 'member123', name: 'د. عضو لجنة المفاضلة', role: 'committee_member', title: 'عضو لجنة المفاضلة (اطلاع فقط)' }
];

const DEFAULT_SETTINGS = {
  masterGrantsCount: 3,
  phdGrantsCount: 3,
  referenceYear: 2026,
  universityName: 'جامعة صنعاء',
  councilName: 'مجلس الجامعة - لجنة المفاضلة والتنافس',
  rectorName: 'أ.د. القاسم محمد عباس',
  competitionLocation: 'مقر الأمانة العامة / قاعة اجتماعات مجلس الجامعة الرئيسي - جامعة صنعاء',
  competitionDate: 'الخميس، 30 يوليو 2026م (الساعة 10:00 صباحاً)',
  applicationTitle: 'نظام المفاضلة والتنافس الإلكتروني لمنتسبي الكادر الإداري لجامعة صنعاء (ماجستير ودكتوراه)',
  supabaseUrl: 'https://wpnujibmxrxxaqriadez.supabase.co',
  supabaseKey: 'sb_publishable_PudkaqYYnpEc8JrQfNUyCw_BWSzZElC',
  isLocked: false,
  lockedAt: null,
  lockedBy: null,
  lockHash: null,
  auditLog: []
};

const DEFAULT_COMMITTEE_MEMBERS = [
  { id: 1, name: 'أ.د. ابراهيم المطاع', adminTitle: 'نائب رئيس الجامعة للشؤون الأكاديمية', committeeRole: 'رئيس اللجنة' },
  { id: 2, name: 'د. حمود الأهنومي', adminTitle: 'نائب رئيس الجامعة للدراسات العليا', committeeRole: 'عضواً' },
  { id: 3, name: 'أ. اسكندر المقالح', adminTitle: 'أمين عام الجامعة', committeeRole: 'عضواً' },
  { id: 4, name: 'د. محمد نجاد', adminTitle: 'عميد كلية الشريعة والقانون', committeeRole: 'عضواً' },
  { id: 5, name: 'د. هاني مغلس', adminTitle: 'عميد كلية التجارة والاقتصاد', committeeRole: 'عضواً' }
];

const DEFAULT_CRITERIA = {
  seniority: {
    enabled: true,
    weightName: 'تاريخ التعيين (الأقدمية)',
    maxPoints: 10,
    startYear: 1990,
    endYear: 2030,
    stepYears: 1,
    brackets: [
      { label: '1990 - 1994م', minYear: 1990, maxYear: 1994, points: 10 },
      { label: '1995 - 2000م', minYear: 1995, maxYear: 2000, points: 8 },
      { label: '2001 - 2005م', minYear: 2001, maxYear: 2005, points: 6 },
      { label: '2006 - 2010م', minYear: 2006, maxYear: 2010, points: 4 },
      { label: '2011 - 2015م', minYear: 2011, maxYear: 2015, points: 3 },
      { label: '2016 - 2020م', minYear: 2016, maxYear: 2020, points: 2 },
      { label: '2021 - 2030م', minYear: 2021, maxYear: 2030, points: 1 }
    ]
  },
  age: {
    enabled: true,
    weightName: 'الفئة العمرية (العمر)',
    maxPoints: 5,
    minAge: 25,
    maxAge: 56,
    stepYears: 5,
    brackets: [
      { label: '50 سنة فما فوق', minAge: 50, maxAge: 120, points: 5 },
      { label: '45 - 49 سنة', minAge: 45, maxAge: 49, points: 4 },
      { label: '40 - 44 سنة', minAge: 40, maxAge: 44, points: 3 },
      { label: '35 - 39 سنة', minAge: 35, maxAge: 39, points: 2 },
      { label: 'أقل من 35 سنة', minAge: 0, maxAge: 34, points: 1 }
    ]
  },
  specialization: {
    enabled: true,
    weightName: 'الاحتياج للتخصص',
    maxPoints: 5,
    items: [
      { name: 'شريعة وقانون', points: 5 },
      { name: 'علوم حاسوب', points: 5 },
      { name: 'اقتصاد ومحاسبة', points: 4 },
      { name: 'إدارة عامة', points: 4 },
      { name: 'إدارة أعمال', points: 3 },
      { name: 'أخرى', points: 2 }
    ]
  },
  grade: {
    enabled: true,
    weightName: 'تقدير المؤهل (البكالوريوس/المؤهل)',
    maxPoints: 5,
    items: [
      { name: 'ممتاز', points: 5 },
      { name: 'جيد جداً', points: 4 },
      { name: 'جيد', points: 3 },
      { name: 'مقبول', points: 2 }
    ]
  },
  customCriteria: [
    { id: 'c1', name: 'تقييم الأداء السنوي', maxPoints: 5, enabled: false },
    { id: 'c2', name: 'الأبحاث والإنتاج العلمي', maxPoints: 5, enabled: false }
  ]
};

const PRESEEDED_CANDIDATES = [];

