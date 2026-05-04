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

StudentProApp.prototype._getBreakDurationSec = function(focusMins) {
    // If we have a specific focus duration, apply custom rules
    if (focusMins) {
        if (focusMins >= 90) {
            // Big break for 90m+ focus
            const longBreak = db.data?.settings?.pomodoro?.long || 15;
            return Math.max(1, Number(longBreak)) * 60;
        }
        if (focusMins >= 50) {
            // 10m break for 50m+ focus
            return 10 * 60;
        }
    }

    // Default to short break unless settings specify otherwise.
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

StudentProApp.prototype._getPomodoroChapterName = function(chapterId) {
    if (!chapterId) return '';
    const chapter = db.data?.chapters?.find(c => c.id === chapterId);
    return typeof chapter?.name === 'string' ? chapter.name.trim() : '';
};

StudentProApp.prototype._getPomodoroChaptersForSubject = function(subjectId = this.activeSubjectId) {
    const safeSubjectId = Number(subjectId || 0) || null;
    if (!safeSubjectId) return [];
    return (db.data?.chapters || []).filter(c => c.subject_id === safeSubjectId);
};

StudentProApp.prototype._getPomodoroTaskForChapter = function(subjectId, chapterId) {
    const safeSubjectId = Number(subjectId || 0) || null;
    const safeChapterId = Number(chapterId || 0) || null;
    if (!safeSubjectId || !safeChapterId) return null;

    const subject = db.data?.subjects?.find(s => s.id === safeSubjectId);
    const chapter = this._getPomodoroChaptersForSubject(safeSubjectId).find(c => c.id === safeChapterId);
    if (!subject || !chapter) return null;

    const hasExercises = subject.has_exercises !== false;
    if (!chapter.video_completed) {
        return { type: 'course', chapterId: chapter.id, chapterName: chapter.name };
    }
    if (hasExercises && !chapter.exercises_completed) {
        return { type: 'exercises', chapterId: chapter.id, chapterName: chapter.name };
    }

    return null;
};

StudentProApp.prototype._getPomodoroSelectedChapter = function(subjectId = this.activeSubjectId) {
    const safeSubjectId = Number(subjectId || 0) || null;
    if (!safeSubjectId) return null;

    const chapterId = Number(
        (safeSubjectId === (Number(this.activeSubjectId || 0) || null))
            ? (this.activePomodoroChapterId ?? this._pomodoroChapterId ?? null)
            : null
    ) || null;
    if (!chapterId) return null;

    return this._getPomodoroChaptersForSubject(safeSubjectId).find(c => c.id === chapterId) || null;
};

StudentProApp.prototype._getPomodoroCompletionState = function(subjectId = this.activeSubjectId, chapterId = this.activePomodoroChapterId) {
    const safeSubjectId = Number(subjectId || 0) || null;
    const safeChapterId = Number(chapterId || 0) || null;
    if (!safeSubjectId || !safeChapterId) {
        return { subject: null, chapter: null, hasExercises: false };
    }

    const subject = db.data?.subjects?.find(s => s.id === safeSubjectId) || null;
    const chapter = this._getPomodoroChaptersForSubject(safeSubjectId).find(c => c.id === safeChapterId) || null;
    return {
        subject,
        chapter,
        hasExercises: subject ? (subject.has_exercises !== false) : false
    };
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
    const chapterId = this._pomodoroChapterId ?? this.activePomodoroChapterId ?? null;
    const chapterName = this._getPomodoroChapterName(chapterId);
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
            chapterId,
            chapterName,
            xpEarned,
            focusMinutes,
            breakMinutes
        }
    };
};

