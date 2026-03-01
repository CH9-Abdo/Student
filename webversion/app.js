// Main App Controller - StudentPro Web V4
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new StudentProApp();
    window.app = app;
});

class StudentProApp {
    constructor() {
        this.currentTab = 'dashboard';
        this.activeSemesterId = null;
        this.activeSubjectId = null;
        this.timer = null;
        this.timeLeft = 25 * 60;
        this.timerRunning = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.refreshDate();
        this.initCharts();
    }

    async onLogin(user) {
        document.getElementById('sidebar-user-email').textContent = `👤 ${user.email}`;
        document.getElementById('user-info-sidebar').classList.remove('hidden');
        
        const syncLabel = document.getElementById('last-sync-label');
        syncLabel.textContent = "🔄 Syncing...";
        
        const success = await db.syncFromCloud();
        if (success) {
            syncLabel.textContent = `🔄 Last sync: ${db.lastSync}`;
        } else {
            syncLabel.textContent = "⚠️ Sync failed";
        }

        this.loadSettings();
        this.refreshAll();
    }

    loadSettings() {
        const s = db.data.settings;
        document.body.setAttribute('data-theme', s.theme);
        document.getElementById('theme-select').value = s.theme;
        document.getElementById('lang-select').value = s.lang;
        
        if (document.getElementById('sync-mode-select')) {
            document.getElementById('sync-mode-select').value = s.sync_mode || 'Automatic';
        }
        
        this.applyLanguage(s.lang);
        
        if (s.theme === 'Dark') document.body.classList.add('dark-theme');
        else document.body.classList.remove('dark-theme');
    }

    applyLanguage(lang) {
        const texts = TRANSLATIONS[lang] || TRANSLATIONS["English"];
        
        // Update navigation
        const navBtns = document.querySelectorAll('.nav-btn');
        const navItems = ['dashboard', 'planner', 'pomodoro', 'analytics', 'settings'];
        navBtns.forEach((btn, i) => {
            if (navItems[i]) {
                const textSpan = btn.querySelector('.nav-text');
                if (textSpan) textSpan.textContent = texts[navItems[i]];
            }
        });
        
        // Headers
        document.querySelector('#dashboard .h1').textContent = texts.dashboard;
        document.querySelector('#planner .h1').textContent = texts.planner;
        document.querySelector('#settings .h1').textContent = texts.settings;

        // Dashboard Labels
        const statCards = document.querySelectorAll('.stat-card .mute:first-child');
        if (statCards[0]) statCards[0].textContent = "📈 " + texts.overall_progress;
        if (statCards[1]) statCards[1].textContent = "📅 " + texts.next_exam;
        if (statCards[2]) statCards[2].textContent = "🔥 " + texts.streak;

        document.querySelector('.todo-column .h2').textContent = texts.up_next;
        
        // Settings Sync
        if (document.getElementById('cloud-sync-title')) {
            document.getElementById('cloud-sync-title').textContent = texts.database_sync || "Cloud Sync";
            document.getElementById('sync-mode-label').textContent = texts.sync_mode + ":";
            document.getElementById('web-upload-btn').textContent = texts.upload;
            document.getElementById('web-download-btn').textContent = texts.download;
        }

        // RTL Support
        if (lang === 'Arabic') {
            document.documentElement.dir = "rtl";
            document.body.classList.add('rtl');
        } else {
            document.documentElement.dir = "ltr";
            document.body.classList.remove('rtl');
        }
    }

    refreshDate() {
        const now = new Date();
        document.getElementById('current-date').textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    }

