StudentProApp.prototype.setupEventListeners = function() {
    console.log("[App] Setting up UI event listeners...");
    const get = id => document.getElementById(id);

    this.lastScrollTop = 0;
    const scrollThreshold = 15;
    const contentArea = get('content');
    if (contentArea) {
        contentArea.addEventListener('scroll', () => {
            if (window.innerWidth > 768) return;

            const st = contentArea.scrollTop;
            const bottomNav = get('mobile-bottom-nav');

            if (Math.abs(this.lastScrollTop - st) <= scrollThreshold) return;

            if (st > this.lastScrollTop && st > 100) {
                bottomNav?.classList.add('nav-hidden');
                if (!get('mobile-menu-sheet')?.classList.contains('hidden')) {
                    this.closeMobileMenu();
                }
            } else {
                bottomNav?.classList.remove('nav-hidden');
            }
            this.lastScrollTop = st <= 0 ? 0 : st;
        }, { passive: true });
    }

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

    get('close-login-btn')?.addEventListener('click', () => {
        get('login-screen').classList.add('hidden');
    });

    get('settings-signup-btn')?.addEventListener('click', () => {
        auth.showLogin('signup');
    });

    get('settings-signin-btn')?.addEventListener('click', () => {
        auth.showLogin('login');
    });

    get('open-help-guide-btn')?.addEventListener('click', () => {
        this.showModal('help-guide-modal');
    });

    get('close-help-guide-btn')?.addEventListener('click', () => this.closeModal('help-guide-modal'));
    get('help-guide-done-btn')?.addEventListener('click', () => this.closeModal('help-guide-modal'));

    get('settings-sync-btn')?.addEventListener('click', async () => {
        try {
            showToast((TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"]).syncing || "Syncing...", 'info', 2000);
            await db.syncPendingChanges();
            await db.syncFromCloud();
            this.refreshAll();
            showToast((TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"]).toast_sync_ok || "Synced! ☁️", 'success');
        } catch (e) {
            showToast("Sync failed", 'error');
        }
    });

    get('settings-signout-btn')?.addEventListener('click', () => {
        if (confirm("Sign out and return to offline mode?")) {
            auth.signOut();
        }
    });

    get('logout-btn')?.addEventListener('click', () => {
        if (confirm("Sign out?")) {
            auth.signOut();
        }
    });

    get('mobile-logout-btn')?.addEventListener('click', () => {
        if (auth.user && auth.user.id !== 'offline-user') {
            if (confirm("Sign out?")) auth.signOut();
        } else {
            this.switchTab('settings');
            auth.showLogin('login');
        }
    });

    document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            this.switchTab(btn.dataset.tab);
        });
    });

    document.querySelectorAll('.mobile-nav-btn[data-tab], .mobile-menu-item[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            this.switchTab(btn.dataset.tab);
        });
    });

    document.querySelectorAll('.planner-filter-btn[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (typeof this.setPlannerFilter === 'function') {
                this.setPlannerFilter(btn.dataset.filter);
            }
        });
    });

    get('mobile-menu-trigger')?.addEventListener('click', () => {
        if (get('mobile-menu-sheet')?.classList.contains('hidden')) {
            this.openMobileMenu();
        } else {
            this.closeMobileMenu();
        }
    });

    get('mobile-menu-close')?.addEventListener('click', () => this.closeMobileMenu());
    get('mobile-menu-backdrop')?.addEventListener('click', () => this.closeMobileMenu());

    get('mobile-menu-logout')?.addEventListener('click', () => {
        this.closeMobileMenu();
        if (confirm("Sign out?")) {
            auth.signOut();
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) this.closeMobileMenu();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.closeMobileMenu();
    });

    document.querySelectorAll('.lb-seg[data-period]').forEach(btn => {
        btn.addEventListener('click', () => {
            this.leaderboardScope = btn.dataset.period;
            this.refreshLeaderboard();
        });
    });

    get('start-challenge-btn')?.addEventListener('click', () => {
        this.switchTab('pomodoro');
        if (typeof this.applyRecommendedPomodoroSubject === 'function') {
            this.applyRecommendedPomodoroSubject();
        }
    });

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
        const form = get('add-subject-form');
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

    get('rm-add-btn')?.addEventListener('click', () => {
        this.addResource();
    });

    get('rm-save-btn')?.addEventListener('click', async () => {
        if (this.activeChapterId) {
            await db.updateChapterResources(this.activeChapterId, this.currentResources);
            this.refreshSubjectWindowData();
            this.refreshPlanner();
        }
        this.closeModal('resource-manager-modal');
    });

    get('close-rm-modal')?.addEventListener('click', () => {
        this.closeModal('resource-manager-modal');
    });

    get('timer-start')?.addEventListener('click', () => {
        this.toggleTimer();
    });

    get('timer-reset')?.addEventListener('click', () => {
        this.resetTimer();
    });

    document.querySelectorAll('.pomodoro-preset-btn[data-focus-minutes]').forEach(btn => {
        btn.addEventListener('click', () => {
            this.setPomodoroFocusPreset(btn.dataset.focusMinutes);
        });
    });

    get('skip-break-btn')?.addEventListener('click', () => {
        this.skipBreak();
    });

    get('add-break-minute-btn')?.addEventListener('click', () => {
        this.extendBreak(1);
    });

    get('start-next-focus-btn')?.addEventListener('click', () => {
        this.startNextFocus();
    });

    get('pomodoro-use-suggestion-btn')?.addEventListener('click', () => {
        const suggestion = typeof this.getPomodoroTaskSuggestion === 'function'
            ? this.getPomodoroTaskSuggestion()
            : null;
        if (suggestion?.subjectId) {
            this.setPomodoroSubject(suggestion.subjectId);
            this.refreshPomodoroUI();
        }
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
        const nextThemeMode = this.normalizeThemeMode?.(e.target.value) || e.target.value;
        if (db && db.data && db.data.settings) {
            db.data.settings.theme = nextThemeMode;
            db.save();
        }
        this.applyTheme(nextThemeMode);
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
            const result = await db.syncFromCloud();
            if (!result) {
                showToast(
                    (TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"]).toast_sync_blocked_pending
                        || "Upload your pending cloud changes before downloading.",
                    'warning'
                );
                this.refreshLastSync();
                return;
            }
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
            settings: {
                lang: 'English',
                theme: 'Light',
                sync_mode: 'Automatic',
                pomodoro: { work: 25, short: 5, long: 15 },
                reminders: { daily_enabled: true, daily_hour: 18 }
            },
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

    get('daily-reminder-select')?.addEventListener('change', (e) => {
        if (db && db.data && db.data.settings) {
            if (!db.data.settings.reminders) db.data.settings.reminders = {};
            db.data.settings.reminders.daily_enabled = e.target.value === 'enabled';
            db.save();
            void this.syncDailyStudyReminder();
            this.refreshLastSync();
        }
    });

    get('manual-sync-btn')?.addEventListener('click', async () => {
        try {
            const uploadOk = await db.syncPendingChanges();
            const downloadOk = uploadOk ? await db.syncFromCloud() : false;
            if (!downloadOk) {
                showToast(
                    (TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"]).toast_sync_blocked_pending
                        || "Upload your pending cloud changes before downloading.",
                    'warning'
                );
                this.refreshLastSync();
                return;
            }
            this.refreshAll();
            showToast((TRANSLATIONS[this.selectedLang]||TRANSLATIONS["English"]).toast_sync_ok || "Synced! ☁️", 'success');
            this.refreshLastSync();
        } catch (e) { showToast((TRANSLATIONS[this.selectedLang]||TRANSLATIONS["English"]).toast_sync_fail || "Sync failed.", 'error'); }
    });

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

        if (db && db.data) {
            db.data.settings.lang = this.selectedLang;
            db.save();
        }

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
};
