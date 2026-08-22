/**
 * سكريبت رفع نهائي نظيف — يحذف الكل أولاً ثم يرفع بيانات الإكسل بدقة كاملة
 */
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wpnujibmxrxxaqriadez.supabase.co';
const SUPABASE_KEY = 'sb_publishable_PudkaqYYnpEc8JrQfNUyCw_BWSzZElC';
const MASTER_FILE  = 'E:\\ملفات المنح\\نعديل ا,عبدلملك\\مرسل_الهمداني\\كشف منح ماجستير نهائي اكسل 55.xlsx';
const DOCTOR_FILE  = 'E:\\ملفات المنح\\نعديل ا,عبدلملك\\مرسل_الهمداني\\كشف منح الدكتوراه النهائي اكسل.xlsx';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── قراءة ملف الإكسل بدقة ──────────────────────────────────────────
// ترتيب الأعمدة الفعلي (0-based index):
// 0=م | 1=الاسم | 2=الدرجة المطلوبة | 3=التخصص | 4=تاريخ التعيين |
// 5=تاريخ الميلاد | 6=العمر المحسوب | 7=سنة التخرج | 8=التقدير الأكاديمي | 9=الاستمرارية
function readExcel(filePath, degree, startId) {
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const candidates = [];
  let counter = startId;

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    rows.forEach((row, idx) => {
      if (idx === 0) return; // تخطي سطر العناوين
      const rawName = String(row[1] || '').trim();
      // تخطي الصفوف الفارغة أو سطر العناوين المكرر
      if (!rawName || rawName === 'الاسم' || rawName === 'اسم الموظف المتنافس' || rawName === '') return;

      // تحويل قيمة التاريخ: قد تكون رقماً (Excel serial) أو نصاً
      const rawHiringDate = row[4];
      let hiring_service = '';
      if (rawHiringDate !== '' && rawHiringDate !== null && rawHiringDate !== undefined) {
        if (typeof rawHiringDate === 'number') {
          // Excel serial date → convert
          const d = XLSX.SSF.parse_date_code(rawHiringDate);
          hiring_service = d ? `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}` : String(rawHiringDate);
        } else {
          hiring_service = String(rawHiringDate).trim();
        }
      }

      candidates.push({
        id:             counter++,                              // معرّف تسلسلي نظيف
        name:           rawName,
        degree:         degree,
        specialization: String(row[3] || '').trim() || 'غير محدد',
        hiring_service: hiring_service || null,                // تاريخ التعيين
        hiring_univ:    '',                                    // فارغ (ليس في الإكسل)
        birth_date:     String(row[5] || '').trim() || null,   // تاريخ الميلاد (مثل 1980م)
        grad_year:      String(row[7] || '').trim() || null,   // سنة التخرج (مثل 2026م)
        grade:          String(row[8] || '').trim() || 'جيد',  // التقدير الأكاديمي
        custom_values:  {
          continuity: String(row[9] || '').trim() || 'مستمر'  // الاستمرارية
        }
      });
    });
  });
  return candidates;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  رفع نهائي نظيف — جامعة صنعاء');
  console.log('═══════════════════════════════════════════════════════');

  // ── الخطوة 1: حذف كل السجلات الحالية ────────────────────────────
  console.log('\n🗑️  حذف جميع السجلات الموجودة في Supabase...');
  const { error: delError } = await supabase
    .from('candidates')
    .delete()
    .gte('id', 0); // حذف كل شيء له id >= 0

  if (delError) {
    console.error('❌ خطأ في الحذف:', delError.message);
    // نحاول بطريقة بديلة
    const { error: delError2 } = await supabase
      .from('candidates')
      .delete()
      .neq('id', -9999);
    if (delError2) {
      console.error('❌ خطأ في الحذف البديل:', delError2.message);
      return;
    }
  }
  console.log('  ✅ تم حذف جميع السجلات القديمة');

  // ── الخطوة 2: قراءة ملفات الإكسل ────────────────────────────────
  console.log('\n📂 قراءة ملفات الإكسل...');
  let masterCandidates = [], doctorCandidates = [];

  try {
    masterCandidates = readExcel(MASTER_FILE, 'ماجستير', 1);
    console.log(`  ✅ ماجستير: ${masterCandidates.length} سجل`);
  } catch(e) { console.error('❌ خطأ الماجستير:', e.message); }

  try {
    const startId = masterCandidates.length + 1;
    doctorCandidates = readExcel(DOCTOR_FILE, 'دكتوراه', startId);
    console.log(`  ✅ دكتوراه: ${doctorCandidates.length} سجل`);
  } catch(e) { console.error('❌ خطأ الدكتوراه:', e.message); }

  const allCandidates = [...masterCandidates, ...doctorCandidates];
  console.log(`\n📊 إجمالي: ${allCandidates.length} سجل`);

  // عرض أول 3 للتحقق
  console.log('\n🔍 عينة من البيانات للتحقق:');
  allCandidates.slice(0,3).forEach(c => {
    console.log(`  id=${c.id} | ${c.name} | ${c.degree} | تعيين=${c.hiring_service} | ميلاد=${c.birth_date} | تخرج=${c.grad_year} | تقدير=${c.grade} | استمرارية=${c.custom_values.continuity}`);
  });

  if (allCandidates.length === 0) {
    console.log('❌ لا يوجد بيانات للرفع');
    return;
  }

  // ── الخطوة 3: الرفع على دفعات ────────────────────────────────────
  console.log('\n🚀 رفع البيانات إلى Supabase...');
  const BATCH = 50;
  let uploaded = 0, errors = 0;

  for (let i = 0; i < allCandidates.length; i += BATCH) {
    const batch = allCandidates.slice(i, i + BATCH);
    const { error } = await supabase.from('candidates').insert(batch);
    if (error) {
      console.error(`  ❌ خطأ الدفعة ${Math.floor(i/BATCH)+1}: ${error.message}`);
      errors++;
    } else {
      uploaded += batch.length;
      console.log(`  ✅ تم رفع ${uploaded}/${allCandidates.length}`);
    }
  }

  // ── التحقق النهائي ────────────────────────────────────────────────
  const { count } = await supabase.from('candidates').select('*', { count: 'exact', head: true });
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`  ✅ اكتمل الرفع! — ${count} سجل في Supabase`);
  console.log(`  📊 ماجستير: ${masterCandidates.length} | دكتوراه: ${doctorCandidates.length} | أخطاء: ${errors}`);
  console.log('═══════════════════════════════════════════════════════');
}

main().catch(console.error);
