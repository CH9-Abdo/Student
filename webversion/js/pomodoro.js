// Pomodoro Timer Logic
//
// Android/WebView backgrounding note:
// JS timers (setInterval) can be throttled/suspended when the app is backgrounded.
// For correctness, use a persisted end timestamp and reconcile on resume/focus.
// For a true "works in background" finish alert, schedule a native Local Notification
// when the @capacitor/local-notifications plugin is installed.

const POMODORO_STATE_KEY = 'studentpro_pomodoro_state_v1';
const POMODORO_FOCUS_END_NOTIFICATION_ID = 9125;
const POMODORO_BREAK_END_NOTIFICATION_ID = 9126;
const POMODORO_XP_PER_MINUTE = 2;
const POMODORO_END_SOUND_CANDIDATES = [
    'assets/sounds/clock_1.mp3',
    'assets/sounds/clock1.mp3',
    'assets/sounds/clock 1.mp3',
    'assets/sounds/clock%201.mp3',
    'assets/sounds/Clock 1.mp3',
    'assets/sounds/Clock%201.mp3'
];

StudentProApp.prototype._loadPomodoroState = function() {
    try {
        const raw = localStorage.getItem(POMODORO_STATE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.v !== 1) return null;
        return parsed;
    } catch {
        return null;
    }
};

StudentProApp.prototype._savePomodoroState = function(state) {
    try {
        localStorage.setItem(POMODORO_STATE_KEY, JSON.stringify(state));
    } catch (e) {
        console.warn("[App] Pomodoro: failed to persist state:", e);
    }
};

StudentProApp.prototype._clearPomodoroState = function() {
    try { localStorage.removeItem(POMODORO_STATE_KEY); } catch {}
};

StudentProApp.prototype._getLocalNotificationsPlugin = function() {
    if (typeof Capacitor === 'undefined') return null;
    const plugins = Capacitor.Plugins || {};
    return plugins.LocalNotifications || null;
};

StudentProApp.prototype._ensurePomodoroNotificationsPermission = async function() {
    if (this._pomodoroNotifPermChecked) return this._pomodoroNotifPermGranted === true;
    this._pomodoroNotifPermChecked = true;
    this._pomodoroNotifPermGranted = false;

    const LocalNotifications = this._getLocalNotificationsPlugin();
    if (!LocalNotifications) return false;

    try {
        const current = await LocalNotifications.checkPermissions();
        if (current?.display === 'granted') {
            this._pomodoroNotifPermGranted = true;
            return true;
        }
        const requested = await LocalNotifications.requestPermissions();
        this._pomodoroNotifPermGranted = requested?.display === 'granted';
        return this._pomodoroNotifPermGranted;
    } catch (e) {
        console.warn("[App] Pomodoro: notification permission check failed:", e);
        return false;
    }
};

StudentProApp.prototype._cancelPomodoroEndNotification = async function() {
    const LocalNotifications = this._getLocalNotificationsPlugin();
    if (!LocalNotifications) return;
    try {
        await LocalNotifications.cancel({
            notifications: [
                { id: POMODORO_FOCUS_END_NOTIFICATION_ID },
                { id: POMODORO_BREAK_END_NOTIFICATION_ID }
            ]
        });
    } catch {
        // Payload shape differs slightly across versions.
        try { await LocalNotifications.cancel({ ids: [POMODORO_FOCUS_END_NOTIFICATION_ID, POMODORO_BREAK_END_NOTIFICATION_ID] }); } catch {}
    }
};

StudentProApp.prototype._schedulePomodoroEndNotification = async function(kind, endAtMs) {
    const LocalNotifications = this._getLocalNotificationsPlugin();
    if (!LocalNotifications) return;

    const allowed = await this._ensurePomodoroNotificationsPermission();
    if (!allowed) return;

    const isBreak = kind === 'break';
    const id = isBreak ? POMODORO_BREAK_END_NOTIFICATION_ID : POMODORO_FOCUS_END_NOTIFICATION_ID;
    const notification = this._getPomodoroNotificationContent(kind);

    try {
        await this._cancelPomodoroEndNotification();
        const baseNotif = {
            id,
            title: notification.title,
            body: notification.body,
            extra: notification.extra
        };

        try {
            await LocalNotifications.schedule({
                notifications: [{
                    ...baseNotif,
                    schedule: { at: new Date(endAtMs), allowWhileIdle: true }
                }]
            });
        } catch {
            // Older plugin versions may not support allowWhileIdle.
            await LocalNotifications.schedule({
                notifications: [{
                    ...baseNotif,
                    schedule: { at: new Date(endAtMs) }
                }]
            });
        }
    } catch (e) {
        console.warn("[App] Pomodoro: failed to schedule notification:", e);
    }
};

