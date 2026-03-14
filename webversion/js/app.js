// Main App Controller - StudentPro Web V4
let app;

document.addEventListener('DOMContentLoaded', () => {
    // Inject toast container into DOM
    const toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);

    app = new StudentProApp();
    window.app = app;
});

class StudentProApp {
    constructor() {
        this.currentTab = 'dashboard';
        this.activeSemesterId = null;
        this.activeSubjectId = null;
        this.timer = null;
        this.timeLeft = 25 * 60;
        this.timerRunning = false;
        this.selectedLang = 'English';
        this.isOnline = navigator.onLine;

        this.init();
    }

    init() {
        console.log("[App] Initializing application...");
        this.initCapacitor();
        this.loadLanguagePreference();
        console.log(`[App] Current Language: ${this.selectedLang}`);
        this.applyLoginScreenLanguage();

        const loginLangSelect = document.getElementById('login-lang-select');
        if (loginLangSelect) {
            loginLangSelect.value = this.selectedLang;
            loginLangSelect.addEventListener('change', (e) => {
                this.selectedLang = e.target.value;
                console.log(`[App] Language changed to: ${this.selectedLang}`);
                localStorage.setItem('studentpro_lang', this.selectedLang);
                this.applyLoginScreenLanguage();

                if (db && db.data && db.data.settings) {
                    db.data.settings.lang = this.selectedLang;
                    db.save();
                }
                this.refreshAll();
            });
        }

        window.addEventListener('online', () => {
            console.log("[App] System is ONLINE");
            this.onConnectionRestored();
        });
        window.addEventListener('offline', () => {
            console.log("[App] System is OFFLINE");
            this.showOfflineIndicator();
        });

        this.setupEventListeners();
        if (typeof this.initPomodoro === 'function') this.initPomodoro();
        this.refreshDate();
        this.initCharts();
    }