    setupEventListeners() {
        // --- Auth ---
        document.getElementById('do-login-btn').addEventListener('click', async () => {
            const btn = document.getElementById('do-login-btn');
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const err = document.getElementById('login-error');
            if (!email || !password) return;
            btn.textContent = "Logging in..."; btn.disabled = true;
            try { await auth.signIn(email, password); } 
            catch (e) { err.textContent = e.message; err.classList.remove('hidden'); }
            finally { btn.textContent = "Login"; btn.disabled = false; }
        });

        document.getElementById('toggle-password').addEventListener('click', () => {
            const input = document.getElementById('login-password');
            input.type = input.type === 'password' ? 'text' : 'password';
        });

        document.getElementById('logout-btn').addEventListener('click', () => auth.signOut());

        // --- Tabs ---
        document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // --- Planner ---
        document.getElementById('add-semester-btn').addEventListener('click', () => this.showModal('add-semester-modal'));
        document.getElementById('delete-semester-btn').addEventListener('click', async () => {
            if (this.activeSemesterId && confirm("Delete this semester and all its data?")) {
                await db.deleteSemester(this.activeSemesterId);
                this.activeSemesterId = null;
                this.refreshPlanner();
            }
        });
        document.getElementById('save-semester-modal-btn').addEventListener('click', async () => {
            const name = document.getElementById('semester-name-input').value;
            if (name && await db.addSemester(name)) {
                document.getElementById('semester-name-input').value = '';
                this.closeModal('add-semester-modal');
                this.refreshPlanner();
            }
        });

        document.getElementById('semester-selector').addEventListener('change', (e) => {
            this.activeSemesterId = parseInt(e.target.value);
            this.refreshSubjects();
        });

        document.getElementById('delete-subject-btn').addEventListener('click', async () => {
            if (this.activeSubjectId && confirm("Delete this subject?")) {
                await db.deleteSubject(this.activeSubjectId);
                this.activeSubjectId = null;
                this.refreshSubjects();
            }
        });

        document.getElementById('save-subject-btn').addEventListener('click', async () => {
            const name = document.getElementById('subject-name-input').value;
            const date = document.getElementById('exam-date-input').value;
            if (name && this.activeSemesterId) {
                if (await db.addSubject(this.activeSemesterId, name, date)) {
                    document.getElementById('subject-name-input').value = '';
                    this.refreshSubjects();
                }
            }
        });

        document.getElementById('open-subject-details-btn').addEventListener('click', () => {
            if (this.activeSubjectId) this.openSubjectWindow(this.activeSubjectId);
        });

        document.getElementById('save-notes-btn-display').addEventListener('click', async () => {
            const notes = document.getElementById('subject-notes-display').value;
            const sub = db.data.subjects.find(s => s.id === this.activeSubjectId);
            if (sub) {
                sub.notes = notes;
                db.save();
                await db.pushToCloud("subjects", { id: sub.id, notes: sub.notes });
                alert("Notes saved to cloud!");
            }
        });

        // --- Modals ---
        document.getElementById('close-semester-modal').addEventListener('click', () => this.closeModal('add-semester-modal'));
        document.getElementById('close-sw-modal').addEventListener('click', () => this.closeModal('subject-window-modal'));
        document.getElementById('sw-add-chapter-btn').addEventListener('click', async () => {
            const name = document.getElementById('sw-chapter-input').value;
            if (name && this.activeSubjectId) {
                await db.addChapter(this.activeSubjectId, name);
                document.getElementById('sw-chapter-input').value = '';
                this.refreshChaptersInModal();
                this.updateSubjectDetailsUI();
            }
        });

        // --- Timer ---
        document.getElementById('timer-start').addEventListener('click', () => this.toggleTimer());
        document.getElementById('timer-reset').addEventListener('click', () => this.resetTimer());
        document.getElementById('manual-sync-btn').addEventListener('click', () => this.onLogin(auth.user));

        // --- Sync Mode & Buttons ---
        const syncSelect = document.getElementById('sync-mode-select');
        if (syncSelect) {
            syncSelect.addEventListener('change', (e) => {
                db.data.settings.sync_mode = e.target.value;
                db.save();
            });
        }

        const upBtn = document.getElementById('web-upload-btn');
        if (upBtn) {
            upBtn.addEventListener('click', async () => {
                upBtn.textContent = "Uploading...";
                if (await db.pushAllToCloud()) alert("Upload Complete!");
                else alert("Upload Failed!");
                upBtn.textContent = "Upload";
            });
        }

        const downBtn = document.getElementById('web-download-btn');
        if (downBtn) {
            downBtn.addEventListener('click', async () => {
                downBtn.textContent = "Downloading...";
                if (await db.syncFromCloud()) {
                    this.refreshAll();
                    alert("Download Complete!");
                } else alert("Download Failed!");
                downBtn.textContent = "Download";
            });
        }
    }

    switchTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
        this.currentTab = tabId;
        this.refreshTab(tabId);
    }

    refreshAll() {
        this.refreshDashboard();
        this.refreshPlanner();
        this.refreshPomodoro();
        this.refreshAnalytics();
    }

    refreshTab(tabId) {
        if (tabId === 'dashboard') this.refreshDashboard();
        if (tabId === 'planner') this.refreshPlanner();
        if (tabId === 'pomodoro') this.refreshPomodoro();
        if (tabId === 'analytics') this.refreshAnalytics();
    }

    // --- Dashboard ---
    refreshDashboard() {
        const stats = db.getProgressStats();
        const perc = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
        document.getElementById('overall-progress-val').textContent = `${perc}%`;
        document.getElementById('overall-progress-bar').style.width = `${perc}%`;

        const exam = db.getNextExamInfo();
        document.getElementById('next-exam-val').textContent = exam ? `${exam.name} (${exam.days}d)` : "None";

        document.getElementById('streak-val').textContent = `${db.getStudyStreak()} Days`;

        const container = document.getElementById('todo-container');
        container.innerHTML = '';
        const todos = db.getTodoChapters().slice(0, 5);
        if (todos.length === 0) {
            container.innerHTML = '<p class="mute">🎉 No tasks left! Take a break.</p>';
        } else {
            todos.forEach(t => {
                const item = document.createElement('div');
                item.className = 'card'; item.style.marginBottom = '10px';
                item.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center;">
                    <div><strong>${t.name}</strong><br><span class="mute" style="font-size:12px;">${t.subject_name}</span></div>
                    <span class="banner" style="background:rgba(99,102,241,0.1); color:var(--primary); padding:4px 8px; border-radius:4px; font-size:11px;">
                        ${!t.video_completed ? 'Video' : 'Exercises'}
                    </span>
                </div>`;
                container.appendChild(item);
            });
        }
    }

    // --- Planner ---
    refreshPlanner() {
        const selector = document.getElementById('semester-selector');
        selector.innerHTML = '';
        db.data.semesters.forEach(s => {
            const opt = document.createElement('option'); opt.value = s.id; opt.textContent = s.name;
            selector.appendChild(opt);
        });
        if (db.data.semesters.length > 0) {
            if (!this.activeSemesterId) this.activeSemesterId = db.data.semesters[0].id;
            selector.value = this.activeSemesterId;
            this.refreshSubjects();
        }
        const exam = db.getNextExamInfo();
        document.getElementById('next-exam-banner').textContent = exam ? `📅 Next Exam: ${exam.name} (in ${exam.days}d)` : "";
    }

    refreshSubjects() {
        const list = document.getElementById('subject-list');
        list.innerHTML = '';
        const subjects = db.data.subjects.filter(s => s.semester_id === this.activeSemesterId);
        subjects.forEach(s => {
            const li = document.createElement('li');
            li.className = 'list-item' + (this.activeSubjectId === s.id ? ' selected' : '');
            li.textContent = s.name;
            li.onclick = () => this.selectSubject(s.id);
            list.appendChild(li);
        });
        if (subjects.length > 0) document.getElementById('delete-subject-btn').classList.remove('hidden');
        else { this.activeSubjectId = null; this.updateSubjectDetailsUI(); }
    }

    selectSubject(id) { this.activeSubjectId = id; this.refreshSubjects(); this.updateSubjectDetailsUI(); }

    updateSubjectDetailsUI() {
        const panel = document.getElementById('subject-details-panel');
        if (!this.activeSubjectId) { panel.classList.add('disabled'); return; }
        panel.classList.remove('disabled');
        const sub = db.data.subjects.find(s => s.id === this.activeSubjectId);
        document.getElementById('selected-subject-title').textContent = sub.name;
        document.getElementById('subject-notes-display').value = sub.notes || '';
        const progress = db.getSubjectProgress(this.activeSubjectId);
        const perc = progress.total > 0 ? (progress.done / progress.total) * 100 : 0;
        document.getElementById('subject-progress-bar').style.width = `${perc}%`;
        const list = document.getElementById('chapters-list-display');
        list.innerHTML = '';
        db.data.chapters.filter(c => c.subject_id === this.activeSubjectId).forEach(c => {
            const li = document.createElement('li'); li.className = 'list-item'; li.style.cursor = 'default';
            li.innerHTML = `<span>${c.name}</span><span>${c.video_completed ? '🎥' : '◯'} ${c.exercises_completed ? '✍️' : '◯'}</span>`;
            list.appendChild(li);
        });
    }

    openSubjectWindow(subId) {
        const sub = db.data.subjects.find(s => s.id === subId);
        document.getElementById('sw-title').textContent = sub.name;
        this.refreshChaptersInModal();
        this.showModal('subject-window-modal');
    }

    refreshChaptersInModal() {
        const list = document.getElementById('sw-chapters-list');
        list.innerHTML = '';
        db.data.chapters.filter(c => c.subject_id === this.activeSubjectId).forEach(c => {
            const item = document.createElement('div'); item.className = 'list-item'; item.style.cursor = 'default';
            item.innerHTML = `<span>${c.name}</span><div style="display:flex; gap:10px;">
                <button class="small-btn ${c.video_completed ? 'primary-btn' : 'secondary-btn'}" onclick="app.toggleCap(${c.id}, 'video')">Video</button>
                <button class="small-btn ${c.exercises_completed ? 'primary-btn' : 'secondary-btn'}" onclick="app.toggleCap(${c.id}, 'exercises')">Exercises</button>
                <button class="btn-icon" style="color:var(--danger)" onclick="app.deleteChapter(${c.id})"><i class="fas fa-trash"></i></button>
            </div>`;
            list.appendChild(item);
        });
    }

    async toggleCap(id, type) {
        await db.toggleChapterStatus(id, type, !db.data.chapters.find(chap => chap.id === id)[type === 'video' ? 'video_completed' : 'exercises_completed']);
        this.refreshChaptersInModal(); this.updateSubjectDetailsUI(); this.refreshDashboard();
    }

    async deleteChapter(id) {
        if (confirm("Delete chapter?")) {
            db.data.chapters = db.data.chapters.filter(c => c.id !== id);
            db.save();
            await auth.client.from("chapters").delete().eq("id", id);
            this.refreshChaptersInModal(); this.updateSubjectDetailsUI();
        }
    }

    // --- Pomodoro ---
    refreshPomodoro() {
        const prof = db.data.user_profile;
        document.getElementById('user-level-label').textContent = `Level ${prof.level} Student`;
        document.getElementById('xp-progress-bar').style.width = `${(prof.xp % 500) / 5}%`;
        const selector = document.getElementById('active-subject-selector');
        selector.innerHTML = '<option value="">Select Subject</option>';
        db.data.subjects.forEach(s => {
            const opt = document.createElement('option'); opt.value = s.id; opt.textContent = s.name;
            selector.appendChild(opt);
        });
        this.updateTimerDisplay();
    }

    toggleTimer() { if (this.timerRunning) this.pauseTimer(); else this.startTimer(); }
    startTimer() {
        this.timerRunning = true; document.getElementById('timer-start').textContent = "Pause Focus";
        this.timer = setInterval(() => { this.timeLeft--; this.updateTimerDisplay(); if (this.timeLeft <= 0) this.handleTimerComplete(); }, 1000);
    }
    pauseTimer() { this.timerRunning = false; clearInterval(this.timer); document.getElementById('timer-start').textContent = "Resume Focus"; }
    resetTimer() { this.pauseTimer(); this.timeLeft = 25 * 60; this.updateTimerDisplay(); document.getElementById('timer-start').textContent = "Start Focus"; }
    updateTimerDisplay() {
        const mins = Math.floor(this.timeLeft / 60); const secs = this.timeLeft % 60;
        document.getElementById('timer-display').textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        document.getElementById('timer-progress').style.strokeDashoffset = 283 - (this.timeLeft / (25 * 60)) * 283;
    }

    async handleTimerComplete() {
        this.pauseTimer(); alert("Session Complete!");
        if (this.activeSubjectId) { await db.logSession(this.activeSubjectId, 25); }
        this.resetTimer(); this.refreshAll();
    }

    initCharts() {
        const ctx = document.getElementById('time-dist-chart').getContext('2d');
        if (!ctx) return;
        this.timeChart = new Chart(ctx, { type: 'doughnut', data: { labels: [], datasets: [{ data: [], backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444'] }] }, options: { responsive: true } });
    }

    refreshAnalytics() {
        const dist = {};
        db.data.study_sessions.forEach(s => {
            const sub = db.data.subjects.find(sub => sub.id === s.subject_id);
            const name = sub ? sub.name : "Other";
            dist[name] = (dist[name] || 0) + (s.duration_minutes || 0);
        });
        if (this.timeChart) {
            this.timeChart.data.labels = Object.keys(dist);
            this.timeChart.data.datasets[0].data = Object.values(dist);
            this.timeChart.update();
        }
    }

    showModal(id) { document.getElementById('modal-container').classList.remove('hidden'); document.getElementById(id).classList.remove('hidden'); }
    closeModal(id) { document.getElementById('modal-container').classList.add('hidden'); document.getElementById(id).classList.add('hidden'); }
    updateChartsTheme() {}
}
