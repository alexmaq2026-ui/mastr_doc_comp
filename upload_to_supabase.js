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

// 3. إعدادات النظام والمعايير المعتمدة (دون المساس بحسابات المستخدمين وكلمات مرورهم)
const systemSettingsToUpload = [
    { key: 'global_settings', value: initialData.settings },
    { key: 'global_criteria', value: initialData.criteria }
];

async function upload() {
    console.log(`🚀 بدء رفع الشحن الشامل إلى Supabase (${supabaseUrl})...`);
    
    // 1. رفع المتنافسين
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
        else console.error('❌ خطأ رفع المتنافسين:', await resC.text());
    } catch(e) { console.error(e); }

    // 2. رفع أعضاء اللجنة
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
        else console.error('❌ خطأ رفع أعضاء اللجنة:', await resM.text());
    } catch(e) { console.error(e); }

    // 3. رفع الإعدادات والمعايير والمستخدمين
    try {
        const resS = await fetch(`${supabaseUrl}/rest/v1/system_settings`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(systemSettingsToUpload)
        });
        if (resS.ok) console.log(`✅ تم رفع إعدادات المعايير والمستخدمين والإعدادات العامة بنجاح!`);
        else console.error('❌ خطأ رفع الإعدادات:', await resS.text());
    } catch(e) { console.error(e); }
}

upload();

