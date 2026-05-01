StudentProApp.prototype._hasLocalStudyData = function() {
    return (db?.data?.semesters?.length || 0) > 0
        || (db?.data?.subjects?.length || 0) > 0
        || (db?.data?.chapters?.length || 0) > 0;
};

StudentProApp.prototype._syncCloudNow = async function({ reason = 'unknown' } = {}) {
    if (this._cloudSyncInFlight) return this._cloudSyncInFlight;

    this._cloudSyncInFlight = (async () => {
        if (!navigator.onLine) return false;
        if (!auth || !auth.user || auth.user.id === 'offline-user') return false;

        try {
            const hadLocalData = this._hasLocalStudyData();

            let uploadOk = false;
            try {
                uploadOk = await db.syncPendingChanges();
            } catch (e) {
                console.warn(`[App] Cloud sync: upload failed (${reason}):`, e);
                uploadOk = false;
            }

            const pending = typeof db.getPendingSyncBreakdown === 'function'
                ? db.getPendingSyncBreakdown()
                : { total: 0 };
            const allowDirtyDownload = !hadLocalData && (Number(pending.total || 0) > 0);

            // If uploads failed but we have no local data, still try a dirty download to avoid a blank app.
            const downloadOk = await db.syncFromCloud({ allowDirtyDownload });
            if (downloadOk) {
                this.refreshLastSync();
                this.refreshAll();
            } else {
                console.warn(`[App] Cloud sync: download failed (${reason}). uploadOk=${uploadOk} pending=${pending.total} allowDirty=${allowDirtyDownload}`);
            }

            return downloadOk;
        } catch (e) {
            console.warn(`[App] Cloud sync: fatal error (${reason}):`, e);
            return false;
        }
    })().finally(() => {
        this._cloudSyncInFlight = null;
    });

    return this._cloudSyncInFlight;
};

StudentProApp.prototype.init = function() {
    console.log("[App] Initializing application...");
    this.initCapacitor();
    this.injectTemplates();

    this.loadLanguagePreference();
    console.log(`[App] Current Language: ${this.selectedLang}`);

    const loginLangSelect = document.getElementById('login-lang-select');
    if (loginLangSelect) {
        loginLangSelect.value = this.selectedLang;
    }

    this.applyLoginScreenLanguage();

    if (loginLangSelect) {
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
        this.refreshLastSync();
    });
    window.addEventListener('offline', () => {
        console.log("[App] System is OFFLINE");
        this.showOfflineIndicator();
        this.refreshLastSync();
    });

    this.setupEventListeners();
    if (typeof this.initPomodoro === 'function') this.initPomodoro();
    this.refreshDate();
    this.initCharts();

    if (auth && auth.user) {
        this.onLogin(auth.user);
    }
};

StudentProApp.prototype.injectTemplates = function() {
    console.log("[App] Injecting local templates...");
    const welcomeTemplate = document.getElementById('welcome-template');
    const modalContainer = document.getElementById('modal-container');
    if (welcomeTemplate && modalContainer) {
        const clone = welcomeTemplate.content.cloneNode(true);
        modalContainer.appendChild(clone);

        const welcomeLangSelect = document.getElementById('welcome-lang-select');
        if (welcomeLangSelect) {
            welcomeLangSelect.value = this.selectedLang;
            welcomeLangSelect.addEventListener('change', (e) => {
                this.selectedLang = e.target.value;
                localStorage.setItem('studentpro_lang', this.selectedLang);
                this.updateLanguage();
            });
        }

        const loginLink = document.getElementById('welcome-login-link');
        if (loginLink) {
            loginLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal('welcome-modal');
                auth.showLogin('login');
            });
        }
    }
};

StudentProApp.prototype.initCapacitor = async function() {
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
};

StudentProApp.prototype.showOfflineIndicator = function() {
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
};

