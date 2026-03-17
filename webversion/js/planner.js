// Planner & Subject Logic
StudentProApp.prototype.refreshPlanner = function() {
    const T   = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];
    const sel = get('semester-selector');
    if (!sel) return;
    const delBtn = get('delete-semester-btn');

    if (!this.activeSemesterId && db.data.semesters.length > 0) {
        const savedId = localStorage.getItem('studentpro_active_semester');
        if (savedId && db.data.semesters.some(s => s.id == savedId)) {
            this.activeSemesterId = parseInt(savedId);
        } else {
            this.activeSemesterId = db.data.semesters[0].id;
        }
    }

    sel.innerHTML = `<option value="">${T.select_semester || '-- Select Semester --'}</option>`;
    db.data.semesters.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id; opt.textContent = s.name;
        if (s.id === this.activeSemesterId) opt.selected = true;
        sel.appendChild(opt);
    });
    if (delBtn) delBtn.disabled = !this.activeSemesterId;
    this.refreshSubjects();
};

StudentProApp.prototype.refreshSubjects = function() {
    const T = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];
    const grid    = get('subject-cards-grid');
    const empty   = get('planner-empty');
    const strip   = get('planner-stats-strip');
    if (!grid) return;

    grid.innerHTML = '';

    if (!this.activeSemesterId) {
        if (empty) empty.classList.remove('hidden');
        if (strip) strip.innerHTML = '';
        this.refreshPomodoroSubjects();
        return;
    }

    const ACCENT_COLORS = ['#6366f1','#0ea5a0','#f59e0b','#ef4444','#8b5cf6','#10b981','#f43f5e','#3b82f6'];
    const subjects = db.data.subjects.filter(s => s.semester_id === this.activeSemesterId);

    // ── Stats strip ──────────────────────────────────────
    if (strip) {
        const totalChapters  = subjects.reduce((acc, s) => acc + db.data.chapters.filter(c => c.subject_id === s.id).length, 0);
        const doneChapters   = subjects.reduce((acc, s) => acc + db.data.chapters.filter(c => c.subject_id === s.id && c.video_completed).length, 0);
        const upcomingExams  = subjects.filter(s => s.exam_date && new Date(s.exam_date) > new Date()).length;
        const overallPerc    = totalChapters > 0 ? Math.round((doneChapters / totalChapters) * 100) : 0;

        strip.innerHTML = `
            <div class="pstat"><div class="pstat-val">${subjects.length}</div><div class="pstat-lbl">${T.subjects || 'Subjects'}</div></div>
            <div class="pstat"><div class="pstat-val">${totalChapters}</div><div class="pstat-lbl">${T.chapters || 'Chapters'}</div></div>
            <div class="pstat"><div class="pstat-val">${overallPerc}%</div><div class="pstat-lbl">${T.progress || 'Progress'}</div></div>
            <div class="pstat"><div class="pstat-val">${upcomingExams}</div><div class="pstat-lbl">${T.upcoming_exams || 'Upcoming Exams'}</div></div>
        `;
    }

    // ── Empty state ───────────────────────────────────────
    if (subjects.length === 0) {
        if (empty) empty.classList.remove('hidden');
        this.refreshPomodoroSubjects();
        return;
    }
    if (empty) empty.classList.add('hidden');

    // ── Render cards ──────────────────────────────────────
    subjects.forEach((s, idx) => {
        const accentColor = ACCENT_COLORS[idx % ACCENT_COLORS.length];
        const chapters    = db.data.chapters.filter(c => c.subject_id === s.id);
        const videosDone  = chapters.filter(c => c.video_completed).length;
        const exDone      = chapters.filter(c => c.exercises_completed).length;
        const hasEx       = s.has_exercises !== false;
        const total       = hasEx ? chapters.length * 2 : chapters.length;
        const done        = hasEx ? videosDone + exDone : videosDone;
        const perc        = total > 0 ? Math.round((done / total) * 100) : 0;

        // SVG ring: circumference ≈ 2π×18 ≈ 113
        const CIRC = 113;
        const offset = CIRC - (perc / 100) * CIRC;

        // Exam badge
        let examBadge = '';
        if (s.exam_date) {
            const days = Math.ceil((new Date(s.exam_date) - new Date()) / 86400000);
            const cls  = days < 0 ? 'done' : days <= 7 ? 'urgent' : days <= 21 ? 'soon' : '';
            const lbl  = days < 0 ? (T.exam_passed || 'Exam passed') : days === 0 ? (T.exam_today || 'Exam today!') : `${days} ${T.days_to_exam || 'd to exam'}`;
            examBadge  = `<span class="subj-exam-badge ${cls}">📅 ${lbl}</span>`;
        }

        // Video chip
        const vAllDone = videosDone === chapters.length && chapters.length > 0;
        const vChip    = `<span class="subj-stat-chip ${vAllDone ? 'done' : ''}">📖 ${videosDone}/${chapters.length}</span>`;

        // Exercise chip (if applicable)
        const exAllDone = exDone === chapters.length && chapters.length > 0;
        const exChip    = hasEx
            ? `<span class="subj-stat-chip ${exAllDone ? 'done' : ''}">✍️ ${exDone}/${chapters.length}</span>`
            : '';

        // Action buttons
        const vBtnDone = chapters.length > 0 && chapters.every(c => c.video_completed);
        const eBtnDone = hasEx && chapters.length > 0 && chapters.every(c => c.exercises_completed);

        const card = document.createElement('div');
        card.className = 'subj-card';
        card.style.setProperty('--accent-color', accentColor);
        card.dataset.subjectId = s.id;

        card.innerHTML = `
            <button class="subj-delete-btn" onclick="event.stopPropagation();app.deleteSubjectCard(${s.id})" title="${T.delete_subject || 'Delete subject'}">
                <i class="fas fa-trash-alt"></i>
            </button>

            <div class="subj-card-top">
                <div class="subj-card-info">
                    <div class="subj-card-name">${s.name}</div>
                    ${examBadge}
                </div>
                <div class="progress-ring-wrap">
                    <svg class="progress-ring-svg" viewBox="0 0 58 58">
                        <circle class="progress-ring-bg" cx="29" cy="29" r="18"/>
                        <circle class="progress-ring-fill" cx="29" cy="29" r="18"
                            style="stroke-dashoffset:${offset}; stroke:${accentColor};"/>
                    </svg>
                    <div class="progress-ring-pct">${perc}%</div>
                </div>
            </div>

            <div class="subj-chapter-stats">
                ${chapters.length === 0
                    ? `<span class="subj-stat-chip">${T.no_chapters_yet || 'No chapters yet'}</span>`
                    : vChip + exChip
                }
            </div>

            <div class="subj-card-actions">
                ${chapters.length > 0 ? `
                <button class="subj-action-btn ${vBtnDone ? 'all-done' : ''}"
                    onclick="event.stopPropagation();app.toggleSubjectProgress(${s.id},'video')">
                    ${vBtnDone ? (T.course_done || '✓ Course Done') : '📖 ' + (T.toggle_course || 'Toggle Course')}
                </button>
                ${hasEx ? `
                <button class="subj-action-btn ${eBtnDone ? 'all-done' : ''}"
                    onclick="event.stopPropagation();app.toggleSubjectProgress(${s.id},'exercises')">
                    ${eBtnDone ? (T.exercises_done || '✓ Exercises Done') : '✍️ ' + (T.toggle_exercises || 'Toggle Exercises')}
                </button>` : ''}
                ` : ''}
                <button class="subj-open-btn" onclick="event.stopPropagation();app.openSubjectWindow(${s.id})" title="${T.add_chapter || 'Manage chapters'}">
                    <i class="fas fa-list-ul"></i>
                </button>
            </div>
        `;

        grid.appendChild(card);
    });

    this.refreshPomodoroSubjects();
};

