/**
 * ═══════════════════════════════════════════════════════════════════════════
 * محرك الصلاحيات الشجري والأدوار المخصصة (Dynamic Hierarchical RBAC Engine)
 * تطوير وتنفيذ: ماقتك للحلول البرمجية (MAQATECH) لصالح جامعة صنعاء © 2026
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─── 1. شجرة الصلاحيات المركزية الشاملة (Hierarchical Tree Schema) ───────────
const PERMISSIONS_TREE_SCHEMA = [
    {
        groupId: "navgroup-data",
        groupName: "البيانات والمفاضلة",
        icon: "📁",
        screens: [
            {
                screenId: "tab-home",
                screenName: "الرئيسية ومؤشرات الجاهزية",
                icon: "🏠",
                permKey: "screen:tab-home",
                actions: [
                    { id: "action:btn-run-nav", name: "تنفيذ وتطبيق المفاضلة الآلية", icon: "⚡" },
                    { id: "action:btn-home-tiebreaker", name: "فتح نافذة تراتبية كسر التعادل", icon: "⚖️" },
                    { id: "action:btn-home-lock", name: "فتح نافذة اعتماد وإغلاق المفاضلة", icon: "🔒" },
                    { id: "action:btn-home-reset", name: "تصفير سجلات التجربة", icon: "🧹" }
                ]
            },
            {
                screenId: "tab-dashboard",
                screenName: "كشف الفائزين الأولي (الملكي)",
                icon: "👑",
                permKey: "screen:tab-dashboard",
                actions: [
                    { id: "action:dash-filter", name: "تصفية الدرجة (ماجستير / دكتوراه)", icon: "🎓" },
                    { id: "action:dash-print-draft", name: "طباعة مسودة كشف الفائزين", icon: "📝" },
                    { id: "action:dash-print-final", name: "طباعة نهائية معتمدة لكشف الفائزين", icon: "🖨️" }
                ]
            },
            {
                screenId: "tab-candidates",
                screenName: "إدارة المتنافسين والكشوفات",
                icon: "👥",
                permKey: "screen:tab-candidates",
                actions: [
                    { id: "action:cand-add", name: "إضافة متنافس جديد (فتح المودال)", icon: "➕" },
                    { id: "action:cand-edit", name: "تعديل بيانات متنافس مسجل", icon: "✏️" },
                    { id: "action:cand-delete", name: "حذف متنافس من السجل", icon: "🗑️" },
                    { id: "action:cand-details-modal", name: "فتح بطاقة تأكيد وإقرار البيانات الفردية", icon: "📋" },
                    { id: "action:cand-import-excel", name: "استيراد كشوفات من ملف Excel", icon: "📥" },
                    { id: "action:cand-export-excel", name: "تصدير سجل المتنافسين Excel", icon: "📊" },
                    { id: "action:cand-print-pdf", name: "طباعة سجل المتنافسين العام PDF", icon: "🖨️" },
                    { id: "action:cand-print-cards-draft", name: "طباعة مسودة البطائق الفردية", icon: "📝" },
                    { id: "action:cand-print-cards-final", name: "طباعة البطائق الفردية النهائية", icon: "🖨️" }
                ]
            },
            {
                screenId: "tab-scoring",
                screenName: "مصفوفة المفاضلة والترتيب",
                icon: "🔢",
                permKey: "screen:tab-scoring",
                actions: [
                    { id: "action:score-print-draft", name: "طباعة مسودة مصفوفة المفاضلة", icon: "📝" },
                    { id: "action:score-print-final", name: "طباعة مصفوفة المفاضلة النهائية المعتمدة", icon: "🖨️" },
                    { id: "action:score-export-excel", name: "تصدير مصفوفة المفاضلة Excel", icon: "📊" },
                    { id: "action:score-add-annotation", name: "إضافة ملاحظة وتدقيق رقابي (للمراجع)", icon: "💬" }
                ]
            },
            {
                screenId: "tab-minutes",
                screenName: "المحضر الرسمي لجلسة المفاضلة",
                icon: "📜",
                permKey: "screen:tab-minutes",
                actions: [
                    { id: "action:min-print-draft", name: "طباعة مسودة المحضر للمراجعة", icon: "📝" },
                    { id: "action:min-print-final", name: "طباعة المحضر الرسمي النهائي المعتمد", icon: "🖨️" },
                    { id: "action:min-lock-session", name: "اعتماد وتأمين المفاضلة نهائياً برمز الأمان", icon: "🔒" },
                    { id: "action:min-reset-history", name: "تصفير سجل الجلسات السابقة", icon: "🧹" }
                ]
            }
        ]
    },
    {
        groupId: "navgroup-reports",
        groupName: "التقارير",
        icon: "📊",
        screens: [
            {
                screenId: "tab-report",
                screenName: "التقرير التفصيلي المعتمد لمجلس الجامعة",
                icon: "📊",
                permKey: "screen:tab-report",
                actions: [
                    { id: "action:rep-export-excel", name: "تصدير التقرير التفصيلي Excel", icon: "📊" },
                    { id: "action:rep-print-draft", name: "طباعة مسودة التقرير التفصيلي", icon: "📝" },
                    { id: "action:rep-print-final", name: "طباعة النسخة النهائية المعتمدة للتقرير", icon: "📜" }
                ]
            },
            {
                screenId: "tab-criterion-report",
                screenName: "التقرير بحسب المعيار (فرز تفاعلي)",
                icon: "🎯",
                permKey: "screen:tab-criterion-report",
                actions: [
                    { id: "action:crit-rep-export-excel", name: "تصدير نتائج التقرير المعياري Excel", icon: "📊" },
                    { id: "action:crit-rep-print-pdf", name: "طباعة التقرير المعياري PDF", icon: "🖨️" }
                ]
            },
            {
                screenId: "tab-analytics",
                screenName: "التقارير التحليلية والرقابية ورادار الفحص",
                icon: "📈",
                permKey: "screen:tab-analytics",
                actions: [
                    { id: "action:ana-subtab-strengths", name: "عرض تبويب: 1. نقاط القوة والضعف", icon: "🎯" },
                    { id: "action:ana-subtab-deficiencies", name: "عرض تبويب: 2. رادار فحص النواقص", icon: "⚠️" },
                    { id: "action:ana-subtab-specs", name: "عرض تبويب: 3. حصر التخصصات المجرد", icon: "📋" },
                    { id: "action:ana-subtab-charts", name: "عرض تبويب: 4. الرسوم البيانية", icon: "📈" },
                    { id: "action:ana-export-excel", name: "تصدير التقارير التحليلية Excel", icon: "📊" },
                    { id: "action:ana-print-pdf", name: "طباعة التقرير التحليلي PDF", icon: "🖨️" }
                ]
            },
            {
                screenId: "tab-criteria-doc",
                screenName: "وثيقة المعايير والأوزان المعتمدة",
                icon: "📋",
                permKey: "screen:tab-criteria-doc",
                actions: [
                    { id: "action:crit-doc-print-pdf", name: "طباعة وثيقة دليل المعايير والأوزان PDF", icon: "🖨️" }
                ]
            }
        ]
    },
    {
        groupId: "navgroup-admin",
        groupName: "الإدارة والتهيئة",
        icon: "⚙️",
        screens: [
            {
                screenId: "tab-criteria",
                screenName: "تهيئة المعايير والأوزان",
                icon: "⚙️",
                permKey: "screen:tab-criteria",
                actions: [
                    { id: "action:crit-edit-modal", name: "تعديل أوزان وشرائح المعايير التنافسية", icon: "✏️" },
                    { id: "action:crit-restore-defaults", name: "استعادة إعدادات الأوزان الافتراضية", icon: "🔄" }
                ]
            },
            {
                screenId: "tab-tiebreaker",
                screenName: "معايير كسر التعادل والمفاضلة الاستثنائية",
                icon: "⚖️",
                permKey: "screen:tab-tiebreaker",
                actions: [
                    { id: "action:tie-edit-rules", name: "تعديل وحفظ قواعد وتراتبية كسر التعادل", icon: "⚖️" }
                ]
            },
            {
                screenId: "tab-admin",
                screenName: "إدارة النظام والصلاحيات والمستخدمين",
                icon: "🛡️",
                permKey: "screen:tab-admin",
                actions: [
                    { id: "action:adm-manage-users", name: "إدارة حسابات المستخدمين (إضافة/تعديل/حذف)", icon: "👥" },
                    { id: "action:adm-manage-roles", name: "إدارة الأدوار ومصفوفة الصلاحيات المخصصة", icon: "🔑" },
                    { id: "action:adm-supabase-config", name: "إعدادات الربط والمزامنة السحابية بـ Supabase", icon: "⚡" },
                    { id: "action:adm-backup-restore", name: "تصدير واستعادة النسخ الاحتياطية", icon: "💾" }
                ]
            },
            {
                screenId: "tab-auditlog",
                screenName: "سجل الرقابة والأمان وتتبع العمليات",
                icon: "🛡️",
                permKey: "screen:tab-auditlog",
                actions: [
                    { id: "action:aud-export-pdf", name: "تصدير تقرير سجل الرقابة PDF", icon: "📄" },
                    { id: "action:aud-export-csv", name: "تصدير سجل الرقابة CSV", icon: "📥" },
                    { id: "action:aud-clear-log", name: "مسح سجل الرقابة والعمليات", icon: "🗑️" }
                ]
            }
        ]
    }
];

// ─── 2. الأدوار الافتراضية الأولية (Default Roles Schema) ─────────────────────
const INITIAL_SYSTEM_ROLES = [
    {
        id: "super_admin",
        name: "المدير الأعلى / رئيس اللجنة",
        description: "كامل الصلاحيات السيادية والإدارية 100% وإدارة المستخدمين والأدوار والأقفال.",
        isSystem: true,
        permissions: { "*": true } // كامل الصلاحيات
    },
    {
        id: "data_entry",
        name: "مُدخل بيانات وسكرتارية",
        description: "إدخال وتعديل بيانات المتنافسين، استيراد وتصدير ملفات Excel، وطباعة بطاقات الإقرار.",
        isSystem: true,
        permissions: {
            "screen:tab-home": true,
            "screen:tab-candidates": true,
            "action:cand-add": true,
            "action:cand-edit": true,
            "action:cand-details-modal": true,
            "action:cand-import-excel": true,
            "action:cand-export-excel": true,
            "action:cand-print-pdf": true,
            "action:cand-print-cards-draft": true,
            "screen:tab-scoring": true,
            "action:score-export-excel": true,
            "screen:tab-report": true,
            "action:rep-export-excel": true,
            "screen:tab-criterion-report": true,
            "action:crit-rep-export-excel": true,
            "screen:tab-criteria-doc": true
        }
    },
    {
        id: "auditor",
        name: "مراجع مطلع وتدقيق رقابي",
        description: "الاطلاع والمعاينة على كافة الكشوفات، إبداء ملاحظات التدقيق، وطباعة المسودات للتدقيق.",
        isSystem: true,
        permissions: {
            "screen:tab-home": true,
            "screen:tab-dashboard": true,
            "action:dash-filter": true,
            "action:dash-print-draft": true,
            "screen:tab-candidates": true,
            "action:cand-details-modal": true,
            "action:cand-export-excel": true,
            "action:cand-print-pdf": true,
            "action:cand-print-cards-draft": true,
            "screen:tab-scoring": true,
            "action:score-print-draft": true,
            "action:score-export-excel": true,
            "action:score-add-annotation": true,
            "screen:tab-report": true,
            "action:rep-export-excel": true,
            "action:rep-print-draft": true,
            "screen:tab-criterion-report": true,
            "action:crit-rep-export-excel": true,
            "action:crit-rep-print-pdf": true,
            "screen:tab-analytics": true,
            "action:ana-subtab-strengths": true,
            "action:ana-subtab-deficiencies": true,
            "action:ana-subtab-specs": true,
            "action:ana-subtab-charts": true,
            "action:ana-export-excel": true,
            "action:ana-print-pdf": true,
            "screen:tab-criteria-doc": true,
            "action:crit-doc-print-pdf": true
        }
    },
    {
        id: "committee_member",
        name: "عضو لجنة المفاضلة (اطلاع ومعاينة)",
        description: "عرض النتائج، المصفوفة، المحضر، والتقارير دون إمكانية التعديل أو الحذف.",
        isSystem: true,
        permissions: {
            "screen:tab-home": true,
            "screen:tab-dashboard": true,
            "action:dash-filter": true,
            "action:dash-print-draft": true,
            "screen:tab-candidates": true,
            "action:cand-details-modal": true,
            "action:cand-print-pdf": true,
            "screen:tab-scoring": true,
            "action:score-print-draft": true,
            "screen:tab-minutes": true,
            "action:min-print-draft": true,
            "screen:tab-report": true,
            "action:rep-print-draft": true,
            "screen:tab-criterion-report": true,
            "screen:tab-analytics": true,
            "action:ana-subtab-strengths": true,
            "action:ana-subtab-deficiencies": true,
            "action:ana-subtab-specs": true,
            "action:ana-subtab-charts": true,
            "screen:tab-criteria-doc": true
        }
    }
];

// ─── 3. دوال الفحص والحماية المركزية (Permission Checking & Guard) ─────────────

/**
 * التحقق مما إذا كان المستخدم يملك صلاحية معينة
 * @param {string} permKey - مفتاح الصلاحية (مثال: 'screen:tab-candidates' أو 'action:cand-delete')
 * @param {object} [user] - كائن المستخدم (افتراضياً المستخدم المسجل حالياً)
 * @returns {boolean}
 */
