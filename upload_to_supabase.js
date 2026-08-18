/**
 * سكربت رفع كافة بيانات نظام مفاضلة جامعة صنعاء إلى Supabase تلقائياً
 */
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.argv[2] || process.env.SUPABASE_URL || 'https://wpnujibmxrxxaqriadez.supabase.co';
const supabaseKey = process.argv[3] || process.env.SUPABASE_KEY || 'sb_publishable_PudkaqYYnpEc8JrQfNUyCw_BWSzZElC';

// قراءة البيانات من initial_data.js
const initialDataCode = fs.readFileSync(path.join(__dirname, 'js', 'initial_data.js'), 'utf8');
const initialData = new Function(initialDataCode + '; return { users: DEFAULT_USERS, candidates: PRESEEDED_CANDIDATES, criteria: DEFAULT_CRITERIA, settings: DEFAULT_SETTINGS, committee: DEFAULT_COMMITTEE_MEMBERS };')();

// 1. المتنافسين (84 متنافس)
const candidatesToUpload = initialData.candidates.map(c => ({
    id: parseInt(c.id) || c.id,
    name: c.name,
    degree: c.degree,
    specialization: c.specialization || 'غير محدد',
    hiring_univ: c.hiring_univ || null,
    hiring_service: c.hiring_service || null,
    birth_date: c.birth_date || null,
    grad_year: c.grad_year || null,
    grade: c.grade || 'جيد',
    custom_values: c.customValues || c.custom_values || {}
}));

// 2. أعضاء اللجنة
const committeeMembersToUpload = initialData.committee.map((m, idx) => ({
    id: m.id,
    name: m.name,
    admin_title: m.adminTitle,
    committee_role: m.committeeRole,
    sort_order: idx + 1
}));

// 3. إعدادات النظام والمعايير المعتمدة والمستخدمين
const systemSettingsToUpload = [
    { key: 'global_settings', value: initialData.settings },
    { key: 'global_criteria', value: initialData.criteria },
    { key: 'global_users', value: initialData.users }
];

async function upload() {
    console.log(`🚀 بدء فحص وتصفير ورفع البيانات إلى Supabase (${supabaseUrl})...`);
    
    // 0. أخذ نسخة احتياطية من البيانات الحالية أولاً
    try {
        const backupData = {};
        const resC_get = await fetch(`${supabaseUrl}/rest/v1/candidates?select=*`, { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } });
        if (resC_get.ok) backupData.candidates = await resC_get.json();

        const resS_get = await fetch(`${supabaseUrl}/rest/v1/system_settings?select=*`, { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } });
        if (resS_get.ok) backupData.system_settings = await resS_get.json();

        const resM_get = await fetch(`${supabaseUrl}/rest/v1/committee_members?select=*`, { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } });
        if (resM_get.ok) backupData.committee_members = await resM_get.json();

        const backupDir = path.join(__dirname, 'scratch');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        const backupPath = path.join(backupDir, `supabase_backup_${Date.now()}.json`);
        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
        console.log(`💾 تم حفظ نسخة احتياطية محلية في: ${backupPath}`);
    } catch(e) {
        console.warn('تنبيه أثناء حفظ النسخة الاحتياطية:', e.message);
    }

    // 1. مسح ثم رفع المتنافسين
    try {
        await fetch(`${supabaseUrl}/rest/v1/candidates?id=gt.0`, {
            method: 'DELETE',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        const resC = await fetch(`${supabaseUrl}/rest/v1/candidates`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(candidatesToUpload)
        });
        if (resC.ok) console.log(`✅ تم رفع ${candidatesToUpload.length} متنافس بنجاح!`);
        else console.error('❌ خطأ رفع المتنافسين:', await resC.text());
    } catch(e) { console.error(e); }

    // 2. مسح ثم رفع أعضاء اللجنة
    try {
        await fetch(`${supabaseUrl}/rest/v1/committee_members?id=gt.0`, {
            method: 'DELETE',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        const resM = await fetch(`${supabaseUrl}/rest/v1/committee_members`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(committeeMembersToUpload)
        });
        if (resM.ok) console.log(`✅ تم رفع أعضاء لجنة المفاضلة والتوقيعات بنجاح!`);
        else console.error('❌ خطأ رفع أعضاء اللجنة:', await resM.text());
    } catch(e) { console.error(e); }

    // 3. مسح ثم رفع الإعدادات والمعايير والمستخدمين
    try {
        await fetch(`${supabaseUrl}/rest/v1/system_settings?key=neq.null`, {
            method: 'DELETE',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        const resS = await fetch(`${supabaseUrl}/rest/v1/system_settings`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(systemSettingsToUpload)
        });
        if (resS.ok) console.log(`✅ تم رفع إعدادات المعايير والمستخدمين والإعدادات العامة بنجاح!`);
        else console.error('❌ خطأ رفع الإعدادات:', await resS.text());
    } catch(e) { console.error(e); }
    
    console.log('🎉 تم اكتمال تصفير وإعادة تأسيس قاعدة بيانات Supabase بنجاح تام!');
}

upload();

