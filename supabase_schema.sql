-- ========================================================
-- كود إنشاء جداول قواعد بيانات Supabase لنظام مفاضلة جامعة صنعاء
-- قم بنسخ هذا الكود ولصقه في Supabase SQL Editor ثم اضغط Run
-- ========================================================

-- 1. جدول المتنافسين (Candidates)
CREATE TABLE IF NOT EXISTS public.candidates (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    degree TEXT NOT NULL DEFAULT 'ماجستير',
    specialization TEXT DEFAULT 'غير محدد',
    hiring_univ TEXT DEFAULT '',
    hiring_service TEXT DEFAULT '',
    birth_date TEXT DEFAULT '',
    grad_year TEXT DEFAULT '',
    grade TEXT DEFAULT 'جيد',
    custom_values JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. جدول أعضاء لجنة المفاضلة والتوقيعات (Committee Members)
CREATE TABLE IF NOT EXISTS public.committee_members (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    admin_title TEXT DEFAULT '',
    committee_role TEXT DEFAULT 'عضو اللجنة',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. جدول إعدادات وأوزان المفاضلة (System Settings & Criteria)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. جدول المستخدمين والصلاحيات (Users & Roles)
CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'data_entry',
    title TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- تفعيل صلاحيات القراءة والكتابة العامة (Row Level Security Disable or Public Policy)
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.committee_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write candidates" ON public.candidates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write committee_members" ON public.committee_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write system_settings" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write users" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- بيانات أولية افتراضية لأعضاء اللجنة
INSERT INTO public.committee_members (name, admin_title, committee_role, sort_order) VALUES
('أ.د. ابراهيم المطاع', 'نائب رئيس الجامعة للشؤون الأكاديمية', 'رئيس اللجنة', 1),
('د. حمود الأهنومي', 'نائب رئيس الجامعة للدراسات العليا', 'عضواً', 2),
('أ. اسكندر المقالح', 'أمين عام الجامعة', 'عضواً', 3),
('د. محمد نجاد', 'عميد كلية الشريعة والقانون', 'عضواً', 4),
('د. هاني مغلس', 'عميد كلية التجارة والاقتصاد', 'عضواً', 5)
ON CONFLICT DO NOTHING;