StudentProApp.prototype._getFocusDurationSec = function() {
    const overrideMins = Number(this._pomodoroFocusPresetMinutes || 0);
    if (Number.isFinite(overrideMins) && overrideMins > 0) {
        return Math.max(1, overrideMins) * 60;
    }
    const workMins = db.data?.settings?.pomodoro?.work || 25;
    return Math.max(1, Number(workMins) || 25) * 60;
};

StudentProApp.prototype._getBreakDurationSec = function() {
    // Default to 5 minutes unless settings specify otherwise.
    const breakMins = db.data?.settings?.pomodoro?.short || 5;
    return Math.max(1, Number(breakMins) || 5) * 60;
};

StudentProApp.prototype._getPomodoroXpForMinutes = function(minutes) {
    const safeMinutes = Math.max(0, Number(minutes) || 0);
    return safeMinutes * POMODORO_XP_PER_MINUTE;
};

StudentProApp.prototype._getPomodoroSubjectName = function(subjectId) {
    if (!subjectId) return '';
    const subject = db.data?.subjects?.find(s => s.id === subjectId);
    return typeof subject?.name === 'string' ? subject.name.trim() : '';
};

StudentProApp.prototype._fillPomodoroTemplate = function(template, values = {}) {
    let text = String(template || '');
    for (const [key, value] of Object.entries(values)) {
        text = text.split(`{${key}}`).join(String(value ?? ''));
    }
    return text;
};

StudentProApp.prototype._getPomodoroNotificationContent = function(kind) {
    const T = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];

    if (kind === 'break') {
        return {
            title: T.break_resume_title || T.break_over_title || 'Break Finished',
            body: T.break_resume_body || T.break_over_body || 'Break is over. Return to focus now.',
            extra: { kind: 'pomodoro-break-end' }
        };
    }

    const focusMinutes = Math.max(1, Math.round((this._pomodoroTotalSec || this._getFocusDurationSec()) / 60));
    const breakMinutes = Math.max(1, Math.round(this._getBreakDurationSec() / 60));
    const xpEarned = this._getPomodoroXpForMinutes(focusMinutes);
    const subjectId = this._pomodoroSubjectId ?? this.activeSubjectId ?? null;
    const subjectName = this._getPomodoroSubjectName(subjectId);
    const bodyTemplate = subjectName
        ? (T.pomodoro_complete_body_subject || '{subject} done. +{xp} XP earned. Break for {minutes} min.')
        : (T.pomodoro_complete_body_generic || 'Focus session done. Select a subject next time to earn XP. Break for {minutes} min.');

    return {
        title: T.pomodoro_focus_complete_title || T.pomodoro_complete_title || 'Focus Complete',
        body: this._fillPomodoroTemplate(bodyTemplate, {
            subject: subjectName,
            xp: xpEarned,
            minutes: breakMinutes
        }),
        extra: {
            kind: 'pomodoro-focus-end',
            subjectId,
            subjectName,
            xpEarned,
            focusMinutes,
            breakMinutes
        }
    };
};

StudentProApp.prototype._setPomodoroStatus = function(kind) {
    this._pomodoroKind = kind;
    const el = get('timer-status');
    if (!el) return;
    const T = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];
    el.textContent = kind === 'break'
        ? (T.break_time || 'Break Time')
        : (T.focus_time || 'Focus Time');
};

StudentProApp.prototype._setPomodoroPrimaryButton = function(mode) {
    const btn = get('timer-start');
    if (!btn) return;

    const T = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];
    const states = {
        start: { icon: 'fa-play', label: T.start_focus || 'Start Focus', running: false },
        pause: { icon: 'fa-pause', label: T.pause || 'Pause', running: true },
        resume: { icon: 'fa-play', label: T.resume || 'Resume', running: false }
    };
    const state = states[mode] || states.start;
    btn.innerHTML = `<i class="fas ${state.icon}"></i> ${state.label}`;
    btn.classList.toggle('running', state.running);
};

StudentProApp.prototype._playPomodoroEndSound = async function() {
    // Audio playback may be blocked in background; try best-effort.
    try {
        for (const src of POMODORO_END_SOUND_CANDIDATES) {
            try {
                const audio = new Audio(src);
                audio.volume = 1.0;
                await audio.play();
                return true;
            } catch {
                // try next candidate
            }
        }
        console.warn("[App] Pomodoro: end sound not found or playback blocked. Expected one of:", POMODORO_END_SOUND_CANDIDATES);
        return false;
    } catch (e) {
        console.warn("[App] Pomodoro: end sound error:", e);
        return false;
    }
};

StudentProApp.prototype._computePomodoroRemaining = function(endAtMs) {
    const remainingMs = endAtMs - Date.now();
    return Math.max(0, Math.ceil(remainingMs / 1000));
};

