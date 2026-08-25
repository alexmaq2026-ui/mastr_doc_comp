// البيانات الأولية الافتراضية لنظام مفاضلة جامعة صنعاء
const DEFAULT_ROLES = [
  {
    "id": "super_admin",
    "name": "المدير الأعلى / رئيس اللجنة",
    "description": "كامل الصلاحيات السيادية والإدارية 100% وإدارة المستخدمين والأدوار والأقفال.",
    "isSystem": true,
    "permissions": { "*": true }
  },
  {
    "id": "data_entry",
    "name": "مُدخل بيانات وسكرتارية",
    "description": "إدخال وتعديل بيانات المتنافسين، استيراد وتصدير ملفات Excel، وطباعة بطاقات الإقرار.",
    "isSystem": true,
    "permissions": {
      "screen:tab-home": true,
      "screen:tab-candidates": true,
      "action:cand-add": true,
      "action:cand-edit": true,
      "action:cand-details-modal": true,
      "action:cand-import-excel": true,
      "action:cand-export-excel": true,
      "action:cand-print-pdf": true,
      "action:cand-print-cards-draft": true,
      "screen:tab-scoring": true,
      "action:score-export-excel": true,
      "screen:tab-report": true,
      "action:rep-export-excel": true,
      "screen:tab-criterion-report": true,
      "action:crit-rep-export-excel": true,
      "screen:tab-criteria-doc": true
    }
  },
  {
    "id": "auditor",
    "name": "مراجع مطلع وتدقيق رقابي",
    "description": "الاطلاع والمعاينة على كافة الكشوفات، إبداء ملاحظات التدقيق، وطباعة المسودات للتدقيق.",
    "isSystem": true,
    "permissions": {
      "screen:tab-home": true,
      "screen:tab-dashboard": true,
      "action:dash-filter": true,
      "action:dash-print-draft": true,
      "screen:tab-candidates": true,
      "action:cand-details-modal": true,
      "action:cand-export-excel": true,
      "action:cand-print-pdf": true,
      "action:cand-print-cards-draft": true,
      "screen:tab-scoring": true,
      "action:score-print-draft": true,
      "action:score-export-excel": true,
      "action:score-add-annotation": true,
      "screen:tab-report": true,
      "action:rep-export-excel": true,
      "action:rep-print-draft": true,
      "screen:tab-criterion-report": true,
      "action:crit-rep-export-excel": true,
      "action:crit-rep-print-pdf": true,
      "screen:tab-analytics": true,
      "action:ana-subtab-strengths": true,
      "action:ana-subtab-deficiencies": true,
      "action:ana-subtab-specs": true,
      "action:ana-subtab-charts": true,
      "action:ana-export-excel": true,
      "action:ana-print-pdf": true,
      "screen:tab-criteria-doc": true,
      "action:crit-doc-print-pdf": true
    }
  },
  {
    "id": "committee_member",
    "name": "عضو لجنة المفاضلة (اطلاع ومعاينة)",
    "description": "عرض النتائج، المصفوفة، المحضر، والتقارير دون إمكانية التعديل أو الحذف.",
    "isSystem": true,
    "permissions": {
      "screen:tab-home": true,
      "screen:tab-dashboard": true,
      "action:dash-filter": true,
      "action:dash-print-draft": true,
      "screen:tab-candidates": true,
      "action:cand-details-modal": true,
      "action:cand-print-pdf": true,
      "screen:tab-scoring": true,
      "action:score-print-draft": true,
      "screen:tab-minutes": true,
      "action:min-print-draft": true,
      "screen:tab-report": true,
      "action:rep-print-draft": true,
      "screen:tab-criterion-report": true,
      "screen:tab-analytics": true,
      "action:ana-subtab-strengths": true,
      "action:ana-subtab-deficiencies": true,
      "action:ana-subtab-specs": true,
      "action:ana-subtab-charts": true,
      "screen:tab-criteria-doc": true
    }
  }
];

const DEFAULT_USERS = [
  {
    "id": 1,
    "username": "admin",
    "password": "maq513",
    "name": "د. رئيس لجنة المفاضلة",
    "role": "super_admin",
    "title": "المدير الأعلى / رئيس اللجنة"
  },
  {
    "id": 2,
    "username": "entry",
    "password": "entry123",
    "name": "أ. مدخل البيانات",
    "role": "data_entry",
    "title": "مُدخل بيانات"
  },
  {
    "id": 3,
    "username": "reviewer",
    "password": "reviewer123",
    "name": "د. المراجع المطلع",
    "role": "auditor",
    "title": "مراجع مطلع"
  },
  {
    "id": 4,
    "username": "member",
    "password": "member123",
    "name": "د. عضو لجنة المفاضلة",
    "role": "committee_member",
    "title": "عضو لجنة المفاضلة (اطلاع فقط)"
  },
  {
    "id": 5,
    "username": "ah-m",
    "password": "ah123456",
    "name": "الأستاذ/عبدالملك الهمداني",
    "role": "data_entry",
    "title": "مدخل بيانات"
  }
];

