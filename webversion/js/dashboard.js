// Dashboard Specific Logic
StudentProApp.prototype.refreshDashboard = function() {
    const T = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];
    const ACCENT_COLORS = ['#6366f1','#0ea5a0','#f59e0b','#ef4444','#8b5cf6','#10b981','#f43f5e','#3b82f6'];

    // ── Date ─────────────────────────────────────────────
    const dateEl = get('current-date');
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString(
        this.selectedLang === 'Arabic' ? 'ar-DZ' : this.selectedLang === 'French' ? 'fr-FR' : 'en-US',
        { weekday:'long', month:'long', day:'numeric' }
    );

    // ── Username ──────────────────────────────────────────
    const uname = get('dash-username');
    if (uname) uname.textContent = db.data?.user_profile?.display_name || (T.student || 'Student');

    // ── Progress ring ─────────────────────────────────────
    const stats = db.getProgressStats();
    const perc  = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
    const CIRC  = 201; // 2π × 32

    const valEl = get('overall-progress-val');
    if (valEl) valEl.textContent = `${perc}%`;
    const ring = get('overall-ring-fill');
    if (ring) ring.style.strokeDashoffset = CIRC - (perc / 100) * CIRC;
    const doneEl  = get('dash-chapters-done');
    const totalEl = get('dash-chapters-total');
    if (doneEl)  doneEl.textContent  = stats.done;
    if (totalEl) totalEl.textContent = stats.total;

    // ── Exam ──────────────────────────────────────────────
    const exam = db.getNextExamInfo();
    const examVal = get('next-exam-val');
    const examSub = get('next-exam-sub');
    if (examVal) {
        if (exam) {
            examVal.textContent = exam.days === 0 ? (T.today || 'Today!') : `${exam.days}${T.days_left ? ' '+T.days_left : 'd'}`;
            if (examSub) examSub.textContent = exam.name;
        } else {
            examVal.textContent = T.none || '—';
            if (examSub) examSub.textContent = T.no_exams_set || T.no_exams || 'No exams set';
        }
    }

    // ── Streak ────────────────────────────────────────────
    const streakEl = get('streak-val');
    if (streakEl) streakEl.textContent = db.getStudyStreak();

    // ── Sessions ──────────────────────────────────────────
    const sessEl = get('dash-total-sessions');
    if (sessEl) sessEl.textContent = db.data?.user_profile?.total_sessions || 0;

    // ── Daily goal ────────────────────────────────────────
    const dailyStats = db.getDailyStudyStats();
    const goal = Math.max(1, Number(dailyStats.goal || 3));
    const goalProgress = Math.min(dailyStats.sessions, goal);
    const goalVal = get('daily-goal-val');
    const goalFill = get('daily-goal-bar');
    if (goalVal) {
        goalVal.textContent = dailyStats.complete
            ? `${dailyStats.sessions}/${goal} ✅`
            : `${dailyStats.sessions}/${goal}`;
    }
    if (goalFill) goalFill.style.width = `${(goalProgress / goal) * 100}%`;
    const dotsEl = get('daily-dots');
    if (dotsEl) {
        dotsEl.querySelectorAll('.ddot').forEach((dot, i) => {
            dot.classList.toggle('done', i < goalProgress);
        });
    }

    // ── Todo list ─────────────────────────────────────────
    const todoContainer = get('todo-container');
    const todoBadge     = get('todo-count-badge');
    if (todoContainer) {
        const todos = db.getTodoChapters();
        if (todoBadge) todoBadge.textContent = todos.length;
        todoContainer.innerHTML = '';

        if (todos.length === 0) {
            todoContainer.innerHTML = `<div class="db-todo-empty">${T.all_caught_up || '🎉 All caught up!'}</div>`;
        } else {
            todos.slice(0, 6).forEach((t, idx) => {
                const color = ACCENT_COLORS[idx % ACCENT_COLORS.length];
                const type  = !t.video_completed ? (T.course || 'Course') : (T.exercises || 'Exercises');
                const badge = !t.video_completed
                    ? `background:rgba(91,95,199,0.12);color:var(--primary)`
                    : `background:rgba(16,185,129,0.12);color:#059669`;
                const div = document.createElement('div');
                div.className = 'db-todo-item';
                div.innerHTML = `
                    <span class="db-todo-dot" style="background:${color};"></span>
                    <div class="db-todo-body">
                        <p class="db-todo-name">${t.name}</p>
                        <p class="db-todo-meta">${t.subject_name}</p>
                    </div>
                    <span class="db-todo-badge" style="${badge}">${type}</span>
                `;
                todoContainer.appendChild(div);
            });
        }
    }

    // ── Week activity bars ────────────────────────────────
    const barsContainer = get('week-bars-container');
    const weekPill      = get('week-sessions-total');
    const legendEl      = get('week-subject-mini');

    if (barsContainer) {
        const isArabic = this.selectedLang === 'Arabic';
        const DAYS_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const DAYS_AR = ['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
        const DAYS_FR = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
        const DAYS = isArabic ? DAYS_AR : this.selectedLang === 'French' ? DAYS_FR : DAYS_EN;
        const today = new Date();
        const weekCounts = Array(7).fill(0);
        const subjectCounts = {};

        db.data.study_sessions.forEach(s => {
            const d = db.getStudySessionDate(s);
            if (!d) return;
            const diff = Math.floor((today - d) / 86400000);
            if (diff >= 0 && diff < 7) {
                weekCounts[6 - diff]++;
                if (s.subject_id) {
                    const sub = db.data.subjects.find(x => x.id === s.subject_id);
                    const name = sub?.name || 'Other';
                    subjectCounts[name] = (subjectCounts[name] || 0) + 1;
                }
            }
        });

        const maxCount = Math.max(...weekCounts, 1);
        const weekTotal = weekCounts.reduce((a, b) => a + b, 0);
        const sessWord = weekTotal === 1 ? (T.session_singular || 'session') : (T.sessions_this_week || 'sessions');
        if (weekPill) weekPill.textContent = `${weekTotal} ${sessWord}`;

        barsContainer.innerHTML = '';
        weekCounts.forEach((count, i) => {
            const dayIdx = (today.getDay() - 6 + i + 7) % 7;
            const isToday = i === 6;
            const heightPx = Math.round((count / maxCount) * 78) + 4;
            const cls = count === 0 ? 'empty' : isToday ? 'today' : 'active';
            const col = document.createElement('div');
            col.className = 'db-bar-col';
            col.innerHTML = `
                <div class="db-bar-fill ${cls}" style="height:${heightPx}px;"></div>
                <span class="db-bar-lbl">${DAYS[dayIdx]}</span>
            `;
            barsContainer.appendChild(col);
        });

        // Legend
        if (legendEl) {
            const topSubjects = Object.entries(subjectCounts).sort((a,b)=>b[1]-a[1]).slice(0, 3);
            legendEl.innerHTML = topSubjects.map(([name, cnt], i) => `
                <div class="db-wl-row">
                    <span class="db-wl-dot" style="background:${ACCENT_COLORS[i]};"></span>
                    <span class="db-wl-name">${name}</span>
                    <span class="db-wl-count">${cnt}</span>
                </div>
            `).join('') || '';
        }
    }
};