StudentProApp.prototype._startPomodoroUiTick = function() {
    clearInterval(this.timer);
    this.timer = setInterval(() => {
        const state = this._loadPomodoroState();
        if (!state?.running || !state.endAtMs) {
            clearInterval(this.timer);
            return;
        }

        this.timeLeft = this._computePomodoroRemaining(state.endAtMs);
        this._pomodoroTotalSec = state.totalSec || this._pomodoroTotalSec;
        this._pomodoroSubjectId = state.subjectId ?? this._pomodoroSubjectId;
        this._setPomodoroStatus(state.kind || this._pomodoroKind || 'focus');
        this.updateTimerDisplay();

        if (this.timeLeft <= 0) this.completeSession({ fromBackground: false });
    }, 1000);
};

StudentProApp.prototype._reconcilePomodoro = async function() {
    const state = this._loadPomodoroState();
    if (!state) return;

    this._pomodoroTotalSec = state.totalSec || this._pomodoroTotalSec;
    this._pomodoroSubjectId = state.subjectId ?? this._pomodoroSubjectId;

    if (state.running && state.endAtMs) {
        this.timerRunning = true;
        this.timeLeft = this._computePomodoroRemaining(state.endAtMs);
        this._setPomodoroStatus(state.kind || 'focus');
        this.updateTimerDisplay();

        const btn = get('timer-start');
        if (btn) this._setPomodoroPrimaryButton('pause');

        if (this.timeLeft <= 0) {
            await this.completeSession({ fromBackground: true });
            return;
        }

        if (!document.hidden) this._startPomodoroUiTick();
        return;
    }

    // Paused state
    this.timerRunning = false;
    this.timeLeft = Math.max(0, state.remainingSec || 0);
    this._setPomodoroStatus(state.kind || 'focus');
    this.updateTimerDisplay();
    this._setPomodoroPrimaryButton('resume');
};

StudentProApp.prototype.initPomodoro = function() {
    // Restore state after reload/reopen.
    this._reconcilePomodoro();

    // When coming back to foreground, reconcile and restart UI ticking.
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) this._reconcilePomodoro();
    });
    window.addEventListener('focus', () => this._reconcilePomodoro());
};

StudentProApp.prototype.toggleTimer = function() {
    const kind = this._pomodoroKind || this._loadPomodoroState()?.kind || 'focus';
    const totalSec = kind === 'break'
        ? (this._pomodoroTotalSec || this._getBreakDurationSec())
        : (this._pomodoroTotalSec || this._getFocusDurationSec());

    if (this.timerRunning) {
        // Pause
        const state = this._loadPomodoroState();
        const remainingSec = state?.endAtMs ? this._computePomodoroRemaining(state.endAtMs) : this.timeLeft;

        clearInterval(this.timer);
        this.timerRunning = false;
        this.timeLeft = Math.max(0, remainingSec);
        this.updateTimerDisplay();

        this._savePomodoroState({
            v: 1,
            running: false,
            endAtMs: null,
            remainingSec: this.timeLeft,
            totalSec,
            subjectId: kind === 'focus' ? (this._pomodoroSubjectId ?? this.activeSubjectId ?? null) : null,
            kind
        });
        this._cancelPomodoroEndNotification();

        this._setPomodoroPrimaryButton('resume');
        return;
    }

    // Start / resume
    this._pomodoroTotalSec = totalSec;
    this._pomodoroSubjectId = kind === 'focus' ? (this._pomodoroSubjectId ?? this.activeSubjectId ?? null) : null;
    this._setPomodoroStatus(kind);

    const endAtMs = Date.now() + (this.timeLeft * 1000);
    this._savePomodoroState({
        v: 1,
        running: true,
        endAtMs,
        remainingSec: null,
        totalSec,
        subjectId: this._pomodoroSubjectId,
        kind
    });

    this.timerRunning = true;
    this._setPomodoroPrimaryButton('pause');

    this._schedulePomodoroEndNotification(kind, endAtMs);
    this._startPomodoroUiTick();
};

StudentProApp.prototype.resetTimer = function() {
    clearInterval(this.timer);
    this.timerRunning = false;

    this._setPomodoroStatus('focus');
    this.timeLeft = this._getFocusDurationSec();
    this._pomodoroTotalSec = this.timeLeft;
    this._pomodoroSubjectId = null;

    this.updateTimerDisplay();
    this._cancelPomodoroEndNotification();
    this._clearPomodoroState();

    this._setPomodoroPrimaryButton('start');
};