StudentProApp.prototype.onConnectionRestored = function() {
    this.isOnline = true;
    const banner = document.getElementById('offline-banner');
    if (banner) {
        banner.style.background = "#0ea5a0";
        banner.innerHTML = '<i class="fas fa-check-circle"></i> Back Online';
        setTimeout(() => banner.remove(), 3000);
    }
    void this._syncCloudNow({ reason: 'connection-restored' });
};

StudentProApp.prototype.onLogin = async function(user) {
    console.log(`[App] User session identified: ${user.email}`);
    document.getElementById('login-screen').classList.add('hidden');

    if (db.data && db.data.settings && db.data.settings.lang) {
        this.selectedLang = db.data.settings.lang;
    }

    this.applyTheme((db.data && db.data.settings && db.data.settings.theme) || 'Light');
    this.refreshAll();

    if (user && user.id !== 'offline-user') {
        await this._syncCloudNow({ reason: 'login' });
    }

    this.loadSettings();
    this.refreshAll();

    setTimeout(() => {
        const hasDisplayName = db.data.user_profile && db.data.user_profile.display_name && db.data.user_profile.display_name !== 'Student';
        const hasSemesters = db.data.semesters && db.data.semesters.length > 0;
        const needsOnboarding = !hasDisplayName && !hasSemesters;

        if (needsOnboarding) {
            this.showModal('welcome-modal');
        }
    }, 800);
};

StudentProApp.prototype.applyTemplateToSemester = async function(semId, template) {
    for (let sub of template.subjects) {
        const subId = await db.addSubject(semId, sub.name, null, sub.has_exercises !== false);
        if (subId) {
            for (let ch of sub.chapters) await db.addChapter(subId, ch);
        }
    }
};

StudentProApp.prototype.refreshDate = function() {
    const el = get('current-date');
    if (!el) return;
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    el.textContent = new Date().toLocaleDateString(undefined, options);
};

StudentProApp.prototype.refreshLastSync = function() {
    const T = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];
    const pendingBreakdown = typeof db.getPendingSyncBreakdown === 'function'
        ? db.getPendingSyncBreakdown()
        : { uploads: typeof db.getPendingSyncCount === 'function' ? db.getPendingSyncCount() : 0, deletions: 0, total: typeof db.getPendingSyncCount === 'function' ? db.getPendingSyncCount() : 0 };
    const pending = pendingBreakdown.total;
    const fill = (template, values = {}) => String(template || '').replace(/\{(\w+)\}/g, (_, key) => (
        values[key] !== undefined ? String(values[key]) : ''
    ));

    let text = '';
    if (!auth.user || auth.user.id === 'offline-user') {
        text = T.sync_status_offline_local || 'Offline mode | saved on this device only';
    } else if (!navigator.onLine) {
        text = pending > 0
            ? fill(T.sync_status_offline_pending || 'Offline | {count} cloud change(s) queued', { count: pending })
            : (T.sync_status_offline_cloud || 'Offline | cloud sync paused');
    } else if (pending > 0) {
        text = fill(T.sync_status_pending || '{count} cloud change(s) waiting to sync', { count: pending });
    } else {
        text = fill(T.sync_status_synced || 'Last sync: {time}', {
            time: db.lastSync || T.never || 'Never'
        });
    }

    const el = get('last-sync-label');
    if (el) el.textContent = text;

    const settingsSyncStatus = get('settings-sync-status');
    if (settingsSyncStatus) settingsSyncStatus.textContent = text;
};

StudentProApp.prototype.getDailyReminderEnabled = function() {
    return db?.data?.settings?.reminders?.daily_enabled !== false;
};

StudentProApp.prototype.getDailyReminderHour = function() {
    const hour = Number(db?.data?.settings?.reminders?.daily_hour ?? 18);
    return Number.isFinite(hour) ? Math.max(0, Math.min(23, hour)) : 18;
};

StudentProApp.prototype.cancelDailyStudyReminder = async function() {
    const LocalNotifications = this._getLocalNotificationsPlugin?.();
    if (!LocalNotifications) return;

    try {
        await LocalNotifications.cancel({
            notifications: [{ id: DAILY_STUDY_REMINDER_NOTIFICATION_ID }]
        });
    } catch {
        try { await LocalNotifications.cancel({ ids: [DAILY_STUDY_REMINDER_NOTIFICATION_ID] }); } catch {}
    }
};

