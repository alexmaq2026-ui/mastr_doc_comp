/**
 * سكريبت تصحيح وتحديث بيانات الاستمرارية والممارسة الفعلية في Supabase
 */
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wpnujibmxrxxaqriadez.supabase.co';
const SUPABASE_KEY = 'sb_publishable_PudkaqYYnpEc8JrQfNUyCw_BWSzZElC';
const MASTER_FILE  = 'E:\\ملفات المنح\\نعديل ا,عبدلملك\\مرسل_الهمداني\\كشف منح ماجستير نهائي اكسل 55.xlsx';
const DOCTOR_FILE  = 'E:\\ملفات المنح\\نعديل ا,عبدلملك\\مرسل_الهمداني\\كشف منح الدكتوراه النهائي اكسل.xlsx';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function normalize(s) {
  return String(s || '').trim()
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ');
}

function readExcel(filePath, degree) {
  const wb = XLSX.readFile(filePath, { cellDates: false });
  const list = [];
  wb.SheetNames.forEach(sheet => {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, defval: '' });
    rows.forEach((row, idx) => {
      if (idx === 0) return;
      const name = String(row[1] || '').trim();
      if (!name || name === 'اسم الموظف المتنافس') return;
      const continuity = String(row[9] || '').trim() || 'مستمر';
      list.push({ name, degree, continuity });
    });
  });
  return list;
}

async function fixSupabaseContinuity() {
  console.log('🔄 قراءة الإكسل...');
  const mList = readExcel(MASTER_FILE, 'ماجستير');
  const dList = readExcel(DOCTOR_FILE, 'دكتوراه');
  const allExcel = [...mList, ...dList];

  console.log(`📊 إجمالي سجلات الإكسل: ${allExcel.length}`);

  const { data: dbData, error } = await supabase.from('candidates').select('*');
  if (error) {
    console.error('❌ خطأ جلب بيانات Supabase:', error);
    return;
  }

  console.log(`🗄️  إجمالي سجلات Supabase الحالية: ${dbData.length}`);

  let updatedCount = 0;
  for (const cand of dbData) {
    const normDbName = normalize(cand.name);
    const exMatch = allExcel.find(e => normalize(e.name) === normDbName && e.degree === cand.degree);
    const continuity = exMatch ? exMatch.continuity : (cand.custom_values?.continuity || 'مستمر');
    const workPracticePoints = (continuity === 'متاح') ? 3 : 5;

    const existingCV = cand.custom_values || {};
    const newCV = {
      ...existingCV,
      continuity: continuity,
      work_practice: workPracticePoints
    };
    delete newCV['استمرارية'];

    const { error: upErr } = await supabase.from('candidates').update({
      custom_values: newCV
    }).eq('id', cand.id);

    if (upErr) {
      console.error(`❌ خطأ تحديث ${cand.name}:`, upErr);
    } else {
      updatedCount++;
    }
  }

  console.log(`✅ تم تحديث ${updatedCount} سجل في Supabase بنجاح بجميع قيم work_practice و continuity.`);
}

fixSupabaseContinuity().catch(console.error);