StudentProApp.prototype.updateTimerDisplay = function() {
    const m = Math.floor(this.timeLeft / 60);
    const s = this.timeLeft % 60;
    const display = get('timer-display');
    if (display) display.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    // Update SVG circle progress
    const path = document.querySelector('.timer-path');
    if (path) {
        const total = this._pomodoroTotalSec || ((db.data?.settings?.pomodoro?.work || 25) * 60);
        const progress = total > 0 ? (this.timeLeft / total) : 0;
        const circumference = 283;
        path.style.strokeDashoffset = circumference * (1 - progress);
    }
};

StudentProApp.prototype.completeSession = async function(opts = {}) {
    await this._cancelPomodoroEndNotification();
    this._clearPomodoroState();
    clearInterval(this.timer);
    this.timerRunning = false;

    const completedKind = this._pomodoroKind || 'focus';

    if (completedKind === 'break') {
        // Break finished: start next focus automatically (continuous cycle).
        const T = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];
        showToast(T.toast_break_finished || "✅ Break finished. Ready to focus.", 'info', 3500);
        this.startNextFocus();
        return;
    }

    // Focus finished: play sound, award XP, then start break automatically.
    this._playPomodoroEndSound();
    const workMins = Math.max(1, Math.round((this._pomodoroTotalSec || this._getFocusDurationSec()) / 60));
    const xpEarned = this._getPomodoroXpForMinutes(workMins);
    const subjectId = this._pomodoroSubjectId ?? this.activeSubjectId ?? null;
    let totalXpAwarded = 0;

    if (subjectId) {
        const sessionResult = await db.completeFocusSession({
            subjectId,
            durationMinutes: workMins,
            completedAt: new Date()
        });
        totalXpAwarded = Number(sessionResult?.xpAwarded || 0) || 0;
    }

    // Start break immediately
    const breakSec = this._getBreakDurationSec();
    const breakMins = Math.round(breakSec / 60);
    {
        const T = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];
        const tmpl = T.toast_session_done_break || "Session Done! +{xp} XP • Break: {minutes} min";
        showToast(
            String(tmpl)
                .replace('{xp}', String(totalXpAwarded))
                .replace('{minutes}', String(breakMins)),
            'success',
            4500
        );
    }
    this._setPomodoroStatus('break');
    this._pomodoroTotalSec = breakSec;
    this.timeLeft = breakSec;
    this._pomodoroSubjectId = null;

    const endAtMs = Date.now() + (breakSec * 1000);
    this._savePomodoroState({
        v: 1,
        running: true,
        endAtMs,
        remainingSec: null,
        totalSec: breakSec,
        subjectId: null,
        kind: 'break'
    });
    this.timerRunning = true;
    this._setPomodoroPrimaryButton('pause');

    this._schedulePomodoroEndNotification('break', endAtMs);
    this._startPomodoroUiTick();
    this.refreshAll();
};

StudentProApp.prototype.setPomodoroFocusPreset = function(minutes) {
    const parsed = Number(minutes);
    if (!Number.isFinite(parsed) || parsed <= 0) return false;

    this._pomodoroFocusPresetMinutes = parsed;

    const state = this._loadPomodoroState?.();
    const currentKind = this._pomodoroKind || state?.kind || 'focus';
    if (!this.timerRunning && currentKind === 'focus') {
        this.timeLeft = parsed * 60;
        this._pomodoroTotalSec = this.timeLeft;
        if (state && !state.running) {
            this._savePomodoroState({
                ...state,
                kind: 'focus',
                totalSec: this.timeLeft,
                remainingSec: this.timeLeft,
                subjectId: state.subjectId ?? this.activeSubjectId ?? null
            });
        }
        this.updateTimerDisplay();
    }

    this.refreshPomodoroUI();
    return true;
};

StudentProApp.prototype._getNextTaskForSubject = function(subjectId) {
    const sub = db.data.subjects.find(s => s.id === subjectId);
    if (!sub) return null;

    const hasExercises = sub.has_exercises !== false;
    const chapters = db.data.chapters.filter(c => c.subject_id === subjectId);
    for (const chapter of chapters) {
        if (!chapter.video_completed) {
            return { type: 'course', chapterName: chapter.name };
        }
        if (hasExercises && !chapter.exercises_completed) {
            return { type: 'exercises', chapterName: chapter.name };
        }
    }

    return null;
};

StudentProApp.prototype.getPomodoroTaskSuggestion = function() {
    if (this.activeSubjectId) {
        const subject = db.data.subjects.find(s => s.id === this.activeSubjectId);
        if (!subject) return null;
        return {
            source: 'selected',
            subjectId: subject.id,
            subjectName: subject.name,
            nextTask: this._getNextTaskForSubject(subject.id)
        };
    }

    const recommendation = typeof db.getAdvancedRecommendation === 'function'
        ? db.getAdvancedRecommendation()
        : null;
    if (!recommendation) return null;

    return {
        source: 'suggested',
        subjectId: recommendation.subjectId,
        subjectName: recommendation.subjectName,
        nextTask: recommendation.nextTask,
        reasonKey: recommendation.reasonKey,
        reasonVars: recommendation.reasonVars
    };
};