function hasPermission(permKey, user = null) {
    const targetUser = user || (typeof state !== "undefined" ? state.currentUser : null);
    if (!targetUser) return false;

    // 1. حساب المدير الأعلى Super Admin يملك جميع الصلاحيات دائماً
    if (targetUser.role === "super_admin" || targetUser.role === "admin") {
        return true;
    }

    // 2. التحقق من الاستثناء الفردي للمستخدم (User Override)
    if (targetUser.customOverrides && typeof targetUser.customOverrides[permKey] === "boolean") {
        return targetUser.customOverrides[permKey];
    }

    // 3. البحث في الدور المعين للمستخدم في قائمة الأدوار الديناميكية
    const rolesList = (typeof state !== "undefined" && state.roles) ? state.roles : INITIAL_SYSTEM_ROLES;
    const userRole = rolesList.find(r => r.id === targetUser.role);

    if (userRole && userRole.permissions) {
        if (userRole.permissions["*"] === true) return true;
        return !!userRole.permissions[permKey];
    }

    return false;
}

/**
 * تطبيق الصلاحيات ديناميكياً على عناصر الواجهة (إخفاء / إظهار / قفل)
 */
function applyUIPermissions(user = null) {
    const targetUser = user || (typeof state !== "undefined" ? state.currentUser : null);
    if (!targetUser) return;

    const isSuperAdmin = targetUser.role === "super_admin" || targetUser.role === "admin";

    // ── أ. ضبط أزرار ومجموعات شريط التنقل العلوي ──
    PERMISSIONS_TREE_SCHEMA.forEach(group => {
        let groupHasVisibleScreen = false;

        group.screens.forEach(scr => {
            const allowed = isSuperAdmin || hasPermission(scr.permKey, targetUser);
            const tabBtn = document.querySelector(`[data-tab="${scr.screenId}"]`);
            if (tabBtn) {
                tabBtn.style.display = allowed ? "" : "none";
            }
            if (allowed) groupHasVisibleScreen = true;
        });

        // إخفاء أو إظهار القائمة المنسدلة للمجموعة كاملة
        const groupEl = document.getElementById(group.groupId);
        if (groupEl) {
            groupEl.style.display = groupHasVisibleScreen ? "" : "none";
        }
    });

    // ── ب. ضبط زر الرئيسية tab-home ──
    const homeBtn = document.getElementById("btn-nav-home");
    if (homeBtn) {
        homeBtn.style.display = (isSuperAdmin || hasPermission("screen:tab-home", targetUser)) ? "" : "none";
    }

    // ── ج. ضبط الأزرار الإجرائية والنوافذ التفصيلية ──
    PERMISSIONS_TREE_SCHEMA.forEach(group => {
        group.screens.forEach(scr => {
            scr.actions.forEach(act => {
                const allowed = isSuperAdmin || hasPermission(act.id, targetUser);
                applyActionPermissionToDOM(act.id, allowed);
            });
        });
    });
}

