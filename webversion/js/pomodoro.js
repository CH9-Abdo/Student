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

    const T = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];
    const isBreak = kind === 'break';
    const id = isBreak ? POMODORO_BREAK_END_NOTIFICATION_ID : POMODORO_FOCUS_END_NOTIFICATION_ID;
    const title = isBreak
        ? (T.break_over_title || 'Break Over')
        : (T.pomodoro_complete_title || 'Pomodoro Complete');
    const body = isBreak
        ? (T.break_over_body || 'Break finished. Ready to focus again?')
        : (T.pomodoro_complete_body || 'Time is up. Great work.');

    try {
        await this._cancelPomodoroEndNotification();
        const baseNotif = {
            id,
            title,
            body,
            extra: { kind: isBreak ? 'pomodoro-break-end' : 'pomodoro-focus-end' }
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
    const workMins = db.data?.settings?.pomodoro?.work || 25;
    return Math.max(1, Number(workMins) || 25) * 60;
};

StudentProApp.prototype._getBreakDurationSec = function() {
    // Default to 5 minutes unless settings specify otherwise.
    const breakMins = db.data?.settings?.pomodoro?.short || 5;
    return Math.max(1, Number(breakMins) || 5) * 60;
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
    this._setPomodoroStatus(state.kind || 'focus');
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

        const btn = get('timer-start');
        if (btn) btn.innerHTML = '<i class="fas fa-play"></i> Resume';
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
    const btn = get('timer-start');
    if (btn) btn.innerHTML = '<i class="fas fa-pause"></i> Pause';

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

    const completedKind = this._pomodoroKind || 'focus';

    if (completedKind === 'break') {
        // Break finished: return to focus.
        const T = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];
        showToast(T.toast_break_finished || "✅ Break finished. Ready to focus.", 'info', 3500);
        this.resetTimer();
        this.refreshAll();
        return;
    }

    // Focus finished: play sound, award XP, then start break automatically.
    this._playPomodoroEndSound();
    const workMins = db.data?.settings?.pomodoro?.work || 25;
    const subjectId = this._pomodoroSubjectId ?? this.activeSubjectId ?? null;

    if (subjectId) {
        await db.logSession(subjectId, workMins);
        await db.updateProfile({
            xp: (db.data.user_profile.xp || 0) + 50,
            total_sessions: (db.data.user_profile.total_sessions || 0) + 1
        });
    }

    // Start break immediately
    const breakSec = this._getBreakDurationSec();
    const breakMins = Math.round(breakSec / 60);
    {
        const T = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];
        const tmpl = T.toast_session_done_break || "🎉 Session Done! +50 XP • Break: {minutes} min";
        showToast(String(tmpl).replace('{minutes}', String(breakMins)), 'success', 4500);
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
    const btn = get('timer-start');
    if (btn) btn.innerHTML = '<i class="fas fa-pause"></i> Pause';

    this._schedulePomodoroEndNotification('break', endAtMs);
    this._startPomodoroUiTick();
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
            this.updatePomodoroResources();
        }
    };
};

StudentProApp.prototype.updatePomodoroResources = function() {
    const resCard = get('pomodoro-resource-card');
    const tabs = get('resource-type-tabs');
    const area = get('resource-display-area');

    if (!resCard || !tabs || !area) return;

    const chapters = db.data.chapters.filter(c => c.subject_id === this.activeSubjectId);
    let allResources = [];
    chapters.forEach(c => {
        if (c.resources) {
            c.resources.forEach(r => {
                allResources.push({ ...r, chapterName: c.name });
            });
        }
    });

    // Filter out videos since they are in the YouTube card
    const nonVideoResources = allResources.filter(r => r.type !== 'video');

    if (nonVideoResources.length > 0) {
        resCard.style.display = 'block';
        tabs.innerHTML = '';
        
        // Add "All" button
        const allBtn = document.createElement('button');
        allBtn.className = 'small-btn primary-btn';
        allBtn.innerHTML = `📚 ALL`;
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
    }
};

StudentProApp.prototype.renderResourceListByType = function(type, allRes) {
    const area = get('resource-display-area');
    if (!area) return;

    const filtered = type === 'all' ? allRes : allRes.filter(r => r.type === type);
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
                <span class="mute" style="font-size:11px;">Chapter: ${res.chapterName}</span>
            </div>
            <i class="fas fa-external-link-alt" style="font-size:12px; opacity:0.5;"></i>
        `;
        area.appendChild(item);
    });
};

StudentProApp.prototype.refreshPomodoroUI = function() {
    const T = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];

    const xpTotal = Number(db.data?.user_profile?.xp || 0);
    const level = Number(db.data?.user_profile?.level || 1);

    const levelEl = get('level-display');
    if (levelEl) levelEl.textContent = `${T.level_label || T.level || 'Level'} ${level}`;

    const badgeEl = get('level-badge-display');
    if (badgeEl) {
        const badges = ['Beginner', 'Focused', 'Disciplined', 'Advanced', 'Master'];
        badgeEl.textContent = badges[Math.min(level - 1, badges.length - 1)];
    }

    // Progress to next level: use the same threshold as the DB level-up logic.
    const XP_PER_LEVEL = (typeof db?.getXpPerLevel === 'function') ? db.getXpPerLevel() : 1000;
    const xpIntoLevel = ((xpTotal % XP_PER_LEVEL) + XP_PER_LEVEL) % XP_PER_LEVEL;
    const pct = Math.max(0, Math.min(100, Math.round((xpIntoLevel / XP_PER_LEVEL) * 100)));

    const bar = get('xp-bar');
    if (bar) bar.style.width = `${pct}%`;

    const label = get('xp-label');
    if (label) label.textContent = `${xpIntoLevel} / ${XP_PER_LEVEL} XP`;

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

    const XP_PER_SESSION = 50;
    const xpTodayEl = get('xp-today');
    if (xpTodayEl) xpTodayEl.textContent = String(sessionsToday * XP_PER_SESSION);
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