StudentProApp.prototype.refreshPomodoroSubjects = function() {
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
        this.setPomodoroSubject(e.target.value || null);
    };
};

StudentProApp.prototype.setPomodoroSubject = function(subjectId) {
    const selector = get('active-subject-selector');

    if (!subjectId) {
        this.activeSubjectId = null;
        if (selector) selector.value = '';
        this.updateMiniChallenge();
        this.updateYouTubeEmbed();
        this.updatePomodoroResources();
        this.refreshPomodoroUI();
        return false;
    }

    const parsedId = Number(subjectId);
    if (!Number.isFinite(parsedId) || !db.data.subjects.some(s => s.id === parsedId)) {
        return false;
    }

    this.activeSubjectId = parsedId;
    if (selector) selector.value = String(parsedId);
    this.updateMiniChallenge();
    this.updateYouTubeEmbed();
    this.updatePomodoroResources();
    this.refreshPomodoroUI();
    return true;
};

StudentProApp.prototype.applyRecommendedPomodoroSubject = function() {
    const runningState = this._loadPomodoroState?.();
    const lockedSubjectId = this.timerRunning
        ? (this._pomodoroSubjectId ?? this.activeSubjectId ?? null)
        : (runningState?.running ? (runningState.subjectId ?? this.activeSubjectId ?? null) : null);

    if (lockedSubjectId) {
        return this.setPomodoroSubject(lockedSubjectId);
    }

    const rec = typeof db.getAdvancedRecommendation === 'function'
        ? db.getAdvancedRecommendation()
        : null;
    const recommendedSubjectId = rec?.subjectId ?? db.data.subjects?.[0]?.id ?? null;

    return this.setPomodoroSubject(recommendedSubjectId);
};

StudentProApp.prototype._getPomodoroChapterVideoUrl = function(chapter) {
    if (!chapter) return null;
    if (chapter.youtube_url) return chapter.youtube_url;

    const videoResource = Array.isArray(chapter.resources)
        ? chapter.resources.find(r => r.type === 'video' && r.url)
        : null;
    return videoResource?.url || null;
};

StudentProApp.prototype._getPomodoroFocusChapter = function(subjectId = this.activeSubjectId) {
    if (!subjectId) return null;

    const subject = db.data.subjects.find(s => s.id === subjectId);
    if (!subject) return null;

    const hasExercises = subject.has_exercises !== false;
    const chapters = db.data.chapters.filter(c => c.subject_id === subjectId);

    for (const chapter of chapters) {
        if (!chapter.video_completed) return chapter;
    }

    if (hasExercises) {
        for (const chapter of chapters) {
            if (!chapter.exercises_completed) return chapter;
        }
    }

    return chapters.find(c => this._getPomodoroChapterVideoUrl(c) || (Array.isArray(c.resources) && c.resources.length > 0))
        || chapters[0]
        || null;
};

StudentProApp.prototype.updatePomodoroResources = function() {
    const resCard = get('pomodoro-resource-card');
    const tabs = get('resource-type-tabs');
    const area = get('resource-display-area');
    const focusLabel = get('pomodoro-resource-focus-label');
    const T = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];

    if (!resCard || !tabs || !area) return;

    const chapters = db.data.chapters.filter(c => c.subject_id === this.activeSubjectId);
    const focusChapter = this._getPomodoroFocusChapter(this.activeSubjectId);
    const focusChapterId = focusChapter?.id || null;
    let allResources = [];
    chapters.forEach(c => {
        if (c.resources) {
            c.resources.forEach(r => {
                allResources.push({
                    ...r,
                    chapterId: c.id,
                    chapterName: c.name,
                    isFocusChapter: c.id === focusChapterId
                });
            });
        }
    });

    // Filter out videos since they are in the YouTube card
    const nonVideoResources = allResources.filter(r => r.type !== 'video');

    if (nonVideoResources.length > 0) {
        resCard.style.display = 'block';
        if (focusLabel) {
            focusLabel.textContent = focusChapter
                ? `${T.highlighted_chapter || 'Highlighted chapter'}: ${focusChapter.name}`
                : '';
        }
        tabs.innerHTML = '';
        
        // Add "All" button
        const allBtn = document.createElement('button');
        allBtn.className = 'small-btn primary-btn';
        allBtn.innerHTML = `📚 ${T.all_filter || 'All'}`;
        allBtn.onclick = () => {
            tabs.querySelectorAll('button').forEach(b => b.className = 'small-btn secondary-btn');
            allBtn.className = 'small-btn primary-btn';
            this.renderResourceListByType('all', nonVideoResources);
        };
        tabs.appendChild(allBtn);

        // Group by type for tabs
        const types = [...new Set(nonVideoResources.map(r => r.type))];
        
        types.forEach((type) => {
            const btn = document.createElement('button');
            btn.className = 'small-btn secondary-btn';
            let icon = '🔗';
            if (type === 'pdf') icon = '📄';
            else if (type === 'exercise') icon = '✍️';
            else if (type === 'exam') icon = '🏆';
            
            btn.innerHTML = `${icon} ${type.toUpperCase()}`;
            btn.onclick = () => {
                // Update active tab styling
                tabs.querySelectorAll('button').forEach(b => b.className = 'small-btn secondary-btn');
                btn.className = 'small-btn primary-btn';
                this.renderResourceListByType(type, nonVideoResources);
            };
            tabs.appendChild(btn);
        });

        // Initial render: Show all by default
        this.renderResourceListByType('all', nonVideoResources);
    } else {
        resCard.style.display = 'none';
        if (focusLabel) focusLabel.textContent = '';
    }
};

