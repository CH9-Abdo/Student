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
                showToast("Account created! Check your email to confirm.", 'success', 5000);
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

        get('start-challenge-btn')?.addEventListener('click', () => {
            this.switchTab('pomodoro');
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
            localStorage.setItem('studentpro_active_semester', this.activeSemesterId);
            this.refreshSubjects();
        });

        get('save-subject-btn')?.addEventListener('click', async () => {
            const name = get('subject-name-input').value;
            const date = get('exam-date-input').value;
            const hasEx = get('subject-type-input').value === 'true';

            if (!this.activeSemesterId) {
                showToast("Select a semester first.", 'warning');
                return;
            }
            if (name) {
                await db.addSubject(this.activeSemesterId, name, date, hasEx);
                get('subject-name-input').value = '';
                get('exam-date-input').value = '';
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
                sub.exam_date = e.target.value || null;
                await db.save();
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
            const result = await db.syncPendingChanges();
            showToast(result ? "Sync successful! ☁️" : "Nothing to sync.", result ? 'success' : 'info');
            this.refreshLastSync();
        });

        get('web-download-btn')?.addEventListener('click', async () => {
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
            showToast("All data has been reset.", 'info');
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
                showToast("Synced! ☁️", 'success');
                this.refreshLastSync();
            } catch (e) { showToast("Sync failed.", 'error'); }
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
                await db.applyTemplate(template);
            }

            db.save();
            this.closeModal('welcome-modal');
            this.refreshAll();
        });
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

    applyTheme(t) {
        document.documentElement.setAttribute('data-theme', t);
        this.applyLoginScreenLanguage();
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
