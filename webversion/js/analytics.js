// Analytics Specific Logic
StudentProApp.prototype.refreshAnalytics = function() {
    const T = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];
    const ACCENT_COLORS = ['#6366f1','#0ea5a0','#f59e0b','#ef4444','#8b5cf6','#10b981','#f43f5e','#3b82f6'];
    const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    const subjects = db.data.subjects;
    const chapters = db.data.chapters;
    const sessions = db.data.study_sessions;

    // ── Toggle Empty State ────────────────────────────────
    const emptyEl = get('analytics-empty');
    const contentEl = get('analytics-content');
    if (emptyEl && contentEl) {
        const hasData = sessions.length > 0;
        emptyEl.classList.toggle('hidden', hasData);
        contentEl.classList.toggle('hidden', !hasData);
        if (!hasData) return;
    }

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
            ? (exam.days === 0 ? (T.today || 'Today!') : `${exam.days}${T.days_left ? ' ' + T.days_left : 'd'}`)
            : (T.none || '—');
        const examName = escapeHtml(exam?.name || '');
        const examNote = exam
            ? (exam.days <= 7
                ? `<span class="an-kpi-note warn" dir="auto" title="${examName}">⚠ ${examName}</span>`
                : `<span class="an-kpi-note" dir="auto" title="${examName}">${examName}</span>`)
            : `<span class="an-kpi-note">${T.no_exams_set || 'No exams set'}</span>`;
        const weekNote = weekSessions > 0
            ? `${weekSessions} ${T.sessions_this_week_label || 'this week'}`
            : `0 ${T.sessions_this_week_label || 'this week'}`;

        kpiRow.innerHTML = `
            <div class="an-kpi" style="--kpi-color:#6366f1;">
                <div class="an-kpi-val">${overallPerc}%</div>
                <div class="an-kpi-lbl">${T.overall_progress_an || T.overall_progress || 'Overall Progress'}</div>
                <div class="an-kpi-note">${stats.done}/${stats.total} ${T.tasks_label || T.tasks_completed || 'tasks'}</div>
            </div>
            <div class="an-kpi" style="--kpi-color:#0ea5a0;">
                <div class="an-kpi-val">${totalSubs}</div>
                <div class="an-kpi-lbl">${T.subjects_an || T.subjects || 'Subjects'}</div>
                <div class="an-kpi-note">${totalChaps} ${T.chapters_total || 'chapters total'}</div>
            </div>
            <div class="an-kpi" style="--kpi-color:#f59e0b;">
                <div class="an-kpi-val">${examText}</div>
                <div class="an-kpi-lbl">${T.next_exam || 'Next Exam'}</div>
                ${examNote}
            </div>
            <div class="an-kpi" style="--kpi-color:#ef4444;">
                <div class="an-kpi-val">${totalSess}</div>
                <div class="an-kpi-lbl">${T.total_sessions_label || 'Total Sessions'}</div>
                <div class="an-kpi-note ${weekSessions > 0 ? 'up' : ''}">${weekNote}</div>
            </div>
        `;
    }

    // ── Subject count badge ───────────────────────────────
    const subsBadge = get('an-subjects-count');
    if (subsBadge) {
        const subWord = T.subjects_an || T.subjects || 'subjects';
        subsBadge.textContent = `${totalSubs} ${subWord}`;
    }

    // ── Subject Progress Bars ─────────────────────────────
    const subBarsEl = get('an-subject-bars');
    if (subBarsEl) {
        if (subjects.length === 0) {
            subBarsEl.innerHTML = `<div class="an-sb-empty">${T.no_subjects_analytics || T.no_subjects_yet || 'No subjects yet'}</div>`;
        } else {
            subBarsEl.innerHTML = subjects.map((s, idx) => {
                const color   = ACCENT_COLORS[idx % ACCENT_COLORS.length];
                const safeName = escapeHtml(s.name || (T.subjects || 'Subject'));
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
                            <span class="an-sb-name" dir="auto" title="${safeName}">${safeName}</span>
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
        const DAYS_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const DAYS_AR = ['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
        const DAYS_FR = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
        const DAYS = this.selectedLang === 'Arabic' ? DAYS_AR
                   : this.selectedLang === 'French' ? DAYS_FR
                   : DAYS_EN;
        const counts = Array(7).fill(0);
        sessions.forEach(s => {
            const d    = new Date(s.timestamp || s.created_at || 0);
            const diff = Math.floor((now - d) / 86400000);
            if (diff >= 0 && diff < 7) counts[6 - diff]++;
        });
        const maxC = Math.max(...counts, 1);
        const weekTotal7 = counts.reduce((a, b) => a + b, 0);
        const sessWord = weekTotal7 === 1
            ? (T.session_singular || 'session')
            : (T.sessions_this_week || 'sessions');
        if (weekTotalEl) weekTotalEl.textContent = `${weekTotal7} ${sessWord}`;

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
            examListEl.innerHTML = `<div class="an-exam-empty">${T.no_exams_upcoming || T.no_exams || 'No upcoming exams 🎉'}</div>`;
        } else {
            examListEl.innerHTML = exams.slice(0, 5).map(e => {
                const cls  = e.days <= 7  ? 'urgent' : e.days <= 21 ? 'soon' : 'safe';
                const lbl  = e.days === 0
                    ? (T.today || 'Today!')
                    : `${e.days} ${T.days_left || 'd left'}`;
                const safeExamName = escapeHtml(e.name);
                return `
                    <div class="an-exam-item ${cls}">
                        <span class="an-exam-name" dir="auto" title="${safeExamName}">${safeExamName}</span>
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
        const minTotalLabel = T.min_total || 'min total';
        if (bkTotal) bkTotal.textContent = `${totalMins} ${minTotalLabel}`;

        if (entries.length === 0) {
            bkEl.innerHTML = `<div class="an-bk-empty">${T.no_sessions_analytics || T.no_sessions || 'No sessions recorded yet'}</div>`;
        } else {
            const maxVal = entries[0][1];
            bkEl.innerHTML = entries.map(([name, mins], idx) => {
                const color = ACCENT_COLORS[idx % ACCENT_COLORS.length];
                const width = Math.round((mins / maxVal) * 100);
                const safeName = escapeHtml(name);
                return `
                    <div class="an-bk-row">
                        <span class="an-bk-dot" style="background:${color};"></span>
                        <span class="an-bk-name" dir="auto" title="${safeName}">${safeName}</span>
                        <div class="an-bk-bar-wrap">
                            <div class="an-bk-bar" style="width:${width}%;background:${color};opacity:0.8;"></div>
                        </div>
                        <span class="an-bk-val">${mins} ${minTotalLabel}</span>
                    </div>
                `;
            }).join('');
        }
    }
};