const DEFAULT_SETTINGS = {
  "masterGrantsCount": 3,
  "phdGrantsCount": 3,
  "referenceYear": 2026,
  "universityName": "جامعة صنعاء",
  "councilName": "مجلس الجامعة - لجنة المفاضلة والتنافس",
  "rectorName": "أ.د. محمد أحمد البخيتي",
  "competitionLocation": "مقر الأمانة العامة / قاعة اجتماعات مجلس الجامعة الرئيسي - جامعة صنعاء",
  "competitionDate": "شهر اغسطس 2026",
  "applicationTitle": "نظام المفاضلة والتنافس الإلكتروني لمنتسبي الكادر الإداري لجامعة صنعاء (ماجستير ودكتوراه)",
  "supabaseUrl": "https://wpnujibmxrxxaqriadez.supabase.co",
  "supabaseKey": "sb_publishable_PudkaqYYnpEc8JrQfNUyCw_BWSzZElC",
  "isLocked": false,
  "lockedAt": null,
  "lockedBy": null,
  "lockHash": null,
  "auditLog": []
};

const DEFAULT_COMMITTEE_MEMBERS = [
  {
    "id": 1,
    "name": "أ.د. ابراهيم المطاع",
    "adminTitle": "نائب رئيس الجامعة للشؤون الأكاديمية",
    "committeeRole": "رئيس اللجنة"
  },
  {
    "id": 2,
    "name": "د. حمود الأهنومي",
    "adminTitle": "نائب رئيس الجامعة للدراسات العليا",
    "committeeRole": "عضواً"
  },
  {
    "id": 3,
    "name": "د. زيد الوريث",
    "adminTitle": "مساعد رئيس الجامعة لشؤون المراكز",
    "committeeRole": "عضواً"
  },
  {
    "id": 4,
    "name": "أ. اسكندر المقالح",
    "adminTitle": "امين عام الجامعة",
    "committeeRole": "عضواً"
  },
  {
    "id": 5,
    "name": "د. محمد نجاد",
    "adminTitle": "عميد كلية الشريعة والقانون",
    "committeeRole": "عضواً"
  },
  {
    "id": 6,
    "name": "د. هاني مغلس",
    "adminTitle": "عميد كلية التجارة والاقتصاد",
    "committeeRole": "عضو"
  }
];

