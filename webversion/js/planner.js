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

StudentProApp.prototype.ensurePlannerUiState = function() {
    if (!(this.plannerExpandedSubjects instanceof Set)) {
        this.plannerExpandedSubjects = new Set();
    }
    if (!this.plannerActiveFilter) {
        this.plannerActiveFilter = 'all';
    }
};

StudentProApp.prototype.setPlannerFilter = function(filter) {
    this.ensurePlannerUiState();
    const allowed = new Set(['all', 'course_left', 'exercises_left', 'done']);
    this.plannerActiveFilter = allowed.has(filter) ? filter : 'all';
    this.refreshSubjects();
};

StudentProApp.prototype.updatePlannerFilterUi = function() {
    this.ensurePlannerUiState();
    document.querySelectorAll('.planner-filter-btn[data-filter]').forEach(btn => {
        const isActive = btn.dataset.filter === this.plannerActiveFilter;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
};

StudentProApp.prototype.isPlannerChapterVisibleForFilter = function(chapter, subject) {
    this.ensurePlannerUiState();
    const hasExercises = subject.has_exercises !== false;
    switch (this.plannerActiveFilter) {
        case 'course_left':
            return !chapter.video_completed;
        case 'exercises_left':
            return hasExercises && !chapter.exercises_completed;
        case 'done':
            return chapter.video_completed && (!hasExercises || chapter.exercises_completed);
        case 'all':
        default:
            return true;
    }
};

StudentProApp.prototype.refreshSubjects = function() {
    const T = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];
    const grid    = get('subject-cards-grid');
    const empty   = get('planner-empty');
    const strip   = get('planner-stats-strip');
    if (!grid) return;

    this.ensurePlannerUiState();
    this.updatePlannerFilterUi();
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
        const filteredChapters = chapters.filter(c => this.isPlannerChapterVisibleForFilter(c, s));
        const videosDone  = chapters.filter(c => c.video_completed).length;
        const exDone      = chapters.filter(c => c.exercises_completed).length;
        const hasEx       = s.has_exercises !== false;
        const total       = hasEx ? chapters.length * 2 : chapters.length;
        const done        = hasEx ? videosDone + exDone : videosDone;
        const perc        = total > 0 ? Math.round((done / total) * 100) : 0;
        const isExpanded  = this.plannerExpandedSubjects.has(s.id);

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

        let nextTaskHtml = `<div class="subj-next-row"><span class="subj-next-label">${T.up_next || 'Up Next'}</span><span class="subj-next-pill done">${T.all_done || 'All done!'}</span></div>`;
        for (const chapter of chapters) {
            if (!chapter.video_completed) {
                nextTaskHtml = `
                    <div class="subj-next-row">
                        <span class="subj-next-label">${T.up_next || 'Up Next'}</span>
                        <span class="subj-next-pill">📖 ${(T.course || 'Course')}: ${chapter.name}</span>
                    </div>
                `;
                break;
            }
            if (hasEx && !chapter.exercises_completed) {
                nextTaskHtml = `
                    <div class="subj-next-row">
                        <span class="subj-next-label">${T.up_next || 'Up Next'}</span>
                        <span class="subj-next-pill">✍️ ${(T.exercises || 'Exercises')}: ${chapter.name}</span>
                    </div>
                `;
                break;
            }
        }

        const chapterRows = filteredChapters.map(c => {
            const resourceCount = Array.isArray(c.resources) ? c.resources.length : 0;
            const resourceText = resourceCount > 0 ? `📎 ${resourceCount}` : '';
            return `
                <div class="planner-chapter-row">
                    <div class="planner-chapter-main">
                        <div class="planner-chapter-name">${c.name}</div>
                        <div class="planner-chapter-meta">
                            ${resourceText ? `<span class="planner-chapter-meta-pill">${resourceText}</span>` : ''}
                        </div>
                    </div>
                    <div class="planner-chapter-actions">
                        <button class="planner-check-btn ${c.video_completed ? 'done' : ''}"
                            onclick="event.stopPropagation();app.togglePlannerChapterStatus(${c.id}, 'video')"
                            title="${T.course || 'Course'}">
                            <i class="fas ${c.video_completed ? 'fa-check-circle' : 'fa-circle'}"></i>
                            <span>${T.course || 'Course'}</span>
                        </button>
                        ${hasEx ? `
                        <button class="planner-check-btn ${c.exercises_completed ? 'done' : ''}"
                            onclick="event.stopPropagation();app.togglePlannerChapterStatus(${c.id}, 'exercises')"
                            title="${T.exercises || 'Exercises'}">
                            <i class="fas ${c.exercises_completed ? 'fa-check-circle' : 'fa-circle'}"></i>
                            <span>${T.exercises || 'Exercises'}</span>
                        </button>` : ''}
                        <button class="planner-resource-btn"
                            onclick="event.stopPropagation();app.editChapterResources(${c.id})"
                            title="${T.chapter_manager || 'Chapter Manager'}">
                            <i class="fas fa-paperclip"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        const inlineEmptyMessage = chapters.length === 0
            ? (T.no_chapters_yet || 'No chapters yet')
            : (this.plannerActiveFilter === 'all'
                ? (T.no_chapters_yet || 'No chapters yet')
                : (T.planner_no_filter_matches || 'No chapters match this filter.'));

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

            ${nextTaskHtml}

            <div class="subj-chapter-stats">
                ${chapters.length === 0
                    ? `<span class="subj-stat-chip">${T.no_chapters_yet || 'No chapters yet'}</span>`
                    : vChip + exChip
                }
            </div>

            <div class="subj-card-actions">
                <button class="subj-expand-btn"
                    onclick="event.stopPropagation();app.togglePlannerSubjectExpand(${s.id})"
                    aria-expanded="${isExpanded ? 'true' : 'false'}"
                    title="${T.chapters || 'Chapters'}">
                    <i class="fas ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}"></i>
                    <span>${T.chapters || 'Chapters'}</span>
                </button>
                <button class="subj-manage-btn" onclick="event.stopPropagation();app.openSubjectWindow(${s.id})" title="${T.chapter_manager || 'Chapter Manager'}">
                    <i class="fas fa-list-ul"></i>
                    <span>${T.chapter_manager || 'Chapter Manager'}</span>
                </button>
            </div>

            <div class="subj-inline-panel ${isExpanded ? 'expanded' : ''}">
                <div class="subj-quick-add">
                    <input
                        id="planner-chapter-input-${s.id}"
                        type="text"
                        placeholder="${T.add_chapter_placeholder || 'Add Chapter…'}"
                        onkeydown="app.handlePlannerQuickAddKey(event, ${s.id})">
                    <button class="primary-btn small-btn"
                        onclick="event.stopPropagation();app.addPlannerChapter(${s.id})">
                        <i class="fas fa-plus"></i> ${T.add || 'Add'}
                    </button>
                </div>

                <div class="subj-inline-list">
                    ${filteredChapters.length > 0
                        ? chapterRows
                        : `<div class="subj-inline-empty">${inlineEmptyMessage}</div>`
                    }
                </div>

                ${chapters.length > 0 ? `
                <div class="subj-inline-footer">
                    <button class="subj-inline-footer-btn"
                        onclick="event.stopPropagation();app.toggleSubjectProgress(${s.id},'video')">
                        📖 ${T.toggle_course || 'Toggle Course'}
                    </button>
                    ${hasEx ? `
                    <button class="subj-inline-footer-btn"
                        onclick="event.stopPropagation();app.toggleSubjectProgress(${s.id},'exercises')">
                        ✍️ ${T.toggle_exercises || 'Toggle Exercises'}
                    </button>` : ''}
                </div>` : ''}
            </div>
        `;

        grid.appendChild(card);
    });

    this.refreshPomodoroSubjects();
};

StudentProApp.prototype.togglePlannerSubjectExpand = function(subId) {
    this.ensurePlannerUiState();
    if (this.plannerExpandedSubjects.has(subId)) this.plannerExpandedSubjects.delete(subId);
    else this.plannerExpandedSubjects.add(subId);
    this.refreshSubjects();
};

StudentProApp.prototype.handlePlannerQuickAddKey = function(event, subId) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    this.addPlannerChapter(subId);
};

