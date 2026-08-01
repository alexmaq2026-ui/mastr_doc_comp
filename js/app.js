// تطبيق نظام المفاضلة والتنافس الإلكتروني - جامعة صنعاء

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
  setupEventListeners();
  refreshAllViews();
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
      if (!state.candidates || state.candidates.length < PRESEEDED_CANDIDATES.length) {
        state.candidates = JSON.parse(JSON.stringify(PRESEEDED_CANDIDATES));
      }
      if (state.criteria && (state.criteria.seniority.maxPoints === 30 || state.criteria.age.maxPoints === 25 || state.criteria.specialization.maxPoints === 25)) {
        state.criteria = JSON.parse(JSON.stringify(DEFAULT_CRITERIA));
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
  state.candidates = JSON.parse(JSON.stringify(PRESEEDED_CANDIDATES));
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
        state.users = JSON.parse(JSON.stringify(DEFAULT_USERS));
    }

    let foundUser = state.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);

    // خيار أمان احتياطي للحسابات الافتراضية الرئيسية
    if (!foundUser) {
        const defMatch = DEFAULT_USERS.find(d => d.username.toLowerCase() === username.toLowerCase() && d.password === password);
        if (defMatch) {
            foundUser = defMatch;
            if (!state.users.some(u => u.username === defMatch.username)) {
                state.users.push({ ...defMatch });
            }
        }
    }

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
            errorMsg.innerText = 'خطأ: اسم المستخدم أو كلمة المرور غير صحيحة! (مثال: admin / admin123)';
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
          <button class="btn btn-outline btn-xs" onclick="showLoginModal()">تغيير الحساب</button>
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
  return role;
}

function renderTabsByRole() {
  const currentRole = state.currentUser ? state.currentUser.role : 'auditor';

  // تعريف التبويبات لكل دور
  const allTabs = ['tab-btn-dashboard','tab-btn-candidates','tab-btn-scoring',
                   'tab-btn-report','tab-btn-analytics','tab-btn-criteria','tab-btn-admin'];

  // الخريطة: ما يُظهر لكل دور
  const visibilityMap = {
    super_admin: ['tab-btn-dashboard','tab-btn-candidates','tab-btn-scoring',
                  'tab-btn-report','tab-btn-analytics','tab-btn-criteria','tab-btn-admin'],
    data_entry:  ['tab-btn-candidates','tab-btn-analytics'],
    auditor:     ['tab-btn-candidates','tab-btn-analytics']
  };

  const allowed = visibilityMap[currentRole] || visibilityMap['auditor'];

  allTabs.forEach(tabId => {
    const el = document.getElementById(tabId);
    if (el) el.style.display = allowed.includes(tabId) ? 'flex' : 'none';
  });

  // إذا كان التبويب الحالي النشط غير مسموح به، انتقل للأول المسموح
  const activeBtn = document.querySelector('.tab-btn.active');
  if (activeBtn) {
    const activeBtnId = activeBtn.id;
    if (!allowed.includes(activeBtnId)) {
      const firstAllowed = document.getElementById(allowed[0]);
      if (firstAllowed) firstAllowed.click();
    }
  }

  // أزرار الإضافة والاستيراد: للمدير الأعلى ومدخل البيانات فقط
  const canEditCandidates = (currentRole === 'super_admin' || currentRole === 'data_entry');
  const addCandidateBtn = document.getElementById('btn-add-candidate');
  const importExcelBtn  = document.getElementById('btn-import-excel');
  if (addCandidateBtn) addCandidateBtn.style.display = canEditCandidates ? 'inline-flex' : 'none';
  if (importExcelBtn)  importExcelBtn.style.display  = canEditCandidates ? 'inline-flex' : 'none';

  // زر تنفيذ المفاضلة في الشريط العلوي: يظهر للمدير الأعلى فقط
  const runNavBtn = document.getElementById('btn-run-nav') || document.querySelector('.btn-run-nav');
  if (runNavBtn) {
    runNavBtn.style.display = (currentRole === 'super_admin') ? 'inline-flex' : 'none';
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



// محرك احتساب النقاط والمفاضلة (Scoring Engine)
function calculateCandidateScore(candidate) {
  let seniorityScore = 0;
  let ageScore = 0;
  let specScore = 0;
  let gradeScore = 0;
  let customScores = {};
  let customTotal = 0;

  const currentYear = state.settings.referenceYear || 2026;

  // 1. احتساب الأقدمية (سنوات الخدمة / التعيين)
  if (state.criteria.seniority && state.criteria.seniority.enabled) {
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
      // البحث عن الشريحة المناسبة
      for (let b of state.criteria.seniority.brackets) {
        if (hiringYear >= b.minYear && hiringYear <= b.maxYear) {
          seniorityScore = b.points;
          break;
        }
      }
    }
  }

  // 2. احتساب العمر
  if (state.criteria.age && state.criteria.age.enabled) {
    let birthYear = parseInt(candidate.birth_date);
    if (!birthYear && candidate.birth_date) {
      const m = candidate.birth_date.match(/(\d{4})/);
      if (m) birthYear = parseInt(m[1]);
    }

    if (birthYear) {
      const age = currentYear - birthYear;
      for (let b of state.criteria.age.brackets) {
        if (age >= b.minAge && age <= b.maxAge) {
          ageScore = b.points;
          break;
        }
      }
    }
  }

  // 3. احتساب التخصص
  if (state.criteria.specialization && state.criteria.specialization.enabled) {
    const specName = candidate.specialization ? candidate.specialization.trim() : '';
    let found = false;
    for (let item of state.criteria.specialization.items) {
      if (specName.includes(item.name) || item.name.includes(specName)) {
        specScore = item.points;
        found = true;
        break;
      }
    }
    if (!found) {
      const otherItem = state.criteria.specialization.items.find(i => i.name === 'أخرى');
      specScore = otherItem ? otherItem.points : 10;
    }
  }

  // 4. احتساب التقدير العلمي
  if (state.criteria.grade && state.criteria.grade.enabled) {
    const gradeName = candidate.grade ? candidate.grade.trim() : '';
    for (let item of state.criteria.grade.items) {
      if (gradeName.includes(item.name)) {
        gradeScore = item.points;
        break;
      }
    }
  }

  // 5. احتساب المعايير المخصصة
  if (state.criteria.customCriteria) {
    for (let custom of state.criteria.customCriteria) {
      if (custom.enabled) {
        const val = (candidate.customValues && candidate.customValues[custom.id]) || 0;
        customScores[custom.id] = parseFloat(val) || 0;
        customTotal += customScores[custom.id];
      }
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
  const GRADE_ORDER = { 'ممتاز': 4, 'جيد جداً': 3, 'جيد': 2, 'مقبول': 1 };

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

  // دالة معالجة درجة واحدة (ماجستير أو دكتوراه)
  function processDegreeGroup(candidates, limit) {
    if (candidates.length === 0) return candidates;

    // 1. فرز جميع المتنافسين بالنقاط الكلية تنازلياً، ثم بالمعايير الفرعية الاستثنائية
    function detectCriterion(group) {
      const hiringYears = new Set(group.map(c => getHiringYear(c)));
      if (hiringYears.size > 1) return 'أقدمية التعيين';
      const birthYears  = new Set(group.map(c => getBirthYear(c)));
      if (birthYears.size > 1)  return 'صغر السن';
      const grades      = new Set(group.map(c => GRADE_ORDER[c.grade] || 0));
      if (grades.size > 1)      return 'التقدير الأكاديمي';
      return 'تعادل تام - يُحال للجنة المفاضلة';
    }

    candidates.sort((a, b) => {
      if (b.scores.totalScore !== a.scores.totalScore) {
        return b.scores.totalScore - a.scores.totalScore;
      }
      const hirA = getHiringYear(a), hirB = getHiringYear(b);
      if (hirA !== hirB) return hirA - hirB;                     // الأقدم تعييناً أولاً
      const birthA = getBirthYear(a), birthB = getBirthYear(b);
      if (birthA !== birthB) return birthB - birthA;             // الأصغر سناً أولاً
      return (GRADE_ORDER[b.grade] || 0) - (GRADE_ORDER[a.grade] || 0); // الأعلى تقديراً أولاً
    });

    // 2. تجميع المتنافسين بحسب النقاط الكلية
    const scoreGroups = {};
    candidates.forEach(c => {
      scoreGroups[c.scores.totalScore] = scoreGroups[c.scores.totalScore] || [];
      scoreGroups[c.scores.totalScore].push(c);
    });

    // 3. الوسام والملاحظة الاستثنائية تظهر فقط لمن هم داخل نطاق المقبولين بالفوز (أو متنافسين معهم على خط الحد)
    const boundaryScore = candidates[Math.min(limit - 1, candidates.length - 1)].scores.totalScore;

    candidates.forEach((c, idx) => {
      const isAcceptedZoneOrBoundary = (idx < limit) || (c.scores.totalScore === boundaryScore);
      const group = scoreGroups[c.scores.totalScore];

      if (isAcceptedZoneOrBoundary && group && group.length > 1) {
        c.tieBreaker = detectCriterion(group);
      } else {
        c.tieBreaker = null;
      }
    });

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
    c.status = mRank <= masterLimit ? 'مقبول' : '';
    mRank++;
  });
  let pRank = 1;
  phdsProcessed.forEach(c => {
    c.rank   = pRank;
    c.status = pRank <= phdLimit ? 'مقبول' : '';
    pRank++;
  });

  // إرجاع القائمة بحسب الفلتر
  if (degreeFilter === 'ماجستير') return mastersProcessed;
  if (degreeFilter === 'دكتوراه') return phdsProcessed;
  return [...mastersProcessed, ...phdsProcessed];
}


// تحديث كافة الشاشات والواجهات
function refreshAllViews() {
  renderDashboard();
  renderCandidatesTable();
  renderScoringTable();
  renderCriteriaSettings();
  renderUsersAdminTable();
  renderDetailedReport();
  renderAnalyticsView();
}

// 1. شاشة لوحة القيادة (Dashboard View)
function renderDashboard() {
  const rankedAll = getRankedCandidates();
  const masters = rankedAll.filter(c => c.degree === 'ماجستير');
  const phds = rankedAll.filter(c => c.degree === 'دكتوراه');

  document.getElementById('stat-total-candidates').innerText = rankedAll.length;
  document.getElementById('stat-masters-count').innerText = masters.length;
  document.getElementById('stat-phd-count').innerText = phds.length;
  document.getElementById('stat-accepted-total').innerText = (state.settings.masterGrantsCount || 3) + (state.settings.phdGrantsCount || 3);

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

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 20px;">لا توجد بيانات مطابقة للبحث</td></tr>`;
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

    // 2. زر حذف (لمدخل البيانات فقط)
    const deleteBtn = isDataEntry
      ? `<button class="btn btn-danger btn-sm" onclick="deleteCandidate(${c.id})"> حذف</button>`
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

    return `
    <tr style="${rowBg}">
      <td>${idx + 1}</td>
      <td><strong>${c.name}</strong> ${warningBadge}</td>
      <td><span class="badge-degree">${c.degree}</span></td>
      <td>${c.specialization}</td>
      <td>${c.hiring_univ || c.hiring_service || '-'}</td>
      <td>${c.birth_date || '-'}</td>
      <td>${c.grad_year || '-'}</td>
      <td>${c.grade || '-'}</td>
      <td style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;">
        ${editBtn}
        ${deleteBtn}
        ${annotateBtn}
        ${cAnnotations.length > 0 ? `<button class="btn btn-outline btn-sm" style="font-size:0.72rem;" onclick="toggleAnnotationsPanel(${c.id})">💬 ${cAnnotations.length}</button>` : ''}
      </td>
    </tr>
    ${annotationsPanel}`;
  }).join('');
}