StudentProApp.prototype._setPomodoroStatus = function(kind) {
    this._pomodoroKind = kind;
    const el = get('timer-status');
    const card = document.querySelector('.timer-card');
    if (card) card.classList.toggle('mode-break', kind === 'break');
    
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

    const wrapper = document.querySelector('.timer-display-wrapper');
    if (wrapper) wrapper.classList.toggle('timer-running', state.running);
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
        this._pomodoroChapterId = state.chapterId ?? this._pomodoroChapterId;
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
    this._pomodoroChapterId = state.chapterId ?? this._pomodoroChapterId;

    const restoredSubjectId = Number(state.subjectId || 0) || null;
    if (restoredSubjectId && db.data?.subjects?.some(s => s.id === restoredSubjectId)) {
        this.activeSubjectId = restoredSubjectId;
    }
    if (this.activeSubjectId) {
        const chapterId = Number(state.chapterId || 0) || null;
        const chapter = chapterId
            ? this._getPomodoroChaptersForSubject(this.activeSubjectId).find(c => c.id === chapterId)
            : null;
        this.activePomodoroChapterId = chapter?.id || this._getPomodoroDefaultChapter(this.activeSubjectId)?.id || null;
    } else {
        this.activePomodoroChapterId = null;
    }

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
    const persistedSubjectId = kind === 'focus'
        ? (this._pomodoroSubjectId ?? this.activeSubjectId ?? null)
        : (this.activeSubjectId ?? null);
    const selectedChapterId = this._getPomodoroSelectedChapter(this.activeSubjectId)?.id || this.activePomodoroChapterId || null;

    if (this.timerRunning) {
        // Pause
        const state = this._loadPomodoroState();
        const remainingSec = state?.endAtMs ? this._computePomodoroRemaining(state.endAtMs) : this.timeLeft;

        clearInterval(this.timer);
        this.timerRunning = false;
        this.timeLeft = Math.max(0, remainingSec);
        this.updateTimerDisplay();
        this._pomodoroChapterId = selectedChapterId;

        this._savePomodoroState({
            v: 1,
            running: false,
            endAtMs: null,
            remainingSec: this.timeLeft,
            totalSec,
            subjectId: persistedSubjectId,
            chapterId: this._pomodoroChapterId,
            kind
        });
        this._cancelPomodoroEndNotification();

        this._setPomodoroPrimaryButton('resume');
        return;
    }

    // Start / resume
    this._pomodoroTotalSec = totalSec;
    this._pomodoroSubjectId = kind === 'focus' ? persistedSubjectId : null;
    this._pomodoroChapterId = selectedChapterId;
    this._setPomodoroStatus(kind);

    const endAtMs = Date.now() + (this.timeLeft * 1000);
    this._savePomodoroState({
        v: 1,
        running: true,
        endAtMs,
        remainingSec: null,
        totalSec,
        subjectId: persistedSubjectId,
        chapterId: this._pomodoroChapterId,
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
    this._pomodoroChapterId = null;

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
        // Break finished: setup next focus but DON'T start automatically (user requested).
        const T = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];
        showToast(T.toast_break_finished || "✅ Break finished. Ready to focus.", 'info', 3500);
        this.startNextFocus(false);
        return;
    }

    // Focus finished: play sound, award XP, then start break automatically.
    this._playPomodoroEndSound();
    const workMins = Math.max(1, Math.round((this._pomodoroTotalSec || this._getFocusDurationSec()) / 60));
    const subjectId = this._pomodoroSubjectId ?? this.activeSubjectId ?? null;
    const chapterId = this._pomodoroChapterId ?? this.activePomodoroChapterId ?? null;
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
    const breakSec = this._getBreakDurationSec(workMins);
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
    this._pomodoroChapterId = chapterId;

    const endAtMs = Date.now() + (breakSec * 1000);
    this._savePomodoroState({
        v: 1,
        running: true,
        endAtMs,
        remainingSec: null,
        totalSec: breakSec,
        subjectId: this.activeSubjectId ?? subjectId ?? null,
        chapterId: this._pomodoroChapterId,
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
                subjectId: state.subjectId ?? this.activeSubjectId ?? null,
                chapterId: state.chapterId ?? this.activePomodoroChapterId ?? null
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
            return { type: 'course', chapterId: chapter.id, chapterName: chapter.name };
        }
        if (hasExercises && !chapter.exercises_completed) {
            return { type: 'exercises', chapterId: chapter.id, chapterName: chapter.name };
        }
    }

    return null;
};