StudentProApp.prototype.addPlannerChapter = async function(subId) {
    const input = get(`planner-chapter-input-${subId}`);
    const name = input?.value?.trim();
    if (!name) {
        input?.focus();
        return;
    }

    await db.addChapter(subId, name);
    if (input) input.value = '';
    this.ensurePlannerUiState();
    this.plannerExpandedSubjects.add(subId);
    this.refreshPlanner();
};

StudentProApp.prototype.deleteSubjectCard = async function(subId) {
    const T = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];
    if (!confirm("Delete this subject and all its chapters?")) return;
    await db.deleteSubject(subId);
    if (this.activeSubjectId === subId) this.activeSubjectId = null;
    this.ensurePlannerUiState();
    this.plannerExpandedSubjects.delete(subId);
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
    const chapters = db.data.chapters.filter(c => c.subject_id === this.activeSubjectId);

    chapters.forEach(c => {
        const item = document.createElement('div');
        item.className = 'list-item';
        
        let resourceIcons = '';
        const resources = c.resources || [];
        
        // If we have a youtube_url but no video resource, add it temporarily for rendering
        const displayResources = [...resources];
        if (c.youtube_url && !displayResources.some(r => r.type === 'video')) {
            displayResources.push({ type: 'video', url: c.youtube_url, label: 'Video' });
        }

        if (displayResources.length > 0) {
            displayResources.forEach(res => {
                let iconClass = 'fas fa-link';
                let color = '#888';
                let title = res.label || res.type;

                if (res.type === 'video') { iconClass = 'fab fa-youtube'; color = '#ff0000'; }
                else if (res.type === 'pdf') { iconClass = 'fas fa-file-pdf'; color = '#e74c3c'; }
                else if (res.type === 'exercise') { iconClass = 'fas fa-pen-nib'; color = '#27ae60'; }
                else if (res.type === 'exam') { iconClass = 'fas fa-graduation-cap'; color = '#f1c40f'; }

                resourceIcons += `<a href="${res.url}" target="_blank" class="btn-icon" title="${title}">
                                    <i class="${iconClass}" style="color:${color};"></i>
                                 </a>`;
            });
        } else {
            // Search URL fallback if no resources
            const searchQuery = encodeURIComponent(`${sub.name} ${c.name}`);
            const searchUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
            resourceIcons = `<a href="${searchUrl}" target="_blank" class="btn-icon" title="Search on YouTube" style="opacity:0.4;">
                                <i class="fas fa-search"></i>
                             </a>`;
        }

        item.innerHTML = `
            <span style="font-weight:500;">${c.name}</span>
            <div style="display:flex; gap:6px; align-items:center;">
                <button class="small-btn ${c.video_completed ? 'primary-btn' : 'secondary-btn'}" onclick="app.toggleCap(${c.id}, 'video')">Course</button>
                ${hasEx ? `<button class="small-btn ${c.exercises_completed ? 'primary-btn' : 'secondary-btn'}" onclick="app.toggleCap(${c.id}, 'exercises')">Ex</button>` : ''}
                ${resourceIcons}
                <button class="btn-icon" onclick="app.editChapterResources(${c.id})" title="Edit Resources"><i class="fas fa-edit"></i></button>
            </div>
        `;
        list.appendChild(item);
    });
};