    async initCapacitor() {
        if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()) {
            console.log("[App] Capacitor detected, initializing native features...");
            try {
                const { StatusBar, SplashScreen } = Capacitor.Plugins;
                if (StatusBar) {
                    StatusBar.setBackgroundColor({ color: '#5b5fc7' });
                }
                if (SplashScreen) {
                    SplashScreen.hide();
                }
            } catch (e) { console.warn("[App] Capacitor Plugin init error:", e); }
        }
    }

    loadLanguagePreference() {
        const savedLang = localStorage.getItem('studentpro_lang');
        if (savedLang && TRANSLATIONS[savedLang]) {
            this.selectedLang = savedLang;
        } else if (db && db.data && db.data.settings && db.data.settings.lang) {
            this.selectedLang = db.data.settings.lang;
        }
    }

    applyLoginScreenLanguage() {
        this.updateLanguage();
    }

    updateLanguage() {
        console.log(`[App] Translating UI to: ${this.selectedLang}`);
        const T = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];

        // Helper: set textContent or placeholder
        const t = (id, key, attr) => {
            const el = get(id);
            if (!el || !T[key]) return;
            if (attr === 'placeholder' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = T[key];
            } else {
                el.textContent = T[key];
            }
        };

        // ── 1. LOGIN SCREEN ──────────────────────────────────
        t('login-title',        'login_title');
        t('login-desc',         'login_desc');
        t('login-email',        'login_email_placeholder');
        t('login-password',     'login_password_placeholder');
        t('do-login-btn',       'login_btn');
        t('do-signup-btn',      'signup_btn');
        t('tab-login',          'tab_login');
        t('tab-signup',         'tab_signup');
        t('work-offline-btn',   'work_offline');

        // ── 2. SIDEBAR NAV ───────────────────────────────────
        const navMap = { dashboard:'dashboard', planner:'planner', pomodoro:'pomodoro', analytics:'analytics', leaderboard:'leaderboard', settings:'settings' };
        document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
            const key  = navMap[btn.dataset.tab];
            const span = btn.querySelector('.nav-text');
            if (span && key && T[key]) span.textContent = T[key];
        });
        const logoutSpan = get('logout-btn')?.querySelector('.nav-text');
        if (logoutSpan && T.logout) logoutSpan.textContent = T.logout;

        // ── 3. DASHBOARD ─────────────────────────────────────
        t('dash-progress-label', 'overall_progress');
        t('dash-exam-label',     'next_exam');
        t('dash-streak-label',   'streak');
        t('up-next-label',       'up_next');

        const welcomeEl = get('db-welcome-text');
        if (welcomeEl) welcomeEl.textContent = T.welcome_back || 'Welcome back,';

        const ctaSpan = document.querySelector('.db-cta-btn span');
        if (ctaSpan) ctaSpan.textContent = T.start_focus || 'Start Focus';

        const streakSub = get('db-streak-sub');
        if (streakSub) streakSub.textContent = T.current_consistency || 'days in a row';

        const sessionsLabel = get('db-sessions-label');
        if (sessionsLabel) sessionsLabel.textContent = T.sessions || 'Sessions';

        const sessionsSub = get('db-sessions-sub');
        if (sessionsSub) sessionsSub.textContent = T.sessions_completed || 'pomodoros done';

        const dailyGoalLabel = get('db-daily-goal-label');
        if (dailyGoalLabel) dailyGoalLabel.textContent = T.daily_goal || 'Daily Goal';

        const tasksLabel = get('db-tasks-label');
        if (tasksLabel) tasksLabel.textContent = T.tasks_label || T.tasks_completed || 'tasks';

        const weekTitle = get('db-week-title');
        if (weekTitle) weekTitle.textContent = T.this_week || 'This Week';

        // ── 4. PLANNER ───────────────────────────────────────
        t('subject-name-input',     'subject_name');
        t('exam-date-input',        'exam_date');
        t('cancel-add-subject-btn', 'cancel');

        const addToggleSpan = document.querySelector('.add-subject-toggle span:last-child');
        if (addToggleSpan) addToggleSpan.textContent = T.add_subject || 'Add Subject';

        const saveSubjBtn = get('save-subject-btn');
        if (saveSubjBtn) saveSubjBtn.innerHTML = `<i class="fas fa-check"></i> ${T.add || '+'}`;

        const newSemBtn = get('add-semester-btn');
        if (newSemBtn) newSemBtn.innerHTML = `<i class="fas fa-plus"></i> ${T.new_semester || 'New Semester'}`;

        const delSemBtn = get('delete-semester-btn');
        if (delSemBtn) delSemBtn.innerHTML = `<i class="fas fa-trash-alt"></i> ${T.delete_semester || 'Delete Semester'}`;

        const plannerEmptySpan = document.querySelector('#planner-empty span');
        if (plannerEmptySpan) plannerEmptySpan.textContent = T.add_subject_hint || (T.add_subject || 'Add Subject');

        const typeInput = get('subject-type-input');
        if (typeInput && typeInput.options.length >= 2) {
            typeInput.options[0].textContent = T.with_exercises || 'Has Exercises';
            typeInput.options[1].textContent = T.course_only    || 'Course Only';
        }

        const semSel = get('semester-selector');
        if (semSel && semSel.options.length > 0 && semSel.options[0].value === '') {
            semSel.options[0].textContent = T.select_semester || '-- Select Semester --';
        }

        t('semester-name-input', 'semester_name');
        const semModalTitle = document.querySelector('#add-semester-modal .h2');
        if (semModalTitle) semModalTitle.textContent = T.new_semester || 'New Semester';
        const saveSemBtn = get('save-semester-modal-btn');
        if (saveSemBtn) saveSemBtn.textContent = T.save || 'Save';
        const closeSemBtn = get('close-semester-modal');
        if (closeSemBtn) closeSemBtn.textContent = T.cancel || 'Cancel';

        // ── 5. ANALYTICS ─────────────────────────────────────
        const anCards = document.querySelectorAll('.an-card-title');
        const anTitles = [
            T.subject_progress  || 'Subject Progress',
            T.weekly_sessions   || 'Weekly Sessions',
            T.exam_countdown    || 'Exam Countdown',
            T.time_per_subject  || 'Time per Subject'
        ];
        anCards.forEach((el, i) => { if (anTitles[i]) el.textContent = anTitles[i]; });

        const anHeader = document.querySelector('#analytics .h1');
        if (anHeader) anHeader.textContent = T.analytics || 'Analytics';

        // ── 6. POMODORO ──────────────────────────────────────
        t('timer-status',     'focus_time');
        t('smart-suggestion', 'smart_suggestion');
        const subjectSel = get('active-subject-selector');
        if (subjectSel?.options.length > 0) subjectSel.options[0].textContent = T.select_subject || 'Select Subject';

        const timerStartBtn = get('timer-start');
        if (timerStartBtn && !timerStartBtn.classList.contains('running')) {
            timerStartBtn.innerHTML = `<i class="fas fa-play"></i> ${T.start_focus || 'Start Focus'}`;
        }

        // ── 7. SETTINGS ─────────────────────────────────────
        t('lang-select-label',      'language');
        t('theme-label',            'theme');
        t('sync-mode-label',        'sync_mode');

        const settingsTitleHeader = get('settings-title');
        if (settingsTitleHeader) settingsTitleHeader.textContent = T.settings_title || T.settings || 'Settings';
        const accProfileTitle = get('acc-profile-title');
        if (accProfileTitle) accProfileTitle.textContent = '👤 ' + (T.acc_profile_title || T.account_profile || 'Account Profile');
        const generalTitle = get('general-settings-title');
        if (generalTitle) generalTitle.textContent = '⚙️ ' + (T.general_title || T.general || 'General');
        const dangerTitle = get('danger-zone-title');
        if (dangerTitle) dangerTitle.textContent = '⚠️ ' + (T.danger_zone_title || T.danger_zone || 'Danger Zone');
        const dangerDesc = get('danger-zone-desc');
        if (dangerDesc) dangerDesc.textContent = T.danger_zone_desc || 'This will permanently delete all your study data.';
        const resetBtnText = get('reset-btn-text');
        if (resetBtnText) resetBtnText.textContent = T.reset_all_data || 'Reset All Data';

        t('acc-name-label',     'name');
        t('acc-email-label',    'email');
        t('acc-progress-label', 'progress');

        const uploadText = get('upload-btn-text');
        if (uploadText) uploadText.textContent = T.upload_btn || T.upload || 'Upload';
        const downloadText = get('download-btn-text');
        if (downloadText) downloadText.textContent = T.download_btn || T.download || 'Download';

        const themeOptLight = get('theme-opt-light');
        if (themeOptLight) themeOptLight.textContent = T.light_theme || '☀️ Light';
        const themeOptDark = get('theme-opt-dark');
        if (themeOptDark) themeOptDark.textContent = T.dark_theme || '🌙 Dark';

        const syncOptAuto = get('sync-opt-auto');
        if (syncOptAuto) syncOptAuto.textContent = T.sync_auto || T.automatic || 'Automatic';
        const syncOptManual = get('sync-opt-manual');
        if (syncOptManual) syncOptManual.textContent = T.sync_manual || T.manual || 'Manual';

        // ── 7b. LEADERBOARD ──────────────────────────────────
        const lbTitleHeader = get('leaderboard-title');
        if (lbTitleHeader) lbTitleHeader.textContent = T.leaderboard || 'Leaderboard';
        const lbThRank = get('lb-th-rank');
        if (lbThRank) lbThRank.textContent = T.lb_rank || T.rank || 'Rank';
        const lbThStudent = get('lb-th-student');
        if (lbThStudent) lbThStudent.textContent = T.lb_student || T.student_label || 'Student';
        const lbThLevel = get('lb-th-level');
        if (lbThLevel) lbThLevel.textContent = T.lb_level || T.level_label || 'Level';
        const lbThSessions = get('lb-th-sessions');
        if (lbThSessions) lbThSessions.textContent = T.lb_sessions || T.sessions || 'Sessions';
        const lbSegDaily = get('lb-seg-daily');
        if (lbSegDaily) lbSegDaily.textContent = T.lb_daily || 'Daily';
        const lbSegWeekly = get('lb-seg-weekly');
        if (lbSegWeekly) lbSegWeekly.textContent = T.lb_weekly || 'Weekly';
        const lbSegMonthly = get('lb-seg-monthly');
        if (lbSegMonthly) lbSegMonthly.textContent = T.lb_monthly || 'Monthly';
        const lbSegAll = get('lb-seg-alltime');
        if (lbSegAll) lbSegAll.textContent = T.lb_all_time || 'All Time';
        const lbSub = get('lb-subtitle');
        if (lbSub) lbSub.textContent = T.lb_ranked_by || 'Ranked by sessions, then XP';

        // ── 8. CHAPTER MANAGER MODAL ─────────────────────────
        t('sw-chapter-input', 'add_chapter_placeholder');
        const swModalTitle = document.querySelector('#subject-window-modal .modal-title');
        if (swModalTitle) swModalTitle.textContent = T.chapter_manager || 'Chapter Manager';

        // ── 9. LEADERBOARD ───────────────────────────────────
        const lbTitle = document.querySelector('#leaderboard .h1');
        if (lbTitle) lbTitle.textContent = T.leaderboard || 'Leaderboard';

        // ── 10. RTL / LTR ────────────────────────────────────
        const isRTL = this.selectedLang === 'Arabic';
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
        document.body.classList.toggle('rtl', isRTL);

        // Re-render dynamic sections so they pick up translated strings
        this.refreshDashboard();
        this.refreshSubjects();
        this.refreshAnalytics();
    }

    showOfflineIndicator() {
        this.isOnline = false;
        if (document.getElementById('offline-banner')) return;
        const banner = document.createElement('div');
        banner.id = 'offline-banner';
        banner.style.cssText = `
            position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
            background:#ef4444; color:white; padding:7px 18px;
            border-radius:99px; font-size:12px; font-weight:600; z-index:2000;
            box-shadow: 0 4px 12px rgba(239,68,68,0.4);
        `;
        banner.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline Mode';
        document.body.appendChild(banner);
    }

    onConnectionRestored() {
        this.isOnline = true;
        const banner = document.getElementById('offline-banner');
        if (banner) {
            banner.style.background = "#0ea5a0";
            banner.innerHTML = '<i class="fas fa-check-circle"></i> Back Online';
            setTimeout(() => banner.remove(), 3000);
        }
        db.syncPendingChanges();
    }

    async onLogin(user) {
        console.log(`[App] User session identified: ${user.email}`);
        document.getElementById('login-screen').classList.add('hidden');

        if (db.data && db.data.settings && db.data.settings.lang) {
            this.selectedLang = db.data.settings.lang;
        }

        this.applyTheme((db.data && db.data.settings && db.data.settings.theme) || 'Light');
        this.refreshAll();

        if (!navigator.onLine || user.id === 'offline-user') {
            this.loadSettings();
            this.refreshAll();
            return;
        }

        try {
            await db.syncPendingChanges();
            await db.syncFromCloud();
            this.refreshLastSync();
        } catch (e) { console.error("[App] Sync background process failed:", e); }

        this.loadSettings();
        this.refreshAll();

        setTimeout(() => {
            const needsOnboarding = (!db.data.user_profile || !db.data.user_profile.display_name || db.data.user_profile.display_name === 'Student') && db.data.semesters.length === 0;
            if (needsOnboarding) {
                this.showModal('welcome-modal');
            }
        }, 1500);
    }

    setupEventListeners() {
        console.log("[App] Setting up UI event listeners...");
        const get = id => document.getElementById(id);

        // Auth Tabs
        get('tab-login')?.addEventListener('click', () => {
            get('tab-login').classList.add('active');
            get('tab-signup').classList.remove('active');
            get('do-login-btn').classList.remove('hidden');
            get('do-signup-btn').classList.add('hidden');
        });
        get('tab-signup')?.addEventListener('click', () => {
            get('tab-signup').classList.add('active');
            get('tab-login').classList.remove('active');
            get('do-login-btn').classList.add('hidden');
            get('do-signup-btn').classList.remove('hidden');
        });

        // Login Form
        get('login-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = get('do-login-btn'), err = get('login-error');
            const email = get('login-email').value, pass = get('login-password').value;
            if (!email || !pass) return;
            btn.disabled = true;
            btn.textContent = '...';
            try {
                await auth.signIn(email, pass);
            } catch (e) {
                err.textContent = e.message;
                err.classList.remove('hidden');
            } finally {
                btn.disabled = false;
                const texts = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];
                btn.textContent = texts['login_btn'] || 'Login';
            }
        });

        get('do-signup-btn')?.addEventListener('click', async () => {
            const btn = get('do-signup-btn'), err = get('login-error');
            const email = get('login-email').value, pass = get('login-password').value;
            if (!email || !pass) return;
            btn.disabled = true;
            try {
                await auth.signUp(email, pass);
                showToast((TRANSLATIONS[this.selectedLang]||TRANSLATIONS["English"]).toast_signup_ok || "Account created! Check your email to confirm.", 'success', 5000);
                err.classList.add('hidden');
            } catch (e) {
                err.textContent = e.message;
                err.classList.remove('hidden');
            } finally { btn.disabled = false; }
        });

        get('toggle-password')?.addEventListener('click', () => {
            const input = get('login-password');
            const icon = get('toggle-password').querySelector('i');
            input.type = input.type === 'password' ? 'text' : 'password';
            if (icon) icon.className = input.type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
        });

        get('work-offline-btn')?.addEventListener('click', async () => {
            await auth.workOffline();
        });

        get('logout-btn')?.addEventListener('click', () => {
            auth.signOut();
        });

        get('mobile-logout-btn')?.addEventListener('click', () => {
            auth.signOut();
        });

        // Navigation
        document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.dataset.tab);
            });
        });

        // Leaderboard scope switching (daily/weekly/monthly/all-time)
        document.querySelectorAll('.lb-seg[data-period]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.leaderboardScope = btn.dataset.period;
                this.refreshLeaderboard();
            });
        });

        get('start-challenge-btn')?.addEventListener('click', () => {
            this.switchTab('pomodoro');
        });

        // Planner
        get('add-semester-btn')?.addEventListener('click', () => {
            this.showModal('add-semester-modal');
        });

        get('delete-semester-btn')?.addEventListener('click', async () => {
            if (!this.activeSemesterId) return;
            const T = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];
            const sem = db.data.semesters.find(s => s.id === this.activeSemesterId);
            const semName = sem?.name || '';

            const promptText = (T.confirm_delete_semester || "Delete this semester and all its subjects/chapters?")
                + (semName ? `\n\n${semName}` : '');
            if (!confirm(promptText)) return;

            const btn = get('delete-semester-btn');
            if (btn) btn.disabled = true;

            try {
                showToast(T.semester_deleting || "Deleting semester...", 'info', 2500);
                await db.deleteSemester(this.activeSemesterId);
                this.activeSemesterId = null;
                localStorage.removeItem('studentpro_active_semester');
                this.refreshPlanner();
                this.refreshAll();
                showToast(T.semester_deleted || "Semester deleted.", 'info');
            } catch (e) {
                console.error("[App] Delete semester failed:", e);
                showToast((T.sync_failed || "Delete failed") + ": " + (e?.message || e), 'error');
            } finally {
                if (btn) btn.disabled = !this.activeSemesterId;
            }
        });

        get('close-semester-modal')?.addEventListener('click', () => this.closeModal('add-semester-modal'));

        const semTemplateSel = get('semester-template-selector');
        const semSpecSel = get('semester-spec-selector');
        const semSpecCont = get('semester-spec-container');
        const semNameInput = get('semester-name-input');

        if (semTemplateSel) {
            semTemplateSel.addEventListener('change', (e) => {
                const year = e.target.value;
                const filtered = TEMPLATES.filter(t => t.year === year);
                if (filtered.length > 1) {
                    semSpecSel.innerHTML = '<option value="">-- Select Specialization --</option>';
                    filtered.forEach(t => {
                        const opt = document.createElement('option');
                        opt.value = t.name; opt.textContent = t.name;
                        semSpecSel.appendChild(opt);
                    });
                    semSpecCont.classList.remove('hidden');
                    if (semSpecSel) semSpecSel.value = '';
                } else {
                    semSpecCont.classList.add('hidden');
                    if (semSpecSel) semSpecSel.value = '';
                    if (year && filtered.length === 1 && semNameInput && !semNameInput.value.trim()) {
                        semNameInput.value = filtered[0].name;
                    }
                }
            });
        }

        semSpecSel?.addEventListener('change', (e) => {
            const specName = e.target.value;
            if (specName && semNameInput && !semNameInput.value.trim()) {
                semNameInput.value = specName;
            }
        });

        get('save-semester-modal-btn')?.addEventListener('click', async () => {
            let name = semNameInput?.value || '';
            const year = semTemplateSel?.value;
            const spec = semSpecSel?.value;

            if (!name || !name.trim()) {
                const templatesForYear = year ? TEMPLATES.filter(t => t.year === year) : [];
                const derivedName = (spec && spec.trim())
                    ? spec.trim()
                    : (templatesForYear.length === 1 ? templatesForYear[0].name : '');

                if (derivedName) {
                    name = derivedName;
                    if (semNameInput) semNameInput.value = derivedName;
                } else {
                    showToast((TRANSLATIONS[this.selectedLang]||TRANSLATIONS["English"]).toast_enter_semester || "Please enter a semester name.", 'warning');
                    return;
                }
            }

            showToast((TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"]).semester_creating || "Creating semester...", 'info', 2500);
            const id = await db.addSemester(name.trim());
            if (id && (year || spec)) {
                let template;
                if (spec) template = TEMPLATES.find(t => t.name === spec);
                else template = TEMPLATES.find(t => t.year === year);

                if (template) {
                    await this.applyTemplateToSemester(id, template);
                }
            }
            if (get('semester-name-input')) get('semester-name-input').value = '';
            if (semTemplateSel) semTemplateSel.value = '';
            if (semSpecCont) semSpecCont.classList.add('hidden');
            this.closeModal('add-semester-modal');
            this.refreshPlanner();
            showToast((TRANSLATIONS[this.selectedLang]||TRANSLATIONS["English"]).toast_semester_created || "Semester created!", 'success');
        });

        get('semester-selector')?.addEventListener('change', (e) => {
            this.activeSemesterId = parseInt(e.target.value);
            localStorage.setItem('studentpro_active_semester', this.activeSemesterId);
            this.refreshSubjects();
        });

        get('save-subject-btn')?.addEventListener('click', async () => {
            const name = get('subject-name-input').value;
            const date = get('exam-date-input').value;
            const hasEx = get('subject-type-input').value === 'true';

            if (!this.activeSemesterId) {
                showToast((TRANSLATIONS[this.selectedLang]||TRANSLATIONS["English"]).toast_select_semester || "Select a semester first.", 'warning');
                return;
            }
            if (name) {
                await db.addSubject(this.activeSemesterId, name, date, hasEx);
                get('subject-name-input').value = '';
                get('exam-date-input').value = '';
                get('add-subject-form')?.classList.add('hidden');
                get('add-subject-toggle-btn')?.classList.remove('hidden');
                this.refreshSubjects();
                showToast((TRANSLATIONS[this.selectedLang]||TRANSLATIONS["English"]).toast_subject_added || "Subject added!", 'success');
            }
        });

        get('delete-subject-btn')?.addEventListener('click', async () => {
            if (this.activeSubjectId && confirm("Delete this subject?")) {
                await db.deleteSubject(this.activeSubjectId);
                this.activeSubjectId = null;
                this.refreshSubjects();
                showToast((TRANSLATIONS[this.selectedLang]||TRANSLATIONS["English"]).toast_subject_deleted || "Subject deleted.", 'info');
            }
        });

        get('add-subject-toggle-btn')?.addEventListener('click', () => {
            const form   = get('add-subject-form');
            const toggle = get('add-subject-toggle-btn');
            if (!form) return;
            const isHidden = form.classList.contains('hidden');
            form.classList.toggle('hidden', !isHidden);
            toggle.classList.toggle('hidden', isHidden);
            if (isHidden) get('subject-name-input')?.focus();
        });

        get('cancel-add-subject-btn')?.addEventListener('click', () => {
            get('add-subject-form')?.classList.add('hidden');
            get('add-subject-toggle-btn')?.classList.remove('hidden');
        });

        get('close-sw-modal')?.addEventListener('click', () => this.closeModal('subject-window-modal'));

        get('sw-exam-date-input')?.addEventListener('change', async (e) => {
            if (!this.activeSubjectId) return;
            const sub = db.data.subjects.find(s => s.id === this.activeSubjectId);
            if (sub) {
                const examDate = e.target.value || null;
                console.log(`[App] Subject: exam date update requested (subjectId=${this.activeSubjectId}, exam_date=${examDate || 'null'})`);
                try {
                    await db.updateSubjectExamDate(this.activeSubjectId, examDate);
                    console.log(`[App] Subject: exam date saved+queued (subjectId=${this.activeSubjectId})`);
                } catch (err) {
                    console.error(`[App] Subject: exam date update failed (subjectId=${this.activeSubjectId}):`, err);
                }
            }
        });

        get('sw-add-chapter-btn')?.addEventListener('click', async () => {
            const input = get('sw-chapter-input');
            const youtubeInput = get('sw-youtube-input');
            if (input.value && this.activeSubjectId) {
                const youtubeUrl = youtubeInput?.value?.trim() || null;
                await db.addChapter(this.activeSubjectId, input.value.trim(), youtubeUrl);
                input.value = '';
                if (youtubeInput) youtubeInput.value = '';
                this.refreshSubjectWindowData();
                this.refreshPlanner();
            }
        });

        // Pomodoro
        get('timer-start')?.addEventListener('click', () => {
            this.toggleTimer();
        });

        get('timer-reset')?.addEventListener('click', () => {
            this.resetTimer();
        });

        get('lofi-toggle')?.addEventListener('change', (e) => {
            const player = get('bg-music-player');
            const track = get('lofi-music-select')?.value;
            if (e.target.checked && player && track) {
                player.src = "assets/sounds/" + track;
                player.play().catch(err => console.warn("[App] Audio playback error:", err));
            } else if (player) {
                player.pause();
            }
        });

        // Settings
        get('lang-select')?.addEventListener('change', (e) => {
            this.selectedLang = e.target.value;
            if (db && db.data && db.data.settings) {
                db.data.settings.lang = this.selectedLang;
                db.save();
            }
            this.applyLoginScreenLanguage();
            this.refreshAll();
        });

        get('theme-select')?.addEventListener('change', (e) => {
            if (db && db.data && db.data.settings) {
                db.data.settings.theme = e.target.value;
                db.save();
            }
            this.applyTheme(e.target.value);
        });

        get('web-upload-btn')?.addEventListener('click', async () => {
            console.log("[App] Sync: upload (pending changes) started");
            try {
                const result = await db.syncPendingChanges();
                console.log(`[App] Sync: upload finished (changed=${result ? 'yes' : 'no'})`);
                showToast(
                    result
                        ? (TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"]).toast_sync_ok || "Sync successful! ☁️"
                        : (TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"]).toast_sync_nothing || "Nothing to sync.",
                    result ? 'success' : 'info'
                );
                this.refreshLastSync();
            } catch (e) {
                console.error("[App] Sync: upload failed:", e);
                showToast(((TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"]).toast_sync_fail || "Sync failed") + ": " + (e?.message || e), 'error');
            }
        });

        get('web-download-btn')?.addEventListener('click', async () => {
            console.log("[App] Sync: download (from cloud) started");
            try {
                await db.syncFromCloud();
                this.refreshAll();
                console.log("[App] Sync: download finished");
                showToast((TRANSLATIONS[this.selectedLang]||TRANSLATIONS["English"]).toast_download_ok || "Data downloaded from cloud! ☁️", 'success');
                this.refreshLastSync();
            } catch (e) {
                console.error("[App] Sync: download failed:", e);
                showToast(((TRANSLATIONS[this.selectedLang]||TRANSLATIONS["English"]).toast_sync_fail || "Download failed") + ": " + e.message, 'error');
            }
        });

        get('reset-data-btn')?.addEventListener('click', async () => {
            const firstConfirm = confirm("DANGER: Reset all local and cloud data? This cannot be undone.");
            if (!firstConfirm) return;

            const secondConfirm = confirm("Are you ABSOLUTELY sure? All your study progress will be lost forever.");
            if (!secondConfirm) return;

            if (navigator.onLine && auth.user) {
                try {
                    const uid = auth.user.id;
                    await Promise.all([
                        auth.client.from("study_sessions").delete().eq("user_id", uid),
                        auth.client.from("chapters").delete().eq("user_id", uid),
                        auth.client.from("subjects").delete().eq("user_id", uid),
                        auth.client.from("semesters").delete().eq("user_id", uid)
                    ]);
                } catch (e) { console.error("[App] Settings: Cloud wipe failed:", e); }
            }

            localStorage.clear();
            db.data = {
                semesters: [], subjects: [], chapters: [], study_sessions: [],
                settings: { lang: 'English', theme: 'Light', sync_mode: 'Automatic', pomodoro: { work: 25, short: 5, long: 15 } },
                user_profile: { xp: 0, level: 1, total_sessions: 0, display_name: '' }
            };
            db.save();

            this.refreshAll();
            showToast((TRANSLATIONS[this.selectedLang]||TRANSLATIONS["English"]).toast_data_reset || "All data has been reset.", 'info');
            this.showModal('welcome-modal');
        });

        get('sync-mode-select')?.addEventListener('change', (e) => {
            if (db && db.data && db.data.settings) {
                db.data.settings.sync_mode = e.target.value;
                db.save();
            }
        });

        get('manual-sync-btn')?.addEventListener('click', async () => {
            try {
                await db.syncPendingChanges();
                await db.syncFromCloud();
                this.refreshAll();
                showToast((TRANSLATIONS[this.selectedLang]||TRANSLATIONS["English"]).toast_sync_ok || "Synced! ☁️", 'success');
                this.refreshLastSync();
            } catch (e) { showToast((TRANSLATIONS[this.selectedLang]||TRANSLATIONS["English"]).toast_sync_fail || "Sync failed.", 'error'); }
        });

        // Onboarding
        get('skip-onboarding-btn')?.addEventListener('click', async () => {
            const nameInput = get('user-display-name');
            const name = nameInput?.value?.trim() || "Student";
            await db.updateProfile({ display_name: name });
            this.closeModal('welcome-modal');
            this.refreshAll();
        });

        const yearSelector = get('year-selector');
        const specSelector = get('spec-selector');
        const specContainer = get('specialization-container');
        const onboardingBtn = get('start-onboarding-btn');

        if (yearSelector) {
            yearSelector.addEventListener('change', (e) => {
                const year = e.target.value;
                const filtered = TEMPLATES.filter(t => t.year === year);
                if (filtered.length > 1) {
                    specSelector.innerHTML = '<option value="">-- Select Specialization --</option>';
                    filtered.forEach(t => {
                        const opt = document.createElement('option');
                        opt.value = t.name; opt.textContent = t.name;
                        specSelector.appendChild(opt);
                    });
                    specContainer.classList.remove('hidden');
                    onboardingBtn.disabled = true;
                } else if (filtered.length === 1) {
                    specContainer.classList.add('hidden');
                    onboardingBtn.disabled = false;
                } else {
                    specContainer.classList.add('hidden');
                    onboardingBtn.disabled = true;
                }
            });
        }

        specSelector?.addEventListener('change', () => {
            if (onboardingBtn) onboardingBtn.disabled = !specSelector.value;
        });

        onboardingBtn?.addEventListener('click', async () => {
            const name = get('user-display-name')?.value?.trim() || "Student";
            const year = yearSelector?.value;
            const spec = specSelector?.value;

            await db.updateProfile({ display_name: name });

            if (onboardingBtn) {
                onboardingBtn.textContent = "Setting up...";
                onboardingBtn.disabled = true;
            }

            let template;
            if (spec) template = TEMPLATES.find(t => t.name === spec);
            else template = TEMPLATES.find(t => t.year === year);

            if (template) {
                await db.applyTemplate(template);
            }

            this.closeModal('welcome-modal');
            this.refreshAll();
        });
    }

    async applyTemplateToSemester(semId, template) {
        for (let sub of template.subjects) {
            const subId = await db.addSubject(semId, sub.name, null, sub.has_exercises !== false);
            if (subId) {
                for (let ch of sub.chapters) await db.addChapter(subId, ch);
            }
        }
    }

    switchTab(tabId) {
        console.log(`[App] Switching to tab: ${tabId}`);
        this.currentTab = tabId;
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        const target = get(tabId);
        if (target) target.classList.add('active');
        document.querySelector(`.nav-btn[data-tab="${tabId}"]`)?.classList.add('active');

        if (tabId === 'leaderboard') this.refreshLeaderboard();
        this.refreshAll();
    }

    refreshAll() {
        const T = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];
        this.refreshDashboard();
        this.refreshPlanner();
        this.refreshAnalytics();
        this.refreshPomodoroSubjects();
        if (typeof this.refreshPomodoroUI === 'function') this.refreshPomodoroUI();
        this.refreshLastSync();
        this.updateMiniChallenge();

        const nameDisp = get('acc-display-name');
        if (nameDisp) nameDisp.textContent = db.data?.user_profile?.display_name || "Student";

        const emailDisp = get('acc-email');
        if (emailDisp && auth.user) emailDisp.textContent = auth.user.email;

        const sidebarEmail = get('sidebar-user-email');
        if (sidebarEmail) {
            sidebarEmail.textContent = auth.user ? `👤 ${auth.user.email}` : "👤 Guest Mode";
        }

        const accStats = get('acc-stats');
        if (accStats && db.data?.user_profile) {
            const level = db.data.user_profile.level || 1;
            accStats.textContent = `${T.level_label || T.level || 'Level'} ${level} ${T.student || 'Student'}`;
        }
    }

    refreshDate() {
        const el = get('current-date');
        if (!el) return;
        const options = { weekday: 'long', month: 'long', day: 'numeric' };
        el.textContent = new Date().toLocaleDateString(undefined, options);
    }

    refreshLastSync() {
        const el = get('last-sync-label');
        if (el && db.lastSync) el.textContent = `🔄 Last sync: ${db.lastSync}`;
    }

    applyTheme(t) {
        document.documentElement.setAttribute('data-theme', t);
        this.applyLoginScreenLanguage();
    }

    showModal(id) {
        console.log(`[App] Showing modal: ${id}`);
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
        const container = get('modal-container');
        if (container) container.classList.remove('hidden');
        const modal = get(id);
        if (modal) modal.classList.remove('hidden');
    }

    closeModal(id) {
        console.log(`[App] Closing modal: ${id}`);
        const container = get('modal-container');
        if (container) container.classList.add('hidden');
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    }

    loadSettings() {
        const langSel = get('lang-select');
        if (langSel && db.data?.settings) {
            langSel.value = db.data.settings.lang || 'English';
        }
        const themeSel = get('theme-select');
        if (themeSel && db.data?.settings) {
            themeSel.value = db.data.settings.theme || 'Light';
        }
        const syncSel = get('sync-mode-select');
        if (syncSel && db.data?.settings) {
            syncSel.value = db.data.settings.sync_mode || 'Automatic';
        }
    }

    initCharts() { /* charts now built with pure CSS/HTML */ }
}