StudentProApp.prototype._getPomodoroDefaultChapter = function(subjectId = this.activeSubjectId) {
    const chapters = this._getPomodoroChaptersForSubject(subjectId);
    if (!chapters.length) return null;

    const nextTask = this._getNextTaskForSubject(Number(subjectId || 0) || null);
    if (nextTask?.chapterId) {
        return chapters.find(c => c.id === nextTask.chapterId) || chapters[0];
    }

    return chapters[0];
};

StudentProApp.prototype.getPomodoroTaskSuggestion = function() {
    if (this.activeSubjectId) {
        const subject = db.data.subjects.find(s => s.id === this.activeSubjectId);
        if (!subject) return null;
        const selectedChapter = this._getPomodoroSelectedChapter(subject.id) || this._getPomodoroDefaultChapter(subject.id);
        return {
            source: 'selected',
            subjectId: subject.id,
            subjectName: subject.name,
            chapterId: selectedChapter?.id || null,
            chapterName: selectedChapter?.name || '',
            nextTask: selectedChapter ? this._getPomodoroTaskForChapter(subject.id, selectedChapter.id) : null
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

    const validSubjectIds = new Set((db.data.subjects || []).map(s => s.id));
    if (!validSubjectIds.has(this.activeSubjectId)) {
        this.activeSubjectId = null;
    }

    selector.innerHTML = '<option value="">' + (TRANSLATIONS[this.selectedLang]?.select_subject || 'Select Subject') + '</option>';

    db.data.subjects.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        selector.appendChild(opt);
    });

    if (this.activeSubjectId && validSubjectIds.has(this.activeSubjectId)) {
        selector.value = String(this.activeSubjectId);
    }

    selector.onchange = (e) => {
        this.setPomodoroSubject(e.target.value || null);
    };

    this.refreshPomodoroChapters();
};

StudentProApp.prototype.refreshPomodoroChapters = function() {
    const selector = get('active-chapter-selector');
    if (!selector) return;

    const T = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];
    const subjectId = Number(this.activeSubjectId || 0) || null;
    const chapters = this._getPomodoroChaptersForSubject(subjectId);

    selector.innerHTML = '';

    if (!subjectId) {
        this.activePomodoroChapterId = null;
        selector.disabled = true;
        selector.innerHTML = `<option value="">${T.select_subject_first || 'Select a subject first'}</option>`;
        selector.onchange = null;
        return;
    }

    if (!chapters.length) {
        this.activePomodoroChapterId = null;
        selector.disabled = true;
        selector.innerHTML = `<option value="">${T.no_chapters_available || T.no_chapters_yet || 'No chapters yet'}</option>`;
        selector.onchange = null;
        return;
    }

    let chapterId = Number(this.activePomodoroChapterId || 0) || null;
    if (!chapters.some(c => c.id === chapterId)) {
        const persistedChapterId = Number(this._pomodoroChapterId || 0) || null;
        chapterId = chapters.some(c => c.id === persistedChapterId) ? persistedChapterId : null;
    }
    if (!chapterId) {
        chapterId = this._getPomodoroDefaultChapter(subjectId)?.id || chapters[0].id;
    }

    this.activePomodoroChapterId = chapterId;
    selector.disabled = false;

    chapters.forEach(chapter => {
        const opt = document.createElement('option');
        opt.value = chapter.id;
        opt.textContent = chapter.name;
        selector.appendChild(opt);
    });

    selector.value = String(chapterId);
    selector.onchange = (e) => {
        this.setPomodoroChapter(e.target.value || null);
    };
};

