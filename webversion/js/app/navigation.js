StudentProApp.prototype.switchTab = function(tabId) {
    console.log(`[App] Switching to tab: ${tabId}`);
    this.currentTab = tabId;
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    const target = get(tabId);
    if (target) target.classList.add('active');
    this.closeMobileMenu(false);
    this.updateNavigationState(tabId);

    if (tabId === 'pomodoro' && typeof this.preparePomodoroForEntry === 'function') {
        this.preparePomodoroForEntry();
    }
    if (tabId === 'leaderboard') this.refreshLeaderboard();
    this.refreshAll();
    this.scrollActiveTabToTop(target);
};

StudentProApp.prototype.scrollActiveTabToTop = function(target = null) {
    const content = get('content');
    if (content) {
        content.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }

    if (target && typeof target.scrollTo === 'function') {
        target.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }

    try { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); } catch {}
    try { document.documentElement.scrollTop = 0; } catch {}
    try { document.body.scrollTop = 0; } catch {}
};

StudentProApp.prototype.updateNavigationState = function(tabId = this.currentTab) {
    document.querySelectorAll('.nav-btn, .mobile-nav-btn, .mobile-menu-item').forEach(btn => {
        btn.classList.remove('active');
    });

    document.querySelectorAll(`.nav-btn[data-tab="${tabId}"], .mobile-nav-btn[data-tab="${tabId}"], .mobile-menu-item[data-tab="${tabId}"]`).forEach(btn => {
        btn.classList.add('active');
    });

    const mobileMenuTrigger = get('mobile-menu-trigger');
    if (mobileMenuTrigger && !['dashboard', 'pomodoro'].includes(tabId)) {
        mobileMenuTrigger.classList.add('active');
    }
};

StudentProApp.prototype.openMobileMenu = function() {
    if (window.innerWidth > 768) return;
    get('mobile-menu-backdrop')?.classList.remove('hidden');
    get('mobile-menu-sheet')?.classList.remove('hidden');
    get('mobile-menu-trigger')?.setAttribute('aria-expanded', 'true');
    this.updateNavigationState(this.currentTab);
    get('mobile-menu-trigger')?.classList.add('active');
};

StudentProApp.prototype.closeMobileMenu = function(restoreNavState = true) {
    get('mobile-menu-backdrop')?.classList.add('hidden');
    get('mobile-menu-sheet')?.classList.add('hidden');
    get('mobile-menu-trigger')?.setAttribute('aria-expanded', 'false');
    if (restoreNavState) this.updateNavigationState(this.currentTab);
};

StudentProApp.prototype.refreshAll = function() {
    const T = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];
    this.refreshDashboard();
    this.refreshPlanner();
    this.refreshAnalytics();
    this.refreshPomodoroSubjects();
    if (typeof this.refreshPomodoroUI === 'function') this.refreshPomodoroUI();
    this.refreshLastSync();
    void this.syncDailyStudyReminder();
    this.updateMiniChallenge();

    const nameDisp = get('acc-display-name');
    if (nameDisp) nameDisp.textContent = db.data?.user_profile?.display_name || "Student";

    const emailDisp = get('acc-email');
    if (emailDisp && auth.user) {
        emailDisp.textContent = auth.user.id === 'offline-user' ? 'Working Offline' : auth.user.email;
    }

    const isOffline = !auth.user || auth.user.id === 'offline-user';
    const offlineCard = get('settings-offline-state');
    const onlineCard = get('settings-logged-in-state');
    if (offlineCard) offlineCard.classList.toggle('hidden', !isOffline);
    if (onlineCard) onlineCard.classList.toggle('hidden', isOffline);

    const mobileLogoutBtn = get('mobile-logout-btn');
    if (mobileLogoutBtn) {
        const icon = mobileLogoutBtn.querySelector('i');
        if (icon) {
            icon.className = isOffline ? 'fas fa-cloud-upload-alt' : 'fas fa-sign-out-alt';
        }
        mobileLogoutBtn.title = isOffline ? 'Connect Cloud' : 'Logout';
    }

    const sidebarEmail = get('sidebar-user-email');
    if (sidebarEmail) {
        sidebarEmail.textContent = (auth.user && auth.user.id !== 'offline-user') ? `👤 ${auth.user.email}` : "👤 Guest Mode";
    }

    const accStats = get('acc-stats');
    if (accStats && db.data?.user_profile) {
        const level = db.data.user_profile.level || 1;
        const title = typeof db?.getLevelTitle === 'function'
            ? db.getLevelTitle(level, this.selectedLang)
            : (T.student || 'Student');
        accStats.textContent = `${T.level_label || T.level || 'Level'} ${level} | ${title}`;
    }
};
