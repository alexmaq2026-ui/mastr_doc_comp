const puppeteer = require('puppeteer');
const path = require('path');

const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Arial', sans-serif;
    background: white;
    color: #1e293b;
    direction: rtl;
    font-size: 13px;
  }
  .page { width: 210mm; padding: 14mm 13mm; background: white; }

  /* Header */
  .header { text-align: center; border-bottom: 3px solid #1e3a5f; padding-bottom: 12px; margin-bottom: 16px; }
  .univ-name { font-size: 16px; font-weight: 900; color: #1e3a5f; }
  .system-name { font-size: 11px; color: #475569; margin-top: 2px; font-weight: 600; }
  .report-title { margin-top: 10px; background: linear-gradient(135deg, #1e3a5f, #2563eb); color: white; padding: 8px 28px; border-radius: 8px; font-size: 15px; font-weight: 900; display: inline-block; }
  .report-sub { margin-top: 6px; font-size: 11px; color: #64748b; font-weight: 600; }
  .date-badge { display: inline-block; margin-top: 5px; background: #f0f9ff; border: 1px solid #bae6fd; color: #0369a1; padding: 3px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; }

  /* Stats */
  .stats-bar { display: flex; gap: 8px; margin-bottom: 16px; }
  .stat-card { flex: 1; text-align: center; padding: 8px 6px; border-radius: 8px; border: 1.5px solid; }
  .stat-card.blue  { background: #eff6ff; border-color: #bfdbfe; }
  .stat-card.green { background: #f0fdf4; border-color: #bbf7d0; }
  .stat-card.purple{ background: #faf5ff; border-color: #e9d5ff; }
  .stat-card.amber { background: #fffbeb; border-color: #fde68a; }
  .stat-card .num  { font-size: 20px; font-weight: 900; }
  .stat-card.blue   .num { color: #2563eb; }
  .stat-card.green  .num { color: #16a34a; }
  .stat-card.purple .num { color: #7c3aed; }
  .stat-card.amber  .num { color: #d97706; }
  .stat-card .label { font-size: 10px; color: #64748b; font-weight: 700; margin-top: 2px; }

  /* Section */
  .section { margin-bottom: 14px; }
  .section-header { padding: 7px 12px; border-radius: 7px 7px 0 0; font-weight: 800; font-size: 12.5px; color: white; }
  .section-header.design { background: #1e40af; }
  .section-header.ui     { background: #065f46; }
  .section-header.logic  { background: #7c3aed; }
  .section-header.fix    { background: #b45309; }
  .section-header.bugfix { background: #991b1b; }
  .section-body { border: 1.5px solid #e2e8f0; border-top: none; border-radius: 0 0 7px 7px; }

  .commit-row { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; }
  .commit-row:last-child { border-bottom: none; }
  .commit-row:nth-child(even) { background: #f8fafc; }
  .commit-title { font-weight: 700; font-size: 12px; color: #1e293b; margin-bottom: 4px; }
  .commit-time { display: inline-block; font-size: 10px; color: #94a3b8; background: #f1f5f9; padding: 1px 7px; border-radius: 10px; margin-right: 4px; }
  .commit-hash { display: inline-block; font-size: 10px; color: #64748b; background: #f8fafc; border: 1px solid #e2e8f0; padding: 1px 6px; border-radius: 4px; font-family: monospace; }
  .detail-list { margin: 5px 0 0 0; padding: 0; list-style: none; }
  .detail-list li { font-size: 11px; color: #475569; padding: 2px 14px 2px 0; position: relative; line-height: 1.5; }
  .detail-list li::before { content: '◈'; position: absolute; right: 0; color: #94a3b8; font-size: 9px; top: 3px; }
  .file-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; }
  .file-tag { font-size: 10px; padding: 1px 7px; border-radius: 10px; font-weight: 600; }
  .file-tag.js   { background: #fef9c3; color: #854d0e; border: 1px solid #fde047; }
  .file-tag.css  { background: #ede9fe; color: #5b21b6; border: 1px solid #c4b5fd; }
  .file-tag.html { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

  /* Fix box */
  .fix-boxes { display: flex; gap: 10px; margin-top: 8px; }
  .fix-box { flex: 1; padding: 7px 10px; border-radius: 6px; font-size: 11px; }
  .fix-box.before { background: #fee2e2; border: 1px solid #fca5a5; }
  .fix-box.after  { background: #dcfce7; border: 1px solid #86efac; }
  .fix-box .box-label { font-weight: 800; margin-bottom: 3px; font-size: 10.5px; }
  .fix-box.before .box-label { color: #dc2626; }
  .fix-box.after  .box-label { color: #16a34a; }
  .fix-box code { display: block; font-family: monospace; font-size: 10px; background: rgba(0,0,0,0.06); padding: 3px 5px; border-radius: 3px; margin-top: 3px; direction: ltr; text-align: left; }

  /* Footer */
  .footer { margin-top: 18px; border-top: 2px solid #e2e8f0; padding-top: 10px; text-align: center; }
  .sig-row { display: flex; justify-content: space-around; margin: 16px 0 6px 0; }
  .sig-box { text-align: center; width: 150px; }
  .sig-line { border-bottom: 1.5px solid #94a3b8; margin-bottom: 4px; height: 24px; }
  .sig-name { font-size: 10.5px; font-weight: 700; color: #475569; }
  .sig-role { font-size: 9px; color: #94a3b8; }
  .footer-text { font-size: 10px; color: #94a3b8; }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="univ-name">جامعة صنعاء — مجلس الجامعة</div>
    <div class="system-name">نظام المفاضلة والتنافس الأكاديمي للكادر الإداري — MAQATECH</div>
    <div class="report-title">📋 تقرير التحديثات والتطويرات اليومية</div>
    <div class="report-sub">ملخص شامل لجميع التعديلات والتحسينات المُنجزة</div><br>
    <div class="date-badge">📅 السبت — 22 أغسطس 2026</div>
  </div>

  <div class="stats-bar">
    <div class="stat-card blue"><div class="num">7</div><div class="label">إجمالي التعديلات</div></div>
    <div class="stat-card green"><div class="num">3</div><div class="label">تحسينات واجهة المستخدم</div></div>
    <div class="stat-card purple"><div class="num">2</div><div class="label">إعادة تصميم</div></div>
    <div class="stat-card amber"><div class="num">2</div><div class="label">إصلاح أخطاء منطقية</div></div>
  </div>

  <!-- 1 -->
  <div class="section">
    <div class="section-header design">✨ أولاً: إعادة تصميم شاشة التقرير بحسب المعيار — Luxury Edition</div>
    <div class="section-body">
      <div class="commit-row">
        <div class="commit-title">إعادة تصميم كاملة لشاشة التقرير بحسب المعيار <span class="commit-time">17:14</span><span class="commit-hash">873ce65</span></div>
        <ul class="detail-list">
          <li>CSS: تصميم جديد كامل بنظام classes متكاملة (cr-*) — بطاقات المعايير بأيقونة وخط مضيء علوي</li>
          <li>شريط أدوات نظيف بصف واحد مع فواصل بصرية ومنطقة فلتر بإطار أزرق مميز لكل معيار</li>
          <li>5 بطاقات إحصاء بألوان متميزة (أزرق / أخضر / بنفسجي / teal / أصفر)</li>
          <li>JS: هيكل جديد لـ renderCriterionReportScreen — 6 بطاقات معايير بدلاً من pills مزدحمة</li>
          <li>دوال مساعدة جديدة: renderSpecificCriterionControlsNew + buildCriterionValueBadgeNew</li>
          <li>الجدول: 9 أعمدة فقط (أكثر وضوحاً) مع badges ملونة حسب نوع المعيار</li>
        </ul>
        <div class="file-tags">
          <span class="file-tag js">app.js (+1234 سطر)</span>
          <span class="file-tag css">style.css (+664 سطر)</span>
          <span class="file-tag html">index.html (+28 سطر)</span>
        </div>
      </div>
    </div>
  </div>

  <!-- 2 -->
  <div class="section">
    <div class="section-header ui">🌐 ثانياً: تحسينات تجربة المستخدم (UX)</div>
    <div class="section-body">
      <div class="commit-row">
        <div class="commit-title">استبدال الرموز التقنية بنص عربي واضح في قوائم الفلترة <span class="commit-time">17:37</span><span class="commit-hash">8550909</span></div>
        <ul class="detail-list">
          <li>استبدل رموز (≥ ≤ ⬇ ⬆) بعبارات عربية بسيطة لتسهيل الاستخدام على المستخدم العادي</li>
          <li>معيار الأقدمية: «من أقدميته لا تقل عن» / «من أقدميته لا تزيد عن» / «من له أقدمية بسنة بعينها»</li>
          <li>معيار العمر: «الأكبر سناً يظهر أولاً» / «الأصغر سناً يظهر أولاً» مع فئات موصوفة</li>
          <li>معيار المجموع: «من مجموعه لا يقل عن» / «من مجموعه يقع بين نقطتين محددتين»</li>
        </ul>
        <div class="file-tags"><span class="file-tag js">app.js (+21 / -21 سطر)</span></div>
      </div>
      <div class="commit-row">
        <div class="commit-title">تبسيط ترويسة المستخدم — عرض الاسم فقط <span class="commit-time">18:12</span><span class="commit-hash">31c1715</span></div>
        <ul class="detail-list">
          <li>حذف الدائرة الملونة (avatar) التي تعرض أول حرف من الاسم</li>
          <li>حذف الصفة/الدور أسفل الاسم (user-role-tag) لتنظيف الواجهة</li>
          <li>الإبقاء على اسم المستخدم فقط بخط واضح وأنيق مع زر الخروج وزر التحكم</li>
        </ul>
        <div class="file-tags"><span class="file-tag js">app.js (+2 / -6 أسطر)</span></div>
      </div>
    </div>
  </div>

  <!-- 3 -->
  <div class="section">
    <div class="section-header logic">🎯 ثالثاً: ضبط منطق تقرير المعايير</div>
    <div class="section-body">
      <div class="commit-row">
        <div class="commit-title">حصر المعايير الخمسة الأساسية وإلغاء بطاقة المجموع وحذف تمييز الفائزين <span class="commit-time">18:57</span><span class="commit-hash">764fe59</span></div>
        <ul class="detail-list">
          <li>حذف بطاقة «المجموع الكلي» من شريط المعايير — إبقاء المعايير الـ5 الفردية فقط</li>
          <li>المعايير المُبقاة: الأقدمية / العمر / التخصص / التقدير / الاستمرارية</li>
          <li>تعديل شبكة أزرار CSS لتصبح 5 أعمدة متساوية وأنيقة</li>
          <li>حذف وسام «★ فائز» والتمييز اللوني للصفوف لضمان حيادية التقرير كأداة تدقيق</li>
        </ul>
        <div class="file-tags">
          <span class="file-tag js">app.js (-127 سطر)</span>
          <span class="file-tag css">style.css (تعديل)</span>
        </div>
      </div>
    </div>
  </div>

  <!-- 4 -->
  <div class="section">
    <div class="section-header fix">📝 رابعاً: ضبط توقيعات التقارير الرسمية</div>
    <div class="section-body">
      <div class="commit-row">
        <div class="commit-title">تحديث توقيعات تقرير المعايير المخصص (PDF والطباعة) <span class="commit-time">20:52</span><span class="commit-hash">0e5fcbd</span></div>
        <ul class="detail-list">
          <li>الصف الأول: مدير شئون الطلاب (يمين) | مدير عام الشئون الإدارية (يسار)</li>
          <li>الصف الثاني: يعتمد / الأمين العام (في المنتصف)</li>
          <li>التطبيق حصرياً على شاشة التقرير بحسب المعيار دون التأثير على بقية التقارير</li>
        </ul>
        <div class="file-tags"><span class="file-tag js">app.js (+16 / -11 سطر)</span></div>
      </div>
      <div class="commit-row">
        <div class="commit-title">تصحيح المسمى الوظيفي في التوقيعات <span class="commit-time">20:58</span><span class="commit-hash">d8bc525</span></div>
        <ul class="detail-list">
          <li>تصحيح: «مدير شئون الموظفين» بدلاً من «مدير شئون الطلاب» في توقيعات تقرير المعايير</li>
        </ul>
        <div class="file-tags"><span class="file-tag js">app.js (+2 / -2 سطر)</span></div>
      </div>
    </div>
  </div>

  <!-- 5 -->
  <div class="section">
    <div class="section-header bugfix">🔬 خامساً: إصلاح خطأ منطقي في رادار فحص النواقص</div>
    <div class="section-body">
      <div class="commit-row">
        <div class="commit-title">تصحيح دالة isInvalidGradeValue — إزالة «بدون» من التقديرات الصالحة <span class="commit-time">21:53</span></div>
        <ul class="detail-list">
          <li>المشكلة: النظام كان يعتبر «بدون» في حقل التقدير قيمةً صالحةً ومكتملةً — مما أظهر نسبة جاهزية 100% خطأً</li>
          <li>الواقع: «بدون» تعني أن المتنافس لم يُقدِّم وثيقة التقدير العلمي — وهو نقص حقيقي في الملف</li>
          <li>بعد الإصلاح: كل متنافس بتقدير «بدون» يظهر الآن ضمن رادار النواقص بشكل صحيح</li>
        </ul>
        <div class="fix-boxes">
          <div class="fix-box before">
            <div class="box-label">❌ قبل الإصلاح — «بدون» = مكتمل (خطأ)</div>
            <code>validGrades = ['ممتاز','جيد جداً','جيد','مقبول','بدون']</code>
          </div>
          <div class="fix-box after">
            <div class="box-label">✅ بعد الإصلاح — «بدون» = ناقص (صح)</div>
            <code>validGrades = ['ممتاز','جيد جداً','جيد','مقبول']</code>
          </div>
        </div>
        <div class="file-tags" style="margin-top:8px"><span class="file-tag js">app.js — السطر 6654</span></div>
      </div>
    </div>
  </div>

  <div class="footer">
    <div class="sig-row">
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-name">مدير شئون الموظفين</div>
        <div class="sig-role">التوقيع والختم</div>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-name">يعتمد / الأمين العام</div>
        <div class="sig-role">التوقيع والختم</div>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-name">مدير عام الشئون الإدارية</div>
        <div class="sig-role">التوقيع والختم</div>
      </div>
    </div>
    <div class="footer-text">
      نظام المفاضلة والتنافس الأكاديمي — MAQATECH Software Solutions | جامعة صنعاء — مجلس الجامعة<br>
      تم إنشاء هذا التقرير آلياً — السبت 22 أغسطس 2026 | الإصدار: تحديث1_22-08-2026
    </div>
  </div>

</div>
</body>
</html>
`;

(async () => {
  const outputPath = 'E:\\منافسة_ماجستير ودكتوراه\\تحديث1_22-08-2026.pdf';
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.pdf({ path: outputPath, format: 'A4', printBackground: true, margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' } });
    console.log('SUCCESS:' + outputPath);
  } catch (err) {
    console.error('ERROR:' + err.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
