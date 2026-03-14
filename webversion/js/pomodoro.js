// Pomodoro Timer Logic
//
// Android/WebView backgrounding note:
// JS timers (setInterval) can be throttled/suspended when the app is backgrounded.
// For correctness, use a persisted end timestamp and reconcile on resume/focus.
// For a true "works in background" finish alert, schedule a native Local Notification
// when the @capacitor/local-notifications plugin is installed.

const POMODORO_STATE_KEY = 'studentpro_pomodoro_state_v1';
const POMODORO_NOTIFICATION_ID = 9125;

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
        await LocalNotifications.cancel({ notifications: [{ id: POMODORO_NOTIFICATION_ID }] });
    } catch {
        // Payload shape differs slightly across versions.
        try { await LocalNotifications.cancel({ ids: [POMODORO_NOTIFICATION_ID] }); } catch {}
    }
};

StudentProApp.prototype._schedulePomodoroEndNotification = async function(endAtMs) {
    const LocalNotifications = this._getLocalNotificationsPlugin();
    if (!LocalNotifications) return;

    const allowed = await this._ensurePomodoroNotificationsPermission();
    if (!allowed) return;

    try {
        await this._cancelPomodoroEndNotification();
        const baseNotif = {
            id: POMODORO_NOTIFICATION_ID,
            title: 'Pomodoro Complete',
            body: 'Time is up. Great work.',
            extra: { kind: 'pomodoro-end' }
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
        this.updateTimerDisplay();

        const btn = get('timer-start');
        if (btn) btn.innerHTML = '<i class="fas fa-pause"></i> Pause';

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
    this.updateTimerDisplay();
    const btn = get('timer-start');
    if (btn) btn.innerHTML = '<i class="fas fa-play"></i> Resume';
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
    const workMins = db.data?.settings?.pomodoro?.work || 25;

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
            totalSec: this._pomodoroTotalSec || (workMins * 60),
            subjectId: this._pomodoroSubjectId ?? this.activeSubjectId ?? null,
            kind: 'focus'
        });
        this._cancelPomodoroEndNotification();

        const btn = get('timer-start');
        if (btn) btn.innerHTML = '<i class="fas fa-play"></i> Resume';
        return;
    }

    // Start / resume
    const totalSec = this._pomodoroTotalSec || (workMins * 60);
    this._pomodoroTotalSec = totalSec;
    this._pomodoroSubjectId = this._pomodoroSubjectId ?? this.activeSubjectId ?? null;

    const endAtMs = Date.now() + (this.timeLeft * 1000);
    this._savePomodoroState({
        v: 1,
        running: true,
        endAtMs,
        remainingSec: null,
        totalSec,
        subjectId: this._pomodoroSubjectId,
        kind: 'focus'
    });

    this.timerRunning = true;
    const btn = get('timer-start');
    if (btn) btn.innerHTML = '<i class="fas fa-pause"></i> Pause';

    this._schedulePomodoroEndNotification(endAtMs);
    this._startPomodoroUiTick();
};

StudentProApp.prototype.resetTimer = function() {
    clearInterval(this.timer);
    this.timerRunning = false;

    const workMins = db.data?.settings?.pomodoro?.work || 25;
    this.timeLeft = workMins * 60;
    this._pomodoroTotalSec = this.timeLeft;
    this._pomodoroSubjectId = null;

    this.updateTimerDisplay();
    this._cancelPomodoroEndNotification();
    this._clearPomodoroState();

    const btn = get('timer-start');
    if (btn) btn.innerHTML = '<i class="fas fa-play"></i> Start Focus';
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
    console.log("[App] Pomodoro: Session COMPLETED!");

    await this._cancelPomodoroEndNotification();
    this._clearPomodoroState();
    clearInterval(this.timer);
    this.timerRunning = false;

    const workMins = db.data?.settings?.pomodoro?.work || 25;
    const subjectId = this._pomodoroSubjectId ?? this.activeSubjectId ?? null;

    // Reset UI + internal counters
    this.resetTimer();

    showToast("🎉 Session Done! +50 XP", 'success', 4000);

    if (subjectId) {
        await db.logSession(subjectId, workMins);
        await db.updateProfile({
            xp: (db.data.user_profile.xp || 0) + 50,
            total_sessions: (db.data.user_profile.total_sessions || 0) + 1
        });
    }
    this.refreshAll();
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
        if (e.target.value) {
            this.activeSubjectId = parseInt(e.target.value);
            this.updateMiniChallenge();
            this.updateYouTubeEmbed();
        }
    };
};

StudentProApp.prototype.updateYouTubeEmbed = function() {
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
