# -*- coding: utf-8 -*-
import os
import subprocess
import tempfile

html_content = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>التقرير الفني الشامل لتطويرات نظام المفاضلة الإلكتروني</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
  
  @page {
    size: A4 portrait;
    margin: 15mm 15mm 15mm 15mm;
  }
  
  body {
    font-family: 'Tajawal', 'Segoe UI', Tahoma, Arial, sans-serif;
    direction: rtl;
    background: #ffffff;
    color: #1e293b;
    margin: 0;
    padding: 0;
    line-height: 1.6;
    font-size: 11pt;
  }

  .header-box {
    border-bottom: 2px solid #0f766e;
    padding-bottom: 12px;
    margin-bottom: 16px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .univ-title {
    font-size: 16pt;
    font-weight: 900;
    color: #0f766e;
    margin: 0 0 4px 0;
  }

  .sub-univ-title {
    font-size: 12pt;
    font-weight: 800;
    color: #334155;
    margin: 0 0 4px 0;
  }

  .report-main-badge {
    background: linear-gradient(135deg, #0f766e, #0d9488);
    color: #ffffff;
    padding: 6px 18px;
    border-radius: 8px;
    font-size: 13pt;
    font-weight: 900;
    margin-top: 8px;
    display: inline-block;
  }

  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 16px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 9.5pt;
  }

  .meta-item strong {
    color: #0f766e;
  }

  h2 {
    font-size: 12.5pt;
    font-weight: 800;
    color: #0f766e;
    border-right: 4px solid #0f766e;
    padding-right: 8px;
    margin: 18px 0 10px 0;
    background: #f0fdf4;
    padding-top: 4px;
    padding-bottom: 4px;
    border-radius: 0 4px 4px 0;
  }

  h3 {
    font-size: 11pt;
    font-weight: 800;
    color: #1e293b;
    margin: 12px 0 6px 0;
  }

  p {
    margin: 0 0 8px 0;
    text-align: justify;
  }

  ul {
    margin: 4px 0 10px 0;
    padding-right: 20px;
  }

  li {
    margin-bottom: 5px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0 16px 0;
    font-size: 9.5pt;
  }

  th, td {
    border: 1px solid #cbd5e1;
    padding: 6px 10px;
    text-align: right;
  }

  th {
    background: #0f766e;
    color: #ffffff;
    font-weight: 800;
    text-align: center;
  }

  tr:nth-child(even) td {
    background: #f8fafc;
  }

  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 8.5pt;
    font-weight: 700;
  }

  .badge-success {
    background: #dcfce7;
    color: #166534;
    border: 1px solid #86efac;
  }

  .badge-info {
    background: #e0f2fe;
    color: #0369a1;
    border: 1px solid #7dd3fc;
  }

  .card-box {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }

  .footer-sig {
    margin-top: 24px;
    border-top: 1.5px solid #cbd5e1;
    padding-top: 12px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    text-align: center;
    page-break-inside: avoid;
  }

  .page-break {
    page-break-after: always;
  }
