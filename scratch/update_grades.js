const fs = require('fs');
const xlsxPath = 'E:/ملفات المنح/نسخة اولية/001/التقديرات.xlsx';
const XLSX = require('../js/xlsx.full.min.js');

const buf = fs.readFileSync(xlsxPath);
const wb = XLSX.read(buf, { type: 'buffer' });
const ws = wb.Sheets['التقديرات'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

function normalizeName(str) {
  if (!str) return '';
  return String(str)
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeGrade(g) {
  if (!g) return 'بدون';
  let s = String(g).trim();
  if (s.includes('ـــــ') || s === '-' || s === '—' || s === 'بدون' || s === 'لا يوجد' || s === '') return 'بدون';
  if (s.includes('ممتاز')) return 'ممتاز';
  if (s.includes('جيد') && (s.includes('جدا') || s.includes('جداً'))) return 'جيد جداً';
  if (s.includes('مقبول') || s.includes('مفبول')) return 'مقبول';
  if (s.includes('جيد')) return 'جيد';
  return s;
}

const excelMap = {};
for (let i = 1; i < data.length; i++) {
  const row = data[i];
  if (!row || row.length < 2) continue;
  let name = row[1];
  let grade = row[2];
  if (!name || name === 'الاسم' || String(name).includes('كشف التقديرات')) continue;
  const nKey = normalizeName(name);
  excelMap[nKey] = {
    excelName: String(name).trim(),
    excelGrade: normalizeGrade(grade),
    rawGrade: grade
  };
}

const initialDataText = fs.readFileSync('js/initial_data.js', 'utf8');

// Parse JSON from PRESEEDED_CANDIDATES
const startIdx = initialDataText.indexOf('const PRESEEDED_CANDIDATES = [');
const endIdx = initialDataText.indexOf('];', startIdx) + 1;
const jsonStr = initialDataText.slice(startIdx + 'const PRESEEDED_CANDIDATES = '.length, endIdx);
const candidates = JSON.parse(jsonStr);

console.log('Total candidates in js/initial_data.js:', candidates.length);

let matchedCount = 0;
let updatedList = [];
let notFoundInExcel = [];

candidates.forEach(c => {
  const cKey = normalizeName(c.name);
  let match = excelMap[cKey];
  if (!match) {
    const foundKey = Object.keys(excelMap).find(k => k === cKey || k.includes(cKey) || cKey.includes(k));
    if (foundKey) match = excelMap[foundKey];
  }

  if (match) {
    matchedCount++;
    const oldGrade = c.grade || 'بدون';
    const newGrade = match.excelGrade;
    if (oldGrade !== newGrade) {
      updatedList.push({
        id: c.id,
        name: c.name,
        degree: c.degree,
        oldGrade,
        newGrade
      });
      c.grade = newGrade;
    }
  } else {
    notFoundInExcel.push({ id: c.id, name: c.name, degree: c.degree, grade: c.grade });
  }
});

console.log('\n--- MATCHING RESULTS ---');
console.log('Matched:', matchedCount, '/', candidates.length);
console.log('Updated Grades Count:', updatedList.length);
console.log('\nUpdated candidates:');
updatedList.forEach(u => console.log(`- [${u.degree}] ${u.name}: ${u.oldGrade} -> ${u.newGrade}`));

console.log('\nCandidates not found in Excel:', notFoundInExcel.length);
notFoundInExcel.forEach(nf => console.log(`- [${nf.degree}] ID ${nf.id}: ${nf.name} (${nf.grade})`));

// Save updated candidates back to js/initial_data.js
const newJsonStr = JSON.stringify(candidates, null, 2);
const newInitialDataText = initialDataText.slice(0, startIdx) + 'const PRESEEDED_CANDIDATES = ' + newJsonStr + ';' + initialDataText.slice(endIdx + 1);

fs.writeFileSync('js/initial_data.js', newInitialDataText, 'utf8');
console.log('\n✅ Successfully updated js/initial_data.js!');
