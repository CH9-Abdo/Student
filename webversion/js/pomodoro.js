// Pomodoro Timer Logic
StudentProApp.prototype.toggleTimer = function() {
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
};

StudentProApp.prototype.resetTimer = function() {
    clearInterval(this.timer);
    this.timerRunning = false;
    // BUG FIX: read from settings instead of hardcoded 25
    const workMins = db.data?.settings?.pomodoro?.work || 25;
    this.timeLeft = workMins * 60;
    this.updateTimerDisplay();
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
        const workMins = db.data?.settings?.pomodoro?.work || 25;
        const total = workMins * 60;
        const progress = this.timeLeft / total;
        const circumference = 283;
        path.style.strokeDashoffset = circumference * (1 - progress);
    }
};

StudentProApp.prototype.completeSession = async function() {
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