StudentProApp.prototype.renderResourceListByType = function(type, allRes) {
    const area = get('resource-display-area');
    const T = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];
    if (!area) return;

    const filtered = (type === 'all' ? allRes : allRes.filter(r => r.type === type))
        .sort((a, b) => Number(b.isFocusChapter) - Number(a.isFocusChapter));
    area.innerHTML = '';

    filtered.forEach(res => {
        const item = document.createElement('a');
        item.href = res.url;
        item.target = '_blank';
        item.className = 'list-item';
        item.style.width = '100%';
        item.style.textDecoration = 'none';
        item.style.color = 'inherit';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.padding = '12px';
        item.style.marginBottom = '8px';
        item.style.background = 'var(--card)';
        item.style.borderRadius = '8px';
        item.style.border = '1px solid var(--border)';

        let icon = '🔗';
        if (res.type === 'pdf') icon = '📄';
        else if (res.type === 'exercise') icon = '✍️';
        else if (res.type === 'exam') icon = '🏆';
        else if (res.type === 'video') icon = '🎬';

        item.innerHTML = `
            <div style="display:flex; flex-direction:column;">
                <span style="font-weight:600; font-size:14px;">${icon} ${res.label}</span>
                <span class="mute" style="font-size:11px;">${T.chapter_label || 'Chapter'}: ${res.chapterName}</span>
            </div>
            <i class="fas fa-external-link-alt" style="font-size:12px; opacity:0.5;"></i>
        `;
        area.appendChild(item);
    });
};

