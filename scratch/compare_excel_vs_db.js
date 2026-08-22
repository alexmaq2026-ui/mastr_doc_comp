/**
 * سكريبت تحليل ومقارنة شاملة — الملف المصدر vs قاعدة بيانات Supabase
 */
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wpnujibmxrxxaqriadez.supabase.co';
const SUPABASE_KEY = 'sb_publishable_PudkaqYYnpEc8JrQfNUyCw_BWSzZElC';
const MASTER_FILE  = 'E:\\ملفات المنح\\نعديل ا,عبدلملك\\مرسل_الهمداني\\كشف منح ماجستير نهائي اكسل 55.xlsx';
const DOCTOR_FILE  = 'E:\\ملفات المنح\\نعديل ا,عبدلملك\\مرسل_الهمداني\\كشف منح الدكتوراه النهائي اكسل.xlsx';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// قراءة ملف الإكسل بشكل خام
function readExcelRaw(filePath, degree) {
  const wb = XLSX.readFile(filePath, { cellDates: false });
  const results = [];
  wb.SheetNames.forEach(sheet => {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, defval: '' });
    rows.forEach((row, idx) => {
      if (idx === 0) return;
      const name = String(row[1] || '').trim();
      if (!name || name === 'اسم الموظف المتنافس') return;
      results.push({
        م: row[0],
        name,
        degree,
        specialization: String(row[3] || '').trim(),
        hiring_service: String(row[4] || '').trim(),
        birth_date:     String(row[5] || '').trim(),
        grad_year:      String(row[7] || '').trim(),
        grade:          String(row[8] || '').trim(),
        continuity:     String(row[9] || '').trim(),
      });
    });
  });
  return results;
}

function normalize(s) {
  return String(s || '').trim()
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ');
}

