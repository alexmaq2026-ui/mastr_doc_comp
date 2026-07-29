# 🎓 دليل الرفع والنشر الإلكتروني لنظام مفاضلة جامعة صنعاء (GitHub + Supabase + Render)

هذا الملف يحتوي على الدليل الشامل لرفع وتطبيق نظام مفاضلة جامعة صنعاء أونلاين على منصة **Render** وربطه بقاعدة بيانات **Supabase PostgreSQL** ورابط مشروعك على **GitHub**.

---

## 🛠️ الخطوة 1: الرفع إلى GitHub

1. افتح مبدئياً **Git Bash** أو **Terminal** في مجلد المشروع:
   `e:\منافسة_ماجستير ودكتوراه`

2. قم بتنفيذ الأوامر التالية بالترتيب:
   ```bash
   git init
   git add .
   git commit -m "الإصدار الأول لنظام مفاضلة جامعة صنعاء 2026"
   ```

3. اذهب لموقع **[GitHub.com](https://github.com)** وأنشئ مستودعاً جديداً (New Repository) باسم: `sanaa-univ-competition`

4. اربط المستودع وارفع الملفات بإدخال الأوامر التالية:
   ```bash
   git branch -M main
   git remote add origin https://github.com/USERNAME/sanaa-univ-competition.git
   git push -u origin main
   ```
   *(استبدل USERNAME باسم حسابك على GitHub)*.

---

## 🗄️ الخطوة 2: إنشاء قاعدة البيانات على Supabase

1. اذهب لموقع **[Supabase.com](https://supabase.com)** وسجل الدخول.
2. أنشئ مشروعاً جديداً باسم `sanaa-univ-competition`.
3. من القائمة الجانبية اختر **SQL Editor**.
4. انسخ محتوى الملف 📄 **`supabase_schema.sql`** الموجود في مجلد المشروع، والمصق الكود واضغط **`Run`**.
5. من إعدادات المشروع **Project Settings -> API** قم بنسخ:
   - **Project URL**
   - **anon public key**

---

## 🚀 الخطوة 3: النشر والاستضافة على Render.com

1. اذهب لموقع **[Render.com](https://render.com)** وأنشئ حساباً مجانياً.
2. اضغط على **`New +`** ثم اختر **`Web Service`**.
3. اربط حسابك بـ GitHub واختر مستودع `sanaa-univ-competition`.
4. ادخل البيانات التالية:
   - **Name:** `sanaa-competition-app`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. اضغط **`Create Web Service`**.

خلال دقيقة واحدة، سيرفع موقع Render نظام المفاضلة وسيعطيك رابـطاً رسمياً أونلاين مثل:
`https://sanaa-competition-app.onrender.com`

---

## 📁 ملفات المشروع الأساسية
- 📄 `index.html` - الواجهات والتفاعل الرئيسي.
- ⚙️ `server.js` - سيرفر Express لاستضافة الموقع أونلاين على Render.
- 📦 `package.json` - تعريف المشروع والاعتماديات.
- 🗄️ `supabase_schema.sql` - سكربت إنشاء جداول قاعدة بيانات Supabase.
- 🔌 `js/supabase_client.js` - محرك الربط أونلاين.