StudentProApp.prototype.refreshPomodoroUI = function() {
    const T = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];
    const persistedState = this._loadPomodoroState?.();
    const currentKind = this._pomodoroKind || persistedState?.kind || 'focus';
    this._setPomodoroStatus(currentKind);
    if (persistedState?.running || this.timerRunning) {
        this._setPomodoroPrimaryButton('pause');
    } else if ((persistedState && persistedState.remainingSec !== null && persistedState.remainingSec !== undefined) || (currentKind === 'break' && this.timeLeft > 0)) {
        this._setPomodoroPrimaryButton('resume');
    } else {
        this._setPomodoroPrimaryButton('start');
    }

    const xpTotal = Number(db.data?.user_profile?.xp || 0);
    const levelProgress = typeof db?.getLevelProgress === 'function'
        ? db.getLevelProgress(xpTotal)
        : {
            level: Number(db.data?.user_profile?.level || 1),
            xpIntoLevel: xpTotal,
            xpForNextLevel: 1000,
            progressPct: 0
        };
    const level = Number(levelProgress.level || 1);

    const levelEl = get('level-display');
    if (levelEl) levelEl.textContent = `${T.level_label || T.level || 'Level'} ${level}`;

    const badgeEl = get('level-badge-display');
    if (badgeEl) {
        badgeEl.textContent = typeof db?.getLevelTitle === 'function'
            ? db.getLevelTitle(level, this.selectedLang)
            : (T.beginner || 'Beginner');
    }

    const bar = get('xp-bar');
    if (bar) bar.style.width = `${levelProgress.progressPct || 0}%`;

    const label = get('xp-label');
    if (label) label.textContent = `${levelProgress.xpIntoLevel || 0} / ${levelProgress.xpForNextLevel || 600} XP`;

    // Today stats from sessions
    const sessions = db.data?.study_sessions || [];
    const now = new Date();
    const sameDay = (a, b) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

    let sessionsToday = 0;
    let minutesToday = 0;
    for (const s of sessions) {
        const ts = s.timestamp || s.created_at;
        if (!ts) continue;
        const d = new Date(ts);
        if (!Number.isFinite(d.getTime())) continue;
        if (!sameDay(d, now)) continue;
        sessionsToday += 1;
        minutesToday += Number(s.duration_minutes || 0);
    }

    const sessionsEl = get('sessions-today');
    if (sessionsEl) sessionsEl.textContent = String(sessionsToday);

    const minutesEl = get('minutes-today');
    if (minutesEl) minutesEl.textContent = String(minutesToday);

    const xpTodayEl = get('xp-today');
    if (xpTodayEl) {
        const dailyStats = typeof db?.getDailyStudyStats === 'function'
            ? db.getDailyStudyStats(now)
            : { xp: this._getPomodoroXpForMinutes(minutesToday) };
        xpTodayEl.textContent = String(Number(dailyStats.xp || 0));
    }

    const focusMinutes = Math.round(this._getFocusDurationSec() / 60);
    const breakMinutes = Math.round(this._getBreakDurationSec() / 60);
    const flowEl = get('pomodoro-phase-line');
    if (flowEl) {
        flowEl.textContent = `${T.focus_time || 'Focus Time'} ${focusMinutes}m -> ${T.break_time || 'Break Time'} ${breakMinutes}m -> ${T.repeat_cycle || 'Repeat'}`;
    }

    document.querySelectorAll('.pomodoro-preset-btn[data-focus-minutes]').forEach(btn => {
        const btnMinutes = Number(btn.dataset.focusMinutes || 0);
        btn.classList.toggle('active', btnMinutes === focusMinutes);
        btn.disabled = currentKind === 'break';
    });

    const breakActions = get('pomodoro-break-actions');
    if (breakActions) {
        breakActions.classList.toggle('hidden', currentKind !== 'break');
    }

    const summaryCard = get('pomodoro-subject-summary');
    const summaryProgress = get('pomodoro-summary-progress');
    const summaryName = get('pomodoro-summary-name');
    const summaryStats = get('pomodoro-summary-stats');
    if (summaryCard && summaryProgress && summaryName && summaryStats) {
        const subject = db.data.subjects.find(s => s.id === this.activeSubjectId);
        if (!subject) {
            summaryCard.classList.add('empty');
            summaryProgress.textContent = '0%';
            summaryName.textContent = T.no_subject_selected || 'No subject selected';
            summaryStats.innerHTML = '';
        } else {
            const chapters = db.data.chapters.filter(c => c.subject_id === subject.id);
            const hasExercises = subject.has_exercises !== false;
            const courseDone = chapters.filter(c => c.video_completed).length;
            const exercisesDone = chapters.filter(c => c.exercises_completed).length;
            const courseLeft = Math.max(0, chapters.length - courseDone);
            const exercisesLeft = hasExercises ? Math.max(0, chapters.length - exercisesDone) : 0;
            const progress = db.getSubjectProgress(subject.id);
            const progressPct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

            summaryCard.classList.remove('empty');
            summaryProgress.textContent = `${progressPct}%`;
            summaryName.textContent = subject.name;
            summaryStats.innerHTML = '';

            [
                `${chapters.length} ${T.chapters || 'Chapters'}`,
                `${courseLeft} ${T.course_left || `${T.course || 'Course'} left`}`,
                hasExercises ? `${exercisesLeft} ${T.exercises_left || `${T.exercises || 'Exercises'} left`}` : null
            ].filter(Boolean).forEach(label => {
                const item = document.createElement('span');
                item.className = 'pomodoro-summary-stat';
                item.textContent = label;
                summaryStats.appendChild(item);
            });
        }
    }

    const taskTitle = get('pomodoro-next-task-title');
    const taskBadge = get('pomodoro-next-task-badge');
    const taskBody = get('pomodoro-next-task-body');
    const taskReason = get('pomodoro-next-task-reason');
    const suggestionBtn = get('pomodoro-use-suggestion-btn');
    if (taskTitle && taskBadge && taskBody && taskReason && suggestionBtn) {
        const suggestion = this.getPomodoroTaskSuggestion();
        taskTitle.textContent = T.up_next || 'Up Next';

        if (!suggestion) {
            taskBadge.textContent = T.suggested_focus || 'Suggested';
            taskBody.textContent = T.pomodoro_pick_subject_hint || 'Pick a subject to see your next task.';
            taskReason.textContent = '';
            suggestionBtn.classList.add('hidden');
        } else {
            const typeLabel = suggestion.nextTask?.type === 'exercises'
                ? (T.exercises || 'Exercises')
                : (T.course || 'Course');
            const verb = suggestion.nextTask?.type === 'exercises'
                ? (T.practice || 'Practice')
                : (T.study || 'Study');
            const chapterPart = suggestion.nextTask?.chapterName
                ? ` • ${suggestion.nextTask.chapterName}`
                : '';

            taskBadge.textContent = suggestion.source === 'selected'
                ? (T.selected_subject_label || 'Selected')
                : (T.suggested_focus || 'Suggested');
            taskBody.textContent = suggestion.nextTask
                ? `${verb} ${suggestion.subjectName} • ${typeLabel}${chapterPart}`
                : `${suggestion.subjectName} • ${T.all_done || 'All done!'}`;

            if (suggestion.reasonKey && T[suggestion.reasonKey]) {
                taskReason.textContent = `${T.reason_label || 'Reason:'} ${String(T[suggestion.reasonKey]).replace(/\{(\w+)\}/g, (_, key) => suggestion.reasonVars?.[key] ?? '')}`;
            } else {
                taskReason.textContent = suggestion.source === 'selected'
                    ? (T.selected_subject_focus_hint || 'You are looking at the current subject plan.')
                    : '';
            }

            if (suggestion.source === 'suggested') {
                suggestionBtn.classList.remove('hidden');
            } else {
                suggestionBtn.classList.add('hidden');
            }
        }
    }
};

