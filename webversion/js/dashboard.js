// Dashboard Specific Logic
StudentProApp.prototype.refreshDashboard = function() {
    const ACCENT_COLORS = ['#6366f1','#0ea5a0','#f59e0b','#ef4444','#8b5cf6','#10b981','#f43f5e','#3b82f6'];

    // ── Date ─────────────────────────────────────────────
    const dateEl = get('current-date');
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' });

    // ── Username ──────────────────────────────────────────
    const uname = get('dash-username');
    if (uname) uname.textContent = db.data?.user_profile?.display_name || 'Student';

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
            examVal.textContent = exam.days === 0 ? 'Today!' : `${exam.days}d`;
            if (examSub) examSub.textContent = exam.name;
        } else {
            examVal.textContent = '—';
            if (examSub) examSub.textContent = 'No exams set';
        }
    }

    // ── Streak ────────────────────────────────────────────
    const streakEl = get('streak-val');
    if (streakEl) streakEl.textContent = db.getStudyStreak();

    // ── Sessions ──────────────────────────────────────────
    const sessEl = get('dash-total-sessions');
    if (sessEl) sessEl.textContent = db.data?.user_profile?.total_sessions || 0;

    // ── Daily goal ────────────────────────────────────────
    const GOAL = 3;
    const totalSessions = db.data?.user_profile?.total_sessions || 0;
    const todaySessions = Math.min(totalSessions % GOAL || 0, GOAL);
    const goalVal = get('daily-goal-val');
    const goalFill = get('daily-goal-bar');
    if (goalVal) goalVal.textContent = `${todaySessions}/${GOAL}`;
    if (goalFill) goalFill.style.width = `${(todaySessions / GOAL) * 100}%`;
    const dotsEl = get('daily-dots');
    if (dotsEl) {
        dotsEl.querySelectorAll('.ddot').forEach((dot, i) => {
            dot.classList.toggle('done', i < todaySessions);
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
            todoContainer.innerHTML = '<div class="db-todo-empty">🎉 All caught up!</div>';
        } else {
            todos.slice(0, 6).forEach((t, idx) => {
                const color = ACCENT_COLORS[idx % ACCENT_COLORS.length];
                const type  = !t.video_completed ? 'Course' : 'Exercises';
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
        const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const today = new Date();
        const weekCounts = Array(7).fill(0);
        const subjectCounts = {};

        db.data.study_sessions.forEach(s => {
            if (!s.timestamp && !s.created_at) return;
            const d = new Date(s.timestamp || s.created_at);
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
        if (weekPill) weekPill.textContent = `${weekTotal} session${weekTotal !== 1 ? 's' : ''}`;

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
    const text = get('mini-challenge-text');
    if (!text) return;
    if (!db.data.subjects || db.data.subjects.length === 0) {
        text.textContent = "Add subjects first!";
        return;
    }
    const sub = db.data.subjects[0];
    text.innerHTML = `Balance Challenge: Study <b>${sub.name}</b>`;
};