</style>
</head>
<body>

  <!-- رأس التقرير -->
  <div class="header-box">
    <div class="univ-title">الجمهورية اليمنية - جامعة صنعاء</div>
    <div class="sub-univ-title">مجلس الجامعة | لجنة المفاضلة لمنح الدراسات العليا (الكادر الإداري)</div>
    <div class="report-main-badge">التقرير الفني الشامل للتطويرات والتحسينات المنجزة على النظام</div>
  </div>

  <!-- بيانات التقرير -->
  <div class="meta-grid">
    <div class="meta-item"><strong>عنوان النظام:</strong> نظام المفاضلة والتنافس الإلكتروني لمنح الماجستير والدكتوراه</div>
    <div class="meta-item"><strong>العام الجامعي المستهدف:</strong> 2025 / 2026م</div>
    <div class="meta-item"><strong>تاريخ الإنجاز والتوثيق:</strong> 16 أغسطس 2026م</div>
    <div class="meta-item"><strong>حالة البناء والنشر:</strong> منجز، تم اختباره، ونشره بنجاح (Production Ready)</div>
  </div>

  <p><strong>مقدمة التقرير:</strong><br>
  يوثق هذا التقرير كافة الأعمال البرمجية والتطويرية والهيكلية التي تم تنفيذها اليوم في نظام المفاضلة والتنافس الإلكتروني بجامعة صنعاء، والتي استهدفت رفع موثوقية النظام إلى أعلى المعايير القانونية والفنية، وتعزيز قدرات التصدير والطباعة (PDF & Excel)، وتوفير المزامنة اللحظية الشاملة لكافة المعايير والوثائق الرسمية.
  </p>

  <!-- المحور الأول -->
  <h2>1. منظومة طباعة وتصدير سجلات وكشوفات المتنافسين (PDF & Excel)</h2>
  
  <div class="card-box">
    <h3>أ- الترويسة الرسمية لسجل المتنافسين (PDF):</h3>
    <ul>
      <li>تم ضبط ترويسة طباعة سجل المتنافسين بدقة وحصرها في السطرين الرسميين المعتمدين:
        <br><strong>- السطر الأول:</strong> «جامعة صنعاء - مجلس الجامعة»
        <br><strong>- السطر الثاني:</strong> «لجنة المفاضلة لمنح الماجستير والدكتوراه - الكادر الإداري»
      </li>
      <li>إلغاء أي إضافات نصية أو ترويسات عامة، وإخفاء شريط التنقل العلوي للويب وقوائم النظام أثناء أمر الطباعة لضمان مخرجات ورقية غاية في الرسمية والأناقة.</li>
    </ul>

    <h3>ب- هيكلية التوقيعات الرسمية المعتمدة في أسفل كشف المتنافسين:</h3>
    <ul>
      <li><strong>السطر الأول:</strong> «مدير إدارة شؤون الموظفين» (جهة اليمين) و«مدير عام الشؤون الإدارية» (جهة اليسار) مع توفير خطوط منقطة لتدوين الأسماء والتواقيع يدوياً.</li>
      <li><strong>السطر الثاني:</strong> «يعتمد / أمين عام الجامعة» (في المنتصف) مع مساحة مخصصة للاعتماد الرسمي.</li>
      <li>تمت إزالة الأختام التلقائية المسبقة لترك المجال للاعتماد الحي والميداني.</li>
    </ul>

    <h3>ج- المحرك الشامل لتصدير بيانات ومصفوفات النظام إلى ملفات Excel:</h3>
    <ul>
      <li><strong>شاشة سجل المتنافسين (#tab-candidates):</strong> تم بناء زر تصدير متطور يتيح تصدير الماجستير فقط، الدكتوراه فقط، أو الكل في ملف عمل واحد متعدد الأوراق (Worksheet لكل درجة علمية + شيت مجمع).</li>
      <li><strong>شاشة مصفوفة المفاضلة والتنافس (#tab-scoring):</strong> تم تفعيل زر تصدير مصفوفة النتائج يفرز المتنافسين تنازلياً مع تفصيل درجات كل معيار أساسي ومخصص، ونقاط كسر التعادل، والقرار النهائي.</li>
      <li><strong>شاشات التقارير والتحليلات (#tab-report, #tab-analytics):</strong> دعم كامل لتصدير التقارير الإحصائية وتوزيع المؤهلات والتخصصات إلى إكسل.</li>
    </ul>
  </div>

  <div class="page-break"></div>

  <!-- المحور الثاني -->
  <h2>2. علاج مشكلة الموثوقية واستدامة حفظ نطاقات المعايير (State Persistence)</h2>
  
  <div class="card-box">
    <p><strong>التشخيص الفني للمشكلة:</strong><br>
    لوحظ أنه عند تحديد معيار التقدير ليكون (ماجستير فقط) وحفظ الإعدادات، كان المتصفح عند إعادة التحميل (F5) يقوم بجلب كائن المعايير الافتراضي القديم من قاعدة بيانات Supabase مما كان يتسبب في مسح التعديل المحلي وإعادته إلى (مُفعّل للكل).
    </p>

    <p><strong>المعالجة الجذرية المنفذة:</strong></p>
    <ul>
      <li><strong>تطوير محرك المزامنة السحابية (supabase_client.js):</strong> تم تحديث دالة <code>syncCandidatesFromSupabase()</code> بحيث تطبق خوارزمية دمج ذكية غير هادمة (Non-destructive Smart Merge)، تضمن الحفاظ على أي تخصيص لنطاق التفعيل (<code>targetDegree</code>) أو تعطيل المعيار أو تعديل وزنه تم محلياً ومنع طمسه تحت أي ظرف.</li>
      <li><strong>ترقية زر «حفظ كافة التعديلات والأوزان»:</strong> تم تحديث دالة <code>saveAllCriteriaAndSettings()</code> لتقوم بالمسح المباشر لكافة القوائم المنسدلة وحقول النقاط في الشاشة وتثبيتها في الذاكرة المحلية والرفع الفوري المؤكد بقاعدة بيانات السحابة (<code>await syncCriteriaToSupabase</code>).</li>
      <li><strong>النتيجة:</strong> أصبح خيار تفعيل المعيار (ماجستير فقط / دكتوراه فقط / للكل / معطل) ثابتاً ومستقراً 100% ومقاوماً لأي إعادة تحميل أو انتقال بين الشاشات.</li>
    </ul>
  </div>

  <!-- المحور الثالث -->
  <h2>3. المزامنة القانونية الدقيقة لوثيقة دليل معايير وأوزان المفاضلة</h2>

  <div class="card-box">
    <p>تم تحويل «وثيقة دليل معايير وأوزان المفاضلة المعتمدة» إلى وثيقة تفاعلية متزامنة لحظياً مع كافة متغيرات النظام:</p>
    <ul>
      <li><strong>تفصيل معيار تقدير المؤهل الأكاديمي السابق (التقدير):</strong>
        <br>• توضيح تفصيلي لمتنافسي الماجستير بناءً على مؤهل البكالوريوس (ممتاز 5، جيد جداً 5، جيد 5، مقبول 4، بدون معدل 0).
        <br>• توضيح تفصيلي لمتنافسي الدكتوراه بناءً على مؤهل الماجستير (ممتاز 5، جيد جداً 5، جيد 5، مقبول 4، بدون معدل 0).
        <br>• في حال تخصيص المعيار للماجستير فقط، تظهر الوثيقة شارة واضحة وتفصيلاً قانونياً بأن المعيار محصور بمتنافسي الماجستير ولا يُحتسب للدكتوراه.
      </li>
      <li><strong>السقف الإجمالي للنقاط الديناميكي:</strong>
        <br>يتم احتساب سقف المنظومة آلياً بحسب المعايير النشطة لكل درجة، مثل:
        <br><em>«العام الجامعي 2025/2026م (سقف مفاضلة الماجستير: 30 نقطة | سقف مفاضلة الدكتوراه: 25 نقطة)»</em>.
      </li>
      <li><strong>تزامن شرائح العمر والمعايير المخصصة:</strong> عرض مباشر لمعيار الاستمرارية (مستمر 5 / متاح 3) والفئات العمرية للتخصصات.</li>
    </ul>
  </div>

  <!-- جدول الملفات المحدثة -->
  <h2>4. جدول حصر الملفات البرمجية التي تم تعديلها وتطويرها</h2>

  <table>
    <thead>
      <tr>
        <th style="width: 25%;">الملف</th>
        <th style="width: 20%;">طبيعة التعديل</th>
        <th style="width: 55%;">أهم التغييرات المنجزة</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>js/app.js</strong></td>
        <td><span class="badge badge-success">تطوير شامل</span></td>
        <td>تحديث ترويسة وتوقيعات سجل المتنافسين، إضافة دوال التصدير لإكسل لكافة الشاشات، ترقية دالة الحفظ الشامل للأوزان، وتحديث محرك وثيقة المعايير القانونية.</td>
      </tr>
      <tr>
        <td><strong>js/supabase_client.js</strong></td>
        <td><span class="badge badge-info">ترقية استقرار</span></td>
        <td>تحسين خوارزمية دمج ومزامنة المعايير السحابية، وضمان استدامة خيار targetDegree وعدم طمس الخيارات المحلية عند الإقلاع.</td>
      </tr>
      <tr>
        <td><strong>index.html</strong></td>
        <td><span class="badge badge-success">إضافة واجهات</span></td>
        <td>إضافة أزرار التصدير إلى Excel في شاشات المتنافسين والمفاضلة التنافسية.</td>
      </tr>
      <tr>
        <td><strong>css/style.css</strong></td>
        <td><span class="badge badge-info">تحسين تنسيق</span></td>
        <td>ضبط وسائط الطباعة (Print Media Queries) لإخفاء أشرطة الموقع وعرض الوثائق بأعلى جودة.</td>
      </tr>
    </tbody>
  </table>

  <!-- توقيعات التقرير -->
  <div class="footer-sig">
    <div>
      <p style="font-weight: 800; margin: 0 0 4px 0; color: #0f766e;">إعداد وتوثيق النظام الفني</p>
      <p style="margin: 0; font-size: 9pt; color: #64748b;">نظام المفاضلة الإلكتروني - جامعة صنعاء</p>
    </div>
    <div>
      <p style="font-weight: 800; margin: 0 0 4px 0; color: #0f766e;">اعتماد التقرير</p>
      <p style="margin: 0; font-size: 9pt; color: #64748b;">العام الجامعي 2025 / 2026م</p>
    </div>
  </div>

</body>
</html>
"""

temp_html_path = os.path.join(tempfile.gettempdir(), "report_summary.html")
with open(temp_html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

target_dirs = [
    r"E:\احنياطي منافسة_دك_ما\16_8\04\منافسة_ماجستير ودكتوراه",
    r"E:\احتياطي منافسة_دك_ما\16_8\04\منافسة_ماجستير ودكتوراه"
]

pdf_filename = "التقرير_الشامل_عن_تطويرات_النظام_16_8_2026.pdf"

browser_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not os.path.exists(browser_path):
    browser_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

for tdir in target_dirs:
    os.makedirs(tdir, exist_ok=True)
    out_pdf = os.path.join(tdir, pdf_filename)
    cmd = [
        browser_path,
        "--headless",
        "--disable-gpu",
        "--run-all-compositor-stages-before-draw",
        f"--print-to-pdf={out_pdf}",
        "--no-pdf-header-footer",
        temp_html_path
    ]
    print(f"Generating PDF to: {out_pdf}")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode == 0 and os.path.exists(out_pdf):
        print(f"SUCCESS: Generated {out_pdf} (Size: {os.path.getsize(out_pdf)} bytes)")
    else:
        print(f"ERROR: Failed to generate {out_pdf}, err: {res.stderr}")
