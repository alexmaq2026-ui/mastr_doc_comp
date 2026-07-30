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

// مزامنة واستجلاب المتقدمين أونلاين
async function syncCandidatesFromSupabase() {
    if (!supabaseClient && !initSupabase()) return false;
    try {
        const { data, error } = await supabaseClient.from('candidates').select('*');
        if (error) throw error;
        if (data && data.length > 0) {
            const existingIds = new Set(data.map(d => d.id));
            const missingPreseeded = PRESEEDED_CANDIDATES.filter(p => !existingIds.has(p.id));
            state.candidates = [...data, ...missingPreseeded].sort((a, b) => a.id - b.id);
            saveStore();
            if (typeof renderCandidatesTable === 'function') renderCandidatesTable();
            if (typeof renderDashboardStats === 'function') renderDashboardStats();
            if (typeof refreshAllViews === 'function') refreshAllViews();
            return true;
        }
    } catch (err) {
        console.error('خطأ مزامنة Supabase:', err);
    }
    return false;
}

// حفظ متنافس واحد جديد أو معدل على Supabase
async function saveCandidateToSupabase(candidate) {
    if (!supabaseClient && !initSupabase()) return;
    try {
        const { error } = await supabaseClient.from('candidates').upsert([candidate]);
        if (error) console.error('خطأ حفظ المتنافس في Supabase:', error);
    } catch (e) {
        console.error(e);
    }
}

// حذف متنافس من Supabase
async function deleteCandidateFromSupabase(candidateId) {
    if (!supabaseClient && !initSupabase()) return;
    try {
        const { error } = await supabaseClient.from('candidates').delete().eq('id', candidateId);
        if (error) console.error('خطأ حذف المتنافس من Supabase:', error);
    } catch (e) {
        console.error(e);
    }
}

// رفع وشحن جميع البيانات الحالية إلى Supabase بضغطة واحدة
async function uploadAllDataToSupabase() {
    if (!supabaseClient && !initSupabase()) {
        alert('❌ يرجى إدخال وتوصيل رابط (URL) ومفتاح (API Key) الخاص بـ Supabase أولاً.');
        return false;
    }

    try {
        let candidatesSuccess = false;
        let committeeSuccess = false;

        // 1. رفع المتنافسين
        if (state.candidates && state.candidates.length > 0) {
            const { error: cErr } = await supabaseClient.from('candidates').upsert(state.candidates);
            if (cErr) throw cErr;
            candidatesSuccess = true;
        }

        // 2. رفع أعضاء اللجنة
        if (state.committeeMembers && state.committeeMembers.length > 0) {
            const { error: mErr } = await supabaseClient.from('committee_members').upsert(state.committeeMembers);
            if (mErr) console.warn('ملاحظة رفع لجنة المفاضلة:', mErr);
            else committeeSuccess = true;
        }

        // 3. رفع الإعدادات
        if (state.settings) {
            await supabaseClient.from('system_settings').upsert([
                { key: 'global_settings', value: state.settings }
            ]);
        }

        alert(`✅ تم الرفع والمزامنة بنجاح إلى Supabase!\nتم رفع ${state.candidates ? state.candidates.length : 0} متنافس أونلاين.`);
        return true;
    } catch (err) {
        console.error('خطأ أثناء رفع البيانات إلى Supabase:', err);
        alert(`❌ حدث خطأ أثناء الرفع إلى Supabase:\n${err.message || JSON.stringify(err)}\n\nتأكد من أنك قمت بتنفيذ كود الجدول supabase_schema.sql في SQL Editor أولاً.`);
        return false;
    }
}