const DEFAULT_CRITERIA = {
  _approvedVersion: '2026_APPROVED_V2',
  seniority: {
    enabled: true,
    targetDegree: 'all',
    weightName: 'معيار الأقدمية بالخدمة / تاريخ التعيين',
    maxPoints: 10,
    startYear: 1990,
    endYear: 2030,
    stepYears: 1,
    brackets: [
      { label: '1990 - 2000م', minYear: 1990, maxYear: 2000, points: 5 },
      { label: '2001 - 2015م', minYear: 2001, maxYear: 2015, points: 3 }
    ]
  },
  age: {
    enabled: true,
    targetDegree: 'all',
    weightName: 'معيار الفئة العمرية للموظف المتقدم',
    maxPoints: 5,
    minAge: 25,
    maxAge: 60,
    stepYears: 1,
    brackets: [
      { label: '40 سنة ومافوق', minAge: 40, maxAge: 120, points: 1 },
      { label: '39 سنة', minAge: 39, maxAge: 39, points: 2 },
      { label: '38 سنة', minAge: 38, maxAge: 38, points: 3 },
      { label: '37 سنة', minAge: 37, maxAge: 37, points: 4 },
      { label: '36 سنة', minAge: 36, maxAge: 36, points: 4 },
      { label: '35 سنة', minAge: 35, maxAge: 35, points: 5 },
      { label: '34 سنة', minAge: 34, maxAge: 34, points: 5 },
      { label: '33 سنة', minAge: 33, maxAge: 33, points: 5 },
      { label: '32 سنة', minAge: 32, maxAge: 32, points: 5 },
      { label: '31 سنة', minAge: 31, maxAge: 31, points: 5 },
      { label: '30 سنة', minAge: 30, maxAge: 30, points: 5 },
      { label: '29 سنة', minAge: 29, maxAge: 29, points: 5 },
      { label: '28 سنة', minAge: 28, maxAge: 28, points: 5 },
      { label: '27 سنة', minAge: 27, maxAge: 27, points: 5 },
      { label: '26 سنة', minAge: 26, maxAge: 26, points: 5 },
      { label: '25 سنة', minAge: 0, maxAge: 25, points: 5 }
    ]
  },
  specialization: {
    enabled: true,
    targetDegree: 'all',
    weightName: 'معيار مدى احتياج الجامعة للتخصص',
    maxPoints: 5,
    items: [
      { name: 'شريعة وقانون', points: 5 },
      { name: 'علوم حاسوب', points: 5 },
      { name: 'اقتصاد ومحاسبة', points: 5 },
      { name: 'إدارة عامة', points: 5 },
      { name: 'إدارة أعمال', points: 5 },
      { name: 'أخرى', points: 4 }
    ]
  },
  grade: {
    enabled: true,
    targetDegree: 'master',
    weightName: 'معيار تقدير المؤهل الدراسي السابق',
    maxPoints: 5,
    items: [
      { name: 'ممتاز', points: 5 },
      { name: 'جيد جداً', points: 5 },
      { name: 'جيد', points: 5 },
      { name: 'مقبول', points: 4 },
      { name: 'بدون', points: 0 }
    ]
  },
  customCriteria: [
    {
      id: 'work_practice',
      name: 'معيار الممارسة الفعلية للوظيفة',
      maxPoints: 5,
      enabled: true,
      targetDegree: 'all',
      indicatorType: 'binary',
      config: {
        options: [
          { label: 'مستمر', points: 5 },
          { label: 'متاح', points: 3 }
        ]
      }
    }
  ]
};