StudentProApp.prototype.getDailyReminderContent = function() {
    const T = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];
    const streak = typeof db.getStudyStreak === 'function' ? db.getStudyStreak() : 0;
    const dailyStats = typeof db.getDailyStudyStats === 'function'
        ? db.getDailyStudyStats()
        : { goal: 3 };
    const fill = (template, values = {}) => String(template || '').replace(/\{(\w+)\}/g, (_, key) => (
        values[key] !== undefined ? String(values[key]) : ''
    ));

    const title = streak > 0
        ? fill(T.daily_reminder_title_streak || 'Protect your {streak}-day streak', { streak })
        : (T.daily_reminder_title || 'Time for today\'s study session');
    const body = fill(
        T.daily_reminder_body || 'Start one focus session today and work toward your {goal}-session goal.',
        { goal: dailyStats.goal || 3, streak }
    );

    return { title, body };
};

StudentProApp.prototype.syncDailyStudyReminder = async function() {
    if (typeof Capacitor === 'undefined' || !Capacitor.isNativePlatform() || !this.getDailyReminderEnabled()) {
        await this.cancelDailyStudyReminder();
        return;
    }

    const LocalNotifications = this._getLocalNotificationsPlugin?.();
    if (!LocalNotifications) return;

    const dailyStats = typeof db.getDailyStudyStats === 'function'
        ? db.getDailyStudyStats()
        : { sessions: 0 };
    if (dailyStats.sessions > 0) {
        await this.cancelDailyStudyReminder();
        return;
    }

    let currentPerms = null;
    try {
        currentPerms = await LocalNotifications.checkPermissions();
    } catch {
        return;
    }
    if (currentPerms?.display !== 'granted') return;

    const now = new Date();
    const reminderAt = new Date(now);
    reminderAt.setHours(this.getDailyReminderHour(), 0, 0, 0);
    if (reminderAt <= now) {
        await this.cancelDailyStudyReminder();
        return;
    }

    const reminder = this.getDailyReminderContent();
    await this.cancelDailyStudyReminder();

    try {
        await LocalNotifications.schedule({
            notifications: [{
                id: DAILY_STUDY_REMINDER_NOTIFICATION_ID,
                title: reminder.title,
                body: reminder.body,
                schedule: { at: reminderAt, allowWhileIdle: true },
                extra: { kind: 'daily-study-reminder' }
            }]
        });
    } catch {
        try {
            await LocalNotifications.schedule({
                notifications: [{
                    id: DAILY_STUDY_REMINDER_NOTIFICATION_ID,
                    title: reminder.title,
                    body: reminder.body,
                    schedule: { at: reminderAt },
                    extra: { kind: 'daily-study-reminder' }
                }]
            });
        } catch (e) {
            console.warn('[App] Daily reminder scheduling failed:', e);
        }
    }
};

StudentProApp.prototype.applyTheme = function(t) {
    document.documentElement.setAttribute('data-theme', t);
    this.applyLoginScreenLanguage();
};

StudentProApp.prototype.showModal = function(id) {
    console.log(`[App] Showing modal: ${id}`);
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    const container = get('modal-container');
    if (container) container.classList.remove('hidden');
    const modal = get(id);
    if (modal) modal.classList.remove('hidden');
};

StudentProApp.prototype.closeModal = function(id) {
    console.log(`[App] Closing modal: ${id}`);
    const container = get('modal-container');
    if (container) container.classList.add('hidden');
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
};

StudentProApp.prototype.loadSettings = function() {
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
    const reminderSel = get('daily-reminder-select');
    if (reminderSel && db.data?.settings) {
        reminderSel.value = db.data.settings.reminders?.daily_enabled === false ? 'disabled' : 'enabled';
    }
};

StudentProApp.prototype.initCharts = function() { /* charts now built with pure CSS/HTML */ };