StudentProApp.prototype.setPomodoroSubject = function(subjectId) {
    const selector = get('active-subject-selector');

    if (!subjectId) {
        this.activeSubjectId = null;
        this.activePomodoroChapterId = null;
        if (selector) selector.value = '';
        this.refreshPomodoroChapters();
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
    this.activePomodoroChapterId = null;
    if (selector) selector.value = String(parsedId);
    this.refreshPomodoroChapters();
    this.updateMiniChallenge();
    this.updateYouTubeEmbed();
    this.updatePomodoroResources();
    this.refreshPomodoroUI();
    return true;
};

StudentProApp.prototype.setPomodoroChapter = function(chapterId) {
    const selector = get('active-chapter-selector');
    if (!this.activeSubjectId) {
        this.activePomodoroChapterId = null;
        if (selector) selector.value = '';
        return false;
    }

    const chapters = this._getPomodoroChaptersForSubject(this.activeSubjectId);
    if (!chapters.length) {
        this.activePomodoroChapterId = null;
        if (selector) selector.value = '';
        return false;
    }

    const parsedId = Number(chapterId || 0) || null;
    const selectedChapter = parsedId
        ? chapters.find(chapter => chapter.id === parsedId)
        : this._getPomodoroDefaultChapter(this.activeSubjectId);
    if (!selectedChapter) return false;

    this.activePomodoroChapterId = selectedChapter.id;
    const persistedState = this._loadPomodoroState?.();
    if (persistedState) {
        this._pomodoroChapterId = selectedChapter.id;
        this._savePomodoroState({
            ...persistedState,
            chapterId: selectedChapter.id
        });
    }
    if (selector) selector.value = String(selectedChapter.id);
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
    const safeSubjectId = Number(subjectId || 0) || null;
    if (!safeSubjectId) return null;

    const subject = db.data.subjects.find(s => s.id === safeSubjectId);
    if (!subject) return null;

    const hasExercises = subject.has_exercises !== false;
    const chapters = this._getPomodoroChaptersForSubject(safeSubjectId);
    const selectedChapter = this._getPomodoroSelectedChapter(safeSubjectId);

    if (selectedChapter) return selectedChapter;

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

StudentProApp.prototype.refreshPomodoroCompletionPanel = function() {
    const panel = get('pomodoro-chapter-progress');
    if (!panel) return;

    const T = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];
    const { subject, chapter, hasExercises } = this._getPomodoroCompletionState();

    if (!subject || !chapter) {
        panel.classList.add('empty');
        panel.innerHTML = `
            <div class="pomodoro-chapter-progress-head">
                <span class="pomodoro-chapter-progress-title">${T.chapter_progress || 'Chapter Progress'}</span>
            </div>
            <div class="pomodoro-chapter-progress-empty">${T.select_chapter_progress_hint || 'Select a chapter to mark it complete.'}</div>
        `;
        return;
    }

    panel.classList.remove('empty');
    panel.innerHTML = `
        <div class="pomodoro-chapter-progress-head">
            <span class="pomodoro-chapter-progress-title">${T.chapter_progress || 'Chapter Progress'}</span>
            <span class="pomodoro-chapter-progress-pill">${T.chapter_label || 'Chapter'}</span>
        </div>
        <div class="pomodoro-chapter-progress-name">${chapter.name}</div>
        <div class="pomodoro-chapter-progress-list">
            <label class="pomodoro-check-row ${chapter.video_completed ? 'done' : ''}">
                <input type="checkbox" data-pomodoro-status="video" ${chapter.video_completed ? 'checked' : ''}>
                <span class="pomodoro-check-copy">
                    <span class="pomodoro-check-label">${T.course || 'Course'}</span>
                    <span class="pomodoro-check-hint">${T.mark_course_complete || 'Mark the lesson part complete'}</span>
                </span>
            </label>
            ${hasExercises ? `
            <label class="pomodoro-check-row ${chapter.exercises_completed ? 'done' : ''}">
                <input type="checkbox" data-pomodoro-status="exercises" ${chapter.exercises_completed ? 'checked' : ''}>
                <span class="pomodoro-check-copy">
                    <span class="pomodoro-check-label">${T.exercises || 'Exercises'}</span>
                    <span class="pomodoro-check-hint">${T.mark_exercises_complete || 'Mark the practice part complete'}</span>
                </span>
            </label>` : ''}
        </div>
    `;

    panel.querySelectorAll('input[data-pomodoro-status]').forEach(input => {
        input.addEventListener('change', async (event) => {
            const type = event.target.dataset.pomodoroStatus;
            const status = !!event.target.checked;
            panel.querySelectorAll('input[data-pomodoro-status]').forEach(box => {
                box.disabled = true;
            });
            try {
                await this.togglePomodoroChapterStatus(chapter.id, type, status);
            } catch (error) {
                console.error('[Pomodoro] Completion toggle failed:', error);
                this.refreshPomodoroCompletionPanel();
            }
        });
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
    const breakMinutes = Math.round(this._getBreakDurationSec(focusMinutes) / 60);
    const flowEl = get('pomodoro-phase-line');
    if (flowEl) {
        const breakLabel = (focusMinutes >= 90) ? (T.long_break || 'Long Break') : (T.break_time || 'Break Time');
        flowEl.textContent = `${T.focus_time || 'Focus Time'} ${focusMinutes}m -> ${breakLabel} ${breakMinutes}m -> ${T.repeat_cycle || 'Repeat'}`;
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

    this.refreshPomodoroCompletionPanel();

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
            const chapterName = suggestion.nextTask?.chapterName || suggestion.chapterName || '';
            const chapterPart = chapterName ? ` • ${chapterName}` : '';

            taskBadge.textContent = suggestion.source === 'selected'
                ? (T.selected_subject_label || 'Selected')
                : (T.suggested_focus || 'Suggested');
            taskBody.textContent = suggestion.nextTask
                ? `${verb} ${suggestion.subjectName} • ${typeLabel}${chapterPart}`
                : chapterName
                    ? `${suggestion.subjectName} • ${chapterName} • ${T.all_done || 'All done!'}`
                    : `${suggestion.subjectName} • ${T.all_done || 'All done!'}`;

            if (suggestion.reasonKey && T[suggestion.reasonKey]) {
                taskReason.textContent = `${T.reason_label || 'Reason:'} ${String(T[suggestion.reasonKey]).replace(/\{(\w+)\}/g, (_, key) => suggestion.reasonVars?.[key] ?? '')}`;
            } else {
                taskReason.textContent = suggestion.source === 'selected'
                    ? (chapterName
                        ? (T.selected_chapter_focus_hint || 'Selected chapter is driving your current focus cards.')
                        : (T.selected_subject_focus_hint || 'You are looking at the current subject plan.'))
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

StudentProApp.prototype.togglePomodoroChapterStatus = async function(chapterId, type, status) {
    const chapter = db.data?.chapters?.find(c => c.id === chapterId);
    if (!chapter) return false;

    console.log(
        `[Pomodoro] Chapter toggle: id=${chapterId}, subject_id=${chapter.subject_id}, chapter="${chapter.name}", field=${type}, next=${status}`
    );
    await db.toggleChapterStatus(chapterId, type, status);
    this.refreshAll();
    return true;
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
            subjectId: state.subjectId ?? this.activeSubjectId ?? null,
            chapterId: state.chapterId ?? this.activePomodoroChapterId ?? null
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
            subjectId: this.activeSubjectId ?? null,
            chapterId: this.activePomodoroChapterId ?? null,
            kind: 'break'
        });
    }

    this.updateTimerDisplay();
    this.refreshPomodoroUI();
    return true;
};

StudentProApp.prototype.startNextFocus = function(autoStart = true) {
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
    this._pomodoroChapterId = this._getPomodoroSelectedChapter(this.activeSubjectId)?.id || this.activePomodoroChapterId || null;
    this.updateTimerDisplay();
    
    if (autoStart) {
        this.toggleTimer();
    } else {
        this._setPomodoroPrimaryButton('play');
    }

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
