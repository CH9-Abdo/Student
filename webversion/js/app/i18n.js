StudentProApp.prototype.loadLanguagePreference = function() {
    const savedLang = localStorage.getItem('studentpro_lang');
    if (savedLang && TRANSLATIONS[savedLang]) {
        this.selectedLang = savedLang;
    } else if (db && db.data && db.data.settings && db.data.settings.lang) {
        this.selectedLang = db.data.settings.lang;
    }
};

StudentProApp.prototype.applyLoginScreenLanguage = function() {
    this.updateLanguage();
};

StudentProApp.prototype.updateLanguage = function() {
    console.log(`[App] Translating UI to: ${this.selectedLang}`);
    const T = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];

    const t = (id, key, attr) => {
        const el = get(id);
        if (!el || !T[key]) return;
        if (attr === 'placeholder' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.placeholder = T[key];
        } else {
            el.textContent = T[key];
        }
    };

    t('login-title',        'login_title');
    t('login-desc',         'login_desc');
    t('login-email',        'login_email_placeholder');
    t('login-password',     'login_password_placeholder');
    t('do-login-btn',       'login_btn');
    t('do-signup-btn',      'signup_btn');
    t('tab-login',          'tab_login');
    t('tab-signup',         'tab_signup');
    t('work-offline-btn',   'work_offline');

    const navMap = { dashboard:'dashboard', planner:'planner', pomodoro:'pomodoro', analytics:'analytics', leaderboard:'leaderboard', settings:'settings' };
    document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
        const key  = navMap[btn.dataset.tab];
        const span = btn.querySelector('.nav-text');
        if (span && key && T[key]) span.textContent = T[key];
    });
    const mobileDashboardLabel = get('mobile-nav-dashboard-label');
    if (mobileDashboardLabel && T.dashboard) mobileDashboardLabel.textContent = T.dashboard;

    const mobilePomodoroLabel = get('mobile-nav-pomodoro-label');
    if (mobilePomodoroLabel && T.pomodoro) mobilePomodoroLabel.textContent = T.pomodoro;

    const mobileMenuLabel = get('mobile-nav-menu-label');
    if (mobileMenuLabel) mobileMenuLabel.textContent = T.menu || 'Menu';

    const mobileMenuTitle = get('mobile-menu-title');
    if (mobileMenuTitle) mobileMenuTitle.textContent = T.menu || 'Menu';

    const mobileMenuEyebrow = get('mobile-menu-eyebrow');
    if (mobileMenuEyebrow) mobileMenuEyebrow.textContent = T.quick_access || 'Quick access';

    document.querySelectorAll('.mobile-menu-item[data-tab]').forEach(btn => {
        const key = navMap[btn.dataset.tab];
        const span = btn.querySelector('.mobile-menu-item-label');
        if (span && key && T[key]) span.textContent = T[key];
    });

    const mobileLogoutLabel = get('mobile-menu-logout-label');
    if (mobileLogoutLabel && T.logout) mobileLogoutLabel.textContent = T.logout;

    const logoutSpan = get('logout-btn')?.querySelector('.nav-text');
    if (logoutSpan && T.logout) logoutSpan.textContent = T.logout;

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
    t('planner-filter-label', 'filter_by');
    t('planner-filter-all', 'all_filter');
    t('planner-filter-course', 'course_left');
    t('planner-filter-exercises', 'exercises_left');
    t('planner-filter-done', 'done_filter');

    const typeInput = get('subject-type-input');
    if (typeInput && typeInput.options.length >= 2) {
        typeInput.options[0].textContent = T.with_exercises || 'Has Exercises';
        typeInput.options[1].textContent = T.course_only || 'Course Only';
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

    const anCards = document.querySelectorAll('.an-card-title');
    const anTitles = [
        T.subject_progress || 'Subject Progress',
        T.weekly_sessions || 'Weekly Sessions',
        T.exam_countdown || 'Exam Countdown',
        T.time_per_subject || 'Time per Subject'
    ];
    anCards.forEach((el, i) => { if (anTitles[i]) el.textContent = anTitles[i]; });

    const anHeader = document.querySelector('#analytics .h1');
    if (anHeader) anHeader.textContent = T.analytics || 'Analytics';

    t('timer-status', 'focus_time');
    t('smart-suggestion', 'smart_suggestion');
    const subjectSel = get('active-subject-selector');
    if (subjectSel?.options.length > 0) subjectSel.options[0].textContent = T.select_subject || 'Select Subject';
    t('pomodoro-chapter-label', 'chapter_label');

    const timerStartBtn = get('timer-start');
    if (timerStartBtn && typeof this._setPomodoroPrimaryButton === 'function' && !timerStartBtn.classList.contains('running')) {
        this._setPomodoroPrimaryButton('start');
    }

    t('pomodoro-preset-label', 'quick_focus');
    t('pomodoro-summary-title', 'selected_subject_label');

    const skipBreakBtn = get('skip-break-btn');
    if (skipBreakBtn) skipBreakBtn.innerHTML = `<i class="fas fa-forward"></i> ${T.skip_break || 'Skip Break'}`;

    const addBreakMinuteBtn = get('add-break-minute-btn');
    if (addBreakMinuteBtn) addBreakMinuteBtn.innerHTML = `<i class="fas fa-plus"></i> ${T.add_minute || '+1 min'}`;

    const startNextFocusBtn = get('start-next-focus-btn');
    if (startNextFocusBtn) startNextFocusBtn.innerHTML = `<i class="fas fa-play"></i> ${T.start_next_focus || 'Start Next Focus'}`;

    const useSuggestionBtn = get('pomodoro-use-suggestion-btn');
    if (useSuggestionBtn) useSuggestionBtn.innerHTML = `<i class="fas fa-bolt"></i> ${T.use_suggestion || 'Use Suggestion'}`;

    t('lang-select-label', 'language');
    t('theme-label', 'theme');
    t('sync-mode-label', 'sync_mode');
    t('daily-reminder-label', 'daily_reminder');
    t('sync-status-label', 'sync_status');
    t('daily-reminder-help', 'daily_reminder_help');

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

    t('acc-name-label', 'name');
    t('acc-email-label', 'email');
    t('acc-progress-label', 'progress');

    const uploadText = get('upload-btn-text');
    if (uploadText) uploadText.textContent = T.upload_btn || T.upload || 'Upload';
    const downloadText = get('download-btn-text');
    if (downloadText) downloadText.textContent = T.download_btn || T.download || 'Download';

    const themeOptAuto = get('theme-opt-auto');
    if (themeOptAuto) themeOptAuto.textContent = T.auto_theme || 'Auto';
    const themeOptLight = get('theme-opt-light');
    if (themeOptLight) themeOptLight.textContent = T.light_theme || '☀️ Light';
    const themeOptDark = get('theme-opt-dark');
    if (themeOptDark) themeOptDark.textContent = T.dark_theme || '🌙 Dark';

    const syncOptAuto = get('sync-opt-auto');
    if (syncOptAuto) syncOptAuto.textContent = T.sync_auto || T.automatic || 'Automatic';
    const syncOptManual = get('sync-opt-manual');
    if (syncOptManual) syncOptManual.textContent = T.sync_manual || T.manual || 'Manual';
    const dailyReminderOn = get('daily-reminder-on');
    if (dailyReminderOn) dailyReminderOn.textContent = T.daily_reminder_on || 'On';
    const dailyReminderOff = get('daily-reminder-off');
    if (dailyReminderOff) dailyReminderOff.textContent = T.daily_reminder_off || 'Off';

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

    t('sw-chapter-input', 'add_chapter_placeholder');
    const swModalTitle = document.querySelector('#subject-window-modal .modal-title');
    if (swModalTitle) swModalTitle.textContent = T.chapter_manager || 'Chapter Manager';

    const lbTitle = document.querySelector('#leaderboard .h1');
    if (lbTitle) lbTitle.textContent = T.leaderboard || 'Leaderboard';

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (T[key]) el.textContent = T[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (T[key]) el.placeholder = T[key];
    });

    const isRTL = this.selectedLang === 'Arabic';
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.body.classList.toggle('rtl', isRTL);

    this.refreshDashboard();
    this.refreshSubjects();
    this.refreshAnalytics();
};