/**
 * تطبيق صلاحية إجراء محدد على عناصر الـ DOM المرتبطة به
 */
function applyActionPermissionToDOM(actionId, isAllowed) {
    const map = {
        // إدارة المتنافسين
        "action:cand-add": ["#btn-add-candidate"],
        "action:cand-import-excel": ["#btn-import-excel"],
        "action:cand-export-excel": ["[onclick*='exportCandidatesToExcel']"],
        "action:cand-print-pdf": ["#btn-print-candidates"],
        "action:cand-print-cards-draft": ["[onclick*='printAllCandidateCardsDraft']"],
        "action:cand-print-cards-final": ["[onclick*='printAllCandidateCardsFinal']"],
        // الرئيسية
        "action:btn-run-nav": ["#btn-run-nav"],
        "action:btn-home-tiebreaker": ["[onclick*='openTieBreakingModal']"],
        "action:btn-home-lock": ["[onclick*='openLockModal']"],
        "action:btn-home-reset": ["[onclick*='resetTestRecords']"],
        // المحضر
        "action:min-lock-session": ["[onclick*='openLockSessionModal']"],
        "action:min-reset-history": ["[onclick*='resetSystemSessionsHistory']"]
    };

    const selectors = map[actionId];
    if (selectors) {
        selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                el.style.display = isAllowed ? "" : "none";
            });
        });
    }
}