const PRESEEDED_CANDIDATES = [
  {
    "id": 1,
    "name": "معمر علي مصلح المقالح",
    "degree": "دكتوراه",
    "specialization": "إدارة تنمية محلية",
    "hiring_univ": "1994-01-24",
    "hiring_service": "",
    "birth_date": "1972م",
    "grad_year": "2013م",
    "grade": "جيد",
    "continuity": "متاح",
    "customValues": {
      "work_practice": 3
    }
  },
  {
    "id": 2,
    "name": "فايز عباد أحمد الخولاني",
    "degree": "دكتوراه",
    "specialization": "إدارة عامة",
    "hiring_univ": "1994-09-19",
    "hiring_service": "",
    "birth_date": "1975م",
    "grad_year": "2025م",
    "grade": "جيد جداً",
    "continuity": "متاح",
    "customValues": {
      "work_practice": 3
    }
  },
  {
    "id": 3,
    "name": "حمود أحمد أحمد السياغي",
    "degree": "دكتوراه",
    "specialization": "إدارة عامة",
    "hiring_univ": "1995-12-27",
    "hiring_service": "",
    "birth_date": "1974م",
    "grad_year": "2023م",
    "grade": "جيد جداً",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 4,
    "name": "منذر عبدالله نعمان الحكيمي",
    "degree": "دكتوراه",
    "specialization": "كيمياء",
    "hiring_univ": "1996-08-25",
    "hiring_service": "",
    "birth_date": "1970م",
    "grad_year": "2025م",
    "grade": "جيد",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 5,
    "name": "محمد حمود عبد الرب كرش",
    "degree": "دكتوراه",
    "specialization": "شريعة وقانون",
    "hiring_univ": "2000-08-13",
    "hiring_service": "1991-01-10",
    "birth_date": "1980م",
    "grad_year": "2023م",
    "grade": "جيد جداً",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 6,
    "name": "قائد صالح سعد المنامه",
    "degree": "دكتوراه",
    "specialization": "إدارة عامة",
    "hiring_univ": "2000-09-20",
    "hiring_service": "",
    "birth_date": "1974م",
    "grad_year": "2016م",
    "grade": "جيد جداً",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 7,
    "name": "فتحية محمد حسين سريع",
    "degree": "دكتوراه",
    "specialization": "إدارة عامة",
    "hiring_univ": "2001-07-22",
    "hiring_service": "",
    "birth_date": "1983م",
    "grad_year": "2017م",
    "grade": "ممتاز",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 8,
    "name": "بشرى أحمد إسماعيل الاكوع",
    "degree": "دكتوراه",
    "specialization": "أحياء دقيقة طبية",
    "hiring_univ": "2001-10-30",
    "hiring_service": "",
    "birth_date": "1977م",
    "grad_year": "2012م",
    "grade": "جيد جداً",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 9,
    "name": "عمار محمد أحمد مسعد العيوي",
    "degree": "دكتوراه",
    "specialization": "علم اجتماع السكان",
    "hiring_univ": "2002-07-31",
    "hiring_service": "",
    "birth_date": "1980م",
    "grad_year": "2020م",
    "grade": "جيد جداً",
    "continuity": "متاح",
    "customValues": {
      "work_practice": 3
    }
  },
  {
    "id": 10,
    "name": "محمد يحيى علي المندي",
    "degree": "دكتوراه",
    "specialization": "إدارة اعمال",
    "hiring_univ": "2003-06-14",
    "hiring_service": "",
    "birth_date": "1977م",
    "grad_year": "2017م",
    "grade": "جيد",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 11,
    "name": "منى عبدالحفيظ الانسي",
    "degree": "دكتوراه",
    "specialization": "إدارة أعمال",
    "hiring_univ": "2003-07-07",
    "hiring_service": "",
    "birth_date": "1979م",
    "grad_year": "2025م",
    "grade": "ممتاز",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 12,
    "name": "عبدالعزيز حزام سعد السامعي",
    "degree": "دكتوراه",
    "specialization": "ادارة عامة",
    "hiring_univ": "2007-12-09",
    "hiring_service": "",
    "birth_date": "1976م",
    "grad_year": "2019م",
    "grade": "بدون",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 13,
    "name": "محمد نعمان أحمد البريهي",
    "degree": "دكتوراه",
    "specialization": "إدارة عامة",
    "hiring_univ": "2007-12-31",
    "hiring_service": "",
    "birth_date": "1977م",
    "grad_year": "2019م",
    "grade": "بدون",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 14,
    "name": "عبد الرحمن حسن النجار",
    "degree": "دكتوراه",
    "specialization": "إدارة عامة",
    "hiring_univ": "2008-09-10",
    "hiring_service": "",
    "birth_date": "1979م",
    "grad_year": "2025م",
    "grade": "بدون",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 15,
    "name": "هزاع علي ناصر الحراسي",
    "degree": "دكتوراه",
    "specialization": "إدارة عامة",
    "hiring_univ": "2008-09-10",
    "hiring_service": "",
    "birth_date": "1978م",
    "grad_year": "2019م",
    "grade": "جيد جداً",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 16,
    "name": "محمد حزام يحيى الشامي",
    "degree": "دكتوراه",
    "specialization": "جغرافيا سياحية",
    "hiring_univ": "2010-02-28",
    "hiring_service": "1994-11-16",
    "birth_date": "1976م",
    "grad_year": "2018م",
    "grade": "جيد جداً",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 17,
    "name": "فؤاد منصور أحمد الورد",
    "degree": "دكتوراه",
    "specialization": "ترجمة لغة أنجليزية",
    "hiring_univ": "2010-10-13",
    "hiring_service": "",
    "birth_date": "1982م",
    "grad_year": "2020م",
    "grade": "جيد",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 18,
    "name": "نورالدين مصلح علي الفرزعي",
    "degree": "دكتوراه",
    "specialization": "إدارة عامة",
    "hiring_univ": "2010-10-13",
    "hiring_service": "",
    "birth_date": "1981م",
    "grad_year": "2026م",
    "grade": "ممتاز",
    "continuity": "متاح",
    "customValues": {
      "work_practice": 3
    }
  },
  {
    "id": 19,
    "name": "ماجد سعيد سعيد علي",
    "degree": "دكتوراه",
    "specialization": "شبكات",
    "hiring_univ": "2013-02-10",
    "hiring_service": "2012-01-01",
    "birth_date": "1980م",
    "grad_year": "2022م",
    "grade": "جيد جداً",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 20,
    "name": "إنتصار عبدالجليل غالب",
    "degree": "دكتوراه",
    "specialization": "نشر الكتاب",
    "hiring_univ": "2013-02-18",
    "hiring_service": "2012-01-01",
    "birth_date": "1972م",
    "grad_year": "2012م",
    "grade": "بدون",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 21,
    "name": "أمجد إسماعيل محمد عبدالمغني",
    "degree": "دكتوراه",
    "specialization": "ترميم وصيانة اثار",
    "hiring_univ": "2013-02-18",
    "hiring_service": "2012-01-01",
    "birth_date": "1979م",
    "grad_year": "2021م",
    "grade": "ممتاز",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 22,
    "name": "خلود عبدالعزيز الشوافي",
    "degree": "دكتوراه",
    "specialization": "فيزياء -بلازماء",
    "hiring_univ": "2013-02-18",
    "hiring_service": "2012-01-01",
    "birth_date": "1982",
    "grad_year": "2024م",
    "grade": "ممتاز",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 23,
    "name": "كفى سالم حيدر محمد",
    "degree": "دكتوراه",
    "specialization": "إقتصاد",
    "hiring_univ": "2013-02-18",
    "hiring_service": "2012-01-01",
    "birth_date": "1972م",
    "grad_year": "2026م",
    "grade": "جيد",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 24,
    "name": "لطيفة حمود علي المرسي",
    "degree": "دكتوراه",
    "specialization": "مناهج العلوم وطرق تدريسها",
    "hiring_univ": "2013-02-18",
    "hiring_service": "2012-01-01",
    "birth_date": "1979",
    "grad_year": "2017",
    "grade": "جيد جداً",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 25,
    "name": "ندى عصام قايد عبدالحق الاغبري",
    "degree": "دكتوراه",
    "specialization": "الدراسات السكانية",
    "hiring_univ": "2013-02-18",
    "hiring_service": "2012-01-01",
    "birth_date": "1983م",
    "grad_year": "2025م",
    "grade": "جيد جداً",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 26,
    "name": "وجيدة إبراهيم علي محمد الاغبري",
    "degree": "دكتوراه",
    "specialization": "مناهج العلوم",
    "hiring_univ": "2013-06-29",
    "hiring_service": "2012-01-01",
    "birth_date": "1979م",
    "grad_year": "2025م",
    "grade": "ممتاز",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 27,
    "name": "نوال أحمد أحمد العرشي",
    "degree": "دكتوراه",
    "specialization": "أثار قديمة",
    "hiring_univ": "2013-07-28",
    "hiring_service": "2013-11-13",
    "birth_date": "1977م",
    "grad_year": "2010م",
    "grade": "جيد",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 28,
    "name": "زينب علي محمد الانسي",
    "degree": "دكتوراه",
    "specialization": "كيمياء عضوية",
    "hiring_univ": "2013-12-05",
    "hiring_service": "",
    "birth_date": "1981م",
    "grad_year": "2023م",
    "grade": "جيد جداً",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 29,
    "name": "إبراهيم عبدالله إسحاق",
    "degree": "دكتوراه",
    "specialization": "إدارة عامة",
    "hiring_univ": "2014-11-26",
    "hiring_service": "",
    "birth_date": "1984م",
    "grad_year": "2023م",
    "grade": "جيد جداً",
    "continuity": "متاح",
    "customValues": {
      "work_practice": 3
    }
  },
  {
    "id": 30,
    "name": "امة الخالق عبدالرحمن المهدي",
    "degree": "دكتوراه",
    "specialization": "تفسير وعلوم القراءان",
    "hiring_univ": "2015-09-16",
    "hiring_service": "",
    "birth_date": "1978م",
    "grad_year": "2025م",
    "grade": "جيد جداً",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 31,
    "name": "محمد عبدالولي السماوي",
    "degree": "دكتوراه",
    "specialization": "خضر",
    "hiring_univ": "1995م",
    "hiring_service": "",
    "birth_date": "1970م",
    "grad_year": "2002م",
    "grade": "ممتاز",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 32,
    "name": "ليبيا محمد مهيوب قائد صينا",
    "degree": "دكتوراه",
    "specialization": "هرمونات",
    "hiring_univ": "2001-11-12",
    "hiring_service": "",
    "birth_date": "1976م",
    "grad_year": "2014م",
    "grade": "بدون",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 33,
    "name": "خالد محمد سالم عوض عفيف",
    "degree": "ماجستير",
    "specialization": "مكتبات وعلم المعلومات",
    "hiring_univ": "1992-07-19",
    "hiring_service": "",
    "birth_date": "1980م",
    "grad_year": "2026م",
    "grade": "مقبول",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 34,
    "name": "خالد عبده فرحان علي",
    "degree": "ماجستير",
    "specialization": "محاسبة",
    "hiring_univ": "1995-10-05",
    "hiring_service": "",
    "birth_date": "1975م",
    "grad_year": "2002م",
    "grade": "مقبول",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 35,
    "name": "حسن عمر مجلي",
    "degree": "ماجستير",
    "specialization": "علوم بحار",
    "hiring_univ": "1997-09-25",
    "hiring_service": "",
    "birth_date": "1972م",
    "grad_year": "1996م",
    "grade": "مقبول",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 36,
    "name": "مرتضى عبدالوارث محمد مجاهد",
    "degree": "ماجستير",
    "specialization": "كيمياء",
    "hiring_univ": "2002-09-21",
    "hiring_service": "",
    "birth_date": "1974م",
    "grad_year": "2001م",
    "grade": "مقبول",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 37,
    "name": "خالد حسين احسن المحمدي",
    "degree": "ماجستير",
    "specialization": "جغرافيا فلرعي تاريخ",
    "hiring_univ": "2002-09-21",
    "hiring_service": "",
    "birth_date": "1978م",
    "grad_year": "20012م",
    "grade": "جيد",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 38,
    "name": "امة الرزاق عبدالله زيد أبو طالب",
    "degree": "ماجستير",
    "specialization": "شريعة وقانون",
    "hiring_univ": "2003-06-14",
    "hiring_service": "",
    "birth_date": "1990م",
    "grad_year": "2019م",
    "grade": "جيد",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 39,
    "name": "أحمد صالح الربوعي",
    "degree": "ماجستير",
    "specialization": "شريعة وقانون",
    "hiring_univ": "2004-08-08",
    "hiring_service": "",
    "birth_date": "1979م",
    "grad_year": "2017م",
    "grade": "مقبول",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 40,
    "name": "يحيى محمد صالح الصديعي",
    "degree": "ماجستير",
    "specialization": "علوم الأرض والبيئة طبقات ونفط",
    "hiring_univ": "2005-11-28",
    "hiring_service": "",
    "birth_date": "1979م",
    "grad_year": "2005م",
    "grade": "جيد",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 41,
    "name": "إبراهيم أحمد هاشم الشهاري",
    "degree": "ماجستير",
    "specialization": "صيدلة",
    "hiring_univ": "2007-12-09",
    "hiring_service": "",
    "birth_date": "1975م",
    "grad_year": "2010م",
    "grade": "جيد",
    "continuity": "متاح",
    "customValues": {
      "work_practice": 3
    }
  },
  {
    "id": 42,
    "name": "نوال حسن محمد باري",
    "degree": "ماجستير",
    "specialization": "علوم حاسوب",
    "hiring_univ": "2008-09-10",
    "hiring_service": "",
    "birth_date": "1979م",
    "grad_year": "2006م",
    "grade": "مقبول",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 43,
    "name": "صالح حميد حميد العنمي",
    "degree": "ماجستير",
    "specialization": "فيزياء",
    "hiring_univ": "2009-12-12",
    "hiring_service": "2004-12-01",
    "birth_date": "1980م",
    "grad_year": "2003م",
    "grade": "جيد",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 44,
    "name": "صادق محسن عقيل الغابري",
    "degree": "ماجستير",
    "specialization": "نظم المعلومات الحاسوبية",
    "hiring_univ": "2010-10-13",
    "hiring_service": "",
    "birth_date": "1980م",
    "grad_year": "2005م",
    "grade": "جيد جداً",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 45,
    "name": "أسماء محمد ناصر عوضه",
    "degree": "ماجستير",
    "specialization": "علوم حياة",
    "hiring_univ": "2010-12-14",
    "hiring_service": "",
    "birth_date": "1984م",
    "grad_year": "2008م",
    "grade": "ممتاز",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 46,
    "name": "سميحة عبدالله شرف عبدالخالق",
    "degree": "ماجستير",
    "specialization": "تاريخ فرعي جغرافيا",
    "hiring_univ": "2010-12-14",
    "hiring_service": "",
    "birth_date": "1983م",
    "grad_year": "20089م",
    "grade": "جيد جداً",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 47,
    "name": "محمد عبدالرحمن دماج",
    "degree": "ماجستير",
    "specialization": "علوم سياسية",
    "hiring_univ": "2011-02-05",
    "hiring_service": "",
    "birth_date": "1985م",
    "grad_year": "2008م",
    "grade": "جيد جداً",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 48,
    "name": "أمة العليم حسين أحمد نواس",
    "degree": "ماجستير",
    "specialization": "لغة عربية",
    "hiring_univ": "2011-07-02",
    "hiring_service": "",
    "birth_date": "1980م",
    "grad_year": "2009م",
    "grade": "جيد",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 49,
    "name": "محمد محمد علي نجاد",
    "degree": "ماجستير",
    "specialization": "شريعة وقانون",
    "hiring_univ": "2011-08-02",
    "hiring_service": "",
    "birth_date": "1982م",
    "grad_year": "2025م",
    "grade": "جيد جداً",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 50,
    "name": "بلقيس طه عبدالله المقطري",
    "degree": "ماجستير",
    "specialization": "مكتبات وعلم المعلومات",
    "hiring_univ": "2011-08-02",
    "hiring_service": "",
    "birth_date": "1981م",
    "grad_year": "2015م",
    "grade": "مقبول",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 51,
    "name": "يحيى علي حزام المساجدي",
    "degree": "ماجستير",
    "specialization": "معلم حاسوب",
    "hiring_univ": "2011-08-02",
    "hiring_service": "",
    "birth_date": "1984م",
    "grad_year": "2024م",
    "grade": "جيد",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 52,
    "name": "مريم محمود ناشر السريحي",
    "degree": "ماجستير",
    "specialization": "كيمياء",
    "hiring_univ": "2011-08-27",
    "hiring_service": "",
    "birth_date": "1983م",
    "grad_year": "2009م",
    "grade": "مقبول",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 53,
    "name": "وداد إسماعيل علي الشميري",
    "degree": "ماجستير",
    "specialization": "فيزياء فرعي : رياضيات",
    "hiring_univ": "2011-12-21",
    "hiring_service": "",
    "birth_date": "1980م",
    "grad_year": "2005م",
    "grade": "مقبول",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 54,
    "name": "محمد حسن أحمد العنسي",
    "degree": "ماجستير",
    "specialization": "دراسات انجليزية",
    "hiring_univ": "2012-08-14",
    "hiring_service": "",
    "birth_date": "1986م",
    "grad_year": "2010م",
    "grade": "جيد",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 55,
    "name": "هاني يحيى حسين الحرفي",
    "degree": "ماجستير",
    "specialization": "علوم سياسية",
    "hiring_univ": "2012-11-18",
    "hiring_service": "",
    "birth_date": "1979م",
    "grad_year": "2002م",
    "grade": "جيد",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 56,
    "name": "محسن علي أحمد المحبشي",
    "degree": "ماجستير",
    "specialization": "بساتين وغابات",
    "hiring_univ": "2013-02-10",
    "hiring_service": "",
    "birth_date": "1984م",
    "grad_year": "2007م",
    "grade": "جيد",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 57,
    "name": "ابتسام عبدالله صالح التويتي",
    "degree": "ماجستير",
    "specialization": "كيمياء فرعي فيزياء",
    "hiring_univ": "2013-02-18",
    "hiring_service": "2012-01-01",
    "birth_date": "1981م",
    "grad_year": "2004م",
    "grade": "جيد",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 58,
    "name": "افراح حمود عبدالله قيس",
    "degree": "ماجستير",
    "specialization": "لغة انجليزية",
    "hiring_univ": "2013-02-18",
    "hiring_service": "2012-01-01",
    "birth_date": "1978م",
    "grad_year": "2004م",
    "grade": "مقبول",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 59,
    "name": "رجاء عبدالوهاب علي سيف",
    "degree": "ماجستير",
    "specialization": "لغة انجليزية",
    "hiring_univ": "2013-02-18",
    "hiring_service": "2012-01-01",
    "birth_date": "1983م",
    "grad_year": "2004م",
    "grade": "جيد",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 60,
    "name": "سامية محمد المطري",
    "degree": "ماجستير",
    "specialization": "إذاعة وتلفزيون",
    "hiring_univ": "2013-02-18",
    "hiring_service": "",
    "birth_date": "1980م",
    "grad_year": "2012م",
    "grade": "جيد",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 61,
    "name": "فطوم علي أحمد باسديس",
    "degree": "ماجستير",
    "specialization": "دبلوم تقني",
    "hiring_univ": "2013-02-18",
    "hiring_service": "2012-12-01",
    "birth_date": "1979م",
    "grad_year": "2016م",
    "grade": "مقبول",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 62,
    "name": "محمد علي محمد عريش",
    "degree": "ماجستير",
    "specialization": "أثار قديمة",
    "hiring_univ": "2013-02-18",
    "hiring_service": "2012-01-01",
    "birth_date": "1981م",
    "grad_year": "2019م",
    "grade": "جيد",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 63,
    "name": "جميلة صالح القطيبي",
    "degree": "ماجستير",
    "specialization": "محاسبة",
    "hiring_univ": "2013-07-28",
    "hiring_service": "",
    "birth_date": "1985م",
    "grad_year": "2026م",
    "grade": "جيد جداً",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 64,
    "name": "امين محمد أمين المقالح",
    "degree": "ماجستير",
    "specialization": "علوم سياسية",
    "hiring_univ": "2013-07-28",
    "hiring_service": "",
    "birth_date": "1982م",
    "grad_year": "2010م",
    "grade": "مقبول",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 65,
    "name": "سلوى مقبل عيظه الحداء",
    "degree": "ماجستير",
    "specialization": "لغة فرنسية",
    "hiring_univ": "2013-10-08",
    "hiring_service": "",
    "birth_date": "1979",
    "grad_year": "2002م",
    "grade": "جيد",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 66,
    "name": "وليد فرحان علي راجح",
    "degree": "ماجستير",
    "specialization": "إدارة عامة",
    "hiring_univ": "2015-09-16",
    "hiring_service": "2016-08-14",
    "birth_date": "1983م",
    "grad_year": "2018م",
    "grade": "جيد جداً",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 67,
    "name": "أسماء محمد علي القباطي",
    "degree": "ماجستير",
    "specialization": "بساتين وغابات",
    "hiring_univ": "2010/12/4م",
    "hiring_service": "",
    "birth_date": "1985",
    "grad_year": "2008م",
    "grade": "جيد جداً",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 68,
    "name": "أسماء حميد الوتاري",
    "degree": "ماجستير",
    "specialization": "بساتين وغابات",
    "hiring_univ": "2012-08-14",
    "hiring_service": "",
    "birth_date": "1987م",
    "grad_year": "2010م",
    "grade": "جيد",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 69,
    "name": "محمد أحمد حميد",
    "degree": "ماجستير",
    "specialization": "هندسة زراعية",
    "hiring_univ": "2012/8/14م",
    "hiring_service": "",
    "birth_date": "1987م",
    "grad_year": "2010م",
    "grade": "جيد",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 70,
    "name": "سماح محمد صالح الجعراني",
    "degree": "ماجستير",
    "specialization": "بساتين وغابات",
    "hiring_univ": "2014/3/6م",
    "hiring_service": "",
    "birth_date": "1985م",
    "grad_year": "2011م",
    "grade": "جيد",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 71,
    "name": "نور عثمان كوكبة",
    "degree": "ماجستير",
    "specialization": "علوم وتقنية غذائية",
    "hiring_univ": "2011-07-02",
    "hiring_service": "",
    "birth_date": "1986",
    "grad_year": "2009م",
    "grade": "جيد",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 72,
    "name": "نصر محمد علي العماري",
    "degree": "ماجستير",
    "specialization": "إدارة اعمال",
    "hiring_univ": "2002-11-10",
    "hiring_service": "",
    "birth_date": "1979م",
    "grad_year": "2009م",
    "grade": "جيد",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 73,
    "name": "منى علي صالح الفضلي",
    "degree": "ماجستير",
    "specialization": "تمريض",
    "hiring_univ": "2002-11-10",
    "hiring_service": "",
    "birth_date": "1976م",
    "grad_year": "2016م",
    "grade": "جيد",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 74,
    "name": "معمر مهيوب سعيد قاسم",
    "degree": "ماجستير",
    "specialization": "صيدلة",
    "hiring_univ": "2003-12-10",
    "hiring_service": "",
    "birth_date": "1981م",
    "grad_year": "2011م",
    "grade": "مقبول",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 75,
    "name": "ايه محمد محسن الحوثي",
    "degree": "ماجستير",
    "specialization": "إدارة اعمال",
    "hiring_univ": "2009-11-24",
    "hiring_service": "",
    "birth_date": "1986م",
    "grad_year": "2024م",
    "grade": "مقبول",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 76,
    "name": "عادل عبدالقادر سيف ناجي",
    "degree": "ماجستير",
    "specialization": "طب وجراحة الفم",
    "hiring_univ": "2009-12-30",
    "hiring_service": "",
    "birth_date": "1980م",
    "grad_year": "2010م",
    "grade": "جيد",
    "continuity": "مستمر",
    "customValues": {
      "work_practice": 5
    }
  },
  {
    "id": 77,
    "name": "ابراهيم محمد ناجي العامري",
    "degree": "دكتوراه",
    "specialization": "إدارة عامة",
    "hiring_univ": "1997",
    "hiring_service": "",
    "birth_date": "1977",
    "grad_year": "2017",
    "grade": "بدون",
    "continuity": "متاح",
    "customValues": {
      "work_practice": 3
    }
  }
];
