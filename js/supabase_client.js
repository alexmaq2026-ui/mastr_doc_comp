// عميل مزامنة وإدارة قواعد بيانات Supabase لنظام مفاضلة جامعة صنعاء
let supabaseClient = null;

function initSupabase() {
    const url = (state.settings && state.settings.supabaseUrl) ? state.settings.supabaseUrl.trim() : null;
    const key = (state.settings && state.settings.supabaseKey) ? state.settings.supabaseKey.trim() : null;

    if (url && key && window.supabase) {
        try {
            supabaseClient = window.supabase.createClient(url, key);
            console.log('✅ تم الاتصال بقاعدة بيانات Supabase أونلاين بنجاح!');
            return true;
        } catch (e) {
            console.warn('تنبيه: تعذر إكمال الاتصال بـ Supabase، سيتم استخدام التخزين المحلي:', e);
        }
    }
    return false;
}

// مزامنة واستجلاب المتقدمين والمعايير والمستخدمين أونلاين
async function syncCandidatesFromSupabase() {
    if (!supabaseClient && !initSupabase()) return false;
    try {
        // 1. استجلاب المتنافسين
        const { data: cData, error: cErr } = await supabaseClient.from('candidates').select('*');
        if (cErr) console.warn('خطأ استجلاب المتنافسين من Supabase:', cErr);
        if (cData && cData.length > 0) {
            const existingIds = new Set(cData.map(d => d.id));
            const missingPreseeded = PRESEEDED_CANDIDATES.filter(p => !existingIds.has(p.id));
            state.candidates = [...cData, ...missingPreseeded].sort((a, b) => a.id - b.id);
        }

        // 2. استجلاب إعدادات المعايير والمستخدمين
        const { data: sData, error: sErr } = await supabaseClient.from('system_settings').select('*');
        if (!sErr && sData && sData.length > 0) {
            const criteriaSetting = sData.find(s => s.key === 'global_criteria');
            if (criteriaSetting && criteriaSetting.value) {
                state.criteria = criteriaSetting.value;
            }
            const usersSetting = sData.find(s => s.key === 'global_users');
            if (usersSetting && usersSetting.value && Array.isArray(usersSetting.value)) {
                state.users = usersSetting.value;
            }
            const globalSetting = sData.find(s => s.key === 'global_settings');
            if (globalSetting && globalSetting.value) {
                state.settings = { ...state.settings, ...globalSetting.value };
            }
        }

        saveStore();
        if (typeof refreshAllViews === 'function') refreshAllViews();
        return true;
    } catch (err) {
        console.error('خطأ مزامنة Supabase:', err);
    }
    return false;
}

// رفع وشحن جميع البيانات الحالية (المتنافسين، المعايير، المستخدمين، أعضاء اللجنة) إلى Supabase بضغطة واحدة
async function uploadAllDataToSupabase() {
    if (!supabaseClient && !initSupabase()) {
        alert('❌ يرجى إدخال وتوصيل رابط (URL) ومفتاح (API Key) الخاص بـ Supabase أولاً.');
        return false;
    }

    try {
        // 1. رفع المتنافسين
        if (state.candidates && state.candidates.length > 0) {
            const { error: cErr } = await supabaseClient.from('candidates').upsert(state.candidates);
            if (cErr) throw cErr;
        }

        // 2. رفع أعضاء اللجنة
        if (state.committeeMembers && state.committeeMembers.length > 0) {
            const { error: mErr } = await supabaseClient.from('committee_members').upsert(state.committeeMembers);
            if (mErr) console.warn('ملاحظة رفع لجنة المفاضلة:', mErr);
        }

        // 3. رفع إعدادات النظام المعيارية
        if (state.settings) {
            await supabaseClient.from('system_settings').upsert([
                { key: 'global_settings', value: state.settings }
            ]);
        }

        // 4. رفع مصفوفة المعايير والشرائح والأوزان (state.criteria)
        if (state.criteria) {
            await supabaseClient.from('system_settings').upsert([
                { key: 'global_criteria', value: state.criteria }
            ]);
        }

        // 5. رفع المستخدمين والصلاحيات (state.users)
        if (state.users && state.users.length > 0) {
            await supabaseClient.from('system_settings').upsert([
                { key: 'global_users', value: state.users }
            ]);
        }

        alert(`✅ تم الرفع والمزامنة الشاملة بنجاح إلى Supabase!\n- تم رفع ${state.candidates ? state.candidates.length : 0} متنافس أونلاين.\n- تم رفع كفة إعدادات المعايير والشرائح والأوزان.\n- تم رفع حسابات المستخدمين والصلاحيات.`);
        return true;
    } catch (err) {
        console.error('خطأ أثناء رفع البيانات إلى Supabase:', err);
        alert(`❌ حدث خطأ أثناء الرفع إلى Supabase:\n${err.message || JSON.stringify(err)}\n\nتأكد من أنك قمت بتنفيذ كود الجدول supabase_schema.sql في SQL Editor أولاً.`);
        return false;
    }
}
