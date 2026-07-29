/**
 * سكربت رفع كافة بيانات نظام مفاضلة جامعة صنعاء إلى Supabase تلقائياً
 */
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.argv[2] || process.env.SUPABASE_URL || 'https://wpnujibmxrxxaqriadez.supabase.co';
const supabaseKey = process.argv[3] || process.env.SUPABASE_KEY || 'sb_publishable_PudkaqYYnpEc8JrQfNUyCw_BWSzZElC';

const seedPath = path.join(__dirname, 'scratch_seed.json');
const rawData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

// 1. المتنافسين
const candidatesToUpload = [];
let idCounter = 1;

if (rawData['دكتوراه']) {
    rawData['دكتوراه'].forEach(c => {
        candidatesToUpload.push({
            id: parseInt(c.id) || idCounter++,
            name: c.name,
            degree: 'دكتوراه',
            specialization: c.specialization || 'غير محدد',
            hiring_univ: c.hiring_univ || '',
            hiring_service: c.hiring_service || '',
            birth_date: c.birth_date || '',
            grad_year: c.grad_year || '',
            grade: c.grade || 'جيد',
            custom_values: {}
        });
    });
}

if (rawData['ماجستير']) {
    rawData['ماجستير'].forEach(c => {
        candidatesToUpload.push({
            id: (parseInt(c.id) || 0) + 100 || idCounter++,
            name: c.name,
            degree: 'ماجستير',
            specialization: c.specialization || 'غير محدد',
            hiring_univ: c.hiring_univ || '',
            hiring_service: c.hiring_service || '',
            birth_date: c.birth_date || '',
            grad_year: c.grad_year || '',
            grade: c.grade || 'جيد',
            custom_values: {}
        });
    });
}

// 2. أعضاء اللجنة
const committeeMembersToUpload = [
    { id: 1, name: 'أ.د. ابراهيم المطاع', admin_title: 'نائب رئيس الجامعة للشؤون الأكاديمية', committee_role: 'رئيس اللجنة', sort_order: 1 },
    { id: 2, name: 'د. حمود الأهنومي', admin_title: 'نائب رئيس الجامعة للدراسات العليا', committee_role: 'عضواً', sort_order: 2 },
    { id: 3, name: 'أ. اسكندر المقالح', admin_title: 'أمين عام الجامعة', committee_role: 'عضواً', sort_order: 3 },
    { id: 4, name: 'د. محمد نجاد', admin_title: 'عميد كلية الشريعة والقانون', committee_role: 'عضواً', sort_order: 4 },
    { id: 5, name: 'د. هاني مغلس', admin_title: 'عميد كلية التجارة والاقتصاد', committee_role: 'عضواً', sort_order: 5 }
];

async function upload() {
    console.log(`🚀 بدء رفع الشحن الشامل إلى Supabase...`);
    
    // رفع المتنافسين
    try {
        const resC = await fetch(`${supabaseUrl}/rest/v1/candidates`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(candidatesToUpload)
        });
        if (resC.ok) console.log(`✅ تم رفع ${candidatesToUpload.length} متنافس بنجاح!`);
        else console.error('خطأ رفع المتنافسين:', await resC.text());
    } catch(e) { console.error(e); }

    // رفع أعضاء اللجنة
    try {
        const resM = await fetch(`${supabaseUrl}/rest/v1/committee_members`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(committeeMembersToUpload)
        });
        if (resM.ok) console.log(`✅ تم رفع أعضاء لجنة المفاضلة والتوقيعات بنجاح!`);
        else console.error('خطأ رفع أعضاء اللجنة:', await resM.text());
    } catch(e) { console.error(e); }
}

upload();