StudentProApp.prototype.skipBreak = function() {
    const currentKind = this._pomodoroKind || this._loadPomodoroState?.()?.kind || 'focus';
    if (currentKind !== 'break') return false;

    this.resetTimer();
    this.refreshAll();
    return true;
};

StudentProApp.prototype.extendBreak = function(minutes = 1) {
    const currentKind = this._pomodoroKind || this._loadPomodoroState?.()?.kind || 'focus';
    if (currentKind !== 'break') return false;

    const extraSec = Math.max(1, Number(minutes) || 1) * 60;
    const state = this._loadPomodoroState?.();
    if (state?.running && state.endAtMs) {
        const endAtMs = state.endAtMs + (extraSec * 1000);
        this._pomodoroTotalSec = Number(state.totalSec || this._pomodoroTotalSec || 0) + extraSec;
        this.timeLeft = this._computePomodoroRemaining(endAtMs);
        this._savePomodoroState({
            ...state,
            endAtMs,
            totalSec: this._pomodoroTotalSec,
            remainingSec: null,
            kind: 'break',
            subjectId: null
        });
        this._schedulePomodoroEndNotification('break', endAtMs);
    } else {
        this.timeLeft = Math.max(0, this.timeLeft) + extraSec;
        this._pomodoroTotalSec = Math.max(this._pomodoroTotalSec || 0, this.timeLeft);
        this._savePomodoroState({
            v: 1,
            running: false,
            endAtMs: null,
            remainingSec: this.timeLeft,
            totalSec: this._pomodoroTotalSec,
            subjectId: null,
            kind: 'break'
        });
    }

    this.updateTimerDisplay();
    this.refreshPomodoroUI();
    return true;
};

StudentProApp.prototype.startNextFocus = function() {
    const currentKind = this._pomodoroKind || this._loadPomodoroState?.()?.kind || 'focus';
    if (currentKind !== 'break') return false;

    clearInterval(this.timer);
    this._cancelPomodoroEndNotification();
    this._clearPomodoroState();
    this.timerRunning = false;
    this._setPomodoroStatus('focus');
    this.timeLeft = this._getFocusDurationSec();
    this._pomodoroTotalSec = this.timeLeft;
    this._pomodoroSubjectId = null;
    // Don't auto-switch subjects if the user already picked one.
    if (!this.activeSubjectId) this.applyRecommendedPomodoroSubject();
    this.updateTimerDisplay();
    this.toggleTimer();
    this.refreshAll();
    return true;
};

StudentProApp.prototype.updateYouTubeEmbed = function() {
    const videoCard = get('youtube-video-card');
    const iframe = get('youtube-iframe');
    const openBtn = get('open-youtube-btn');
    const focusLabel = get('pomodoro-video-focus-label');
    const T = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];

    if (!videoCard || !iframe) return;

    const focusChapter = this._getPomodoroFocusChapter(this.activeSubjectId);
    const ytUrl = this._getPomodoroChapterVideoUrl(focusChapter);

    if (ytUrl) {
        videoCard.style.display = 'block';
        if (focusLabel && focusChapter) {
            focusLabel.textContent = `${T.highlighted_chapter || 'Highlighted chapter'}: ${focusChapter.name}`;
        }

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
        if (focusLabel) focusLabel.textContent = '';
    }
};

StudentProApp.prototype.refreshSubjectDetails = function() {
    const panel = get('subject-details-panel');
    if (!this.activeSubjectId) { panel?.classList.add('disabled'); return; }
    panel?.classList.remove('disabled');
    const sub = db.data.subjects.find(s => s.id === this.activeSubjectId);
    if (!sub) return;

    const title = get('selected-subject-title');
    if (title) title.textContent = sub.name;

    const progress = db.getSubjectProgress(sub.id);
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
};
