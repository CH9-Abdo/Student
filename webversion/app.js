// Main App Controller - StudentPro Web V4 (FIXED & IMPROVED)
let app;

document.addEventListener('DOMContentLoaded', () => {
    // Inject toast container into DOM
    const toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);

    app = new StudentProApp();
    window.app = app;
});

// ============================================================
// TOAST UTILITY — replaces all alert() calls
// ============================================================
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => toast.remove());
    }, duration);
}

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

                // BUG FIX: null check before accessing db.data.settings
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
                    console.log("[App] StatusBar configured.");
                }
                if (SplashScreen) {
                    SplashScreen.hide();
                    console.log("[App] SplashScreen hidden.");
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
        const texts = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];

        // 1. Login Screen
        const loginIds = {
            'login-title': 'login_title', 'login-desc': 'login_desc',
            'login-email': 'login_email_placeholder', 'login-password': 'login_password_placeholder',
            'do-login-btn': 'login_btn', 'do-signup-btn': 'signup_btn',
            'tab-login': 'tab_login', 'tab-signup': 'tab_signup',
            'work-offline-btn': 'work_offline'
        };
        for (let [id, key] of Object.entries(loginIds)) {
            const el = get(id);
            if (!el) continue;
            if (el.tagName === 'INPUT') el.placeholder = texts[key] || el.placeholder;
            else el.textContent = texts[key] || el.textContent;
        }

        // 2. Sidebar Navigation
        const navItems = {
            'dashboard': 'dashboard', 'planner': 'planner',
            'pomodoro': 'pomodoro', 'analytics': 'analytics',
            'leaderboard': 'leaderboard', 'settings': 'settings'
        };
        document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
            const key = navItems[btn.dataset.tab];
            const span = btn.querySelector('.nav-text');
            if (span && key) span.textContent = texts[key] || span.textContent;
        });

        const logoutBtn = get('logout-btn');
        if (logoutBtn) {
            const span = logoutBtn.querySelector('.nav-text');
            if (span) span.textContent = texts['logout'] || "Logout";
        }

        // 3. Dashboard Labels
        const dashboardIds = {
            'dash-progress-label': 'overall_progress',
            'dash-exam-label': 'next_exam',
            'dash-streak-label': 'streak',
            'dash-challenge-label': 'challenge',
            'up-next-label': 'up_next'
        };
        for (let [id, key] of Object.entries(dashboardIds)) {
            const el = get(id);
            if (el) el.textContent = texts[key] || el.textContent;
        }

        // 4. Pomodoro Tab
        const pomodoroIds = {
            'timer-status': 'focus_time',
            'smart-suggestion': 'smart_suggestion'
        };
        for (let [id, key] of Object.entries(pomodoroIds)) {
            const el = get(id);
            if (el) el.textContent = texts[key] || el.textContent;
        }

        const subjectSel = get('active-subject-selector');
        if (subjectSel && subjectSel.options.length > 0) {
            subjectSel.options[0].textContent = texts['select_subject'] || 'Select Subject';
        }

        // Apply RTL/LTR
        const langDir = this.selectedLang === 'Arabic' ? "rtl" : "ltr";
        document.documentElement.dir = langDir;
        document.body.classList.toggle('rtl', langDir === 'rtl');
        console.log(`[App] Language direction set to: ${langDir}`);
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

        // BUG FIX: null check before accessing settings
        if (db.data && db.data.settings && db.data.settings.lang) {
            this.selectedLang = db.data.settings.lang;
            console.log(`[App] Using user saved language: ${this.selectedLang}`);
        }

        this.applyTheme((db.data && db.data.settings && db.data.settings.theme) || 'Light');
        this.refreshAll();

        if (!navigator.onLine || user.id === 'offline-user') {
            console.log("[App] Offline or Guest Mode - using local data only");
            this.loadSettings();
            this.refreshAll();
            return;
        }

        console.log("[App] Attempting background sync...");
        try {
            const uploadRes = await db.syncPendingChanges();
            console.log(`[App] Sync Upload: ${uploadRes ? 'Changes pushed' : 'No changes'}`);
            await db.syncFromCloud();
            console.log("[App] Sync Download: Data refreshed from cloud.");
            this.refreshLastSync();
        } catch (e) { console.error("[App] Sync background process failed:", e); }

        this.loadSettings();
        this.refreshAll();

        setTimeout(() => {
            const needsOnboarding = (!db.data.user_profile || !db.data.user_profile.display_name || db.data.user_profile.display_name === 'Student') && db.data.semesters.length === 0;
            if (needsOnboarding) {
                console.log("[App] New user detected, showing welcome onboarding.");
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
            console.log(`[App] Auth: Attempting login for ${email}...`);
            btn.disabled = true;
            btn.textContent = '...';
            try {
                await auth.signIn(email, pass);
                console.log("[App] Auth: Login Success.");
            } catch (e) {
                console.error("[App] Auth: Login Failed.", e.message);
                err.textContent = e.message;
                err.classList.remove('hidden');
            } finally {
                btn.disabled = false;
                const texts = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];
                btn.textContent = texts['login_btn'] || 'Login';
            }
        });

        // BUG FIX: do-signup-btn had wrong class, now handled correctly
        get('do-signup-btn')?.addEventListener('click', async () => {
            const btn = get('do-signup-btn'), err = get('login-error');
            const email = get('login-email').value, pass = get('login-password').value;
            if (!email || !pass) return;
            console.log(`[App] Auth: Attempting signup for ${email}...`);
            btn.disabled = true;
            try {
                await auth.signUp(email, pass);
                console.log("[App] Auth: Signup request sent.");
                showToast("Account created! Check your email to confirm.", 'success', 5000);
                err.classList.add('hidden');
            } catch (e) {
                console.error("[App] Auth: Signup Failed.", e.message);
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
            console.log("[App] Auth: User chose Offline Mode.");
            await auth.workOffline();
        });

        get('logout-btn')?.addEventListener('click', () => {
            console.log("[App] Auth: Logging out...");
            auth.signOut();
        });

        get('mobile-logout-btn')?.addEventListener('click', () => {
            console.log("[App] Auth: Logging out (mobile)...");
            auth.signOut();
        });

        // Navigation
        document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                console.log(`[App] Nav: Switching to tab ${btn.dataset.tab}`);
                this.switchTab(btn.dataset.tab);
            });
        });

        // Planner
        get('add-semester-btn')?.addEventListener('click', () => {
            this.showModal('add-semester-modal');
        });

        get('close-semester-modal')?.addEventListener('click', () => this.closeModal('add-semester-modal'));

        const semTemplateSel = get('semester-template-selector');
        const semSpecSel = get('semester-spec-selector');
        const semSpecCont = get('semester-spec-container');

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
                } else {
                    semSpecCont.classList.add('hidden');
                }
            });
        }

        get('save-semester-modal-btn')?.addEventListener('click', async () => {
            const name = get('semester-name-input').value;
            const year = semTemplateSel?.value;
            const spec = semSpecSel?.value;

            console.log(`[App] Planner: Saving new semester: ${name}`);

            // BUG FIX: null check for semester name
            if (!name || !name.trim()) {
                showToast("Please enter a semester name.", 'warning');
                return;
            }

            const id = await db.addSemester(name.trim());
            if (id && (year || spec)) {
                let template;
                if (spec) template = TEMPLATES.find(t => t.name === spec);
                else template = TEMPLATES.find(t => t.year === year);

                if (template) {
                    console.log(`[App] Planner: Applying template ${template.name}`);
                    await this.applyTemplateToSemester(id, template);
                }
            }
            if (get('semester-name-input')) get('semester-name-input').value = '';
            if (semTemplateSel) semTemplateSel.value = '';
            if (semSpecCont) semSpecCont.classList.add('hidden');
            this.closeModal('add-semester-modal');
            this.refreshPlanner();
            showToast("Semester created!", 'success');
        });

        get('semester-selector')?.addEventListener('change', (e) => {
            this.activeSemesterId = parseInt(e.target.value);
            console.log(`[App] Planner: Semester changed to ID ${this.activeSemesterId}`);
            localStorage.setItem('studentpro_active_semester', this.activeSemesterId);
            this.refreshSubjects();
        });

        get('save-subject-btn')?.addEventListener('click', async () => {
            const name = get('subject-name-input').value;
            const date = get('exam-date-input').value;
            const hasEx = get('subject-type-input').value === 'true';
            console.log(`[App] Planner: Adding subject: ${name}`);

            // BUG FIX: replaced alert with toast
            if (!this.activeSemesterId) {
                showToast("Select a semester first.", 'warning');
                return;
            }
            if (name) {
                await db.addSubject(this.activeSemesterId, name, date, hasEx);
                get('subject-name-input').value = '';
                get('exam-date-input').value = '';
                // collapse the form back
                get('add-subject-form')?.classList.add('hidden');
                get('add-subject-toggle-btn')?.classList.remove('hidden');
                this.refreshSubjects();
                showToast("Subject added!", 'success');
            }
        });

        get('delete-subject-btn')?.addEventListener('click', async () => {
            if (this.activeSubjectId && confirm("Delete this subject?")) {
                await db.deleteSubject(this.activeSubjectId);
                this.activeSubjectId = null;
                this.refreshSubjects();
                showToast("Subject deleted.", 'info');
            }
        });

        // Add-subject toggle (expand / collapse inline form)
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

        // Subject Window Modal
        get('close-sw-modal')?.addEventListener('click', () => this.closeModal('subject-window-modal'));

        // BUG FIX: Save exam date when it changes
        get('sw-exam-date-input')?.addEventListener('change', async (e) => {
            if (!this.activeSubjectId) return;
            const sub = db.data.subjects.find(s => s.id === this.activeSubjectId);
            if (sub) {
                sub.exam_date = e.target.value || null;
                await db.save();
                console.log(`[App] Planner: Exam date saved for subject ${this.activeSubjectId}`);
            }
        });

        get('sw-add-chapter-btn')?.addEventListener('click', async () => {
            const input = get('sw-chapter-input');
            const youtubeInput = get('sw-youtube-input');
            if (input.value && this.activeSubjectId) {
                const youtubeUrl = youtubeInput?.value?.trim() || null;
                console.log(`[App] Planner: Adding chapter "${input.value}"`);
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
            console.log("[App] Pomodoro: Timer RESET");
            this.resetTimer();
        });

        get('lofi-toggle')?.addEventListener('change', (e) => {
            const player = get('bg-music-player');
            const track = get('lofi-music-select')?.value;
            console.log(`[App] Audio: ${e.target.checked ? 'Playing' : 'Stopped'} - ${track}`);
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
            console.log(`[App] Settings: Language changed to ${this.selectedLang}`);

            // BUG FIX: null check
            if (db && db.data && db.data.settings) {
                db.data.settings.lang = this.selectedLang;
                db.save();
            }
            this.applyLoginScreenLanguage();
            this.refreshAll();
        });

        get('theme-select')?.addEventListener('change', (e) => {
            console.log(`[App] Settings: Theme changed to ${e.target.value}`);
            if (db && db.data && db.data.settings) {
                db.data.settings.theme = e.target.value;
                db.save();
            }
            this.applyTheme(e.target.value);
        });

        get('web-upload-btn')?.addEventListener('click', async () => {
            console.log("[App] Settings: Manual Upload triggered.");
            const result = await db.syncPendingChanges();
            showToast(result ? "Sync successful! ☁️" : "Nothing to sync.", result ? 'success' : 'info');
            this.refreshLastSync();
        });

        get('web-download-btn')?.addEventListener('click', async () => {
            console.log("[App] Settings: Manual Download triggered.");
            try {
                await db.syncFromCloud();
                this.refreshAll();
                showToast("Data downloaded from cloud! ☁️", 'success');
                this.refreshLastSync();
            } catch (e) {
                showToast("Download failed: " + e.message, 'error');
            }
        });

        get('reset-data-btn')?.addEventListener('click', async () => {
            console.log("[App] Settings: Full reset sequence initiated.");

            const firstConfirm = confirm("DANGER: Reset all local and cloud data? This cannot be undone.");
            if (!firstConfirm) return;

            const secondConfirm = confirm("Are you ABSOLUTELY sure? All your study progress will be lost forever.");
            if (!secondConfirm) return;

            console.log("[App] Settings: Starting data wipe...");

            if (navigator.onLine && auth.user) {
                try {
                    const uid = auth.user.id;
                    await Promise.all([
                        auth.client.from("study_sessions").delete().eq("user_id", uid),
                        auth.client.from("chapters").delete().eq("user_id", uid),
                        auth.client.from("subjects").delete().eq("user_id", uid),
                        auth.client.from("semesters").delete().eq("user_id", uid)
                    ]);
                    console.log("[App] Settings: Cloud data wipe successful.");
                } catch (e) {
                    console.error("[App] Settings: Cloud wipe failed:", e);
                }
            }

            console.log("[App] Settings: Clearing local storage.");
            localStorage.clear();

            db.data = {
                semesters: [], subjects: [], chapters: [], study_sessions: [],
                settings: { lang: 'English', theme: 'Light', sync_mode: 'Automatic', pomodoro: { work: 25, short: 5, long: 15 } },
                user_profile: { xp: 0, level: 1, total_sessions: 0, display_name: '' }
            };
            db.save();

            this.refreshAll();
            showToast("All data has been reset.", 'info');
            console.log("[App] Settings: Reset complete.");
            this.showModal('welcome-modal');
        });

        // Sync mode setting
        get('sync-mode-select')?.addEventListener('change', (e) => {
            if (db && db.data && db.data.settings) {
                db.data.settings.sync_mode = e.target.value;
                db.save();
            }
        });

        get('manual-sync-btn')?.addEventListener('click', async () => {
            console.log("[App] Sidebar: Manual sync triggered.");
            try {
                await db.syncPendingChanges();
                await db.syncFromCloud();
                this.refreshAll();
                showToast("Synced! ☁️", 'success');
                this.refreshLastSync();
            } catch (e) {
                showToast("Sync failed.", 'error');
            }
        });

        // Onboarding
        get('skip-onboarding-btn')?.addEventListener('click', () => {
            const nameInput = get('user-display-name');
            if (db && db.data && db.data.user_profile) {
                db.data.user_profile.display_name = nameInput?.value?.trim() || "Student";
                db.save();
            }
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

            console.log(`[App] Onboarding: Setting name to ${name}`);
            if (db && db.data && db.data.user_profile) {
                db.data.user_profile.display_name = name;
            }

            if (onboardingBtn) {
                onboardingBtn.textContent = "Setting up...";
                onboardingBtn.disabled = true;
            }

            let template;
            if (spec) template = TEMPLATES.find(t => t.name === spec);
            else template = TEMPLATES.find(t => t.year === year);

            if (template) {
                console.log(`[App] Onboarding: Applying template ${template.name}`);
                await db.applyTemplate(template);
            }

            db.save();
            this.closeModal('welcome-modal');
            this.refreshAll();
        });
    }

    async applyTemplateToSemester(semId, template) {
        console.log(`[App] Applying template ${template.name} to semester ${semId}`);
        for (let sub of template.subjects) {
            const subId = await db.addSubject(semId, sub.name, null, sub.has_exercises !== false);
            if (subId) {
                for (let ch of sub.chapters) await db.addChapter(subId, ch);
            }
        }
    }

    switchTab(tabId) {
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
        console.log("[App] Refreshing all UI components...");
        this.refreshDashboard();
        this.refreshPlanner();
        this.refreshAnalytics();
        this.refreshPomodoroSubjects();
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
            accStats.textContent = `Level ${level} Student`;
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

    refreshDashboard() {
        const ACCENT_COLORS = ['#6366f1','#0ea5a0','#f59e0b','#ef4444','#8b5cf6','#10b981','#f43f5e','#3b82f6'];

        // ── Date ─────────────────────────────────────────────
        const dateEl = get('current-date');
        if (dateEl) dateEl.textContent = new Date().toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' });

        // ── Username ──────────────────────────────────────────
        const uname = get('dash-username');
        if (uname) uname.textContent = db.data?.user_profile?.display_name || 'Student';

        // ── Progress ring ─────────────────────────────────────
        const stats = db.getProgressStats();
        const perc  = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
        const CIRC  = 201; // 2π × 32

        const valEl = get('overall-progress-val');
        if (valEl) valEl.textContent = `${perc}%`;
        const ring = get('overall-ring-fill');
        if (ring) ring.style.strokeDashoffset = CIRC - (perc / 100) * CIRC;
        const doneEl  = get('dash-chapters-done');
        const totalEl = get('dash-chapters-total');
        if (doneEl)  doneEl.textContent  = stats.done;
        if (totalEl) totalEl.textContent = stats.total;

        // ── Exam ──────────────────────────────────────────────
        const exam = db.getNextExamInfo();
        const examVal = get('next-exam-val');
        const examSub = get('next-exam-sub');
        if (examVal) {
            if (exam) {
                examVal.textContent = exam.days === 0 ? 'Today!' : `${exam.days}d`;
                if (examSub) examSub.textContent = exam.name;
            } else {
                examVal.textContent = '—';
                if (examSub) examSub.textContent = 'No exams set';
            }
        }

        // ── Streak ────────────────────────────────────────────
        const streakEl = get('streak-val');
        if (streakEl) streakEl.textContent = db.getStudyStreak();

        // ── Sessions ──────────────────────────────────────────
        const sessEl = get('dash-total-sessions');
        if (sessEl) sessEl.textContent = db.data?.user_profile?.total_sessions || 0;

        // ── Daily goal ────────────────────────────────────────
        const GOAL = 3;
        const totalSessions = db.data?.user_profile?.total_sessions || 0;
        const todaySessions = Math.min(totalSessions % GOAL || 0, GOAL);
        const goalVal = get('daily-goal-val');
        const goalFill = get('daily-goal-bar');
        if (goalVal) goalVal.textContent = `${todaySessions}/${GOAL}`;
        if (goalFill) goalFill.style.width = `${(todaySessions / GOAL) * 100}%`;
        const dotsEl = get('daily-dots');
        if (dotsEl) {
            dotsEl.querySelectorAll('.ddot').forEach((dot, i) => {
                dot.classList.toggle('done', i < todaySessions);
            });
        }

        // ── Todo list ─────────────────────────────────────────
        const todoContainer = get('todo-container');
        const todoBadge     = get('todo-count-badge');
        if (todoContainer) {
            const todos = db.getTodoChapters();
            if (todoBadge) todoBadge.textContent = todos.length;
            todoContainer.innerHTML = '';

            if (todos.length === 0) {
                todoContainer.innerHTML = '<div class="db-todo-empty">🎉 All caught up!</div>';
            } else {
                todos.slice(0, 6).forEach((t, idx) => {
                    const color = ACCENT_COLORS[idx % ACCENT_COLORS.length];
                    const type  = !t.video_completed ? 'Course' : 'Exercises';
                    const badge = !t.video_completed
                        ? `background:rgba(91,95,199,0.12);color:var(--primary)`
                        : `background:rgba(16,185,129,0.12);color:#059669`;
                    const div = document.createElement('div');
                    div.className = 'db-todo-item';
                    div.innerHTML = `
                        <span class="db-todo-dot" style="background:${color};"></span>
                        <div class="db-todo-body">
                            <p class="db-todo-name">${t.name}</p>
                            <p class="db-todo-meta">${t.subject_name}</p>
                        </div>
                        <span class="db-todo-badge" style="${badge}">${type}</span>
                    `;
                    todoContainer.appendChild(div);
                });
            }
        }

        // ── Week activity bars ────────────────────────────────
        const barsContainer = get('week-bars-container');
        const weekPill      = get('week-sessions-total');
        const legendEl      = get('week-subject-mini');

        if (barsContainer) {
            const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
            const today = new Date();
            const weekCounts = Array(7).fill(0);
            const subjectCounts = {};

            db.data.study_sessions.forEach(s => {
                if (!s.timestamp && !s.created_at) return;
                const d = new Date(s.timestamp || s.created_at);
                const diff = Math.floor((today - d) / 86400000);
                if (diff >= 0 && diff < 7) {
                    weekCounts[6 - diff]++;
                    if (s.subject_id) {
                        const sub = db.data.subjects.find(x => x.id === s.subject_id);
                        const name = sub?.name || 'Other';
                        subjectCounts[name] = (subjectCounts[name] || 0) + 1;
                    }
                }
            });

            const maxCount = Math.max(...weekCounts, 1);
            const weekTotal = weekCounts.reduce((a, b) => a + b, 0);
            if (weekPill) weekPill.textContent = `${weekTotal} session${weekTotal !== 1 ? 's' : ''}`;

            barsContainer.innerHTML = '';
            weekCounts.forEach((count, i) => {
                const dayIdx = (today.getDay() - 6 + i + 7) % 7;
                const isToday = i === 6;
                const heightPx = Math.round((count / maxCount) * 78) + 4;
                const cls = count === 0 ? 'empty' : isToday ? 'today' : 'active';
                const col = document.createElement('div');
                col.className = 'db-bar-col';
                col.innerHTML = `
                    <div class="db-bar-fill ${cls}" style="height:${heightPx}px;"></div>
                    <span class="db-bar-lbl">${DAYS[dayIdx]}</span>
                `;
                barsContainer.appendChild(col);
            });

            // Legend
            if (legendEl) {
                const topSubjects = Object.entries(subjectCounts).sort((a,b)=>b[1]-a[1]).slice(0, 3);
                legendEl.innerHTML = topSubjects.map(([name, cnt], i) => `
                    <div class="db-wl-row">
                        <span class="db-wl-dot" style="background:${ACCENT_COLORS[i]};"></span>
                        <span class="db-wl-name">${name}</span>
                        <span class="db-wl-count">${cnt}</span>
                    </div>
                `).join('') || '';
            }
        }
    }

    refreshPlanner() {
        const sel = get('semester-selector');
        if (!sel) return;

        if (!this.activeSemesterId && db.data.semesters.length > 0) {
            const savedId = localStorage.getItem('studentpro_active_semester');
            if (savedId && db.data.semesters.some(s => s.id == savedId)) {
                this.activeSemesterId = parseInt(savedId);
            } else {
                this.activeSemesterId = db.data.semesters[0].id;
            }
        }

        sel.innerHTML = '<option value="">-- Select Semester --</option>';
        db.data.semesters.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id; opt.textContent = s.name;
            if (s.id === this.activeSemesterId) opt.selected = true;
            sel.appendChild(opt);
        });
        this.refreshSubjects();
    }

    refreshSubjects() {
        const grid    = get('subject-cards-grid');
        const empty   = get('planner-empty');
        const strip   = get('planner-stats-strip');
        if (!grid) return;

        grid.innerHTML = '';

        if (!this.activeSemesterId) {
            if (empty) empty.classList.remove('hidden');
            if (strip) strip.innerHTML = '';
            this.refreshPomodoroSubjects();
            return;
        }

        const ACCENT_COLORS = ['#6366f1','#0ea5a0','#f59e0b','#ef4444','#8b5cf6','#10b981','#f43f5e','#3b82f6'];
        const subjects = db.data.subjects.filter(s => s.semester_id === this.activeSemesterId);

        // ── Stats strip ──────────────────────────────────────
        if (strip) {
            const totalChapters  = subjects.reduce((acc, s) => acc + db.data.chapters.filter(c => c.subject_id === s.id).length, 0);
            const doneChapters   = subjects.reduce((acc, s) => acc + db.data.chapters.filter(c => c.subject_id === s.id && c.video_completed).length, 0);
            const upcomingExams  = subjects.filter(s => s.exam_date && new Date(s.exam_date) > new Date()).length;
            const overallPerc    = totalChapters > 0 ? Math.round((doneChapters / totalChapters) * 100) : 0;

            strip.innerHTML = `
                <div class="pstat"><div class="pstat-val">${subjects.length}</div><div class="pstat-lbl">Subjects</div></div>
                <div class="pstat"><div class="pstat-val">${totalChapters}</div><div class="pstat-lbl">Chapters</div></div>
                <div class="pstat"><div class="pstat-val">${overallPerc}%</div><div class="pstat-lbl">Progress</div></div>
                <div class="pstat"><div class="pstat-val">${upcomingExams}</div><div class="pstat-lbl">Upcoming Exams</div></div>
            `;
        }

        // ── Empty state ───────────────────────────────────────
        if (subjects.length === 0) {
            if (empty) empty.classList.remove('hidden');
            this.refreshPomodoroSubjects();
            return;
        }
        if (empty) empty.classList.add('hidden');

        // ── Render cards ──────────────────────────────────────
        subjects.forEach((s, idx) => {
            const accentColor = ACCENT_COLORS[idx % ACCENT_COLORS.length];
            const chapters    = db.data.chapters.filter(c => c.subject_id === s.id);
            const videosDone  = chapters.filter(c => c.video_completed).length;
            const exDone      = chapters.filter(c => c.exercises_completed).length;
            const hasEx       = s.has_exercises !== false;
            const total       = hasEx ? chapters.length * 2 : chapters.length;
            const done        = hasEx ? videosDone + exDone : videosDone;
            const perc        = total > 0 ? Math.round((done / total) * 100) : 0;

            // SVG ring: circumference ≈ 2π×18 ≈ 113
            const CIRC = 113;
            const offset = CIRC - (perc / 100) * CIRC;

            // Exam badge
            let examBadge = '';
            if (s.exam_date) {
                const days = Math.ceil((new Date(s.exam_date) - new Date()) / 86400000);
                const cls  = days < 0 ? 'done' : days <= 7 ? 'urgent' : days <= 21 ? 'soon' : '';
                const lbl  = days < 0 ? 'Exam passed' : days === 0 ? 'Exam today!' : `${days}d to exam`;
                examBadge  = `<span class="subj-exam-badge ${cls}">📅 ${lbl}</span>`;
            }

            // Video chip
            const vAllDone = videosDone === chapters.length && chapters.length > 0;
            const vChip    = `<span class="subj-stat-chip ${vAllDone ? 'done' : ''}">📖 ${videosDone}/${chapters.length}</span>`;

            // Exercise chip (if applicable)
            const exAllDone = exDone === chapters.length && chapters.length > 0;
            const exChip    = hasEx
                ? `<span class="subj-stat-chip ${exAllDone ? 'done' : ''}">✍️ ${exDone}/${chapters.length}</span>`
                : '';

            // Action buttons
            const vBtnDone = chapters.length > 0 && chapters.every(c => c.video_completed);
            const eBtnDone = hasEx && chapters.length > 0 && chapters.every(c => c.exercises_completed);

            const card = document.createElement('div');
            card.className = 'subj-card';
            card.style.setProperty('--accent-color', accentColor);
            card.dataset.subjectId = s.id;

            card.innerHTML = `
                <button class="subj-delete-btn" onclick="event.stopPropagation();app.deleteSubjectCard(${s.id})" title="Delete subject">
                    <i class="fas fa-trash-alt"></i>
                </button>

                <div class="subj-card-top">
                    <div class="subj-card-info">
                        <div class="subj-card-name">${s.name}</div>
                        ${examBadge}
                    </div>
                    <div class="progress-ring-wrap">
                        <svg class="progress-ring-svg" viewBox="0 0 58 58">
                            <circle class="progress-ring-bg" cx="29" cy="29" r="18"/>
                            <circle class="progress-ring-fill" cx="29" cy="29" r="18"
                                style="stroke-dashoffset:${offset}; stroke:${accentColor};"/>
                        </svg>
                        <div class="progress-ring-pct">${perc}%</div>
                    </div>
                </div>

                <div class="subj-chapter-stats">
                    ${chapters.length === 0
                        ? '<span class="subj-stat-chip">No chapters yet</span>'
                        : vChip + exChip
                    }
                </div>

                <div class="subj-card-actions">
                    ${chapters.length > 0 ? `
                    <button class="subj-action-btn ${vBtnDone ? 'all-done' : ''}"
                        onclick="event.stopPropagation();app.toggleSubjectProgress(${s.id},'video')">
                        ${vBtnDone ? '✓ Course Done' : '📖 Toggle Course'}
                    </button>
                    ${hasEx ? `
                    <button class="subj-action-btn ${eBtnDone ? 'all-done' : ''}"
                        onclick="event.stopPropagation();app.toggleSubjectProgress(${s.id},'exercises')">
                        ${eBtnDone ? '✓ Exercises Done' : '✍️ Toggle Exercises'}
                    </button>` : ''}
                    ` : ''}
                    <button class="subj-open-btn" onclick="event.stopPropagation();app.openSubjectWindow(${s.id})" title="Manage chapters">
                        <i class="fas fa-list-ul"></i>
                    </button>
                </div>
            `;

            grid.appendChild(card);
        });

        this.refreshPomodoroSubjects();
    }

    // Called from card delete button
    async deleteSubjectCard(subId) {
        if (!confirm("Delete this subject and all its chapters?")) return;
        await db.deleteSubject(subId);
        if (this.activeSubjectId === subId) this.activeSubjectId = null;
        this.refreshSubjects();
        showToast("Subject deleted.", 'info');
    }

    refreshPomodoroSubjects() {
        const selector = get('active-subject-selector');
        if (!selector) return;

        const currentValue = selector.value;
        selector.innerHTML = '<option value="">' + (TRANSLATIONS[this.selectedLang]?.select_subject || 'Select Subject') + '</option>';

        db.data.subjects.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name;
            selector.appendChild(opt);
        });

        if (currentValue && db.data.subjects.some(s => s.id == currentValue)) {
            selector.value = currentValue;
        }

        selector.onchange = (e) => {
            if (e.target.value) {
                this.activeSubjectId = parseInt(e.target.value);
                this.updateMiniChallenge();
                this.updateYouTubeEmbed();
            }
        };
    }

    updateYouTubeEmbed() {
        const videoCard = get('youtube-video-card');
        const iframe = get('youtube-iframe');
        const openBtn = get('open-youtube-btn');

        if (!videoCard || !iframe) return;

        const chapters = db.data.chapters.filter(c => c.subject_id === this.activeSubjectId && c.youtube_url);

        if (chapters.length > 0) {
            const ytUrl = chapters[0].youtube_url;
            videoCard.style.display = 'block';

            let embedUrl = ytUrl;
            try {
                if (ytUrl.includes('youtube.com/watch')) {
                    const videoId = new URL(ytUrl).searchParams.get('v');
                    embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=0`;
                } else if (ytUrl.includes('youtu.be/')) {
                    const videoId = ytUrl.split('youtu.be/')[1]?.split('?')[0];
                    embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=0`;
                }
            } catch (e) {
                console.warn("[App] YouTube URL parse error:", e);
            }

            iframe.src = embedUrl;
            if (openBtn) openBtn.onclick = () => window.open(ytUrl, '_blank');
        } else {
            videoCard.style.display = 'none';
            iframe.src = '';
        }
    }

    refreshSubjectDetails() {
        const panel = get('subject-details-panel');
        if (!this.activeSubjectId) { panel?.classList.add('disabled'); return; }
        panel?.classList.remove('disabled');
        const sub = db.data.subjects.find(s => s.id === this.activeSubjectId);
        if (!sub) return;

        const title = get('selected-subject-title');
        if (title) title.textContent = sub.name;

        const progress = db.getSubjectProgress(sub.id);
        // BUG FIX: safe division
        const perc = (progress.total > 0) ? Math.round((progress.done / progress.total) * 100) : 0;

        const bar = get('subject-progress-bar');
        if (bar) bar.style.width = `${perc}%`;

        const label = get('subject-progress-label');
        if (label) label.textContent = `${perc}% complete`;

        const hasEx = sub.has_exercises !== false;
        const list = get('chapters-list-display');
        if (list) {
            list.innerHTML = '';
            db.data.chapters.filter(c => c.subject_id === sub.id).forEach(c => {
                const li = document.createElement('li');
                li.innerHTML = `<span>${c.name}</span><span>${c.video_completed ? '📖' : '◯'} ${hasEx ? (c.exercises_completed ? '✍️' : '◯') : ''}</span>`;
                list.appendChild(li);
            });
        }

        const notes = get('subject-notes-display');
        if (notes) notes.value = sub.notes || '';
    }

    async toggleSubjectProgress(subId, type) {
        const chapters = db.data.chapters.filter(c => c.subject_id === subId);
        if (chapters.length === 0) return;
        const allDone = chapters.every(c => type === 'video' ? c.video_completed : c.exercises_completed);
        for (let c of chapters) {
            await db.toggleChapterStatus(c.id, type, !allDone);
        }
        this.refreshPlanner();
    }

    openSubjectWindow(id) {
        console.log(`[App] Planner: Opening Chapter Manager for ID ${id}`);
        this.activeSubjectId = id;
        const sub = db.data.subjects.find(s => s.id === id);
        if (!sub) return;
        const title = get('sw-title');
        if (title) title.textContent = sub.name;
        const examInput = get('sw-exam-date-input');
        if (examInput) examInput.value = sub.exam_date || '';
        this.refreshSubjectWindowData();
        this.showModal('subject-window-modal');
    }

    refreshSubjectWindowData() {
        const list = get('sw-chapters-list');
        if (!list) return;
        list.innerHTML = '';
        const sub = db.data.subjects.find(s => s.id === this.activeSubjectId);
        if (!sub) return;
        const hasEx = sub.has_exercises !== false;

        db.data.chapters.filter(c => c.subject_id === this.activeSubjectId).forEach(c => {
            const item = document.createElement('div');
            item.className = 'list-item';
            const ytIcon = c.youtube_url
                ? '<i class="fab fa-youtube" style="color:#ff0000;"></i>'
                : '<i class="fab fa-youtube" style="opacity:0.25;"></i>';
            item.innerHTML = `
                <span style="font-weight:500;">${c.name}</span>
                <div style="display:flex; gap:6px; align-items:center;">
                    <button class="small-btn ${c.video_completed ? 'primary-btn' : 'secondary-btn'}" onclick="app.toggleCap(${c.id}, 'video')">Course</button>
                    ${hasEx ? `<button class="small-btn ${c.exercises_completed ? 'primary-btn' : 'secondary-btn'}" onclick="app.toggleCap(${c.id}, 'exercises')">Ex</button>` : ''}
                    <button class="btn-icon" onclick="app.editChapterYouTube(${c.id})" title="Edit YouTube">${ytIcon}</button>
                </div>
            `;
            list.appendChild(item);
        });
    }

    async editChapterYouTube(chapterId) {
        const c = db.data.chapters.find(x => x.id === chapterId);
        if (!c) return;
        const newUrl = prompt("Enter YouTube URL:", c.youtube_url || "");
        if (newUrl !== null) {
            await db.updateChapterYouTube(chapterId, newUrl.trim() || null);
            this.refreshSubjectWindowData();
            this.refreshPlanner();
        }
    }

    async toggleCap(id, type) {
        const c = db.data.chapters.find(x => x.id === id);
        if (!c) return;
        await db.toggleChapterStatus(id, type, !(type === 'video' ? c.video_completed : c.exercises_completed));
        this.refreshSubjectWindowData();
        this.refreshPlanner();
    }

    toggleTimer() {
        if (this.timerRunning) {
            clearInterval(this.timer);
            this.timerRunning = false;
            const btn = get('timer-start');
            if (btn) btn.innerHTML = '<i class="fas fa-play"></i> Resume';
        } else {
            this.timerRunning = true;
            const btn = get('timer-start');
            if (btn) btn.innerHTML = '<i class="fas fa-pause"></i> Pause';
            this.timer = setInterval(() => {
                this.timeLeft--;
                this.updateTimerDisplay();
                if (this.timeLeft <= 0) this.completeSession();
            }, 1000);
        }
    }

    resetTimer() {
        clearInterval(this.timer);
        this.timerRunning = false;
        // BUG FIX: read from settings instead of hardcoded 25
        const workMins = db.data?.settings?.pomodoro?.work || 25;
        this.timeLeft = workMins * 60;
        this.updateTimerDisplay();
        const btn = get('timer-start');
        if (btn) btn.innerHTML = '<i class="fas fa-play"></i> Start Focus';
    }

    updateTimerDisplay() {
        const m = Math.floor(this.timeLeft / 60);
        const s = this.timeLeft % 60;
        const display = get('timer-display');
        if (display) display.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

        // Update SVG circle progress
        const path = document.querySelector('.timer-path');
        if (path) {
            const workMins = db.data?.settings?.pomodoro?.work || 25;
            const total = workMins * 60;
            const progress = this.timeLeft / total;
            const circumference = 283;
            path.style.strokeDashoffset = circumference * (1 - progress);
        }
    }

    async completeSession() {
        console.log("[App] Pomodoro: Session COMPLETED!");
        this.resetTimer();

        // BUG FIX: replaced alert() with toast notification
        showToast("🎉 Session Done! +50 XP", 'success', 4000);

        if (this.activeSubjectId) {
            await db.logSession(this.activeSubjectId, 25);
            if (db.data?.user_profile) {
                db.data.user_profile.xp += 50;
                db.data.user_profile.total_sessions = (db.data.user_profile.total_sessions || 0) + 1;
            }
            db.save();
        }
        this.refreshAll();
    }

    updateMiniChallenge() {
        const text = get('mini-challenge-text');
        if (!text) return;
        if (!db.data.subjects || db.data.subjects.length === 0) {
            text.textContent = "Add subjects first!";
            return;
        }
        const sub = db.data.subjects[0];
        text.innerHTML = `Balance Challenge: Study <b>${sub.name}</b>`;
    }

    async refreshLeaderboard() {
        console.log("[App] Leaderboard: Fetching global rankings...");
        const body = get('leaderboard-body');
        if (!body) return;
        body.innerHTML = '<tr><td colspan="4" style="padding:20px; text-align:center; color:var(--text-mute);">Loading...</td></tr>';

        try {
            const data = await db.getLeaderboard();
            body.innerHTML = '';
            if (!data || data.length === 0) {
                body.innerHTML = '<tr><td colspan="4" style="padding:20px; text-align:center; color:var(--text-mute);">No data yet. Be the first!</td></tr>';
                return;
            }

            data.sort((a, b) => (b.xp || 0) - (a.xp || 0)).forEach((u, i) => {
                const tr = document.createElement('tr');
                const isMe = auth.user && u.user_id === auth.user.id;
                if (isMe) tr.style.background = "var(--primary-light)";

                const medals = ['🥇', '🥈', '🥉'];
                const rankDisplay = i < 3 ? medals[i] : `${i + 1}`;

                tr.innerHTML = `
                    <td style="padding:14px; font-weight:bold; text-align:center;">${rankDisplay}</td>
                    <td style="text-align:left; padding:14px; font-weight:500;">${u.display_name || 'Student'} ${isMe ? '<span class="badge">Me</span>' : ''}</td>
                    <td style="padding:14px; text-align:center;">Level ${u.level || 1}</td>
                    <td style="padding:14px; text-align:center; font-weight:600; color:var(--primary);">${u.total_sessions || 0}</td>
                `;
                body.appendChild(tr);
            });
        } catch (e) {
            console.error("[App] Leaderboard: Failed to load.", e);
            body.innerHTML = '<tr><td colspan="4" style="padding:20px; text-align:center; color:var(--danger);">Error loading leaderboard.</td></tr>';
        }
    }

    initCharts() { /* charts now built with pure CSS/HTML */ }

    refreshAnalytics() {
        const ACCENT_COLORS = ['#6366f1','#0ea5a0','#f59e0b','#ef4444','#8b5cf6','#10b981','#f43f5e','#3b82f6'];
        const subjects = db.data.subjects;
        const chapters = db.data.chapters;
        const sessions = db.data.study_sessions;

        // ── Compute base stats ────────────────────────────────
        const stats   = db.getProgressStats();
        const overallPerc = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
        const totalChaps  = chapters.length;
        const totalSubs   = subjects.length;
        const totalSess   = db.data?.user_profile?.total_sessions || sessions.length;

        // Sessions this week
        const now = new Date();
        const weekSessions = sessions.filter(s => {
            const d = new Date(s.timestamp || s.created_at || 0);
            return (now - d) < 7 * 86400000;
        }).length;

        // ── KPI Row ───────────────────────────────────────────
        const kpiRow = get('an-kpi-row');
        if (kpiRow) {
            const exam = db.getNextExamInfo();
            const examText = exam
                ? (exam.days === 0 ? 'Today!' : `${exam.days}d`)
                : '—';
            const examNote = exam
                ? (exam.days <= 7 ? `<span class="an-kpi-note warn">⚠ ${exam.name}</span>`
                                  : `<span class="an-kpi-note">${exam.name}</span>`)
                : `<span class="an-kpi-note">No exams set</span>`;

            kpiRow.innerHTML = `
                <div class="an-kpi" style="--kpi-color:#6366f1;">
                    <div class="an-kpi-val">${overallPerc}%</div>
                    <div class="an-kpi-lbl">Overall Progress</div>
                    <div class="an-kpi-note">${stats.done}/${stats.total} tasks</div>
                </div>
                <div class="an-kpi" style="--kpi-color:#0ea5a0;">
                    <div class="an-kpi-val">${totalSubs}</div>
                    <div class="an-kpi-lbl">Subjects</div>
                    <div class="an-kpi-note">${totalChaps} chapters total</div>
                </div>
                <div class="an-kpi" style="--kpi-color:#f59e0b;">
                    <div class="an-kpi-val">${examText}</div>
                    <div class="an-kpi-lbl">Next Exam</div>
                    ${examNote}
                </div>
                <div class="an-kpi" style="--kpi-color:#ef4444;">
                    <div class="an-kpi-val">${totalSess}</div>
                    <div class="an-kpi-lbl">Total Sessions</div>
                    <div class="an-kpi-note ${weekSessions > 0 ? 'up' : ''}">${weekSessions} this week</div>
                </div>
            `;
        }

        // ── Subject count badge ───────────────────────────────
        const subsBadge = get('an-subjects-count');
        if (subsBadge) subsBadge.textContent = `${totalSubs} subject${totalSubs !== 1 ? 's' : ''}`;

        // ── Subject Progress Bars ─────────────────────────────
        const subBarsEl = get('an-subject-bars');
        if (subBarsEl) {
            if (subjects.length === 0) {
                subBarsEl.innerHTML = '<div class="an-sb-empty">No subjects yet</div>';
            } else {
                subBarsEl.innerHTML = subjects.map((s, idx) => {
                    const color   = ACCENT_COLORS[idx % ACCENT_COLORS.length];
                    const chaps   = chapters.filter(c => c.subject_id === s.id);
                    const vDone   = chaps.filter(c => c.video_completed).length;
                    const eDone   = chaps.filter(c => c.exercises_completed).length;
                    const hasEx   = s.has_exercises !== false;
                    const total   = hasEx ? chaps.length * 2 : chaps.length;
                    const done    = hasEx ? vDone + eDone : vDone;
                    const perc    = total > 0 ? Math.round((done / total) * 100) : 0;
                    const vChip   = `<span class="an-chip ${vDone === chaps.length && chaps.length > 0 ? 'done' : ''}">📖 ${vDone}/${chaps.length}</span>`;
                    const eChip   = hasEx
                        ? `<span class="an-chip ${eDone === chaps.length && chaps.length > 0 ? 'done' : ''}">✍️ ${eDone}/${chaps.length}</span>`
                        : '';
                    return `
                        <div class="an-sb-row">
                            <div class="an-sb-top">
                                <span class="an-sb-name">${s.name}</span>
                                <span class="an-sb-pct">${perc}%</span>
                            </div>
                            <div class="an-sb-track">
                                <div class="an-sb-fill" style="width:${perc}%;background:${color};"></div>
                            </div>
                            <div class="an-sb-chips">${vChip}${eChip}</div>
                        </div>
                    `;
                }).join('');
            }
        }

        // ── Weekly bar chart ──────────────────────────────────
        const weekChartEl = get('an-weekly-chart');
        const weekTotalEl = get('an-week-total');
        if (weekChartEl) {
            const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
            const counts = Array(7).fill(0);
            sessions.forEach(s => {
                const d    = new Date(s.timestamp || s.created_at || 0);
                const diff = Math.floor((now - d) / 86400000);
                if (diff >= 0 && diff < 7) counts[6 - diff]++;
            });
            const maxC = Math.max(...counts, 1);
            const weekTotal7 = counts.reduce((a, b) => a + b, 0);
            if (weekTotalEl) weekTotalEl.textContent = `${weekTotal7} this week`;

            weekChartEl.innerHTML = counts.map((c, i) => {
                const dayIdx   = (now.getDay() - 6 + i + 7) % 7;
                const isToday  = i === 6;
                const heightPx = Math.round((c / maxC) * 88) + 4;
                const cls      = c === 0 ? 'zero' : isToday ? 'today' : '';
                return `
                    <div class="an-bc-col">
                        <span class="an-bc-val">${c > 0 ? c : ''}</span>
                        <div class="an-bc-bar ${cls}" style="height:${heightPx}px;"></div>
                        <span class="an-bc-lbl">${DAYS[dayIdx]}</span>
                    </div>
                `;
            }).join('');
        }

        // ── Exam countdown ────────────────────────────────────
        const examListEl = get('an-exam-timeline');
        if (examListEl) {
            const exams = subjects
                .filter(s => s.exam_date)
                .map(s => {
                    const days = Math.ceil((new Date(s.exam_date) - now) / 86400000);
                    return { name: s.name, days };
                })
                .filter(e => e.days >= 0)
                .sort((a, b) => a.days - b.days);

            if (exams.length === 0) {
                examListEl.innerHTML = '<div class="an-exam-empty">No upcoming exams 🎉</div>';
            } else {
                examListEl.innerHTML = exams.slice(0, 5).map(e => {
                    const cls  = e.days <= 7  ? 'urgent' : e.days <= 21 ? 'soon' : 'safe';
                    const lbl  = e.days === 0 ? 'Today!' : `${e.days}d left`;
                    return `
                        <div class="an-exam-item ${cls}">
                            <span class="an-exam-name">${e.name}</span>
                            <span class="an-exam-days">${lbl}</span>
                        </div>
                    `;
                }).join('');
            }
        }

        // ── Subject time breakdown ────────────────────────────
        const bkEl      = get('subject-breakdown-list');
        const bkTotal   = get('an-total-mins');
        if (bkEl) {
            // Build per-subject session counts
            const subMap = {};
            sessions.forEach(s => {
                const sub  = db.data.subjects.find(x => x.id === s.subject_id);
                const name = sub?.name || 'Unknown';
                subMap[name] = (subMap[name] || 0) + (s.duration_minutes || 25);
            });

            const entries = Object.entries(subMap).sort((a, b) => b[1] - a[1]);
            const totalMins = entries.reduce((acc, [, v]) => acc + v, 0);
            if (bkTotal) bkTotal.textContent = totalMins > 0 ? `${totalMins} min total` : '0 min total';

            if (entries.length === 0) {
                bkEl.innerHTML = '<div class="an-bk-empty">No sessions recorded yet</div>';
            } else {
                const maxVal = entries[0][1];
                bkEl.innerHTML = entries.map(([name, mins], idx) => {
                    const color = ACCENT_COLORS[idx % ACCENT_COLORS.length];
                    const width = Math.round((mins / maxVal) * 100);
                    return `
                        <div class="an-bk-row">
                            <span class="an-bk-dot" style="background:${color};"></span>
                            <span class="an-bk-name">${name}</span>
                            <div class="an-bk-bar-wrap">
                                <div class="an-bk-bar" style="width:${width}%;background:${color};opacity:0.8;"></div>
                            </div>
                            <span class="an-bk-val">${mins} min</span>
                        </div>
                    `;
                }).join('');
            }
        }
    }

    showModal(id) {
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
        const container = get('modal-container');
        if (container) container.classList.remove('hidden');
        const modal = get(id);
        if (modal) modal.classList.remove('hidden');
    }

    closeModal(id) {
        const container = get('modal-container');
        if (container) container.classList.add('hidden');
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    }

    applyTheme(t) {
        console.log(`[App] Theme: Applying ${t}`);
        document.documentElement.setAttribute('data-theme', t);
        this.applyLoginScreenLanguage();
    }

    loadSettings() {
        console.log("[App] Settings: Loading user preferences...");
        // BUG FIX: null checks before accessing value
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
}

function get(id) { return document.getElementById(id); }
