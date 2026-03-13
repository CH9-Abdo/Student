// Analytics Specific Logic
StudentProApp.prototype.refreshAnalytics = function() {
    const ACCENT_COLORS = ['#6366f1','#0ea5a0','#f59e0b','#ef4444','#8b5cf6','#10b981','#f43f5e','#3b82f6'];
    const subjects = db.data.subjects;
    const chapters = db.data.chapters;
    const sessions = db.data.study_sessions;

    // ── Compute base stats ────────────────────────────────
    const stats   = db.getProgressStats();
    const overallPerc = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
    const totalChaps  = chapters.length;
    const totalSubs   = subjects.length;
    const totalSess   = db.data?.user_profile?.total_sessions || sessions.length;

    // Sessions this week
    const now = new Date();
    const weekSessions = sessions.filter(s => {
        const d = new Date(s.timestamp || s.created_at || 0);
        return (now - d) < 7 * 86400000;
    }).length;

    // ── KPI Row ───────────────────────────────────────────
    const kpiRow = get('an-kpi-row');
    if (kpiRow) {
        const exam = db.getNextExamInfo();
        const examText = exam
            ? (exam.days === 0 ? 'Today!' : `${exam.days}d`)
            : '—';
        const examNote = exam
            ? (exam.days <= 7 ? `<span class="an-kpi-note warn">⚠ ${exam.name}</span>`
                              : `<span class="an-kpi-note">${exam.name}</span>`)
            : `<span class="an-kpi-note">No exams set</span>`;

        kpiRow.innerHTML = `
            <div class="an-kpi" style="--kpi-color:#6366f1;">
                <div class="an-kpi-val">${overallPerc}%</div>
                <div class="an-kpi-lbl">Overall Progress</div>
                <div class="an-kpi-note">${stats.done}/${stats.total} tasks</div>
            </div>
            <div class="an-kpi" style="--kpi-color:#0ea5a0;">
                <div class="an-kpi-val">${totalSubs}</div>
                <div class="an-kpi-lbl">Subjects</div>
                <div class="an-kpi-note">${totalChaps} chapters total</div>
            </div>
            <div class="an-kpi" style="--kpi-color:#f59e0b;">
                <div class="an-kpi-val">${examText}</div>
                <div class="an-kpi-lbl">Next Exam</div>
                ${examNote}
            </div>
            <div class="an-kpi" style="--kpi-color:#ef4444;">
                <div class="an-kpi-val">${totalSess}</div>
                <div class="an-kpi-lbl">Total Sessions</div>
                <div class="an-kpi-note ${weekSessions > 0 ? 'up' : ''}">${weekSessions} this week</div>
            </div>
        `;
    }

    // ── Subject count badge ───────────────────────────────
    const subsBadge = get('an-subjects-count');
    if (subsBadge) subsBadge.textContent = `${totalSubs} subject${totalSubs !== 1 ? 's' : ''}`;

    // ── Subject Progress Bars ─────────────────────────────
    const subBarsEl = get('an-subject-bars');
    if (subBarsEl) {
        if (subjects.length === 0) {
            subBarsEl.innerHTML = '<div class="an-sb-empty">No subjects yet</div>';
        } else {
            subBarsEl.innerHTML = subjects.map((s, idx) => {
                const color   = ACCENT_COLORS[idx % ACCENT_COLORS.length];
                const chaps   = chapters.filter(c => c.subject_id === s.id);
                const vDone   = chaps.filter(c => c.video_completed).length;
                const eDone   = chaps.filter(c => c.exercises_completed).length;
                const hasEx   = s.has_exercises !== false;
                const total   = hasEx ? chaps.length * 2 : chaps.length;
                const done    = hasEx ? vDone + eDone : vDone;
                const perc    = total > 0 ? Math.round((done / total) * 100) : 0;
                const vChip   = `<span class="an-chip ${vDone === chaps.length && chaps.length > 0 ? 'done' : ''}">📖 ${vDone}/${chaps.length}</span>`;
                const eChip   = hasEx
                    ? `<span class="an-chip ${eDone === chaps.length && chaps.length > 0 ? 'done' : ''}">✍️ ${eDone}/${chaps.length}</span>`
                    : '';
                return `
                    <div class="an-sb-row">
                        <div class="an-sb-top">
                            <span class="an-sb-name">${s.name}</span>
                            <span class="an-sb-pct">${perc}%</span>
                        </div>
                        <div class="an-sb-track">
                            <div class="an-sb-fill" style="width:${perc}%;background:${color};"></div>
                        </div>
                        <div class="an-sb-chips">${vChip}${eChip}</div>
                    </div>
                `;
            }).join('');
        }
    }

    // ── Weekly bar chart ──────────────────────────────────
    const weekChartEl = get('an-weekly-chart');
    const weekTotalEl = get('an-week-total');
    if (weekChartEl) {
        const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const counts = Array(7).fill(0);
        sessions.forEach(s => {
            const d    = new Date(s.timestamp || s.created_at || 0);
            const diff = Math.floor((now - d) / 86400000);
            if (diff >= 0 && diff < 7) counts[6 - diff]++;
        });
        const maxC = Math.max(...counts, 1);
        const weekTotal7 = counts.reduce((a, b) => a + b, 0);
        if (weekTotalEl) weekTotalEl.textContent = `${weekTotal7} this week`;

        weekChartEl.innerHTML = counts.map((c, i) => {
            const dayIdx   = (now.getDay() - 6 + i + 7) % 7;
            const isToday  = i === 6;
            const heightPx = Math.round((c / maxC) * 88) + 4;
            const cls      = c === 0 ? 'zero' : isToday ? 'today' : '';
            return `
                <div class="an-bc-col">
                    <span class="an-bc-val">${c > 0 ? c : ''}</span>
                    <div class="an-bc-bar ${cls}" style="height:${heightPx}px;"></div>
                    <span class="an-bc-lbl">${DAYS[dayIdx]}</span>
                </div>
            `;
        }).join('');
    }

    // ── Exam countdown ────────────────────────────────────
    const examListEl = get('an-exam-timeline');
    if (examListEl) {
        const exams = subjects
            .filter(s => s.exam_date)
            .map(s => {
                const days = Math.ceil((new Date(s.exam_date) - now) / 86400000);
                return { name: s.name, days };
            })
            .filter(e => e.days >= 0)
            .sort((a, b) => a.days - b.days);

        if (exams.length === 0) {
            examListEl.innerHTML = '<div class="an-exam-empty">No upcoming exams 🎉</div>';
        } else {
            examListEl.innerHTML = exams.slice(0, 5).map(e => {
                const cls  = e.days <= 7  ? 'urgent' : e.days <= 21 ? 'soon' : 'safe';
                const lbl  = e.days === 0 ? 'Today!' : `${e.days}d left`;
                return `
                    <div class="an-exam-item ${cls}">
                        <span class="an-exam-name">${e.name}</span>
                        <span class="an-exam-days">${lbl}</span>
                    </div>
                `;
            }).join('');
        }
    }

    // ── Subject time breakdown ────────────────────────────
    const bkEl      = get('subject-breakdown-list');
    const bkTotal   = get('an-total-mins');
    if (bkEl) {
        // Build per-subject session counts
        const subMap = {};
        sessions.forEach(s => {
            const sub  = db.data.subjects.find(x => x.id === s.subject_id);
            const name = sub?.name || 'Unknown';
            subMap[name] = (subMap[name] || 0) + (s.duration_minutes || 25);
        });

        const entries = Object.entries(subMap).sort((a, b) => b[1] - a[1]);
        const totalMins = entries.reduce((acc, [, v]) => acc + v, 0);
        if (bkTotal) bkTotal.textContent = totalMins > 0 ? `${totalMins} min total` : '0 min total';

        if (entries.length === 0) {
            bkEl.innerHTML = '<div class="an-bk-empty">No sessions recorded yet</div>';
        } else {
            const maxVal = entries[0][1];
            bkEl.innerHTML = entries.map(([name, mins], idx) => {
                const color = ACCENT_COLORS[idx % ACCENT_COLORS.length];
                const width = Math.round((mins / maxVal) * 100);
                return `
                    <div class="an-bk-row">
                        <span class="an-bk-dot" style="background:${color};"></span>
                        <span class="an-bk-name">${name}</span>
                        <div class="an-bk-bar-wrap">
                            <div class="an-bk-bar" style="width:${width}%;background:${color};opacity:0.8;"></div>
                        </div>
                        <span class="an-bk-val">${mins} min</span>
                    </div>
                `;
            }).join('');
        }
    }
};
