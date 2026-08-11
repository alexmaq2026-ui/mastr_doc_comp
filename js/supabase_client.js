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
            state.candidates = [...cData].sort((a, b) => a.id - b.id);
        } else {
            // قاعدة البيانات فارغة — نُفرّغ القائمة المحلية أيضاً
            state.candidates = [];
        }

        // 2. استجلاب إعدادات المعايير والمستخدمين
        const { data: sData, error: sErr } = await supabaseClient.from('system_settings').select('*');
        if (!sErr && sData && sData.length > 0) {
            const criteriaSetting = sData.find(s => s.key === 'global_criteria');
            if (criteriaSetting && criteriaSetting.value) {
                const remoteCriteria = criteriaSetting.value;
                const localCustom = (state.criteria && state.criteria.customCriteria) ? state.criteria.customCriteria : [];
                const remoteCustom = (remoteCriteria && remoteCriteria.customCriteria) ? remoteCriteria.customCriteria : [];

                const mergedCustomMap = {};
                remoteCustom.forEach(c => { if (c && c.id) mergedCustomMap[c.id] = c; });
                localCustom.forEach(c => { if (c && c.id) mergedCustomMap[c.id] = c; });

                state.criteria = remoteCriteria;
                state.criteria.customCriteria = Object.values(mergedCustomMap);
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

// دالة تنقية بيانات المتنافس لإرسال الأعمدة القياسية فقط المطابقة لجدول Supabase
function sanitizeCandidateForSupabase(c) {
    return {
        id: c.id,
        name: c.name,
        degree: c.degree,
        specialization: c.specialization,
        hiring_univ: c.hiring_univ || null,
        hiring_service: c.hiring_service || null,
        grad_year: c.grad_year || null,
        grade: c.grade || null,
        birth_date: c.birth_date || null
    };
}

// حفظ متنافس واحد جديد أو معدل على Supabase
async function saveCandidateToSupabase(candidate) {
    if (!supabaseClient && !initSupabase()) return;
    try {
        const sanitized = sanitizeCandidateForSupabase(candidate);
        const { error } = await supabaseClient.from('candidates').upsert([sanitized]);
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

// رفع وشحن جميع البيانات الحالية (المتنافسين، المعايير، المستخدمين، أعضاء اللجنة) إلى Supabase بضغطة واحدة
async function uploadAllDataToSupabase() {
    if (!supabaseClient && !initSupabase()) {
        alert('❌ يرجى إدخال وتوصيل رابط (URL) ومفتاح (API Key) الخاص بـ Supabase أولاً.');
        return false;
    }

    try {
        // 1. تنقية ورفع المتنافسين (تجنب الأعمدة الزائدة مثل source_sheet)
        if (state.candidates && state.candidates.length > 0) {
            const sanitizedCandidates = state.candidates.map(sanitizeCandidateForSupabase);
            const { error: cErr } = await supabaseClient.from('candidates').upsert(sanitizedCandidates);
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

        alert(`✅ تم الرفع والمزامنة الشاملة بنجاح إلى Supabase!\n- تم رفع ${state.candidates ? state.candidates.length : 0} متنافس أونلاين.\n- تم رفع كافة إعدادات المعايير والشرائح والأوزان.\n- تم رفع حسابات المستخدمين والصلاحيات.`);
        return true;
    } catch (err) {
        console.error('خطأ أثناء رفع البيانات إلى Supabase:', err);
        alert(`❌ حدث خطأ أثناء الرفع إلى Supabase:\n${err.message || JSON.stringify(err)}\n\nتأكد من أنك قمت بتنفيذ كود الجدول supabase_schema.sql في SQL Editor أولاً.`);
        return false;
    }
}

// مزامنة حصرية وإصدار فوري لمصفوفة المعايير أونلاين على Supabase
async function syncCriteriaToSupabase(criteria) {
    if (!supabaseClient && !initSupabase()) return false;
    try {
        await supabaseClient.from('system_settings').upsert([
            { key: 'global_criteria', value: criteria }
        ]);
        console.log('✅ تم مزامنة المعايير المخصصة أونلاين على Supabase بنجاح.');
        return true;
    } catch (e) {
        console.warn('تنبيه: تعذر مزامنة المعايير أونلاين على Supabase:', e);
        return false;
    }
}