StudentProApp.prototype.deleteSubjectCard = async function(subId) {
    const T = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];
    if (!confirm("Delete this subject and all its chapters?")) return;
    await db.deleteSubject(subId);
    if (this.activeSubjectId === subId) this.activeSubjectId = null;
    this.refreshSubjects();
    showToast(T.toast_subject_deleted || "Subject deleted.", 'info');
};

StudentProApp.prototype.toggleSubjectProgress = async function(subId, type) {
    const chapters = db.data.chapters.filter(c => c.subject_id === subId);
    if (chapters.length === 0) return;
    const allDone = chapters.every(c => type === 'video' ? c.video_completed : c.exercises_completed);
    for (let c of chapters) {
        await db.toggleChapterStatus(c.id, type, !allDone);
    }
    this.refreshPlanner();
};

StudentProApp.prototype.openSubjectWindow = function(id) {
    console.log(`[App] Planner: Opening Chapter Manager for ID ${id}`);
    this.activeSubjectId = id;
    const sub = db.data.subjects.find(s => s.id === id);
    if (!sub) return;
    const title = get('sw-title');
    if (title) title.textContent = sub.name;
    const examInput = get('sw-exam-date-input');
    if (examInput) examInput.value = sub.exam_date || '';
    this.refreshSubjectWindowData();
    this.showModal('subject-window-modal');
};