StudentProApp.prototype.updateMiniChallenge = function() {
    const T = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];
    const text = get('mini-challenge-text');
    if (!text) return;
    if (!db.data.subjects || db.data.subjects.length === 0) {
        text.textContent = T.mini_challenge_no_subjects || "Add subjects first!";
        const smart = get('smart-suggestion');
        if (smart) smart.textContent = T.smart_suggestion || 'Smart Suggestion';
        return;
    }

    const rec = typeof db.getAdvancedRecommendation === 'function' ? db.getAdvancedRecommendation() : null;
    const challengeTitle = T.balance_challenge || "Mini Challenge";

    if (rec) {
        const format = (tmpl, vars) =>
            String(tmpl || '').replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? String(vars[k]) : ''));

        const typeLabel = rec.nextTask?.type === 'exercises'
            ? (T.exercises || 'Exercises')
            : (T.course || 'Course');
        const verb = rec.nextTask?.type === 'exercises'
            ? (T.practice || 'Practice')
            : (T.study || 'Study');

        const chapterPart = rec.nextTask?.chapterName ? `: <b>${rec.nextTask.chapterName}</b>` : '';
        const reasonText = rec.reasonKey ? format(T[rec.reasonKey] || rec.reasonKey, rec.reasonVars) : '';
        const reasonLabel = T.reason_label || 'Reason:';
        const reasonPart = reasonText
            ? ` <span class="mini-challenge-reason-label">${reasonLabel}</span><span class="mini-challenge-reason">${reasonText}</span>`
            : '';
        text.innerHTML = `${challengeTitle}: ${verb} <b>${rec.subjectName}</b> ${typeLabel}${chapterPart}${reasonPart}`;
    } else {
        // Fallback to any subject
        const sub = db.data.subjects[0];
        text.innerHTML = `${challengeTitle}: ${(T.study || T.course || 'Study')} <b>${sub.name}</b>`;
    }

    // Pomodoro "Smart Suggestion": if a subject is selected, suggest the next actionable chapter for it.
    const smart = get('smart-suggestion');
    if (smart) {
        const subId = this.activeSubjectId || null;
        if (!subId) {
            smart.textContent = T.smart_suggestion || 'Smart Suggestion';
        } else {
            let msg = null;
            const selectedChapter = typeof this._getPomodoroSelectedChapter === 'function'
                ? this._getPomodoroSelectedChapter(subId)
                : null;

            if (selectedChapter && typeof this._getPomodoroTaskForChapter === 'function') {
                const task = this._getPomodoroTaskForChapter(subId, selectedChapter.id);
                if (task?.type === 'course') {
                    msg = `📖 ${T.course || 'Course'}: ${selectedChapter.name}`;
                } else if (task?.type === 'exercises') {
                    msg = `✍️ ${T.exercises || 'Exercises'}: ${selectedChapter.name}`;
                } else {
                    msg = `${T.chapter_label || 'Chapter'}: ${selectedChapter.name} • ${T.all_done || 'All done!'}`;
                }
            } else {
                const chaps = db.data.chapters.filter(c => c.subject_id === subId);
                for (const c of chaps) {
                    if (!c.video_completed) { msg = `📖 ${T.course || 'Course'}: ${c.name}`; break; }
                    if (!c.exercises_completed) { msg = `✍️ ${T.exercises || 'Exercises'}: ${c.name}`; break; }
                }
            }
            smart.textContent = msg || (T.all_done || "🎉 All chapters completed!");
        }
    }
};
