/**
 * سكريبت تشخيصي: يقرأ الإكسل ويعرض البيانات الخام ثم يقارنها مع Supabase
 */
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wpnujibmxrxxaqriadez.supabase.co';
const SUPABASE_KEY = 'sb_publishable_PudkaqYYnpEc8JrQfNUyCw_BWSzZElC';
const MASTER_FILE  = 'E:\\ملفات المنح\\نعديل ا,عبدلملك\\مرسل_الهمداني\\كشف منح ماجستير نهائي اكسل 55.xlsx';
const DOCTOR_FILE  = 'E:\\ملفات المنح\\نعديل ا,عبدلملك\\مرسل_الهمداني\\كشف منح الدكتوراه النهائي اكسل.xlsx';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function excelDateToString(val) {
  if (val === null || val === undefined || val === '') return '';
  // إذا كان رقماً (Serial Date في الإكسل) → نحوّله إلى تاريخ
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val);
    if (date) {
      const y = date.y, m = String(date.m).padStart(2,'0'), d = String(date.d).padStart(2,'0');
      return `${y}-${m}-${d}`;
    }
    return String(val);
  }
  return String(val).trim();
}

function readExcel(filePath, degree) {
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const candidates = [];
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    console.log(`\n📋 [${degree}] ورقة: "${sheetName}" — ${rows.length} صف`);
    console.log('📌 رؤوس الأعمدة:', JSON.stringify(rows[0]));
    console.log('📌 أول صف بيانات:', JSON.stringify(rows[1]));
    console.log('📌 ثاني صف بيانات:', JSON.stringify(rows[2]));

    rows.forEach((row, idx) => {
      if (idx === 0) return; // تخطي العناوين
      const rawName = String(row[1] || '').trim();
      if (!rawName || rawName === 'الاسم' || rawName === '' || rawName === 'None') return;

      // الأعمدة الصحيحة حسب ترتيب الإكسل الفعلي:
      // 0=م | 1=الاسم | 2=الدرجة | 3=التخصص | 4=تاريخ التعيين | 5=تاريخ الميلاد | 6=العمر | 7=سنة التخرج | 8=التقدير | 9=الاستمرارية
      candidates.push({
        _idx: idx,
        name:           rawName,
        degree:         degree,
        specialization: String(row[3] || '').trim() || 'غير محدد',
        hiring_service: excelDateToString(row[4]),   // تاريخ التعيين
        birth_date:     excelDateToString(row[5]),   // تاريخ الميلاد
        grad_year:      String(row[7] || '').trim(), // سنة التخرج
        grade:          String(row[8] || '').trim() || 'جيد', // التقدير
        continuity:     String(row[9] || '').trim() || 'مستمر', // الاستمرارية
        hiring_univ:    ''
      });
    });
  });
  return candidates;
}

async function main() {
  console.log('═══════ تشخيص بيانات الإكسل ═══════');
  const masterData = readExcel(MASTER_FILE, 'ماجستير');
  const doctorData = readExcel(DOCTOR_FILE, 'دكتوراه');

  console.log(`\n\n📊 أول 5 سجلات ماجستير:`);
  masterData.slice(0,5).forEach((c,i) => {
    console.log(`  [${i+1}] ${c.name}`);
    console.log(`       التخصص: ${c.specialization}`);
    console.log(`       تاريخ التعيين: ${c.hiring_service}`);
    console.log(`       تاريخ الميلاد: ${c.birth_date}`);
    console.log(`       سنة التخرج: ${c.grad_year}`);
    console.log(`       التقدير: ${c.grade}`);
    console.log(`       الاستمرارية: ${c.continuity}`);
  });

  // مقارنة مع Supabase
  console.log('\n\n═══════ ما هو موجود في Supabase حالياً ═══════');
  const { data, error } = await supabase.from('candidates').select('*').order('id', { ascending: true }).limit(10);
  if (error) { console.error('خطأ:', error); return; }
  console.log(`إجمالي السجلات في Supabase: سيتم عرض أول 10:`);
  data.forEach((c,i) => {
    console.log(`  [${i+1}] id=${c.id} | ${c.name} | التقدير=${c.grade} | تاريخ التعيين=${c.hiring_service} | سنة التخرج=${c.grad_year}`);
  });

  // إحصائية
  const { count } = await supabase.from('candidates').select('*', { count: 'exact', head: true });
  console.log(`\n📊 إجمالي السجلات في Supabase: ${count}`);
}

main().catch(console.error);
