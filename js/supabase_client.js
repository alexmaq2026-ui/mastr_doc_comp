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
            state.candidates = cData.map(c => ({
                id: parseInt(c.id) || c.id,
                name: c.name,
                degree: c.degree,
                specialization: c.specialization || 'غير محدد',
                hiring_univ: c.hiring_univ || '',
                hiring_service: c.hiring_service || '',
                birth_date: c.birth_date || '',
                grad_year: c.grad_year || '',
                grade: c.grade || 'جيد',
                customValues: c.custom_values || c.customValues || {}
            })).sort((a, b) => Number(a.id) - Number(b.id));
        } else if (!state.candidates || state.candidates.length === 0) {
            // فقط إذا كانت الذاكرة المحلية فارغة أيضاً
            if (typeof PRESEEDED_CANDIDATES !== 'undefined' && PRESEEDED_CANDIDATES.length > 0) {
                state.candidates = JSON.parse(JSON.stringify(PRESEEDED_CANDIDATES));
            }
        }

        // 2. استجلاب إعدادات المعايير والمستخدمين
        const { data: sData, error: sErr } = await supabaseClient.from('system_settings').select('*');
        if (!sErr && sData && sData.length > 0) {
            const criteriaSetting = sData.find(s => s.key === 'global_criteria');
            if (criteriaSetting && criteriaSetting.value) {
                const remoteCriteria = criteriaSetting.value;
                const localCriteria = state.criteria || {};

                // الحفاظ على نطاقات التفعيل targetDegree والخصائص المعدلة محلياً
                const coreKeys = ['seniority', 'age', 'specialization', 'grade'];
                coreKeys.forEach(k => {
                    if (localCriteria[k] && localCriteria[k].targetDegree !== undefined) {
                        if (!remoteCriteria[k]) remoteCriteria[k] = {};
                        // إذا كان لدى المستخدم اختيار محلي، نحافظ عليه
                        remoteCriteria[k].targetDegree = localCriteria[k].targetDegree;
                        remoteCriteria[k].enabled = localCriteria[k].enabled;
                        if (localCriteria[k].maxPoints) remoteCriteria[k].maxPoints = localCriteria[k].maxPoints;
                    }
                });

                const localCustom = (localCriteria && localCriteria.customCriteria) ? localCriteria.customCriteria : [];
                const remoteCustom = (remoteCriteria && remoteCriteria.customCriteria) ? remoteCriteria.customCriteria : [];

                const allItems = [...remoteCustom, ...localCustom].filter(c => c && c.id && c.id !== 'c1' && c.id !== 'c2');
                const uniqueMap = {};
                let foundWorkPractice = false;

                allItems.forEach(c => {
                    const isWork = (c.id === 'work_practice' || (c.name && (c.name.includes('الممارسة الفعلية') || c.name.includes('الاستمرارية') || c.name.includes('العمل'))));
                    if (isWork) {
                        if (!foundWorkPractice) {
                            foundWorkPractice = true;
                            const localWp = localCustom.find(lc => lc.id === 'work_practice');
                            const targetDeg = (localWp && localWp.targetDegree) ? localWp.targetDegree : (c.targetDegree || 'all');
                            uniqueMap['work_practice'] = {
                                id: 'work_practice',
                                name: 'الممارسة الفعلية للوظيفة',
                                maxPoints: 5,
                                indicatorType: 'binary',
                                targetDegree: targetDeg,
                                enabled: c.enabled !== false,
                                config: {
                                    options: [
                                        { label: 'مستمر', points: 5 },
                                        { label: 'متاح', points: 3 }
                                    ]
                                }
                            };
                        }
                    } else if (c.id && !uniqueMap[c.id]) {
                        if (c.config) {
                            if (c.indicatorType === 'binary' && c.config.options && c.config.options.length > 0) {
                                c.maxPoints = Math.max(...c.config.options.map(o => parseFloat(o.points) || 0), 0);
                            } else if (c.indicatorType === 'grade' && c.config.grades && c.config.grades.length > 0) {
                                c.maxPoints = Math.max(...c.config.grades.map(g => parseFloat(g.points) || 0), 0);
                            } else if (c.indicatorType === 'bracket' && c.config.brackets && c.config.brackets.length > 0) {
                                c.maxPoints = Math.max(...c.config.brackets.map(b => parseFloat(b.points) || 0), 0);
                            }
                        }
                        uniqueMap[c.id] = c;
                    }
                });

                if (!foundWorkPractice) {
                    uniqueMap['work_practice'] = {
                        id: 'work_practice',
                        name: 'الممارسة الفعلية للوظيفة',
                        maxPoints: 5,
                        indicatorType: 'binary',
                        targetDegree: 'all',
                        enabled: true,
                        config: {
                            options: [
                                { label: 'مستمر', points: 5 },
                                { label: 'متاح', points: 3 }
                            ]
                        }
                    };
                }

                state.criteria = { ...localCriteria, ...remoteCriteria };
                state.criteria.customCriteria = Object.values(uniqueMap);
            }
            const usersSetting = sData.find(s => s.key === 'global_users');
            if (usersSetting && usersSetting.value && Array.isArray(usersSetting.value) && usersSetting.value.length > 0) {
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

// دالة تنقية بيانات المتنافس لإرسال الأعمدة القياسية فقط المطابقة لجدول Supabase مع حفظ المعايير المخصصة
function sanitizeCandidateForSupabase(c) {
    return {
        id: parseInt(c.id) || c.id,
        name: c.name,
        degree: c.degree,
        specialization: c.specialization || 'غير محدد',
        hiring_univ: c.hiring_univ || null,
        hiring_service: c.hiring_service || null,
        grad_year: c.grad_year || null,
        grade: c.grade || null,
        birth_date: c.birth_date || null,
        custom_values: c.customValues || c.custom_values || {}
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
        // 1. تنقية ورفع المتنافسين
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
        const cleanCriteria = JSON.parse(JSON.stringify(criteria || state.criteria || {}));
        const { error } = await supabaseClient.from('system_settings').upsert([
            { key: 'global_criteria', value: cleanCriteria, updated_at: new Date().toISOString() }
        ], { onConflict: 'key' });
        if (error) {
            console.warn('Supabase criteria upsert error:', error);
            return false;
        }
        console.log('✅ تم مزامنة المعايير أونلاين على Supabase بنجاح.');
        return true;
    } catch (e) {
        console.warn('تنبيه: تعذر مزامنة المعايير أونلاين على Supabase:', e);
        return false;
    }
}

// مزامنة المستخدمين والصلاحيات أونلاين على Supabase
async function syncUsersToSupabase(users) {
    if (!supabaseClient && !initSupabase()) return false;
    try {
        await supabaseClient.from('system_settings').upsert([
            { key: 'global_users', value: users }
        ]);
        console.log('✅ تم مزامنة المستخدمين أونلاين على Supabase بنجاح.');
        return true;
    } catch (e) {
        console.warn('تنبيه: تعذر مزامنة المستخدمين أونلاين على Supabase:', e);
        return false;
    }
}

// مزامنة الإعدادات العامة أونلاين على Supabase
async function syncSettingsToSupabase(settings) {
    if (!supabaseClient && !initSupabase()) return false;
    try {
        await supabaseClient.from('system_settings').upsert([
            { key: 'global_settings', value: settings }
        ]);
        console.log('✅ تم مزامنة الإعدادات العامة أونلاين على Supabase بنجاح.');
        return true;
    } catch (e) {
        console.warn('تنبيه: تعذر مزامنة الإعدادات أونلاين على Supabase:', e);
        return false;
    }
}