StudentProApp.prototype.editChapterResources = function(chapterId) {
    console.log(`[App] Opening Resource Manager for chapter ${chapterId}`);
    this.activeChapterId = chapterId;
    const c = db.data.chapters.find(x => x.id === chapterId);
    if (!c) return;
    
    this.currentResources = JSON.parse(JSON.stringify(c.resources || []));
    
    // Migrate youtube_url if missing in resources
    if (c.youtube_url && !this.currentResources.some(r => r.type === 'video')) {
        this.currentResources.push({ type: 'video', url: c.youtube_url, label: 'Video Lesson' });
    }

    this.refreshResourceManager();
    this.showModal('resource-manager-modal');
};

StudentProApp.prototype.refreshResourceManager = function() {
    const list = get('rm-resources-list');
    if (!list) return;
    list.innerHTML = '';

    this.currentResources.forEach((res, idx) => {
        const item = document.createElement('div');
        item.className = 'list-item';
        
        let icon = '🎬';
        if (res.type === 'pdf') icon = '📄';
        else if (res.type === 'exercise') icon = '✍️';
        else if (res.type === 'exam') icon = '🏆';
        else if (res.type === 'other') icon = '🔗';

        item.innerHTML = `
            <div style="display:flex; flex-direction:column; flex:1;">
                <span style="font-size:14px; font-weight:600;">${icon} ${res.label || res.type}</span>
                <span class="mute" style="font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:200px;">${res.url}</span>
            </div>
            <button class="btn-icon" onclick="app.removeResource(${idx})" style="color:var(--danger);">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
        list.appendChild(item);
    });
};

StudentProApp.prototype.removeResource = function(idx) {
    this.currentResources.splice(idx, 1);
    this.refreshResourceManager();
};

StudentProApp.prototype.addResource = function() {
    const type = get('rm-type-input').value;
    const label = get('rm-label-input').value.trim();
    const url = get('rm-url-input').value.trim();

    if (!url) {
        showToast("Please enter a URL", 'warning');
        return;
    }

    this.currentResources.push({
        type: type,
        label: label || type.charAt(0).toUpperCase() + type.slice(1),
        url: url
    });

    get('rm-label-input').value = '';
    get('rm-url-input').value = '';
    this.refreshResourceManager();
};

StudentProApp.prototype.toggleCap = async function(id, type) {
    const c = db.data.chapters.find(x => x.id === id);
    if (!c) return;
    console.log(
        `[Planner] Chapter toggle: id=${id}, subject_id=${c.subject_id}, chapter="${c.name}", field=${type}, next=${!(type === 'video' ? c.video_completed : c.exercises_completed)}`
    );
    await db.toggleChapterStatus(id, type, !(type === 'video' ? c.video_completed : c.exercises_completed));
    this.refreshSubjectWindowData();
    this.refreshPlanner();
};

StudentProApp.prototype.togglePlannerChapterStatus = async function(id, type) {
    await this.toggleCap(id, type);
};

StudentProApp.prototype.applyTemplateToSemester = async function(semId, template) {
    console.log(`[App] Applying template ${template.name} to semester ${semId}`);
    for (let sub of template.subjects) {
        const hasEx = sub.has_exercises !== false;
        const subId = await db.addSubject(semId, sub.name, null, hasEx);
        if (!subId) continue;

        for (let chap of sub.chapters) {
            if (typeof chap === 'string') {
                await db.addChapter(subId, chap);
            } else {
                const resources = chap.resources ? JSON.parse(JSON.stringify(chap.resources)) : [];
                let ytUrl = chap.url || null;

                // Ensure consistency
                if (ytUrl && !resources.some(r => r.type === 'video')) {
                    resources.push({ type: 'video', url: ytUrl, label: 'Video Lesson' });
                } else if (!ytUrl && resources.some(r => r.type === 'video')) {
                    ytUrl = resources.find(r => r.type === 'video').url;
                }

                await db.addChapter(subId, chap.name, ytUrl, resources);
            }
        }
    }
};