// ─── 4. إدارة الأدوار المخصصة (Roles & Permission Matrix Management) ──────────

let editingRoleId = null;

/**
 * عرض جدول الأدوار المخصصة داخل شاشة الإدارة
 */
function renderRolesAdminTable() {
    const tbody = document.getElementById("roles-admin-tbody");
    if (!tbody) return;

    if (typeof state === "undefined" || !state.roles) {
        state.roles = JSON.parse(JSON.stringify(INITIAL_SYSTEM_ROLES));
    }

    let rowsHtml = "";
    state.roles.forEach((role, idx) => {
        // حساب عدد المستخدمين المسند لهم هذا الدور
        const usersCount = (state.users || []).filter(u => u.role === role.id).length;
        const pillClass = role.isSystem ? "role-pill-system" : "role-pill-custom";
        const roleType = role.isSystem ? "دور نظام قياسي" : "دور مخصص";

        // إحصاء عدد الصلاحيات الممنوحة
        let permsCount = 0;
        if (role.permissions["*"]) {
            permsCount = "كاملة (100%)";
        } else {
            permsCount = Object.values(role.permissions).filter(v => v === true).length + " صلاحية";
        }

        rowsHtml += `
            <tr>
                <td>${idx + 1}</td>
                <td>
                    <strong style="color:#f8fafc; font-size:0.92rem;">${role.name}</strong>
                    <div style="font-size:0.75rem; color:#94a3b8; margin-top:2px;">${role.description || ''}</div>
                </td>
                <td><span class="role-badge-pill ${pillClass}">${roleType}</span></td>
                <td><span style="font-weight:700; color:#38bdf8;">${usersCount} مستخدم</span></td>
                <td><span style="font-size:0.82rem; color:#a78bfa; font-weight:700;">${permsCount}</span></td>
                <td>
                    <div style="display:flex; gap:6px;">
                        <button class="btn btn-outline btn-sm" onclick="openRoleModal('${role.id}')" title="تعديل مصفوفة الصلاحيات">
                            ✏️ تعديل الصلاحيات
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="cloneRole('${role.id}')" title="استنساخ هذا الدور وإنشاء دور جديد منه" style="background:rgba(37,99,235,0.2); border:1px solid rgba(37,99,235,0.4); color:#60a5fa;">
                            📋 استنساخ
                        </button>
                        ${role.isSystem ? '' : `
                            <button class="btn btn-danger btn-sm" onclick="deleteRole('${role.id}')" title="حذف الدور">
                                🗑️ حذف
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = rowsHtml;
}

/**
 * فتح نافذة إنشاء / تعديل الدور وشجرة الصلاحيات
 */
function openRoleModal(roleId = null, isClone = false) {
    editingRoleId = isClone ? null : roleId;
    let modal = document.getElementById("modal-custom-role");
    if (!modal) {
        injectCustomRoleModalDOM();
        modal = document.getElementById("modal-custom-role");
    }

    if (typeof openModal === "function") {
        openModal("modal-custom-role");
    } else if (modal) {
        modal.style.display = "flex";
        modal.classList.add("open");
    }

    const titleEl = document.getElementById("role-modal-title");
    const nameInput = document.getElementById("role-name-input");
    const descInput = document.getElementById("role-desc-input");
    const treeContainer = document.getElementById("role-permissions-tree-container");

    let currentRole = null;
    if (roleId && state.roles) {
        currentRole = state.roles.find(r => r.id === roleId);
    }

    if (isClone && currentRole) {
        titleEl.innerText = `📋 استنساخ دور جديد من: (${currentRole.name})`;
        nameInput.value = `${currentRole.name} (نسخة جديدة)`;
        descInput.value = currentRole.description;
        renderPermissionsTreeUI("role-permissions-tree-container", currentRole.permissions);
    } else if (currentRole) {
        titleEl.innerText = `✏️ تعديل مصفوفة صلاحيات: (${currentRole.name})`;
        nameInput.value = currentRole.name;
        descInput.value = currentRole.description;
        renderPermissionsTreeUI("role-permissions-tree-container", currentRole.permissions, currentRole.id === "super_admin");
    } else {
        titleEl.innerText = "➕ إنشاء دور وظيفي جديد وتخصيص الصلاحيات";
        nameInput.value = "";
        descInput.value = "";
        renderPermissionsTreeUI("role-permissions-tree-container", {});
    }
}

/**
 * استنساخ دور
 */
function cloneRole(roleId) {
    openRoleModal(roleId, true);
}

/**
 * حذف دور مخصص
 */
function deleteRole(roleId) {
    const role = (state.roles || []).find(r => r.id === roleId);
    if (!role) return;

    if (role.isSystem) {
        alert("⚠️ لا يمكن حذف أدوار النظام الأساسية القياسية.");
        return;
    }

    // التحقق من وجود مستخدمين مسند لهم هذا الدور
    const assignedUsers = (state.users || []).filter(u => u.role === roleId);
    if (assignedUsers.length > 0) {
        alert(`⚠️ لا يمكن حذف الدور (${role.name}) لأنه مسند حالياً لـ (${assignedUsers.length}) مستخدمين. يرجى نقلهم لدور آخر أولاً.`);
        return;
    }

    if (confirm(`هل أنت متأكد من رغبتك في حذف الدور المخصص (${role.name}) نهائياً؟`)) {
        state.roles = state.roles.filter(r => r.id !== roleId);
        if (typeof saveStore === "function") saveStore();
        renderRolesAdminTable();
        alert(`✅ تم حذف الدور (${role.name}) بنجاح.`);
    }
}

/**
 * حفظ بيانات الدور ومصفوفة الصلاحيات من الشجرة
 */
function saveRoleForm() {
    const name = document.getElementById("role-name-input").value.trim();
    const desc = document.getElementById("role-desc-input").value.trim();

    if (!name) {
        alert("يرجى إدخال اسم الدور الوظيفي.");
        return;
    }

    const permissions = collectPermissionsFromTree("role-permissions-tree-container");

    if (editingRoleId) {
        // تعديل دور موجود
        const roleIndex = state.roles.findIndex(r => r.id === editingRoleId);
        if (roleIndex !== -1) {
            state.roles[roleIndex].name = name;
            state.roles[roleIndex].description = desc;
            if (state.roles[roleIndex].id !== "super_admin") {
                state.roles[roleIndex].permissions = permissions;
            }
            alert(`✅ تم تحديث مصفوفة صلاحيات الدور (${name}) بنجاح!`);
        }
    } else {
        // إضافة دور جديد
        const newRoleId = "role_" + Date.now();
        state.roles.push({
            id: newRoleId,
            name: name,
            description: desc,
            isSystem: false,
            permissions: permissions
        });
        alert(`✅ تم إنشاء الدور الوظيفي الجديد (${name}) بنجاح!`);
    }

    if (typeof saveStore === "function") saveStore();
    closeModal("modal-custom-role");
    renderRolesAdminTable();
    applyUIPermissions();
}

// ─── 5. توليد شجرة الصلاحيات التفاعلية (Tree View Renderer) ──────────────────

/**
 * بناء وعرض شجرة الصلاحيات المتدرجة
 */
function renderPermissionsTreeUI(containerId, activePermissions = {}, isSuperAdmin = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = "";

    PERMISSIONS_TREE_SCHEMA.forEach(group => {
        let screensHtml = "";

        group.screens.forEach(screen => {
            const isScreenChecked = isSuperAdmin || activePermissions["*"] === true || activePermissions[screen.permKey] === true;
            
            let actionsHtml = "";
            screen.actions.forEach(action => {
                const isActionChecked = isSuperAdmin || activePermissions["*"] === true || activePermissions[action.id] === true;
                actionsHtml += `
                    <div class="perm-action-item">
                        <input type="checkbox" class="perm-checkbox action-chk" data-perm="${action.id}" data-parent-screen="${screen.screenId}" id="chk_${action.id}" ${isActionChecked ? 'checked' : ''} ${isSuperAdmin ? 'disabled' : ''}>
                        <label for="chk_${action.id}">
                            <span>${action.icon}</span>
                            <span>${action.name}</span>
                        </label>
                    </div>
                `;
            });

            screensHtml += `
                <div class="perm-tree-screen-card" id="screen-card-${screen.screenId}">
                    <div class="perm-screen-header">
                        <label class="perm-screen-label" for="chk_scr_${screen.screenId}">
                            <input type="checkbox" class="perm-checkbox screen-chk" data-perm="${screen.permKey}" data-screen-id="${screen.screenId}" id="chk_scr_${screen.screenId}" onchange="handleScreenCheckboxChange('${screen.screenId}', this.checked)" ${isScreenChecked ? 'checked' : ''} ${isSuperAdmin ? 'disabled' : ''}>
                            <span>${screen.icon}</span>
                            <span>${screen.screenName}</span>
                        </label>
                        <div style="display:flex; gap:6px;">
                            <button type="button" class="btn-tree-action" onclick="toggleScreenActions('${screen.screenId}', true)" ${isSuperAdmin ? 'disabled' : ''}>تحديد الكل</button>
                            <button type="button" class="btn-tree-action" onclick="toggleScreenActions('${screen.screenId}', false)" ${isSuperAdmin ? 'disabled' : ''}>إلغاء الكل</button>
                        </div>
                    </div>
                    <div class="perm-actions-grid" id="actions-grid-${screen.screenId}">
                        ${actionsHtml}
                    </div>
                </div>
            `;
        });

        html += `
            <div class="perm-tree-group" id="group-box-${group.groupId}">
                <div class="perm-tree-group-header">
                    <div class="perm-tree-group-title">
                        <span>${group.icon}</span>
                        <span>مجموعة: ${group.groupName}</span>
                    </div>
                    <div class="perm-group-actions">
                        <button type="button" class="btn-tree-action" onclick="toggleGroupAllScreens('${group.groupId}', true)" ${isSuperAdmin ? 'disabled' : ''}>تفعيل المجموعة كاملة</button>
                        <button type="button" class="btn-tree-action" onclick="toggleGroupAllScreens('${group.groupId}', false)" ${isSuperAdmin ? 'disabled' : ''}>إلغاء المجموعة</button>
                    </div>
                </div>
                <div class="perm-tree-screens">
                    ${screensHtml}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

/**
 * معالجة التغيير في مربع اختيار الشاشة (تفعيل أو إلغاء الأزرار التابعة لها)
 */
function handleScreenCheckboxChange(screenId, isChecked) {
    const grid = document.getElementById(`actions-grid-${screenId}`);
    if (grid) {
        grid.querySelectorAll(".action-chk").forEach(chk => {
            chk.checked = isChecked;
        });
    }
}

/**
 * تحديد أو إلغاء كل الأزرار داخل شاشة معينة
 */
function toggleScreenActions(screenId, isChecked) {
    const scrChk = document.getElementById(`chk_scr_${screenId}`);
    if (scrChk) scrChk.checked = isChecked;
    handleScreenCheckboxChange(screenId, isChecked);
}

/**
 * تحديد أو إلغاء كل الشاشات والأزرار داخل مجموعة كاملة
 */
function toggleGroupAllScreens(groupId, isChecked) {
    const group = PERMISSIONS_TREE_SCHEMA.find(g => g.groupId === groupId);
    if (!group) return;

    group.screens.forEach(scr => {
        toggleScreenActions(scr.screenId, isChecked);
    });
}

/**
 * استخراج وجمع الصلاحيات المحددة من الشجرة كـ Object
 */
function collectPermissionsFromTree(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return {};

    const perms = {};
    container.querySelectorAll(".perm-checkbox:checked").forEach(chk => {
        const permKey = chk.getAttribute("data-perm");
        if (permKey) perms[permKey] = true;
    });

    return perms;
}

// ─── 6. تحديث قائمة الأدوار في نموذج المستخدمين ───────────────────────────────

/**
 * ملء قائمة الأدوار المنسدلة في نافذة إضافة / تعديل مستخدم
 */
function populateUserRoleSelect(selectedRoleId = "data_entry") {
    const select = document.getElementById("user-role");
    if (!select) return;

    const rolesList = (typeof state !== "undefined" && state.roles) ? state.roles : INITIAL_SYSTEM_ROLES;

    select.innerHTML = rolesList.map(role => `
        <option value="${role.id}" ${role.id === selectedRoleId ? 'selected' : ''}>
            ${role.name} ${role.isSystem ? '(قياسي)' : '(مخصص)'}
        </option>
    `).join("");
}

// ─── 7. بناء نافذة إضافة وتعديل الدور المخصص في الـ DOM ───────────────────────

function injectCustomRoleModalDOM() {
    if (document.getElementById("modal-custom-role")) return;

    const modalDiv = document.createElement("div");
    modalDiv.id = "modal-custom-role";
    modalDiv.className = "modal-backdrop";
    modalDiv.innerHTML = `
        <div class="modal-dialog" style="max-width: 850px;">
            <div class="modal-header">
                <h3 class="modal-title" id="role-modal-title">➕ إنشاء دور وظيفي جديد وتخصيص الصلاحيات</h3>
                <button class="close-btn" onclick="closeModal('modal-custom-role')">&times;</button>
            </div>
            <div style="padding: 16px 0;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
                    <div class="form-group" style="margin-bottom: 0;">
                        <label style="font-weight: 700; color: #f8fafc;">اسم الدور الوظيفي:</label>
                        <input type="text" id="role-name-input" class="form-control" placeholder="مثال: سكرتير لجنة المفاضلة" required>
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label style="font-weight: 700; color: #f8fafc;">الوصف والمهام الوظيفية:</label>
                        <input type="text" id="role-desc-input" class="form-control" placeholder="وصف موجز للمهام والصلاحيات الممنوحة">
                    </div>
                </div>

                <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <label style="font-weight: 800; color: #38bdf8; font-size: 0.92rem; display: flex; align-items: center; gap: 6px;">
                        <span>🌳</span>
                        <span>مصفوفة شجرة الصلاحيات المتدرجة (الشاشات والأزرار والنوافذ التفصيلية):</span>
                    </label>
                </div>

                <!-- شجرة الصلاحيات التفاعلية -->
                <div class="perm-tree-container" id="role-permissions-tree-container">
                    <!-- يُملأ ديناميكياً بواسطة renderPermissionsTreeUI -->
                </div>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08);">
                <button class="btn btn-outline" onclick="closeModal('modal-custom-role')">إلغاء</button>
                <button class="btn btn-primary" onclick="saveRoleForm()" style="background: linear-gradient(135deg, #0d9488, #2563eb); font-weight: 800;">💾 حفظ الدور ومصفوفة الصلاحيات</button>
            </div>
        </div>
    `;
    document.body.appendChild(modalDiv);
}

// ─── 8. التهيئة الأولية لمحرك الصلاحيات ───────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    injectCustomRoleModalDOM();
    if (typeof state !== "undefined") {
        if (!state.roles || state.roles.length === 0) {
            state.roles = JSON.parse(JSON.stringify(INITIAL_SYSTEM_ROLES));
        }
    }
});