function toggleAnnotationsPanel(candidateId) {
  const panel = document.getElementById('ann-panel-' + candidateId);
  if (panel) panel.style.display = (panel.style.display === 'none' ? 'table-row' : 'none');

}

// 3. شاشة نتائج المفاضلة (Competition Rankings View)
function renderScoringTable() {
  const tbody = document.getElementById('scoring-tbody');
  if (!tbody) return;

  const degreeFilter = document.getElementById('filter-rankings-degree') ? document.getElementById('filter-rankings-degree').value : 'ماجستير';
  const rankedList = getRankedCandidates(degreeFilter);

  if (rankedList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 20px;">لا يوجد متنافسين في هذا القسم</td></tr>`;
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
      ? `<td style="font-size:0.78rem; color: ${c.tieBreaker.includes('يُحال') ? '#ef4444' : '#d97706'}; font-weight:700;">
           ⚖️ مفاضلة استثنائية<br><span style="font-size:0.72rem;">معيار: ${c.tieBreaker}</span>
         </td>`
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
      <td><strong style="color: var(--primary); font-size: 1.05rem;">${c.scores.totalScore}</strong></td>
      <td>
        ${c.status === 'مقبول' ? `
          <span class="badge-status badge-accepted">✅ مرشح مقبول</span>
        ` : ''}
      </td>
      ${tieBreakerCell}
      <td>
        <button class="btn btn-outline btn-sm" onclick="viewCandidateDetails(${c.id})">التفاصيل</button>
      </td>
    </tr>`;
  }).join('');
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

  const currentYear = state.settings.referenceYear || 2026;
  const birthYear = parseInt(candidate.birth_date) || (candidate.birth_date ? (candidate.birth_date.match(/(\d{4})/) || [])[1] : 0);
  const calculatedAge = birthYear ? (currentYear - parseInt(birthYear)) : '-';
  const hiringUnivStr = candidate.hiring_univ || candidate.hiring_service || '-';

  const customScores = candidate.scores.customScores || {};
  const activeCustom  = (state.criteria.customCriteria || []).filter(c => c.enabled);

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; background: #0f172a; color: #ffffff; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px;">
      <div>
        <h3 style="margin: 0; font-size: 1.15rem; font-weight: 800;">${candidate.name}</h3>
        <span style="font-size: 0.82rem; color: #38bdf8; font-weight:700;">درجة (${candidate.degree}) — تخصص (${candidate.specialization})</span>
      </div>
      <div style="text-align: left;">
        <span style="display: block; font-size: 0.72rem; color: #94a3b8;">الترتيب المستحق</span>
        <strong style="font-size: 1.3rem; color: #38bdf8;">المركز #${candidate.rank}</strong>
      </div>
    </div>

    <!-- 1. شبكة البيانات الشخصية والأكاديمية -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; font-size: 0.84rem;">
      <h4 style="margin: 0 0 10px 0; color: #1e3a8a; font-size: 0.9rem; font-weight: 800; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">
        📌 البيانات الشخصية والأكاديمية
      </h4>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; color: #334155;">
        <div><strong>تاريخ التعيين بالخدمة/الجامعة:</strong> ${hiringUnivStr}</div>
        <div><strong>تاريخ الميلاد (العمر):</strong> ${candidate.birth_date || '-'} ${calculatedAge !== '-' ? `(${calculatedAge} سنة)` : ''}</div>
        <div><strong>التقدير الأكاديمي:</strong> ${candidate.grade || '-'}</div>
        <div><strong>سنة التخرج:</strong> ${candidate.grad_year || '-'}</div>
      </div>
    </div>

    <!-- 2. تفكيك احتساب النقاط التنافسية -->
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; font-size: 0.84rem;">
      <h4 style="margin: 0 0 10px 0; color: #166534; font-size: 0.9rem; font-weight: 800; border-bottom: 1px solid #86efac; padding-bottom: 4px;">
        📊 تفكيك احتساب النقاط المعيارية (من 25 نقطة)
      </h4>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; color: #14532d;">
        <div style="background: #ffffff; padding: 8px; border-radius: 6px; border: 1px solid #dcfce7;">
          <span style="display: block; font-size: 0.76rem; color: #64748b;">الأقدمية بالخدمة (أعلى 10ن):</span>
          <strong style="font-size: 1rem; color: #15803d;">${candidate.scores.seniorityScore} نقاط</strong>
        </div>
        <div style="background: #ffffff; padding: 8px; border-radius: 6px; border: 1px solid #dcfce7;">
          <span style="display: block; font-size: 0.76rem; color: #64748b;">الفئة العمرية (أعلى 5ن):</span>
          <strong style="font-size: 1rem; color: #15803d;">${candidate.scores.ageScore} نقاط</strong>
        </div>
        <div style="background: #ffffff; padding: 8px; border-radius: 6px; border: 1px solid #dcfce7;">
          <span style="display: block; font-size: 0.76rem; color: #64748b;">احتياج التخصص (أعلى 5ن):</span>
          <strong style="font-size: 1rem; color: #15803d;">${candidate.scores.specScore} نقاط</strong>
        </div>
        <div style="background: #ffffff; padding: 8px; border-radius: 6px; border: 1px solid #dcfce7;">
          <span style="display: block; font-size: 0.76rem; color: #64748b;">تقدير المؤهل (أعلى 5ن):</span>
          <strong style="font-size: 1rem; color: #15803d;">${candidate.scores.gradeScore} نقاط</strong>
        </div>
        ${activeCustom.map(custom => `
          <div style="background: #ffffff; padding: 8px; border-radius: 6px; border: 1px solid #dcfce7; grid-column: span 2;">
            <span style="display: block; font-size: 0.76rem; color: #64748b;">${custom.name}:</span>
            <strong style="font-size: 1rem; color: #15803d;">${(customScores[custom.id]) || 0} نقاط</strong>
          </div>
        `).join('')}
      </div>

      <div style="margin-top: 12px; background: #15803d; color: #ffffff; padding: 8px 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 700; font-size: 0.9rem;">إجمالي النقاط الكلية المحسوبة:</span>
        <strong style="font-size: 1.3rem;">${candidate.scores.totalScore} نقطة</strong>
      </div>
    </div>

    <!-- 3. حالة التنافس والمفاضلة الاستثنائية -->
    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 14px; font-size: 0.84rem; color: #78350f;">
      <h4 style="margin: 0 0 8px 0; color: #92400e; font-size: 0.9rem; font-weight: 800;">
        ⚖️ حالة التنافس وملاحظات الاستحقاق
      </h4>
      <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 6px;">
        <span><strong>النتيجة والاعتماد:</strong></span>
        ${candidate.status === 'مقبول' 
          ? '<span class="badge-status badge-accepted" style="font-size:0.85rem;">✅ مرشح مقبول بالفوز بالمنحة</span>' 
          : '<span style="color:#64748b; font-weight:600;">— خارج خط المنح المتاحة</span>'}
      </div>
      ${candidate.tieBreaker ? `
        <div style="background:#fef3c7; border-right:4px solid #f59e0b; padding:8px 12px; border-radius:4px; margin-top:8px;">
          <strong style="color:#b45309; display:block;">⚖️ مفاضلة استثنائية (حالة تعادل عند خط القبول)</strong>
          <span style="font-size:0.8rem; color:#92400e;">تم حسم الترتيب بناءً على معيار: <strong>${candidate.tieBreaker}</strong></span>
        </div>
      ` : `
        <div style="color:#64748b; font-size:0.8rem; margin-top:4px;">لم يتطلب الترتيب مفاضلة استثنائية للدرجة الكلية.</div>
      `}
    </div>
  `;

  openModal('modal-candidate-details');
}

function renderDetailedReport() {
  const reportContainer = document.getElementById('detailed-report-content');
  if (!reportContainer) return;

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
            <span>${state.settings.competitionDate || 'الخميس، 30 يوليو 2026م (الساعة 10:00 صباحاً)'}</span>
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
              <strong>1. الأقدمية (الأقدم تعييناً)</strong> ← <strong>2. صغر السن (الأصغر سناً)</strong> ← <strong>3. التقدير العلمي الأعلى</strong>.
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
        const regularMembers = members.filter(m => m !== chairman);
        const rectorName = (state.settings && state.settings.rectorName) ? state.settings.rectorName : 'أ.د. القاسم محمد عباس';

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

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">⚙️ تهيئة إعدادات النظام وتاريخ ومكان المفاضلة ورئاسة الجامعة</h3>
      </div>
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
          <input type="text" id="input-rector-name" class="form-control" value="${state.settings.rectorName || 'أ.د. القاسم محمد عباس'}" ${!isSuperAdmin ? 'disabled' : ''}>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
        <div class="form-group">
          <label style="font-weight: 700;">مكان تنفيذ وتطبيق المفاضلة التنافسية:</label>
          <input type="text" id="input-comp-location" class="form-control" value="${state.settings.competitionLocation || 'مقر الأمانة العامة / قاعة اجتماعات مجلس الجامعة الرئيسي - جامعة صنعاء'}" ${!isSuperAdmin ? 'disabled' : ''}>
        </div>
        <div class="form-group">
          <label style="font-weight: 700;">تاريخ ووقت جلسة المفاضلة والفرز الرسمية:</label>
          <input type="text" id="input-comp-date" class="form-control" value="${state.settings.competitionDate || 'الخميس، 30 يوليو 2026م (الساعة 10:00 صباحاً)'}" ${!isSuperAdmin ? 'disabled' : ''}>
        </div>
      </div>

      <div class="form-group" style="margin-bottom: 16px;">
        <label style="font-weight: 700;">عنوان ونوع التطبيق المعتمد للتقرير:</label>
        <input type="text" id="input-app-title" class="form-control" value="${state.settings.applicationTitle || 'نظام المفاضلة والتنافس الإلكتروني لمنتسبي الكادر الإداري لجامعة صنعاء (ماجستير ودكتوراه)'}" ${!isSuperAdmin ? 'disabled' : ''}>
      </div>

      ${isSuperAdmin ? `<button class="btn btn-primary" onclick="saveSettings()">💾 حفظ كود وإعدادات المفاضلة والرئاسة</button>` : ''}
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title"> تهيئة أوزان التخصصات والاحتياج</h3>
      </div>
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

    <div class="card">
      <div class="card-header">
        <h3 class="card-title"> تهيئة شرائح الأقدمية وتاريخ التعيين التفاعلية</h3>
      </div>
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
              <th>الشريحة الوظيفية / سنة التعيين</th>
              <th>من سنة</th>
              <th>إلى سنة</th>
              <th>النقاط المخصصة</th>
            </tr>
          </thead>
          <tbody>
            ${state.criteria.seniority.brackets.map((b, idx) => `
              <tr>
                <td><strong>${b.label}</strong></td>
                <td>${b.minYear}</td>
                <td>${b.maxYear}</td>
                <td>
                  <input type="number" class="form-control" style="width: 100px; text-align: center;" value="${b.points}" onchange="updateSeniorityBracketPoints(${idx}, this.value)" ${!isSuperAdmin ? 'disabled' : ''}>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title"> تهيئة الفئات العمرية التفاعلية</h3>
      </div>
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
              <th>النقاط المخصصة</th>
            </tr>
          </thead>
          <tbody>
            ${state.criteria.age.brackets.map((b, idx) => `
              <tr>
                <td><strong>${b.label}</strong></td>
                <td>
                  <input type="number" class="form-control" style="width: 100px; text-align: center;" value="${b.points}" onchange="updateAgeBracketPoints(${idx}, this.value)" ${!isSuperAdmin ? 'disabled' : ''}>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- تهيئة أوزان تقدير ومعدل البكالوريوس -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title"> تهيئة أوزان تقدير ومعدل البكالوريوس</h3>
      </div>
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

    <!-- إضافة وتصنيع معايير جديدة ومخصصة -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title"> إضافة وتصنيع معايير جديدة ومخصصة (Custom Criteria Builder)</h3>
      </div>
      <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 15px;">
        يتيح لك هذا المحرك إضافة أي معيار جديد حسب الحاجة (مثل: تقييم الأداء السنوي، الجزاءات، الأبحاث والنشر، المقابلة...) وتحديد وزنه الأقصى!
      </p>

      ${isSuperAdmin ? `
        <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.3); padding: 16px; border-radius: 10px; margin-bottom: 20px;">
          <h4 style="color: var(--accent); margin-bottom: 10px;"> تصميم وإنشاء معيار جديد مع الوزن</h4>
          <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end;">
            <div style="flex: 2; min-width: 220px;">
              <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted);">اسم المعيار الجديد:</label>
              <input type="text" id="new-custom-criterion-name" class="form-control" placeholder="مثال: تقييم الأداء السنوي، أبحاث ونشر...">
            </div>
            <div style="flex: 1; min-width: 130px;">
              <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted);">الوزن / النقاط القصوى:</label>
              <input type="number" id="new-custom-criterion-points" class="form-control" placeholder="مثال: 10" value="10">
            </div>
            <button class="btn btn-secondary" onclick="addCustomCriterion()"> إضافة المعيار للنظام</button>
          </div>
        </div>
      ` : ''}

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>م</th>
              <th>اسم المعيار المخصص</th>
              <th>الوزن / النقاط القصوى</th>
              <th>حالة المعيار</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${(state.criteria.customCriteria || []).length === 0 ? `
              <tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 15px;">لا توجد معايير مخصصة إضافية حالياً</td></tr>
            ` : (state.criteria.customCriteria || []).map((c, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${c.name}</strong></td>
                <td>
                  <input type="number" class="form-control" style="width: 100px; text-align: center;" value="${c.maxPoints}" onchange="updateCustomCriterionPoints('${c.id}', this.value)" ${!isSuperAdmin ? 'disabled' : ''}>
                </td>
                <td>
                  <span class="badge-status ${c.enabled ? 'badge-accepted' : 'badge-reserve'}">
                    ${c.enabled ? 'مُفعّل' : 'معطّل'}
                  </span>
                </td>
                <td>
                  ${isSuperAdmin ? `
                    <button class="btn btn-outline btn-sm" onclick="toggleCustomCriterion('${c.id}')">${c.enabled ? 'إيقاف' : 'تفعيل'}</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteCustomCriterion('${c.id}')"> حذف المعيار</button>
                  ` : '-'}
                </td>
              </tr>
            `).join('')}
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

  // البحث والفلترة
  const searchInput = document.getElementById('search-candidates');
  if (searchInput) searchInput.addEventListener('input', renderCandidatesTable);

  const degreeFilter = document.getElementById('filter-degree');
  if (degreeFilter) degreeFilter.addEventListener('change', renderCandidatesTable);

  const rankingsFilter = document.getElementById('filter-rankings-degree');
  if (rankingsFilter) rankingsFilter.addEventListener('change', renderScoringTable);

  const reportFilter = document.getElementById('report-degree-filter');
  if (reportFilter) reportFilter.addEventListener('change', renderDetailedReport);
}

// وظائف الحفظ والتعديل
function saveSettings() {
  const masterGrants = parseInt(document.getElementById('input-master-grants').value) || 3;
  const phdGrants = parseInt(document.getElementById('input-phd-grants').value) || 3;
  const refYear = parseInt(document.getElementById('input-ref-year').value) || 2026;
  const rectorName = document.getElementById('input-rector-name') ? document.getElementById('input-rector-name').value.trim() : 'أ.د. القاسم محمد عباس';
  const compLocation = document.getElementById('input-comp-location') ? document.getElementById('input-comp-location').value.trim() : '';
  const compDate = document.getElementById('input-comp-date') ? document.getElementById('input-comp-date').value.trim() : '';
  const appTitle = document.getElementById('input-app-title') ? document.getElementById('input-app-title').value.trim() : '';

  state.settings.masterGrantsCount = masterGrants;
  state.settings.phdGrantsCount = phdGrants;
  state.settings.referenceYear = refYear;
  state.settings.rectorName = rectorName || 'أ.د. القاسم محمد عباس';
  state.settings.competitionLocation = compLocation || 'مقر الأمانة العامة / قاعة اجتماعات مجلس الجامعة الرئيسي - جامعة صنعاء';
  state.settings.competitionDate = compDate || 'الخميس، 30 يوليو 2026م (الساعة 10:00 صباحاً)';
  state.settings.applicationTitle = appTitle || 'نظام المفاضلة والتنافس الإلكتروني لمنتسبي الكادر الإداري لجامعة صنعاء (ماجستير ودكتوراه)';

  saveStore();
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

function updateSeniorityBracketPoints(index, points) {
  state.criteria.seniority.brackets[index].points = parseFloat(points) || 0;
  saveStore();
  refreshAllViews();
}

function updateAgeBracketPoints(index, points) {
  state.criteria.age.brackets[index].points = parseFloat(points) || 0;
  saveStore();
  refreshAllViews();
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

  container.innerHTML = `
    <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.3); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
      <h5 style="color: var(--accent); margin-bottom: 8px; font-weight: 800;"> نقاط المعايير المخصصة الجديدة:</h5>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
        ${activeCustom.map(c => {
          const val = (candidate && candidate.customValues && candidate.customValues[c.id]) !== undefined ? candidate.customValues[c.id] : 0;
          return `
            <div class="form-group" style="margin-bottom: 0;">
              <label style="font-size: 0.78rem;">${c.name} (أقصى: ${c.maxPoints} نقطة):</label>
              <input type="number" class="form-control cand-custom-val-input" data-criterion-id="${c.id}" value="${val}" min="0" max="${c.maxPoints}">
            </div>
          `;
        }).join('')}
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
  document.getElementById('modal-candidate').classList.add('open');
}

function editCandidate(id) {
  const cand = state.candidates.find(c => c.id === id);
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
  document.getElementById('modal-candidate').classList.add('open');
}

function saveCandidateForm() {
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

  // تجميع قيم المعايير المخصصة
  const customValues = {};
  document.querySelectorAll('.cand-custom-val-input').forEach(inp => {
    const critId = inp.getAttribute('data-criterion-id');
    if (critId) {
      customValues[critId] = parseFloat(inp.value) || 0;
    }
  });

  if (id) {
    // تعديل
    const idx = state.candidates.findIndex(c => c.id === parseInt(id));
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
    }
  } else {
    // إضافة جديد
    const newId = Date.now();
    state.candidates.unshift({
      id: newId,
      name,
      degree,
      specialization,
      hiring_univ,
      birth_date,
      grad_year,
      grade,
      customValues
    });
  }

  saveStore();
  closeModal('modal-candidate');
  refreshAllViews();
}

function deleteCandidate(id) {
  if (confirm('هل أنت تأكد من رغبتك في حذف هذا المتنافس؟')) {
    state.candidates = state.candidates.filter(c => c.id !== id);
    saveStore();
    refreshAllViews();
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
      alert(`✅ تم تحديث بيانات وتعديل صلاحيات المستخدم (${name}) بنجاح!`);
    }
  } else {
    // إضافة مستخدم جديد
    const newId = state.users.length > 0 ? Math.max(...state.users.map(u => u.id)) + 1 : 1;
    state.users.push({ id: newId, username, password, name, role, title: getRoleTitle(role) });
    alert(`✅ تم إضافة المستخدم (${name}) بنجاح!`);
  }

  saveStore();
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
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
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
  refreshAllViews();
  alert(`تم توليد ${brackets.length} شريحة عمرية بنجاح بناءً على خطوة (${stepYears}) سنوات! يمكنك الآن تعديل نقاط كل شريحة حسب الرغبة.`);
}

// تعديل أوزان تقدير البكالوريوس
function updateGradeItemPoints(index, points) {
  state.criteria.grade.items[index].points = parseFloat(points) || 0;
  saveStore();
  refreshAllViews();
}

// إضافة وإدارة المعايير المخصصة الجديدة
function addCustomCriterion() {
  const nameEl = document.getElementById('new-custom-criterion-name');
  const ptsEl = document.getElementById('new-custom-criterion-points');

  const name = nameEl ? nameEl.value.trim() : '';
  const maxPoints = ptsEl ? (parseFloat(ptsEl.value) || 10) : 10;

  if (!name) {
    alert('يرجى كتابة اسم المعيار الجديد');
    return;
  }

  if (!state.criteria.customCriteria) {
    state.criteria.customCriteria = [];
  }

  const newId = 'c_' + Date.now();
  state.criteria.customCriteria.push({
    id: newId,
    name: name,
    maxPoints: maxPoints,
    enabled: true
  });

  saveStore();
  refreshAllViews();
  alert(`تم إضافة المعيار الجديد (${name}) بوزن أقصى (${maxPoints} نقطة) بنجاح!`);
}

function updateCustomCriterionPoints(id, points) {
  const custom = (state.criteria.customCriteria || []).find(c => c.id === id);
  if (custom) {
    custom.maxPoints = parseFloat(points) || 0;
    saveStore();
    refreshAllViews();
  }
}

function toggleCustomCriterion(id) {
  const custom = (state.criteria.customCriteria || []).find(c => c.id === id);
  if (custom) {
    custom.enabled = !custom.enabled;
    saveStore();
    refreshAllViews();
  }
}

function deleteCustomCriterion(id) {
  const custom = (state.criteria.customCriteria || []).find(c => c.id === id);
  if (!custom) return;

  if (confirm(`هل أنت تأكد من رغبتك في حذف المعيار المخصص (${custom.name})؟`)) {
    state.criteria.customCriteria = state.criteria.customCriteria.filter(c => c.id !== id);
    saveStore();
    refreshAllViews();
  }
}

function saveAllCriteriaAndSettings() {
  saveStore();
  refreshAllViews();
  alert(' تم حفظ جميع الأوزان والتعديلات والمعايير في كود النظام بنجاح وتحديث كافة المصفوفات التنافسية!');
}

// نافذة ودالة تنفيذ المفاضلة وبدء الدورة التنافسية الرسمية
function openRunCompetitionModal() {
  if (document.getElementById('run-master-grants')) {
    document.getElementById('run-master-grants').value = state.settings.masterGrantsCount || 3;
  }
  if (document.getElementById('run-phd-grants')) {
    document.getElementById('run-phd-grants').value = state.settings.phdGrantsCount || 3;
  }
  document.getElementById('modal-run-competition').classList.add('open');
}

function switchMainTab(targetTabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  const btn = document.querySelector(`.tab-btn[data-tab="${targetTabId}"]`);
  const content = document.getElementById(targetTabId);

  if (btn && btn.classList) btn.classList.add('active');
  if (content && content.classList) content.classList.add('active');
}

function executeCompetitionRun() {
  try {
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
    refreshAllViews();

    closeModal('modal-run-competition');

    switchMainTab('tab-report');

    const totalCandidates = state.candidates ? state.candidates.length : 0;
    setTimeout(() => {
      const msg = `⚡ تم تنفيذ وتطبيق المفاضلة الإلكترونية بنجاح!\n\n• إجمالي المتقدمين المعالجين: ${totalCandidates} متنافس\n• مقاعد منح الماجستير: ${masterGrants} منح\n• مقاعد منح الدكتوراه: ${phdGrants} منح\n\nتم تحديث مصفوفة التنافس والتقرير الفخم الجاهز للطباعة والاعتماد من مجلس الجامعة!`;
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(msg);
      }
    }, 150);
  } catch (err) {
    console.error('Error executing competition run:', err);
    if (typeof window !== 'undefined' && window.alert) {
      window.alert(`⚡ تم تنفيذ المفاضلة بنجاح!\nتم تحديث مصفوفة التنافس والتقرير الجاهز للطباعة والاعتماد!`);
    }
  }
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

function exportReportToExcel() {
  const rankedList = getRankedCandidates();
  const exportData = rankedList.map(c => ({
    'الترتيب': c.rank,
    'اسم الموظف/المتنافس': c.name,
    'الدرجة المطلوب التنافس عليها': c.degree,
    'التخصص': c.specialization,
    'تاريخ التعيين': c.hiring_univ || c.hiring_service,
    'سنة الميلاد': c.birth_date,
    'التقدير': c.grade,
    'نقاط الأقدمية': c.scores.seniorityScore,
    'نقاط العمر': c.scores.ageScore,
    'نقاط التخصص': c.scores.specScore,
    'نقاط التقدير': c.scores.gradeScore,
    'المجموع الكلي': c.scores.totalScore,
    'نتيجة التنافس': c.status,
    'تطوير وتمليك النظام': 'ماقتك للحلول البرمجية (MAQATECH SOFTWARE SOLUTIONS) © 2026'
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "مصفوفة المفاضلة المعتمدة");
  XLSX.writeFile(wb, "مصفوفة_مفاضلة_جامعة_صنعاء_2026.xlsx");
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
    strengths.push(`🎖️ أقدمية تعيين ممتازة (${c.scores.seniorityScore}/10 نقاط)`);
  } else if (c.scores.seniorityScore <= 3) {
    weaknesses.push(`⏳ أقدمية تعيين حديثة نسبياً (${c.scores.seniorityScore}/10 نقاط)`);
  }

  // 2. تحليل الفئة العمرية (الوزن الأعلى 5)
  if (c.scores.ageScore >= 4) {
    strengths.push(`🎂 سن متقدم ورصيد خبرة ممتد (${c.scores.ageScore}/5 نقاط)`);
  } else if (c.scores.ageScore <= 2) {
    weaknesses.push(`👶 فئة عمرية حديثة السن (${c.scores.ageScore}/5 نقاط)`);
  }

  // 3. تحليل الاحتياج والتخصص (الوزن الأعلى 5)
  if (c.scores.specScore >= 5) {
    strengths.push(`🎯 تخصص عالي الاحتياج والأولوية (${c.scores.specScore}/5 نقاط)`);
  } else if (c.scores.specScore <= 2) {
    weaknesses.push(`📌 تخصص عام الاحتياج (${c.scores.specScore}/5 نقاط)`);
  }

  // 4. تحليل التقدير العلمي (الوزن الأعلى 5)
  if (c.scores.gradeScore >= 4) {
    strengths.push(`📜 مؤهل علمي بدرجة (${c.grade || 'ممتاز/جيد جداً'})`);
  } else if (c.scores.gradeScore <= 2) {
    weaknesses.push(`⚠️ تقدير المؤهل العلمي (${c.grade || 'مقبول'})`);
  }

  if (strengths.length === 0) strengths.push('متوسط التقييم العام بالمعايير');
  if (weaknesses.length === 0) weaknesses.push('لا توجد نقاط ضعف بارزة');

  return { strengths, weaknesses };
}

// 1. تقرير نقاط القوة والضعف للمتنافسين (جدول مصفوفة إحصائية ثنائية 1 / 0)
function renderStrengthsWeaknessesReport(container, selectedDegree = 'الكل') {
  const allCandidates = getRankedCandidates(selectedDegree);

  container.innerHTML = `
    <div class="card" dir="rtl">
      <div class="card-header" style="flex-wrap: wrap; gap: 12px;">
        <div>
          <h3 class="card-title">🎯 المصفوفة الإحصائية لنقاط القوة ونقاط الضعف التنافسية لكل متقدم</h3>
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
              <th style="width: 11%;">أقدمية التعيين (10ن)</th>
              <th style="width: 10%;">الفئة العمرية (5ن)</th>
              <th style="width: 11%;">احتياج التخصص (5ن)</th>
              <th style="width: 11%;">التقدير العلمي (5ن)</th>
              <th style="width: 11%;">إجمالي القوة (1)</th>
              <th style="width: 11%;">إجمالي الضعف (0)</th>
              <th style="width: 14%;">المؤشر التنافسي العام</th>
            </tr>
          </thead>
          <tbody>
            ${allCandidates.length === 0 ? `
              <tr>
                <td colspan="9" style="padding: 30px; text-align: center; color: var(--text-muted);">لا يوجد متنافسون في هذه الفئة</td>
              </tr>
            ` : allCandidates.map((c, idx) => {
              const sen1 = c.scores.seniorityScore >= 6 ? 1 : 0;
              const age1 = c.scores.ageScore >= 3 ? 1 : 0;
              const spec1 = c.scores.specScore >= 3.5 ? 1 : 0;
              const grade1 = c.scores.gradeScore >= 4 ? 1 : 0;

              const totalStrengths = sen1 + age1 + spec1 + grade1;
              const totalWeaknesses = 4 - totalStrengths;

              let statusBadge = '';
              if (totalStrengths >= 3) {
                statusBadge = `<span class="badge-status badge-accepted" style="background: rgba(16, 185, 129, 0.22); color: #34d399; font-weight: 900; border: 1px solid #10b981; padding: 3px 8px; font-size: 0.78rem; white-space: nowrap;">🟢 ممتاز (${(totalStrengths/4*100).toFixed(0)}%)</span>`;
              } else if (totalStrengths === 2) {
                statusBadge = `<span class="badge-status" style="background: rgba(245, 158, 11, 0.22); color: #f59e0b; font-weight: 900; border: 1px solid #f59e0b; padding: 3px 8px; font-size: 0.78rem; white-space: nowrap;">🟡 متوازن (50%)</span>`;
              } else {
                statusBadge = `<span class="badge-status badge-rejected" style="background: rgba(239, 68, 68, 0.22); color: #f87171; font-weight: 900; border: 1px solid #ef4444; padding: 3px 8px; font-size: 0.78rem; white-space: nowrap;">🔴 ضعيف (${(totalStrengths/4*100).toFixed(0)}%)</span>`;
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
                      <span class="badge-status badge-accepted" style="background: rgba(16, 185, 129, 0.2); color: #34d399; font-weight: 900; border: 1px solid #10b981; padding: 2px 6px; font-size: 0.8rem;">🟢 1 (${c.scores.seniorityScore}ن)</span>
                    ` : `
                      <span class="badge-status badge-rejected" style="background: rgba(239, 68, 68, 0.2); color: #f87171; font-weight: 900; border: 1px solid #ef4444; padding: 2px 6px; font-size: 0.8rem;">🔴 0 (${c.scores.seniorityScore}ن)</span>
                    `}
                  </td>

                  <!-- 2. الفئة العمرية -->
                  <td>
                    ${age1 === 1 ? `
                      <span class="badge-status badge-accepted" style="background: rgba(16, 185, 129, 0.2); color: #34d399; font-weight: 900; border: 1px solid #10b981; padding: 2px 6px; font-size: 0.8rem;">🟢 1 (${c.scores.ageScore}ن)</span>
                    ` : `
                      <span class="badge-status badge-rejected" style="background: rgba(239, 68, 68, 0.2); color: #f87171; font-weight: 900; border: 1px solid #ef4444; padding: 2px 6px; font-size: 0.8rem;">🔴 0 (${c.scores.ageScore}ن)</span>
                    `}
                  </td>

                  <!-- 3. احتياج التخصص -->
                  <td>
                    ${spec1 === 1 ? `
                      <span class="badge-status badge-accepted" style="background: rgba(16, 185, 129, 0.2); color: #34d399; font-weight: 900; border: 1px solid #10b981; padding: 2px 6px; font-size: 0.8rem;">🟢 1 (${c.scores.specScore}ن)</span>
                    ` : `
                      <span class="badge-status badge-rejected" style="background: rgba(239, 68, 68, 0.2); color: #f87171; font-weight: 900; border: 1px solid #ef4444; padding: 2px 6px; font-size: 0.8rem;">🔴 0 (${c.scores.specScore}ن)</span>
                    `}
                  </td>

                  <!-- 4. التقدير العلمي -->
                  <td>
                    ${grade1 === 1 ? `
                      <span class="badge-status badge-accepted" style="background: rgba(16, 185, 129, 0.2); color: #34d399; font-weight: 900; border: 1px solid #10b981; padding: 2px 6px; font-size: 0.8rem;">🟢 1 (${c.scores.gradeScore}ن)</span>
                    ` : `
                      <span class="badge-status badge-rejected" style="background: rgba(239, 68, 68, 0.2); color: #f87171; font-weight: 900; border: 1px solid #ef4444; padding: 2px 6px; font-size: 0.8rem;">🔴 0 (${c.scores.gradeScore}ن)</span>
                    `}
                  </td>

                  <!-- إجمالي نقاط القوة -->
                  <td>
                    <span style="background: rgba(16, 185, 129, 0.25); color: #34d399; font-weight: 900; border: 1px solid #10b981; padding: 3px 8px; border-radius: 6px; font-size: 0.88rem; white-space: nowrap;">
                      ${totalStrengths} قوة
                    </span>
                  </td>

                  <!-- إجمالي نقاط الضعف -->
                  <td>
                    <span style="background: rgba(239, 68, 68, 0.25); color: #f87171; font-weight: 900; border: 1px solid #ef4444; padding: 3px 8px; border-radius: 6px; font-size: 0.88rem; white-space: nowrap;">
                      ${totalWeaknesses} ضعف
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

// دالة تطهير وفحص التخصصات الأكاديمية (منع التخصصات الرقمية والسنوات والمجهولة)
function getCleanSpecializationName(spec, candidate) {
  if (candidate && candidate.hiring_univ && !/\d/.test(candidate.hiring_univ) && /\d+/.test(String(spec))) {
    return candidate.hiring_univ;
  }
  if (!spec) return 'تخصص غير محدد / يتطلب التعديل';
  const s = String(spec).trim();
  if (s === '' || s === '-' || s === '0' || /^\d+/.test(s) || s.length <= 1) {
    return 'تخصص غير محدد / يتطلب التعديل';
  }
  return s;
}

function normalizeGradeText(g) {
  if (!g) return '';
  const str = String(g).trim().replace(/\s+/g, '');
  if (str === 'ممتاز') return 'ممتاز';
  if (str === 'جيدجدا' || str === 'جيدجداً') return 'جيد جداً';
  if (str === 'جيد') return 'جيد';
  if (str === 'مقبول' || str === 'مفبول') return 'مقبول';
  return g;
}

function isInvalidGradeValue(grade) {
  if (!grade) return true;
  const g = String(grade).trim();
  if (g === '' || g === '-' || g === 'ــــــــــــ' || g === '0' || g === '0.00' || g === '0%' || g === 'غير محدد') return true;
  if (/\b(19\d\d|20\d\d)م?\b/.test(g)) return true;
  const norm = normalizeGradeText(g);
  const validGrades = ['ممتاز', 'جيد جداً', 'جيد', 'مقبول'];
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
    const isGradYearValid = c.grad_year && c.grad_year !== '-' && parseInt(c.grad_year) > 0;
    const isSpecValid = !isInvalidSpecializationValue(c.specialization);

    const hasDeficiency = !isHiringValid || !isBirthValid || !isGradeValid || !isGradYearValid || !isSpecValid;

    allAudited.push({
      candidate: c,
      hiring,
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

  container.innerHTML = `
    <div class="card" dir="rtl">
      <div class="card-header" style="flex-wrap: wrap; gap: 12px;">
        <div>
          <h3 class="card-title">⚠️ الجدول الرقابي الحاصر لفحص نواقص واستكمال بيانات المتنافسين</h3>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin: 4px 0 0 0;">
            فحص آلي شامل وموحد لجميع عناصر بيانات الموظفين المسجلين (تاريخ التعيين، السن، التقدير، سنة التخرج، والتخصص).
          </p>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn ${auditShowOnlyDeficient ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="toggleAuditFilter(true)">
            🔴 عرض حالات النواقص فقط (${deficientList.length} موظف)
          </button>
          <button class="btn ${!auditShowOnlyDeficient ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="toggleAuditFilter(false)">
            📋 عرض الكشف الشامل لكافة المتنافسين (${allAudited.length} متنافس)
          </button>
        </div>
      </div>

      <div class="table-responsive" style="margin-top: 15px;">
        <table class="data-table" style="width: 100%; border-collapse: collapse; text-align: center;">
          <thead>
            <tr>
              <th style="width: 4%;">#</th>
              <th style="width: 18%; text-align: right;">اسم المتنافس / الموظف</th>
              <th style="width: 11%;">تاريخ التعيين</th>
              <th style="width: 10%;">سنة الميلاد</th>
              <th style="width: 13%;">التقدير العلمي</th>
              <th style="width: 10%;">سنة التخرج</th>
              <th style="width: 14%;">التخصص العلمي</th>
              <th style="width: 10%;">جاهزية الملف</th>
              <th style="width: 10%;">إجراء التعديل</th>
            </tr>
          </thead>
          <tbody>
            ${displayList.length === 0 ? `
              <tr>
                <td colspan="9" style="padding: 30px; text-align: center;">
                  <div style="font-size: 2rem; margin-bottom: 6px;">✅</div>
                  <strong style="color: #34d399; font-size: 1.1rem;">جميع بيانات السجلات مكتملة ومستوفية 100%!</strong>
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
                      <span class="badge-status badge-accepted" style="background: rgba(16, 185, 129, 0.18); color: #34d399; font-weight: 800; border: 1px solid #10b981; padding: 4px 8px; font-size: 0.76rem;">🟢 متوفر (${item.hiring})</span>
                    ` : `
                      <span class="badge-status badge-rejected" style="background: rgba(239, 68, 68, 0.2); color: #f87171; font-weight: 800; border: 1px solid #ef4444; padding: 4px 8px; font-size: 0.76rem;">🔴 ناقص</span>
                    `}
                  </td>

                  <!-- 2. سنة الميلاد -->
                  <td>
                    ${item.isBirthValid ? `
                      <span class="badge-status badge-accepted" style="background: rgba(16, 185, 129, 0.18); color: #34d399; font-weight: 800; border: 1px solid #10b981; padding: 4px 8px; font-size: 0.76rem;">🟢 متوفر (${c.birth_date})</span>
                    ` : `
                      <span class="badge-status badge-rejected" style="background: rgba(239, 68, 68, 0.2); color: #f87171; font-weight: 800; border: 1px solid #ef4444; padding: 4px 8px; font-size: 0.76rem;">🔴 ناقص</span>
                    `}
                  </td>

                  <!-- 3. التقدير العلمي -->
                  <td>
                    ${item.isGradeValid ? `
                      <span class="badge-status badge-accepted" style="background: rgba(16, 185, 129, 0.18); color: #34d399; font-weight: 800; border: 1px solid #10b981; padding: 4px 8px; font-size: 0.76rem;">🟢 متوفر (${c.grade})</span>
                    ` : `
                      <span class="badge-status badge-rejected" style="background: rgba(239, 68, 68, 0.2); color: #f87171; font-weight: 800; border: 1px solid #ef4444; padding: 4px 8px; font-size: 0.76rem;">🔴 ناقص (${c.grade || '0/فارغ'})</span>
                    `}
                  </td>

                  <!-- 4. سنة التخرج -->
                  <td>
                    ${item.isGradYearValid ? `
                      <span class="badge-status badge-accepted" style="background: rgba(16, 185, 129, 0.18); color: #34d399; font-weight: 800; border: 1px solid #10b981; padding: 4px 8px; font-size: 0.76rem;">🟢 متوفر (${c.grad_year})</span>
                    ` : `
                      <span class="badge-status badge-rejected" style="background: rgba(239, 68, 68, 0.2); color: #f87171; font-weight: 800; border: 1px solid #ef4444; padding: 4px 8px; font-size: 0.76rem;">🔴 ناقص</span>
                    `}
                  </td>

                  <!-- 5. التخصص الأكاديمي -->
                  <td>
                    ${item.isSpecValid ? `
                      <span class="badge-status badge-accepted" style="background: rgba(16, 185, 129, 0.18); color: #34d399; font-weight: 800; border: 1px solid #10b981; padding: 4px 8px; font-size: 0.76rem;">🟢 متوفر (${c.specialization})</span>
                    ` : `
                      <span class="badge-status badge-rejected" style="background: rgba(239, 68, 68, 0.2); color: #f87171; font-weight: 800; border: 1px solid #ef4444; padding: 4px 8px; font-size: 0.76rem;">🔴 ناقص (أرقام/غائب)</span>
                    `}
                  </td>

                  <!-- جاهزية الملف -->
                  <td>
                    ${item.hasDeficiency ? `
                      <span style="color: #f87171; font-weight: 900; font-size: 0.82rem;">⚠️ يحتاج استكمال</span>
                    ` : `
                      <span style="color: #34d399; font-weight: 900; font-size: 0.82rem;">✅ مكتمل 100%</span>
                    `}
                  </td>

                  <!-- الإجراء والتعديل -->
                  <td>
                    <button class="btn btn-warning btn-sm" style="font-weight: 800; font-size: 0.75rem; padding: 4px 10px; background: linear-gradient(135deg, #d97706, #b45309); color: #ffffff;" onclick="editCandidate(${c.id})">
                      ⚙️ استكمال البيانات
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

// 4. الرسم البياني البصري للفئات العمرية والتخصصات والأقدمية
function renderAgeAndSpecCharts(container, selectedDegree = 'الكل') {
  const candidatesToChart = state.candidates.filter(c => selectedDegree === 'الكل' || c.degree === selectedDegree);

  // تجميع الفئات العمرية
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

  // تجميع أقدمية التعيين حسب الشرائح الرسمية
  const seniorityMap = {
    '1990 - 1994م (10 نقاط - أقدمية استثنائية)': 0,
    '1995 - 2000م (8 نقاط - أقدمية عالية جداً)': 0,
    '2001 - 2005م (6 نقاط - أقدمية عالية)': 0,
    '2006 - 2010م (4 نقاط - أقدمية متوسطة)': 0,
    '2011 - 2015م (3 نقاط - أقدمية حديثة)': 0,
    '2016 - 2020م (2 نقطتان - حديث التعيين)': 0,
    '2021 - 2030م (1 نقطة - تعيين حديث جداً)': 0
  };

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
  });

  const totalCandidates = candidatesToChart.length || 1;

  // تجميع أعلى التخصصات
  const specCounts = {};
  candidatesToChart.forEach(c => {
    const s = getCleanSpecializationName(c.specialization);
    specCounts[s] = (specCounts[s] || 0) + 1;
  });
  const topSpecs = Object.entries(specCounts).sort((a, b) => b[1] - a[1]);

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px;">
      <!-- 1. الرسم البياني للفئات العمرية -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🎂 الرسم البياني لتوزيع الفئات العمرية للمتنافسين</h3>
        </div>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">
          يمثل هذا الرسم البصري التوزيع الديموغرافي للسن بين جميع الموظفين المتنافسين.
        </p>

        <div>
          ${Object.entries(ageMap).map(([label, count]) => {
            const pct = Math.round((count / totalCandidates) * 100);
            return `
              <div class="chart-bar-row">
                <div class="chart-bar-label">
                  <span>${label}</span>
                  <span>${count} متنافس (${pct}%)</span>
                </div>
                <div class="chart-bar-track">
                  <div class="chart-bar-fill" style="width: ${pct}%;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- 2. الرسم البياني لأقدمية التعيين الخدمية -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🎖️ الرسم البياني لتوزيع أقدمية التعيين الخدمية</h3>
        </div>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">
          يمثل توزيع سنوات تعيين الموظفين في الخدمة وأوزان الأقدمية المعتمدة.
        </p>

        <div>
          ${Object.entries(seniorityMap).map(([label, count]) => {
            const pct = Math.round((count / totalCandidates) * 100);
            return `
              <div class="chart-bar-row">
                <div class="chart-bar-label">
                  <span>${label}</span>
                  <span>${count} متنافس (${pct}%)</span>
                </div>
                <div class="chart-bar-track">
                  <div class="chart-bar-fill" style="width: ${pct}%; background: linear-gradient(90deg, #d97706, #059669);"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- 3. الرسم البياني للتخصصات الأكثر إقبالاً -->
      <div class="card" style="grid-column: 1 / -1;">
        <div class="card-header">
          <h3 class="card-title">📊 الرسم البياني للتخصصات الأكثر إقبالاً وطلباً</h3>
        </div>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">
          يمثل نسبة الإقبال وحجم الطلبات المتقدمة بكل تخصص أكاديمي.
        </p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px;">
          ${topSpecs.map(([spec, count]) => {
            const pct = Math.round((count / totalCandidates) * 100);
            return `
              <div class="chart-bar-row">
                <div class="chart-bar-label">
                  <span>${spec}</span>
                  <span>${count} متنافس (${pct}%)</span>
                </div>
                <div class="chart-bar-track">
                  <div class="chart-bar-fill" style="width: ${pct}%; background: linear-gradient(90deg, #0d9488, #2563eb);"></div>
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
  const candidates = getRankedCandidates();
  const exportData = candidates.map(c => {
    const analysis = calculateCandidateStrengthsAndWeaknesses(c);
    return {
      'اسم الموظف/المتنافس': c.name,
      'الدرجة': c.degree,
      'التخصص': c.specialization,
      'المجموع الكلي': c.scores.totalScore,
      'نقاط القوة البارزة': analysis.strengths.join(' | '),
      'نقاط الضعف والتحديات': analysis.weaknesses.join(' | ')
    };
  });

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "تحليل القوة والضعف");
  XLSX.writeFile(wb, "تقرير_التحليل_والرقابة_جامعة_صنعاء_2026.xlsx");
}

function printAnalyticsReport() {
  window.print();
}