async function main() {
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  تقرير المقارنة الشاملة: ملفات الإكسل vs قاعدة بيانات Supabase');
  console.log('══════════════════════════════════════════════════════════════\n');

  // 1. قراءة الإكسل
  const excelMaster = readExcelRaw(MASTER_FILE, 'ماجستير');
  const excelDoctor = readExcelRaw(DOCTOR_FILE, 'دكتوراه');
  const allExcel    = [...excelMaster, ...excelDoctor];

  console.log(`📂 ملف الماجستير : ${excelMaster.length} سجل`);
  console.log(`📂 ملف الدكتوراه : ${excelDoctor.length} سجل`);
  console.log(`📊 إجمالي الإكسل : ${allExcel.length} سجل\n`);

  // 2. جلب بيانات Supabase
  const { data: dbData, error } = await supabase
    .from('candidates')
    .select('*')
    .order('id', { ascending: true });
  if (error) { console.error('❌ خطأ Supabase:', error); return; }
  console.log(`🗄️  إجمالي Supabase : ${dbData.length} سجل\n`);

  // ────────────────────────────────────────────────────────────────
  // تحليل عمود الاستمرارية في الإكسل
  // ────────────────────────────────────────────────────────────────
  console.log('══════ تحليل عمود الاستمرارية في الملفات المصدر ══════\n');

  const contExcelMaster = {};
  excelMaster.forEach(r => {
    const v = r.continuity || '(فارغ)';
    contExcelMaster[v] = (contExcelMaster[v] || 0) + 1;
  });
  console.log('📋 [ماجستير] توزيع الاستمرارية في الإكسل:');
  Object.entries(contExcelMaster).forEach(([k,v]) => console.log(`   "${k}" : ${v} سجل`));

  const contExcelDoctor = {};
  excelDoctor.forEach(r => {
    const v = r.continuity || '(فارغ)';
    contExcelDoctor[v] = (contExcelDoctor[v] || 0) + 1;
  });
  console.log('\n📋 [دكتوراه] توزيع الاستمرارية في الإكسل:');
  Object.entries(contExcelDoctor).forEach(([k,v]) => console.log(`   "${k}" : ${v} سجل`));

  // ────────────────────────────────────────────────────────────────
  // تحليل الاستمرارية في قاعدة البيانات
  // ────────────────────────────────────────────────────────────────
  console.log('\n══════ تحليل عمود الاستمرارية في قاعدة البيانات ══════\n');

  const contDbMaster = {}, contDbDoctor = {};
  dbData.forEach(r => {
    // الاستمرارية قد تكون في custom_values.continuity أو custom_values.استمرارية
    const cv = r.custom_values || {};
    const val = cv.continuity || cv['استمرارية'] || r.continuity || '(غير موجود)';
    if (r.degree === 'ماجستير') contDbMaster[val] = (contDbMaster[val] || 0) + 1;
    else contDbDoctor[val] = (contDbDoctor[val] || 0) + 1;
  });

  console.log('🗄️  [ماجستير] توزيع الاستمرارية في قاعدة البيانات:');
  Object.entries(contDbMaster).forEach(([k,v]) => console.log(`   "${k}" : ${v} سجل`));
  console.log('\n🗄️  [دكتوراه] توزيع الاستمرارية في قاعدة البيانات:');
  Object.entries(contDbDoctor).forEach(([k,v]) => console.log(`   "${k}" : ${v} سجل`));

  // ────────────────────────────────────────────────────────────────
  // مقارنة سجل بسجل
  // ────────────────────────────────────────────────────────────────
  console.log('\n══════ مقارنة سجل بسجل (الإكسل vs قاعدة البيانات) ══════\n');

  let matched = 0, mismatches = [];
  allExcel.forEach(exRow => {
    const normExName = normalize(exRow.name);
    const dbRow = dbData.find(d => normalize(d.name) === normExName && d.degree === exRow.degree);
    if (!dbRow) {
      mismatches.push({ type: 'غير موجود في قاعدة البيانات', name: exRow.name, degree: exRow.degree });
      return;
    }
    matched++;
    const cv = dbRow.custom_values || {};
    const dbContinuity = cv.continuity || cv['استمرارية'] || dbRow.continuity || '';
    const exContinuity = exRow.continuity;

    const diffs = [];
    if (normalize(exRow.grade) !== normalize(dbRow.grade || ''))
      diffs.push(`التقدير: إكسل="${exRow.grade}" | قاعدة="${dbRow.grade}"`);
    if (normalize(exContinuity) !== normalize(dbContinuity))
      diffs.push(`الاستمرارية: إكسل="${exContinuity}" | قاعدة="${dbContinuity}"`);
    if (normalize(exRow.specialization) !== normalize(dbRow.specialization || ''))
      diffs.push(`التخصص: إكسل="${exRow.specialization}" | قاعدة="${dbRow.specialization}"`);
    if (normalize(exRow.grad_year) !== normalize(dbRow.grad_year || ''))
      diffs.push(`سنة التخرج: إكسل="${exRow.grad_year}" | قاعدة="${dbRow.grad_year}"`);
    if (normalize(exRow.birth_date) !== normalize(dbRow.birth_date || ''))
      diffs.push(`تاريخ الميلاد: إكسل="${exRow.birth_date}" | قاعدة="${dbRow.birth_date}"`);

    if (diffs.length > 0) mismatches.push({ type: 'تضارب بيانات', name: exRow.name, degree: exRow.degree, diffs });
  });

  console.log(`✅ سجلات متطابقة (بدون فروقات): ${matched - mismatches.filter(m=>m.type==='تضارب بيانات').length}`);
  console.log(`⚠️  سجلات بها فروقات: ${mismatches.filter(m=>m.type==='تضارب بيانات').length}`);
  console.log(`❌ سجلات غير موجودة في قاعدة البيانات: ${mismatches.filter(m=>m.type==='غير موجود في قاعدة البيانات').length}\n`);

  console.log('══ تفاصيل الفروقات ══\n');
  mismatches.forEach((m, i) => {
    if (m.type === 'غير موجود في قاعدة البيانات') {
      console.log(`[${i+1}] ❌ "${m.name}" (${m.degree}) — غير موجود في قاعدة البيانات`);
    } else {
      console.log(`[${i+1}] ⚠️  "${m.name}" (${m.degree}):`);
      m.diffs.forEach(d => console.log(`       • ${d}`));
    }
  });

  // ────────────────────────────────────────────────────────────────
  // عرض سجلات الدكتوراه كاملة للمقارنة البصرية
  // ────────────────────────────────────────────────────────────────
  console.log('\n══════ جدول مقارنة الدكتوراه: الاستمرارية ══════\n');
  console.log('الرقم | الاسم                          | إكسل       | قاعدة البيانات');
  console.log('------+--------------------------------+------------+----------------');
  excelDoctor.forEach((exRow, i) => {
    const normName = normalize(exRow.name);
    const dbRow = dbData.find(d => normalize(d.name) === normName && d.degree === 'دكتوراه');
    const cv = dbRow ? (dbRow.custom_values || {}) : {};
    const dbCont = cv.continuity || cv['استمرارية'] || dbRow?.continuity || '—';
    const match = normalize(exRow.continuity) === normalize(dbCont) ? '✅' : '❌';
    console.log(`${String(i+1).padStart(5)} | ${exRow.name.substring(0,30).padEnd(30)} | ${exRow.continuity.padEnd(10)} | ${dbCont} ${match}`);
  });

  console.log('\n══════ جدول مقارنة الماجستير: الاستمرارية ══════\n');
  console.log('الرقم | الاسم                          | إكسل       | قاعدة البيانات');
  console.log('------+--------------------------------+------------+----------------');
  excelMaster.forEach((exRow, i) => {
    const normName = normalize(exRow.name);
    const dbRow = dbData.find(d => normalize(d.name) === normName && d.degree === 'ماجستير');
    const cv = dbRow ? (dbRow.custom_values || {}) : {};
    const dbCont = cv.continuity || cv['استمرارية'] || dbRow?.continuity || '—';
    const match = normalize(exRow.continuity) === normalize(dbCont) ? '✅' : '❌';
    console.log(`${String(i+1).padStart(5)} | ${exRow.name.substring(0,30).padEnd(30)} | ${exRow.continuity.padEnd(10)} | ${dbCont} ${match}`);
  });

  console.log('\n══════ كشف raw لأول 5 سجلات من Supabase (لمعرفة بنية custom_values) ══════\n');
  dbData.slice(0, 5).forEach(r => {
    console.log(`id=${r.id} | ${r.name} | custom_values=${JSON.stringify(r.custom_values)}`);
  });
}

main().catch(console.error);
