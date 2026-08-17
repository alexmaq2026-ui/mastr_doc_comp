// دالة توحيد وتطهير النصوص العربية (إزالة الهمزات وتوحيد الألف والياء والمسافات الزائدة)
function normalizeArabicString(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\s+/g, ' ');
}

// حالة التطبيق العامة (Application State)
let state = {
  users: [],
  currentUser: null,
  settings: {},
  criteria: {},
  candidates: []
};

let editingUserId = null;

document.addEventListener('DOMContentLoaded', () => {
  initStore();
  updateAuthVisibility();
  renderUserBadge();
  renderTabsByRole();
  initDropdownNav();
  setupEventListeners();
  refreshAllViews();
  if (typeof syncCandidatesFromSupabase === 'function') {
    syncCandidatesFromSupabase();
  }
});

// تهيئة المخزن المحلي (LocalStorage Engine)
function initStore() {
  const savedState = localStorage.getItem('sanaa_univ_competition_state');
  if (savedState) {
    try {
      state = JSON.parse(savedState);
      if (!state.committeeMembers || state.committeeMembers.length === 0) {
        state.committeeMembers = JSON.parse(JSON.stringify(DEFAULT_COMMITTEE_MEMBERS));
      }
      if (typeof PRESEEDED_CANDIDATES !== 'undefined' && PRESEEDED_CANDIDATES.length > 0) {
        const seedMapByName = {};
        const seedMapById = {};
        PRESEEDED_CANDIDATES.forEach(p => {
          if (p.name) seedMapByName[normalizeArabicString(p.name)] = p;
          if (p.id) seedMapById[p.id] = p;
        });

        if (!state.candidates || !Array.isArray(state.candidates) || state.candidates.length === 0) {
          state.candidates = JSON.parse(JSON.stringify(PRESEEDED_CANDIDATES));
        } else {
          state.candidates.forEach(c => {
            const key = normalizeArabicString(c.name);
            const p = seedMapByName[key] || seedMapById[c.id];
            if (p) {
              c.degree = p.degree;
              c.specialization = p.specialization;
              c.hiring_univ = p.hiring_univ;
              c.hiring_service = p.hiring_service || c.hiring_service || '';
              c.birth_date = p.birth_date;
              c.grad_year = p.grad_year;
              c.grade = p.grade; // تحديث التقدير المعتمد فورياً
              if (p.continuity) c.continuity = p.continuity;
              if (!c.customValues) c.customValues = {};
              if (p.customValues && p.customValues.work_practice !== undefined) {
                c.customValues.work_practice = p.customValues.work_practice;
              }
            }
          });
          PRESEEDED_CANDIDATES.forEach(p => {
            const key = normalizeArabicString(p.name);
            const exists = state.candidates.some(c => normalizeArabicString(c.name) === key || c.id === p.id);
            if (!exists) {
              state.candidates.push(JSON.parse(JSON.stringify(p)));
            }
          });
        }
        saveStore(); // حفظ التحديثات فورياً في الـ LocalStorage
      }
      if (!state.criteria) {
        state.criteria = JSON.parse(JSON.stringify(DEFAULT_CRITERIA));
      } else {
        if (state.criteria.customCriteria) {
          state.criteria.customCriteria = state.criteria.customCriteria.filter(c => c && c.id !== 'c1' && c.id !== 'c2');
          
          // دمج وتوحيد معايير الممارسة الفعلية ومنع أي تكرار
          const uniqueMap = {};
          let foundWorkPractice = false;

          state.criteria.customCriteria.forEach(c => {
            const isWorkPractice = (c.id === 'work_practice' || (c.name && (c.name.includes('الممارسة الفعلية') || c.name.includes('الاستمرارية') || c.name.includes('العمل'))));
            if (isWorkPractice) {
              if (!foundWorkPractice) {
                foundWorkPractice = true;
                uniqueMap['work_practice'] = {
                  id: 'work_practice',
                  name: 'الممارسة الفعلية للوظيفة',
                  maxPoints: 5,
                  indicatorType: 'binary',
                  targetDegree: c.targetDegree || 'all',
                  enabled: c.enabled !== false,
                  config: {
                    options: [
                      { label: 'مستمر', points: 5 },
                      { label: 'متاح', points: 3 }
                    ]
                  }
                };
              }
            } else if (c.id) {
              if (!uniqueMap[c.id]) {
                if (!c.targetDegree) c.targetDegree = c.enabled === false ? 'none' : 'all';
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

          state.criteria.customCriteria = Object.values(uniqueMap);
        } else {
          state.criteria.customCriteria = (typeof DEFAULT_CRITERIA !== 'undefined' && DEFAULT_CRITERIA.customCriteria) ? JSON.parse(JSON.stringify(DEFAULT_CRITERIA.customCriteria)) : [];
        }

        // تنظيف ودمج قيم المتنافسين المرتبطة بمعيار الممارسة الفعلية
        if (state.candidates && Array.isArray(state.candidates)) {
          state.candidates.forEach(cand => {
            if (cand.customValues) {
              Object.keys(cand.customValues).forEach(k => {
                if (k !== 'work_practice' && (k.startsWith('c_') || k === 'c1' || k === 'c2')) {
                  if (cand.customValues['work_practice'] === undefined) {
                    cand.customValues['work_practice'] = cand.customValues[k];
                  }
                  delete cand.customValues[k];
                }
              });
            }
          });

          // إزالة أي سجلات مكررة لنفس المتنافس
          const uniqueMap = {};
          const cleanList = [];
          state.candidates.forEach(c => {
            const k = normalizeArabicString(c.name);
            if (k && !uniqueMap[k]) {
              uniqueMap[k] = true;
              cleanList.push(c);
            }
          });
          state.candidates = cleanList;
        }

        if (state.criteria.seniority && state.criteria.seniority.maxPoints === 30) state.criteria.seniority.maxPoints = 10;
        if (state.criteria.age && state.criteria.age.maxPoints === 25) state.criteria.age.maxPoints = 5;
        if (state.criteria.specialization && state.criteria.specialization.maxPoints === 25) state.criteria.specialization.maxPoints = 5;
        if (state.criteria.grade && state.criteria.grade.items) {
          state.criteria.grade.items.forEach(i => {
            if (i.name === 'جيد جداً' && i.points === 4) i.points = 5;
            if (i.name === 'جيد' && i.points === 3) i.points = 5;
            if (i.name === 'مقبول' && i.points === 2) i.points = 4;
          });
        }
      }
      if (state.criteria && state.criteria.seniority && state.criteria.seniority.brackets) {
        state.criteria.seniority.brackets.forEach(b => {
          if (b.minYear === 1900) b.minYear = 1990;
          if (b.maxYear === 2050) b.maxYear = 2030;
        });
      }
      if (!state.users || !Array.isArray(state.users) || state.users.length === 0) {
        state.users = JSON.parse(JSON.stringify(DEFAULT_USERS));
      }
      if (!state.settings) {
        state.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      } else {
        if (state.settings.rectorName === 'أ.د. القاسم محمد عباس' || !state.settings.rectorName) {
          state.settings.rectorName = 'أ.د. محمد أحمد البخيتي';
        }
        if (!state.settings.competitionLocation || state.settings.sessionLocation === 'مبنى رئاسة الجامعة - مكتب نائب رئيس الجامعة للشؤون الأكاديمية') {
          state.settings.competitionLocation = 'مقر الأمانة العامة / قاعة اجتماعات مجلس الجامعة الرئيسي - جامعة صنعاء';
        }
        if (!state.settings.competitionDate || state.settings.competitionDate === 'الخميس، 30 يوليو 2026م (الساعة 10:00 صباحاً)' || state.settings.sessionDate === 'الخميس، 30 يوليو 2026م (الساعة 10:00 صباحاً)') {
          state.settings.competitionDate = 'شهر اغسطس 2026';
        }
        state.settings.sessionLocation = state.settings.competitionLocation;
        state.settings.sessionDate = state.settings.competitionDate;
      }
    } catch (e) {
      console.error('Error loading saved state:', e);
      loadDefaults();
    }
  } else {
    loadDefaults();
  }
}

function loadDefaults() {
  state.users = JSON.parse(JSON.stringify(DEFAULT_USERS));
  state.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  state.criteria = JSON.parse(JSON.stringify(DEFAULT_CRITERIA));
  state.candidates = (typeof PRESEEDED_CANDIDATES !== 'undefined' && PRESEEDED_CANDIDATES.length > 0)
    ? JSON.parse(JSON.stringify(PRESEEDED_CANDIDATES))
    : [];
  state.committeeMembers = JSON.parse(JSON.stringify(DEFAULT_COMMITTEE_MEMBERS));
  state.currentUser = null; // البدء بشاشة تسجيل الدخول
  saveStore();
}

function saveStore() {
  localStorage.setItem('sanaa_univ_competition_state', JSON.stringify(state));
}

// نظام رؤية وإظهار شاشة تسجيل الدخول MAQATECH
function updateAuthVisibility() {
    const loginScreen = document.getElementById('login-screen');
    const headerNavbar = document.querySelector('header.navbar');
    const tabsNav = document.querySelector('nav.tabs-nav');
    const mainContainer = document.querySelector('main.main-container');

    if (!state.currentUser) {
        if (loginScreen) loginScreen.style.display = 'flex';
        if (headerNavbar) headerNavbar.style.display = 'none';
        if (tabsNav) tabsNav.style.display = 'none';
        if (mainContainer) mainContainer.style.display = 'none';
    } else {
        if (loginScreen) loginScreen.style.display = 'none';
        if (headerNavbar) headerNavbar.style.display = 'flex';
        if (tabsNav) tabsNav.style.display = 'flex';
        if (mainContainer) mainContainer.style.display = 'block';
    }
}

function handleLoginSubmit(event) {
    if (event) event.preventDefault();
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const errorMsg = document.getElementById('login-error-msg');

    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';

    if (!state.users || !Array.isArray(state.users) || state.users.length === 0) {
        state.users = (typeof DEFAULT_USERS !== 'undefined') ? JSON.parse(JSON.stringify(DEFAULT_USERS)) : [];
    }

    const foundUser = state.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);

    if (foundUser) {
        state.currentUser = foundUser;
        saveStore();
        if (errorMsg) errorMsg.style.display = 'none';
        updateAuthVisibility();
        renderUserBadge();
        renderTabsByRole();
        refreshAllViews();
    } else {
        if (errorMsg) {
            errorMsg.innerText = 'خطأ: اسم المستخدم أو كلمة المرور غير صحيحة!';
            errorMsg.style.display = 'block';
        }
    }
}

function quickLogin(username, password) {
    const foundUser = (state.users || []).find(u => u.username === username && u.password === password);
    if (foundUser) {
        state.currentUser = foundUser;
        saveStore();
        updateAuthVisibility();
        renderUserBadge();
        renderTabsByRole();
        refreshAllViews();
    }
}

function handleLogout() {
    state.currentUser = null;
    saveStore();
    updateAuthVisibility();
}

// نظام شارات المستخدم والصلاحيات
function renderUserBadge() {
  const userBadgeEl = document.getElementById('user-badge-container');
  if (!userBadgeEl) return;
  
  if (state.currentUser) {
    userBadgeEl.innerHTML = `
      <div class="user-badge-wrapper">
        <div class="user-badge">
          <div class="user-avatar">${state.currentUser.name.charAt(0)}</div>
          <div class="user-info">
            <span class="user-name">${state.currentUser.name}</span>
            <span class="user-role-tag">${state.currentUser.title || getRoleTitle(state.currentUser.role)}</span>
          </div>
        </div>
        <div class="user-actions">
          <button class="btn btn-danger btn-xs" onclick="handleLogout()">تسجيل الخروج</button>
        </div>
      </div>
    `;
  }
}

function getRoleTitle(role) {
  if (role === 'super_admin') return 'المدير الأعلى / رئيس اللجنة';
  if (role === 'data_entry') return 'مُدخل بيانات';
  if (role === 'auditor') return 'مراجع مطلع';
  if (role === 'committee_member') return 'عضو لجنة المفاضلة (اطلاع فقط)';
  return role;
}

// ====================================================
// نظام القوائم المنسدلة المجمّعة (Dropdown Nav Groups)
// ====================================================

function toggleNavGroup(groupId) {
  const group = document.getElementById(groupId);
  if (!group) return;
  const isOpen = group.classList.contains('open');
  // أغلق كل المجموعات الأخرى
  document.querySelectorAll('.nav-group').forEach(g => g.classList.remove('open'));
  // افتح أو أغلق الحالية
  if (!isOpen) group.classList.add('open');
}

// إغلاق القوائم عند الضغط خارجها
document.addEventListener('click', function(e) {
  if (!e.target.closest('.nav-group')) {
    document.querySelectorAll('.nav-group').forEach(g => g.classList.remove('open'));
  }
});

function switchTab(tabId, label) {
  // أخفِ كل المحتوى
  document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
  // أظهر المطلوب
  const target = document.getElementById(tabId);
  if (target) target.classList.add('active');
  // تحديث الـ active على الأزرار
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`[data-tab="${tabId}"]`);
  if (btn) btn.classList.add('active');
  // تحديث زر الرئيسية: مضيء فقط عند tab-home
  const homeBtn = document.getElementById('btn-nav-home');
  if (homeBtn) {
    if (tabId === 'tab-home') homeBtn.classList.add('active');
    else homeBtn.classList.remove('active');
  }
  // تحديث مؤشر الشاشة الحالية
  const breadcrumb = document.getElementById('nav-breadcrumb');
  if (breadcrumb && label) breadcrumb.textContent = label;
  // أغلق كل القوائم المنسدلة
  document.querySelectorAll('.nav-group').forEach(g => g.classList.remove('open'));
}

// ربط أزرار التبويبات بالقوائم المنسدلة
function initDropdownNav() {
  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', function() {
      const tabId = this.getAttribute('data-tab');
      const label = this.textContent.trim();
      switchTab(tabId, label);
    });
  });
}

function renderTabsByRole() {
  const currentRole = state.currentUser ? state.currentUser.role : 'auditor';

  // تعريف التبويبات لكل دور
  const allTabs = ['tab-btn-dashboard','tab-btn-candidates','tab-btn-scoring',
                   'tab-btn-report','tab-btn-minutes','tab-btn-criteria-doc','tab-btn-analytics','tab-btn-criteria','tab-btn-admin'];

  // الخريطة: ما يُظهر لكل دور
  const visibilityMap = {
    super_admin: ['tab-btn-dashboard','tab-btn-candidates','tab-btn-scoring',
                  'tab-btn-report','tab-btn-minutes','tab-btn-criteria-doc','tab-btn-analytics','tab-btn-criteria','tab-btn-admin'],
    data_entry:  ['tab-btn-candidates','tab-btn-analytics'],
    auditor:     ['tab-btn-candidates','tab-btn-analytics'],
    committee_member: ['tab-btn-dashboard','tab-btn-candidates','tab-btn-scoring',
                       'tab-btn-report','tab-btn-criteria-doc','tab-btn-analytics','tab-btn-criteria']
  };

  const allowed = visibilityMap[currentRole] || visibilityMap['auditor'];

  allTabs.forEach(tabId => {
    const el = document.getElementById(tabId);
    if (el) el.style.display = allowed.includes(tabId) ? 'flex' : 'none';
  });

  // إخفاء المجموعات التي لا تحتوي على أي تبويب مسموح به
  const groups = {
    'navgroup-data':    ['tab-btn-dashboard','tab-btn-candidates','tab-btn-scoring','tab-btn-minutes'],
    'navgroup-reports': ['tab-btn-report','tab-btn-analytics','tab-btn-criteria-doc'],
    'navgroup-admin':   ['tab-btn-criteria','tab-btn-admin']
  };
  Object.entries(groups).forEach(([groupId, tabs]) => {
    const groupEl = document.getElementById(groupId);
    if (groupEl) {
      const hasVisible = tabs.some(t => allowed.includes(t));
      groupEl.style.display = hasVisible ? 'block' : 'none';
    }
  });

  // أزرار الإضافة والاستيراد: للمدير الأعلى ومدخل البيانات فقط
  const canEditCandidates = (currentRole === 'super_admin' || currentRole === 'data_entry');
  const addCandidateBtn = document.getElementById('btn-add-candidate');
  const importExcelBtn  = document.getElementById('btn-import-excel');
  if (addCandidateBtn) addCandidateBtn.style.display = canEditCandidates ? 'inline-flex' : 'none';
  if (importExcelBtn)  importExcelBtn.style.display  = canEditCandidates ? 'inline-flex' : 'none';

  // زر تنفيذ المفاضلة: يظهر للمدير الأعلى فقط
  const runNavBtn = document.getElementById('btn-run-nav');
  if (runNavBtn) {
    runNavBtn.style.display = (currentRole === 'super_admin') ? 'inline-flex' : 'none';
  }

  // تفعيل القيود الصارمة لعضو لجنة المفاضلة (اطلاع فقط بدون طباعة أو تعديل)
  if (currentRole === 'committee_member') {
    setTimeout(() => {
      // تعطيل وقفل كافة مدخلات شاشة تهيئة المعايير تماماً
      const criteriaContainer = document.getElementById('tab-criteria');
      if (criteriaContainer) {
        criteriaContainer.querySelectorAll('input, select, textarea').forEach(inp => {
          inp.disabled = true;
        });
      }

      document.querySelectorAll('button').forEach(btn => {
        const onclickAttr = btn.getAttribute('onclick') || '';
        const text = btn.innerText || '';
        if (
          onclickAttr.includes('print') ||
          onclickAttr.includes('export') ||
          onclickAttr.includes('edit') ||
          onclickAttr.includes('delete') ||
          onclickAttr.includes('save') ||
          onclickAttr.includes('autoGenerate') ||
          onclickAttr.includes('saveCriteria') ||
          text.includes('طباعة') ||
          text.includes('تصدير') ||
          text.includes('تعديل') ||
          text.includes('إضافة') ||
          text.includes('تنفيذ') ||
          text.includes('حفظ')
        ) {
          if (
            !onclickAttr.includes('handleLogout') &&
            !onclickAttr.includes('showLoginModal') &&
            !onclickAttr.includes('closeModal') &&
            !onclickAttr.includes('toggle') &&
            !onclickAttr.includes('switch')
          ) {
            btn.style.display = 'none';
          }
        }
      });

      document.querySelectorAll('.col-action').forEach(el => el.style.display = 'none');
    }, 50);
  }
}

// ====================================================
// نظام التعليقات والمراجعة (Annotation System)
// ====================================================

// تهيئة مصفوفة التعليقات في الحالة
function initAnnotations() {
  if (!state.annotations) state.annotations = [];
}

// فتح مودال إضافة تعليق (للمراجع المطلع)
function openAnnotationModal(candidateId) {
  initAnnotations();
  const candidate = state.candidates.find(c => c.id === candidateId);
  if (!candidate) return;
  document.getElementById('annotation-candidate-id').value = candidateId;
  document.getElementById('annotation-candidate-name').textContent = candidate.name;
  document.getElementById('annotation-text').value = '';
  document.getElementById('annotation-field').value = 'name';
  document.getElementById('modal-annotation').style.display = 'flex';
}

function closeAnnotationModal() {
  document.getElementById('modal-annotation').style.display = 'none';
}

// حفظ التعليق
function saveAnnotation() {
  initAnnotations();
  const candidateId = parseInt(document.getElementById('annotation-candidate-id').value);
  const field       = document.getElementById('annotation-field').value;
  const text        = document.getElementById('annotation-text').value.trim();
  const reviewer    = state.currentUser ? state.currentUser.name : 'مراجع';

  if (!text) {
    alert('يرجى كتابة وصف الملاحظة قبل الحفظ.');
    return;
  }

  const annotation = {
    id:          Date.now(),
    candidateId,
    field,
    text,
    reviewer,
    reviewerRole: state.currentUser ? state.currentUser.role : 'auditor',
    createdAt:   new Date().toLocaleString('ar-YE'),
    resolved:    false
  };

  state.annotations.push(annotation);
  saveStore();
  closeAnnotationModal();
  renderCandidatesTable();
  showToast('✅ تم حفظ الملاحظة بنجاح وستظهر لمدخل البيانات', 'success');
}

// تأكيد تصحيح ملاحظة (لمدخل البيانات)
function resolveAnnotation(annotationId) {
  initAnnotations();
  const ann = state.annotations.find(a => a.id === annotationId);
  if (ann) {
    ann.resolved = true;
    ann.resolvedAt = new Date().toLocaleString('ar-YE');
    ann.resolvedBy = state.currentUser ? state.currentUser.name : 'مدخل';
    saveStore();
    renderCandidatesTable();
    showToast('✅ تم تأكيد تصحيح الملاحظة', 'success');
  }
}

// حذف ملاحظة (للمدير الأعلى فقط)
function deleteAnnotation(annotationId) {
  initAnnotations();
  state.annotations = state.annotations.filter(a => a.id !== annotationId);
  saveStore();
  renderCandidatesTable();
  showToast('🗑️ تم حذف الملاحظة', 'info');
}

// toast إشعار مؤقت
function showToast(message, type = 'info') {
  const colors = { success: '#16a34a', info: '#2563eb', error: '#dc2626' };
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed; top:24px; right:24px; z-index:99999;
    background:${colors[type] || colors.info}; color:#fff;
    padding:12px 22px; border-radius:10px; font-size:0.9rem;
    font-family:inherit; font-weight:700; box-shadow:0 4px 16px rgba(0,0,0,0.18);
    animation: slideInRight 0.3s ease; direction:rtl;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}



// ── دوال تحديد ونطاق تفعيل المعايير حسب الدرجة العلميـة (ماجستير / دكتوراه) ──

function getCriterionTargetDegree(criterion) {
  if (!criterion) return 'none';
  if (criterion.targetDegree) return criterion.targetDegree;
  return criterion.enabled === false ? 'none' : 'all';
}

function isCriterionActiveForDegree(criterion, degree) {
  if (!criterion) return false;
  const target = getCriterionTargetDegree(criterion);
  if (target === 'none') return false;
  if (target === 'all') return true;
  const normDegree = (degree || '').trim();
  const isPhd = (normDegree === 'دكتوراه' || normDegree === 'phd');
  if (isPhd) return target === 'phd';
  return target === 'master';
}

function updateCriterionTargetDegree(idOrKey, scope) {
  if (checkSystemLockGuard()) return;
  const isCore = ['seniority', 'age', 'specialization', 'grade'].includes(idOrKey);
  if (isCore) {
    if (state.criteria && state.criteria[idOrKey]) {
      state.criteria[idOrKey].targetDegree = scope;
      state.criteria[idOrKey].enabled = (scope !== 'none');
    }
  } else {
    const custom = (state.criteria.customCriteria || []).find(c => c.id === idOrKey);
    if (custom) {
      custom.targetDegree = scope;
      custom.enabled = (scope !== 'none');
    }
  }
  saveStore();
  if (typeof syncCriteriaToSupabase === 'function') syncCriteriaToSupabase(state.criteria);
  refreshAllViews();
}

function renderScopeBadge(scope) {
  if (scope === 'all') {
    return `<span class="badge-status" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid #10b981;">مُفعّل للكل</span>`;
  } else if (scope === 'master') {
    return `<span class="badge-status" style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid #3b82f6;">ماجستير فقط</span>`;
  } else if (scope === 'phd') {
    return `<span class="badge-status" style="background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid #a855f7;">دكتوراه فقط</span>`;
  } else {
    return `<span class="badge-status badge-reserve">معطّل</span>`;
  }
}

// محرك احتساب النقاط والمفاضلة (Scoring Engine)
function calculateCandidateScore(candidate) {
  let seniorityScore = 0;
  let ageScore = 0;
  let specScore = 0;
  let gradeScore = 0;
  let customScores = {};
  let customTotal = 0;

  const currentYear = state.settings.referenceYear || 2026;
  const candDegree = candidate ? (candidate.degree || 'ماجستير') : 'ماجستير';
  const isPhd = (candDegree.trim() === 'دكتوراه' || candDegree.trim() === 'phd');

  // 1. احتساب الأقدمية (سنوات الخدمة / التعيين)
  if (isCriterionActiveForDegree(state.criteria.seniority, candDegree)) {
    let hiringYear = parseInt(candidate.hiring_univ) || parseInt(candidate.hiring_service);
    if (!hiringYear && candidate.hiring_univ) {
      const m = candidate.hiring_univ.match(/(\d{4})/);
      if (m) hiringYear = parseInt(m[1]);
    }
    if (!hiringYear && candidate.hiring_service) {
      const m = candidate.hiring_service.match(/(\d{4})/);
      if (m) hiringYear = parseInt(m[1]);
    }

    if (hiringYear) {
      const brackets = (isPhd && state.criteria.seniority.phdBrackets && state.criteria.seniority.phdBrackets.length > 0)
        ? state.criteria.seniority.phdBrackets
        : state.criteria.seniority.brackets;
      for (let b of brackets) {
        if (hiringYear >= b.minYear && hiringYear <= b.maxYear) {
          seniorityScore = b.points;
          break;
        }
      }
    }
  }

  // 2. احتساب العمر
  if (isCriterionActiveForDegree(state.criteria.age, candDegree)) {
    let birthYear = parseInt(candidate.birth_date);
    if (!birthYear && candidate.birth_date) {
      const m = candidate.birth_date.match(/(\d{4})/);
      if (m) birthYear = parseInt(m[1]);
    }

    if (birthYear) {
      const age = currentYear - birthYear;
      const brackets = (isPhd && state.criteria.age.phdBrackets && state.criteria.age.phdBrackets.length > 0)
        ? state.criteria.age.phdBrackets
        : state.criteria.age.brackets;
      for (let b of brackets) {
        if (age >= b.minAge && age <= b.maxAge) {
          ageScore = b.points;
          break;
        }
      }
    }
  }

  // 3. احتساب التخصص
  if (isCriterionActiveForDegree(state.criteria.specialization, candDegree)) {
    const specNameNorm = normalizeArabicString(candidate.specialization);
    let found = false;
    const items = (isPhd && state.criteria.specialization.phdItems && state.criteria.specialization.phdItems.length > 0)
      ? state.criteria.specialization.phdItems
      : state.criteria.specialization.items;
    for (let item of items) {
      const itemNorm = normalizeArabicString(item.name);
      if (specNameNorm && itemNorm && (specNameNorm.includes(itemNorm) || itemNorm.includes(specNameNorm))) {
        specScore = item.points;
        found = true;
        break;
      }
    }
    if (!found) {
      const otherItem = items.find(i => i.name === 'أخرى');
      specScore = otherItem ? otherItem.points : 2;
    }
  }

  // 4. احتساب التقدير العلمي
  if (isCriterionActiveForDegree(state.criteria.grade, candDegree)) {
    const gradeName = candidate.grade ? candidate.grade.trim() : '';
    const items = (isPhd && state.criteria.grade.phdItems && state.criteria.grade.phdItems.length > 0)
      ? state.criteria.grade.phdItems
      : state.criteria.grade.items;
    for (let item of items) {
      if (gradeName.includes(item.name)) {
        gradeScore = item.points;
        break;
      }
    }
  }

  // 5. احتساب المعايير المخصصة (يدعم 4 أنواع من المؤشرات)
  if (state.criteria.customCriteria) {
    for (let custom of state.criteria.customCriteria) {
      if (!isCriterionActiveForDegree(custom, candDegree)) {
        customScores[custom.id] = 0;
        continue;
      }
      const rawVal = (candidate.customValues && candidate.customValues[custom.id] !== undefined)
        ? candidate.customValues[custom.id]
        : null;
      let pts = 0;
      const itype = custom.indicatorType || 'binary';

      if (itype === 'binary') {
        pts = parseFloat(rawVal) || 0;
        pts = Math.min(pts, custom.maxPoints || 0);

      } else if (itype === 'grade') {
        pts = parseFloat(rawVal) || 0;
        pts = Math.min(pts, custom.maxPoints || 0);

      } else if (itype === 'bracket') {
        const numVal = parseFloat(rawVal) || 0;
        pts = 0;
        if (custom.config && custom.config.brackets) {
          for (let b of custom.config.brackets) {
            if (numVal >= b.min && numVal <= b.max) {
              pts = b.points;
              break;
            }
          }
        }

      } else if (itype === 'numeric') {
        const numVal = parseFloat(rawVal) || 0;
        const multiplier = (custom.config && custom.config.pointsPerUnit) ? custom.config.pointsPerUnit : 1;
        pts = Math.min(numVal * multiplier, custom.maxPoints || 0);
      }

      customScores[custom.id] = pts;
      customTotal += pts;
    }
  }

  const totalScore = seniorityScore + ageScore + specScore + gradeScore + customTotal;

  return {
    seniorityScore,
    ageScore,
    specScore,
    gradeScore,
    customScores,
    customTotal,
    totalScore
  };
}

// حساب الترتيب وكسر التعادل (Ranking & Tie-Breaking Engine)
function getRankedCandidates(degreeFilter = null) {
  const GRADE_ORDER = { 'ممتاز': 4, 'جيد جداً': 3, 'جيد': 2, 'مقبول': 1, 'بدون': 0 };

  // تصفية وضمان عدم وجود أي سجلات مكررة لنفس المتنافس
  if (state.candidates && state.candidates.length > 0) {
    const uniqueMap = {};
    const cleanList = [];
    state.candidates.forEach(c => {
      const k = normalizeArabicString(c.name);
      if (k && !uniqueMap[k]) {
        uniqueMap[k] = true;
        cleanList.push(c);
      }
    });
    state.candidates = cleanList;
  }

  // احتساب نقاط كسر التعادل للتخصص ديناميكياً (التخصصات المعتمدة ذات الوزن 5 = 3 نقاط، أخرى = 0)
  function getSpecTieBreakScore(c) {
    if (!isCriterionActiveForDegree(state.criteria.specialization, c.degree)) return 0;
    const specName = normalizeArabicString(c.specialization);
    if (!specName) return 0;

    let items = state.criteria.specialization.items || [];
    if (c.degree === 'دكتوراه' && state.criteria.specialization.phdItems && state.criteria.specialization.phdItems.length > 0) {
      items = state.criteria.specialization.phdItems;
    }

    const matchedItem = items.find(item => {
      const iName = normalizeArabicString(item.name);
      return iName && !iName.includes('اخرى') && (iName === specName || specName.includes(iName) || iName.includes(specName));
    });

    if (matchedItem && (parseFloat(matchedItem.points) || 0) >= 5) {
      return 3;
    }
    return 0;
  }

  // استخراج درجة الاستمرارية (الممارسة الفعلية للوظيفة)
  function getContinuityScore(c) {
    if (c.scores && c.scores.customScores && c.scores.customScores['work_practice'] !== undefined) {
      return parseFloat(c.scores.customScores['work_practice']) || 0;
    }
    if (c.customValues && c.customValues['work_practice'] !== undefined) {
      return parseFloat(c.customValues['work_practice']) || 0;
    }
    return (c.continuity === 'مستمر') ? 5 : 3;
  }

  // دوال مساعدة لاستخراج السنوات
  function getHiringYear(c) {
    let y = parseInt(c.hiring_univ) || parseInt(c.hiring_service) || 0;
    if (!y && c.hiring_univ)   { const m = c.hiring_univ.match(/(\d{4})/);   if (m) y = parseInt(m[1]); }
    if (!y && c.hiring_service){ const m = c.hiring_service.match(/(\d{4})/); if (m) y = parseInt(m[1]); }
    return y || 9999;
  }
  function getBirthYear(c) {
    let y = parseInt(c.birth_date) || 0;
    if (!y && c.birth_date) { const m = c.birth_date.match(/(\d{4})/); if (m) y = parseInt(m[1]); }
    return y || 0;
  }

  // كشف المعيار الحاسم المباشر بين متنافسين متعادلين (الفائز بالمقعد الأخير وأول المستبعدين)
  function getDecisiveFactor(a, b) {
    // 1. التخصص الأكاديمي (3 درجات لتخصصات الوزن 5، و0 لأخرى)
    const specA = getSpecTieBreakScore(a), specB = getSpecTieBreakScore(b);
    if (specA !== specB) return 'مدى احتياج التخصص الأكاديمي';

    // 2. أقدمية التعيين الفعلي
    const hirA = getHiringYear(a), hirB = getHiringYear(b);
    if (hirA !== hirB) return 'أقدمية التعيين';

    // 3. الاستمرارية والممارسة الفعلية (مستمر 5 ومتاح 3)
    const contA = getContinuityScore(a), contB = getContinuityScore(b);
    if (contA !== contB) return 'الاستمرارية (الممارسة الفعلية)';

    // 4. التقدير العلمي الأعلى
    const gradeA = GRADE_ORDER[a.grade] || 0, gradeB = GRADE_ORDER[b.grade] || 0;
    if (gradeA !== gradeB) return 'التقدير الأكاديمي';

    // 5. صغر السن
    const birthA = getBirthYear(a), birthB = getBirthYear(b);
    if (birthA !== birthB) return 'صغر السن';

    // 6. تعادل تام
    return 'تعادل تام - يُحال للجنة المفاضلة';
  }

  // دالة معالجة درجة واحدة (ماجستير أو دكتوراه)
  function processDegreeGroup(candidates, limit) {
    if (candidates.length === 0) return candidates;

    // 1. فرز جميع المتنافسين بالتراتبية الصارمة المعتمدة
    candidates.sort((a, b) => {
      if (b.scores.totalScore !== a.scores.totalScore) {
        return b.scores.totalScore - a.scores.totalScore;
      }
      // 1. التخصص
      const specTieA = getSpecTieBreakScore(a), specTieB = getSpecTieBreakScore(b);
      if (specTieB !== specTieA) return specTieB - specTieA;     // 3 درجات للتخصص الأساسي (وزن 5) تتقدم على 0 لأخرى

      // 2. أقدمية التعيين
      const hirA = getHiringYear(a), hirB = getHiringYear(b);
      if (hirA !== hirB) return hirA - hirB;                     // الأقدم تعييناً أولاً

      // 3. الاستمرارية
      const contA = getContinuityScore(a), contB = getContinuityScore(b);
      if (contB !== contA) return contB - contA;                 // الأعلى في الاستمرارية (الممارسة الفعلية) أولاً

      // 4. التقدير العلمي
      const gradeA = GRADE_ORDER[a.grade] || 0, gradeB = GRADE_ORDER[b.grade] || 0;
      if (gradeB !== gradeA) return gradeB - gradeA;             // الأعلى تقديراً أولاً

      // 5. صغر السن
      const birthA = getBirthYear(a), birthB = getBirthYear(b);
      if (birthA !== birthB) return birthB - birthA;             // الأصغر سناً أولاً

      return 0;
    });

    // 2. تصفير ملاحظة الحسم الاستثنائي لجميع المتنافسين أولاً
    candidates.forEach(c => { c.tieBreaker = null; });

    // 3. تحديد المفاضلة الاستثنائية بدقة متناهية عند خط الحد الفاصل للمقعد الأخير فقط
    if (candidates.length > limit) {
      const lastWinner = candidates[limit - 1];
      const firstExcluded = candidates[limit];

      // تحدث المفاضلة الاستثنائية وتمنح الشارة فقط إذا تساوى الفائز بالمقعد الأخير مع أول المستبعدين في المجموع الكلي
      if (lastWinner.scores.totalScore === firstExcluded.scores.totalScore) {
        lastWinner.tieBreaker = getDecisiveFactor(lastWinner, firstExcluded);
        lastWinner.tieBreakerDetails = {
          winner: {
            id: lastWinner.id,
            name: lastWinner.name,
            degree: lastWinner.degree,
            rank: limit,
            totalScore: lastWinner.scores.totalScore,
            specialization: lastWinner.specialization,
            specTieScore: getSpecTieBreakScore(lastWinner),
            hiringYear: getHiringYear(lastWinner),
            continuity: lastWinner.continuity || 'مستمر',
            continuityScore: getContinuityScore(lastWinner),
            grade: lastWinner.grade || 'بدون',
            birthYear: getBirthYear(lastWinner)
          },
          competitor: {
            id: firstExcluded.id,
            name: firstExcluded.name,
            degree: firstExcluded.degree,
            rank: limit + 1,
            totalScore: firstExcluded.scores.totalScore,
            specialization: firstExcluded.specialization,
            specTieScore: getSpecTieBreakScore(firstExcluded),
            hiringYear: getHiringYear(firstExcluded),
            continuity: firstExcluded.continuity || 'مستمر',
            continuityScore: getContinuityScore(firstExcluded),
            grade: firstExcluded.grade || 'بدون',
            birthYear: getBirthYear(firstExcluded)
          },
          seatNumber: limit,
          decisiveCriterion: lastWinner.tieBreaker
        };
      }
    }

    return candidates;
  }

  // تحضير القائمة الكاملة مع الدرجات
  let allCandidates = state.candidates.map(c => ({
    ...c,
    scores: calculateCandidateScore(c),
    tieBreaker: null
  }));

  const masterLimit = state.settings.masterGrantsCount || 3;
  const phdLimit    = state.settings.phdGrantsCount    || 3;

  // معالجة كل درجة على حدة
  const mastersProcessed = processDegreeGroup(
    allCandidates.filter(c => c.degree === 'ماجستير'), masterLimit
  );
  const phdsProcessed = processDegreeGroup(
    allCandidates.filter(c => c.degree === 'دكتوراه'), phdLimit
  );

  // تعيين الترتيب والحالة (إغلاق وإلغاء كلمة احتياط)
  let mRank = 1;
  mastersProcessed.forEach(c => {
    c.rank   = mRank;
    if (c.tieBreaker && c.tieBreaker.includes('يُحال')) {
      c.status = 'معلّق للجنة';
    } else {
      c.status = mRank <= masterLimit ? 'مقبول' : '';
    }
    mRank++;
  });
  let pRank = 1;
  phdsProcessed.forEach(c => {
    c.rank   = pRank;
    if (c.tieBreaker && c.tieBreaker.includes('يُحال')) {
      c.status = 'معلّق للجنة';
    } else {
      c.status = pRank <= phdLimit ? 'مقبول' : '';
    }
    pRank++;
  });

  // إرجاع القائمة بحسب الفلتر
  if (degreeFilter === 'ماجستير') return mastersProcessed;
  if (degreeFilter === 'دكتوراه') return phdsProcessed;
  return [...mastersProcessed, ...phdsProcessed];
}


// تحديث كافة الشاشات والواجهات
function refreshAllViews() {
  renderLockBanner();
  renderDashboard();
  renderCandidatesTable();
  renderScoringTable();
  renderCriteriaSettings();
  renderUsersAdminTable();
  renderDetailedReport();
  renderAnalyticsView();
  renderMinutes();
  renderCriteriaDoc();
  renderTabsByRole();
}

// 1. شاشة لوحة القيادة (Dashboard View)
function renderDashboard() {
  const rankedAll = getRankedCandidates();
  const masters = rankedAll.filter(c => c.degree === 'ماجستير');
  const phds = rankedAll.filter(c => c.degree === 'دكتوراه');

  if (document.getElementById('stat-total-candidates')) document.getElementById('stat-total-candidates').innerText = rankedAll.length;
  if (document.getElementById('stat-masters-count')) document.getElementById('stat-masters-count').innerText = masters.length;
  if (document.getElementById('stat-phd-count')) document.getElementById('stat-phd-count').innerText = phds.length;
  if (document.getElementById('stat-accepted-total')) document.getElementById('stat-accepted-total').innerText = (state.settings.masterGrantsCount || 3) + (state.settings.phdGrantsCount || 3);

  // ── احتساب وتجميع إحصائيات الجاهزية والتوافق ديناميكياً ──
  const targetCandidates = state.candidates || [];
  const totalCandidates = targetCandidates.length;
  const deficientCandidates = targetCandidates.filter(c => {
    const hiring = c.hiring_univ || c.hiring_service;
    const isHiringValid = !isInvalidHiringValue(hiring);
    const isBirthValid = !isInvalidBirthValue(c.birth_date);
    const isGradeValid = !isInvalidGradeValue(c.grade);
    const isGradYearValid = c.grad_year && c.grad_year !== '-' && c.grad_year !== 'ـــــــــــــ' && parseInt(c.grad_year) > 0;
    const isSpecValid = !isInvalidSpecializationValue(c.specialization);
    return !isHiringValid || !isBirthValid || !isGradeValid || !isGradYearValid || !isSpecValid;
  });

  const deficientCount = deficientCandidates.length;
  const completeCount = Math.max(0, totalCandidates - deficientCount);

  const fieldsPerCand = 5;
  const totalFields = totalCandidates * fieldsPerCand;

  let missingFieldsCount = 0;
  targetCandidates.forEach(c => {
    const hiring = c.hiring_univ || c.hiring_service;
    if (typeof isInvalidHiringValue === 'function' && isInvalidHiringValue(hiring)) missingFieldsCount++;
    if (typeof isInvalidBirthValue === 'function' && isInvalidBirthValue(c.birth_date)) missingFieldsCount++;
    if (typeof isInvalidGradeValue === 'function' && isInvalidGradeValue(c.grade)) missingFieldsCount++;
    if (!c.grad_year || c.grad_year === '-' || c.grad_year === 'ـــــــــــــ' || parseInt(c.grad_year) <= 0) missingFieldsCount++;
    if (typeof isInvalidSpecializationValue === 'function' && isInvalidSpecializationValue(c.specialization)) missingFieldsCount++;
  });

  const completeFieldsCount = Math.max(0, totalFields - missingFieldsCount);
  const readinessPercent = totalFields > 0 ? ((completeFieldsCount / totalFields) * 100).toFixed(1) : '100.0';
  const completeCandPercent = totalCandidates > 0 ? ((completeCount / totalCandidates) * 100).toFixed(1) : '100.0';
  const deficientCandPercent = totalCandidates > 0 ? ((deficientCount / totalCandidates) * 100).toFixed(1) : '0.0';

  const summaryEl = document.getElementById('readiness-checked-summary');
  if (summaryEl) summaryEl.innerText = `(إجمالي عناصر المفاضلة المفحوصة ${totalFields} عنصر: ${totalCandidates} متنافس × ${fieldsPerCand} حقول)`;

  const percentEl = document.getElementById('kpi-readiness-percent');
  if (percentEl) percentEl.innerText = `${readinessPercent}%`;

  const readinessSubEl = document.getElementById('kpi-readiness-sub');
  if (readinessSubEl) readinessSubEl.innerHTML = `${readinessPercent === '100.0' ? 'جاهزية متكاملة' : 'جاهزية جزئية'}<br>${readinessPercent}%`;

  const barEl = document.getElementById('kpi-readiness-bar');
  if (barEl) barEl.style.width = `${readinessPercent}%`;

  const completeCountValEl = document.getElementById('kpi-complete-count-val');
  if (completeCountValEl) completeCountValEl.innerText = completeFieldsCount;

  const completeElemEl = document.getElementById('kpi-complete-elements');
  if (completeElemEl) completeElemEl.innerHTML = `${completeFieldsCount} من أصل ${totalFields}<br>(${totalFields > 0 ? ((completeFieldsCount / totalFields) * 100).toFixed(1) : '100.0'}%)`;

  const deficientCountValEl = document.getElementById('kpi-deficient-count-val');
  if (deficientCountValEl) deficientCountValEl.innerText = missingFieldsCount;

  const deficientElemEl = document.getElementById('kpi-deficient-elements');
  if (deficientElemEl) deficientElemEl.innerHTML = `${missingFieldsCount} من أصل ${totalFields}<br>(${totalFields > 0 ? ((missingFieldsCount / totalFields) * 100).toFixed(1) : '0.0'}%)`;

  const completeCandEl = document.getElementById('kpi-complete-candidates-count');
  if (completeCandEl) completeCandEl.innerText = totalCandidates;

  const completeCandSubEl = document.getElementById('kpi-complete-candidates-sub');
  if (completeCandSubEl) completeCandSubEl.innerHTML = `${completeCandPercent}%<br>${deficientCount === 0 ? 'مستوفي بالكامل' : `يحتاج استكمال (${deficientCount})`}`;

  // جدول ملخص المقبولين
  const tbody = document.getElementById('dashboard-top-candidates');
  if (!tbody) return;

  const acceptedMasters = masters.filter(c => c.status === 'مقبول');
  const acceptedPhds = phds.filter(c => c.status === 'مقبول');
  const topList = [...acceptedMasters, ...acceptedPhds];

  if (topList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">لا يوجد مرشحين حتى الآن</td></tr>`;
    return;
  }

  tbody.innerHTML = topList.map(c => `
    <tr>
      <td><strong>${c.rank}</strong></td>
      <td><strong>${c.name}</strong></td>
      <td><span class="badge-degree">${c.degree}</span></td>
      <td>${c.specialization}</td>
      <td>${c.grade}</td>
      <td><span class="total-score-badge">${c.scores.totalScore} نقطة</span></td>
      <td><span class="badge-status badge-accepted"> مرشح مقبول</span></td>
    </tr>
  `).join('');
}

function resetTestRecords() {
  if (checkSystemLockGuard()) return;
  const isSuperAdmin = state.currentUser && state.currentUser.role === 'super_admin';
  if (!isSuperAdmin) {
    alert('تنبيه: إجراء تصفير سجلات التجربة متاح فقط للمدير الأعلى / رئيس اللجنة.');
    return;
  }

  if (confirm('⚠️ تنبيه هام: هل أنت متأكد من رغبتك في تصفير مسح سجلات التجربة وإعادة تهيئة القائمة بالكامل؟')) {
    state.candidates = [];
    state.hasRunDeficient = false;
    saveStore();
    if (typeof syncCandidatesFromSupabase === 'function') {
      // Sync empty array if applicable
    }
    refreshAllViews();
    if (typeof showToast === 'function') {
      showToast('✅ تم تصفير سجلات التجربة بنجاح', 'success');
    } else {
      alert('✅ تم تصفير سجلات التجربة بنجاح');
    }
  }
}

function openLockModal() {
  if (checkSystemLockGuard()) return;
  const modal = document.getElementById('modal-lock-session');
  if (modal) {
    modal.style.display = 'flex';
  } else {
    openModal('modal-lock-session');
  }
}

// ── دالة فتح وإغلاق نافذة تراتبية الحسم وكسر التعادل ──
function openTieBreakingModal() {
  const modal = document.getElementById('modal-tie-breaking-rules');
  if (modal) {
    modal.classList.add('open');
    modal.style.display = 'flex';
  }
}

function closeTieBreakingModal() {
  const modal = document.getElementById('modal-tie-breaking-rules');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
}

// ── البحث عن متنافس الحسم الاستثنائي بالتفاصيل ──
function findTieBreakerCandidate(candidateId) {
  const rankedMaster = getRankedCandidates('ماجستير');
  const rankedPhd = getRankedCandidates('دكتوراه');
  const allRanked = [...rankedMaster, ...rankedPhd];
  return allRanked.find(c => c.id === candidateId && c.tieBreaker && c.tieBreakerDetails);
}

// ── 1. عرض التلميح العائم الفوري (Floating Popover on Hover) ──
function showTieBreakerTooltip(event, candidateId) {
  const c = findTieBreakerCandidate(candidateId);
  if (!c || !c.tieBreakerDetails) return;

  const popover = document.getElementById('tie-breaker-floating-popover');
  if (!popover) return;

  const d = c.tieBreakerDetails;
  popover.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px solid rgba(245,158,11,0.3); padding-bottom: 5px;">
      <strong style="color: #fbbf24; font-size: 0.88rem; display: flex; align-items: center; gap: 6px;">
        <span>⚖️ كسر التعادل على المقعد رقم (${d.seatNumber})</span>
      </strong>
      <span style="background: rgba(245,158,11,0.2); color: #fde68a; font-size: 0.72rem; font-weight: 800; padding: 2px 6px; border-radius: 6px;">
        ${d.winner.degree}
      </span>
    </div>
    
    <div style="background: rgba(15, 23, 42, 0.7); padding: 8px; border-radius: 8px; margin-bottom: 6px; border: 1px solid rgba(255,255,255,0.06);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <span style="color: #34d399; font-weight: 800;">🟢 الفائز بالمقعد:</span>
        <strong style="color: #ffffff;">${d.winner.name}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="color: #f87171; font-weight: 700;">🔴 أول المستبعدين:</span>
        <span style="color: #94a3b8;">${d.competitor.name}</span>
      </div>
    </div>

    <div style="margin-bottom: 6px; font-size: 0.78rem;">
      <div style="color: #fbbf24; font-weight: 800; margin-bottom: 2px;">
        🏆 المعيار الفاصل المعتمد:
      </div>
      <div style="color: #e2e8f0; line-height: 1.4;">
        ${d.decisiveCriterion} (إجمالي النقاط: ${d.winner.totalScore} نقطة)
      </div>
    </div>

    <div style="font-size: 0.7rem; color: #38bdf8; text-align: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 5px; font-weight: 700;">
      💡 انقر بالفأرة لفتح المقارنة الموسعة وطباعة إفادة الحسم (PDF)
    </div>
  `;

  popover.style.display = 'block';
  
  const popWidth = 340;
  let left = event.clientX - popWidth - 15;
  if (left < 10) left = event.clientX + 15;
  let top = event.clientY - 40;
  if (top + 220 > window.innerHeight) top = window.innerHeight - 230;
  if (top < 10) top = 10;

  popover.style.left = left + 'px';
  popover.style.top = top + 'px';
}

function hideTieBreakerTooltip() {
  const popover = document.getElementById('tie-breaker-floating-popover');
  if (popover) popover.style.display = 'none';
}

// ── 2. فتح النافذة المنبثقة التفصيلية (Detailed Modal on Click) ──
let currentTieBreakerModalCandidate = null;

function openTieBreakerDetailsModal(candidateId) {
  hideTieBreakerTooltip();
  const c = findTieBreakerCandidate(candidateId);
  if (!c || !c.tieBreakerDetails) return;

  currentTieBreakerModalCandidate = c;
  const modal = document.getElementById('modal-tie-breaker-details');
  const body = document.getElementById('tie-breaker-modal-body');
  if (!modal || !body) return;

  const d = c.tieBreakerDetails;
  const GRADE_ORDER = { 'ممتاز': 4, 'جيد جداً': 3, 'جيد': 2, 'مقبول': 1, 'بدون': 0 };

  const isWinnerSpecDecisive = d.winner.specTieScore > d.competitor.specTieScore;
  const isWinnerSeniorityDecisive = (d.winner.specTieScore === d.competitor.specTieScore && d.winner.hiringYear < d.competitor.hiringYear);
  const isWinnerContDecisive = (!isWinnerSpecDecisive && !isWinnerSeniorityDecisive && d.winner.continuityScore > d.competitor.continuityScore);
  const isWinnerGradeDecisive = (!isWinnerSpecDecisive && !isWinnerSeniorityDecisive && !isWinnerContDecisive && (GRADE_ORDER[d.winner.grade] || 0) > (GRADE_ORDER[d.competitor.grade] || 0));
  const isWinnerAgeDecisive = (!isWinnerSpecDecisive && !isWinnerSeniorityDecisive && !isWinnerContDecisive && !isWinnerGradeDecisive && d.winner.birthYear > d.competitor.birthYear);

  body.innerHTML = `
    <!-- رأس بطاقة الملخص -->
    <div style="background: linear-gradient(135deg, rgba(245,158,11,0.15), rgba(30,58,138,0.3)); border: 1.5px solid rgba(245,158,11,0.35); border-radius: 12px; padding: 14px 18px; margin-bottom: 18px;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 6px;">
        <span style="color: #fbbf24; font-size: 1.05rem; font-weight: 900;">
          🎯 مفصل الاستحقاق على المقعد رقم (${d.seatNumber}) - ${d.winner.degree}
        </span>
        <span style="background: #10b981; color: #ffffff; font-weight: 900; font-size: 0.8rem; padding: 3px 12px; border-radius: 12px;">
          إجمالي النقاط المتعادلة: ${d.winner.totalScore} نقطة
        </span>
      </div>
      <p style="margin: 0; color: #cbd5e1; font-size: 0.82rem; line-height: 1.5;">
        حدث تعادل في المجموع الكلي على الحد الفاصل للمقعد المتاح الأخير، وجرى تطبيق تراتبية كسر التعادل المعتمدة من مجلس الجامعة للفصل بين الفائز بالمقعد وأول المستبعدين.
      </p>
    </div>

    <!-- كرت المقارنة وجهاً لوجه (Head-to-Head Card) -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px;">
      <!-- طرف الفائز -->
      <div style="background: rgba(16, 185, 129, 0.08); border: 2px solid rgba(16, 185, 129, 0.5); border-radius: 10px; padding: 12px 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <strong style="color: #34d399; font-size: 0.92rem;">🟢 الفائز بالمقعد:</strong>
          <span style="background: rgba(16, 185, 129, 0.2); color: #6ee7b7; font-weight: 900; font-size: 0.72rem; padding: 2px 8px; border-radius: 10px;">
            الرتبة (${d.winner.rank}) - مقبول
          </span>
        </div>
        <div style="color: #ffffff; font-size: 1.05rem; font-weight: 900; margin-bottom: 6px;">
          ${d.winner.name}
        </div>
        <div style="color: #94a3b8; font-size: 0.8rem; line-height: 1.5;">
          التخصص: <strong style="color: #e2e8f0;">${d.winner.specialization}</strong><br>
          سنة التعيين: <strong style="color: #e2e8f0;">${d.winner.hiringYear}م</strong> | الاستمرارية: <strong style="color: #e2e8f0;">${d.winner.continuity}</strong>
        </div>
      </div>

      <!-- طرف المستبعد -->
      <div style="background: rgba(239, 68, 68, 0.08); border: 2px solid rgba(239, 68, 68, 0.4); border-radius: 10px; padding: 12px 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <strong style="color: #f87171; font-size: 0.92rem;">🔴 أول المستبعدين:</strong>
          <span style="background: rgba(239, 68, 68, 0.2); color: #fca5a5; font-weight: 900; font-size: 0.72rem; padding: 2px 8px; border-radius: 10px;">
            الرتبة (${d.competitor.rank}) - مستبعد
          </span>
        </div>
        <div style="color: #ffffff; font-size: 1.05rem; font-weight: 900; margin-bottom: 6px;">
          ${d.competitor.name}
        </div>
        <div style="color: #94a3b8; font-size: 0.8rem; line-height: 1.5;">
          التخصص: <strong style="color: #e2e8f0;">${d.competitor.specialization}</strong><br>
          سنة التعيين: <strong style="color: #e2e8f0;">${d.competitor.hiringYear}م</strong> | الاستمرارية: <strong style="color: #e2e8f0;">${d.competitor.continuity}</strong>
        </div>
      </div>
    </div>

    <!-- جدول تتبع مسار الحسم وتراتبية المعايير -->
    <div style="background: #0f172a; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden; margin-bottom: 18px;">
      <div style="background: rgba(30, 41, 59, 0.8); padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.08); font-weight: 800; color: #fbbf24; font-size: 0.85rem;">
        📋 مسار التدقيق المقارن وفق التراتبية المعتمدة لمجلس الجامعة:
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem;">
        <thead>
          <tr style="background: rgba(15, 23, 42, 0.95); border-bottom: 1px solid rgba(255,255,255,0.1); color: #94a3b8;">
            <th style="padding: 9px 12px; text-align: right;">المعيار التراتبي</th>
            <th style="padding: 9px 12px; text-align: center; color: #34d399;">${d.winner.name}</th>
            <th style="padding: 9px 12px; text-align: center; color: #f87171;">${d.competitor.name}</th>
            <th style="padding: 9px 12px; text-align: center;">النتيجة</th>
          </tr>
        </thead>
        <tbody>
          <!-- 1. التخصص -->
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); ${isWinnerSpecDecisive ? 'background: rgba(16, 185, 129, 0.15);' : ''}">
            <td style="padding: 9px 12px; font-weight: 700; color: #60a5fa;">🥇 1. مدى احتياج التخصص</td>
            <td style="padding: 9px 12px; text-align: center;">${d.winner.specialization} (${d.winner.specTieScore === 3 ? '3 درجات حسم' : '0 درجات'})</td>
            <td style="padding: 9px 12px; text-align: center;">${d.competitor.specialization} (${d.competitor.specTieScore === 3 ? '3 درجات حسم' : '0 درجات'})</td>
            <td style="padding: 9px 12px; text-align: center;">
              ${isWinnerSpecDecisive ? '<span style="color:#34d399; font-weight:900;">🟢 حُسم المقعد هنا (تخصص ذو أولوية)</span>' : '<span style="color:#94a3b8;">⚪ تعادل (انتقال للأقدمية)</span>'}
            </td>
          </tr>

          <!-- 2. الأقدمية -->
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); ${isWinnerSeniorityDecisive ? 'background: rgba(16, 185, 129, 0.15);' : ''}">
            <td style="padding: 9px 12px; font-weight: 700; color: #fbbf24;">🥈 2. أقدمية التعيين</td>
            <td style="padding: 9px 12px; text-align: center; font-weight: 800;">سنة ${d.winner.hiringYear}م</td>
            <td style="padding: 9px 12px; text-align: center;">سنة ${d.competitor.hiringYear}م</td>
            <td style="padding: 9px 12px; text-align: center;">
              ${isWinnerSeniorityDecisive ? '<span style="color:#34d399; font-weight:900;">🟢 حُسم المقعد هنا (أسبق تعييناً)</span>' : (!isWinnerSpecDecisive && d.winner.hiringYear === d.competitor.hiringYear ? '<span style="color:#94a3b8;">⚪ تعادل (انتقال للاستمرارية)</span>' : '<span style="color:#64748b;">—</span>')}
            </td>
          </tr>

          <!-- 3. الاستمرارية -->
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); ${isWinnerContDecisive ? 'background: rgba(16, 185, 129, 0.15);' : ''}">
            <td style="padding: 9px 12px; font-weight: 700; color: #34d399;">🥉 3. الاستمرارية والممارسة</td>
            <td style="padding: 9px 12px; text-align: center;">${d.winner.continuity} (${d.winner.continuityScore} نقاط)</td>
            <td style="padding: 9px 12px; text-align: center;">${d.competitor.continuity} (${d.competitor.continuityScore} نقاط)</td>
            <td style="padding: 9px 12px; text-align: center;">
              ${isWinnerContDecisive ? '<span style="color:#34d399; font-weight:900;">🟢 حُسم المقعد هنا (موظف مستمر)</span>' : (!isWinnerSpecDecisive && !isWinnerSeniorityDecisive && d.winner.continuityScore === d.competitor.continuityScore ? '<span style="color:#94a3b8;">⚪ تعادل (انتقال للتقدير)</span>' : '<span style="color:#64748b;">—</span>')}
            </td>
          </tr>

          <!-- 4. التقدير -->
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); ${isWinnerGradeDecisive ? 'background: rgba(16, 185, 129, 0.15);' : ''}">
            <td style="padding: 9px 12px; font-weight: 700; color: #f472b6;">🏅 4. التقدير العلمي</td>
            <td style="padding: 9px 12px; text-align: center;">${d.winner.grade}</td>
            <td style="padding: 9px 12px; text-align: center;">${d.competitor.grade}</td>
            <td style="padding: 9px 12px; text-align: center;">
              ${isWinnerGradeDecisive ? '<span style="color:#34d399; font-weight:900;">🟢 حُسم المقعد هنا (تقدير أعلى)</span>' : (!isWinnerSpecDecisive && !isWinnerSeniorityDecisive && !isWinnerContDecisive && d.winner.grade === d.competitor.grade ? '<span style="color:#94a3b8;">⚪ تعادل (انتقال لصغر السن)</span>' : '<span style="color:#64748b;">—</span>')}
            </td>
          </tr>

          <!-- 5. صغر السن -->
          <tr style="${isWinnerAgeDecisive ? 'background: rgba(16, 185, 129, 0.15);' : ''}">
            <td style="padding: 9px 12px; font-weight: 700; color: #a78bfa;">🎓 5. صغر السن</td>
            <td style="padding: 9px 12px; text-align: center;">مواليد ${d.winner.birthYear}م</td>
            <td style="padding: 9px 12px; text-align: center;">مواليد ${d.competitor.birthYear}م</td>
            <td style="padding: 9px 12px; text-align: center;">
              ${isWinnerAgeDecisive ? '<span style="color:#34d399; font-weight:900;">🟢 حُسم المقعد هنا (أصغر سناً)</span>' : '<span style="color:#64748b;">—</span>'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- نص الحسم الرسمي المعتمد -->
    <div style="background: rgba(30, 58, 138, 0.25); border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 8px; padding: 12px 16px; color: #e2e8f0; font-size: 0.85rem; line-height: 1.6;">
      <strong style="color: #60a5fa; display: block; margin-bottom: 4px; font-size: 0.9rem;">⚖️ ملخص القرار الإداري والتحكيم الإلكتروني:</strong>
      بناءً على التراتبية الشفافة المعتمدة بمجلس جامعة صنعاء لكسر التعادل، تقرر رسمياً حسم المقعد رقم (${d.seatNumber}) لدرجة (${d.winner.degree}) لصالح المرشح <strong>[${d.winner.name}]</strong> لموجب تفوقه في معيار <strong>(${d.decisiveCriterion})</strong> أمام المرشح المباشر [${d.competitor.name}].
    </div>
  `;

  modal.classList.add('open');
  modal.style.display = 'flex';
}

function closeTieBreakerDetailsModal() {
  const modal = document.getElementById('modal-tie-breaker-details');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
}

// ── 3. طباعة إفادة الحسم الاستثنائي الرسمية (PDF Certificate) ──
function printTieBreakerCertificate() {
  if (!currentTieBreakerModalCandidate || !currentTieBreakerModalCandidate.tieBreakerDetails) {
    alert('لا توجد بيانات مفاضلة استثنائية جاهزة للطباعة');
    return;
  }

  const c = currentTieBreakerModalCandidate;
  const d = c.tieBreakerDetails;
  const printArea = document.getElementById('tie-breaker-print-certificate');
  if (!printArea) return;

  const refYear = state.settings.referenceYear || 2026;
  const univName = state.settings.universityName || 'جامعة صنعاء';
  const councilName = state.settings.councilName || 'مجلس الجامعة - لجنة المفاضلة والتنافس';

  printArea.innerHTML = `
    <div style="font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; direction: rtl; text-align: right; line-height: 1.6; color: #000000; padding: 10px;">
      
      <!-- ترويسة الوثيقة الرسمية -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000000; padding-bottom: 12px; margin-bottom: 20px;">
        <div style="text-align: right;">
          <h3 style="margin: 0; font-size: 1.15rem; font-weight: 900;">الجمهورية اليمنية</h3>
          <h3 style="margin: 2px 0; font-size: 1.1rem; font-weight: 800;">${univName}</h3>
          <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: #333;">${councilName}</h4>
        </div>
        <div style="text-align: center;">
          <div style="width: 70px; height: 70px; border: 2px dashed #666; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 0.8rem; margin: auto;">
            شعار الجامعة
          </div>
          <span style="font-size: 0.75rem; font-weight: 700;">نظام المفاضلة الإلكتروني</span>
        </div>
        <div style="text-align: left; font-size: 0.85rem;">
          <div><strong>التاريخ:</strong> ${new Date().toLocaleDateString('ar-EG')}م</div>
          <div><strong>العام الجامعي:</strong> ${refYear}م</div>
          <div><strong>الدرجة:</strong> ${d.winner.degree}</div>
        </div>
      </div>

      <!-- عنوان الإفادة -->
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 1.35rem; font-weight: 900; text-decoration: underline; letter-spacing: 0.5px;">
          إفادة رسمية بحسم المفاضلة الاستثنائية وكسر التعادل
        </h2>
        <p style="margin: 4px 0 0 0; font-size: 0.9rem; font-weight: 700; color: #444;">
          بشأن التنافس على المقعد رقم (${d.seatNumber}) لدرجة (${d.winner.degree})
        </p>
      </div>

      <!-- تمهيد -->
      <p style="font-size: 0.9rem; line-height: 1.7; margin-bottom: 15px;">
        تفيد لجنة المفاضلة والتنافس الإلكتروني لمنتسبي الكادر الإداري بجامعة صنعاء بأنه عند تطبيق معايير المفاضلة لدرجة (<strong>${d.winner.degree}</strong>)، حدث تعادل في المجموع الكلي برصيد (<strong>${d.winner.totalScore} نقطة</strong>) على الحد الفاصل للمقعد المتاح الأخير (<strong>المقعد رقم ${d.seatNumber}</strong>)، وجرى تطبيق التراتبية القانونية الشفافة المعتمدة لكسر التعادل، وكانت نتيجة الفحص والتدقيق كالتالي:
      </p>

      <!-- جدول المقارنة الرسمي -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.85rem;" border="1">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="padding: 8px; text-align: right; width: 30%;">بيان المقارنة / المعيار</th>
            <th style="padding: 8px; text-align: center; width: 35%; background: #e6fcf5;">الفائز بالمقعد: ${d.winner.name}</th>
            <th style="padding: 8px; text-align: center; width: 35%;">المنافس المباشر: ${d.competitor.name}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 6px 8px; font-weight: 700;">المجموع الكلي المكتسب</td>
            <td style="padding: 6px 8px; text-align: center; font-weight: 800;">${d.winner.totalScore} نقطة</td>
            <td style="padding: 6px 8px; text-align: center;">${d.competitor.totalScore} نقطة</td>
          </tr>
          <tr>
            <td style="padding: 6px 8px; font-weight: 700;">1. التخصص ومدى الاحتياج</td>
            <td style="padding: 6px 8px; text-align: center;">${d.winner.specialization} (${d.winner.specTieScore === 3 ? '3 درجات حسم' : '0 درجات'})</td>
            <td style="padding: 6px 8px; text-align: center;">${d.competitor.specialization} (${d.competitor.specTieScore === 3 ? '3 درجات حسم' : '0 درجات'})</td>
          </tr>
          <tr>
            <td style="padding: 6px 8px; font-weight: 700;">2. تاريخ وأقدمية التعيين</td>
            <td style="padding: 6px 8px; text-align: center; font-weight: 800;">سنة ${d.winner.hiringYear}م</td>
            <td style="padding: 6px 8px; text-align: center;">سنة ${d.competitor.hiringYear}م</td>
          </tr>
          <tr>
            <td style="padding: 6px 8px; font-weight: 700;">3. الاستمرارية / الممارسة</td>
            <td style="padding: 6px 8px; text-align: center;">${d.winner.continuity} (${d.winner.continuityScore} نقاط)</td>
            <td style="padding: 6px 8px; text-align: center;">${d.competitor.continuity} (${d.competitor.continuityScore} نقاط)</td>
          </tr>
          <tr>
            <td style="padding: 6px 8px; font-weight: 700;">4. التقدير العلمي المؤهل</td>
            <td style="padding: 6px 8px; text-align: center;">${d.winner.grade}</td>
            <td style="padding: 6px 8px; text-align: center;">${d.competitor.grade}</td>
          </tr>
          <tr>
            <td style="padding: 6px 8px; font-weight: 700;">5. تاريخ الميلاد (السن)</td>
            <td style="padding: 6px 8px; text-align: center;">${d.winner.birthYear}م</td>
            <td style="padding: 6px 8px; text-align: center;">${d.competitor.birthYear}م</td>
          </tr>
        </tbody>
      </table>

      <!-- قرار الحسم -->
      <div style="background: #f8fafc; border: 1.5px solid #000000; padding: 12px 16px; border-radius: 6px; margin-bottom: 30px; font-size: 0.9rem; line-height: 1.7;">
        <strong>القرار والنتيجة النهائية المعتمدة:</strong><br>
        تأكيد فوز وترشيح الأخ/الأخت (<strong>${d.winner.name}</strong>) لشغل المقعد رقم (<strong>${d.seatNumber}</strong>) لدرجة (<strong>${d.winner.degree}</strong>) استناداً إلى تفوقه وحسم النتيجة بمعيار (<strong>${d.decisiveCriterion}</strong>)، واعتبار المنافس المباشر الأخ/الأخت (<strong>${d.competitor.name}</strong>) في الترتيب التالي.
      </div>

      <!-- التوقيعات والاعتماد الرسمي -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 35px; padding: 0 10px;">
        <div style="text-align: center;">
          <strong style="display: block; margin-bottom: 35px;">مُعد التقرير الإلكتروني</strong>
          <span>......................................</span>
        </div>
        <div style="text-align: center;">
          <strong style="display: block; margin-bottom: 35px;">أمين عام الجامعة</strong>
          <span>أ. اسكندر المقالح</span>
        </div>
        <div style="text-align: center;">
          <strong style="display: block; margin-bottom: 35px;">رئيس لجنة المفاضلة</strong>
          <span>أ.د. ابراهيم المطاع</span>
        </div>
      </div>

    </div>
  `;

  document.body.classList.add('is-tie-breaker-print');
  window.print();
  setTimeout(() => {
    document.body.classList.remove('is-tie-breaker-print');
  }, 1000);
}

// دالة توحيد اسم المعيار للعرض
function getDisplayName(name) {
  if (name && name.includes('الممارسة')) return 'الاستمرارية';
  return name || '';
}

// 2. شاشة المتنافسين (Candidates View)
function renderCandidatesTable() {
  const tbody = document.getElementById('candidates-tbody');
  if (!tbody) return;

  const search = (document.getElementById('search-candidates') ? document.getElementById('search-candidates').value : '').trim().toLowerCase();
  const degreeFilter = document.getElementById('filter-degree') ? document.getElementById('filter-degree').value : '';

  let list = state.candidates;
  if (degreeFilter) list = list.filter(c => c.degree === degreeFilter);
  if (search) list = list.filter(c => c.name.toLowerCase().includes(search) || c.specialization.toLowerCase().includes(search));

  const canEdit    = state.currentUser && (state.currentUser.role === 'super_admin' || state.currentUser.role === 'data_entry');
  const isAuditor  = state.currentUser && state.currentUser.role === 'auditor';
  const isDataEntry= state.currentUser && state.currentUser.role === 'data_entry';
  const isAdmin    = state.currentUser && state.currentUser.role === 'super_admin';

  initAnnotations();

  const activeCustom = (state.criteria.customCriteria || []).filter(c => c.enabled);
  const candTable = document.querySelector('#tab-candidates table.data-table');
  if (candTable) {
    const thead = candTable.querySelector('thead');
    if (thead) {
      thead.innerHTML = `
        <tr>
          <th style="width: 4%;">م</th>
          <th style="width: 22%; text-align: right;">اسم الموظف المتنافس</th>
          <th style="width: 10%;">الدرجة المطلوبة</th>
          <th style="width: 13%;">التخصص</th>
          <th style="width: 12%;">تاريخ التعيين</th>
          <th style="width: 10%;">تاريخ الميلاد</th>
          <th style="width: 9%;">سنة التخرج</th>
          <th style="width: 9%;">التقدير</th>
          ${activeCustom.map(c => `<th style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid #f59e0b;">${getDisplayName(c.name)}</th>`).join('')}
          <th class="col-action no-print" style="width: 11%;">الإجراءات</th>
        </tr>
      `;
    }
  }

  if (list.length === 0) {
    const colCount = 9 + activeCustom.length;
    tbody.innerHTML = `<tr><td colspan="${colCount}" style="text-align: center; color: var(--text-muted); padding: 20px;">لا توجد بيانات مطابقة للبحث</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((c, idx) => {
    // جلب التعليقات الخاصة بهذا المتنافس
    const cAnnotations = state.annotations.filter(a => a.candidateId === c.id);
    const pendingAnns  = cAnnotations.filter(a => !a.resolved);
    const hasWarning   = pendingAnns.length > 0;

    // لون الصف إذا فيه تعليقات معلقة
    const rowBg = hasWarning ? 'background-color:#fff1f2; border-right: 4px solid #ef4444;' : '';

    // شارة التنبيه
    const warningBadge = hasWarning
      ? `<span title="${pendingAnns.length} ملاحظة مراجعة معلقة" style="display:inline-flex;align-items:center;gap:3px;background:#ef4444;color:#fff;padding:2px 7px;border-radius:20px;font-size:0.7rem;font-weight:800;cursor:pointer;" onclick="toggleAnnotationsPanel(${c.id})">🔴 ${pendingAnns.length} ملاحظة</span>`
      : '';

    // 1. زر تعديل (للمدير الأعلى ومدخل البيانات)
    const editBtn = (isAdmin || isDataEntry)
      ? `<button class="btn btn-outline btn-sm" onclick="editCandidate(${c.id})"> تعديل</button>`
      : '';

    // 2. زر حذف (للمدير الأعلى ومدخل البيانات)
    const deleteBtn = (isAdmin || isDataEntry)
      ? `<button class="btn btn-danger btn-sm" onclick="deleteCandidate(${c.id})" style="margin-right:4px;"> 🗑️ حذف</button>`
      : '';

    // 3. زر تضليل (للمراجع المطلع فقط)
    const annotateBtn = isAuditor
      ? `<button class="btn btn-sm" style="background:#dc2626;color:#fff;font-size:0.75rem;" onclick="openAnnotationModal(${c.id})">🔴 تضليل</button>`
      : '';

    // لوحة التعليقات المفصلة (مخفية افتراضياً)
    const annotationsPanel = cAnnotations.length > 0 ? `
      <tr id="ann-panel-${c.id}" style="display:none;">
        <td colspan="10" style="background:#fff8f0; padding:10px 20px; border-top:1px dashed #f59e0b;">
          <div style="font-weight:800; color:#b45309; margin-bottom:8px;">📋 ملاحظات المراجع على هذا السجل:</div>
          ${cAnnotations.map(ann => `
            <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;padding:8px 12px;background:${ann.resolved?'#f0fdf4':'#fff1f2'};border-radius:8px;border-right:3px solid ${ann.resolved?'#16a34a':'#ef4444'};">
              <div style="flex:1;">
                <div style="font-size:0.78rem;font-weight:700;color:${ann.resolved?'#16a34a':'#dc2626'};">
                  ${ann.resolved ? '✅ تم التصحيح' : '🔴 معلقة'} — الحقل: <strong>${ann.field}</strong>
                </div>
                <div style="font-size:0.82rem;color:#0f172a;margin-top:4px;">${ann.text}</div>
                <div style="font-size:0.7rem;color:#64748b;margin-top:4px;">
                  📝 بقلم: ${ann.reviewer} — ${ann.createdAt}
                  ${ann.resolved ? ` | ✅ صُحِّح بواسطة: ${ann.resolvedBy} — ${ann.resolvedAt}` : ''}
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:4px;">
                ${(isDataEntry || isAdmin) && !ann.resolved ? `<button class="btn btn-sm" style="background:#16a34a;color:#fff;font-size:0.7rem;white-space:nowrap;" onclick="resolveAnnotation(${ann.id})">✅ تصحيح</button>` : ''}
                ${isAdmin ? `<button class="btn btn-sm btn-danger" style="font-size:0.7rem;white-space:nowrap;" onclick="deleteAnnotation(${ann.id})">🗑️ حذف</button>` : ''}
              </div>
            </div>
          `).join('')}
        </td>
      </tr>` : '';

    const rawHiring = (c.hiring_univ || c.hiring_service || '-').replace('00:00:00 ', '').replace('00:00:00', '').trim();
    const rawBirth  = (c.birth_date || '-').replace('00:00:00 ', '').replace('00:00:00', '').trim();

    return `
    <tr style="${rowBg}">
      <td>${idx + 1}</td>
      <td><strong>${c.name}</strong> ${warningBadge}</td>
      <td><span class="badge-degree">${c.degree}</span></td>
      <td>${c.specialization}</td>
      <td>${rawHiring || '-'}</td>
      <td>${rawBirth || '-'}</td>
      <td>${c.grad_year || '-'}</td>
      <td>${c.grade || '-'}</td>
      ${activeCustom.map(custom => {
        const computedPts = (c.scores && c.scores.customScores && c.scores.customScores[custom.id] !== undefined)
          ? c.scores.customScores[custom.id]
          : (c.customValues && c.customValues[custom.id] !== undefined ? parseFloat(c.customValues[custom.id]) || 0 : 0);
        const rawVal = c.customValues ? c.customValues[custom.id] : null;
        const itype = custom.indicatorType || 'binary';

        let dispLabel = '';
        if (itype === 'binary') {
          const bOpts = (custom.config && custom.config.options && custom.config.options.length >= 2)
            ? custom.config.options
            : [{ label: 'مستمر', points: custom.maxPoints || 5 }, { label: 'متاح', points: 3 }];
          const matched = bOpts.find(o => o.points === computedPts);
          dispLabel = matched ? matched.label : (computedPts >= 5 ? 'مستمر' : 'متاح');
        } else if (itype === 'grade') {
          const grades = (custom.config && custom.config.grades) ? custom.config.grades : [];
          const matched = grades.find(g => g.points === computedPts);
          dispLabel = matched ? matched.label : `${computedPts}`;
        } else if (itype === 'bracket') {
          const brackets = (custom.config && custom.config.brackets) ? custom.config.brackets : [];
          const numVal = rawVal !== null ? parseFloat(rawVal) : null;
          const matched = numVal !== null ? brackets.find(b => numVal >= b.min && numVal <= b.max) : null;
          dispLabel = matched ? matched.label : `${computedPts}`;
        } else if (itype === 'numeric') {
          dispLabel = `${rawVal !== null ? parseFloat(rawVal) : 0}`;
        }

        const maxPossible = itype === 'binary'
          ? Math.max(...((custom.config && custom.config.options) || [{ points: custom.maxPoints }]).map(o => o.points))
          : custom.maxPoints;
        const isTopColor = computedPts >= maxPossible && maxPossible > 0;
        return `
          <td style="font-weight: 800; text-align: center;">
            <span style="display:inline-block; padding:3px 8px; border-radius:4px; font-size:0.8rem; background:${isTopColor ? 'rgba(16,185,129,0.15)' : computedPts > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)'}; color:${isTopColor ? '#10b981' : computedPts > 0 ? '#f59e0b' : '#ef4444'}; border:1px solid ${isTopColor ? 'rgba(16,185,129,0.3)' : computedPts > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'};">
              ${dispLabel}
            </span>
          </td>
        `;
      }).join('')}
      <td class="col-action no-print" style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;">
        ${editBtn}
        ${deleteBtn}
        ${annotateBtn}
        ${cAnnotations.length > 0 ? `<button class="btn btn-outline btn-sm" style="font-size:0.72rem;" onclick="toggleAnnotationsPanel(${c.id})">💬 ${cAnnotations.length}</button>` : ''}
      </td>
    </tr>
    ${annotationsPanel}`;

  }).join('');
}

function printCandidatesRegisterPDF() {
  const degreeFilter = (document.getElementById('filter-degree') ? document.getElementById('filter-degree').value : '')
    || (document.getElementById('select-print-cards-degree') ? document.getElementById('select-print-cards-degree').value : '');
  const search = (document.getElementById('search-candidates') ? document.getElementById('search-candidates').value : '').trim().toLowerCase();

  let list = state.candidates || [];
  if (degreeFilter) list = list.filter(c => c.degree === degreeFilter);
  if (search) list = list.filter(c => c.name.toLowerCase().includes(search) || (c.specialization && c.specialization.toLowerCase().includes(search)));

  if (list.length === 0) {
    alert('لا يوجد متنافسون مطابقون للدرجة المحددة لطباعة السجل.');
    return;
  }

  // ترتيب المتنافسين
  list = [...list].sort((a, b) => a.id - b.id);

  const printArea = document.getElementById('candidates-register-print-area');
  if (!printArea) {
    window.print();
    return;
  }

  const currentYear = state.settings.referenceYear || 2026;
  const activeCustom = (state.criteria.customCriteria || []).filter(c => c.enabled);

  function getDisplayName(name) {
    if (name && name.includes('الممارسة')) return 'الاستمرارية';
    return name || '';
  }

  const degreeTitle = degreeFilter === 'ماجستير'
    ? 'كشف الموظفين المتنافسين على منح الماجستير'
    : degreeFilter === 'دكتوراه'
      ? 'كشف الموظفين المتنافسين على منح الدكتوراه'
      : 'السجل العام للموظفين المتنافسين على منح الدراسات العليا (ماجستير ودكتوراه)';

  const signaturesHTML = `
    <div style="margin-top: 25px; page-break-inside: avoid; break-inside: avoid; border-top: 1.5px solid #cbd5e1; padding-top: 14px;">
      <!-- السطر الأول: مدير إدارة شؤون الموظفين + مدير عام الشؤون الإدارية -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 22px; padding: 0 40px;">
        <div style="text-align: center; min-width: 250px;">
          <h4 style="margin: 0 0 12px 0; color: #1e3a8a; font-size: 0.95rem; font-weight: 900;">مدير إدارة شؤون الموظفين</h4>
          <div style="font-size: 0.85rem; color: #1e293b; margin-bottom: 12px; font-weight: 600;">الاسم: ................................................................</div>
          <div style="font-size: 0.85rem; color: #1e293b; font-weight: 600;">التوقيع: ............................................................</div>
        </div>

        <div style="text-align: center; min-width: 250px;">
          <h4 style="margin: 0 0 12px 0; color: #1e3a8a; font-size: 0.95rem; font-weight: 900;">مدير عام الشؤون الإدارية</h4>
          <div style="font-size: 0.85rem; color: #1e293b; margin-bottom: 12px; font-weight: 600;">الاسم: ................................................................</div>
          <div style="font-size: 0.85rem; color: #1e293b; font-weight: 600;">التوقيع: ............................................................</div>
        </div>
      </div>

      <!-- السطر اللاحق: يعتمد / أمين عام الجامعة -->
      <div style="display: flex; justify-content: center; align-items: center;">
        <div style="text-align: center; min-width: 320px; border: 1.5px solid #1e3a8a; border-radius: 8px; padding: 10px 24px; background: #f8fafc;">
          <h4 style="margin: 0 0 12px 0; color: #0f172a; font-size: 1rem; font-weight: 900;">يعتمد / أمين عام الجامعة</h4>
          <div style="font-size: 0.85rem; color: #1e293b; margin-bottom: 12px; font-weight: 600;">الاسم: ................................................................</div>
          <div style="font-size: 0.85rem; color: #1e293b; font-weight: 600;">التوقيع: ............................................................</div>
        </div>
      </div>
    </div>
  `;

  const rowsHTML = list.map((c, idx) => {
    const rawHiring = (c.hiring_univ || c.hiring_service || '-').replace('00:00:00 ', '').replace('00:00:00', '').trim();
    const rawBirth  = (c.birth_date || '-').replace('00:00:00 ', '').replace('00:00:00', '').trim();
    const birthYear = parseInt(c.birth_date) || (c.birth_date ? (c.birth_date.match(/(\d{4})/) || [])[1] : 0);
    const calculatedAge = birthYear ? (currentYear - parseInt(birthYear)) : '-';

    const customCells = activeCustom.map(custom => {
      const computedPts = (c.scores && c.scores.customScores && c.scores.customScores[custom.id] !== undefined)
        ? c.scores.customScores[custom.id]
        : (c.customValues && c.customValues[custom.id] !== undefined ? parseFloat(c.customValues[custom.id]) || 0 : 0);
      const itype = custom.indicatorType || 'binary';
      let dispLabel = '';
      if (itype === 'binary') {
        const bOpts = (custom.config && custom.config.options && custom.config.options.length >= 2)
          ? custom.config.options
          : [{ label: 'مستمر', points: custom.maxPoints || 5 }, { label: 'متاح', points: 3 }];
        const matched = bOpts.find(o => o.points === computedPts);
        dispLabel = matched ? matched.label : (computedPts >= 5 ? 'مستمر' : 'متاح');
      } else {
        dispLabel = `${computedPts}`;
      }
      return `<td style="text-align: center; font-weight: 700; font-size: 0.82rem; padding: 6px 4px;">${dispLabel}</td>`;
    }).join('');

    return `
      <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="text-align: center; font-weight: 800; font-size: 0.85rem; padding: 6px 4px;">${idx + 1}</td>
        <td style="font-weight: 800; font-size: 0.88rem; padding: 6px 8px; color: #0f172a;">${c.name}</td>
        <td style="text-align: center; font-weight: 800; font-size: 0.82rem; padding: 6px 4px; color: ${c.degree === 'ماجستير' ? '#1e40af' : '#7e22ce'};">${c.degree}</td>
        <td style="font-size: 0.82rem; font-weight: 600; padding: 6px 8px;">${c.specialization || '-'}</td>
        <td style="text-align: center; font-size: 0.82rem; padding: 6px 4px;">${rawHiring}</td>
        <td style="text-align: center; font-size: 0.82rem; padding: 6px 4px;">${rawBirth} ${calculatedAge !== '-' ? `(${calculatedAge} سنة)` : ''}</td>
        <td style="text-align: center; font-size: 0.82rem; padding: 6px 4px;">${c.grad_year || '-'}</td>
        <td style="text-align: center; font-weight: 700; font-size: 0.82rem; padding: 6px 4px;">${c.grade || '-'}</td>
        ${customCells}
      </tr>
    `;
  }).join('');

  printArea.innerHTML = `
    <div style="font-family: 'Tajawal', 'Segoe UI', Arial, sans-serif; direction: rtl; color: #0f172a; padding: 6px 10px; background: #ffffff;">
      <!-- الترويسة الرسمية -->
      <div style="border-bottom: 2px double #1e3a8a; padding-bottom: 6px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
        <div style="text-align: right;">
          <h3 style="margin: 0; font-size: 1rem; color: #0f172a; font-weight: 900;">جامعة صنعاء - مجلس الجامعة</h3>
          <h4 style="margin: 3px 0 0 0; font-size: 0.85rem; color: #1e3a8a; font-weight: 800;">لجنة المفاضلة لمنح الماجستير والدكتوراه - الكادر الإداري</h4>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 1.1rem; font-weight: 900; color: #1e3a8a; margin-bottom: 2px; background: #eff6ff; padding: 4px 14px; border-radius: 6px; border: 1.5px solid #bfdbfe;">
            ${degreeTitle}
          </div>
          <div style="font-size: 0.8rem; color: #059669; font-weight: 800;">
            للعام الجامعي ${currentYear - 1}/${currentYear}م
          </div>
        </div>
        <div style="text-align: left; font-size: 0.78rem; color: #475569; font-weight: 700;">
          <div><strong>التاريخ:</strong> ${new Date().toLocaleDateString('ar-YE')}</div>
          <div><strong>إجمالي المقيدين:</strong> <span style="color: #1e3a8a; font-weight: 900; font-size: 0.95rem;">${list.length}</span> متنافساً</div>
          <div><strong>الحالة:</strong> كشف رسمي معتمد</div>
        </div>
      </div>

      <!-- جدول البيانات -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 0.8rem;" border="1" bordercolor="#cbd5e1">
        <thead>
          <tr style="background: #1e3a8a; color: #ffffff;">
            <th style="padding: 6px 4px; text-align: center; width: 35px;">م</th>
            <th style="padding: 6px 8px; text-align: right;">اسم الموظف المتنافس</th>
            <th style="padding: 6px 6px; text-align: center; width: 70px;">الدرجة</th>
            <th style="padding: 6px 8px; text-align: right;">التخصص</th>
            <th style="padding: 6px 6px; text-align: center; width: 85px;">تاريخ التعيين</th>
            <th style="padding: 6px 6px; text-align: center; width: 110px;">تاريخ الميلاد</th>
            <th style="padding: 6px 6px; text-align: center; width: 65px;">التخرج</th>
            <th style="padding: 6px 6px; text-align: center; width: 65px;">التقدير</th>
            ${activeCustom.map(c => `<th style="padding: 6px 6px; text-align: center; width: 75px;">${getDisplayName(c.name)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rowsHTML}
        </tbody>
      </table>

      <!-- التوقيعات -->
      ${signaturesHTML}
    </div>
  `;

  document.body.classList.add('is-candidates-register-print');
  window.print();
  setTimeout(() => {
    document.body.classList.remove('is-candidates-register-print');
  }, 1000);
}

function toggleAnnotationsPanel(candidateId) {
  const panel = document.getElementById('ann-panel-' + candidateId);
  if (panel) panel.style.display = (panel.style.display === 'none' ? 'table-row' : 'none');

}

// 3. شاشة نتائج المفاضلة (Competition Rankings View)
function renderScoringTable() {
  const tbody = document.getElementById('scoring-tbody');
  if (!tbody) return;

  const bannerContainer = document.getElementById('scoring-warning-banner');
  if (bannerContainer) {
    const currentDeficientCount = typeof getCandidatesWithDeficiencies === 'function' ? getCandidatesWithDeficiencies().length : 0;
    if (currentDeficientCount === 0) {
      state.hasRunDeficient = false;
    }

    if (state.hasRunDeficient && currentDeficientCount > 0) {
      bannerContainer.innerHTML = `
        <div style="background: linear-gradient(135deg, rgba(217, 119, 6, 0.25), rgba(15, 23, 42, 0.85)); border: 1.5px solid #d97706; border-radius: 10px; padding: 10px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; box-shadow: 0 4px 15px rgba(217, 119, 6, 0.25);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.3rem;">⚠️</span>
            <div>
              <strong style="color: #fde047; font-size: 0.95rem; display: block; margin-bottom: 2px;">تنبيه رقابي ممتد: تم تنفيذ وتطبيق المفاضلة بنواقص في بيانات بعض المتنافسين! (${currentDeficientCount} متنافس)</strong>
              <span style="font-size: 0.8rem; color: #cbd5e1;">يتطلب مراجعة واستكمال السجلات المعلقة لضمان استيفاء المعايير التنافسية.</span>
            </div>
          </div>
          <button class="btn btn-warning btn-sm" onclick="goToDeficienciesReport()" style="background: linear-gradient(135deg, #d97706, #b45309); font-weight: 800; font-size: 0.82rem; color: #ffffff; padding: 6px 14px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
            📋 تقرير النواقص
          </button>
        </div>
      `;
    } else {
      bannerContainer.innerHTML = '';
    }
  }

  const activeCustom = (state.criteria.customCriteria || []).filter(c => c.enabled);

  // ── دالة تحويل اسم المعيار للعرض ──
  function getDisplayName(name) {
    if (name && name.includes('الممارسة')) return 'الاستمرارية';
    return name || '';
  }

  // ── 1. تحديث رأس الجدول (thead) ديناميكياً لإضافة أعمدة المعايير المخصصة المفعلة ──
  const thead = document.querySelector('#scoring-table thead');
  if (thead) {
    const scoreColCount = 4 + activeCustom.length; // أقدمية + عمر + تخصص + تقدير + مخصصة
    thead.innerHTML = `
      <tr>
        <th rowspan="2" style="width: 42px; vertical-align: middle;">م</th>
        <th rowspan="2" style="min-width: 140px; vertical-align: middle;">المتنافس</th>
        <th rowspan="2" style="vertical-align: middle;">التخصص</th>
        <th colspan="${scoreColCount}" style="text-align: center; background: rgba(37,99,235,0.22); color: #93c5fd; font-size: 0.8rem; letter-spacing: 0.5px; border-bottom: 1px solid rgba(37,99,235,0.3);">نقاط المفاضلة</th>
        <th rowspan="2" style="vertical-align: middle;">الإجمالي</th>
        <th rowspan="2" style="vertical-align: middle;">النتيجة</th>
        <th rowspan="2" style="vertical-align: middle;">الملاحظة</th>
        <th rowspan="2" style="vertical-align: middle;">التفاصيل</th>
      </tr>
      <tr>
        <th style="background: rgba(37,99,235,0.12); font-size: 0.78rem;">الأقدمية</th>
        <th style="background: rgba(37,99,235,0.12); font-size: 0.78rem;">العمر</th>
        <th style="background: rgba(37,99,235,0.12); font-size: 0.78rem;">التخصص</th>
        <th style="background: rgba(37,99,235,0.12); font-size: 0.78rem;">التقدير</th>
        ${activeCustom.map(c => `<th style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; font-size: 0.78rem;">${getDisplayName(c.name)}</th>`).join('')}
      </tr>
    `;
  }

  const degreeFilter = document.getElementById('filter-rankings-degree') ? document.getElementById('filter-rankings-degree').value : 'ماجستير';
  const rankedList = getRankedCandidates(degreeFilter);

  if (rankedList.length === 0) {
    const colCount = 10 + activeCustom.length;
    tbody.innerHTML = `<tr><td colspan="${colCount}" style="text-align: center; color: var(--text-muted); padding: 20px;">لا يوجد متنافسين في هذا القسم</td></tr>`;
    return;
  }

  tbody.innerHTML = rankedList.map(c => {
    // تحديد لون الصف
    let rowStyle = '';
    if (c.tieBreaker && c.tieBreaker.includes('يُحال للجنة')) {
      rowStyle = 'background: rgba(239, 68, 68, 0.10); border-right: 4px solid #ef4444;';
    } else if (c.tieBreaker) {
      rowStyle = 'background: rgba(245, 158, 11, 0.10); border-right: 4px solid #f59e0b;';
    } else if (c.status === 'مقبول') {
      rowStyle = 'background: rgba(16, 185, 129, 0.05);';
    }

    // بناء خلية الملاحظة
    const tieBreakerCell = c.tieBreaker
      ? (() => {
          let badgeText = '';
          if (c.tieBreaker.includes('التخصص') || c.tieBreaker.includes('احتياج')) {
            badgeText = 'بالتخصص';
          } else if (c.tieBreaker.includes('الاستمرارية') || c.tieBreaker.includes('الممارسة')) {
            badgeText = 'بالاستمرارية';
          } else if (c.tieBreaker.includes('أقدمية') || c.tieBreaker.includes('التعيين')) {
            badgeText = 'بالأقدمية';
          } else if (c.tieBreaker.includes('السن')) {
            badgeText = 'بصغر السن';
          } else if (c.tieBreaker.includes('التقدير')) {
            badgeText = 'بالتقدير';
          } else if (c.tieBreaker.includes('يُحال')) {
            badgeText = 'يُحال للجنة';
          } else {
            const firstWord = c.tieBreaker.trim().split(/\s+/)[0];
            badgeText = firstWord.startsWith('ال') ? `ب${firstWord}` : `بالـ${firstWord}`;
          }

          if (c.tieBreakerDetails) {
            return `
              <td class="tie-breaker-interactive-cell" 
                  onmouseenter="showTieBreakerTooltip(event, ${c.id})" 
                  onmouseleave="hideTieBreakerTooltip()" 
                  onclick="openTieBreakerDetailsModal(${c.id})"
                  title="انقر لعرض تفاصيل مقارنة المفاضلة الاستثنائية وطباعة الإفادة">
                <div class="tie-badge-clickable">
                  <span class="tie-badge-tag">استثنائية</span>
                  <span class="tie-badge-reason">${badgeText}</span>
                  <span class="tie-badge-hint">🔍 انقر للتفاصيل</span>
                </div>
              </td>
            `;
          } else {
            const color = c.tieBreaker.includes('يُحال') ? '#ef4444' : '#d97706';
            return `<td style="font-size:0.82rem; color:${color}; font-weight:800; text-align:center; line-height:1.4;">
              استثنائية<br><span style="font-size:0.76rem; font-weight:600;">${badgeText}</span>
            </td>`;
          }
        })()
      : `<td style="color: var(--text-muted); font-size:0.8rem;">—</td>`;

    return `
    <tr style="${rowStyle}">
      <td><strong>${c.rank}</strong></td>
      <td><strong>${c.name}</strong></td>
      <td>${c.specialization}</td>
      <td>${c.scores.seniorityScore}</td>
      <td>${c.scores.ageScore}</td>
      <td>${c.scores.specScore}</td>
      <td>${c.scores.gradeScore}</td>
      ${activeCustom.map(custom => {
        const computedPts = (c.scores.customScores && c.scores.customScores[custom.id] !== undefined)
          ? c.scores.customScores[custom.id] : 0;

        // ── عرض الرقم فقط: صفر بالأحمر، قيمة موجبة بالأخضر ──
        let cellContent = '';
        if (computedPts === 0) {
          cellContent = `<span style="font-weight:900; font-size:1rem; color:#ef4444;">0</span>`;
        } else {
          cellContent = `<span style="font-weight:900; font-size:1rem; color:#10b981;">${computedPts}</span>`;
        }

        return `<td style="text-align:center; background:rgba(245,158,11,0.04);">${cellContent}</td>`;
      }).join('')}
      <td><strong style="color: var(--primary); font-size: 1.05rem;">${c.scores.totalScore}</strong></td>
      <td>
        ${c.status === 'مقبول' ? `
          <span class="badge-status badge-accepted">مقبول</span>
        ` : (c.status === 'معلّق للجنة' ? `
          <span class="badge-status" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.5); font-weight: 800; font-size: 0.78rem; padding: 3px 8px; border-radius: 6px;">معلّق للجنة</span>
        ` : '')}
      </td>
      ${tieBreakerCell}
      <td>
        <button class="btn btn-outline btn-sm" onclick="viewCandidateDetails(${c.id})">التفاصيل</button>
      </td>
    </tr>`;
  }).join('');

  // ── إضافة شريط التمرير العلوي المرتبط ──
  setupDualScrollbar('scoring-table');
}

// ── شريط التمرير المزدوج: يُنشئ شريط تمرير علوي مرتبط بـ table-responsive ──
function setupDualScrollbar(tableId) {
  const table   = document.getElementById(tableId);
  if (!table) return;
  const wrapper = table.closest('.table-responsive');
  if (!wrapper) return;

  // احذف الشريط العلوي القديم إن وجد
  const existingMirror = wrapper.previousElementSibling;
  if (existingMirror && existingMirror.classList.contains('scroll-mirror-bar')) {
    existingMirror.remove();
  }

  // أنشئ شريط التمرير العلوي
  const mirror = document.createElement('div');
  mirror.className = 'scroll-mirror-bar';
  mirror.style.cssText = `
    width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    height: 14px;
    margin-bottom: 4px;
    scrollbar-width: thin;
    scrollbar-color: #475569 #1e293b;
  `;
  const inner = document.createElement('div');
  inner.style.cssText = `height: 1px; width: ${table.scrollWidth}px;`;
  mirror.appendChild(inner);
  wrapper.parentNode.insertBefore(mirror, wrapper);

  // تزامن التمرير بين الشريطين
  let syncing = false;
  mirror.addEventListener('scroll', () => {
    if (!syncing) { syncing = true; wrapper.scrollLeft = mirror.scrollLeft; syncing = false; }
  });
  wrapper.addEventListener('scroll', () => {
    if (!syncing) { syncing = true; mirror.scrollLeft = wrapper.scrollLeft; syncing = false; }
  });

  // تحديث عرض الشريط العلوي عند تغيير حجم الجدول
  const ro = new ResizeObserver(() => {
    inner.style.width = table.scrollWidth + 'px';
  });
  ro.observe(table);
}

// عرض بطاقة تقييم وتفاصيل المتنافس الشاملة (Candidate Details View)
function viewCandidateDetails(candidateId) {
  let candidate = null;
  const masterRanked = getRankedCandidates('ماجستير');
  const phdRanked    = getRankedCandidates('دكتوراه');

  candidate = masterRanked.find(c => c.id === candidateId) || phdRanked.find(c => c.id === candidateId);

  if (!candidate) {
    const raw = state.candidates.find(c => c.id === candidateId);
    if (!raw) return;
    candidate = {
      ...raw,
      scores: calculateCandidateScore(raw),
      rank: '-',
      status: '',
      tieBreaker: null
    };
  }

  const container = document.getElementById('modal-candidate-details-body');
  if (!container) return;

  container.innerHTML = generateCandidateCardHTML(candidate);
  openModal('modal-candidate-details');
}

// دالة توليد كود HTML لبطاقة تأكيد البيانات وإقرارها لمتنافس واحد
function generateCandidateCardHTML(candidate) {
  const currentYear = state.settings.referenceYear || 2026;
  const birthYear = parseInt(candidate.birth_date) || (candidate.birth_date ? (candidate.birth_date.match(/(\d{4})/) || [])[1] : 0);
  const calculatedAge = birthYear ? (currentYear - parseInt(birthYear)) : '-';
  const hiringUnivStr = candidate.hiring_univ || candidate.hiring_service || '-';

  const customScores = (candidate.scores && candidate.scores.customScores) || {};
  const activeCustom  = (state.criteria.customCriteria || []).filter(c => c.enabled);

  const committeeList = state.committeeMembers || [];
  const chairmanObj   = committeeList.find(m => (m.committeeRole || '').includes('رئيس اللجنة')) || committeeList[0];
  const chairmanName  = chairmanObj ? chairmanObj.name : 'أ.د. ابراهيم المطاع';

  const seniorityScore = candidate.scores ? candidate.scores.seniorityScore : 0;
  const ageScore = candidate.scores ? candidate.scores.ageScore : 0;
  const specScore = candidate.scores ? candidate.scores.specScore : 0;
  const gradeScore = candidate.scores ? candidate.scores.gradeScore : 0;
  const totalScore = candidate.scores ? candidate.scores.totalScore : 0;

  return `
    <div class="single-candidate-card-page" style="position: relative; page-break-after: always; break-after: page; background: #ffffff; padding: 10px 14px; font-family: 'Tajawal', 'Segoe UI', Arial, sans-serif; direction: rtl; color: #0f172a;">
      <!-- العلامة المائية الشبحية لمسودة التدقيق والمراجعة -->
      <div class="print-watermark">مسودة للتدقيق والمراجعة</div>

      <!-- ترويسة البطاقة الرسمية للطباعة -->
      <div class="card-print-header" style="border-bottom: 2px double #1e3a8a; padding-bottom: 6px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <h2 style="margin: 0; color: #0f172a; font-size: 1.05rem; font-weight: 900;">جامعـة صنعـاء - مجلـس الجامعـة</h2>
          <h3 style="margin: 2px 0 0 0; color: #1e3a8a; font-size: 0.85rem; font-weight: 800;">لجنة المفاضلة - بطاقة تأكيد البيانات وإقرارها</h3>
        </div>
        <div style="text-align: left;">
          <span style="font-size: 0.72rem; color: #475569; display: block;">المركز والترتيب المستحق:</span>
          <strong style="font-size: 1.15rem; color: #1e3a8a; background: #eff6ff; padding: 2px 8px; border-radius: 6px; border: 1px solid #bfdbfe;">المركز #${candidate.rank || '-'}</strong>
        </div>
      </div>

      <!-- كارت اسم المتنافس والتخصص -->
      <div class="card-print-section" style="background: #f8fafc; border: 1.5px solid #1e3a8a; padding: 8px 12px; border-radius: 6px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h3 style="margin: 0; font-size: 1.05rem; font-weight: 900; color: #0f172a;">${candidate.name}</h3>
          <span style="font-size: 0.8rem; color: #1e3a8a; font-weight: 700;">التخصص: (${candidate.specialization})</span>
        </div>
        <div>
          <span style="background: #1e3a8a; color: #ffffff; padding: 3px 10px; border-radius: 15px; font-size: 0.8rem; font-weight: 800;">🎓 منحة (${candidate.degree})</span>
        </div>
      </div>

      <!-- 1. شبكة البيانات الشخصية والأكاديمية مع نوع المنحة البارز -->
      <div class="card-print-section" style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; margin-bottom: 8px; font-size: 0.8rem;">
        <h4 style="margin: 0 0 6px 0; color: #1e3a8a; font-size: 0.85rem; font-weight: 800; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px;">
          📌 البيانات الشخصية ونوع المنحة المتقدم لها
        </h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; color: #0f172a; font-weight: 600;">
          <div style="grid-column: span 2; background: #eff6ff; padding: 4px 8px; border-radius: 4px; border: 1px solid #bfdbfe; color: #1e3a8a;">
            <strong>🎓 نوع المنحة المطلوبة:</strong>
            <span class="badge-degree" style="font-size: 0.8rem; font-weight: 800; margin-right: 6px;">منحة (${candidate.degree})</span>
          </div>
          <div><strong>تاريخ التعيين بالخدمة/الجامعة:</strong> <span style="color:#1e3a8a;">${hiringUnivStr}</span></div>
          <div><strong>تاريخ الميلاد (العمر):</strong> <span style="color:#1e3a8a;">${candidate.birth_date || '-'} ${calculatedAge !== '-' ? `(${calculatedAge} سنة)` : ''}</span></div>
          <div><strong>التقدير الأكاديمي:</strong> <span style="color:#1e3a8a;">${candidate.grade || '-'}</span></div>
          <div><strong>سنة التخرج:</strong> <span style="color:#1e3a8a;">${candidate.grad_year || '-'}</span></div>
        </div>
      </div>

      <!-- 2. تفكيك احتساب النقاط التنافسية -->
      <div class="card-print-section" style="background: #ffffff; border: 1.5px solid #059669; border-radius: 6px; padding: 8px 12px; margin-bottom: 8px; font-size: 0.8rem;">
        <h4 style="margin: 0 0 6px 0; color: #047857; font-size: 0.85rem; font-weight: 800; border-bottom: 1px solid #a7f3d0; padding-bottom: 3px;">
          📊 تفكيك احتساب النقاط المعيارية (من 25 نقطة)
        </h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; color: #064e3b;">
          <div style="background: #f0fdf4; padding: 6px 10px; border-radius: 4px; border: 1px solid #a7f3d0; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.78rem; color: #334155; font-weight:700;">الأقدمية بالخدمة (أعلى 10ن):</span>
            <strong style="font-size: 1rem; color: #047857;">${seniorityScore} نقاط</strong>
          </div>
          <div style="background: #f0fdf4; padding: 6px 10px; border-radius: 4px; border: 1px solid #a7f3d0; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.78rem; color: #334155; font-weight:700;">الفئة العمرية (أعلى 5ن):</span>
            <strong style="font-size: 1rem; color: #047857;">${ageScore} نقاط</strong>
          </div>
          <div style="background: #f0fdf4; padding: 6px 10px; border-radius: 4px; border: 1px solid #a7f3d0; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.78rem; color: #334155; font-weight:700;">احتياج التخصص (أعلى 5ن):</span>
            <strong style="font-size: 1rem; color: #047857;">${specScore} نقاط</strong>
          </div>
          <div style="background: #f0fdf4; padding: 6px 10px; border-radius: 4px; border: 1px solid #a7f3d0; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.78rem; color: #334155; font-weight:700;">تقدير المؤهل (أعلى 5ن):</span>
            <strong style="font-size: 1rem; color: #047857;">${gradeScore} نقاط</strong>
          </div>
          ${activeCustom.map(custom => {
            const computedPts = customScores[custom.id] || 0;
            const rawVal = (candidate.customValues && candidate.customValues[custom.id] !== undefined)
              ? candidate.customValues[custom.id] : null;
            const itype = custom.indicatorType || 'binary';

            let displayLabel = '';
            if (itype === 'binary') {
              const bOpts = (custom.config && custom.config.options && custom.config.options.length >= 2)
                ? custom.config.options
                : [{ label: 'مستمر', points: custom.maxPoints || 5 }, { label: 'متاح', points: 3 }];
              const matchedBOpt = bOpts.find(o => o.points === computedPts);
              displayLabel = matchedBOpt ? `🔵 ${matchedBOpt.label}` : `🔵 ${computedPts}ن`;

            } else if (itype === 'grade') {
              const grades = (custom.config && custom.config.grades) ? custom.config.grades : [];
              const matched = grades.find(g => g.points === computedPts);
              displayLabel = matched ? `🟡 ${matched.label}` : (computedPts > 0 ? `🟡 ${computedPts}ن` : '—');
            } else if (itype === 'bracket') {
              const brackets = (custom.config && custom.config.brackets) ? custom.config.brackets : [];
              const numVal = rawVal !== null ? parseFloat(rawVal) : null;
              const matched = (numVal !== null) ? brackets.find(b => numVal >= b.min && numVal <= b.max) : null;
              displayLabel = matched ? `🟠 ${matched.label}` : (numVal !== null ? `🟠 ${numVal}` : '—');
            } else if (itype === 'numeric') {
              const numVal = rawVal !== null ? parseFloat(rawVal) : 0;
              displayLabel = `🟣 ${numVal} وحدة`;
            }

            return `
            <div style="background: #f0fdf4; padding: 6px 10px; border-radius: 4px; border: 1px solid #a7f3d0; grid-column: span 2; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.78rem; color: #334155; font-weight:700;">${custom.name}: <span style="color:#64748b; font-weight:500;">${displayLabel}</span></span>
              <strong style="font-size: 1rem; color: #047857;">${computedPts} نقاط</strong>
            </div>`;
          }).join('')}
        </div>

        <div style="margin-top: 8px; background: #047857; color: #ffffff; padding: 6px 10px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 800; font-size: 0.9rem;">إجمالي النقاط الكلية المحسوبة:</span>
          <strong style="font-size: 1.25rem;">${totalScore} نقطة</strong>
        </div>
      </div>

      <!-- 3. حالة التنافس والمفاضلة الاستثنائية -->
      <div class="card-print-section" style="background: #ffffff; border: 1.5px solid #d97706; border-radius: 6px; padding: 8px 12px; font-size: 0.8rem; color: #78350f;">
        <h4 style="margin: 0 0 6px 0; color: #b45309; font-size: 0.85rem; font-weight: 800; border-bottom: 1px solid #fde68a; padding-bottom: 3px;">
          ⚖️ حالة التنافس وملاحظات الاستحقاق
        </h4>
        <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 4px;">
          <span><strong>النتيجة والاعتماد:</strong></span>
          ${candidate.status === 'مقبول' 
            ? `<span class="badge-status badge-accepted" style="font-size:0.8rem; font-weight:800; padding: 3px 8px;">✅ مرشح مقبول بالفوز بـ (منحة ${candidate.degree})</span>` 
            : '<span style="color:#64748b; font-weight:700;">— خارج خط المنح المتاحة</span>'}
        </div>
        ${candidate.tieBreaker ? `
          <div style="background:#fffbeb; border-right:4px solid #d97706; padding:6px 10px; border-radius:4px; margin-top:6px;">
            <strong style="color:#b45309; display:block;">⚖️ مفاضلة استثنائية (حالة تعادل عند خط القبول)</strong>
            <span style="font-size:0.78rem; color:#92400e;">تم حسم الترتيب بناءً على معيار: <strong>${candidate.tieBreaker}</strong></span>
          </div>
        ` : `
          <div style="color:#64748b; font-size:0.78rem; margin-top:2px;">لم يتطلب الترتيب مفاضلة استثنائية للدرجة الكلية.</div>
        `}
      </div>

      <!-- 4. تذييل الاعتماد والتواقيع المعتمدة عند الطباعة -->
      <div class="card-print-signatures" style="margin-top: 14px; border-top: 1.5px dashed #1e3a8a; padding-top: 10px; font-size: 0.8rem; color: #0f172a;">
        <div style="display: flex; justify-content: space-between; text-align: center; font-weight: 800;">
          <div>
            <span>توقيع المتقدم</span><br><br>
            <span style="color:#475569; font-weight:700; display:block; margin-top:2px;">الاسم: ${candidate.name}</span>
            <span style="color:#94a3b8; font-weight:600;">التوقيع: ............................</span>
          </div>
          <div>
            <span>المراجع</span><br><br><br>
            <span style="color:#94a3b8; font-weight:600;">التوقيع: ............................</span>
          </div>
          <div>
            <span>يعتمد / رئيس لجنة المفاضلة</span><br><br>
            <span style="color:#1e3a8a; font-weight:800; display:block; margin-top:2px;">${chairmanName}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// دالة طباعة جميع بطاقات المتنافسين دفعة واحدة (النسخة النهائية)
function printAllCandidateCardsFinal() {
  const degreeFilter = (document.getElementById('select-print-cards-degree') ? document.getElementById('select-print-cards-degree').value : '')
    || (document.getElementById('filter-degree') ? document.getElementById('filter-degree').value : '');

  let candidatesToPrint = [];
  if (degreeFilter === 'ماجستير') {
    candidatesToPrint = getRankedCandidates('ماجستير');
  } else if (degreeFilter === 'دكتوراه') {
    candidatesToPrint = getRankedCandidates('دكتوراه');
  } else {
    const masters = getRankedCandidates('ماجستير');
    const phds = getRankedCandidates('دكتوراه');
    candidatesToPrint = [...masters, ...phds];
  }

  if (!candidatesToPrint || candidatesToPrint.length === 0) {
    alert('لا يوجد متنافسون متاحون لطباعة بطاقاتهم.');
    return;
  }

  const batchContainer = document.getElementById('batch-cards-print-area');
  if (!batchContainer) return;

  batchContainer.innerHTML = candidatesToPrint.map(c => generateCandidateCardHTML(c)).join('');

  document.body.classList.add('is-batch-cards-print');
  document.body.classList.remove('is-draft-print');
  window.print();
  setTimeout(() => {
    document.body.classList.remove('is-batch-cards-print');
  }, 1000);
}

// دالة طباعة جميع بطاقات المتنافسين دفعة واحدة (مسودة للمراجعة)
function printAllCandidateCardsDraft() {
  const degreeFilter = (document.getElementById('select-print-cards-degree') ? document.getElementById('select-print-cards-degree').value : '')
    || (document.getElementById('filter-degree') ? document.getElementById('filter-degree').value : '');

  let candidatesToPrint = [];
  if (degreeFilter === 'ماجستير') {
    candidatesToPrint = getRankedCandidates('ماجستير');
  } else if (degreeFilter === 'دكتوراه') {
    candidatesToPrint = getRankedCandidates('دكتوراه');
  } else {
    const masters = getRankedCandidates('ماجستير');
    const phds = getRankedCandidates('دكتوراه');
    candidatesToPrint = [...masters, ...phds];
  }

  if (!candidatesToPrint || candidatesToPrint.length === 0) {
    alert('لا يوجد متنافسون متاحون لطباعة بطاقاتهم.');
    return;
  }

  const batchContainer = document.getElementById('batch-cards-print-area');
  if (!batchContainer) return;

  batchContainer.innerHTML = candidatesToPrint.map(c => generateCandidateCardHTML(c)).join('');

  document.body.classList.add('is-batch-cards-print');
  document.body.classList.add('is-draft-print');
  window.print();
  setTimeout(() => {
    document.body.classList.remove('is-batch-cards-print');
    document.body.classList.remove('is-draft-print');
  }, 1000);
}

function printAllCandidateCards() {
  printAllCandidateCardsFinal();
}

// دالة طباعة بطاقة تفاصيل المتنافس الاحترافية A4
function printCandidateDetailsCard() {
  document.body.classList.add('is-card-print');
  window.print();
  setTimeout(() => {
    document.body.classList.remove('is-card-print');
  }, 1000);
}

function renderDetailedReport() {
  const reportContainer = document.getElementById('detailed-report-content');
  if (!reportContainer) return;

  const bannerContainer = document.getElementById('report-warning-banner');
  if (bannerContainer) {
    const currentDeficientCount = typeof getCandidatesWithDeficiencies === 'function' ? getCandidatesWithDeficiencies().length : 0;
    if (currentDeficientCount === 0) {
      state.hasRunDeficient = false;
    }

    if (state.hasRunDeficient && currentDeficientCount > 0) {
      bannerContainer.innerHTML = `
        <div style="background: linear-gradient(135deg, rgba(217, 119, 6, 0.25), rgba(15, 23, 42, 0.85)); border: 1.5px solid #d97706; border-radius: 10px; padding: 10px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; box-shadow: 0 4px 15px rgba(217, 119, 6, 0.25);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.3rem;">⚠️</span>
            <div>
              <strong style="color: #fde047; font-size: 0.95rem; display: block; margin-bottom: 2px;">تنبيه رقابي ممتد: تم تنفيذ وتطبيق المفاضلة بنواقص في بيانات بعض المتنافسين! (${currentDeficientCount} متنافس)</strong>
              <span style="font-size: 0.8rem; color: #cbd5e1;">يتطلب مراجعة واستكمال السجلات المعلقة لضمان استيفاء المعايير التنافسية.</span>
            </div>
          </div>
          <button class="btn btn-warning btn-sm" onclick="goToDeficienciesReport()" style="background: linear-gradient(135deg, #d97706, #b45309); font-weight: 800; font-size: 0.82rem; color: #ffffff; padding: 6px 14px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
            📋 تقرير النواقص
          </button>
        </div>
      `;
    } else {
      bannerContainer.innerHTML = '';
    }
  }

  const degreeFilter = document.getElementById('report-degree-filter') ? document.getElementById('report-degree-filter').value : 'الكل';
  
  const masterLimit = state.settings.masterGrantsCount || 3;
  const phdLimit = state.settings.phdGrantsCount || 3;
  const activeCustom = (state.criteria.customCriteria || []).filter(c => c.enabled);
  const currentYear = state.settings.referenceYear || 2026;

  // جلب المرشحين
  const allMasterCandidates = getRankedCandidates('ماجستير');
  const allPhdCandidates = getRankedCandidates('دكتوراه');

  // حساب الإحصائيات
  const totalMasterCount = allMasterCandidates.length;
  const totalPhdCount = allPhdCandidates.length;
  const totalCandidates = totalMasterCount + totalPhdCount;

  // عدّ مجموعات التعادل الفريدة (كل تعادل يُعدّ مرة واحدة، لا بعدد الأفراد)
  const masterTiedGroups = new Set(allMasterCandidates.filter(c => c.tieBreaker).map(c => c.scores.totalScore));
  const phdTiedGroups    = new Set(allPhdCandidates.filter(c => c.tieBreaker).map(c => c.scores.totalScore));
  const masterTiedCount = masterTiedGroups.size;
  const phdTiedCount    = phdTiedGroups.size;

  const showMaster = (degreeFilter === 'الكل' || degreeFilter === 'ماجستير');
  const showPhd = (degreeFilter === 'الكل' || degreeFilter === 'دكتوراه');

  // بناء جدول البيانات لدرجة واحدة
  function buildDegreeMatrixTable(degreeTitle, candidatesList, grantLimit) {
    if (candidatesList.length === 0) {
      return `
        <div style="text-align: center; padding: 20px; color: #64748b; font-weight: 600; border: 1px dashed #cbd5e1; border-radius: 8px; margin-bottom: 25px;">
          لا يوجد متنافسون مسجلون لدرجة (${degreeTitle}) حتى الآن.
        </div>
      `;
    }

    return `
      <div class="degree-report-block" style="margin-bottom: 30px; page-break-inside: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; background: #1e3a8a; color: #ffffff; padding: 8px 14px; border-radius: 6px 6px 0 0; margin-bottom: 0;">
          <h4 style="margin: 0; font-size: 0.95rem; font-weight: 800;">
            🎓 كشف مصفوفة التنافس والفرز النهائي - درجة (${degreeTitle}) [عدد المنح المتاحة: ${grantLimit}]
          </h4>
          <span style="font-size: 0.78rem; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 4px;">
            إجمالي المتقدمين: ${candidatesList.length}
          </span>
        </div>

        <table class="report-table" style="margin-top: 0;">
          <thead>
            <tr>
              <th style="width: 4%;">م</th>
              <th style="width: 18%;">اسم المتنافس / الموظف</th>
              <th style="width: 7%;">الدرجة</th>
              <th style="width: 11%;">التخصص</th>
              <th>الأقدمية</th>
              <th>العمر</th>
              <th>التخصص</th>
              <th>التقدير</th>
              ${activeCustom.map(c => `<th>${c.name}</th>`).join('')}
              <th style="width: 8%;">المجموع</th>
              <th style="width: 8%;">النتيجة</th>
              <th style="width: 16%;">ملاحظات الشفافية والتعادل</th>
            </tr>
          </thead>
          <tbody>
            ${candidatesList.map(c => {
              let rowStyle = '';
              let notesCell = '';

              const customNote = c.notes || c.remarks || c.deduction_notes || c.special_notes;

              if (c.tieBreaker && c.tieBreaker.includes('يُحال')) {
                rowStyle = 'font-weight: bold; background-color: #fff1f2; border-right: 4px solid #ef4444;';
                notesCell = `<td style="font-size:0.74rem; color:#dc2626; font-weight:800; text-align:right;">⚖️ مفاضلة استثنائية (حالة تعادل)<br><span style="font-size:0.7rem; font-weight:600;">معيار الحسم: ${c.tieBreaker}</span></td>`;
              } else if (c.tieBreaker) {
                rowStyle = (c.status === 'مقبول' ? 'font-weight: bold; ' : '') + 'background-color: #fffbeb; border-right: 4px solid #f59e0b;';
                notesCell = `<td style="font-size:0.74rem; color:#b45309; font-weight:800; text-align:right;">⚖️ مفاضلة استثنائية (تعادل عند خط القبول)<br><span style="font-size:0.7rem; font-weight:600;">المعيار الفاصل: ${c.tieBreaker}</span></td>`;
              } else if (customNote) {
                rowStyle = (c.status === 'مقبول' ? 'font-weight: bold; background-color: #f0fdf4;' : '');
                notesCell = `<td style="font-size:0.75rem; color:#d97706; font-weight:800; text-align:right;">📌 ${customNote}</td>`;
              } else {
                if (c.status === 'مقبول') {
                  rowStyle = 'font-weight: bold; background-color: #f0fdf4;';
                }
                notesCell = `<td style="color:#94a3b8; font-size:0.75rem; text-align:center;">—</td>`;
              }

              return `
              <tr style="${rowStyle}">
                <td>${c.rank}</td>
                <td style="text-align: right;"><strong>${c.name}</strong></td>
                <td>${c.degree}</td>
                <td>${c.specialization}</td>
                <td class="score-cell">${c.scores.seniorityScore}</td>
                <td class="score-cell">${c.scores.ageScore}</td>
                <td class="score-cell">${c.scores.specScore}</td>
                <td class="score-cell">${c.scores.gradeScore}</td>
                ${activeCustom.map(custom => `<td class="score-cell">${(c.scores.customScores && c.scores.customScores[custom.id]) || 0}</td>`).join('')}
                <td><span class="total-score-badge">${c.scores.totalScore}</span></td>
                <td>
                  ${c.status === 'مقبول' ? '<span class="badge-status badge-accepted">مقبول</span>' : ''}
                </td>
                ${notesCell}
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  reportContainer.innerHTML = `
    <div class="report-paper" style="position: relative;">
      <!-- العلامة المائية الشبحية لمسودة التدقيق والمراجعة -->
      <div id="report-print-watermark" class="print-watermark">مسودة للتدقيق والمراجعة</div>

      <!-- 1. الهيدر الرسمي للتقرير الشامل مع شعار المالك وتفاصيل الجلسة -->
      <div class="report-header" style="border-bottom: 2.5px double #1e3a8a; padding-bottom: 12px; margin-bottom: 16px; position: relative;">
        <!-- شعار وشارة صاحب الحقوق الملكية MAQATECH أفقياً في أعلى التقرير -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
          <div style="text-align: right;">
            <h2 style="margin: 0; color: #0f172a; font-size: 1.25rem;">جامعـة صنعـاء - مجلـس الجامعـة</h2>
            <h3 style="margin: 2px 0 0 0; color: #1e3a8a; font-size: 0.95rem; font-weight: 700;">لجنة المفاضلة والتنافس على منح الدراسات العليا (الكادر الإداري)</h3>
          </div>
          <!-- شارة صاحب النظام MAQATECH -->
          <div style="display: flex; align-items: center; gap: 8px; background: #0f172a; color: #ffffff; padding: 4px 10px; border-radius: 6px; border: 1px solid #334155;">
            <div style="background: linear-gradient(135deg, #2563eb, #0d9488); color: #ffffff; font-weight: 900; width: 26px; height: 26px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-family: sans-serif;">MT</div>
            <div style="text-align: left; line-height: 1.1;">
              <span style="font-weight: 900; font-size: 0.72rem; letter-spacing: 0.5px; display: block;">MAQATECH</span>
              <span style="font-size: 0.58rem; color: #94a3b8; display: block;">SOFTWARE SOLUTIONS</span>
            </div>
          </div>
        </div>

        <p style="font-weight: 800; color: #1e3a8a; font-size: 1.05rem; margin: 8px 0 6px 0; letter-spacing: 0.2px; text-align: center;">
          ${state.settings.applicationTitle || 'التقرير المحضري والشفافية التنافسية الشاملة لمصفوفة المفاضلة النهائيـة للعام 2026م'}
        </p>

        <!-- شريط محضر الجلسة: المكان والتاريخ والوقت ورئاسة الجامعة -->
        <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; margin-top: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.76rem; color: #334155;">
          <div>
            <strong>📍 مكان عقد وتنفيذ المفاضلة:</strong>
            <span>${state.settings.competitionLocation || 'مقر الأمانة العامة / قاعة اجتماعات مجلس الجامعة الرئيسي - جامعة صنعاء'}</span>
          </div>
          <div>
            <strong>🗓️ يوم وتاريخ ووقت الفرز:</strong>
            <span>${state.settings.competitionDate || 'شهر اغسطس 2026'}</span>
          </div>
        </div>

        <!-- كروت الإحصائيات السريعة للشفافية -->
        <div style="margin-top: 10px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; text-align: center; font-size: 0.78rem;">
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 6px; border-radius: 6px;">
            <span style="color: #64748b; font-weight: 600; display: block;">إجمالي التنافس العام:</span>
            <strong style="color: #0f172a; font-size: 0.95rem;">${totalCandidates} متنافس</strong>
          </div>
          <div style="background: #f0fdf4; border: 1px solid #a7f3d0; padding: 6px; border-radius: 6px;">
            <span style="color: #047857; font-weight: 600; display: block;">المقبولون (ماجستير):</span>
            <strong style="color: #065f46; font-size: 0.95rem;">${masterLimit} منح</strong>
          </div>
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 6px; border-radius: 6px;">
            <span style="color: #1d4ed8; font-weight: 600; display: block;">المقبولون (دكتوراه):</span>
            <strong style="color: #1e40af; font-size: 0.95rem;">${phdLimit} منح</strong>
          </div>
          <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 6px; border-radius: 6px;">
            <span style="color: #b45309; font-weight: 600; display: block;">حالات الحسم الاستثنائي:</span>
            <strong style="color: #92400e; font-size: 0.95rem;">${masterTiedCount + phdTiedCount} حالة حسم</strong>
          </div>
        </div>
      </div>

      <!-- 2. دليل الشفافية والمنهجية وقواعد المفاضلة -->
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 0.82rem; line-height: 1.6;">
        <h4 style="margin: 0 0 6px 0; color: #1e3a8a; font-size: 0.88rem; font-weight: 800; display: flex; align-items: center; gap: 6px;">
          <span>⚖️ أولاً: دليل الشفافية والمنهجية وقواعد المفاضلة المعتمدة</span>
        </h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 8px;">
          <div style="background: #ffffff; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <strong style="color: #0f172a; display: block; margin-bottom: 4px;">1. أوزان المعايير المعيارية التنافسية:</strong>
            <ul style="margin: 0; padding-right: 18px; color: #334155; font-size: 0.78rem;">
              <li>الأقدمية وتاريخ التعيين بالخدمة (الوزن الأعلى: ${state.criteria.seniority.maxPoints || 30} نقطة)</li>
              <li>الفئة العمرية والسن (الوزن الأعلى: ${state.criteria.age.maxPoints || 25} نقطة)</li>
              <li>الاحتياج الأكاديمي والتخصص (الوزن الأعلى: ${state.criteria.specialization.maxPoints || 20} نقطة)</li>
              <li>تقدير المؤهل العلمي الأكاديمي (الوزن الأعلى: ${state.criteria.grade.maxPoints || 20} نقطة)</li>
            </ul>
          </div>

          <div style="background: #ffffff; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <strong style="color: #0f172a; display: block; margin-bottom: 4px;">2. خوارزمية كسر التعادل ومفصل الاستحقاق الشفاف:</strong>
            <p style="margin: 0; color: #334155; font-size: 0.76rem;">
              تُحسب المفاضلة الاستثنائية <strong>فقط عند التعادل على الحد الفاصل للمقعد الأخير</strong> (المنحة 3 للماجستير أو المنحة 3 للدكتوراه) بناءً على التراتبية الشفافة التالية:
              <br>
              <strong>1. مدى احتياج الجامعة للتخصص (3 درجات لتخصصات الوزن 5، و0 لأخرى)</strong> ← <strong>2. أقدمية التعيين (الأقدم تعييناً بالخدمة/الجامعة)</strong> ← <strong>3. الاستمرارية (الممارسة الفعلية: مستمر 5 ومتاح 3)</strong> ← <strong>4. التقدير العلمي الأعلى</strong> ← <strong>5. صغر السن (الأصغر سناً)</strong>.
            </p>
          </div>
        </div>
      </div>

      <!-- 3. مصفوفات نتائج التنافس والمفاضلة -->
      ${showMaster ? buildDegreeMatrixTable('الماجستير', allMasterCandidates, masterLimit) : ''}
      ${showPhd ? buildDegreeMatrixTable('الدكتوراه', allPhdCandidates, phdLimit) : ''}

      <!-- 4. قسم الاعتماد والتوقيعات الرسمية الهيكلية -->
      ${(() => {
        const members = (state.committeeMembers && state.committeeMembers.length > 0) ? state.committeeMembers : DEFAULT_COMMITTEE_MEMBERS;
        const chairman = members.find(m => (m.committeeRole || '').includes('رئيس اللجنة')) || members[0];
        const regularMembers = members.filter(m => m !== chairman).reverse();
        const rectorName = (state.settings && state.settings.rectorName) ? state.settings.rectorName : 'أ.د. محمد أحمد البخيتي';

        return `
          <div class="signatures-section" style="margin-top: 20px; border-top: 2px solid #1e3a8a; padding-top: 12px; page-break-inside: avoid;">
            <h4 style="text-align: center; color: #1e3a8a; font-size: 0.92rem; margin: 0 0 10px 0; font-weight: 800;">
              توقيعات أعضاء لجنة المفاضلة والتنافس واعتماـد رئاسـة الجامعـة
            </h4>
            
            <!-- الصف الأول: أعضاء لجنة المفاضلة (الأربعة أعضاء) -->
            <div class="signature-grid-row1" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; text-align: center; margin-bottom: 12px;">
              ${regularMembers.map(m => `
                <div class="signature-card" style="border: 1px solid #cbd5e1; padding: 6px; border-radius: 6px; background-color: #f8fafc;">
                  <p style="font-weight: 800; color: #1e3a8a; font-size: 0.76rem; margin: 0 0 2px 0;">${m.committeeRole || 'عضواً'}</p>
                  <p style="font-weight: 800; color: #0f172a; font-size: 0.78rem; margin: 0 0 1px 0;">${m.name || 'اسم العضو'}</p>
                  <p style="color: #475569; font-size: 0.68rem; margin: 0 0 4px 0;">${m.adminTitle || 'الصفة الإدارية'}</p>
                  <div style="height: 16px; border-bottom: 1px dashed #94a3b8; margin-bottom: 4px;"></div>
                  <p style="font-size: 0.62rem; color: #64748b; margin: 0; font-weight: 600;">التوقيع والختم الرسمـي</p>
                </div>
              `).join('')}
            </div>

            <!-- الصف الثاني: رئيس اللجنة + يعتمد رئيس الجامعة -->
            <div class="signature-grid-row2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; width: 85%; margin: 0 auto; text-align: center;">
              <!-- رئيس اللجنة -->
              <div class="signature-card" style="border: 1.5px solid #1e3a8a; padding: 8px 10px; border-radius: 8px; background-color: #eff6ff;">
                <p style="font-weight: 900; color: #1e3a8a; font-size: 0.84rem; margin: 0 0 2px 0;">${chairman.committeeRole || 'رئيس اللجنة'}</p>
                <p style="font-weight: 900; color: #0f172a; font-size: 0.86rem; margin: 0 0 1px 0;">${chairman.name || 'أ.د. ابراهيم المطاع'}</p>
                <p style="color: #334155; font-size: 0.72rem; margin: 0 0 6px 0;">${chairman.adminTitle || 'نائب رئيس الجامعة للشؤون الأكاديمية'}</p>
                <div style="height: 20px; border-bottom: 1px dashed #1e3a8a; margin-bottom: 4px;"></div>
                <p style="font-size: 0.65rem; color: #1e3a8a; margin: 0; font-weight: 700;">التوقيع والختم الرسمي لرئيس اللجنة</p>
              </div>

              <!-- يعتمد رئيس الجامعة -->
              <div class="signature-card" style="border: 2px solid #059669; padding: 8px 10px; border-radius: 8px; background-color: #ecfdf5;">
                <p style="font-weight: 900; color: #059669; font-size: 0.86rem; margin: 0 0 2px 0;">يُعتمـــد / رئيس الجامعة</p>
                <p style="font-weight: 900; color: #064e3b; font-size: 0.88rem; margin: 0 0 1px 0;">${rectorName}</p>
                <p style="color: #047857; font-size: 0.72rem; margin: 0 0 6px 0;">رئيس جامعة صنعاء</p>
                <div style="height: 20px; border-bottom: 1.5px dashed #059669; margin-bottom: 4px;"></div>
                <p style="font-size: 0.65rem; color: #047857; margin: 0; font-weight: 800;">الختم والتوقيع الرسمي لرئاسة الجامعة</p>
              </div>
            </div>
          </div>
        `;
      })()}

      <!-- 5. شريط تذييل وحفظ الحقوق الفكرية للشركة المالكة بالشعار والاسم MAQATECH -->
      <div style="margin-top: 20px; border-top: 1.5px solid #cbd5e1; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; color: #475569; page-break-inside: avoid;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="background: #0f172a; color: #60a5fa; font-weight: 900; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-family: sans-serif; border: 1px solid #334155;">MT</span>
          <strong style="color: #0f172a; letter-spacing: 0.5px;">MAQATECH SOFTWARE SOLUTIONS</strong>
        </div>
        <div>
          جميع حقوق الملكية الفكرية والتطوير البرمجي محفوظة لشركة ماقتك للحلول البرمجية (MAQATECH) © 2026
        </div>
      </div>
    </div>
  `;
}

// 5. شاشة تهيئة المعايير والأوزان (Dynamic Criteria View)
function renderCriteriaSettings() {
  const container = document.getElementById('criteria-settings-container');
  if (!container) return;

  const isSuperAdmin = state.currentUser && state.currentUser.role === 'super_admin';

  const cData = state.criteria || {};
  let totalMaxPoints = 0;
  if (cData.seniority && cData.seniority.enabled) totalMaxPoints += (parseInt(cData.seniority.maxPoints) || 10);
  if (cData.age && cData.age.enabled) totalMaxPoints += (parseInt(cData.age.maxPoints) || 5);
  if (cData.specialization && cData.specialization.enabled) totalMaxPoints += (parseInt(cData.specialization.maxPoints) || 5);
  if (cData.grade && cData.grade.enabled) totalMaxPoints += (parseInt(cData.grade.maxPoints) || 5);

  (cData.customCriteria || []).forEach(c => {
    if (c.enabled) totalMaxPoints += (parseInt(c.maxPoints) || 0);
  });

  container.innerHTML = `
    <!-- شريط الفهرس والتنقل المباشر والتحكم في طي/توسيع الجداول والمعايير -->
    <div class="card no-print" style="margin-bottom: 20px; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(10px); border: 1.5px solid rgba(37, 99, 235, 0.4); box-shadow: 0 8px 25px rgba(0,0,0,0.4);">
      <div style="padding: 10px 16px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between;">
        
        <!-- الأزرار السريعة للانتقال المباشر -->
        <div style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
          <span style="font-size: 0.82rem; font-weight: 800; color: #94a3b8; margin-left: 4px;">🚀 انتقل مباشرة إلى:</span>
          <button class="btn btn-sm btn-outline" onclick="scrollToCriteriaSection('sec-criteria-general')" style="font-size: 0.78rem; padding: 4px 10px; border-color: rgba(255,255,255,0.2);">⚙️ الجلسة</button>
          <button class="btn btn-sm btn-outline" onclick="scrollToCriteriaSection('sec-criteria-spec')" style="font-size: 0.78rem; padding: 4px 10px; border-color: rgba(255,255,255,0.2);">🎯 التخصصات</button>
          <button class="btn btn-sm btn-outline" onclick="scrollToCriteriaSection('sec-criteria-seniority')" style="font-size: 0.78rem; padding: 4px 10px; border-color: rgba(255,255,255,0.2);">⏳ الأقدمية</button>
          <button class="btn btn-sm btn-outline" onclick="scrollToCriteriaSection('sec-criteria-age')" style="font-size: 0.78rem; padding: 4px 10px; border-color: rgba(255,255,255,0.2);">👤 العمر</button>
          <button class="btn btn-sm btn-outline" onclick="scrollToCriteriaSection('sec-criteria-grade')" style="font-size: 0.78rem; padding: 4px 10px; border-color: rgba(255,255,255,0.2);">🎓 التقدير</button>
          <button class="btn btn-sm btn-outline" onclick="scrollToCriteriaSection('sec-criteria-all')" style="font-size: 0.78rem; padding: 4px 10px; border-color: #10b981; color: #34d399;">⚖️ الجدول الشامل</button>
          <button class="btn btn-sm btn-outline" onclick="scrollToCriteriaSection('sec-criteria-committee')" style="font-size: 0.78rem; padding: 4px 10px; border-color: rgba(255,255,255,0.2);">✍️ اللجنة</button>
        </div>

        <!-- أزرار الاعتماد وطي وتوسيع كافة الجداول وتصفير السجلات التجريبية -->
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          ${isSuperAdmin ? `
            <button class="btn btn-sm btn-danger" onclick="openLockSessionModal()" style="font-size: 0.78rem; padding: 4px 12px; background: linear-gradient(135deg, #dc2626, #991b1b); color: #ffffff; border: none; font-weight: 800;">
              🔒 اعتماد وإغلاق المفاضلة
            </button>
            <button class="btn btn-sm btn-outline" onclick="resetSystemSessionsHistory()" style="font-size: 0.78rem; padding: 4px 10px; border-color: rgba(239, 68, 68, 0.4); color: #f87171; font-weight: 800;" title="مسح وتصفير تجارب الفتح والإغلاق السابقة للانطلاق بالنواية الحقيقية">
              🧹 تصفير سجلات التجربة
            </button>
          ` : ''}
          <button class="btn btn-sm btn-secondary" onclick="collapseAllCriteriaCards()" style="font-size: 0.78rem; padding: 4px 10px; background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid #f59e0b; font-weight: 800;">
            📁 طي كافة الجداول
          </button>
          <button class="btn btn-sm btn-secondary" onclick="expandAllCriteriaCards()" style="font-size: 0.78rem; padding: 4px 10px; background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid #10b981; font-weight: 800;">
            📂 توسيع كافة الجداول
          </button>
        </div>

      </div>
    </div>

    <!-- 1. إعدادات الجلسة العامة -->
    <div class="card criteria-collapsible-card" id="sec-criteria-general">
      <div class="card-header" onclick="toggleCriteriaCard('sec-criteria-general')" style="cursor: pointer; user-select: none; display: flex; justify-content: space-between; align-items: center;">
        <h3 class="card-title" style="margin: 0;">⚙️ تهيئة إعدادات النظام وتاريخ ومكان المفاضلة ورئاسة الجامعة</h3>
        <span class="card-toggle-icon" style="font-size: 1.1rem; color: var(--primary); transition: transform 0.2s;">🔽</span>
      </div>
      <div class="collapsible-body" style="padding-top: 15px;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 16px;">
          <div class="form-group">
            <label style="font-weight: 700;">عدد منح الماجستير المتاحة:</label>
            <input type="number" id="input-master-grants" class="form-control" value="${state.settings.masterGrantsCount || 3}" ${!isSuperAdmin ? 'disabled' : ''}>
          </div>
          <div class="form-group">
            <label style="font-weight: 700;">عدد منح الدكتوراه المتاحة:</label>
            <input type="number" id="input-phd-grants" class="form-control" value="${state.settings.phdGrantsCount || 3}" ${!isSuperAdmin ? 'disabled' : ''}>
          </div>
          <div class="form-group">
            <label style="font-weight: 700;">السنة المرجعية لاحتساب المفاضلة:</label>
            <input type="number" id="input-ref-year" class="form-control" value="${state.settings.referenceYear || 2026}" ${!isSuperAdmin ? 'disabled' : ''}>
          </div>
          <div class="form-group">
            <label style="font-weight: 700;">اسم رئيس الجامعة الحالي (الجهة المعتمدة):</label>
            <input type="text" id="input-rector-name" class="form-control" value="${state.settings.rectorName || 'أ.د. محمد أحمد البخيتي'}" ${!isSuperAdmin ? 'disabled' : ''}>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
          <div class="form-group">
            <label style="font-weight: 700;">مكان تنفيذ وتطبيق المفاضلة التنافسية:</label>
            <input type="text" id="input-comp-location" class="form-control" value="${state.settings.competitionLocation || 'مقر الأمانة العامة / قاعة اجتماعات مجلس الجامعة الرئيسي - جامعة صنعاء'}" ${!isSuperAdmin ? 'disabled' : ''}>
          </div>
          <div class="form-group">
            <label style="font-weight: 700;">تاريخ ووقت جلسة المفاضلة والفرز الرسمية:</label>
            <input type="text" id="input-comp-date" class="form-control" value="${state.settings.competitionDate || 'شهر اغسطس 2026'}" ${!isSuperAdmin ? 'disabled' : ''}>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label style="font-weight: 700;">عنوان ونوع التطبيق المعتمد للتقرير:</label>
          <input type="text" id="input-app-title" class="form-control" value="${state.settings.applicationTitle || 'نظام المفاضلة والتنافس الإلكتروني لمنتسبي الكادر الإداري لجامعة صنعاء (ماجستير ودكتوراه)'}" ${!isSuperAdmin ? 'disabled' : ''}>
        </div>

        ${isSuperAdmin ? `<button class="btn btn-primary" onclick="saveSettings()">💾 حفظ كود وإعدادات المفاضلة والرئاسة</button>` : ''}
      </div>
    </div>

    <!-- 2. تهيئة أوزان التخصصات -->
    <div class="card criteria-collapsible-card" id="sec-criteria-spec">
      <div class="card-header" onclick="toggleCriteriaCard('sec-criteria-spec')" style="cursor: pointer; user-select: none; display: flex; justify-content: space-between; align-items: center;">
        <h3 class="card-title" style="margin: 0;">🎯 تهيئة أوزان التخصصات والاحتياج</h3>
        <span class="card-toggle-icon" style="font-size: 1.1rem; color: var(--primary); transition: transform 0.2s;">🔽</span>
      </div>
      <div class="collapsible-body" style="padding-top: 15px;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 12px; margin-bottom: 16px;">
          ${state.criteria.specialization.items.map((item, idx) => `
            <div style="display: flex; gap: 8px; align-items: center; background: var(--bg-input); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border);">
              <span style="flex: 1; font-weight: 700;">${item.name}</span>
              <input type="number" class="form-control" style="width: 80px; text-align: center;" value="${item.points}" onchange="updateSpecPoints(${idx}, this.value)" ${!isSuperAdmin ? 'disabled' : ''}>
              <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 6px;">نقطة</span>
              ${isSuperAdmin ? `<button class="btn btn-danger btn-sm" onclick="deleteSpecialization(${idx})" title="حذف هذا التخصص"> حذف</button>` : ''}
            </div>
          `).join('')}
        </div>
        ${isSuperAdmin ? `
          <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center; justify-content: space-between; margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border);">
            <div style="display: flex; gap: 10px; align-items: center; flex: 1;">
              <input type="text" id="new-spec-name" class="form-control" placeholder="اسم تخصص جديد..." style="max-width: 250px;">
              <input type="number" id="new-spec-points" class="form-control" placeholder="النقاط" style="max-width: 100px;">
              <button class="btn btn-secondary" onclick="addSpecialization()"> إضافة تخصص جديد</button>
            </div>
            <button class="btn btn-outline btn-sm" onclick="resetDefaultSpecializations()" title="استعادة القائمة النظيفة (شريعة، حاسوب، اقتصاد، إدارة، أخرى)"> استعادة التخصصات الأساسية</button>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- 3. تهيئة شرائح الأقدمية -->
    <div class="card criteria-collapsible-card" id="sec-criteria-seniority">
      <div class="card-header" onclick="toggleCriteriaCard('sec-criteria-seniority')" style="cursor: pointer; user-select: none; display: flex; justify-content: space-between; align-items: center;">
        <h3 class="card-title" style="margin: 0;">⏳ تهيئة شرائح الأقدمية وتاريخ التعيين التفاعلية</h3>
        <span class="card-toggle-icon" style="font-size: 1.1rem; color: var(--primary); transition: transform 0.2s;">🔽</span>
      </div>
      <div class="collapsible-body" style="padding-top: 15px;">
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 15px;">
          ادخل سنة البداية والنهاية وعدد السنوات (خطوة الفئة) واضغط على زر التوليد التلقائي لإنشاء الفئات فورياً!
        </p>
        
        ${isSuperAdmin ? `
          <div style="background: rgba(37, 99, 235, 0.08); border: 1px solid var(--border-highlight); padding: 16px; border-radius: 10px; margin-bottom: 20px;">
            <h4 style="color: var(--primary); margin-bottom: 10px;"> مولد شرائح الأقدمية التفاعلي التلقائي</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end;">
              <div style="flex: 1; min-width: 130px;">
                <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted);">سنة البداية:</label>
                <input type="number" id="gen-seniority-start" class="form-control" value="${state.criteria.seniority.startYear || 1990}">
              </div>
              <div style="flex: 1; min-width: 130px;">
                <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted);">سنة النهاية:</label>
                <input type="number" id="gen-seniority-end" class="form-control" value="${state.criteria.seniority.endYear || 2030}">
              </div>
              <div style="flex: 1; min-width: 130px;">
                <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted);">خطوة الفئة (بالسنوات):</label>
                <input type="number" id="gen-seniority-step" class="form-control" value="${state.criteria.seniority.stepYears || 5}" min="1" max="20">
              </div>
              <button class="btn btn-primary" onclick="autoGenerateSeniorityBrackets()"> توليد الفئات آلياً</button>
            </div>
          </div>
        ` : ''}

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>الشريحة الوظيفية / مسمى الشريحة</th>
                <th style="width: 130px; text-align: center;">من سنة</th>
                <th style="width: 130px; text-align: center;">إلى سنة</th>
                <th style="width: 120px; text-align: center;">النقاط المخصصة</th>
                ${isSuperAdmin ? '<th style="width: 90px; text-align: center;">الإجراءات</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${(state.criteria.seniority.brackets || []).map((b, idx) => `
                <tr>
                  <td>
                    <input type="text" class="form-control" style="font-weight: 700; min-width: 150px;" value="${b.label || ''}" placeholder="اسم الشريحة" onchange="updateSeniorityBracketField(${idx}, 'label', this.value)" ${!isSuperAdmin ? 'disabled' : ''}>
                  </td>
                  <td style="text-align: center;">
                    <input type="number" class="form-control" style="width: 110px; text-align: center; margin: 0 auto;" value="${b.minYear !== undefined ? b.minYear : ''}" onchange="updateSeniorityBracketField(${idx}, 'minYear', this.value)" ${!isSuperAdmin ? 'disabled' : ''}>
                  </td>
                  <td style="text-align: center;">
                    <input type="number" class="form-control" style="width: 110px; text-align: center; margin: 0 auto;" value="${b.maxYear !== undefined ? b.maxYear : ''}" onchange="updateSeniorityBracketField(${idx}, 'maxYear', this.value)" ${!isSuperAdmin ? 'disabled' : ''}>
                  </td>
                  <td style="text-align: center;">
                    <input type="number" class="form-control" style="width: 100px; text-align: center; margin: 0 auto; font-weight: 700; color: var(--primary);" value="${b.points}" onchange="updateSeniorityBracketField(${idx}, 'points', this.value)" ${!isSuperAdmin ? 'disabled' : ''}>
                  </td>
                  ${isSuperAdmin ? `
                    <td style="text-align: center;">
                      <button class="btn btn-danger btn-sm" onclick="deleteSeniorityBracket(${idx})" title="حذف هذه الشريحة">🗑️ حذف</button>
                    </td>
                  ` : ''}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        ${isSuperAdmin ? `
          <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center; justify-content: space-between; margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border);">
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap; flex: 1;">
              <input type="text" id="new-seniority-label" class="form-control" placeholder="مسمى الشريحة (اختياري)..." style="max-width: 170px;">
              <input type="number" id="new-seniority-min" class="form-control" placeholder="من سنة (مثال: 1990)" style="max-width: 150px;">
              <input type="number" id="new-seniority-max" class="form-control" placeholder="إلى سنة (مثال: 1994)" style="max-width: 150px;">
              <input type="number" id="new-seniority-points" class="form-control" placeholder="النقاط" style="max-width: 90px;">
              <button class="btn btn-secondary" onclick="addSeniorityBracket()">➕ إضافة شريحة جديدة</button>
            </div>
            <button class="btn btn-outline btn-sm" onclick="resetDefaultSeniorityBrackets()" title="استعادة الشرائح الافتراضية المعتمدة">🔄 استعادة الشرائح الأساسية</button>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- 4. تهيئة الفئات العمرية -->
    <div class="card criteria-collapsible-card" id="sec-criteria-age">
      <div class="card-header" onclick="toggleCriteriaCard('sec-criteria-age')" style="cursor: pointer; user-select: none; display: flex; justify-content: space-between; align-items: center;">
        <h3 class="card-title" style="margin: 0;">👤 تهيئة الفئات العمرية التفاعلية</h3>
        <span class="card-toggle-icon" style="font-size: 1.1rem; color: var(--primary); transition: transform 0.2s;">🔽</span>
      </div>
      <div class="collapsible-body" style="padding-top: 15px;">
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 15px;">
          ادخل عمر البداية والنهاية وعدد السنوات (خطوة الفئة) واضغط على زر التوليد التلقائي لإنشاء الشرائح العمرية فورياً!
        </p>

        ${isSuperAdmin ? `
          <div style="background: rgba(13, 148, 136, 0.08); border: 1px solid rgba(13, 148, 136, 0.3); padding: 16px; border-radius: 10px; margin-bottom: 20px;">
            <h4 style="color: var(--secondary); margin-bottom: 10px;"> مولد الشرائح العمرية التفاعلي التلقائي</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end;">
              <div style="flex: 1; min-width: 130px;">
                <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted);">عمر البداية (سنوات):</label>
                <input type="number" id="gen-age-start" class="form-control" value="${state.criteria.age.minAge || 25}">
              </div>
              <div style="flex: 1; min-width: 130px;">
                <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted);">عمر النهاية (سنوات):</label>
                <input type="number" id="gen-age-end" class="form-control" value="${state.criteria.age.maxAge || 56}">
              </div>
              <div style="flex: 1; min-width: 130px;">
                <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted);">خطوة الفئة العمرية (بالسنوات):</label>
                <input type="number" id="gen-age-step" class="form-control" value="${state.criteria.age.stepYears || 5}" min="1" max="20">
              </div>
              <button class="btn btn-secondary" onclick="autoGenerateAgeBrackets()"> توليد الشرائح آلياً</button>
            </div>
          </div>
        ` : ''}

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>الشريحة العمرية</th>
                <th style="width: 130px; text-align: center;">من عمر (سنة)</th>
                <th style="width: 130px; text-align: center;">إلى عمر (سنة)</th>
                <th style="width: 120px; text-align: center;">النقاط المخصصة</th>
                ${isSuperAdmin ? '<th style="width: 90px; text-align: center;">الإجراءات</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${(state.criteria.age.brackets || []).map((b, idx) => `
                <tr>
                  <td>
                    <input type="text" class="form-control" style="font-weight: 700; min-width: 150px;" value="${b.label || ''}" placeholder="اسم الشريحة العمرية" onchange="updateAgeBracketField(${idx}, 'label', this.value)" ${!isSuperAdmin ? 'disabled' : ''}>
                  </td>
                  <td style="text-align: center;">
                    <input type="number" class="form-control" style="width: 110px; text-align: center; margin: 0 auto;" value="${b.minAge !== undefined ? b.minAge : ''}" onchange="updateAgeBracketField(${idx}, 'minAge', this.value)" ${!isSuperAdmin ? 'disabled' : ''}>
                  </td>
                  <td style="text-align: center;">
                    <input type="number" class="form-control" style="width: 110px; text-align: center; margin: 0 auto;" value="${b.maxAge !== undefined ? b.maxAge : ''}" onchange="updateAgeBracketField(${idx}, 'maxAge', this.value)" ${!isSuperAdmin ? 'disabled' : ''}>
                  </td>
                  <td style="text-align: center;">
                    <input type="number" class="form-control" style="width: 100px; text-align: center; margin: 0 auto; font-weight: 700; color: var(--secondary);" value="${b.points}" onchange="updateAgeBracketField(${idx}, 'points', this.value)" ${!isSuperAdmin ? 'disabled' : ''}>
                  </td>
                  ${isSuperAdmin ? `
                    <td style="text-align: center;">
                      <button class="btn btn-danger btn-sm" onclick="deleteAgeBracket(${idx})" title="حذف هذه الشريحة العمرية">🗑️ حذف</button>
                    </td>
                  ` : ''}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        ${isSuperAdmin ? `
          <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center; justify-content: space-between; margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border);">
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap; flex: 1;">
              <input type="text" id="new-age-label" class="form-control" placeholder="مسمى الشريحة (اختياري)..." style="max-width: 170px;">
              <input type="number" id="new-age-min" class="form-control" placeholder="من عمر (مثال: 35)" style="max-width: 150px;">
              <input type="number" id="new-age-max" class="form-control" placeholder="إلى عمر (مثال: 39)" style="max-width: 150px;">
              <input type="number" id="new-age-points" class="form-control" placeholder="النقاط" style="max-width: 90px;">
              <button class="btn btn-secondary" onclick="addAgeBracket()">➕ إضافة شريحة عمرية</button>
            </div>
            <button class="btn btn-outline btn-sm" onclick="resetDefaultAgeBrackets()" title="استعادة الشرائح الافتراضية المعتمدة">🔄 استعادة الشرائح الأساسية</button>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- 5. تهيئة أوزان تقدير البكالوريوس -->
    <div class="card criteria-collapsible-card" id="sec-criteria-grade">
      <div class="card-header" onclick="toggleCriteriaCard('sec-criteria-grade')" style="cursor: pointer; user-select: none; display: flex; justify-content: space-between; align-items: center;">
        <h3 class="card-title" style="margin: 0;">🎓 تهيئة أوزان تقدير ومعدل البكالوريوس</h3>
        <span class="card-toggle-icon" style="font-size: 1.1rem; color: var(--primary); transition: transform 0.2s;">🔽</span>
      </div>
      <div class="collapsible-body" style="padding-top: 15px;">
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 15px;">
          حدد النقاط المخصصة لكل تقدير أكاديمي في مؤهل البكالوريوس/المؤهل السابق.
        </p>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
          ${state.criteria.grade.items.map((item, idx) => `
            <div style="display: flex; gap: 8px; align-items: center; background: var(--bg-input); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border);">
              <span style="flex: 1; font-weight: 700;">${item.name}</span>
              <input type="number" class="form-control" style="width: 80px; text-align: center;" value="${item.points}" onchange="updateGradeItemPoints(${idx}, this.value)" ${!isSuperAdmin ? 'disabled' : ''}>
              <span style="font-size: 0.8rem; color: var(--text-muted);">نقطة</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- 6. جدول المنظومة الشامل لكافة المعايير -->
    <div class="card criteria-collapsible-card" id="sec-criteria-all">
      <div class="card-header" onclick="toggleCriteriaCard('sec-criteria-all')" style="cursor: pointer; user-select: none; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <h3 class="card-title" style="margin: 0;">⚖️ جدول منظومة معايير المفاضلة الشامل (الأساسية والمخصصة)</h3>
          <span class="card-toggle-icon" style="font-size: 1.1rem; color: var(--primary); transition: transform 0.2s;">🔽</span>
        </div>
        <div style="background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; padding: 6px 16px; border-radius: 20px; font-weight: 900; font-size: 0.88rem; box-shadow: 0 4px 15px rgba(16,185,129,0.3);">
          🏆 إجمالي سقف منظومة المفاضلة الحالية: ${totalMaxPoints} نقطة
        </div>
      </div>
      <div class="collapsible-body" style="padding-top: 15px;">
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 15px;">
          يعرض هذا الجدول جميع المعايير المعتمدة في النظام (المعايير الأساسية الـ 4 + المعايير المخصصة المصنعة)، ويوفر تحكماً كاملاً بأوزانها وحالة تفعيلها!
        </p>

        ${isSuperAdmin ? `
          <div style="background: rgba(245,158,11,0.06); border: 1.5px solid rgba(245,158,11,0.35); padding: 18px; border-radius: 12px; margin-bottom: 20px;">
            <h4 style="color: #f59e0b; margin-bottom: 14px; font-size: 0.95rem; font-weight: 900;">🛠️ تصميم وإنشاء معيار تنافسي مخصص جديد</h4>

            <!-- السطر الأول: الاسم + الوزن + النوع + نطاق التطبيق -->
            <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end; margin-bottom: 12px;">
              <div style="flex: 2; min-width: 200px;">
                <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted);">اسم المعيار الجديد:</label>
                <input type="text" id="new-custom-criterion-name" class="form-control" placeholder="مثال: الممارسة الفعلية، تقييم الأداء...">
              </div>
              <div style="flex: 1.5; min-width: 150px;">
                <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted);">نطاق التفعيل:</label>
                <select id="new-custom-criterion-scope" class="form-control" style="font-weight:700;">
                  <option value="all">مُفعّل للماجستير والدكتوراه</option>
                  <option value="master">مُفعّل للماجستير فقط</option>
                  <option value="phd">مُفعّل للدكتوراه فقط</option>
                  <option value="none">معطّل كلياً</option>
                </select>
              </div>
              <div style="flex: 1; min-width: 100px;">
                <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted);">الوزن الأقصى:</label>
                <input type="number" id="new-custom-criterion-points" class="form-control" placeholder="مثال: 5" value="5" min="1">
              </div>
              <div style="flex: 1.5; min-width: 180px;">
                <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted);">نوع مؤشر الاحتساب:</label>
                <select id="new-custom-criterion-type" class="form-control" onchange="renderCustomCriterionTypeConfig()" style="font-weight:700;">
                  <option value="binary">🔵 ثنائي (مستمر / متاح)</option>
                  <option value="grade">🟡 تقديري (ممتاز / جيد / ...)</option>
                  <option value="bracket">🟠 شريحي (مجالات رقمية)</option>
                  <option value="numeric">🟣 كمي مباشر (عدد × معامل)</option>
                </select>
              </div>
            </div>

            <!-- منطقة الإعدادات الديناميكية حسب النوع -->
            <div id="custom-criterion-type-config" style="margin-bottom: 12px;">
              <div style="background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.3); padding: 12px; border-radius: 8px;">
                <div style="font-size: 0.82rem; color: #93c5fd; font-weight: 800; margin-bottom: 10px;">🔵 حدد خيارَي هذا المعيار واكتب وصفهما وأوزانهما بحرية تامة:</div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <div class="binary-option-row" style="display: flex; gap: 8px; align-items: center;">
                    <span style="color: #64748b; font-size: 0.75rem; min-width: 72px; text-align: center; background: rgba(59,130,246,0.15); padding: 3px 6px; border-radius: 4px;">الخيار الأول</span>
                    <input type="text" class="form-control binary-label" placeholder="مثال: مستمر، نعم، طويل، أسود..." style="flex: 2; border: 1px solid rgba(59,130,246,0.5);">
                    <input type="number" class="form-control binary-pts" placeholder="نقاط" min="0" style="flex: 1; max-width: 85px; border: 1px solid rgba(59,130,246,0.5);">
                  </div>
                  <div class="binary-option-row" style="display: flex; gap: 8px; align-items: center;">
                    <span style="color: #64748b; font-size: 0.75rem; min-width: 72px; text-align: center; background: rgba(239,68,68,0.1); padding: 3px 6px; border-radius: 4px;">الخيار الثاني</span>
                    <input type="text" class="form-control binary-label" placeholder="مثال: متاح، لا، قصير، أبيض..." style="flex: 2; border: 1px solid rgba(239,68,68,0.4);">
                    <input type="number" class="form-control binary-pts" placeholder="نقاط" min="0" style="flex: 1; max-width: 85px; border: 1px solid rgba(239,68,68,0.4);">
                  </div>
                </div>
                <div style="font-size: 0.72rem; color: #64748b; margin-top: 8px;">💡 يمكنك ترك الحقول فارغة وسيتم اعتماد التسمية الافتراضية (مستمر / متاح) تلقائياً</div>
              </div>
            </div>

            <button class="btn btn-secondary" onclick="addCustomCriterion()" style="font-weight: 900;">➕ إضافة المعيار للنظام</button>
          </div>
        ` : ''}

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 5%;">م</th>
                <th>اسم المعيار التنافسي</th>
                <th style="width: 15%;">تصنيف المعيار</th>
                <th style="width: 16%; text-align: center;">الوزن / النقاط القصوى</th>
                <th style="width: 15%; text-align: center;">حالة المعيار</th>
                <th style="width: 18%; text-align: center;">الإجراءات والتحكم</th>
              </tr>
            </thead>
            <tbody>
              <!-- 1. معيار الأقدمية -->
              <tr>
                <td style="text-align: center; font-weight: bold;">1</td>
                <td><strong>تاريخ التعيين بالخدمة والجامعة (الأقدمية)</strong></td>
                <td><span class="badge-status" style="background: rgba(37,99,235,0.15); color: #60a5fa; border: 1px solid #2563eb;">معيار أساسي</span></td>
                <td style="text-align: center;">
                  <input type="number" class="form-control" style="width: 90px; text-align: center; margin: 0 auto;" value="${cData.seniority ? (cData.seniority.maxPoints || 10) : 10}" onchange="updateCoreCriterionMaxPoints('seniority', this.value)" ${!isSuperAdmin ? 'disabled' : ''}>
                </td>
                <td style="text-align: center;">
                  ${renderScopeBadge(getCriterionTargetDegree(cData.seniority))}
                </td>
                <td style="text-align: center;">
                  ${isSuperAdmin ? `
                    <select class="form-control form-control-sm" style="width: 130px; display: inline-block; font-size: 0.78rem; font-weight: 700; background: rgba(15, 23, 42, 0.6); color: #f8fafc; border-color: rgba(255,255,255,0.2);" onchange="updateCriterionTargetDegree('seniority', this.value)">
                      <option value="all" ${getCriterionTargetDegree(cData.seniority) === 'all' ? 'selected' : ''}>مُفعّل للكل</option>
                      <option value="master" ${getCriterionTargetDegree(cData.seniority) === 'master' ? 'selected' : ''}>ماجستير فقط</option>
                      <option value="phd" ${getCriterionTargetDegree(cData.seniority) === 'phd' ? 'selected' : ''}>دكتوراه فقط</option>
                      <option value="none" ${getCriterionTargetDegree(cData.seniority) === 'none' ? 'selected' : ''}>معطّل كلياً</option>
                    </select>
                    <button class="btn btn-warning btn-sm" onclick="editCriterion('seniority')">تعديل</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteCriterion('seniority')">حذف</button>
                  ` : '-'}
                </td>
              </tr>

              <!-- 2. معيار العمر -->
              <tr>
                <td style="text-align: center; font-weight: bold;">2</td>
                <td><strong>الفئة العمرية للموظف المتنافس (العمر)</strong></td>
                <td><span class="badge-status" style="background: rgba(37,99,235,0.15); color: #60a5fa; border: 1px solid #2563eb;">معيار أساسي</span></td>
                <td style="text-align: center;">
                  <input type="number" class="form-control" style="width: 90px; text-align: center; margin: 0 auto;" value="${cData.age ? (cData.age.maxPoints || 5) : 5}" onchange="updateCoreCriterionMaxPoints('age', this.value)" ${!isSuperAdmin ? 'disabled' : ''}>
                </td>
                <td style="text-align: center;">
                  ${renderScopeBadge(getCriterionTargetDegree(cData.age))}
                </td>
                <td style="text-align: center;">
                  ${isSuperAdmin ? `
                    <select class="form-control form-control-sm" style="width: 130px; display: inline-block; font-size: 0.78rem; font-weight: 700; background: rgba(15, 23, 42, 0.6); color: #f8fafc; border-color: rgba(255,255,255,0.2);" onchange="updateCriterionTargetDegree('age', this.value)">
                      <option value="all" ${getCriterionTargetDegree(cData.age) === 'all' ? 'selected' : ''}>مُفعّل للكل</option>
                      <option value="master" ${getCriterionTargetDegree(cData.age) === 'master' ? 'selected' : ''}>ماجستير فقط</option>
                      <option value="phd" ${getCriterionTargetDegree(cData.age) === 'phd' ? 'selected' : ''}>دكتوراه فقط</option>
                      <option value="none" ${getCriterionTargetDegree(cData.age) === 'none' ? 'selected' : ''}>معطّل كلياً</option>
                    </select>
                    <button class="btn btn-warning btn-sm" onclick="editCriterion('age')">تعديل</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteCriterion('age')">حذف</button>
                  ` : '-'}
                </td>
              </tr>

              <!-- 3. معيار التخصص -->
              <tr>
                <td style="text-align: center; font-weight: bold;">3</td>
                <td><strong>مدى احتياج الجامعة للتخصص الدراسي</strong></td>
              <td><span class="badge-status" style="background: rgba(37,99,235,0.15); color: #60a5fa; border: 1px solid #2563eb;">معيار أساسي</span></td>
              <td style="text-align: center;">
                <input type="number" class="form-control" style="width: 90px; text-align: center; margin: 0 auto;" value="${cData.specialization ? (cData.specialization.maxPoints || 5) : 5}" onchange="updateCoreCriterionMaxPoints('specialization', this.value)" ${!isSuperAdmin ? 'disabled' : ''}>
              </td>
              <td style="text-align: center;">
                ${renderScopeBadge(getCriterionTargetDegree(cData.specialization))}
              </td>
              <td style="text-align: center;">
                ${isSuperAdmin ? `
                  <select class="form-control form-control-sm" style="width: 130px; display: inline-block; font-size: 0.78rem; font-weight: 700; background: rgba(15, 23, 42, 0.6); color: #f8fafc; border-color: rgba(255,255,255,0.2);" onchange="updateCriterionTargetDegree('specialization', this.value)">
                    <option value="all" ${getCriterionTargetDegree(cData.specialization) === 'all' ? 'selected' : ''}>مُفعّل للكل</option>
                    <option value="master" ${getCriterionTargetDegree(cData.specialization) === 'master' ? 'selected' : ''}>ماجستير فقط</option>
                    <option value="phd" ${getCriterionTargetDegree(cData.specialization) === 'phd' ? 'selected' : ''}>دكتوراه فقط</option>
                    <option value="none" ${getCriterionTargetDegree(cData.specialization) === 'none' ? 'selected' : ''}>معطّل كلياً</option>
                  </select>
                  <button class="btn btn-warning btn-sm" onclick="editCriterion('specialization')">تعديل</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteCriterion('specialization')">حذف</button>
                ` : '-'}
              </td>
            </tr>

            <!-- 4. معيار التقدير -->
            <tr>
              <td style="text-align: center; font-weight: bold;">4</td>
              <td><strong>تقدير المؤهل الأكاديمي السابق (التقدير)</strong></td>
              <td><span class="badge-status" style="background: rgba(37,99,235,0.15); color: #60a5fa; border: 1px solid #2563eb;">معيار أساسي</span></td>
              <td style="text-align: center;">
                <input type="number" class="form-control" style="width: 90px; text-align: center; margin: 0 auto;" value="${cData.grade ? (cData.grade.maxPoints || 5) : 5}" onchange="updateCoreCriterionMaxPoints('grade', this.value)" ${!isSuperAdmin ? 'disabled' : ''}>
              </td>
              <td style="text-align: center;">
                ${renderScopeBadge(getCriterionTargetDegree(cData.grade))}
              </td>
              <td style="text-align: center;">
                ${isSuperAdmin ? `
                  <select class="form-control form-control-sm" style="width: 130px; display: inline-block; font-size: 0.78rem; font-weight: 700; background: rgba(15, 23, 42, 0.6); color: #f8fafc; border-color: rgba(255,255,255,0.2);" onchange="updateCriterionTargetDegree('grade', this.value)">
                    <option value="all" ${getCriterionTargetDegree(cData.grade) === 'all' ? 'selected' : ''}>مُفعّل للكل</option>
                    <option value="master" ${getCriterionTargetDegree(cData.grade) === 'master' ? 'selected' : ''}>ماجستير فقط</option>
                    <option value="phd" ${getCriterionTargetDegree(cData.grade) === 'phd' ? 'selected' : ''}>دكتوراه فقط</option>
                    <option value="none" ${getCriterionTargetDegree(cData.grade) === 'none' ? 'selected' : ''}>معطّل كلياً</option>
                  </select>
                  <button class="btn btn-warning btn-sm" onclick="editCriterion('grade')">تعديل</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteCriterion('grade')">حذف</button>
                ` : '-'}
              </td>
            </tr>

            <!-- 5. المعايير المخصصة الإضافية -->
            ${(cData.customCriteria || []).map((c, idx) => {
              const typeLabels = {
                binary: '🔵 ثنائي',
                grade: '🟡 تقديري',
                bracket: '🟠 شريحي',
                numeric: '🟣 كمي مباشر'
              };
              const typeLabel = typeLabels[c.indicatorType || 'binary'] || '🔵 ثنائي';
              const cScope = getCriterionTargetDegree(c);
              return `
              <tr>
                <td style="text-align: center; font-weight: bold;">${idx + 5}</td>
                <td>
                  <strong>${c.name}</strong>
                  <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 2px;">${typeLabel}</div>
                </td>
                <td><span class="badge-status" style="background: rgba(245,158,11,0.15); color: #fbbf24; border: 1px solid #f59e0b;">معيار مخصص</span></td>
                <td style="text-align: center;">
                  <input type="number" class="form-control" style="width: 90px; text-align: center; margin: 0 auto;" value="${c.maxPoints}" onchange="updateCustomCriterionPoints('${c.id}', this.value)" ${!isSuperAdmin ? 'disabled' : ''}>
                </td>
                <td style="text-align: center;">
                  ${renderScopeBadge(cScope)}
                </td>
                <td style="text-align: center;">
                  ${isSuperAdmin ? `
                    <select class="form-control form-control-sm" style="width: 130px; display: inline-block; font-size: 0.78rem; font-weight: 700; background: rgba(15, 23, 42, 0.6); color: #f8fafc; border-color: rgba(255,255,255,0.2);" onchange="updateCriterionTargetDegree('${c.id}', this.value)">
                      <option value="all" ${cScope === 'all' ? 'selected' : ''}>مُفعّل للكل</option>
                      <option value="master" ${cScope === 'master' ? 'selected' : ''}>ماجستير فقط</option>
                      <option value="phd" ${cScope === 'phd' ? 'selected' : ''}>دكتوراه فقط</option>
                      <option value="none" ${cScope === 'none' ? 'selected' : ''}>معطّل كلياً</option>
                    </select>
                    <button class="btn btn-warning btn-sm" onclick="editCriterion('${c.id}')">تعديل</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteCustomCriterion('${c.id}')">حذف</button>
                  ` : '-'}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- تهيئة أعضاء لجنة المفاضلة والتوقيعات الرسمية -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title"> تهيئة أعضاء لجنة المفاضلة والتوقيعات الرسمية</h3>
      </div>
      <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 15px;">
        حدد عدد أعضاء اللجنة وأدخل أسماءهم وصفاتهم الإدارية وتكليفهم في اللجنة لتظهر تلقائياً في خانة التوقيعات الرسمية بالتقرير الفخم.
      </p>

      ${isSuperAdmin ? `
        <div style="background: rgba(37, 99, 235, 0.08); border: 1px solid var(--border-highlight); padding: 16px; border-radius: 10px; margin-bottom: 20px; display: flex; gap: 15px; align-items: flex-end; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 150px;">
            <label style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted);">عدد أعضاء اللجنة:</label>
            <input type="number" id="input-committee-count" class="form-control" value="${(state.committeeMembers || []).length}" min="1" max="15">
          </div>
          <div style="flex: 1.5; min-width: 240px;">
            <label style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted);">اسم رئيس الجامعة (يعتمد رئيس الجامعة):</label>
            <input type="text" class="form-control" value="${state.settings.rectorName || 'أ.د. محمد أحمد البخيتي'}" placeholder="أ.د. محمد أحمد البخيتي" onchange="updateRectorName(this.value)">
          </div>
          <button class="btn btn-primary" onclick="setCommitteeMembersCountFromInput()"> إنتاج جدول الأعضاء</button>
          <button class="btn btn-secondary" onclick="addCommitteeMember()"> إضافة عضو جديد</button>
        </div>
      ` : ''}

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 5%;">م</th>
              <th style="width: 30%;">اسم العضو الرباعي</th>
              <th style="width: 30%;">الصفة الإدارية (مثل: رئيس الجامعة...)</th>
              <th style="width: 25%;">الصفة في اللجنة (مثل: رئيس اللجنة...)</th>
              <th style="width: 10%;">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${(state.committeeMembers || []).map((m, idx) => `
              <tr>
                <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
                <td>
                  <input type="text" class="form-control" value="${m.name || ''}" placeholder="اسم العضو..." onchange="updateCommitteeMember(${idx}, 'name', this.value)" ${!isSuperAdmin ? 'disabled' : ''}>
                </td>
                <td>
                  <input type="text" class="form-control" value="${m.adminTitle || ''}" placeholder="الصفة الإدارية..." onchange="updateCommitteeMember(${idx}, 'adminTitle', this.value)" ${!isSuperAdmin ? 'disabled' : ''}>
                </td>
                <td>
                  <input type="text" class="form-control" value="${m.committeeRole || ''}" placeholder="الصفة في اللجنة..." onchange="updateCommitteeMember(${idx}, 'committeeRole', this.value)" ${!isSuperAdmin ? 'disabled' : ''}>
                </td>
                <td>
                  ${isSuperAdmin ? `<button class="btn btn-danger btn-sm" onclick="deleteCommitteeMember(${idx})" title="حذف العضو"> حذف</button>` : '-'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    ${isSuperAdmin ? `
      <div style="position: sticky; bottom: 20px; background: var(--bg-card); border: 2px solid var(--primary); padding: 16px 24px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); display: flex; justify-content: space-between; align-items: center; backdrop-filter: blur(16px); z-index: 99; margin-top: 20px;">
        <div>
          <strong style="color: var(--text-main); font-size: 1.05rem;"> حفظ كافة التعديلات والأوزان المعيارية</strong>
          <p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 2px;">اضغط هنا لحفظ أي تعديلات قمت بها على النقاط والشرائح والأوزان المعيارية في النظام.</p>
        </div>
        <button class="btn btn-primary" style="padding: 10px 24px; font-size: 1rem; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);" onclick="saveAllCriteriaAndSettings()"> حفظ كافة التعديلات والأوزان الآن</button>
      </div>
    ` : ''}
  `;
}

// 6. شاشة إدارة النظام والصلاحيات (User Administration View)
function saveSupabaseSettingsFromUI() {
  const urlInput = document.getElementById('supabase-url-input');
  const keyInput = document.getElementById('supabase-key-input');

  if (!urlInput || !keyInput) return;

  const url = urlInput.value.trim();
  const key = keyInput.value.trim();

  state.settings.supabaseUrl = url;
  state.settings.supabaseKey = key;
  saveStore();

  const isConnected = initSupabase();
  const badge = document.getElementById('supabase-status-badge');
  if (badge) {
    if (isConnected) {
      badge.className = 'status-badge status-accepted';
      badge.innerText = '✅ متصل بـ Supabase أونلاين';
      alert('✅ تم حفظ إعدادات Supabase والاتصال بنجاح!');
    } else if (url || key) {
      badge.className = 'status-badge status-rejected';
      badge.innerText = '⚠️ تعذر الاتصال (تأكد من المفتاح والنطاق)';
      alert('⚠️ تم الحفظ لكن تعذر الاتصال بـ Supabase. يرجى التأكد من صحة الـ URL والـ API Key.');
    } else {
      badge.className = 'status-badge status-reserve';
      badge.innerText = 'غير متصل (وضع التخزين المحلي)';
    }
  }
}

function renderUsersAdminTable() {
  // ملء مدخلات Supabase
  const urlInput = document.getElementById('supabase-url-input');
  const keyInput = document.getElementById('supabase-key-input');
  const badge = document.getElementById('supabase-status-badge');

  if (urlInput && state.settings.supabaseUrl) urlInput.value = state.settings.supabaseUrl;
  if (keyInput && state.settings.supabaseKey) keyInput.value = state.settings.supabaseKey;

  if (badge) {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      badge.className = 'status-badge status-accepted';
      badge.innerText = '✅ متصل بـ Supabase أونلاين';
    } else if (state.settings.supabaseUrl || state.settings.supabaseKey) {
      const conn = (typeof initSupabase !== 'undefined') ? initSupabase() : false;
      if (conn) {
        badge.className = 'status-badge status-accepted';
        badge.innerText = '✅ متصل بـ Supabase أونلاين';
      } else {
        badge.className = 'status-badge status-rejected';
        badge.innerText = '⚠️ خطأ في الاتصال بـ Supabase';
      }
    } else {
      badge.className = 'status-badge status-reserve';
      badge.innerText = 'غير متصل (وضع التخزين المحلي)';
    }
  }

  const tbody = document.getElementById('users-admin-tbody');
  if (!tbody) return;

  tbody.innerHTML = state.users.map((u, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td><strong>${u.name}</strong></td>
      <td><code>${u.username}</code></td>
      <td><code style="color: var(--primary); font-weight: bold;">${u.password || '••••••'}</code></td>
      <td><span class="user-role-tag">${u.title || getRoleTitle(u.role)}</span></td>
      <td>
        <span class="badge-status badge-accepted">نشط</span>
      </td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="editUser(${u.id})">تعديل</button>
        ${u.id === 1 ? '' : `<button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id})">حذف</button>`}
      </td>
    </tr>
  `).join('');
}

// أحداث التفاعل والأزرار
function setupEventListeners() {
  // التنقل بين الأبواب Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      document.getElementById(targetId).classList.add('active');
    });
  });

  // البحث والفلترة ومزامنة خيارات الدرجة
  const searchInput = document.getElementById('search-candidates');
  if (searchInput) searchInput.addEventListener('input', renderCandidatesTable);

  const degreeFilter = document.getElementById('filter-degree');
  const printCardsDegree = document.getElementById('select-print-cards-degree');

  if (degreeFilter) {
    degreeFilter.addEventListener('change', () => {
      if (printCardsDegree) printCardsDegree.value = degreeFilter.value;
      renderCandidatesTable();
    });
  }

  if (printCardsDegree) {
    printCardsDegree.addEventListener('change', () => {
      if (degreeFilter) degreeFilter.value = printCardsDegree.value;
      renderCandidatesTable();
    });
  }

  const rankingsFilter = document.getElementById('filter-rankings-degree');
  if (rankingsFilter) rankingsFilter.addEventListener('change', renderScoringTable);

  const reportFilter = document.getElementById('report-degree-filter');
  if (reportFilter) reportFilter.addEventListener('change', renderDetailedReport);
}

// وظائف الحفظ والتعديل
function saveSettings() {
  if (checkSystemLockGuard()) return;
  const masterGrants = parseInt(document.getElementById('input-master-grants').value) || 3;
  const phdGrants = parseInt(document.getElementById('input-phd-grants').value) || 3;
  const refYear = parseInt(document.getElementById('input-ref-year').value) || 2026;
  const rectorName = document.getElementById('input-rector-name') ? document.getElementById('input-rector-name').value.trim() : 'أ.د. محمد أحمد البخيتي';
  const compLocation = document.getElementById('input-comp-location') ? document.getElementById('input-comp-location').value.trim() : '';
  const compDate = document.getElementById('input-comp-date') ? document.getElementById('input-comp-date').value.trim() : '';
  const appTitle = document.getElementById('input-app-title') ? document.getElementById('input-app-title').value.trim() : '';

  state.settings.masterGrantsCount = masterGrants;
  state.settings.phdGrantsCount = phdGrants;
  state.settings.referenceYear = refYear;
  state.settings.rectorName = rectorName || 'أ.د. محمد أحمد البخيتي';
  state.settings.competitionLocation = compLocation || 'مقر الأمانة العامة / قاعة اجتماعات مجلس الجامعة الرئيسي - جامعة صنعاء';
  state.settings.sessionLocation = state.settings.competitionLocation;
  state.settings.competitionDate = compDate || 'شهر اغسطس 2026';
  state.settings.sessionDate = state.settings.competitionDate;
  state.settings.applicationTitle = appTitle || 'نظام المفاضلة والتنافس الإلكتروني لمنتسبي الكادر الإداري لجامعة صنعاء (ماجستير ودكتوراه)';

  saveStore();
  if (typeof syncSettingsToSupabase === 'function') syncSettingsToSupabase(state.settings);
  refreshAllViews();
  alert('✅ تم حفظ إعدادات المفاضلة والرئاسة ونوع التطبيق بنجاح!');
}

function updateSpecPoints(index, points) {
  state.criteria.specialization.items[index].points = parseFloat(points) || 0;
  saveStore();
  refreshAllViews();
}

function addSpecialization() {
  const name = document.getElementById('new-spec-name').value.trim();
  const points = parseFloat(document.getElementById('new-spec-points').value) || 0;

  if (!name) {
    alert('يرجى كتابة اسم التخصص');
    return;
  }

  state.criteria.specialization.items.push({ name, points });
  saveStore();
  refreshAllViews();
  alert(`تم إضافة التخصص (${name}) بنجاح!`);
}

function deleteSpecialization(index) {
  const spec = state.criteria.specialization.items[index];
  if (!spec) return;

  if (confirm(`هل أنت تأكد من رغبتك في حذف تخصص (${spec.name})؟`)) {
    state.criteria.specialization.items.splice(index, 1);
    saveStore();
    refreshAllViews();
  }
}

function resetDefaultSpecializations() {
  if (confirm('هل ترغب في استعادة قائمة التخصصات الأساسية المعتمدة مع نقاط الاحتياج؟')) {
    state.criteria.specialization.items = [
      { name: 'شريعة وقانون', points: 5 },
      { name: 'علوم حاسوب', points: 5 },
      { name: 'اقتصاد ومحاسبة', points: 4 },
      { name: 'إدارة عامة', points: 4 },
      { name: 'إدارة أعمال', points: 3 },
      { name: 'أخرى', points: 2 }
    ];
    saveStore();
    refreshAllViews();
  }
}

// --- دوال إدارة وتعديل شرائح الأقدمية وتاريخ التعيين ---
function updateSeniorityBracketField(index, field, value) {
  if (!state.criteria || !state.criteria.seniority || !state.criteria.seniority.brackets || !state.criteria.seniority.brackets[index]) return;
  if (field === 'points' || field === 'minYear' || field === 'maxYear') {
    state.criteria.seniority.brackets[index][field] = parseFloat(value) || 0;
  } else {
    state.criteria.seniority.brackets[index][field] = value;
  }
  saveStore();
  if (typeof syncCriteriaToSupabase === 'function') syncCriteriaToSupabase(state.criteria);
  refreshAllViews();
}

function updateSeniorityBracketPoints(index, points) {
  updateSeniorityBracketField(index, 'points', points);
}

function deleteSeniorityBracket(index) {
  if (!state.criteria || !state.criteria.seniority || !state.criteria.seniority.brackets || !state.criteria.seniority.brackets[index]) return;
  const b = state.criteria.seniority.brackets[index];
  const label = b.label || `${b.minYear} - ${b.maxYear}م`;
  if (confirm(`هل أنت متأكد من رغبتك في حذف شريحة الأقدمية (${label})؟`)) {
    state.criteria.seniority.brackets.splice(index, 1);
    saveStore();
    if (typeof syncCriteriaToSupabase === 'function') syncCriteriaToSupabase(state.criteria);
    refreshAllViews();
  }
}

function addSeniorityBracket() {
  const minYearInput = document.getElementById('new-seniority-min');
  const maxYearInput = document.getElementById('new-seniority-max');
  const pointsInput = document.getElementById('new-seniority-points');
  const labelInput = document.getElementById('new-seniority-label');

  const minYear = parseInt(minYearInput ? minYearInput.value : '');
  const maxYear = parseInt(maxYearInput ? maxYearInput.value : '');
  const points = parseFloat(pointsInput ? pointsInput.value : 0) || 0;
  let label = labelInput ? labelInput.value.trim() : '';

  if (isNaN(minYear) || isNaN(maxYear)) {
    alert('يرجى تحديد سنة البداية وسنة النهاية للشريحة.');
    return;
  }
  if (minYear > maxYear) {
    alert('سنة البداية يجب أن تكون أقل من أو تساوي سنة النهاية.');
    return;
  }
  if (!label) {
    label = (minYear === maxYear) ? `${minYear}م` : `${minYear} - ${maxYear}م`;
  }

  if (!state.criteria) state.criteria = {};
  if (!state.criteria.seniority) state.criteria.seniority = {};
  if (!state.criteria.seniority.brackets) state.criteria.seniority.brackets = [];

  state.criteria.seniority.brackets.push({
    label,
    minYear,
    maxYear,
    points
  });

  // فرز تصاعدي حسب سنة البداية
  state.criteria.seniority.brackets.sort((a, b) => a.minYear - b.minYear);

  // مسح المدخلات
  if (minYearInput) minYearInput.value = '';
  if (maxYearInput) maxYearInput.value = '';
  if (pointsInput) pointsInput.value = '';
  if (labelInput) labelInput.value = '';

  saveStore();
  if (typeof syncCriteriaToSupabase === 'function') syncCriteriaToSupabase(state.criteria);
  refreshAllViews();
  alert(`تم إضافة الشريحة الوظيفية (${label}) بنجاح!`);
}

function resetDefaultSeniorityBrackets() {
  if (confirm('هل ترغب في استعادة شرائح الأقدمية الافتراضية المعتمدة؟')) {
    if (typeof DEFAULT_CRITERIA !== 'undefined' && DEFAULT_CRITERIA.seniority && DEFAULT_CRITERIA.seniority.brackets) {
      state.criteria.seniority.brackets = JSON.parse(JSON.stringify(DEFAULT_CRITERIA.seniority.brackets));
    }
    saveStore();
    if (typeof syncCriteriaToSupabase === 'function') syncCriteriaToSupabase(state.criteria);
    refreshAllViews();
  }
}

// --- دوال إدارة وتعديل الشرائح العمرية ---
function updateAgeBracketField(index, field, value) {
  if (!state.criteria || !state.criteria.age || !state.criteria.age.brackets || !state.criteria.age.brackets[index]) return;
  if (field === 'points' || field === 'minAge' || field === 'maxAge') {
    state.criteria.age.brackets[index][field] = parseFloat(value) || 0;
  } else {
    state.criteria.age.brackets[index][field] = value;
  }
  saveStore();
  if (typeof syncCriteriaToSupabase === 'function') syncCriteriaToSupabase(state.criteria);
  refreshAllViews();
}

function updateAgeBracketPoints(index, points) {
  updateAgeBracketField(index, 'points', points);
}

function deleteAgeBracket(index) {
  if (!state.criteria || !state.criteria.age || !state.criteria.age.brackets || !state.criteria.age.brackets[index]) return;
  const b = state.criteria.age.brackets[index];
  const label = b.label || `${b.minAge} - ${b.maxAge} سنة`;
  if (confirm(`هل أنت متأكد من رغبتك في حذف الشريحة العمرية (${label})؟`)) {
    state.criteria.age.brackets.splice(index, 1);
    saveStore();
    if (typeof syncCriteriaToSupabase === 'function') syncCriteriaToSupabase(state.criteria);
    refreshAllViews();
  }
}

function addAgeBracket() {
  const minAgeInput = document.getElementById('new-age-min');
  const maxAgeInput = document.getElementById('new-age-max');
  const pointsInput = document.getElementById('new-age-points');
  const labelInput = document.getElementById('new-age-label');

  const minAge = parseInt(minAgeInput ? minAgeInput.value : '');
  const maxAge = parseInt(maxAgeInput ? maxAgeInput.value : '');
  const points = parseFloat(pointsInput ? pointsInput.value : 0) || 0;
  let label = labelInput ? labelInput.value.trim() : '';

  if (isNaN(minAge) || isNaN(maxAge)) {
    alert('يرجى تحديد عمر البداية وعمر النهاية للشريحة.');
    return;
  }
  if (minAge > maxAge) {
    alert('عمر البداية يجب أن يكون أقل من أو يساوي عمر النهاية.');
    return;
  }
  if (!label) {
    label = (minAge === maxAge) ? `${minAge} سنة` : `${minAge} - ${maxAge} سنة`;
  }

  if (!state.criteria) state.criteria = {};
  if (!state.criteria.age) state.criteria.age = {};
  if (!state.criteria.age.brackets) state.criteria.age.brackets = [];

  state.criteria.age.brackets.push({
    label,
    minAge,
    maxAge,
    points
  });

  // فرز تنازلي حسب الحد الأعلى للعمر
  state.criteria.age.brackets.sort((a, b) => b.maxAge - a.maxAge);

  // مسح المدخلات
  if (minAgeInput) minAgeInput.value = '';
  if (maxAgeInput) maxAgeInput.value = '';
  if (pointsInput) pointsInput.value = '';
  if (labelInput) labelInput.value = '';

  saveStore();
  if (typeof syncCriteriaToSupabase === 'function') syncCriteriaToSupabase(state.criteria);
  refreshAllViews();
  alert(`تم إضافة الشريحة العمرية (${label}) بنجاح!`);
}

function resetDefaultAgeBrackets() {
  if (confirm('هل ترغب في استعادة الشرائح العمرية الافتراضية المعتمدة؟')) {
    if (typeof DEFAULT_CRITERIA !== 'undefined' && DEFAULT_CRITERIA.age && DEFAULT_CRITERIA.age.brackets) {
      state.criteria.age.brackets = JSON.parse(JSON.stringify(DEFAULT_CRITERIA.age.brackets));
    }
    saveStore();
    if (typeof syncCriteriaToSupabase === 'function') syncCriteriaToSupabase(state.criteria);
    refreshAllViews();
  }
}

// إدارة المتنافسين
function renderCustomCriteriaFormFields(candidate = null) {
  const container = document.getElementById('cand-custom-fields');
  if (!container) return;

  const activeCustom = (state.criteria.customCriteria || []).filter(c => c.enabled);
  if (activeCustom.length === 0) {
    container.innerHTML = '';
    return;
  }

  const fields = activeCustom.map(c => {
    const existingVal = (candidate && candidate.customValues && candidate.customValues[c.id] !== undefined)
      ? candidate.customValues[c.id]
      : null;
    const itype = c.indicatorType || 'binary';

    let inputHtml = '';

    if (itype === 'binary') {
      // استخدام الخيارات المعرَّفة بحرية، مع الرجوع للقيم الافتراضية للمعايير القديمة
      const bOptions = (c.config && c.config.options && c.config.options.length >= 2)
        ? c.config.options
        : [{ label: 'مستمر', points: c.maxPoints || 5 }, { label: 'متاح', points: 3 }];

      const bOpts = bOptions.map((opt, idx) => {
        let isSel = false;
        if (existingVal !== null) {
          isSel = parseFloat(existingVal) === opt.points;
        } else {
          isSel = idx === 0; // الخيار الأول افتراضياً
        }
        return `<option value="${opt.points}" ${isSel ? 'selected' : ''}>${opt.label} (${opt.points} نقطة)</option>`;
      }).join('');

      inputHtml = `
        <select class="form-control cand-custom-val-input" data-criterion-id="${c.id}" data-type="binary" style="font-weight: 800; border: 1.5px solid #3b82f6; background-color: #0f172a; color: #fff; padding: 6px 10px; border-radius: 6px;">
          ${bOpts}
        </select>`;

    } else if (itype === 'grade') {
      const grades = (c.config && c.config.grades) ? c.config.grades : [];
      const opts = grades.map(g => {
        const sel = (existingVal !== null && parseFloat(existingVal) === g.points) ? 'selected' : '';
        return `<option value="${g.points}" ${sel}>${g.label} (${g.points} نقطة)</option>`;
      }).join('');
      inputHtml = `
        <select class="form-control cand-custom-val-input" data-criterion-id="${c.id}" data-type="grade" style="font-weight: 800; border: 1.5px solid #eab308; background-color: #0f172a; color: #fff; padding: 6px 10px; border-radius: 6px;">
          <option value="">-- اختر التقدير --</option>
          ${opts}
        </select>`;

    } else if (itype === 'bracket') {
      const curVal = (existingVal !== null) ? existingVal : '';
      const brackets = (c.config && c.config.brackets) ? c.config.brackets : [];
      const bracketHint = brackets.map(b => `${b.label}: ${b.points}ن`).join(' | ');
      inputHtml = `
        <div>
          <input type="number" class="form-control cand-custom-val-input" data-criterion-id="${c.id}" data-type="bracket" value="${curVal}" min="0" step="0.5" placeholder="أدخل القيمة الرقمية" style="border: 1.5px solid #f97316; background: #0f172a; color: #fff; padding: 6px 10px; border-radius: 6px;">
          <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 4px;">${bracketHint}</div>
        </div>`;

    } else if (itype === 'numeric') {
      const curVal = (existingVal !== null) ? existingVal : '';
      const ppu = (c.config && c.config.pointsPerUnit) ? c.config.pointsPerUnit : 1;
      inputHtml = `
        <div>
          <input type="number" class="form-control cand-custom-val-input" data-criterion-id="${c.id}" data-type="numeric" value="${curVal}" min="0" step="1" placeholder="أدخل العدد" style="border: 1.5px solid #8b5cf6; background: #0f172a; color: #fff; padding: 6px 10px; border-radius: 6px;">
          <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 4px;">${ppu} نقطة لكل وحدة | الأقصى: ${c.maxPoints} نقطة</div>
        </div>`;
    }

    const typeIcons = { binary: '🔵', grade: '🟡', bracket: '🟠', numeric: '🟣' };
    const icon = typeIcons[itype] || '🔵';

    return `
      <div class="form-group" style="margin-bottom: 0;">
        <label style="font-size: 0.78rem; font-weight: 800; color: #cbd5e1; display: block; margin-bottom: 4px;">
          ${icon} <strong>${c.name}</strong> <span style="color:#94a3b8;">(أقصى: ${c.maxPoints}ن)</span>:
        </label>
        ${inputHtml}
      </div>`;
  }).join('');

  container.innerHTML = `
    <div style="background: rgba(245,158,11,0.06); border: 1.5px solid rgba(245,158,11,0.35); padding: 14px; border-radius: 10px; margin-bottom: 12px;">
      <h5 style="color: #f59e0b; margin-bottom: 10px; font-weight: 900; font-size: 0.88rem;">🎯 مؤشرات المعايير التنافسية المخصصة:</h5>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px;">
        ${fields}
      </div>
    </div>
  `;
}

function showAddCandidateModal() {
  document.getElementById('modal-candidate-title').innerText = 'إضافة متنافس جديد';
  document.getElementById('candidate-id-hidden').value = '';
  document.getElementById('cand-name').value = '';
  document.getElementById('cand-degree').value = 'ماجستير';
  document.getElementById('cand-specialization').value = 'إدارة عامة';
  document.getElementById('cand-hiring-univ').value = '';
  document.getElementById('cand-birth-date').value = '';
  document.getElementById('cand-grad-year').value = '';
  document.getElementById('cand-grade').value = 'جيد جداً';

  renderCustomCriteriaFormFields(null);
  openModal('modal-candidate');
}

function editCandidate(id) {
  const cand = state.candidates.find(c => String(c.id) === String(id));
  if (!cand) return;

  document.getElementById('modal-candidate-title').innerText = 'تعديل بيانات المتنافس';
  document.getElementById('candidate-id-hidden').value = cand.id;
  document.getElementById('cand-name').value = cand.name;
  document.getElementById('cand-degree').value = cand.degree;
  document.getElementById('cand-specialization').value = cand.specialization;
  document.getElementById('cand-hiring-univ').value = cand.hiring_univ || cand.hiring_service || '';
  document.getElementById('cand-birth-date').value = cand.birth_date || '';
  document.getElementById('cand-grad-year').value = cand.grad_year || '';
  document.getElementById('cand-grade').value = cand.grade || 'جيد';

  renderCustomCriteriaFormFields(cand);
  openModal('modal-candidate');
}

function saveCandidateForm() {
  if (checkSystemLockGuard()) return;
  const id = document.getElementById('candidate-id-hidden').value;
  const name = document.getElementById('cand-name').value.trim();
  const degree = document.getElementById('cand-degree').value;
  const specialization = document.getElementById('cand-specialization').value.trim();
  const hiring_univ = document.getElementById('cand-hiring-univ').value.trim();
  const birth_date = document.getElementById('cand-birth-date').value.trim();
  const grad_year = document.getElementById('cand-grad-year').value.trim();
  const grade = document.getElementById('cand-grade').value;

  if (!name) {
    alert('يرجى إدخال اسم المتنافس');
    return;
  }

  // تجميع قيم المعايير المخصصة (يدعم جميع أنواع المؤشرات)
  const customValues = {};
  document.querySelectorAll('.cand-custom-val-input').forEach(inp => {
    const critId = inp.getAttribute('data-criterion-id');
    const dtype  = inp.getAttribute('data-type') || 'binary';
    if (!critId) return;

    if (dtype === 'binary') {
      // الثنائي: نخزّن maxPoints (مستمر) أو 0 (منقطع)
      customValues[critId] = parseFloat(inp.value) || 0;
    } else if (dtype === 'grade') {
      // التقديري: نخزّن النقاط المرتبطة بالتصنيف المختار
      customValues[critId] = parseFloat(inp.value) || 0;
    } else if (dtype === 'bracket') {
      // الشريحي: نخزّن القيمة الرقمية الخام (مثل: عدد السنوات)
      customValues[critId] = parseFloat(inp.value) || 0;
    } else if (dtype === 'numeric') {
      // الكمي: نخزّن العدد الخام ويحتسب المحرك النقاط
      customValues[critId] = parseFloat(inp.value) || 0;
    }
  });


  let savedCandidate = null;

  if (id) {
    // تعديل
    const idx = state.candidates.findIndex(c => String(c.id) === String(id));
    if (idx !== -1) {
      state.candidates[idx] = {
        ...state.candidates[idx],
        name,
        degree,
        specialization,
        hiring_univ,
        birth_date,
        grad_year,
        grade,
        customValues
      };
      savedCandidate = state.candidates[idx];
    }
  } else {
    // إضافة جديد
    const newId = Date.now();
    savedCandidate = {
      id: newId,
      name,
      degree,
      specialization,
      hiring_univ,
      birth_date,
      grad_year,
      grade,
      customValues
    };
    state.candidates.unshift(savedCandidate);
  }

  saveStore();

  // 1. حفظ في قاعدة بيانات Supabase أيضاً لضمان استمراريته بعد Refresh
  if (savedCandidate && typeof saveCandidateToSupabase === 'function') {
    saveCandidateToSupabase(savedCandidate).then(() => {
      console.log(`✅ تم مزامنة المتنافس (${savedCandidate.name}) على Supabase بنجاح.`);
    }).catch(err => {
      console.error('❌ خطأ في حفظ المتنافس على Supabase:', err);
    });
  }

  closeModal('modal-candidate');
  refreshAllViews();
}

function deleteCandidate(id) {
  if (checkSystemLockGuard()) return;
  if (confirm('هل أنت متأكد من رغبتك في حذف هذا المتنافس؟ لا يمكن التراجع عن هذا الإجراء.')) {
    // 1. حذف من الذاكرة المحلية
    state.candidates = state.candidates.filter(c => c.id !== id);
    saveStore();
    refreshAllViews();
    // 2. حذف من قاعدة بيانات Supabase (الحذف الدائم)
    if (typeof deleteCandidateFromSupabase === 'function') {
      deleteCandidateFromSupabase(id).then(() => {
        console.log(`✅ تم حذف المتنافس (${id}) من Supabase بنجاح.`);
      }).catch(err => {
        console.error('خطأ في حذف المتنافس من Supabase:', err);
      });
    }
  }
}

// استيراد ملفات الإكسل
function handleExcelImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      let importedCount = 0;

      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const jsonRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        let degree = sheetName.includes('دكتور') ? 'دكتوراه' : 'ماجستير';

        jsonRows.forEach(row => {
          if (row && row.length >= 4 && row[1]) {
            const name = String(row[1]).trim();
            if (name && name !== 'الاســـــــــــــــــــم' && name !== 'None') {
              state.candidates.unshift({
                id: Date.now() + Math.random(),
                name: name,
                degree: degree,
                hiring_service: row[2] ? String(row[2]).trim() : '',
                hiring_univ: row[3] ? String(row[3]).trim() : '',
                specialization: row[4] ? String(row[4]).trim() : 'غير محدد',
                grad_year: row[5] ? String(row[5]).trim() : '',
                grade: row[6] ? String(row[6]).trim() : 'جيد',
                birth_date: row[7] ? String(row[7]).trim() : ''
              });
              importedCount++;
            }
          }
        });
      });

      saveStore();
      refreshAllViews();
      alert(`تم استيراد ${importedCount} متنافس بنجاح من ملف الإكسل!`);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء قراءة ملف الإكسل');
    }
  };
  reader.readAsArrayBuffer(file);
}

// إدارة المستخدمين والصلاحيات (المدير الأعلى)
function showAddUserModal() {
  editingUserId = null;
  const titleEl = document.getElementById('modal-user-title');
  if (titleEl) titleEl.innerText = 'إضافة مستخدم جديد وتعيين الصلاحيات';

  document.getElementById('user-fullname').value = '';
  document.getElementById('user-username').value = '';
  document.getElementById('user-password').value = '';
  document.getElementById('user-role').value = 'data_entry';
  document.getElementById('modal-user').classList.add('open');
}

function editUser(id) {
  const user = state.users.find(u => u.id === id);
  if (!user) return;

  editingUserId = id;
  const titleEl = document.getElementById('modal-user-title');
  if (titleEl) titleEl.innerText = 'تعديل بيانات وصلاحيات المستخدم';

  document.getElementById('user-fullname').value = user.name || '';
  document.getElementById('user-username').value = user.username || '';
  document.getElementById('user-password').value = user.password || '';
  document.getElementById('user-role').value = user.role || 'data_entry';
  document.getElementById('modal-user').classList.add('open');
}

function deleteUser(id) {
  if (id === 1) {
    alert('لا يمكن حذف حساب المدير الرئيسي النظام');
    return;
  }
  const user = state.users.find(u => u.id === id);
  if (!user) return;

  if (confirm(`هل أنت تأكد من رغبتك في حذف المستخدم (${user.name})؟`)) {
    state.users = state.users.filter(u => u.id !== id);
    saveStore();
    if (typeof syncUsersToSupabase === 'function') syncUsersToSupabase(state.users);
    refreshAllViews();
    alert('تم حذف المستخدم بنجاح');
  }
}

function saveUserForm() {
  const name     = document.getElementById('user-fullname').value.trim();
  const username = document.getElementById('user-username').value.trim();
  const password = document.getElementById('user-password').value.trim();
  const role     = document.getElementById('user-role').value;

  if (!name || !username) {
    alert('يرجى كتابة الاسم الكامل واسم المستخدم');
    return;
  }
  if (!password) {
    alert('يرجى إدخال كلمة المرور');
    return;
  }
  if (password.length < 4) {
    alert('كلمة المرور يجب أن تكون 4 أحرف على الأقل');
    return;
  }

  // التحقق من عدم تكرار اسم المستخدم لحساب آخر
  const existing = state.users.find(u => u.username === username && u.id !== editingUserId);
  if (existing) {
    alert(`اسم المستخدم (${username}) مستخدم مسبقاً، يرجى اختيار اسم آخر`);
    return;
  }

  if (editingUserId) {
    // تعديل مستخدم الحالي
    const userIndex = state.users.findIndex(u => u.id === editingUserId);
    if (userIndex !== -1) {
      state.users[userIndex].name = name;
      state.users[userIndex].username = username;
      state.users[userIndex].password = password;
      state.users[userIndex].role = role;
      state.users[userIndex].title = getRoleTitle(role);
      if (state.currentUser && (state.currentUser.id === editingUserId || state.currentUser.username === username)) {
        state.currentUser = { ...state.users[userIndex] };
      }
      alert(`✅ تم تحديث بيانات وتعديل صلاحيات المستخدم (${name}) بنجاح!`);
    }
  } else {
    // إضافة مستخدم جديد
    const newId = state.users.length > 0 ? Math.max(...state.users.map(u => u.id)) + 1 : 1;
    state.users.push({ id: newId, username, password, name, role, title: getRoleTitle(role) });
    alert(`✅ تم إضافة المستخدم (${name}) بنجاح!`);
  }

  saveStore();
  if (typeof syncUsersToSupabase === 'function') syncUsersToSupabase(state.users);
  closeModal('modal-user');
  document.getElementById('user-fullname').value = '';
  document.getElementById('user-username').value = '';
  document.getElementById('user-password').value = '';
  editingUserId = null;
  refreshAllViews();
}

function showLoginModal() {
  document.getElementById('modal-login').classList.add('open');
}

function switchUser(role) {
  const targetUser = state.users.find(u => u.role === role);
  if (targetUser) {
    state.currentUser = targetUser;
    saveStore();
    renderUserBadge();
    renderTabsByRole();
    refreshAllViews();
    closeModal('modal-login');
  }
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('open');
    el.style.display = 'flex';
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('open');
    el.style.display = 'none';
  }
}

// مولد شرائح الأقدمية التفاعلي التلقائي
function autoGenerateSeniorityBrackets() {
  const startYear = parseInt(document.getElementById('gen-seniority-start').value) || 1990;
  const endYear = parseInt(document.getElementById('gen-seniority-end').value) || 2030;
  const stepYears = parseInt(document.getElementById('gen-seniority-step').value) || 5;

  if (startYear >= endYear) {
    alert('سنة البداية يجب أن تكون أقل من سنة النهاية');
    return;
  }
  if (stepYears < 1) {
    alert('خطوة الفئة يجب أن تكون سنة واحدة على الأقل');
    return;
  }

  state.criteria.seniority.startYear = startYear;
  state.criteria.seniority.endYear = endYear;
  state.criteria.seniority.stepYears = stepYears;

  const brackets = [];
  const maxPoints = state.criteria.seniority.maxPoints || 30;

  let currStart = startYear;
  let stepCount = Math.ceil((endYear - startYear + 1) / stepYears);

  for (let i = 0; i < stepCount; i++) {
    let currEnd = Math.min(currStart + stepYears - 1, endYear);
    let pts = Math.max(2, Math.round(maxPoints * (1 - (i / stepCount))));

    let label = (stepYears === 1) ? `${currStart}م` : `${currStart} - ${currEnd}م`;
    
    // الشريحة تمتد من سنة بدايتها إلى سنة نهايتها فقط دون تجاوز
    let effectiveMin = currStart;
    let effectiveMax = Math.min(currStart + stepYears - 1, endYear);

    brackets.push({
      label: label,
      minYear: effectiveMin,
      maxYear: effectiveMax,
      points: pts
    });

    currStart = currEnd + 1;
    if (currStart > endYear) break;
  }

  state.criteria.seniority.brackets = brackets;
  saveStore();
  if (typeof syncCriteriaToSupabase === 'function') syncCriteriaToSupabase(state.criteria);
  refreshAllViews();
  alert(`تم توليد ${brackets.length} شريحة للأقدمية بنجاح بناءً على خطوة (${stepYears}) سنوات! يمكنك الآن تعديل نقاط كل شريحة حسب الرغبة.`);
}

// مولد الشرائح العمرية التفاعلي التلقائي
function autoGenerateAgeBrackets() {
  const minAge = parseInt(document.getElementById('gen-age-start').value) || 25;
  const maxAge = parseInt(document.getElementById('gen-age-end').value) || 56;
  const stepYears = parseInt(document.getElementById('gen-age-step').value) || 5;

  if (minAge >= maxAge) {
    alert('عمر البداية يجب أن يكون أقل من عمر النهاية');
    return;
  }
  if (stepYears < 1) {
    alert('خطوة الفئة يجب أن تكون سنة واحدة على الأقل');
    return;
  }

  state.criteria.age.minAge = minAge;
  state.criteria.age.maxAge = maxAge;
  state.criteria.age.stepYears = stepYears;

  const brackets = [];
  const maxPoints = state.criteria.age.maxPoints || 25;

  let currEnd = maxAge;
  let stepCount = Math.ceil((maxAge - minAge + 1) / stepYears);

  for (let i = 0; i < stepCount; i++) {
    let currStart = Math.max(currEnd - stepYears + 1, minAge);
    let pts = Math.max(2, Math.round(maxPoints * (1 - (i / stepCount))));

    let label = (stepYears === 1) ? `${currEnd} سنة` : `${currStart} - ${currEnd} سنة`;

    let effectiveMax = (i === 0) ? 120 : currEnd;
    let effectiveMin = (i === stepCount - 1) ? 0 : currStart;

    brackets.push({
      label: label,
      minAge: effectiveMin,
      maxAge: effectiveMax,
      points: pts
    });

    currEnd = currStart - 1;
    if (currEnd < minAge) break;
  }

  state.criteria.age.brackets = brackets;
  saveStore();
  if (typeof syncCriteriaToSupabase === 'function') syncCriteriaToSupabase(state.criteria);
  refreshAllViews();
  alert(`تم توليد ${brackets.length} شريحة عمرية بنجاح بناءً على خطوة (${stepYears}) سنوات! يمكنك الآن تعديل نقاط كل شريحة حسب الرغبة.`);
}

function toggleCriteriaCard(sectionId) {
  const card = document.getElementById(sectionId);
  if (!card) return;
  const body = card.querySelector('.collapsible-body');
  const icon = card.querySelector('.card-toggle-icon');
  if (!body) return;

  if (body.style.display === 'none') {
    body.style.display = 'block';
    if (icon) icon.textContent = '🔽';
  } else {
    body.style.display = 'none';
    if (icon) icon.textContent = '◀️';
  }
}

function collapseAllCriteriaCards() {
  document.querySelectorAll('.criteria-collapsible-card').forEach(card => {
    const body = card.querySelector('.collapsible-body');
    const icon = card.querySelector('.card-toggle-icon');
    if (body) body.style.display = 'none';
    if (icon) icon.textContent = '◀️';
  });
}

function expandAllCriteriaCards() {
  document.querySelectorAll('.criteria-collapsible-card').forEach(card => {
    const body = card.querySelector('.collapsible-body');
    const icon = card.querySelector('.card-toggle-icon');
    if (body) body.style.display = 'block';
    if (icon) icon.textContent = '🔽';
  });
}

function scrollToCriteriaSection(sectionId) {
  const card = document.getElementById(sectionId);
  if (!card) return;
  const body = card.querySelector('.collapsible-body');
  const icon = card.querySelector('.card-toggle-icon');
  if (body && body.style.display === 'none') {
    body.style.display = 'block';
    if (icon) icon.textContent = '🔽';
  }
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ==========================================
// 🔒 نظام الاعتماد والقفل النهائي والفتح الاستثنائي
// ==========================================

function checkSystemLockGuard() {
  if (state.settings && state.settings.isLocked) {
    alert(`🔒 لا يمكن إجراء هذا التعديل!\nالنظام في حالة اعتماد وقفل نهائي لمفاضلة عام ${state.settings.referenceYear || 2026}م برقم توثيق: (${state.settings.lockHash || ''}).\n\nلا يمكن إضافة أو تعديل أو حذف أي بيانات في هذا الوضع إلا بعد الفتح الاستثنائي بواسطة رئيس اللجنة / المدير الأعلى (Super Admin).`);
    return true;
  }
  return false;
}

function renderLockBanner() {
  const container = document.getElementById('global-lock-banner');
  if (!container) return;

  const isLocked = state.settings && state.settings.isLocked;
  const isSuperAdmin = state.currentUser && state.currentUser.role === 'super_admin';

  if (isLocked) {
    document.body.classList.add('is-system-locked');
    container.innerHTML = `
      <div class="no-print" style="background: linear-gradient(135deg, rgba(220, 38, 38, 0.95), rgba(153, 27, 27, 0.95)); color: #ffffff; padding: 12px 20px; font-weight: 800; font-size: 0.88rem; box-shadow: 0 4px 20px rgba(220, 38, 38, 0.4); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; border-bottom: 2px solid #f87171;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.4rem;">🔒</span>
          <div>
            <div><strong>المفاضلة الرسمية لعام ${state.settings.referenceYear || 2026}م معتمدة ومغلقة نهائياً</strong></div>
            <div style="font-size: 0.76rem; opacity: 0.9; font-weight: 600;">تاريخ الاعتماد: ${state.settings.lockedAt || '-'} | المعتمد: ${state.settings.lockedBy || 'رئيس اللجنة'} | كود التوثيق الإلكتروني: <span style="font-family: monospace; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">${state.settings.lockHash || '-'}</span></div>
          </div>
        </div>
        <div>
          ${isSuperAdmin ? `
            <button class="btn btn-sm btn-secondary" onclick="openUnlockSessionModal()" style="background: rgba(255,255,255,0.2); color: #ffffff; border: 1px solid rgba(255,255,255,0.4); font-weight: 900; font-size: 0.78rem;">
              🔓 إعادة الفتح الاستثنائي للمفاضلة (Super Admin)
            </button>
          ` : `
            <span class="badge-status" style="background: rgba(0,0,0,0.25); color: #ffffff; border: 1px solid rgba(255,255,255,0.3);">وضع القراءة والتفتيش المعتمد (Read Only)</span>
          `}
        </div>
      </div>
    `;
  } else {
    document.body.classList.remove('is-system-locked');
    container.innerHTML = '';
  }
}

function openLockSessionModal() {
  const isSuperAdmin = state.currentUser && state.currentUser.role === 'super_admin';
  if (!isSuperAdmin) {
    alert('تنبيه: صلاحية الاعتماد الإداري وإغلاق المفاضلة نهائياً خاصة برئيس اللجنة / المدير الأعلى فقط!');
    return;
  }
  const input = document.getElementById('lock-confirm-input');
  if (input) input.value = '';
  const modal = document.getElementById('modal-lock-session');
  if (modal) {
    modal.classList.add('open');
    modal.style.display = 'flex';
  }
}

function closeLockSessionModal() {
  const modal = document.getElementById('modal-lock-session');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
}

function confirmLockSessionSubmit() {
  const input = document.getElementById('lock-confirm-input');
  const val = input ? input.value.trim() : '';

  if (val !== 'تأكيد الإغلاق') {
    alert('يرجى كتابة النص المطابق بتمام الدقة: (تأكيد الإغلاق) للمتابعة والاعتماد.');
    return;
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-YE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const refYear = state.settings.referenceYear || 2026;
  const lockHash = `#US-${refYear}-LOCK-` + Math.random().toString(36).substring(2, 7).toUpperCase();

  state.settings.isLocked = true;
  state.settings.lockedAt = dateStr;
  state.settings.lockedBy = state.currentUser ? (state.currentUser.name + ' (' + state.currentUser.title + ')') : 'رئيس لجنة المفاضلة';
  state.settings.lockHash = lockHash;

  if (!state.settings.auditLog) state.settings.auditLog = [];
  state.settings.auditLog.push({
    timestamp: new Date().toISOString(),
    user: state.currentUser ? state.currentUser.name : 'Super Admin',
    action: 'LOCK_SESSION',
    reason: `اعتماد وإغلاق محضر مفاضلة عام ${refYear}م رسمياً وتسجيل كود التوثيق ${lockHash}`
  });

  saveStore();
  closeLockSessionModal();
  refreshAllViews();
  alert(`🔒 تم اعتماد نتائج المحضر الرسمي وإغلاق مفاضلة عام ${refYear}م رسمياً برقم توثيق: ${lockHash}`);
}

function openUnlockSessionModal() {
  const isSuperAdmin = state.currentUser && state.currentUser.role === 'super_admin';
  if (!isSuperAdmin) {
    alert('تنبيه أمني: صلاحية فتح المفاضلة الاستثنائي تقتصر حصرياً على مدير النظام الأعلى (Super Admin)!');
    return;
  }
  const input = document.getElementById('unlock-reason-input');
  if (input) input.value = '';
  const modal = document.getElementById('modal-unlock-session');
  if (modal) {
    modal.classList.add('open');
    modal.style.display = 'flex';
  }
}

function closeUnlockSessionModal() {
  const modal = document.getElementById('modal-unlock-session');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
}

function confirmUnlockSessionSubmit() {
  const input = document.getElementById('unlock-reason-input');
  const reason = input ? input.value.trim() : '';

  if (!reason || reason.length < 5) {
    alert('يرجى كتابة سبب ومبرر رسمي واضح لإعادة الفتح الاستثنائي (أكثر من 5 أحرف)');
    return;
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-YE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const refYear = state.settings.referenceYear || 2026;

  state.settings.isLocked = false;

  if (!state.settings.sessionHistory || state.settings.sessionHistory.length === 0) {
    state.settings.sessionHistory = [
      {
        sessionNum: 1,
        dateStr: state.settings.competitionDate || 'شهر اغسطس 2026',
        reason: 'جلسة الفرز والتنافس الرئيسية المعلنة'
      }
    ];
  }

  state.settings.sessionHistory.push({
    sessionNum: state.settings.sessionHistory.length + 1,
    dateStr: dateStr,
    reason: reason
  });

  if (!state.settings.auditLog) state.settings.auditLog = [];
  state.settings.auditLog.push({
    timestamp: new Date().toISOString(),
    user: state.currentUser ? state.currentUser.name : 'Super Admin',
    action: 'UNLOCK_SESSION',
    reason: `إعادة الفتح الاستثنائي لمفاضلة عام ${refYear}م - المبرر: ${reason}`
  });

  saveStore();
  closeUnlockSessionModal();
  refreshAllViews();
  alert(`🔓 تم إعادة الفتح الاستثنائي لمفاضلة عام ${refYear}م بنجاح، وتوثيق مبرر الجلسة رقم (${state.settings.sessionHistory.length}) في السجل النصي التتابعي للمحضر.`);
}

function resetSystemSessionsHistory() {
  const isSuperAdmin = state.currentUser && state.currentUser.role === 'super_admin';
  if (!isSuperAdmin) {
    alert('تنبيه أمني: دالة تصفير السجلات تجريبياً خاصة حصرياً برئيس اللجنة / المدير الأعلى (Super Admin)!');
    return;
  }

  if (confirm('🧹 هل أنت متأكد من رغبتك في تصفير مسودة السجلات والتجارب السابقة؟\n\nسيتم مسح كافة سجلات الفتح والإغلاق والتجارب السابقة كلياً، لتبدأ المفاضلة الحقيقية من "الجلسة الأولى" بنظافة تامة وسجلات رسمية جديدة.')) {
    state.settings.sessionHistory = [];
    state.settings.auditLog = [];
    state.settings.isLocked = false;
    state.settings.lockedAt = null;
    state.settings.lockedBy = null;
    state.settings.lockHash = null;

    saveStore();
    refreshAllViews();
    alert('✨ تم تصفير سجلات التجربة بنجاح! النظام الآن نظيف 100% وجاهز لبدء المفاضلة والاعتماد الحقيقي من الجلسة الأولى.');
  }
}

// تعديل أوزان تقدير البكالوريوس
function updateGradeItemPoints(index, points) {
  state.criteria.grade.items[index].points = parseFloat(points) || 0;
  saveStore();
  refreshAllViews();
}

// دالة عرض إعدادات النوع ديناميكياً في نموذج إضافة المعيار
function renderCustomCriterionTypeConfig() {
  const typeEl = document.getElementById('new-custom-criterion-type');
  const configEl = document.getElementById('custom-criterion-type-config');
  if (!typeEl || !configEl) return;
  const type = typeEl.value;

  if (type === 'binary') {
    configEl.innerHTML = `
      <div style="background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.3); padding: 12px; border-radius: 8px;">
        <div style="font-size: 0.82rem; color: #93c5fd; font-weight: 800; margin-bottom: 10px;">🔵 حدد خيارَي هذا المعيار واكتب وصفهما وأوزانهما بحرية تامة:</div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div class="binary-option-row" style="display: flex; gap: 8px; align-items: center;">
            <span style="color: #64748b; font-size: 0.75rem; min-width: 72px; text-align: center; background: rgba(59,130,246,0.15); padding: 3px 6px; border-radius: 4px;">الخيار الأول</span>
            <input type="text" class="form-control binary-label" placeholder="مثال: مستمر، نعم، طويل، أسود..." style="flex: 2; border: 1px solid rgba(59,130,246,0.5);">
            <input type="number" class="form-control binary-pts" oninput="autoUpdateNewCriterionMaxPoints()" placeholder="نقاط" min="0" style="flex: 1; max-width: 85px; border: 1px solid rgba(59,130,246,0.5);">
          </div>
          <div class="binary-option-row" style="display: flex; gap: 8px; align-items: center;">
            <span style="color: #64748b; font-size: 0.75rem; min-width: 72px; text-align: center; background: rgba(239,68,68,0.1); padding: 3px 6px; border-radius: 4px;">الخيار الثاني</span>
            <input type="text" class="form-control binary-label" placeholder="مثال: متاح، لا، قصير، أبيض..." style="flex: 2; border: 1px solid rgba(239,68,68,0.4);">
            <input type="number" class="form-control binary-pts" oninput="autoUpdateNewCriterionMaxPoints()" placeholder="نقاط" min="0" style="flex: 1; max-width: 85px; border: 1px solid rgba(239,68,68,0.4);">
          </div>
        </div>
        <div style="font-size: 0.72rem; color: #64748b; margin-top: 8px;">💡 يتحدد سقف المعيار تلقائياً بأعلى درجة تضعها في الخيارات.</div>
      </div>`;
  } else if (type === 'grade') {
    configEl.innerHTML = `
      <div style="background: rgba(234,179,8,0.08); border: 1px solid rgba(234,179,8,0.3); padding: 12px; border-radius: 8px;">
        <div style="font-size: 0.82rem; color: #fde68a; font-weight: 800; margin-bottom: 8px;">🟡 أدخل تصنيفات الأداء ونقاطها (كل تصنيف في سطر):</div>
        <div id="grade-options-list" style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px;">
          <div class="grade-option-row" style="display: flex; gap: 8px; align-items: center;">
            <input type="text" class="form-control grade-label" placeholder="مثال: ممتاز" style="flex: 2;">
            <input type="number" class="form-control grade-pts" oninput="autoUpdateNewCriterionMaxPoints()" placeholder="نقاط" min="0" style="flex: 1; max-width: 80px;">
            <button onclick="this.closest('.grade-option-row').remove(); autoUpdateNewCriterionMaxPoints();" style="background: #ef4444; color: #fff; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer;">✕</button>
          </div>
        </div>
        <button onclick="addGradeOptionRow()" class="btn btn-outline btn-sm" style="font-size:0.78rem;">➕ إضافة تصنيف آخر</button>
      </div>`;
  } else if (type === 'bracket') {
    configEl.innerHTML = `
      <div style="background: rgba(249,115,22,0.08); border: 1px solid rgba(249,115,22,0.3); padding: 12px; border-radius: 8px;">
        <div style="font-size: 0.82rem; color: #fdba74; font-weight: 800; margin-bottom: 4px;">🟠 أدخل المجالات الرقمية ونقاطها (مثل: سنوات الخبرة):</div>
        <div style="font-size: 0.74rem; color: #94a3b8; margin-bottom: 8px;">ما سيُدخله مدخل البيانات هو رقم (مثل 5 سنوات) والنظام يحتسب النقطة تلقائياً.</div>
        <div id="bracket-options-list" style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px;">
          <div class="bracket-option-row" style="display: flex; gap: 8px; align-items: center; flex-wrap:wrap;">
            <input type="text" class="form-control bracket-label" placeholder="مسمى الفئة (مثال: أقل من 3 سنوات)" style="flex: 2; min-width: 160px;">
            <input type="number" class="form-control bracket-min" placeholder="من" min="0" style="flex: 1; max-width: 70px;">
            <input type="number" class="form-control bracket-max" placeholder="إلى" min="0" style="flex: 1; max-width: 70px;">
            <input type="number" class="form-control bracket-pts" oninput="autoUpdateNewCriterionMaxPoints()" placeholder="نقاط" min="0" style="flex: 1; max-width: 70px;">
            <button onclick="this.closest('.bracket-option-row').remove(); autoUpdateNewCriterionMaxPoints();" style="background: #ef4444; color: #fff; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer;">✕</button>
          </div>
        </div>
        <button onclick="addBracketOptionRow()" class="btn btn-outline btn-sm" style="font-size:0.78rem;">➕ إضافة مجال آخر</button>
      </div>`;
  } else if (type === 'numeric') {
    configEl.innerHTML = `
      <div style="background: rgba(139,92,246,0.08); border: 1px solid rgba(139,92,246,0.3); padding: 12px; border-radius: 8px; display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 160px;">
          <label style="font-size: 0.78rem; font-weight: 700; color: #c4b5fd; display: block; margin-bottom: 4px;">🟣 النقاط لكل وحدة (مثل: نقطة لكل بحث):</label>
          <input type="number" id="numeric-points-per-unit" class="form-control" value="1" min="0.5" step="0.5" style="max-width: 120px;">
        </div>
        <div style="font-size: 0.78rem; color: #94a3b8; flex: 2;">
          مثال: إذا كانت النقاط لكل وحدة = 2، والوزن الأقصى = 10، فالمتنافس الذي له 3 أبحاث يحصل على 6 نقاط.
        </div>
      </div>`;
  }
}

function autoUpdateNewCriterionMaxPoints() {
  const typeEl = document.getElementById('new-custom-criterion-type');
  const ptsEl = document.getElementById('new-custom-criterion-points');
  if (!typeEl || !ptsEl) return;
  const type = typeEl.value;
  let maxPts = 0;
  if (type === 'binary') {
    document.querySelectorAll('.binary-pts').forEach(inp => {
      const v = parseFloat(inp.value) || 0;
      if (v > maxPts) maxPts = v;
    });
  } else if (type === 'grade') {
    document.querySelectorAll('.grade-pts').forEach(inp => {
      const v = parseFloat(inp.value) || 0;
      if (v > maxPts) maxPts = v;
    });
  } else if (type === 'bracket') {
    document.querySelectorAll('.bracket-pts').forEach(inp => {
      const v = parseFloat(inp.value) || 0;
      if (v > maxPts) maxPts = v;
    });
  }
  if (maxPts > 0) {
    ptsEl.value = maxPts;
  }
}

function addGradeOptionRow() {
  const list = document.getElementById('grade-options-list');
  if (!list) return;
  const row = document.createElement('div');
  row.className = 'grade-option-row';
  row.style.cssText = 'display: flex; gap: 8px; align-items: center;';
  row.innerHTML = `
    <input type="text" class="form-control grade-label" placeholder="مثال: جيد جداً" style="flex: 2;">
    <input type="number" class="form-control grade-pts" placeholder="نقاط" min="0" style="flex: 1; max-width: 80px;">
    <button onclick="this.closest('.grade-option-row').remove()" style="background: #ef4444; color: #fff; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer;">✕</button>
  `;
  list.appendChild(row);
}

function addBracketOptionRow() {
  const list = document.getElementById('bracket-options-list');
  if (!list) return;
  const row = document.createElement('div');
  row.className = 'bracket-option-row';
  row.style.cssText = 'display: flex; gap: 8px; align-items: center; flex-wrap: wrap;';
  row.innerHTML = `
    <input type="text" class="form-control bracket-label" placeholder="مسمى الفئة" style="flex: 2; min-width: 160px;">
    <input type="number" class="form-control bracket-min" placeholder="من" min="0" style="flex: 1; max-width: 70px;">
    <input type="number" class="form-control bracket-max" placeholder="إلى" min="0" style="flex: 1; max-width: 70px;">
    <input type="number" class="form-control bracket-pts" placeholder="نقاط" min="0" style="flex: 1; max-width: 70px;">
    <button onclick="this.closest('.bracket-option-row').remove()" style="background: #ef4444; color: #fff; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer;">✕</button>
  `;
  list.appendChild(row);
}

// إضافة وإدارة المعايير المخصصة الجديدة
function addCustomCriterion() {
  if (checkSystemLockGuard()) return;
  const nameEl = document.getElementById('new-custom-criterion-name');
  const ptsEl  = document.getElementById('new-custom-criterion-points');
  const typeEl = document.getElementById('new-custom-criterion-type');

  const name      = nameEl ? nameEl.value.trim() : '';
  let maxPoints = ptsEl  ? (parseFloat(ptsEl.value) || 0)  : 0;
  const itype     = typeEl ? typeEl.value : 'binary';

  if (!name) { alert('يرجى كتابة اسم المعيار الجديد'); return; }

  // بناء config حسب النوع
  let config = {};
  if (itype === 'binary') {
    const rows = document.querySelectorAll('.binary-option-row');
    const options = [];
    rows.forEach(row => {
      const label = row.querySelector('.binary-label')?.value.trim();
      const pts   = parseFloat(row.querySelector('.binary-pts')?.value);
      if (label) options.push({ label, points: isNaN(pts) ? 0 : pts });
    });
    // إن لم يقم المشرف بإدخال مسميات مخصصة، نعتمد التسمية الافتراضية الذكية
    if (options.length === 0) {
      options.push({ label: 'مستمر', points: maxPoints || 5 });
      options.push({ label: 'متاح', points: 3 });
    } else if (options.length === 1) {
      options.push({ label: 'متاح', points: 3 });
    }
    const optMax = Math.max(...options.map(o => o.points || 0), 0);
    if (optMax > 0) maxPoints = optMax;
    config = { options };

  } else if (itype === 'grade') {
    const rows  = document.querySelectorAll('.grade-option-row');
    const grades = [];
    rows.forEach(row => {
      const label = row.querySelector('.grade-label')?.value.trim();
      const pts   = parseFloat(row.querySelector('.grade-pts')?.value) || 0;
      if (label) grades.push({ label, points: pts });
    });
    if (grades.length === 0) { alert('يرجى إضافة تصنيف واحد على الأقل للمعيار التقديري'); return; }
    const gMax = Math.max(...grades.map(g => g.points || 0), 0);
    if (gMax > 0) maxPoints = gMax;
    config = { grades };

  } else if (itype === 'bracket') {
    const rows    = document.querySelectorAll('.bracket-option-row');
    const brackets = [];
    rows.forEach(row => {
      const label = row.querySelector('.bracket-label')?.value.trim();
      const min   = parseFloat(row.querySelector('.bracket-min')?.value);
      const max   = parseFloat(row.querySelector('.bracket-max')?.value);
      const pts   = parseFloat(row.querySelector('.bracket-pts')?.value) || 0;
      if (label && !isNaN(min) && !isNaN(max)) brackets.push({ label, min, max, points: pts });
    });
    if (brackets.length === 0) { alert('يرجى إضافة مجال رقمي واحد على الأقل للمعيار الشريحي'); return; }
    const bMax = Math.max(...brackets.map(b => b.points || 0), 0);
    if (bMax > 0) maxPoints = bMax;
    config = { brackets };

  } else if (itype === 'numeric') {
    const ppu = parseFloat(document.getElementById('numeric-points-per-unit')?.value) || 1;
    config = { pointsPerUnit: ppu };
  }

  if (maxPoints <= 0) maxPoints = 5;

  if (!state.criteria.customCriteria) state.criteria.customCriteria = [];

  const scopeEl = document.getElementById('new-custom-criterion-scope');
  const targetDegree = scopeEl ? scopeEl.value : 'all';

  const newId = 'c_' + Date.now();
  state.criteria.customCriteria.push({
    id: newId,
    name,
    maxPoints,
    targetDegree,
    enabled: targetDegree !== 'none',
    indicatorType: itype,
    config
  });

  if (nameEl) nameEl.value = '';
  if (ptsEl)  ptsEl.value  = '5';
  if (typeEl) typeEl.value = 'binary';
  const configDiv = document.getElementById('custom-criterion-type-config');
  if (configDiv) configDiv.innerHTML = '';

  saveStore();
  if (typeof syncCriteriaToSupabase === 'function') syncCriteriaToSupabase(state.criteria);
  refreshAllViews();
  alert(`✅ تم إضافة المعيار (${name}) - نطاق التفعيل: ${targetDegree === 'all' ? 'مفعل للكل' : (targetDegree === 'master' ? 'ماجستير فقط' : (targetDegree === 'phd' ? 'دكتوراه فقط' : 'معطل'))} - نوع المؤشر: ${itype} - بوزن أقصى (${maxPoints} نقطة) بنجاح!`);
}

function toggleCoreCriterion(key) {
  if (checkSystemLockGuard()) return;
  if (state.criteria && state.criteria[key]) {
    state.criteria[key].enabled = !state.criteria[key].enabled;
    saveStore();
    if (typeof syncCriteriaToSupabase === 'function') syncCriteriaToSupabase(state.criteria);
    refreshAllViews();
  }
}

function updateCoreCriterionMaxPoints(key, points) {
  if (checkSystemLockGuard()) return;
  if (state.criteria && state.criteria[key]) {
    state.criteria[key].maxPoints = parseFloat(points) || 0;
    saveStore();
    if (typeof syncCriteriaToSupabase === 'function') syncCriteriaToSupabase(state.criteria);
    refreshAllViews();
  }
}

function updateCustomCriterionPoints(id, points) {
  if (checkSystemLockGuard()) return;
  const custom = (state.criteria.customCriteria || []).find(c => c.id === id);
  if (custom) {
    custom.maxPoints = parseFloat(points) || 0;
    saveStore();
    if (typeof syncCriteriaToSupabase === 'function') syncCriteriaToSupabase(state.criteria);
    refreshAllViews();
  }
}

function toggleCustomCriterion(id) {
  if (checkSystemLockGuard()) return;
  const custom = (state.criteria.customCriteria || []).find(c => c.id === id);
  if (custom) {
    custom.enabled = !custom.enabled;
    saveStore();
    if (typeof syncCriteriaToSupabase === 'function') syncCriteriaToSupabase(state.criteria);
    refreshAllViews();
  }
}

function deleteCustomCriterion(id) {
  if (checkSystemLockGuard()) return;
  const custom = (state.criteria.customCriteria || []).find(c => c.id === id);
  if (!custom) return;

  if (confirm(`هل أنت تأكد من رغبتك في حذف المعيار المخصص (${custom.name})؟`)) {
    state.criteria.customCriteria = state.criteria.customCriteria.filter(c => c.id !== id);
    saveStore();
    if (typeof syncCriteriaToSupabase === 'function') syncCriteriaToSupabase(state.criteria);
    refreshAllViews();
  }
}

// ── دوال التعديل والحذف الشاملة لكل صفوف المعايير ──

// فتح نافذة تعديل المعيار الأساسي أو المخصص
function editCriterion(idOrKey) {
  if (checkSystemLockGuard()) return;
  const modal = document.getElementById('modal-edit-criterion');
  if (!modal) return;

  document.getElementById('edit-criterion-id').value = idOrKey;
  const nameEl  = document.getElementById('edit-criterion-name');
  const ptsEl   = document.getElementById('edit-criterion-points');
  const typeEl  = document.getElementById('edit-criterion-type');
  const wrapper = document.getElementById('edit-criterion-type-wrapper');

  const isCore = ['seniority', 'age', 'specialization', 'grade'].includes(idOrKey);

  if (isCore) {
    const c = state.criteria[idOrKey] || {};
    const defaultNames = {
      seniority: 'تاريخ التعيين بالخدمة والجامعة (الأقدمية)',
      age: 'الفئة العمرية للموظف المتنافس (العمر)',
      specialization: 'مدى احتياج الجامعة للتخصص الدراسي',
      grade: 'تقدير المؤهل الأكاديمي السابق (التقدير)'
    };
    if (nameEl) nameEl.value = c.weightName || c.name || defaultNames[idOrKey] || idOrKey;
    if (ptsEl)  ptsEl.value  = c.maxPoints || 5;
    const scopeEl = document.getElementById('edit-criterion-scope');
    if (scopeEl) scopeEl.value = getCriterionTargetDegree(c);
    if (typeEl) typeEl.value = 'binary';
    if (wrapper) wrapper.style.display = 'none';
    const configEl = document.getElementById('edit-criterion-type-config');
    if (configEl) configEl.innerHTML = `
      <div style="background: rgba(37,99,235,0.08); border: 1px solid rgba(37,99,235,0.3); padding: 10px 14px; border-radius: 8px; font-size: 0.82rem; color: #93c5fd;">
        <strong>معيار أساسي:</strong> يمكنك تعديل اسم المعيار ونطاق تفعيله والوزن الأقصى المستحق له. الحسابات الداخلية والشرائح لهذا المعيار مدمجة بالنظام.
      </div>`;
  } else {
    if (wrapper) wrapper.style.display = 'block';
    const c = (state.criteria.customCriteria || []).find(item => item.id === idOrKey);
    if (!c) { alert('المعيار غير موجود!'); return; }

    if (nameEl) nameEl.value = c.name || '';
    if (ptsEl)  ptsEl.value  = c.maxPoints || 5;
    const scopeEl = document.getElementById('edit-criterion-scope');
    if (scopeEl) scopeEl.value = getCriterionTargetDegree(c);
    const itype = c.indicatorType || 'binary';
    if (typeEl) typeEl.value = itype;

    renderEditCriterionTypeConfig(c);
  }

  openModal('modal-edit-criterion');
}

// عرض حقول الإعدادات التفصيلية للنوع داخل مودال التعديل
function renderEditCriterionTypeConfig(existingCriterion = null) {
  const typeEl   = document.getElementById('edit-criterion-type');
  const configEl = document.getElementById('edit-criterion-type-config');
  if (!typeEl || !configEl) return;
  const type = typeEl.value;

  const idOrKey = document.getElementById('edit-criterion-id')?.value;
  const c = existingCriterion || (state.criteria.customCriteria || []).find(item => item.id === idOrKey);

  if (type === 'binary') {
    const bOptions = (c && c.config && c.config.options && c.config.options.length >= 2)
      ? c.config.options
      : [{ label: 'مستمر', points: c ? c.maxPoints : 5 }, { label: 'متاح', points: 3 }];

    configEl.innerHTML = `
      <div style="background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.3); padding: 12px; border-radius: 8px;">
        <div style="font-size: 0.82rem; color: #93c5fd; font-weight: 800; margin-bottom: 10px;">🔵 تعديل خيارَي المعيار المخصص وأوزانهما:</div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div class="edit-binary-option-row" style="display: flex; gap: 8px; align-items: center;">
            <span style="color: #64748b; font-size: 0.75rem; min-width: 72px; text-align: center; background: rgba(59,130,246,0.15); padding: 3px 6px; border-radius: 4px;">الخيار الأول</span>
            <input type="text" class="form-control edit-binary-label" value="${bOptions[0]?.label || ''}" placeholder="مثال: مستمر، نعم، طويل..." style="flex: 2; border: 1px solid rgba(59,130,246,0.5);">
            <input type="number" class="form-control edit-binary-pts" oninput="autoUpdateEditCriterionMaxPoints()" value="${bOptions[0]?.points !== undefined ? bOptions[0].points : ''}" placeholder="نقاط" min="0" style="flex: 1; max-width: 85px; border: 1px solid rgba(59,130,246,0.5);">
          </div>
          <div class="edit-binary-option-row" style="display: flex; gap: 8px; align-items: center;">
            <span style="color: #64748b; font-size: 0.75rem; min-width: 72px; text-align: center; background: rgba(239,68,68,0.1); padding: 3px 6px; border-radius: 4px;">الخيار الثاني</span>
            <input type="text" class="form-control edit-binary-label" value="${bOptions[1]?.label || ''}" placeholder="مثال: متاح، لا، قصير..." style="flex: 2; border: 1px solid rgba(239,68,68,0.4);">
            <input type="number" class="form-control edit-binary-pts" oninput="autoUpdateEditCriterionMaxPoints()" value="${bOptions[1]?.points !== undefined ? bOptions[1].points : ''}" placeholder="نقاط" min="0" style="flex: 1; max-width: 85px; border: 1px solid rgba(239,68,68,0.4);">
          </div>
        </div>
        <div style="font-size: 0.72rem; color: #64748b; margin-top: 8px;">💡 يتحدد سقف المعيار تلقائياً بأعلى درجة تضعها في الخيارات.</div>
      </div>`;
  } else if (type === 'grade') {
    const grades = (c && c.config && c.config.grades && c.config.grades.length > 0) ? c.config.grades : [{ label: 'ممتاز', points: 5 }, { label: 'جيد', points: 3 }];
    const gradeRows = grades.map(g => `
      <div class="edit-grade-option-row" style="display: flex; gap: 8px; align-items: center;">
        <input type="text" class="form-control edit-grade-label" value="${g.label}" placeholder="مثال: ممتاز" style="flex: 2;">
        <input type="number" class="form-control edit-grade-pts" oninput="autoUpdateEditCriterionMaxPoints()" value="${g.points}" placeholder="نقاط" min="0" style="flex: 1; max-width: 80px;">
        <button onclick="this.closest('.edit-grade-option-row').remove(); autoUpdateEditCriterionMaxPoints();" style="background: #ef4444; color: #fff; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer;">✕</button>
      </div>
    `).join('');

    configEl.innerHTML = `
      <div style="background: rgba(234,179,8,0.08); border: 1px solid rgba(234,179,8,0.3); padding: 12px; border-radius: 8px;">
        <div style="font-size: 0.82rem; color: #fde68a; font-weight: 800; margin-bottom: 8px;">🟡 تصنيفات الأداء ونقاطها:</div>
        <div id="edit-grade-options-list" style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px;">
          ${gradeRows}
        </div>
        <button onclick="addEditGradeOptionRow()" class="btn btn-outline btn-sm" style="font-size:0.78rem;">➕ إضافة تصنيف آخر</button>
      </div>`;
  } else if (type === 'bracket') {
    const brackets = (c && c.config && c.config.brackets && c.config.brackets.length > 0) ? c.config.brackets : [{ label: 'أقل من 3 سنوات', min: 0, max: 2, points: 1 }];
    const bracketRows = brackets.map(b => `
      <div class="edit-bracket-option-row" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
        <input type="text" class="form-control edit-bracket-label" value="${b.label}" placeholder="الفئة" style="flex: 2; min-width: 160px;">
        <input type="number" class="form-control edit-bracket-min" value="${b.min}" placeholder="من" min="0" style="flex: 1; max-width: 70px;">
        <input type="number" class="form-control edit-bracket-max" value="${b.max}" placeholder="إلى" min="0" style="flex: 1; max-width: 70px;">
        <input type="number" class="form-control edit-bracket-pts" oninput="autoUpdateEditCriterionMaxPoints()" value="${b.points}" placeholder="نقاط" min="0" style="flex: 1; max-width: 70px;">
        <button onclick="this.closest('.edit-bracket-option-row').remove(); autoUpdateEditCriterionMaxPoints();" style="background: #ef4444; color: #fff; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer;">✕</button>
      </div>
    `).join('');

    configEl.innerHTML = `
      <div style="background: rgba(249,115,22,0.08); border: 1px solid rgba(249,115,22,0.3); padding: 12px; border-radius: 8px;">
        <div style="font-size: 0.82rem; color: #fdba74; font-weight: 800; margin-bottom: 8px;">🟠 المجالات الرقمية ونقاطها:</div>
        <div id="edit-bracket-options-list" style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px;">
          ${bracketRows}
        </div>
        <button onclick="addEditBracketOptionRow()" class="btn btn-outline btn-sm" style="font-size:0.78rem;">➕ إضافة مجال آخر</button>
      </div>`;
  } else if (type === 'numeric') {
    const ppu = (c && c.config && c.config.pointsPerUnit) ? c.config.pointsPerUnit : 1;
    configEl.innerHTML = `
      <div style="background: rgba(139,92,246,0.08); border: 1px solid rgba(139,92,246,0.3); padding: 12px; border-radius: 8px;">
        <label style="font-size: 0.78rem; font-weight: 700; color: #c4b5fd; display: block; margin-bottom: 4px;">🟣 النقاط لكل وحدة:</label>
        <input type="number" id="edit-numeric-points-per-unit" class="form-control" value="${ppu}" min="0.5" step="0.5" style="max-width: 120px;">
      </div>`;
  }
}

function autoUpdateEditCriterionMaxPoints() {
  const typeEl = document.getElementById('edit-criterion-type');
  const ptsEl = document.getElementById('edit-criterion-points');
  if (!typeEl || !ptsEl) return;
  const type = typeEl.value;
  let maxPts = 0;
  if (type === 'binary') {
    document.querySelectorAll('.edit-binary-pts').forEach(inp => {
      const v = parseFloat(inp.value) || 0;
      if (v > maxPts) maxPts = v;
    });
  } else if (type === 'grade') {
    document.querySelectorAll('.edit-grade-pts').forEach(inp => {
      const v = parseFloat(inp.value) || 0;
      if (v > maxPts) maxPts = v;
    });
  } else if (type === 'bracket') {
    document.querySelectorAll('.edit-bracket-pts').forEach(inp => {
      const v = parseFloat(inp.value) || 0;
      if (v > maxPts) maxPts = v;
    });
  }
  if (maxPts > 0) {
    ptsEl.value = maxPts;
  }
}

function addEditGradeOptionRow() {
  const list = document.getElementById('edit-grade-options-list');
  if (!list) return;
  const row = document.createElement('div');
  row.className = 'edit-grade-option-row';
  row.style.cssText = 'display: flex; gap: 8px; align-items: center;';
  row.innerHTML = `
    <input type="text" class="form-control edit-grade-label" placeholder="مثال: ممتاز" style="flex: 2;">
    <input type="number" class="form-control edit-grade-pts" oninput="autoUpdateEditCriterionMaxPoints()" placeholder="نقاط" min="0" style="flex: 1; max-width: 80px;">
    <button onclick="this.closest('.edit-grade-option-row').remove(); autoUpdateEditCriterionMaxPoints();" style="background: #ef4444; color: #fff; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer;">✕</button>
  `;
  list.appendChild(row);
}

function addEditBracketOptionRow() {
  const list = document.getElementById('edit-bracket-options-list');
  if (!list) return;
  const row = document.createElement('div');
  row.className = 'edit-bracket-option-row';
  row.style.cssText = 'display: flex; gap: 8px; align-items: center; flex-wrap: wrap;';
  row.innerHTML = `
    <input type="text" class="form-control edit-bracket-label" placeholder="الفئة" style="flex: 2; min-width: 160px;">
    <input type="number" class="form-control edit-bracket-min" placeholder="من" min="0" style="flex: 1; max-width: 70px;">
    <input type="number" class="form-control edit-bracket-max" placeholder="إلى" min="0" style="flex: 1; max-width: 70px;">
    <input type="number" class="form-control edit-bracket-pts" oninput="autoUpdateEditCriterionMaxPoints()" placeholder="نقاط" min="0" style="flex: 1; max-width: 70px;">
    <button onclick="this.closest('.edit-bracket-option-row').remove(); autoUpdateEditCriterionMaxPoints();" style="background: #ef4444; color: #fff; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer;">✕</button>
  `;
  list.appendChild(row);
}

// حفظ التعديلات على المعيار الأساسي أو المخصص
function saveEditedCriterion() {
  if (checkSystemLockGuard()) return;
  const idOrKey = document.getElementById('edit-criterion-id')?.value;
  const nameEl  = document.getElementById('edit-criterion-name');
  const ptsEl   = document.getElementById('edit-criterion-points');
  const typeEl  = document.getElementById('edit-criterion-type');
  const scopeEl = document.getElementById('edit-criterion-scope');

  if (!idOrKey) return;
  const name      = nameEl ? nameEl.value.trim() : '';
  let maxPoints = ptsEl  ? (parseFloat(ptsEl.value) || 0) : 0;
  const scope     = scopeEl ? scopeEl.value : 'all';

  if (!name) { alert('يرجى إدخال اسم المعيار'); return; }

  const isCore = ['seniority', 'age', 'specialization', 'grade'].includes(idOrKey);

  if (isCore) {
    if (!state.criteria[idOrKey]) state.criteria[idOrKey] = { enabled: true };
    state.criteria[idOrKey].weightName = name;
    state.criteria[idOrKey].name = name;
    state.criteria[idOrKey].maxPoints = maxPoints || 5;
    state.criteria[idOrKey].targetDegree = scope;
    state.criteria[idOrKey].enabled = (scope !== 'none');
  } else {
    // Custom criterion
    const cIndex = (state.criteria.customCriteria || []).findIndex(item => item.id === idOrKey);
    if (cIndex === -1) { alert('المعيار غير موجود!'); return; }

    const itype = typeEl ? typeEl.value : 'binary';
    let config = {};

    if (itype === 'binary') {
      const rows = document.querySelectorAll('.edit-binary-option-row');
      const options = [];
      rows.forEach(row => {
        const label = row.querySelector('.edit-binary-label')?.value.trim();
        const pts   = parseFloat(row.querySelector('.edit-binary-pts')?.value);
        if (label) options.push({ label, points: isNaN(pts) ? 0 : pts });
      });
      if (options.length === 0) {
        options.push({ label: 'مستمر', points: maxPoints || 5 });
        options.push({ label: 'متاح', points: 3 });
      } else if (options.length === 1) {
        options.push({ label: 'متاح', points: 3 });
      }
      const optMax = Math.max(...options.map(o => o.points || 0), 0);
      if (optMax > 0) maxPoints = optMax;
      config = { options };

    } else if (itype === 'grade') {
      const rows  = document.querySelectorAll('.edit-grade-option-row');
      const grades = [];
      rows.forEach(row => {
        const label = row.querySelector('.edit-grade-label')?.value.trim();
        const pts   = parseFloat(row.querySelector('.edit-grade-pts')?.value) || 0;
        if (label) grades.push({ label, points: pts });
      });
      if (grades.length === 0) { alert('يرجى إضافة تصنيف واحد على الأقل للمعيار التقديري'); return; }
      const gMax = Math.max(...grades.map(g => g.points || 0), 0);
      if (gMax > 0) maxPoints = gMax;
      config = { grades };

    } else if (itype === 'bracket') {
      const rows    = document.querySelectorAll('.edit-bracket-option-row');
      const brackets = [];
      rows.forEach(row => {
        const label = row.querySelector('.edit-bracket-label')?.value.trim();
        const min   = parseFloat(row.querySelector('.edit-bracket-min')?.value);
        const max   = parseFloat(row.querySelector('.edit-bracket-max')?.value);
        const pts   = parseFloat(row.querySelector('.edit-bracket-pts')?.value) || 0;
        if (label && !isNaN(min) && !isNaN(max)) brackets.push({ label, min, max, points: pts });
      });
      if (brackets.length === 0) { alert('يرجى إضافة مجال رقمي واحد على الأقل للمعيار الشريحي'); return; }
      const bMax = Math.max(...brackets.map(b => b.points || 0), 0);
      if (bMax > 0) maxPoints = bMax;
      config = { brackets };

    } else if (itype === 'numeric') {
      const ppu = parseFloat(document.getElementById('edit-numeric-points-per-unit')?.value) || 1;
      config = { pointsPerUnit: ppu };
    }

    if (maxPoints <= 0) maxPoints = 5;

    state.criteria.customCriteria[cIndex].name = name;
    state.criteria.customCriteria[cIndex].maxPoints = maxPoints;
    state.criteria.customCriteria[cIndex].indicatorType = itype;
    state.criteria.customCriteria[cIndex].config = config;
    state.criteria.customCriteria[cIndex].targetDegree = scope;
    state.criteria.customCriteria[cIndex].enabled = (scope !== 'none');
  }

  saveStore();
  if (typeof syncCriteriaToSupabase === 'function') syncCriteriaToSupabase(state.criteria);
  refreshAllViews();
  closeModal('modal-edit-criterion');
  alert(`✅ تم حفظ تعديلات المعيار (${name}) بنجاح!`);
}

// دالة الحذف العامة للمعيار أساسياً أو مخصصاً
function deleteCriterion(idOrKey) {
  if (checkSystemLockGuard()) return;
  const isCore = ['seniority', 'age', 'specialization', 'grade'].includes(idOrKey);

  if (isCore) {
    const defaultNames = {
      seniority: 'تاريخ التعيين بالخدمة والجامعة (الأقدمية)',
      age: 'الفئة العمرية للموظف المتنافس (العمر)',
      specialization: 'مدى احتياج الجامعة للتخصص الدراسي',
      grade: 'تقدير المؤهل الأكاديمي السابق (التقدير)'
    };
    const cName = state.criteria[idOrKey]?.weightName || state.criteria[idOrKey]?.name || defaultNames[idOrKey];
    if (confirm(`🗑️ هل أنت متأكد من رغبتك في حذف وإيقاف المعيار الأساسي (${cName}) من المفاضلة؟`)) {
      if (state.criteria[idOrKey]) {
        state.criteria[idOrKey].enabled = false;
        saveStore();
        if (typeof syncCriteriaToSupabase === 'function') syncCriteriaToSupabase(state.criteria);
        refreshAllViews();
        alert(`🗑️ تم حذف/إيقاف المعيار الأساسي (${cName}) بنجاح!`);
      }
    }
  } else {
    deleteCustomCriterion(idOrKey);
  }
}

async function saveAllCriteriaAndSettings() {
  if (checkSystemLockGuard()) return;

  // 1. مسح وتثبيت خيارات المعايير الأساسية من واجهة المستخدم مباشرة
  const coreKeys = ['seniority', 'age', 'specialization', 'grade'];
  coreKeys.forEach(k => {
    if (!state.criteria[k]) state.criteria[k] = {};
    const ptsInput = document.querySelector(`input[onchange*="updateCoreCriterionMaxPoints('${k}'"]`);
    if (ptsInput) {
      const v = parseFloat(ptsInput.value);
      if (!isNaN(v) && v > 0) state.criteria[k].maxPoints = v;
    }
    const scopeSelect = document.querySelector(`select[onchange*="updateCriterionTargetDegree('${k}'"]`);
    if (scopeSelect && scopeSelect.value) {
      state.criteria[k].targetDegree = scopeSelect.value;
      state.criteria[k].enabled = (scopeSelect.value !== 'none');
    }
  });

  // 2. مسح وتثبيت خيارات المعايير المخصصة
  (state.criteria.customCriteria || []).forEach(c => {
    const ptsInput = document.querySelector(`input[onchange*="updateCustomCriterionPoints('${c.id}'"]`);
    if (ptsInput) {
      const v = parseFloat(ptsInput.value);
      if (!isNaN(v) && v > 0) c.maxPoints = v;
    }
    const scopeSelect = document.querySelector(`select[onchange*="updateCriterionTargetDegree('${c.id}'"]`);
    if (scopeSelect && scopeSelect.value) {
      c.targetDegree = scopeSelect.value;
      c.enabled = (scopeSelect.value !== 'none');
    }
  });

  // 3. مسح وتثبيت إعدادات الجلسة ورئاسة الجامعة
  if (document.getElementById('input-master-grants')) {
    state.settings.masterGrantsCount = parseInt(document.getElementById('input-master-grants').value) || 3;
  }
  if (document.getElementById('input-phd-grants')) {
    state.settings.phdGrantsCount = parseInt(document.getElementById('input-phd-grants').value) || 3;
  }
  if (document.getElementById('input-ref-year')) {
    state.settings.referenceYear = parseInt(document.getElementById('input-ref-year').value) || 2026;
  }
  if (document.getElementById('input-rector-name')) {
    state.settings.rectorName = document.getElementById('input-rector-name').value.trim();
  }
  if (document.getElementById('input-comp-location')) {
    state.settings.competitionLocation = document.getElementById('input-comp-location').value.trim();
  }
  if (document.getElementById('input-comp-date')) {
    state.settings.competitionDate = document.getElementById('input-comp-date').value.trim();
  }
  if (document.getElementById('input-app-title')) {
    state.settings.applicationTitle = document.getElementById('input-app-title').value.trim();
  }

  // 4. الحفظ في LocalStorage
  saveStore();

  // 5. المزامنة السحابية المؤكدة مع Supabase
  try {
    if (typeof syncCriteriaToSupabase === 'function') {
      await syncCriteriaToSupabase(state.criteria);
    }
    if (typeof syncSettingsToSupabase === 'function') {
      await syncSettingsToSupabase(state.settings);
    }
  } catch (e) {
    console.warn('Sync warning:', e);
  }

  refreshAllViews();
  alert('✅ تم حفظ وتثبيت كافة التعديلات والأوزان والمعايير بنجاح وتحديث كافة المصفوفات التنافسية!');
}

// نافذة ودالة تنفيذ المفاضلة وبدء الدورة التنافسية الرسمية
function openRunCompetitionModal() {
  const deficientList = getCandidatesWithDeficiencies();
  
  // فحص حاسم فوري عند الضغط على زر "تنفيذ وتطبيق المفاضلة" من الشريط العلوي
  if (deficientList.length > 0 && !state.hasRunDeficient) {
    const warningTextEl = document.getElementById('deficiencies-warning-text');
    if (warningTextEl) {
      warningTextEl.innerHTML = `تم الفحص الآلي المباشر وتبين وجود عدد <strong>(${deficientList.length}) متنافسين</strong> بياناتهم غير مستوفاة وتحتوي على نواقص حاسمة في (تاريخ التعيين، السن، التقدير، أو التخصص).`;
    }
    openModal('modal-run-deficiencies-warning');
    return;
  }

  if (document.getElementById('run-master-grants')) {
    document.getElementById('run-master-grants').value = state.settings.masterGrantsCount || 3;
  }
  if (document.getElementById('run-phd-grants')) {
    document.getElementById('run-phd-grants').value = state.settings.phdGrantsCount || 3;
  }
  openModal('modal-run-competition');
}

function switchMainTab(targetTabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  const btn = document.querySelector(`.tab-btn[data-tab="${targetTabId}"]`);
  const content = document.getElementById(targetTabId);

  if (btn && btn.classList) btn.classList.add('active');
  if (content && content.classList) content.classList.add('active');
}

// دالة حصر استخراج المتنافسين الذين لديهم نواقص في البيانات
function getCandidatesWithDeficiencies() {
  return (state.candidates || []).filter(c => {
    const hiring = c.hiring_univ || c.hiring_service;
    const isHiringValid = !isInvalidHiringValue(hiring);
    const isBirthValid = !isInvalidBirthValue(c.birth_date);
    const isGradeValid = !isInvalidGradeValue(c.grade);
    const isGradYearValid = c.grad_year && c.grad_year !== '-' && c.grad_year !== 'ـــــــــــــ' && parseInt(c.grad_year) > 0;
    const isSpecValid = !isInvalidSpecializationValue(c.specialization);
    return !isHiringValid || !isBirthValid || !isGradeValid || !isGradYearValid || !isSpecValid;
  });
}

function executeCompetitionRun(isForced = false) {
  try {
    const deficientList = getCandidatesWithDeficiencies();
    
    // إذا وجدت نواقص ولم يضغط المستخدم على "تنفيذ على أي حال"
    if (deficientList.length > 0 && !isForced && !state.hasRunDeficient) {
      closeModal('modal-run-competition');
      const warningTextEl = document.getElementById('deficiencies-warning-text');
      if (warningTextEl) {
        warningTextEl.innerHTML = `يوجد عدد <strong>(${deficientList.length}) متنافسين</strong> بياناتهم غير مستوفاة وتحتوي على نواقص حاسمة في (تاريخ التعيين، السن، التقدير، أو التخصص).`;
      }
      openModal('modal-run-deficiencies-warning');
      return;
    }

    if (isForced) {
      state.hasRunDeficient = true;
    }

    closeModal('modal-run-deficiencies-warning');
    closeModal('modal-run-competition');

    const masterEl = document.getElementById('run-master-grants');
    const phdEl = document.getElementById('run-phd-grants');
    const cycleEl = document.getElementById('run-cycle-title');

    const masterGrants = masterEl ? (parseInt(masterEl.value) || 3) : (state.settings.masterGrantsCount || 3);
    const phdGrants = phdEl ? (parseInt(phdEl.value) || 3) : (state.settings.phdGrantsCount || 3);
    const cycleTitle = cycleEl && cycleEl.value.trim() ? cycleEl.value.trim() : (state.settings.councilName || 'دورة المفاضلة والتنافس');

    state.settings.masterGrantsCount = masterGrants;
    state.settings.phdGrantsCount = phdGrants;
    if (cycleTitle) state.settings.councilName = cycleTitle;

    saveStore();

    // إطلاق شاشة المحاكاة البانورامية والعداد التفاعلي بدلاً من الرسالة التقليدية
    runPanoramicSimulation();
  } catch (err) {
    console.error('Error executing competition run:', err);
  }
}

function forceExecuteCompetitionRun() {
  executeCompetitionRun(true);
}

function goToDeficienciesReport() {
  closeModal('modal-run-deficiencies-warning');
  switchMainTab('tab-analytics');
  if (typeof switchAnalyticsSubTab === 'function') {
    switchAnalyticsSubTab('subtab-deficiencies');
  } else {
    currentAnalyticsSubTab = 'subtab-deficiencies';
    renderAnalyticsView();
  }
}

// دالة تشغيل العرض الدرامي البانورامي والعداد التفاعلي صعوداً
function runPanoramicSimulation() {
  const overlay = document.getElementById('panoramic-simulation-overlay');
  const counterEl = document.getElementById('panoramic-counter-number');
  const progressBar = document.getElementById('panoramic-progress-bar');
  const statusText = document.getElementById('panoramic-status-text');

  if (!overlay || !counterEl) {
    refreshAllViews();
    switchMainTab('tab-scoring');
    return;
  }

  overlay.style.display = 'flex';
  const total = state.candidates ? state.candidates.length : 0;

  let currentCount = 0;
  let progress = 0;
  counterEl.textContent = '0';
  if (progressBar) progressBar.style.width = '0%';

  const duration = 1800; // 1.8 ثانية من العرض الدرامي الباهر
  const steps = 30;
  const intervalTime = duration / steps;
  const countIncrement = Math.ceil(total / steps) || 1;

  const timer = setInterval(() => {
    currentCount += countIncrement;
    if (currentCount >= total) currentCount = total;
    progress += (100 / steps);
    if (progress >= 100) progress = 100;

    counterEl.textContent = String(currentCount);
    if (progressBar) progressBar.style.width = `${progress}%`;

    if (progress < 40) {
      if (statusText) statusText.innerHTML = '🔍 جاري مطابقة بيانات الخدمة وحصر أقدمية التعيين...';
    } else if (progress < 80) {
      if (statusText) statusText.innerHTML = '📊 احتساب النقاط المعيارية وحسم التعادلات عند خط القبول...';
    } else {
      if (statusText) statusText.innerHTML = '🎉 اكتملت المفاضلة الإلكترونية بنجاح!';
    }

    if (progress >= 100 && currentCount >= total) {
      clearInterval(timer);
      setTimeout(() => {
        overlay.style.display = 'none';
        refreshAllViews();
        switchMainTab('tab-scoring');
      }, 400);
    }
  }, intervalTime);
}

function printDetailedReportDraft() {
  document.body.classList.add('is-draft-print');
  const watermarkEl = document.getElementById('report-print-watermark');
  if (watermarkEl) watermarkEl.style.display = 'block';

  window.print();

  setTimeout(() => {
    document.body.classList.remove('is-draft-print');
    if (watermarkEl) watermarkEl.style.display = 'none';
  }, 1000);
}

function printDetailedReportFinal() {
  document.body.classList.remove('is-draft-print');
  const watermarkEl = document.getElementById('report-print-watermark');
  if (watermarkEl) watermarkEl.style.display = 'none';

  window.print();
}

function printDetailedReport() {
  printDetailedReportFinal();
}

function printScoringMatrixDraft() {
  document.body.classList.add('is-scoring-print');
  document.body.classList.add('is-draft-print');
  const watermarkEl = document.getElementById('scoring-print-watermark');
  if (watermarkEl) watermarkEl.style.display = 'block';

  window.print();

  setTimeout(() => {
    document.body.classList.remove('is-scoring-print');
    document.body.classList.remove('is-draft-print');
    if (watermarkEl) watermarkEl.style.display = 'none';
  }, 1000);
}

function printScoringMatrixFinal() {
  document.body.classList.add('is-scoring-print');
  document.body.classList.remove('is-draft-print');
  const watermarkEl = document.getElementById('scoring-print-watermark');
  if (watermarkEl) watermarkEl.style.display = 'none';

  window.print();

  setTimeout(() => {
    document.body.classList.remove('is-scoring-print');
  }, 1000);
}

// دوال تهيئة وإدارة أعضاء لجنة المفاضلة والتوقيعات
function setCommitteeMembersCountFromInput() {
  const inputEl = document.getElementById('input-committee-count');
  const targetCount = inputEl ? (parseInt(inputEl.value) || 4) : 4;

  if (targetCount < 1) {
    alert('عدد أعضاء اللجنة يجب أن يكون عضو واحد على الأقل');
    return;
  }

  if (!state.committeeMembers) state.committeeMembers = [];

  const currentCount = state.committeeMembers.length;

  if (targetCount > currentCount) {
    for (let i = currentCount; i < targetCount; i++) {
      state.committeeMembers.push({
        id: Date.now() + i,
        name: `عضو لجنة ${i + 1}`,
        adminTitle: 'عضو الإدارة',
        committeeRole: i === 0 ? 'رئيس اللجنة' : 'عضو اللجنة'
      });
    }
  } else if (targetCount < currentCount) {
    state.committeeMembers = state.committeeMembers.slice(0, targetCount);
  }

  saveStore();
  refreshAllViews();
  alert(`تم تعديل وتطبيق عدد أعضاء اللجنة إلى (${targetCount} أعضاء) بنجاح!`);
}

function updateRectorName(val) {
  if (!state.settings) state.settings = {};
  state.settings.rectorName = val.trim();
  saveStore();
  renderDetailedReport();
}

function updateCommitteeMember(index, field, value) {
  if (state.committeeMembers && state.committeeMembers[index]) {
    state.committeeMembers[index][field] = value;
    saveStore();
    renderDetailedReport();
  }
}

function addCommitteeMember() {
  if (!state.committeeMembers) state.committeeMembers = [];
  const newIdx = state.committeeMembers.length + 1;
  state.committeeMembers.push({
    id: Date.now(),
    name: `عضو جديد ${newIdx}`,
    adminTitle: 'المسمى الوظيفي',
    committeeRole: 'عضو اللجنة'
  });
  saveStore();
  refreshAllViews();
}

function deleteCommitteeMember(index) {
  if (!state.committeeMembers) return;
  const member = state.committeeMembers[index];
  if (confirm(`هل ترغب في حذف العضو (${member ? member.name : ''}) من توقيعات اللجنة؟`)) {
    state.committeeMembers.splice(index, 1);
    saveStore();
    refreshAllViews();
  }
}

// دوال مساعدة موحدة لتنسيق وتصدير بيانات المتنافسين إلى Excel
function buildCandidateExportRow(c, idx) {
  const activeCustom = (state.criteria && state.criteria.customCriteria || []).filter(item => item.enabled);
  const rawHiring = (c.hiring_univ || c.hiring_service || '-').replace('00:00:00 ', '').replace('00:00:00', '').trim();
  const rawBirth  = (c.birth_date || '-').replace('00:00:00 ', '').replace('00:00:00', '').trim();
  const currentYear = (state.settings && state.settings.referenceYear) || 2026;
  const birthYear = parseInt(c.birth_date) || (c.birth_date ? (c.birth_date.match(/(\d{4})/) || [])[1] : 0);
  const calculatedAge = birthYear ? (currentYear - parseInt(birthYear)) : '-';

  const row = {
    'م': idx + 1,
    'اسم الموظف المتنافس': c.name,
    'الدرجة المطلوبة': c.degree,
    'التخصص': c.specialization || '-',
    'تاريخ التعيين بالخدمة/الجامعة': rawHiring,
    'تاريخ الميلاد': rawBirth,
    'العمر المحسوب (سنة)': calculatedAge,
    'سنة التخرج': c.grad_year || '-',
    'التقدير الأكاديمي': c.grade || '-'
  };

  activeCustom.forEach(custom => {
    const computedPts = (c.scores && c.scores.customScores && c.scores.customScores[custom.id] !== undefined)
      ? c.scores.customScores[custom.id]
      : (c.customValues && c.customValues[custom.id] !== undefined ? parseFloat(c.customValues[custom.id]) || 0 : 0);
    const itype = custom.indicatorType || 'binary';
    let dispLabel = '';
    if (itype === 'binary') {
      const bOpts = (custom.config && custom.config.options && custom.config.options.length >= 2)
        ? custom.config.options
        : [{ label: 'مستمر', points: custom.maxPoints || 5 }, { label: 'متاح', points: 3 }];
      const matched = bOpts.find(o => o.points === computedPts);
      dispLabel = matched ? matched.label : (computedPts >= 5 ? 'مستمر' : 'متاح');
    } else {
      dispLabel = `${computedPts}`;
    }
    const colName = (custom.name && custom.name.includes('الممارسة')) ? 'الاستمرارية' : custom.name;
    row[colName] = dispLabel;
  });

  return row;
}

function buildRankedCandidateExportRow(c) {
  const activeCustom = (state.criteria && state.criteria.customCriteria || []).filter(item => item.enabled);
  const rawHiring = (c.hiring_univ || c.hiring_service || '-').replace('00:00:00 ', '').replace('00:00:00', '').trim();
  const rawBirth  = (c.birth_date || '-').replace('00:00:00 ', '').replace('00:00:00', '').trim();
  const currentYear = (state.settings && state.settings.referenceYear) || 2026;
  const birthYear = parseInt(c.birth_date) || (c.birth_date ? (c.birth_date.match(/(\d{4})/) || [])[1] : 0);
  const calculatedAge = birthYear ? (currentYear - parseInt(birthYear)) : '-';

  const row = {
    'الترتيب': c.rank || '-',
    'اسم الموظف المتنافس': c.name,
    'الدرجة': c.degree,
    'التخصص': c.specialization || '-',
    'تاريخ التعيين': rawHiring,
    'تاريخ الميلاد (العمر)': `${rawBirth} (${calculatedAge} سنة)`,
    'التقدير': c.grade || '-',
    'نقاط الأقدمية (10)': (c.scores && c.scores.seniorityScore !== undefined) ? c.scores.seniorityScore : 0,
    'نقاط العمر (5)': (c.scores && c.scores.ageScore !== undefined) ? c.scores.ageScore : 0,
    'نقاط التخصص (5)': (c.scores && c.scores.specScore !== undefined) ? c.scores.specScore : 0,
    'نقاط التقدير (5)': (c.scores && c.scores.gradeScore !== undefined) ? c.scores.gradeScore : 0
  };

  activeCustom.forEach(custom => {
    const computedPts = (c.scores && c.scores.customScores && c.scores.customScores[custom.id] !== undefined)
      ? c.scores.customScores[custom.id]
      : 0;
    const colName = (custom.name && custom.name.includes('الممارسة')) ? `نقاط الاستمرارية (${custom.maxPoints || 5})` : `نقاط ${custom.name} (${custom.maxPoints || 5})`;
    row[colName] = computedPts;
  });

  row['المجموع الكلي'] = (c.scores && c.scores.totalScore !== undefined) ? c.scores.totalScore : 0;
  row['نتيجة التنافس'] = c.status || (c.rank <= (c.degree === 'ماجستير' ? ((state.settings && state.settings.masterGrantsCount) || 3) : ((state.settings && state.settings.phdGrantsCount) || 3)) ? 'مقبول' : 'خارج خط المنح');
  row['معيار الحسم والترجيح'] = c.tieBreaker || '—';

  return row;
}

// 1. تصدير كشف وسجل المتنافسين الأولي (Excel)
function exportCandidatesToExcel() {
  if (typeof XLSX === 'undefined') {
    alert('مكتبة تصدير الإكسل غير محملة');
    return;
  }
  const degreeFilter = (document.getElementById('filter-degree') ? document.getElementById('filter-degree').value : '')
    || (document.getElementById('select-print-cards-degree') ? document.getElementById('select-print-cards-degree').value : '');

  const wb = XLSX.utils.book_new();

  if (degreeFilter === 'ماجستير') {
    const list = (state.candidates || []).filter(c => c.degree === 'ماجستير');
    const data = list.map((c, i) => buildCandidateExportRow(c, i));
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "سجل متنافسي الماجستير");
    XLSX.writeFile(wb, "سجل_متنافسي_الماجستير_جامعة_صنعاء_2026.xlsx");
  } else if (degreeFilter === 'دكتوراه') {
    const list = (state.candidates || []).filter(c => c.degree === 'دكتوراه');
    const data = list.map((c, i) => buildCandidateExportRow(c, i));
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "سجل متنافسي الدكتوراه");
    XLSX.writeFile(wb, "سجل_متنافسي_الدكتوراه_جامعة_صنعاء_2026.xlsx");
  } else {
    const masters = (state.candidates || []).filter(c => c.degree === 'ماجستير');
    const phds = (state.candidates || []).filter(c => c.degree === 'دكتوراه');
    
    const wsMaster = XLSX.utils.json_to_sheet(masters.map((c, i) => buildCandidateExportRow(c, i)));
    const wsPhd = XLSX.utils.json_to_sheet(phds.map((c, i) => buildCandidateExportRow(c, i)));
    const wsAll = XLSX.utils.json_to_sheet((state.candidates || []).map((c, i) => buildCandidateExportRow(c, i)));

    XLSX.utils.book_append_sheet(wb, wsMaster, "متنافسو الماجستير");
    XLSX.utils.book_append_sheet(wb, wsPhd, "متنافسو الدكتوراه");
    XLSX.utils.book_append_sheet(wb, wsAll, "السجل الشامل العام");
    XLSX.writeFile(wb, "سجل_المتنافسين_العام_جامعة_صنعاء_2026.xlsx");
  }
}

// 2. تصدير مصفوفة التنافس والترتيب التلقائي (Excel)
function exportScoringMatrixToExcel() {
  if (typeof XLSX === 'undefined') {
    alert('مكتبة تصدير الإكسل غير محملة');
    return;
  }
  const degree = document.getElementById('filter-rankings-degree') ? document.getElementById('filter-rankings-degree').value : 'ماجستير';
  const ranked = getRankedCandidates(degree);

  const wb = XLSX.utils.book_new();
  const data = ranked.map(c => buildRankedCandidateExportRow(c));
  const ws = XLSX.utils.json_to_sheet(data);

  const sheetName = degree === 'ماجستير' ? "مصفوفة الماجستير" : "مصفوفة الدكتوراه";
  const fileName = degree === 'ماجستير' ? "مصفوفة_مفاضلة_الماجستير_جامعة_صنعاء_2026.xlsx" : "مصفوفة_مفاضلة_الدكتوراه_جامعة_صنعاء_2026.xlsx";

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}

// 3. تصدير التقرير التفصيلي والنتائج الختامية (Excel)
function exportReportToExcel() {
  if (typeof XLSX === 'undefined') {
    alert('مكتبة تصدير الإكسل غير محملة');
    return;
  }
  const degreeFilter = document.getElementById('report-degree-filter') ? document.getElementById('report-degree-filter').value : 'الكل';

  const wb = XLSX.utils.book_new();

  if (degreeFilter === 'ماجستير') {
    const ranked = getRankedCandidates('ماجستير');
    const ws = XLSX.utils.json_to_sheet(ranked.map(c => buildRankedCandidateExportRow(c)));
    XLSX.utils.book_append_sheet(wb, ws, "نتائج مفاضلة الماجستير");
    XLSX.writeFile(wb, "تقرير_مفاضلة_الماجستير_جامعة_صنعاء_2026.xlsx");
  } else if (degreeFilter === 'دكتوراه') {
    const ranked = getRankedCandidates('دكتوراه');
    const ws = XLSX.utils.json_to_sheet(ranked.map(c => buildRankedCandidateExportRow(c)));
    XLSX.utils.book_append_sheet(wb, ws, "نتائج مفاضلة الدكتوراه");
    XLSX.writeFile(wb, "تقرير_مفاضلة_الدكتوراه_جامعة_صنعاء_2026.xlsx");
  } else {
    const masters = getRankedCandidates('ماجستير');
    const phds = getRankedCandidates('دكتوراه');

    const wsMaster = XLSX.utils.json_to_sheet(masters.map(c => buildRankedCandidateExportRow(c)));
    const wsPhd = XLSX.utils.json_to_sheet(phds.map(c => buildRankedCandidateExportRow(c)));

    XLSX.utils.book_append_sheet(wb, wsMaster, "مفاضلة الماجستير");
    XLSX.utils.book_append_sheet(wb, wsPhd, "مفاضلة الدكتوراه");
    XLSX.writeFile(wb, "التقرير_التفصيلي_الشامل_لمفاضلة_جامعة_صنعاء_2026.xlsx");
  }
}

// ==========================================
// 6. شاشة التقارير التحليلية والرقابية المتقدمة (Analytics & Audit Engine)
// ==========================================

let currentAnalyticsSubTab = 'subtab-strengths';

function switchAnalyticsSubTab(subTabId) {
  currentAnalyticsSubTab = subTabId;
  document.querySelectorAll('.analytics-nav-tabs .subtab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.subtab === subTabId);
  });
  renderAnalyticsView();
}

function renderAnalyticsView() {
  const container = document.getElementById('analytics-content-container');
  if (!container) return;

  const filterEl = document.getElementById('analytics-degree-filter');
  const selectedDegree = filterEl ? filterEl.value : 'الكل';

  if (currentAnalyticsSubTab === 'subtab-strengths') {
    renderStrengthsWeaknessesReport(container, selectedDegree);
  } else if (currentAnalyticsSubTab === 'subtab-deficiencies') {
    renderDeficienciesAuditReport(container, selectedDegree);
  } else if (currentAnalyticsSubTab === 'subtab-specs') {
    renderPureSpecializationsReport(container, selectedDegree);
  } else if (currentAnalyticsSubTab === 'subtab-charts') {
    renderAgeAndSpecCharts(container, selectedDegree);
  }
}

// حساب نقاط القوة والضعف للمتنافس
function calculateCandidateStrengthsAndWeaknesses(c) {
  const strengths = [];
  const weaknesses = [];

  // 1. تحليل الأقدمية (الوزن الأعلى 10)
  if (c.scores.seniorityScore >= 8) {
    strengths.push(`أقدمية تعيين ممتازة (${c.scores.seniorityScore}/10 نقاط)`);
  } else if (c.scores.seniorityScore <= 3) {
    weaknesses.push(`أقدمية تعيين حديثة نسبياً (${c.scores.seniorityScore}/10 نقاط)`);
  }

  // 2. تحليل الفئة العمرية (الوزن الأعلى 5)
  if (c.scores.ageScore >= 4) {
    strengths.push(`سن متقدم ورصيد خبرة ممتد (${c.scores.ageScore}/5 نقاط)`);
  } else if (c.scores.ageScore <= 2) {
    weaknesses.push(`فئة عمرية حديثة السن (${c.scores.ageScore}/5 نقاط)`);
  }

  // 3. تحليل الاحتياج والتخصص (الوزن الأعلى 5)
  if (c.scores.specScore >= 5) {
    strengths.push(`تخصص عالي الاحتياج والأولوية (${c.scores.specScore}/5 نقاط)`);
  } else if (c.scores.specScore <= 2) {
    weaknesses.push(`تخصص عام الاحتياج (${c.scores.specScore}/5 نقاط)`);
  }

  // 4. تحليل التقدير العلمي (الوزن الأعلى 5)
  if (c.scores.gradeScore >= 4) {
    strengths.push(`مؤهل علمي بدرجة (${c.grade || 'ممتاز/جيد جداً'})`);
  } else if (c.scores.gradeScore <= 2) {
    weaknesses.push(`تقدير المؤهل العلمي (${c.grade || 'مقبول'})`);
  }

  // 5. المعايير الإضافية المخصصة المفعلة (ديناميكياً)
  const activeCustom = (state.criteria.customCriteria || []).filter(item => item.enabled);
  activeCustom.forEach(custom => {
    const computedPts = (c.scores.customScores && c.scores.customScores[custom.id] !== undefined)
      ? c.scores.customScores[custom.id] : 0;
    const maxPts = custom.maxPoints || 5;
    const dName = getDisplayName(custom.name);
    if (computedPts >= (maxPts / 2) && computedPts > 0) {
      strengths.push(`${dName} (${computedPts}/${maxPts} نقاط)`);
    } else {
      weaknesses.push(`${dName} (${computedPts}/${maxPts} نقاط)`);
    }
  });

  if (strengths.length === 0) strengths.push('متوسط التقييم العام بالمعايير');
  if (weaknesses.length === 0) weaknesses.push('لا توجد نقاط ضعف بارزة');

  return { strengths, weaknesses };
}

// 1. تقرير نقاط القوة والضعف للمتنافسين (جدول مصفوفة إحصائية ثنائية 1 / 0)
function renderStrengthsWeaknessesReport(container, selectedDegree = 'الكل') {
  const allCandidates = getRankedCandidates(selectedDegree);
  const activeCustom = (state.criteria.customCriteria || []).filter(c => c.enabled);

  container.innerHTML = `
    <div class="card" dir="rtl">
      <div class="card-header" style="flex-wrap: wrap; gap: 12px;">
        <div>
          <h3 class="card-title">المصفوفة الإحصائية لنقاط القوة ونقاط الضعف التنافسية لكل متقدم</h3>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin: 4px 0 0 0;">
            تقييم رقمي ثنائي حاسم لمعايير المفاضلة (تُرمز نقطة القوة بالرمز 1 ونقطة الضعف بالرمز 0) لتسهيل اتخاذ القرار الرقابي.
          </p>
        </div>
        <span class="status-badge status-accepted" style="font-size: 0.88rem; background: rgba(37, 99, 235, 0.18); color: #60a5fa; border: 1px solid rgba(37, 99, 235, 0.4);">
          إجمالي المتنافسين الخاضعين للتحليل: ${allCandidates.length} متنافس
        </span>
      </div>

      <div class="table-responsive" style="margin-top: 15px; overflow-x: auto;">
        <table class="data-table" style="width: 100%; border-collapse: collapse; text-align: center; font-size: 0.85rem;">
          <thead>
            <tr>
              <th style="width: 3%;">#</th>
              <th style="width: 18%; text-align: right;">اسم المتنافس / الموظف</th>
              <th style="width: 10%;">الأقدمية</th>
              <th style="width: 9%;">العمر</th>
              <th style="width: 10%;">التخصص</th>
              <th style="width: 9%;">التقدير</th>
              ${activeCustom.map(c => `<th style="width: 10%;">${getDisplayName(c.name)}</th>`).join('')}
              <th style="width: 8%;">قوة</th>
              <th style="width: 8%;">ضعف</th>
              <th style="width: 13%;">مؤشرات</th>
            </tr>
          </thead>
          <tbody>
            ${allCandidates.length === 0 ? `
              <tr>
                <td colspan="${7 + activeCustom.length}" style="padding: 30px; text-align: center; color: var(--text-muted);">لا يوجد متنافسون في هذه الفئة</td>
              </tr>
            ` : allCandidates.map((c, idx) => {
              const sen1 = c.scores.seniorityScore >= 6 ? 1 : 0;
              const age1 = c.scores.ageScore >= 3 ? 1 : 0;
              const spec1 = c.scores.specScore >= 3.5 ? 1 : 0;
              const grade1 = c.scores.gradeScore >= 4 ? 1 : 0;

              // تقييم المعايير المخصصة المفعلة (1 = قوة، 0 = ضعف)
              const customBinaryResults = activeCustom.map(custom => {
                const computedPts = (c.scores.customScores && c.scores.customScores[custom.id] !== undefined)
                  ? c.scores.customScores[custom.id] : 0;
                const maxPts = custom.maxPoints || 5;
                const isStrength = (computedPts >= (maxPts / 2) && computedPts > 0) ? 1 : 0;
                return {
                  custom,
                  pts: computedPts,
                  isStrength
                };
              });

              const totalCriteriaCount = 4 + activeCustom.length;
              const totalStrengths = sen1 + age1 + spec1 + grade1 + customBinaryResults.reduce((sum, r) => sum + r.isStrength, 0);
              const totalWeaknesses = totalCriteriaCount - totalStrengths;
              const strengthPercent = totalCriteriaCount > 0 ? (totalStrengths / totalCriteriaCount * 100) : 0;

              let statusBadge = '';
              if (strengthPercent >= 75) {
                statusBadge = `<span class="badge-status badge-accepted" style="background: rgba(16, 185, 129, 0.22); color: #34d399; font-weight: 900; border: 1px solid #10b981; padding: 3px 8px; font-size: 0.78rem; white-space: nowrap;">ممتاز (${strengthPercent.toFixed(0)}%)</span>`;
              } else if (strengthPercent >= 45) {
                statusBadge = `<span class="badge-status" style="background: rgba(245, 158, 11, 0.22); color: #f59e0b; font-weight: 900; border: 1px solid #f59e0b; padding: 3px 8px; font-size: 0.78rem; white-space: nowrap;">متوازن (${strengthPercent.toFixed(0)}%)</span>`;
              } else {
                statusBadge = `<span class="badge-status badge-rejected" style="background: rgba(239, 68, 68, 0.22); color: #f87171; font-weight: 900; border: 1px solid #ef4444; padding: 3px 8px; font-size: 0.78rem; white-space: nowrap;">ضعيف (${strengthPercent.toFixed(0)}%)</span>`;
              }

              return `
                <tr>
                  <td><strong>${idx + 1}</strong></td>
                  <td style="text-align: right;">
                    <strong>${c.name}</strong>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${c.degree} - ${c.specialization}</div>
                  </td>

                  <!-- 1. أقدمية التعيين -->
                  <td>
                    ${sen1 === 1 ? `
                      <span class="badge-status badge-accepted" style="background: rgba(16, 185, 129, 0.2); color: #34d399; font-weight: 900; border: 1px solid #10b981; padding: 3px 12px; font-size: 0.95rem;">1</span>
                    ` : `
                      <span class="badge-status badge-rejected" style="background: rgba(239, 68, 68, 0.2); color: #f87171; font-weight: 900; border: 1px solid #ef4444; padding: 3px 12px; font-size: 0.95rem;">0</span>
                    `}
                  </td>

                  <!-- 2. الفئة العمرية -->
                  <td>
                    ${age1 === 1 ? `
                      <span class="badge-status badge-accepted" style="background: rgba(16, 185, 129, 0.2); color: #34d399; font-weight: 900; border: 1px solid #10b981; padding: 3px 12px; font-size: 0.95rem;">1</span>
                    ` : `
                      <span class="badge-status badge-rejected" style="background: rgba(239, 68, 68, 0.2); color: #f87171; font-weight: 900; border: 1px solid #ef4444; padding: 3px 12px; font-size: 0.95rem;">0</span>
                    `}
                  </td>

                  <!-- 3. احتياج التخصص -->
                  <td>
                    ${spec1 === 1 ? `
                      <span class="badge-status badge-accepted" style="background: rgba(16, 185, 129, 0.2); color: #34d399; font-weight: 900; border: 1px solid #10b981; padding: 3px 12px; font-size: 0.95rem;">1</span>
                    ` : `
                      <span class="badge-status badge-rejected" style="background: rgba(239, 68, 68, 0.2); color: #f87171; font-weight: 900; border: 1px solid #ef4444; padding: 3px 12px; font-size: 0.95rem;">0</span>
                    `}
                  </td>

                  <!-- 4. التقدير العلمي -->
                  <td>
                    ${grade1 === 1 ? `
                      <span class="badge-status badge-accepted" style="background: rgba(16, 185, 129, 0.2); color: #34d399; font-weight: 900; border: 1px solid #10b981; padding: 3px 12px; font-size: 0.95rem;">1</span>
                    ` : `
                      <span class="badge-status badge-rejected" style="background: rgba(239, 68, 68, 0.2); color: #f87171; font-weight: 900; border: 1px solid #ef4444; padding: 3px 12px; font-size: 0.95rem;">0</span>
                    `}
                  </td>

                  <!-- 5. المعايير المخصصة المفعلة تلقائياً -->
                  ${customBinaryResults.map(res => `
                    <td>
                      ${res.isStrength === 1 ? `
                        <span class="badge-status badge-accepted" style="background: rgba(16, 185, 129, 0.2); color: #34d399; font-weight: 900; border: 1px solid #10b981; padding: 3px 12px; font-size: 0.95rem;">1</span>
                      ` : `
                        <span class="badge-status badge-rejected" style="background: rgba(239, 68, 68, 0.2); color: #f87171; font-weight: 900; border: 1px solid #ef4444; padding: 3px 12px; font-size: 0.95rem;">0</span>
                      `}
                    </td>
                  `).join('')}

                  <!-- إجمالي نقاط القوة -->
                  <td>
                    <span style="background: rgba(16, 185, 129, 0.25); color: #34d399; font-weight: 900; border: 1px solid #10b981; padding: 3px 8px; border-radius: 6px; font-size: 0.88rem; white-space: nowrap;">
                      ${totalStrengths}
                    </span>
                  </td>

                  <!-- إجمالي نقاط الضعف -->
                  <td>
                    <span style="background: rgba(239, 68, 68, 0.25); color: #f87171; font-weight: 900; border: 1px solid #ef4444; padding: 3px 8px; border-radius: 6px; font-size: 0.88rem; white-space: nowrap;">
                      ${totalWeaknesses}
                    </span>
                  </td>

                  <!-- المؤشر العام -->
                  <td>${statusBadge}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}



// دالة توحيد وتطهير النصوص العربية (إزالة الهمزات وتوحيد الألف والياء والمسافات الزائدة)
function normalizeArabicString(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .replace(/[أإآٱ]/g, 'ا') // توحيد الهمزات على الألف لمنع تكرار التخصصات مثل إدارة وإداره
    .replace(/ى/g, 'ي')     // توحيد الألف المقصورة والياء
    .replace(/\s+/g, ' ');   // إزالة المسافات المتعددة
}

// دالة تطهير وفحص التخصصات الأكاديمية (منع التخصصات الرقمية والسنوات والمجهولة وتوحيد الهمزات)
function getCleanSpecializationName(spec, candidate) {
  if (candidate && candidate.hiring_univ && !/\d/.test(candidate.hiring_univ) && /\d+/.test(String(spec))) {
    return normalizeArabicString(candidate.hiring_univ);
  }
  if (!spec) return 'تخصص غير محدد / يتطلب التعديل';
  const s = String(spec).trim();
  if (s === '' || s === '-' || s === '0' || /^\d+/.test(s) || s.length <= 1) {
    return 'تخصص غير محدد / يتطلب التعديل';
  }
  return normalizeArabicString(s);
}

function normalizeGradeText(g) {
  if (!g) return '';
  const str = String(g).trim().replace(/\s+/g, '');
  if (str === 'ممتاز') return 'ممتاز';
  if (str === 'جيدجدا' || str === 'جيدجداً') return 'جيد جداً';
  if (str === 'جيد') return 'جيد';
  if (str === 'مقبول' || str === 'مفبول') return 'مقبول';
  if (str === 'بدون' || str === 'بدونمعدل' || str === 'بدونمعدل') return 'بدون';
  return g;
}

function isInvalidGradeValue(grade) {
  if (!grade) return true;
  const g = String(grade).trim();
  if (g === '' || g === '-' || g === 'ــــــــــــ' || g === '0' || g === '0.00' || g === '0%' || g === 'غير محدد') return true;
  if (/\b(19\d\d|20\d\d)م?\b/.test(g)) return true;
  const norm = normalizeGradeText(g);
  const validGrades = ['ممتاز', 'جيد جداً', 'جيد', 'مقبول', 'بدون'];
  if (!validGrades.includes(norm) && (isNaN(parseFloat(g)) || parseFloat(g) <= 0)) return true;
  return false;
}

function isInvalidSpecializationValue(spec) {
  if (!spec) return true;
  const s = String(spec).trim();
  if (s === '' || s === '-' || s === '0' || s === 'غير محدد') return true;
  if (/\d+/.test(s)) return true;
  return false;
}

function isInvalidHiringValue(hiring) {
  if (!hiring) return true;
  const h = String(hiring).trim();
  if (h === '' || h === '-' || h === 'ـــــــــــــــــ' || h === '0') return true;
  if (!/\d/.test(h)) return true;
  return false;
}

function isInvalidBirthValue(birth) {
  if (!birth) return true;
  const b = String(birth).trim();
  if (b === '' || b === '-' || b === 'ـــــــــــــ' || b === '0' || parseInt(b) <= 0) return true;
  if (!/\d/.test(b)) return true;
  return false;
}

let auditShowOnlyDeficient = true;

function toggleAuditFilter(showOnlyDeficient) {
  auditShowOnlyDeficient = showOnlyDeficient;
  const container = document.getElementById('analytics-content-container');
  if (container) renderDeficienciesAuditReport(container);
}

// 2. تقرير رادار فحص النواقص واستكمال البيانات (جدول رقابي عربي فخم)
function renderDeficienciesAuditReport(container, selectedDegree = 'الكل') {
  const allAudited = [];
  const candidatesToAudit = state.candidates.filter(c => selectedDegree === 'الكل' || c.degree === selectedDegree);

  candidatesToAudit.forEach(c => {
    const hiring = c.hiring_univ || c.hiring_service;
    const isHiringValid = !isInvalidHiringValue(hiring);
    const isBirthValid = !isInvalidBirthValue(c.birth_date);
    const isGradeValid = !isInvalidGradeValue(c.grade);
    const isGradYearValid = c.grad_year && c.grad_year !== '-' && c.grad_year !== 'ـــــــــــــ' && parseInt(c.grad_year) > 0;
    const isSpecValid = !isInvalidSpecializationValue(c.specialization);

    const hasDeficiency = !isHiringValid || !isBirthValid || !isGradeValid || !isGradYearValid || !isSpecValid;

    allAudited.push({
      candidate: c,
      isHiringValid,
      isBirthValid,
      isGradeValid,
      isGradYearValid,
      isSpecValid,
      hasDeficiency
    });
  });

  const deficientList = allAudited.filter(item => item.hasDeficiency);
  const displayList = auditShowOnlyDeficient ? deficientList : allAudited;

  // الإحصائيات العددية والنسبية المئوية
  const totalCandidates = allAudited.length;
  const totalDeficientCandidates = deficientList.length;
  const totalCompleteCandidates = totalCandidates - totalDeficientCandidates;

  const candidateCompletePercent = totalCandidates > 0 ? ((totalCompleteCandidates / totalCandidates) * 100).toFixed(1) : '0';
  const candidateDeficientPercent = totalCandidates > 0 ? ((totalDeficientCandidates / totalCandidates) * 100).toFixed(1) : '0';

  // حساب إجمالي عناصر البيانات المفحوصة (5 عناصر لكل متنافس)
  let totalDataFields = totalCandidates * 5;
  let totalAvailableFields = 0;
  let totalMissingFields = 0;

  allAudited.forEach(item => {
    if (item.isHiringValid) totalAvailableFields++; else totalMissingFields++;
    if (item.isBirthValid) totalAvailableFields++; else totalMissingFields++;
    if (item.isGradeValid) totalAvailableFields++; else totalMissingFields++;
    if (item.isGradYearValid) totalAvailableFields++; else totalMissingFields++;
    if (item.isSpecValid) totalAvailableFields++; else totalMissingFields++;
  });

  const availableFieldsPercent = totalDataFields > 0 ? ((totalAvailableFields / totalDataFields) * 100).toFixed(1) : '0';
  const missingFieldsPercent = totalDataFields > 0 ? ((totalMissingFields / totalDataFields) * 100).toFixed(1) : '0';

  container.innerHTML = `
    <div class="card" dir="rtl">
      <div class="card-header" style="flex-wrap: wrap; gap: 12px;">
        <div>
          <h3 class="card-title" style="color: var(--text-main); font-weight: 800;">الجدول الرقابي الحاصر لفحص نواقص واستكمال بيانات المتنافسين</h3>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin: 4px 0 0 0;">
            فحص آلي شامل وموحد لجميع عناصر بيانات الموظفين المسجلين (تاريخ التعيين، السن، التقدير، سنة التخرج، والتخصص).
          </p>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;" class="no-print">
          <button class="btn ${auditShowOnlyDeficient ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="toggleAuditFilter(true)">
            عرض حالات النواقص فقط (${deficientList.length} موظف)
          </button>
          <button class="btn ${!auditShowOnlyDeficient ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="toggleAuditFilter(false)">
            عرض الكشف الشامل لكافة المتنافسين (${allAudited.length} متنافس)
          </button>
        </div>
      </div>

      <!-- لوحة الإحصائيات العددية والنسبية المئوية المتقدمة -->
      <div style="margin: 15px 20px 20px 20px; padding: 18px 20px; background: linear-gradient(135deg, rgba(15, 23, 42, 0.6), rgba(30, 41, 59, 0.7)); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
          <div style="font-weight: 800; font-size: 1rem; color: #f8fafc; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.2rem;">📊</span>
            <span>المؤشرات الإحصائية لمستوى الجاهزية والنواقص</span>
          </div>
          <div style="font-size: 0.85rem; color: #94a3b8; font-weight: 700;">
            إجمالي عناصر البيانات المفحوصة: <strong style="color: #60a5fa;">${totalDataFields} عنصر</strong> (${totalCandidates} متنافس × 5 حقول)
          </div>
        </div>

        <!-- أشرطة ومربعات المؤشرات الإحصائية 4 كروت -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px;">

          <!-- كارت 1: النسبة العامة للجاهزية -->
          <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 10px; padding: 12px 16px;">
            <div style="font-size: 0.78rem; color: #a7f3d0; font-weight: 700; margin-bottom: 4px;">معدل الجاهزية العامة للبيانات</div>
            <div style="font-size: 1.6rem; font-weight: 900; color: #10b981; line-height: 1.1;">
              ${availableFieldsPercent}%
            </div>
            <!-- شريط التقدم -->
            <div style="width: 100%; background: rgba(255, 255, 255, 0.1); height: 6px; border-radius: 3px; margin-top: 8px; overflow: hidden;">
              <div style="width: ${availableFieldsPercent}%; background: linear-gradient(90deg, #10b981, #34d399); height: 100%;"></div>
            </div>
          </div>

          <!-- كارت 2: إجمالي العناصر المتوفرة -->
          <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 10px; padding: 12px 16px;">
            <div style="font-size: 0.78rem; color: #94a3b8; font-weight: 700; margin-bottom: 4px;">العناصر المتوفرة والمكتملة</div>
            <div style="display: flex; align-items: baseline; gap: 8px;">
              <span style="font-size: 1.5rem; font-weight: 900; color: #34d399;">${totalAvailableFields}</span>
              <span style="font-size: 0.82rem; color: #a7f3d0; font-weight: 700;">من أصل ${totalDataFields} (${availableFieldsPercent}%)</span>
            </div>
            <div style="font-size: 0.72rem; color: #64748b; margin-top: 4px;">عناصر بيانات مستوفية الشروط 100%</div>
          </div>

          <!-- كارت 3: إجمالي العناصر غير المتوفرة (النواقص) -->
          <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 10px; padding: 12px 16px;">
            <div style="font-size: 0.78rem; color: #fca5a5; font-weight: 700; margin-bottom: 4px;">العناصر غير المتوفرة (نواقص)</div>
            <div style="display: flex; align-items: baseline; gap: 8px;">
              <span style="font-size: 1.5rem; font-weight: 900; color: #ef4444;">${totalMissingFields}</span>
              <span style="font-size: 0.82rem; color: #fca5a5; font-weight: 700;">من أصل ${totalDataFields} (${missingFieldsPercent}%)</span>
            </div>
            <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 4px;">تتطلب استكمال وتحديث البيانات</div>
          </div>

          <!-- كارت 4: حالة ملفات الموظفين المتنافسين -->
          <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 10px; padding: 12px 16px;">
            <div style="font-size: 0.78rem; color: #93c5fd; font-weight: 700; margin-bottom: 4px;">حالة كشوفات المتنافسين</div>
            <div style="font-size: 0.88rem; font-weight: 800; color: #f8fafc; margin-top: 2px;">
              <span style="color: #10b981;">${totalCompleteCandidates} مكتمل 100%</span> (${candidateCompletePercent}%)
            </div>
            <div style="font-size: 0.88rem; font-weight: 800; color: #f8fafc; margin-top: 2px;">
              <span style="color: #ef4444;">${totalDeficientCandidates} يحتاج استكمال</span> (${candidateDeficientPercent}%)
            </div>
          </div>

        </div>
      </div>

      <div class="table-responsive" style="margin-top: 15px;">
        <table class="data-table" style="width: 100%; border-collapse: collapse; text-align: center;">
          <thead>
            <tr>
              <th style="width: 4%;">#</th>
              <th style="width: 22%; text-align: right;">اسم المتنافس / الموظف</th>
              <th style="width: 12%;">تاريخ التعيين</th>
              <th style="width: 11%;">سنة الميلاد</th>
              <th style="width: 12%;">التقدير العلمي</th>
              <th style="width: 11%;">سنة التخرج</th>
              <th style="width: 14%;">التخصص العلمي</th>
              <th style="width: 14%;" class="col-readiness no-print">جاهزية الملف</th>
              <th style="width: 10%;" class="col-action no-print">إجراء التعديل</th>
            </tr>
          </thead>
          <tbody>
            ${displayList.length === 0 ? `
              <tr>
                <td colspan="9" style="padding: 30px; text-align: center;">
                  <strong style="color: #10b981; font-size: 1.1rem;">جميع بيانات السجلات مكتملة ومستوفية 100%!</strong>
                </td>
              </tr>
            ` : displayList.map((item, idx) => {
              const c = item.candidate;
              return `
                <tr style="background: ${item.hasDeficiency ? 'rgba(239, 68, 68, 0.04)' : 'transparent'};">
                  <td><strong>${idx + 1}</strong></td>
                  <td style="text-align: right;">
                    <strong>${c.name}</strong>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${c.degree}</div>
                  </td>

                  <!-- 1. تاريخ التعيين -->
                  <td>
                    ${item.isHiringValid ? `
                      <span class="badge-status badge-accepted" style="background: rgba(16, 185, 129, 0.15); color: #10b981; font-weight: 800; border: 1px solid #10b981; padding: 4px 10px; font-size: 0.78rem; border-radius: 6px;">متوفر</span>
                    ` : `
                      <span class="badge-status badge-rejected" style="background: rgba(239, 68, 68, 0.18); color: #ef4444; font-weight: 800; border: 1px solid #ef4444; padding: 4px 10px; font-size: 0.78rem; border-radius: 6px;">غير متوفر</span>
                    `}
                  </td>

                  <!-- 2. سنة الميلاد -->
                  <td>
                    ${item.isBirthValid ? `
                      <span class="badge-status badge-accepted" style="background: rgba(16, 185, 129, 0.15); color: #10b981; font-weight: 800; border: 1px solid #10b981; padding: 4px 10px; font-size: 0.78rem; border-radius: 6px;">متوفر</span>
                    ` : `
                      <span class="badge-status badge-rejected" style="background: rgba(239, 68, 68, 0.18); color: #ef4444; font-weight: 800; border: 1px solid #ef4444; padding: 4px 10px; font-size: 0.78rem; border-radius: 6px;">غير متوفر</span>
                    `}
                  </td>

                  <!-- 3. التقدير العلمي -->
                  <td>
                    ${item.isGradeValid ? `
                      <span class="badge-status badge-accepted" style="background: rgba(16, 185, 129, 0.15); color: #10b981; font-weight: 800; border: 1px solid #10b981; padding: 4px 10px; font-size: 0.78rem; border-radius: 6px;">متوفر</span>
                    ` : `
                      <span class="badge-status badge-rejected" style="background: rgba(239, 68, 68, 0.18); color: #ef4444; font-weight: 800; border: 1px solid #ef4444; padding: 4px 10px; font-size: 0.78rem; border-radius: 6px;">غير متوفر</span>
                    `}
                  </td>

                  <!-- 4. سنة التخرج -->
                  <td>
                    ${item.isGradYearValid ? `
                      <span class="badge-status badge-accepted" style="background: rgba(16, 185, 129, 0.15); color: #10b981; font-weight: 800; border: 1px solid #10b981; padding: 4px 10px; font-size: 0.78rem; border-radius: 6px;">متوفر</span>
                    ` : `
                      <span class="badge-status badge-rejected" style="background: rgba(239, 68, 68, 0.18); color: #ef4444; font-weight: 800; border: 1px solid #ef4444; padding: 4px 10px; font-size: 0.78rem; border-radius: 6px;">غير متوفر</span>
                    `}
                  </td>

                  <!-- 5. التخصص الأكاديمي -->
                  <td>
                    ${item.isSpecValid ? `
                      <span class="badge-status badge-accepted" style="background: rgba(16, 185, 129, 0.15); color: #10b981; font-weight: 800; border: 1px solid #10b981; padding: 4px 10px; font-size: 0.78rem; border-radius: 6px;">متوفر</span>
                    ` : `
                      <span class="badge-status badge-rejected" style="background: rgba(239, 68, 68, 0.18); color: #ef4444; font-weight: 800; border: 1px solid #ef4444; padding: 4px 10px; font-size: 0.78rem; border-radius: 6px;">غير متوفر</span>
                    `}
                  </td>

                  <!-- جاهزية الملف -->
                  <td class="col-readiness no-print">
                    ${item.hasDeficiency ? `
                      <span style="color: #ef4444; font-weight: 900; font-size: 0.82rem;">يحتاج استكمال</span>
                    ` : `
                      <span style="color: #10b981; font-weight: 900; font-size: 0.82rem;">مكتمل 100%</span>
                    `}
                  </td>

                  <!-- الإجراء والتعديل -->
                  <td class="col-action no-print">
                    <button class="btn btn-warning btn-sm" style="font-weight: 800; font-size: 0.75rem; padding: 4px 10px; background: linear-gradient(135deg, #d97706, #b45309); color: #ffffff;" onclick="editCandidate(${c.id})">
                      تعديل البيانات
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// 3. تقرير حصر وإحصاء التخصصات المجرّد (بدون أسماء المتنافسين)
function renderPureSpecializationsReport(container, selectedDegree = 'الكل') {
  const specMap = {};
  const candidatesToReport = state.candidates.filter(c => selectedDegree === 'الكل' || c.degree === selectedDegree);

  candidatesToReport.forEach(c => {
    const spec = getCleanSpecializationName(c.specialization);
    if (!specMap[spec]) {
      specMap[spec] = {
        name: spec,
        mastersCount: 0,
        phdCount: 0,
        totalCount: 0,
        totalScoreSum: 0
      };
    }

    if (c.degree === 'ماجستير') specMap[spec].mastersCount++;
    if (c.degree === 'دكتوراه') specMap[spec].phdCount++;
    specMap[spec].totalCount++;

    const scored = calculateCandidateScore(c);
    specMap[spec].totalScoreSum += scored.totalScore;
  });

  const specList = Object.values(specMap).sort((a, b) => b.totalCount - a.totalCount);
  const grandTotal = state.candidates.length || 1;

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">📋 التقرير الإحصائي الحاصر للتخصصات والمجالات (مجرّد بدون أسماء)</h3>
        <span style="font-size: 0.85rem; color: var(--text-muted);">إجمالي التخصصات المتنافس عليها: ${specList.length} تخصص</span>
      </div>

      <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 20px;">
        يعرض هذا التقرير التوزيع الإحصائي التجميعي لكافة التخصصات والمجالات التي تقدم بها الموظفون <strong>مجرداً تماماً من أي أسماء شخصية</strong>، لغرض التحليل والتخطيط الأكاديمي.
      </p>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 5%;">#</th>
              <th style="width: 25%;">اسم التخصص المطلوب</th>
              <th style="width: 15%;">متقدمي الماجستير</th>
              <th style="width: 15%;">متقدمي الدكتوراه</th>
              <th style="width: 15%;">إجمالي المتقدمين</th>
              <th style="width: 12%;">النسبة المئوية العامة</th>
              <th style="width: 13%;">متوسط النقاط المحرزة</th>
            </tr>
          </thead>
          <tbody>
            ${specList.map((item, idx) => {
              const pct = ((item.totalCount / grandTotal) * 100).toFixed(1);
              const avgScore = (item.totalScoreSum / item.totalCount).toFixed(1);
              return `
                <tr>
                  <td>${idx + 1}</td>
                  <td style="text-align: right;"><strong>${item.name}</strong></td>
                  <td><span class="badge-status badge-accepted" style="background: rgba(37, 99, 235, 0.1); color: #2563eb;">${item.mastersCount} متقدم</span></td>
                  <td><span class="badge-status badge-accepted" style="background: rgba(13, 148, 136, 0.1); color: #0d9488;">${item.phdCount} متقدم</span></td>
                  <td><strong>${item.totalCount} متنافس</strong></td>
                  <td><strong>${pct}%</strong></td>
                  <td><span class="total-score-badge" style="background: #0f172a; padding: 2px 8px; font-size: 0.82rem;">${avgScore} نقطة</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// 4. الرسم البياني البصري للفئات العمرية والتخصصات والأقدمية (Executive Analytics Dashboard)
function renderAgeAndSpecCharts(container, selectedDegree = 'الكل') {
  const candidatesToChart = state.candidates.filter(c => selectedDegree === 'الكل' || c.degree === selectedDegree);
  const totalCandidates = candidatesToChart.length || 1;

  // 1. تجميع الفئات العمرية
  const ageMap = {
    '50 سنة فما فوق': 0,
    '45 - 49 سنة': 0,
    '40 - 44 سنة': 0,
    '35 - 39 سنة': 0,
    'أقل من 35 سنة': 0
  };

  const currentYear = state.settings.referenceYear || 2026;

  candidatesToChart.forEach(c => {
    let age = 0;
    if (c.birth_date && parseInt(c.birth_date) > 0) {
      age = currentYear - parseInt(c.birth_date);
    }
    if (age >= 50) ageMap['50 سنة فما فوق']++;
    else if (age >= 45) ageMap['45 - 49 سنة']++;
    else if (age >= 40) ageMap['40 - 44 سنة']++;
    else if (age >= 35) ageMap['35 - 39 سنة']++;
    else ageMap['أقل من 35 سنة']++;
  });

  const sortedAges = Object.entries(ageMap).sort((a, b) => b[1] - a[1]);
  const topAgeCategory = sortedAges[0] ? `${sortedAges[0][0]} (${sortedAges[0][1]} موظف)` : 'غير محدد';

  // 2. تجميع أقدمية التعيين حسب الشرائح الرسمية
  const seniorityMap = {
    '1990 - 1994م (10 نقاط - أقدمية استثنائية)': 0,
    '1995 - 2000م (8 نقاط - أقدمية عالية جداً)': 0,
    '2001 - 2005م (6 نقاط - أقدمية عالية)': 0,
    '2006 - 2010م (4 نقاط - أقدمية متوسطة)': 0,
    '2011 - 2015م (3 نقاط - أقدمية حديثة)': 0,
    '2016 - 2020م (2 نقطتان - حديث التعيين)': 0,
    '2021 - 2030م (1 نقطة - تعيين حديث جداً)': 0
  };

  let totalSeniorityScoreSum = 0;

  candidatesToChart.forEach(c => {
    const hiringVal = c.hiring_univ || c.hiring_service;
    let year = 0;
    if (hiringVal) {
      const match = String(hiringVal).match(/\b(19\d\d|20\d\d)\b/);
      if (match) year = parseInt(match[1]);
    }
    if (year >= 1990 && year <= 1994) seniorityMap['1990 - 1994م (10 نقاط - أقدمية استثنائية)']++;
    else if (year >= 1995 && year <= 2000) seniorityMap['1995 - 2000م (8 نقاط - أقدمية عالية جداً)']++;
    else if (year >= 2001 && year <= 2005) seniorityMap['2001 - 2005م (6 نقاط - أقدمية عالية)']++;
    else if (year >= 2006 && year <= 2010) seniorityMap['2006 - 2010م (4 نقاط - أقدمية متوسطة)']++;
    else if (year >= 2011 && year <= 2015) seniorityMap['2011 - 2015م (3 نقاط - أقدمية حديثة)']++;
    else if (year >= 2016 && year <= 2020) seniorityMap['2016 - 2020م (2 نقطتان - حديث التعيين)']++;
    else if (year >= 2021) seniorityMap['2021 - 2030م (1 نقطة - تعيين حديث جداً)']++;

    const scoreObj = calculateCandidateScore(c);
    totalSeniorityScoreSum += scoreObj.seniorityScore || 0;
  });

  const avgSeniorityScore = (totalSeniorityScoreSum / totalCandidates).toFixed(1);

  // 3. تجميع أعلى التخصصات
  const specCounts = {};
  candidatesToChart.forEach(c => {
    const s = getCleanSpecializationName(c.specialization);
    specCounts[s] = (specCounts[s] || 0) + 1;
  });
  const topSpecs = Object.entries(specCounts).sort((a, b) => b[1] - a[1]);
  const topSpecName = topSpecs[0] ? `${topSpecs[0][0]} (${topSpecs[0][1]} موظف)` : 'لا يوجد';

  container.innerHTML = `
    <!-- 1. شريط مؤشرات القيادة الإحصائية البارزة (Executive KPI Cards) -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 22px;">
      <!-- KPI 1: إجمالي المتنافسين المحللين -->
      <div style="background: linear-gradient(135deg, rgba(30, 58, 138, 0.45), rgba(15, 23, 42, 0.75)); border: 1.5px solid rgba(59, 130, 246, 0.4); border-radius: 12px; padding: 14px 16px; backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
        <div>
          <span style="font-size: 0.78rem; color: #93c5fd; font-weight: 800; display: block; margin-bottom: 4px;">👥 المتنافسون الخاضعون للتحليل</span>
          <strong style="font-size: 1.6rem; color: #ffffff; font-weight: 900; line-height: 1.2;">${candidatesToChart.length} <span style="font-size:0.85rem; color:#93c5fd; font-weight:700;">متنافس</span></strong>
        </div>
        <div style="font-size: 1.8rem; background: rgba(59, 130, 246, 0.2); width: 46px; height: 46px; border-radius: 10px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(59, 130, 246, 0.4);">📊</div>
      </div>

      <!-- KPI 2: متوسط نقاط الأقدمية الخدمية -->
      <div style="background: linear-gradient(135deg, rgba(5, 150, 105, 0.45), rgba(15, 23, 42, 0.75)); border: 1.5px solid rgba(16, 185, 129, 0.4); border-radius: 12px; padding: 14px 16px; backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
        <div>
          <span style="font-size: 0.78rem; color: #6ee7b7; font-weight: 800; display: block; margin-bottom: 4px;">🎖️ متوسط نقاط الأقدمية</span>
          <strong style="font-size: 1.6rem; color: #ffffff; font-weight: 900; line-height: 1.2;">${avgSeniorityScore} <span style="font-size:0.85rem; color:#6ee7b7; font-weight:700;">من 10ن</span></strong>
        </div>
        <div style="font-size: 1.8rem; background: rgba(16, 185, 129, 0.2); width: 46px; height: 46px; border-radius: 10px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(16, 185, 129, 0.4);">⏳</div>
      </div>

      <!-- KPI 3: الفئة العمرية الأكثر كثافة -->
      <div style="background: linear-gradient(135deg, rgba(217, 119, 6, 0.45), rgba(15, 23, 42, 0.75)); border: 1.5px solid rgba(245, 158, 11, 0.4); border-radius: 12px; padding: 14px 16px; backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
        <div>
          <span style="font-size: 0.78rem; color: #fde047; font-weight: 800; display: block; margin-bottom: 4px;">🎂 الفئة العمرية الأكثر كثافة</span>
          <strong style="font-size: 1.1rem; color: #ffffff; font-weight: 900; line-height: 1.3;">${topAgeCategory}</strong>
        </div>
        <div style="font-size: 1.8rem; background: rgba(245, 158, 11, 0.2); width: 46px; height: 46px; border-radius: 10px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(245, 158, 11, 0.4);">📈</div>
      </div>

      <!-- KPI 4: التخصص الأعلى تنافساً -->
      <div style="background: linear-gradient(135deg, rgba(13, 148, 136, 0.45), rgba(15, 23, 42, 0.75)); border: 1.5px solid rgba(20, 184, 166, 0.4); border-radius: 12px; padding: 14px 16px; backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
        <div>
          <span style="font-size: 0.78rem; color: #5eead4; font-weight: 800; display: block; margin-bottom: 4px;">🎯 التخصص الأكثر إقبالاً</span>
          <strong style="font-size: 1.05rem; color: #ffffff; font-weight: 900; line-height: 1.3;">${topSpecName}</strong>
        </div>
        <div style="font-size: 1.8rem; background: rgba(20, 184, 166, 0.2); width: 46px; height: 46px; border-radius: 10px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(20, 184, 166, 0.4);">🎓</div>
      </div>
    </div>

    <!-- 2. شبكة المخططات البيانية الرئيسية -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px;">
      
      <!-- الرسم البياني الأول: الفئات العمرية -->
      <div class="card" style="background: linear-gradient(180deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85)); border: 1px solid rgba(59, 130, 246, 0.3); box-shadow: 0 10px 25px rgba(0,0,0,0.4);">
        <div class="card-header" style="border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px; margin-bottom: 14px;">
          <h3 class="card-title" style="color: #60a5fa; font-size: 1.05rem; font-weight: 900;">🎂 التوزيع الديموغرافي للفئات العمرية</h3>
        </div>
        <p style="color: #94a3b8; font-size: 0.82rem; margin-bottom: 16px; line-height: 1.5;">
          يمثل هذا الرسم النسبة والتوزيع الديموغرافي للسن بين جميع الموظفين المتنافسين الخاضعين للتحليل.
        </p>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${Object.entries(ageMap).map(([label, count]) => {
            const pct = Math.round((count / totalCandidates) * 100);
            return `
              <div style="background: rgba(15, 23, 42, 0.6); padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <span style="font-weight: 800; font-size: 0.88rem; color: #f1f5f9;">${label}</span>
                  <span style="background: rgba(59, 130, 246, 0.2); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.4); padding: 2px 10px; border-radius: 12px; font-weight: 900; font-size: 0.78rem;">
                    ${count} متنافس (${pct}%)
                  </span>
                </div>
                <div style="width: 100%; height: 12px; background: rgba(30, 41, 59, 0.9); border-radius: 6px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08);">
                  <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, #3b82f6, #06b6d4); border-radius: 6px; box-shadow: 0 0 10px rgba(59, 130, 246, 0.6); transition: width 0.8s ease;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- الرسم البياني الثاني: أقدمية التعيين الخدمية -->
      <div class="card" style="background: linear-gradient(180deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85)); border: 1px solid rgba(16, 185, 129, 0.3); box-shadow: 0 10px 25px rgba(0,0,0,0.4);">
        <div class="card-header" style="border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px; margin-bottom: 14px;">
          <h3 class="card-title" style="color: #34d399; font-size: 1.05rem; font-weight: 900;">🎖️ توزيع أقدمية التعيين الخدمية وأوزانها</h3>
        </div>
        <p style="color: #94a3b8; font-size: 0.82rem; margin-bottom: 16px; line-height: 1.5;">
          يمثل توزيع سنوات تعيين الموظفين في الخدمة بالجامعة/الدولة والأوزان المعيارية المعتمدة لها.
        </p>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${Object.entries(seniorityMap).map(([label, count]) => {
            const pct = Math.round((count / totalCandidates) * 100);
            return `
              <div style="background: rgba(15, 23, 42, 0.6); padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <span style="font-weight: 800; font-size: 0.85rem; color: #f1f5f9;">${label}</span>
                  <span style="background: rgba(16, 185, 129, 0.2); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.4); padding: 2px 10px; border-radius: 12px; font-weight: 900; font-size: 0.78rem;">
                    ${count} متنافس (${pct}%)
                  </span>
                </div>
                <div style="width: 100%; height: 12px; background: rgba(30, 41, 59, 0.9); border-radius: 6px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08);">
                  <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, #d97706, #10b981); border-radius: 6px; box-shadow: 0 0 10px rgba(16, 185, 129, 0.6); transition: width 0.8s ease;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- الرسم البياني الثالث: التخصصات العلمية الأكثر إقبالاً وطلباً (Compact 2-Column List) -->
      <div class="card" style="grid-column: 1 / -1; background: linear-gradient(180deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85)); border: 1px solid rgba(20, 184, 166, 0.35); box-shadow: 0 10px 25px rgba(0,0,0,0.4); padding: 14px 18px;">
        <div class="card-header" style="border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 class="card-title" style="color: #2dd4bf; font-size: 1.05rem; font-weight: 900; margin: 0;">📊 حصر التخصصات الأكاديمية ونسبة الإقبال</h3>
            <span style="color: #94a3b8; font-size: 0.78rem;">قائمة تجميعية مدمجة للتخصصات المتنافس عليها بحجم مقتضب ومؤشر بصري دقيق</span>
          </div>
          <span style="background: rgba(20, 184, 166, 0.2); color: #5eead4; border: 1px solid rgba(20, 184, 166, 0.4); padding: 3px 12px; border-radius: 12px; font-weight: 900; font-size: 0.8rem;">
            إجمالي التخصصات: ${topSpecs.length} تخصص
          </span>
        </div>

        <!-- شبكة قائمة ثنائية الأعمدة فائقة الاختصار -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 8px 20px;">
          ${topSpecs.map(([spec, count], idx) => {
            const pct = Math.round((count / totalCandidates) * 100);
            return `
              <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(15, 23, 42, 0.5); padding: 5px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); gap: 10px;">
                <!-- اسم التخصص ورقم الترتيب -->
                <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
                  <span style="font-size: 0.75rem; font-weight: 800; color: #64748b; width: 20px; text-align: center;">#${idx + 1}</span>
                  <span style="font-size: 0.84rem; font-weight: 800; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${spec}">${spec}</span>
                </div>

                <!-- مؤشر النسبة وشريط التقدم الرفيع المختصر -->
                <div style="display: flex; align-items: center; gap: 10px; width: 140px; flex-shrink: 0;">
                  <div style="flex: 1; height: 6px; background: rgba(30, 41, 59, 0.9); border-radius: 4px; overflow: hidden; border: 1px solid rgba(255,255,255,0.06);">
                    <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, #0d9488, #2563eb); border-radius: 4px;"></div>
                  </div>
                  <span style="font-size: 0.76rem; font-weight: 900; color: #2dd4bf; width: 50px; text-align: left; white-space: nowrap;">
                    ${count} (${pct}%)
                  </span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

    </div>
  `;
}

function exportAnalyticsToExcel() {
  if (typeof XLSX === 'undefined') {
    alert('مكتبة تصدير الإكسل غير محملة');
    return;
  }
  const masters = getRankedCandidates('ماجستير');
  const phds = getRankedCandidates('دكتوراه');

  function mapAnalytics(c) {
    const analysis = calculateCandidateStrengthsAndWeaknesses(c);
    return {
      'الترتيب': c.rank || '-',
      'اسم الموظف المتنافس': c.name,
      'الدرجة': c.degree,
      'التخصص': c.specialization || '-',
      'المجموع الكلي': (c.scores && c.scores.totalScore !== undefined) ? c.scores.totalScore : 0,
      'الحالة': c.status || 'خارج خط المنح',
      'نقاط القوة البارزة': (analysis && analysis.strengths) ? analysis.strengths.join(' | ') : '—',
      'نقاط الضعف والتحديات': (analysis && analysis.weaknesses) ? analysis.weaknesses.join(' | ') : '—'
    };
  }

  const wb = XLSX.utils.book_new();
  const wsMaster = XLSX.utils.json_to_sheet(masters.map(c => mapAnalytics(c)));
  const wsPhd = XLSX.utils.json_to_sheet(phds.map(c => mapAnalytics(c)));

  XLSX.utils.book_append_sheet(wb, wsMaster, "تحليل متنافسي الماجستير");
  XLSX.utils.book_append_sheet(wb, wsPhd, "تحليل متنافسي الدكتوراه");
  XLSX.writeFile(wb, "تقرير_التحليل_والرقابة_جامعة_صنعاء_2026.xlsx");
}

function printAnalyticsReport() {
  window.print();
}


// ====================================================
// شاشة المحضر الرسمي لنتائج المفاضلة (رئيس اللجنة فقط)
// Official Minutes of the Scholarship Competition Session
// ====================================================

function renderMinutes() {
  const container = document.getElementById('minutes-content');
  if (!container) return;

  // -- استخراج البيانات من state --
  const settings      = state.settings || {};
  const refYear       = parseInt(settings.referenceYear) || 2026;
  const academicYear  = `${refYear - 1}/${refYear}م`;
  const location      = settings.competitionLocation || settings.sessionLocation || 'مقر الأمانة العامة / قاعة اجتماعات مجلس الجامعة الرئيسي - جامعة صنعاء';
  const dateStr       = settings.competitionDate || settings.sessionDate || 'شهر اغسطس 2026';
  const masterLimit   = parseInt(settings.masterGrantsCount) || 3;
  const phdLimit      = parseInt(settings.phdGrantsCount)    || 3;
  const rectorName    = settings.rectorName || 'أ.د. محمد أحمد البخيتي';
  const univName      = settings.universityName || 'جامعة صنعاء';

  // -- المترشحون والفائزون --
  const allMaster   = getRankedCandidates('ماجستير');
  const allPhd      = getRankedCandidates('دكتوراه');
  const masterCount = allMaster.length;
  const phdCount    = allPhd.length;
  const totalCount  = masterCount + phdCount;

  const masterWinners = allMaster.slice(0, masterLimit);
  const phdWinners    = allPhd.slice(0, phdLimit);

  // -- أعضاء اللجنة --
  const members  = (state.committeeMembers && state.committeeMembers.length > 0)
                   ? state.committeeMembers
                   : DEFAULT_COMMITTEE_MEMBERS;
  const chairman = members.find(m => (m.committeeRole || '').includes('رئيس اللجنة')) || members[0];
  // الأعضاء العاديون بترتيب عكسي (يبدأ بآخر عضو = هاني مغلس)
  const regularMembers = members.filter(m => m !== chairman).reverse();

  // -- بناء صفوف أسماء الفائزين --
  function buildWinnersRows(winners, degreeLabel) {
    if (winners.length === 0) {
      return `<tr><td colspan="4" style="text-align:center; color:#64748b; font-style:italic; padding: 6px;">لا يوجد متقدمون لّ${degreeLabel} أو لم يتم تنفيذ المفاضلة بعد.</td></tr>`;
    }
    return winners.map((c, idx) => `
      <tr style="background: ${idx % 2 === 0 ? '#fefefe' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
        <td style="text-align: center; font-weight: 900; font-size: 0.85rem; color: #1e3a8a; width: 40px; padding: 4px 3px;">${idx + 1}</td>
        <td style="font-weight: 800; color: #0f172a; padding: 4px 8px; font-size: 0.8rem;">${c.name}</td>
        <td style="color: #334155; font-weight: 600; padding: 4px 8px; font-size: 0.8rem;">${c.specialization || 'غير محدد'}</td>
        <td style="text-align: center; font-weight: 800; color: #059669; padding: 4px 3px; font-size: 0.8rem;"><strong>${c.scores.totalScore} نقطة</strong></td>
      </tr>
    `).join('');
  }

  // -- بناء النص التتابعي القانوني الموجز لجلسات المفاضلة المتعاقبة --
  function buildSequentialSessionsNarrative() {
    const history = (state.settings && state.settings.sessionHistory && state.settings.sessionHistory.length > 0)
      ? state.settings.sessionHistory
      : [
          {
            sessionNum: 1,
            dateStr: state.settings.competitionDate || 'شهر اغسطس 2026',
            reason: 'جلسة الفرز والتنافس الرئيسية المعلنة'
          }
        ];

    const ordinalNames = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة'];

    // إذا كانت جلسة واحدة فقط
    if (history.length === 1) {
      return `وحيث عُقدت <strong>جلسة المفاضلة والتنافس لمرة واحدة</strong> بتاريخ <strong>(${history[0].dateStr})</strong> وتم اعتماد نتائجها وإغلاقها رسمياً`;
    }

    // إذا كانت أكثر من جلسة (جلسة ثانية أو ثالثة...)
    const currentIdx = history.length - 1;
    const currentSession = history[currentIdx];
    const currentOrd = ordinalNames[currentIdx] || `رقم (${currentIdx + 1})`;
    
    const prevCount = currentIdx;
    const prevCountLabel = prevCount === 1 ? 'جلسة واحدة' : prevCount === 2 ? 'جلسان' : `(${prevCount}) جلسات`;
    const currentReasonText = currentSession.reason ? `بناءً على <strong>(${currentSession.reason})</strong>` : '';

    const historyDetails = history.map((item, idx) => {
      const ord = ordinalNames[idx] || `رقم (${idx + 1})`;
      if (idx === 0) {
        return `كانت الجلسة <strong>الأولى</strong> بتاريخ <strong>(${item.dateStr})</strong> وتم إغلاقها`;
      } else if (idx === currentIdx) {
        return `ثم انعقدت هذه الجلسة الحالية <strong>(${ord})</strong> بتاريخ <strong>(${item.dateStr})</strong> لإقرار الاعتماد النهائي وإغلاق المفاضلة رسمياً`;
      } else {
        const rText = item.reason ? `بسبب <strong>(${item.reason})</strong>` : '';
        return `ثم انعقدت الجلسة <strong>(${ord})</strong> بتاريخ <strong>(${item.dateStr})</strong> ${rText}`;
      }
    }).join('، ');

    return `وقد عُقدت هذه الجلسة <strong>(${currentOrd})</strong> ${currentReasonText}، بعد أن سَبَقَ عَقْد <strong>${prevCountLabel}</strong> قبلها؛ حيث ${historyDetails}`;
  }

  // -- بناء بطاقات توقيع الأعضاء العاديين (ترتيب عكسي) --
  const regularMemberCards = regularMembers.map(m => `
    <div style="border: 1px solid #fcd34d; padding: 5px 6px; border-radius: 5px; background: #fffbeb; text-align: center; min-width: 120px;">
      <p style="font-weight: 800; color: #92400e; font-size: 0.7rem; margin: 0 0 1px 0;">${m.committeeRole || 'عضواً'}</p>
      <p style="font-weight: 900; color: #1a1a00; font-size: 0.76rem; margin: 0 0 1px 0;">${m.name}</p>
      <p style="color: #78350f; font-size: 0.62rem; margin: 0 0 5px 0;">${m.adminTitle || ''}</p>
      <div style="height: 14px; border-bottom: 1px dashed #d97706; margin-bottom: 3px;"></div>
      <p style="font-size: 0.56rem; color: #b45309; margin: 0; font-weight: 600;">التوقيع والختم الرسمي</p>
    </div>
  `).join('');

  container.innerHTML = `
    <div id="minutes-printable-area" style="
      background: #fffdf5;
      color: #1a1a00;
      font-family: 'Tajawal', 'Segoe UI', Arial, sans-serif;
      direction: rtl;
      max-width: 800px;
      margin: 0 auto 30px auto;
      padding: 18px 28px;
      border: 2px solid #d97706;
      border-radius: 10px;
      box-shadow: 0 4px 30px rgba(217,119,6,0.18);
    ">

      <!-- ====== العلامة المائية الشبحية لمسودة التدقيق والمراجعة ====== -->
      <div id="minutes-print-watermark" class="print-watermark">مسودة للتدقيق والمراجعة</div>

      <!-- ====== رأس الوثيقة ====== -->
      <div style="text-align: center; border-bottom: 2px double #d97706; padding-bottom: 8px; margin-bottom: 10px;">
        <h1 style="margin: 0 0 2px 0; color: #78350f; font-size: 1.2rem; font-weight: 900; letter-spacing: 0.3px;">
          ${univName}
        </h1>
        <h2 style="margin: 0 0 2px 0; color: #92400e; font-size: 0.92rem; font-weight: 800;">
          لجنة المفاضلة للمتقدمين لمنح الدراسات العليا
        </h2>
        <h3 style="margin: 0; color: #b45309; font-size: 0.82rem; font-weight: 700;">
          الكادر الإداري
        </h3>
      </div>

      <!-- ====== عنوان المحضر ====== -->
      <div style="text-align: center; background: #4ade80; color: #14532d; padding: 8px 16px; border-radius: 7px; margin-bottom: 10px;">
        <h2 style="margin: 0 0 2px 0; font-size: 1rem; font-weight: 900; letter-spacing: 0.3px;">
          محضر جلسة المفاضلة على منح الدراسات العليا للكادر الإداري
        </h2>
        <p style="margin: 0; font-size: 0.85rem; font-weight: 700; color: #166534;">
          العام الجامعي ${academicYear}
        </p>
      </div>

      <!-- ====== بيانات الجلسة ====== -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; font-size: 0.8rem;">
        <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; padding: 6px 10px;">
          <strong style="color: #92400e; display: block; margin-bottom: 2px;">📍 مكان عقد الجلسة:</strong>
          <span style="color: #78350f; font-weight: 600;">${location}</span>
        </div>
        <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; padding: 6px 10px;">
          <strong style="color: #92400e; display: block; margin-bottom: 2px;">🗓️ تاريخ ووقت الجلسة:</strong>
          <span style="color: #78350f; font-weight: 600;">${dateStr}</span>
        </div>
      </div>

      <!-- ====== عدد المتقدمين ====== -->
      <div style="background: #fefce8; border: 1.5px solid #fcd34d; border-radius: 7px; padding: 8px 14px; margin-bottom: 10px;">
        <h4 style="margin: 0 0 6px 0; color: #92400e; font-size: 0.82rem; font-weight: 900;">📊 بيان بعدد المتقدمين للحصول على المنح الدراسية:</h4>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 120px; text-align: center; background: #fff; border: 1px solid #86efac; border-radius: 6px; padding: 6px;">
            <div style="font-size: 1.6rem; font-weight: 900; color: #166534; line-height: 1.2;">${masterCount}</div>
            <div style="font-size: 0.72rem; font-weight: 700; color: #14532d;">عدد متقدمي الماجستير</div>
          </div>
          <div style="flex: 1; min-width: 120px; text-align: center; background: #fff; border: 1px solid #fde68a; border-radius: 6px; padding: 6px;">
            <div style="font-size: 1.6rem; font-weight: 900; color: #b45309; line-height: 1.2;">${phdCount}</div>
            <div style="font-size: 0.72rem; font-weight: 700; color: #92400e;">عدد متقدمي الدكتوراه</div>
          </div>
          <div style="flex: 1; min-width: 120px; text-align: center; background: linear-gradient(135deg,#d97706,#f59e0b); border-radius: 6px; padding: 6px;">
            <div style="font-size: 1.6rem; font-weight: 900; color: #1a1a00; line-height: 1.2;">${totalCount}</div>
            <div style="font-size: 0.72rem; font-weight: 700; color: #451a03;">إجمالي المتقدمين</div>
          </div>
        </div>
      </div>

      <!-- ====== نص المحضر الديباجي الموحد والمتناسق ====== -->
      <div style="background: #fffbeb; border-right: 3px solid #f59e0b; padding: 10px 14px; margin-bottom: 12px; font-size: 0.82rem; line-height: 1.7; color: #78350f; border-radius: 4px;">
        <p style="margin: 0 0 6px 0;">
          <strong>بسم الله الرحمن الرحيم</strong>
        </p>
        <p style="margin: 0; text-align: justify;">
          في يوم ${dateStr}، وفي مقر ${location}، اجتمعت لجنة المفاضلة المشكّلة بموجب قرار رئاسة الجامعة، للنظر في طلبات الحصول على منح الدراسات العليا (ماجستير ودكتوراه)
          المقدمة من منتسبي الكادر الإداري لجامعة صنعاء للعام الجامعي ${academicYear}،
          ${buildSequentialSessionsNarrative()}، وبعد الدراسة والمفاضلة وفق المعايير والأوزان المعتمدة، توصلت اللجنة إلى النتائج التالية:
        </p>
      </div>

      <!-- ====== أولاً: الفائزون بمنح الماجستير ====== -->
      <div style="margin-bottom: 10px;">
        <h3 style="background: #4ade80; color:#14532d; padding: 5px 12px; border-radius: 5px; font-size: 0.88rem; font-weight: 900; margin: 0 0 6px 0;">
          ① أولاً: الفائزون بمنح الماجستير (${masterLimit} منحة)
        </h3>
        <table style="width:100%; border-collapse: collapse; font-size: 0.8rem; border: 1px solid #86efac; border-radius: 6px; overflow: hidden;">
          <thead>
            <tr style="background: linear-gradient(135deg,#16a34a,#15803d); color: #ffffff;">
              <th style="padding: 5px; text-align: center; width: 40px;">#</th>
              <th style="padding: 5px; text-align: right;">اسم الموظف / المتقدم</th>
              <th style="padding: 5px; text-align: right;">التخصص</th>
              <th style="padding: 5px; text-align: center;">مجموع النقاط</th>
            </tr>
          </thead>
          <tbody>
            ${buildWinnersRows(masterWinners, 'الماجستير')}
          </tbody>
        </table>
      </div>

      <!-- ====== ثانياً: الفائزون بمنح الدكتوراه ====== -->
      <div style="margin-bottom: 10px;">
        <h3 style="background: linear-gradient(135deg,#fbbf24,#f59e0b); color:#451a03; padding: 5px 12px; border-radius: 5px; font-size: 0.88rem; font-weight: 900; margin: 0 0 6px 0;">
          ② ثانياً: الفائزون بمنح الدكتوراه (${phdLimit} منحة)
        </h3>
        <table style="width:100%; border-collapse: collapse; font-size: 0.8rem; border: 1px solid #fcd34d; border-radius: 6px; overflow: hidden;">
          <thead>
            <tr style="background: linear-gradient(135deg,#d97706,#b45309); color: #fffbeb;">
              <th style="padding: 5px; text-align: center; width: 40px;">#</th>
              <th style="padding: 5px; text-align: right;">اسم الموظف / المتقدم</th>
              <th style="padding: 5px; text-align: right;">التخصص</th>
              <th style="padding: 5px; text-align: center;">مجموع النقاط</th>
            </tr>
          </thead>
          <tbody>
            ${buildWinnersRows(phdWinners, 'الدكتوراه')}
          </tbody>
        </table>
      </div>

      <!-- ====== توقيعات أعضاء اللجنة (الصف الأول: الأعضاء بترتيب عكسي) ====== -->
      <div style="border-top: 2px solid #d97706; padding-top: 10px; margin-top: 4px; page-break-inside: avoid;">
        <h4 style="text-align: center; color: #92400e; font-size: 0.85rem; font-weight: 900; margin: 0 0 8px 0;">
          توقيعات أعضاء لجنة المفاضلة واعتماد رئاسة الجامعة
        </h4>

        <!-- الصف الأول: الأعضاء العاديون بترتيب عكسي -->
        <div style="display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-bottom: 8px;">
          ${regularMemberCards}
        </div>

        <!-- الصف الثاني: رئيس اللجنة + تعميد رئيس الجامعة -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 85%; margin: 0 auto; text-align: center;">

          <!-- رئيس اللجنة -->
          <div style="border: 1.5px solid #d97706; padding: 7px; border-radius: 7px; background: #fffbeb;">
            <p style="font-weight: 900; color: #92400e; font-size: 0.8rem; margin: 0 0 1px 0;">${chairman.committeeRole || 'رئيس اللجنة'}</p>
            <p style="font-weight: 900; color: #1a1a00; font-size: 0.85rem; margin: 0 0 1px 0;">${chairman.name}</p>
            <p style="color: #78350f; font-size: 0.68rem; margin: 0 0 6px 0;">${chairman.adminTitle || ''}</p>
            <div style="height: 18px; border-bottom: 1px dashed #d97706; margin-bottom: 3px;"></div>
            <p style="font-size: 0.6rem; color: #92400e; margin: 0; font-weight: 700;">التوقيع والختم الرسمي</p>
          </div>

          <!-- يعتمد رئيس الجامعة -->
          <div style="border: 2px solid #16a34a; padding: 7px; border-radius: 7px; background: #f0fdf4;">
            <p style="font-weight: 900; color: #15803d; font-size: 0.8rem; margin: 0 0 1px 0;">يُعتمُد / رئيس الجامعة</p>
            <p style="font-weight: 900; color: #14532d; font-size: 0.85rem; margin: 0 0 1px 0;">${rectorName}</p>
            <p style="color: #166534; font-size: 0.68rem; margin: 0 0 6px 0;">رئيس ${univName}</p>
            <div style="height: 18px; border-bottom: 1.5px dashed #16a34a; margin-bottom: 3px;"></div>
            <p style="font-size: 0.6rem; color: #15803d; margin: 0; font-weight: 800;">الختم والتوقيع الرسمي لرئاسة الجامعة</p>
          </div>
        </div>
      </div>

      <!-- ====== تذييل MAQATECH ====== -->
      <div style="margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 0.68rem; color: #475569;">
        <div style="display: flex; align-items: center; gap: 5px;">
          <span style="background: #0f172a; color: #60a5fa; font-weight: 900; padding: 1px 5px; border-radius: 3px; font-family: sans-serif;">MT</span>
          <strong>MAQATECH SOFTWARE SOLUTIONS</strong>
        </div>
        <span>جميع حقوق الملكية الفكرية والتطوير البرمجي محفوظة لشركة ماقتك © 2026</span>
      </div>
    </div>
  `;
}

// طباعة المحضر الرسمي النهائي
function printMinutesFinal() {
  document.body.classList.add('is-minutes-print');
  document.body.classList.remove('is-draft-print');
  const watermarkEl = document.getElementById('minutes-print-watermark');
  if (watermarkEl) watermarkEl.style.display = 'none';

  window.print();
  setTimeout(() => {
    document.body.classList.remove('is-minutes-print');
  }, 1000);
}

// طباعة مسودة المحضر الرسمي للمراجعة والتنقيح
function printMinutesDraft() {
  document.body.classList.add('is-minutes-print');
  document.body.classList.add('is-draft-print');
  const watermarkEl = document.getElementById('minutes-print-watermark');
  if (watermarkEl) watermarkEl.style.display = 'block';

  window.print();
  setTimeout(() => {
    document.body.classList.remove('is-minutes-print');
    document.body.classList.remove('is-draft-print');
    if (watermarkEl) watermarkEl.style.display = 'none';
  }, 1000);
}

function printMinutes() {
  printMinutesFinal();
}

// توليد وعرض وثيقة دليل معايير وأوزان المفاضلة المعتمدة
function renderCriteriaDoc() {
  const container = document.getElementById('criteria-doc-content');
  if (!container) return;

  const univName = state.settings.universityName || 'جامعة صنعاء';
  const refYear = parseInt(state.settings.referenceYear) || 2026;
  const academicYear = `${refYear - 1}/${refYear}م`;
  const location = state.settings.competitionLocation || state.settings.sessionLocation || 'مقر الأمانة العامة / قاعة اجتماعات مجلس الجامعة الرئيسي - جامعة صنعاء';
  const dateStr = state.settings.competitionDate || state.settings.sessionDate || 'شهر اغسطس 2026';
  const rectorName = state.settings.rectorName || 'أ.د. محمد أحمد البخيتي';

  const committee = state.committeeMembers || [];
  const chairman = committee.find(m => (m.committeeRole || '').includes('رئيس اللجنة')) || committee[0] || { name: 'أ.د. ابراهيم المطاع', committeeRole: 'رئيس اللجنة', adminTitle: 'نائب رئيس الجامعة للشؤون الأكاديمية' };
  const regularMembers = committee.filter(m => m !== chairman).reverse();

  const regularMemberCards = regularMembers.map(m => `
    <div style="border: 1px solid #fcd34d; padding: 5px 6px; border-radius: 5px; background: #fffbeb; text-align: center; min-width: 120px;">
      <p style="font-weight: 800; color: #92400e; font-size: 0.7rem; margin: 0 0 1px 0;">${m.committeeRole || 'عضواً'}</p>
      <p style="font-weight: 900; color: #1a1a00; font-size: 0.76rem; margin: 0 0 1px 0;">${m.name}</p>
      <p style="color: #78350f; font-size: 0.62rem; margin: 0 0 5px 0;">${m.adminTitle || ''}</p>
      <div style="height: 14px; border-bottom: 1px dashed #d97706; margin-bottom: 3px;"></div>
      <p style="font-size: 0.56rem; color: #b45309; margin: 0; font-weight: 600;">التوقيع والختم الرسمي</p>
    </div>
  `).join('');

  // استخراج معايير المفاضلة المعتمدة من state.criteria
  const cData = state.criteria || {};

  // 1. الأقدمية
  const sen = cData.seniority || {};
  const senScope = getCriterionTargetDegree(sen);
  const senRows = (sen.brackets || []).map(b => `
    <tr style="border-bottom: 1px solid #86efac;">
      <td style="padding: 6px 10px; font-weight: 700; color: #14532d;">الشريحة الزمانية للتعيين (${b.label || (b.minYear + ' - ' + b.maxYear + 'م')})</td>
      <td style="padding: 6px 10px; text-align: center; font-weight: 900; color: #166534; background: #f0fdf4;">${b.points} نقاط</td>
    </tr>
  `).join('');

  // 2. العمر
  const age = cData.age || {};
  const ageScope = getCriterionTargetDegree(age);
  let ageRows = '';
  if (age.phdBrackets && age.phdBrackets.length > 0 && ageScope === 'all') {
    ageRows = `
      <tr style="background: #f0fdf4;">
        <td colspan="2" style="padding: 5px 10px; font-weight: 900; color: #166534;">👤 أ- الفئات العمرية المعتمدة لمتنافسي الماجستير:</td>
      </tr>
      ${(age.brackets || []).map(b => `
        <tr style="border-bottom: 1px solid #fcd34d;">
          <td style="padding: 5px 12px; font-weight: 700; color: #78350f;">الفئة العمرية (${b.label})</td>
          <td style="padding: 5px 10px; text-align: center; font-weight: 900; color: #166534; background: #f0fdf4;">${b.points} نقاط</td>
        </tr>
      `).join('')}
      <tr style="background: #faf5ff;">
        <td colspan="2" style="padding: 5px 10px; font-weight: 900; color: #7e22ce;">👤 ب- الفئات العمرية المعتمدة لمتنافسي الدكتوراه:</td>
      </tr>
      ${(age.phdBrackets || []).map(b => `
        <tr style="border-bottom: 1px solid #fcd34d;">
          <td style="padding: 5px 12px; font-weight: 700; color: #78350f;">الفئة العمرية (${b.label})</td>
          <td style="padding: 5px 10px; text-align: center; font-weight: 900; color: #166534; background: #f0fdf4;">${b.points} نقاط</td>
        </tr>
      `).join('')}
    `;
  } else {
    ageRows = (age.brackets || []).map(b => `
      <tr style="border-bottom: 1px solid #fcd34d;">
        <td style="padding: 6px 10px; font-weight: 700; color: #78350f;">الفئة العمرية (${b.label})</td>
        <td style="padding: 6px 10px; text-align: center; font-weight: 900; color: #166534; background: #f0fdf4;">${b.points} نقاط</td>
      </tr>
    `).join('');
  }

  // 3. التخصص
  const spec = cData.specialization || {};
  const specScope = getCriterionTargetDegree(spec);
  const specRows = (spec.items || []).map(i => `
    <tr style="border-bottom: 1px solid #86efac;">
      <td style="padding: 6px 10px; font-weight: 700; color: #14532d;">تخصص (${i.name})</td>
      <td style="padding: 6px 10px; text-align: center; font-weight: 900; color: #166534; background: #f0fdf4;">${i.points} نقاط</td>
    </tr>
  `).join('');

  // 4. التقدير العلمي وتفصيله القانوني الدقيق للماجستير والدكتوراه
  const gr = cData.grade || {};
  const grScope = getCriterionTargetDegree(gr);
  let grScopeBadge = '';
  if (grScope === 'master') {
    grScopeBadge = `<span style="background: #1e40af; color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 0.72rem; font-weight: 800;">مخصص لمنح الماجستير فقط</span>`;
  } else if (grScope === 'phd') {
    grScopeBadge = `<span style="background: #7e22ce; color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 0.72rem; font-weight: 800;">مخصص لمنح الدكتوراه فقط</span>`;
  } else if (grScope === 'none') {
    grScopeBadge = `<span style="background: #dc2626; color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 0.72rem; font-weight: 800;">معيار معطّل كلياً</span>`;
  } else {
    grScopeBadge = `<span style="background: #059669; color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 0.72rem; font-weight: 800;">مُفعّل لكافة الدرجات</span>`;
  }

  let gradeRows = '';
  if (grScope === 'master') {
    gradeRows = `
      <tr style="background: #eff6ff;">
        <td colspan="2" style="padding: 6px 10px; font-weight: 900; color: #1e40af; border-bottom: 2px solid #bfdbfe;">
          🎓 تقدير المؤهل الأكاديمي السابق لمتنافسي الماجستير (شهادة البكالوريوس):
        </td>
      </tr>
      ${(gr.items || []).map(i => `
        <tr style="border-bottom: 1px solid #fcd34d;">
          <td style="padding: 5px 12px; font-weight: 700; color: #78350f;">تقدير بكالوريوس (${i.name})</td>
          <td style="padding: 5px 10px; text-align: center; font-weight: 900; color: #166534; background: #f0fdf4;">${i.points} نقاط</td>
        </tr>
      `).join('')}
      <tr style="border-bottom: 1px solid #fcd34d;">
        <td style="padding: 5px 12px; font-weight: 700; color: #78350f;">مؤهل بكالوريوس (بدون معدل / بدون تقدير)</td>
        <td style="padding: 5px 10px; text-align: center; font-weight: 900; color: #991b1b; background: #fef2f2;">0 نقاط</td>
      </tr>
      <tr style="background: #f8fafc; border-top: 1.5px dashed #cbd5e1;">
        <td colspan="2" style="padding: 6px 10px; font-size: 0.76rem; color: #64748b; font-weight: 700;">
          📌 <strong>ملاحظة تنظيمية معتمدة:</strong> يُطبّق هذا المعيار حصرياً على متنافسي منح الماجستير بناءً على تقدير شهادة البكالوريوس، ولا يُحتسب لمتنافسي منح الدكتوراه بقرار اللجنة.
        </td>
      </tr>
    `;
  } else if (grScope === 'phd') {
    gradeRows = `
      <tr style="background: #faf5ff;">
        <td colspan="2" style="padding: 6px 10px; font-weight: 900; color: #7e22ce; border-bottom: 2px solid #e9d5ff;">
          🎓 تقدير المؤهل الأكاديمي السابق لمتنافسي الدكتوراه (شهادة الماجستير):
        </td>
      </tr>
      ${(gr.items || []).map(i => `
        <tr style="border-bottom: 1px solid #fcd34d;">
          <td style="padding: 5px 12px; font-weight: 700; color: #78350f;">تقدير ماجستير (${i.name})</td>
          <td style="padding: 5px 10px; text-align: center; font-weight: 900; color: #166534; background: #f0fdf4;">${i.points} نقاط</td>
        </tr>
      `).join('')}
      <tr style="border-bottom: 1px solid #fcd34d;">
        <td style="padding: 5px 12px; font-weight: 700; color: #78350f;">مؤهل ماجستير (بدون معدل / بدون تقدير)</td>
        <td style="padding: 5px 10px; text-align: center; font-weight: 900; color: #991b1b; background: #fef2f2;">0 نقاط</td>
      </tr>
      <tr style="background: #f8fafc; border-top: 1.5px dashed #cbd5e1;">
        <td colspan="2" style="padding: 6px 10px; font-size: 0.76rem; color: #64748b; font-weight: 700;">
          📌 <strong>ملاحظة تنظيمية معتمدة:</strong> يُطبّق هذا المعيار حصرياً على متنافسي منح الدكتوراه بناءً على تقدير شهادة الماجستير.
        </td>
      </tr>
    `;
  } else if (grScope === 'none') {
    gradeRows = `
      <tr>
        <td colspan="2" style="padding: 10px; text-align: center; color: #991b1b; font-weight: 800; background: #fef2f2;">
          تم تعطيل احتساب معيار التقدير الأكاديمي لكافة المتقدمين بقرار من اللجنة.
        </td>
      </tr>
    `;
  } else {
    // all
    gradeRows = `
      <tr style="background: #f0fdf4;">
        <td colspan="2" style="padding: 6px 10px; font-weight: 900; color: #166534; border-bottom: 1.5px solid #bbf7d0;">
          🎓 أ- متنافسو منح الماجستير (المؤهل السابق المحتسب: شهادة البكالوريوس):
        </td>
      </tr>
      ${(gr.items || []).map(i => `
        <tr style="border-bottom: 1px solid #fcd34d;">
          <td style="padding: 5px 12px; font-weight: 700; color: #78350f;">تقدير مؤهل البكالوريوس (${i.name})</td>
          <td style="padding: 5px 10px; text-align: center; font-weight: 900; color: #166534; background: #f0fdf4;">${i.points} نقاط</td>
        </tr>
      `).join('')}
      <tr style="border-bottom: 1px solid #fcd34d;">
        <td style="padding: 5px 12px; font-weight: 700; color: #78350f;">مؤهل بكالوريوس (بدون معدل / بدون تقدير)</td>
        <td style="padding: 5px 10px; text-align: center; font-weight: 900; color: #991b1b; background: #fef2f2;">0 نقاط</td>
      </tr>
      <tr style="background: #faf5ff;">
        <td colspan="2" style="padding: 6px 10px; font-weight: 900; color: #7e22ce; border-bottom: 1.5px solid #e9d5ff;">
          🎓 ب- متنافسو منح الدكتوراه (المؤهل السابق المحتسب: شهادة الماجستير):
        </td>
      </tr>
      ${(gr.items || []).map(i => `
        <tr style="border-bottom: 1px solid #fcd34d;">
          <td style="padding: 5px 12px; font-weight: 700; color: #78350f;">تقدير مؤهل الماجستير (${i.name})</td>
          <td style="padding: 5px 10px; text-align: center; font-weight: 900; color: #166534; background: #f0fdf4;">${i.points} نقاط</td>
        </tr>
      `).join('')}
      <tr style="border-bottom: 1px solid #fcd34d;">
        <td style="padding: 5px 12px; font-weight: 700; color: #78350f;">مؤهل ماجستير (بدون معدل / بدون تقدير)</td>
        <td style="padding: 5px 10px; text-align: center; font-weight: 900; color: #991b1b; background: #fef2f2;">0 نقاط</td>
      </tr>
    `;
  }

  // 5. المعايير المخصصة
  const custom = cData.customCriteria || [];
  const activeCustom = custom.filter(c => c && c.enabled && (c.targetDegree === 'all' || c.targetDegree === 'master' || c.targetDegree === 'phd'));
  
  const arabicNumbers = ['⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

  const customSection = activeCustom.map((c, idx) => {
    const itype = c.indicatorType || 'binary';
    let detailRows = '';
    let cEffectiveMax = parseFloat(c.maxPoints) || 0;

    if (itype === 'binary') {
      const opts = (c.config && c.config.options && c.config.options.length > 0) ? c.config.options : [
        { label: 'مستمر', points: c.maxPoints || 5 },
        { label: 'متاح', points: 3 }
      ];
      const optMax = Math.max(...opts.map(o => parseFloat(o.points) || 0), 0);
      if (optMax > 0) cEffectiveMax = optMax;
      c.maxPoints = cEffectiveMax;

      detailRows = opts.map(o => `
        <tr style="border-bottom: 1px solid #fcd34d;">
          <td style="padding: 6px 10px; font-weight: 700; color: #78350f;">حالة (${o.label})</td>
          <td style="padding: 6px 10px; text-align: center; font-weight: 900; color: #166534; background: #f0fdf4;">${o.points} نقاط</td>
        </tr>
      `).join('');
    } else if (itype === 'grade') {
      const grades = (c.config && c.config.grades && c.config.grades.length > 0) ? c.config.grades : [];
      const gMax = Math.max(...grades.map(g => parseFloat(g.points) || 0), 0);
      if (gMax > 0) cEffectiveMax = gMax;
      c.maxPoints = cEffectiveMax;

      detailRows = grades.map(g => `
        <tr style="border-bottom: 1px solid #fcd34d;">
          <td style="padding: 6px 10px; font-weight: 700; color: #78350f;">تصنيف (${g.label})</td>
          <td style="padding: 6px 10px; text-align: center; font-weight: 900; color: #166534; background: #f0fdf4;">${g.points} نقاط</td>
        </tr>
      `).join('');
    } else if (itype === 'bracket') {
      const brackets = (c.config && c.config.brackets && c.config.brackets.length > 0) ? c.config.brackets : [];
      const bMax = Math.max(...brackets.map(b => parseFloat(b.points) || 0), 0);
      if (bMax > 0) cEffectiveMax = bMax;
      c.maxPoints = cEffectiveMax;

      detailRows = brackets.map(b => `
        <tr style="border-bottom: 1px solid #fcd34d;">
          <td style="padding: 6px 10px; font-weight: 700; color: #78350f;">المجال (${b.label || (b.min + ' - ' + b.max)})</td>
          <td style="padding: 6px 10px; text-align: center; font-weight: 900; color: #166534; background: #f0fdf4;">${b.points} نقاط</td>
        </tr>
      `).join('');
    } else if (itype === 'numeric') {
      const ppu = (c.config && c.config.pointsPerUnit) ? c.config.pointsPerUnit : 1;
      if (cEffectiveMax <= 0) cEffectiveMax = 5;
      detailRows = `
        <tr style="border-bottom: 1px solid #fcd34d;">
          <td style="padding: 6px 10px; font-weight: 700; color: #78350f;">احتساب كمي مباشر (لكل وحدة منجزة)</td>
          <td style="padding: 6px 10px; text-align: center; font-weight: 900; color: #166534; background: #f0fdf4;">${ppu} نقطة / وحدة (الحد الأقصى: ${cEffectiveMax} نقاط)</td>
        </tr>
      `;
    }

    if (cEffectiveMax <= 0) cEffectiveMax = 5;

    const ordSymbol = arabicNumbers[idx] || `(${idx + 5})`;

    return `
      <div style="margin-bottom: 10px;">
        <h3 style="background: linear-gradient(135deg,#fbbf24,#f59e0b); color:#451a03; padding: 5px 12px; border-radius: 5px; font-size: 0.88rem; font-weight: 900; margin: 0 0 6px 0; display: flex; justify-content: space-between; align-items: center;">
          <span>${ordSymbol} معيار ${c.name}</span>
          <span style="background: #b45309; color: #fff; padding: 1px 8px; border-radius: 12px; font-size: 0.75rem;">الوزن الأعلى: ${cEffectiveMax} نقاط</span>
        </h3>
        <table style="width:100%; border-collapse: collapse; font-size: 0.8rem; border: 1px solid #fcd34d; border-radius: 6px; overflow: hidden; background: #fff;">
          <thead>
            <tr style="background: linear-gradient(135deg,#d97706,#b45309); color: #fffbeb;">
              <th style="padding: 6px 10px; text-align: right;">مؤشر وحالة المعيار</th>
              <th style="padding: 6px 10px; text-align: center; width: 120px;">النقاط المستحقة</th>
            </tr>
          </thead>
          <tbody>
            ${detailRows}
          </tbody>
        </table>
      </div>
    `;
  }).join('');

  // حساب أسقف النقاط بدقة متناهية للماجستير والدكتوراه
  const maxSeniority = (sen && sen.enabled !== false) ? (parseFloat(sen.maxPoints) || 10) : 0;
  const maxAge = (age && age.enabled !== false) ? (parseFloat(age.maxPoints) || 5) : 0;
  const maxSpec = (spec && spec.enabled !== false) ? (parseFloat(spec.maxPoints) || 5) : 0;
  const maxGrade = (gr && gr.enabled !== false) ? (parseFloat(gr.maxPoints) || 5) : 0;

  let masterCeiling = 0;
  let phdCeiling = 0;

  if (isCriterionActiveForDegree(sen, 'ماجستير')) masterCeiling += maxSeniority;
  if (isCriterionActiveForDegree(age, 'ماجستير')) masterCeiling += maxAge;
  if (isCriterionActiveForDegree(spec, 'ماجستير')) masterCeiling += maxSpec;
  if (isCriterionActiveForDegree(gr, 'ماجستير')) masterCeiling += maxGrade;

  if (isCriterionActiveForDegree(sen, 'دكتوراه')) phdCeiling += maxSeniority;
  if (isCriterionActiveForDegree(age, 'دكتوراه')) phdCeiling += maxAge;
  if (isCriterionActiveForDegree(spec, 'دكتوراه')) phdCeiling += maxSpec;
  if (isCriterionActiveForDegree(gr, 'دكتوراه')) phdCeiling += maxGrade;

  activeCustom.forEach(c => {
    const pts = parseFloat(c.maxPoints) || 5;
    if (isCriterionActiveForDegree(c, 'ماجستير')) masterCeiling += pts;
    if (isCriterionActiveForDegree(c, 'دكتوراه')) phdCeiling += pts;
  });

  let ceilingSummaryText = '';
  if (masterCeiling === phdCeiling) {
    ceilingSummaryText = `(إجمالي سقف منظومة المفاضلة: ${masterCeiling} نقطة)`;
  } else {
    ceilingSummaryText = `(سقف مفاضلة الماجستير: ${masterCeiling} نقطة | سقف مفاضلة الدكتوراه: ${phdCeiling} نقطة)`;
  }

  container.innerHTML = `
    <div id="criteria-doc-printable-area" style="
      background: #fffdf5;
      color: #1a1a00;
      font-family: 'Tajawal', 'Segoe UI', Arial, sans-serif;
      direction: rtl;
      max-width: 800px;
      margin: 0 auto 30px auto;
      padding: 18px 28px;
      border: 2px solid #d97706;
      border-radius: 10px;
      box-shadow: 0 4px 30px rgba(217,119,6,0.18);
    ">

      <!-- ====== رأس الوثيقة ====== -->
      <div style="text-align: center; border-bottom: 2px double #d97706; padding-bottom: 8px; margin-bottom: 10px;">
        <h1 style="margin: 0 0 2px 0; color: #78350f; font-size: 1.2rem; font-weight: 900; letter-spacing: 0.3px;">
          ${univName}
        </h1>
        <h2 style="margin: 0 0 2px 0; color: #92400e; font-size: 0.92rem; font-weight: 800;">
          لجنة المفاضلة للمتقدمين لمنح الدراسات العليا
        </h2>
        <h3 style="margin: 0; color: #b45309; font-size: 0.82rem; font-weight: 700;">
          الكادر الإداري
        </h3>
      </div>

      <!-- ====== عنوان الوثيقة ====== -->
      <div style="text-align: center; background: #4ade80; color: #14532d; padding: 8px 16px; border-radius: 7px; margin-bottom: 10px;">
        <h2 style="margin: 0 0 2px 0; font-size: 1rem; font-weight: 900; letter-spacing: 0.3px;">
          وثيقة دليل معايير وأوزان المفاضلة المعتمدة
        </h2>
        <p style="margin: 0; font-size: 0.85rem; font-weight: 700; color: #166534;">
          العام الجامعي ${academicYear} ${ceilingSummaryText}
        </p>
      </div>

      <!-- ====== بيانات اعتماد الوثيقة ====== -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; font-size: 0.8rem;">
        <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; padding: 6px 10px;">
          <strong style="color: #92400e; display: block; margin-bottom: 2px;">📍 مقر الاعتماد والجلسة:</strong>
          <span style="color: #78350f; font-weight: 600;">${location}</span>
        </div>
        <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; padding: 6px 10px;">
          <strong style="color: #92400e; display: block; margin-bottom: 2px;">🗓️ تاريخ وثيقة المعايير:</strong>
          <span style="color: #78350f; font-weight: 600;">${dateStr}</span>
        </div>
      </div>

      <!-- ====== ديباجة التقرير ====== -->
      <div style="background: #fffbeb; border-right: 3px solid #f59e0b; padding: 7px 12px; margin-bottom: 10px; font-size: 0.8rem; line-height: 1.65; color: #78350f;">
        <p style="margin: 0;">
          <strong>بسم الله الرحمن الرحيم</strong>
        </p>
        <p style="margin: 4px 0 0 0;">
          تعتمد لجنة المفاضلة المشكّلة بموجب قرار رئاسة جامعة صنعاء جدول المعايير والشرائح والأوزان المعيارية المبينة أدناه لمفاضلة المتقدمين للحصول على منح الدراسات العليا (ماجستير ودكتوراه) للكادر الإداري للعام الجامعي ${academicYear}:
        </p>
      </div>

      <!-- ====== 1. معيار الأقدمية ====== -->
      <div style="margin-bottom: 10px;">
        <h3 style="background: #4ade80; color:#14532d; padding: 5px 12px; border-radius: 5px; font-size: 0.88rem; font-weight: 900; margin: 0 0 6px 0; display: flex; justify-content: space-between; align-items: center;">
          <span>① معيار الأقدمية بالخدمة / تاريخ التعيين</span>
          <span style="background: #15803d; color: #fff; padding: 1px 8px; border-radius: 12px; font-size: 0.75rem;">الوزن الأعلى: ${maxSeniority} نقاط</span>
        </h3>
        <table style="width:100%; border-collapse: collapse; font-size: 0.8rem; border: 1px solid #86efac; border-radius: 6px; overflow: hidden; background: #fff;">
          <thead>
            <tr style="background: linear-gradient(135deg,#16a34a,#15803d); color: #ffffff;">
              <th style="padding: 6px 10px; text-align: right;">الشريحة الزمانية لسنة التعيين بالخدمة/الجامعة</th>
              <th style="padding: 6px 10px; text-align: center; width: 120px;">النقاط المستحقة</th>
            </tr>
          </thead>
          <tbody>
            ${senRows}
          </tbody>
        </table>
      </div>

      <!-- ====== 2. معيار العمر ====== -->
      <div style="margin-bottom: 10px;">
        <h3 style="background: linear-gradient(135deg,#fbbf24,#f59e0b); color:#451a03; padding: 5px 12px; border-radius: 5px; font-size: 0.88rem; font-weight: 900; margin: 0 0 6px 0; display: flex; justify-content: space-between; align-items: center;">
          <span>② معيار الفئة العمرية للموظف المتقدم</span>
          <span style="background: #b45309; color: #fff; padding: 1px 8px; border-radius: 12px; font-size: 0.75rem;">الوزن الأعلى: ${maxAge} نقاط</span>
        </h3>
        <table style="width:100%; border-collapse: collapse; font-size: 0.8rem; border: 1px solid #fcd34d; border-radius: 6px; overflow: hidden; background: #fff;">
          <thead>
            <tr style="background: linear-gradient(135deg,#d97706,#b45309); color: #fffbeb;">
              <th style="padding: 6px 10px; text-align: right;">شرائح العمر (محسوبة بالسنة المرجعية)</th>
              <th style="padding: 6px 10px; text-align: center; width: 120px;">النقاط المستحقة</th>
            </tr>
          </thead>
          <tbody>
            ${ageRows}
          </tbody>
        </table>
      </div>

      <!-- ====== 3. معيار التخصص ====== -->
      <div style="margin-bottom: 10px;">
        <h3 style="background: #4ade80; color:#14532d; padding: 5px 12px; border-radius: 5px; font-size: 0.88rem; font-weight: 900; margin: 0 0 6px 0; display: flex; justify-content: space-between; align-items: center;">
          <span>③ معيار مدى احتياج الجامعة للتخصص</span>
          <span style="background: #15803d; color: #fff; padding: 1px 8px; border-radius: 12px; font-size: 0.75rem;">الوزن الأعلى: ${maxSpec} نقاط</span>
        </h3>
        <table style="width:100%; border-collapse: collapse; font-size: 0.8rem; border: 1px solid #86efac; border-radius: 6px; overflow: hidden; background: #fff;">
          <thead>
            <tr style="background: linear-gradient(135deg,#16a34a,#15803d); color: #ffffff;">
              <th style="padding: 6px 10px; text-align: right;">التخصص المطلـوب</th>
              <th style="padding: 6px 10px; text-align: center; width: 120px;">نقاط الاحتياج</th>
            </tr>
          </thead>
          <tbody>
            ${specRows}
          </tbody>
        </table>
      </div>

      <!-- ====== 4. معيار التقدير ====== -->
      <div style="margin-bottom: 10px;">
        <h3 style="background: linear-gradient(135deg,#fbbf24,#f59e0b); color:#451a03; padding: 5px 12px; border-radius: 5px; font-size: 0.88rem; font-weight: 900; margin: 0 0 6px 0; display: flex; justify-content: space-between; align-items: center;">
          <span>④ معيار تقدير المؤهل الدراسي السابق</span>
          <div style="display: flex; gap: 6px; align-items: center;">
            ${grScopeBadge}
            <span style="background: #b45309; color: #fff; padding: 1px 8px; border-radius: 12px; font-size: 0.75rem;">الوزن الأعلى: ${maxGrade} نقاط</span>
          </div>
        </h3>
        <table style="width:100%; border-collapse: collapse; font-size: 0.8rem; border: 1px solid #fcd34d; border-radius: 6px; overflow: hidden; background: #fff;">
          <thead>
            <tr style="background: linear-gradient(135deg,#d97706,#b45309); color: #fffbeb;">
              <th style="padding: 6px 10px; text-align: right;">تقدير المؤهل الأكاديمي</th>
              <th style="padding: 6px 10px; text-align: center; width: 120px;">النقاط الممنوحة</th>
            </tr>
          </thead>
          <tbody>
            ${gradeRows}
          </tbody>
        </table>
      </div>

      <!-- ====== المعايير المخصصة ====== -->
      ${customSection}

      <!-- ====== توقيعات أعضاء اللجنة ====== -->
      <div style="border-top: 2px solid #d97706; padding-top: 10px; margin-top: 4px; page-break-inside: avoid;">
        <h4 style="text-align: center; color: #92400e; font-size: 0.85rem; font-weight: 900; margin: 0 0 8px 0;">
          اعتماد توقيعات أعضاء لجنة المفاضلة واعتماد رئاسة الجامعة
        </h4>

        <!-- الصف الأول: الأعضاء العاديون بترتيب عكسي -->
        <div style="display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-bottom: 8px;">
          ${regularMemberCards}
        </div>

        <!-- الصف الثاني: رئيس اللجنة + تعميد رئيس الجامعة -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 85%; margin: 0 auto; text-align: center;">

          <!-- رئيس اللجنة -->
          <div style="border: 1.5px solid #d97706; padding: 7px; border-radius: 7px; background: #fffbeb;">
            <p style="font-weight: 900; color: #92400e; font-size: 0.8rem; margin: 0 0 1px 0;">${chairman.committeeRole || 'رئيس اللجنة'}</p>
            <p style="font-weight: 900; color: #1a1a00; font-size: 0.85rem; margin: 0 0 1px 0;">${chairman.name}</p>
            <p style="color: #78350f; font-size: 0.68rem; margin: 0 0 6px 0;">${chairman.adminTitle || ''}</p>
            <div style="height: 18px; border-bottom: 1px dashed #d97706; margin-bottom: 3px;"></div>
            <p style="font-size: 0.6rem; color: #92400e; margin: 0; font-weight: 700;">التوقيع والختم الرسمي</p>
          </div>

          <!-- يعتمد رئيس الجامعة -->
          <div style="border: 2px solid #16a34a; padding: 7px; border-radius: 7px; background: #f0fdf4;">
            <p style="font-weight: 900; color: #15803d; font-size: 0.8rem; margin: 0 0 1px 0;">يُعتمُد / رئيس الجامعة</p>
            <p style="font-weight: 900; color: #14532d; font-size: 0.85rem; margin: 0 0 1px 0;">${rectorName}</p>
            <p style="color: #166534; font-size: 0.68rem; margin: 0 0 6px 0;">رئيس ${univName}</p>
            <div style="height: 18px; border-bottom: 1.5px dashed #16a34a; margin-bottom: 3px;"></div>
            <p style="font-size: 0.6rem; color: #15803d; margin: 0; font-weight: 800;">الختم والتوقيع الرسمي لرئاسة الجامعة</p>
          </div>
        </div>
      </div>

      <!-- ====== تذييل MAQATECH ====== -->
      <div style="margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 0.68rem; color: #475569;">
        <div style="display: flex; align-items: center; gap: 5px;">
          <span style="background: #0f172a; color: #60a5fa; font-weight: 900; padding: 1px 5px; border-radius: 3px; font-family: sans-serif;">MT</span>
          <strong>MAQATECH SOFTWARE SOLUTIONS</strong>
        </div>
        <span>جميع حقوق الملكية الفكرية والتطوير البرمجي محفوظة لشركة ماقتك © 2026</span>
      </div>
    </div>
  `;
}

// دالة طباعة وثيقة معايير وأوزان المفاضلة المعتمدة
function printCriteriaDoc() {
  document.body.classList.add('is-criteria-doc-print');
  window.print();
  setTimeout(() => {
    document.body.classList.remove('is-criteria-doc-print');
  }, 1000);
}