StudentProApp.prototype.refreshSubjectWindowData = function() {
    const list = get('sw-chapters-list');
    if (!list) return;
    list.innerHTML = '';
    const sub = db.data.subjects.find(s => s.id === this.activeSubjectId);
    if (!sub) return;
    const hasEx = sub.has_exercises !== false;

    db.data.chapters.filter(c => c.subject_id === this.activeSubjectId).forEach(c => {
        const item = document.createElement('div');
        item.className = 'list-item';
        
        let ytContent = '';
        if (c.youtube_url) {
            ytContent = `<a href="${c.youtube_url}" target="_blank" class="btn-icon" title="Watch on YouTube">
                            <i class="fab fa-youtube" style="color:#ff0000;"></i>
                         </a>`;
        } else {
            ytContent = `<span class="btn-icon" style="opacity:0.25;"><i class="fab fa-youtube"></i></span>`;
        }

        item.innerHTML = `
            <span style="font-weight:500;">${c.name}</span>
            <div style="display:flex; gap:6px; align-items:center;">
                <button class="small-btn ${c.video_completed ? 'primary-btn' : 'secondary-btn'}" onclick="app.toggleCap(${c.id}, 'video')">Course</button>
                ${hasEx ? `<button class="small-btn ${c.exercises_completed ? 'primary-btn' : 'secondary-btn'}" onclick="app.toggleCap(${c.id}, 'exercises')">Ex</button>` : ''}
                ${ytContent}
                <button class="btn-icon" onclick="app.editChapterYouTube(${c.id})" title="Edit YouTube"><i class="fas fa-edit"></i></button>
            </div>
        `;
        list.appendChild(item);
    });
};

StudentProApp.prototype.editChapterYouTube = async function(chapterId) {
    const c = db.data.chapters.find(x => x.id === chapterId);
    if (!c) return;
    const newUrl = prompt("Enter YouTube URL:", c.youtube_url || "");
    if (newUrl !== null) {
        await db.updateChapterYouTube(chapterId, newUrl.trim() || null);
        this.refreshSubjectWindowData();
        this.refreshPlanner();
    }
};

StudentProApp.prototype.toggleCap = async function(id, type) {
    const c = db.data.chapters.find(x => x.id === id);
    if (!c) return;
    await db.toggleChapterStatus(id, type, !(type === 'video' ? c.video_completed : c.exercises_completed));
    this.refreshSubjectWindowData();
    this.refreshPlanner();
};

StudentProApp.prototype.applyTemplateToSemester = async function(semId, template) {
    console.log(`[App] Applying template ${template.name} to semester ${semId}`);
    for (let sub of template.subjects) {
        const hasEx = sub.has_exercises !== false;
        const subId = await db.addSubject(semId, sub.name, null, hasEx);
        if (subId) {
            for (let ch of sub.chapters) {
                if (typeof ch === 'string') {
                    await db.addChapter(subId, ch);
                } else {
                    await db.addChapter(subId, ch.name, ch.url || null);
                }
            }
        }
    }
};
