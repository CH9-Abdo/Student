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
        console.log("[App] Login success. Starting sync...");
        const syncLabel = document.getElementById('last-sync-label');
        syncLabel.textContent = "🔄 Syncing with Cloud...";
        
        // Ensure UI elements exist
        document.getElementById('sidebar-user-email').textContent = `👤 ${user.email}`;
        document.getElementById('user-info-sidebar').classList.remove('hidden');

        try {
            const success = await db.syncFromCloud();
            if (success) {
                console.log("[App] Sync success. Refreshing UI...");
                syncLabel.textContent = `🔄 Last sync: ${db.lastSync}`;
                
                // Set name if available in profile
                if (db.data.user_profile.display_name) {
                    document.getElementById('sidebar-user-email').textContent = `👤 ${db.data.user_profile.display_name}`;
                }
            } else {
                syncLabel.textContent = "⚠️ Sync failed. Using local data.";
            }
        } catch (e) {
            console.error("[App] Sync Error:", e);
            syncLabel.textContent = "⚠️ Sync error.";
        }

        this.loadSettings();
        this.refreshAll();

        // Onboarding Check
        setTimeout(() => {
            if (!db.data.semesters || db.data.semesters.length === 0) {
                this.showModal('welcome-modal');
            }
        }, 500); 
    }

    loadSettings() {
        const s = db.data.settings;
        const p = db.data.user_profile;
        document.body.setAttribute('data-theme', s.theme);
        document.getElementById('theme-select').value = s.theme;
        document.getElementById('lang-select').value = s.lang;
        
        // Update Account Details
        document.getElementById('acc-display-name').textContent = p.display_name || "Not Set";
        document.getElementById('acc-email').textContent = auth.user ? auth.user.email : "Not Logged In";
        document.getElementById('acc-stats').textContent = `Level ${p.level} Student (${p.xp} XP)`;

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
        
        document.getElementById('dash-challenge-label').textContent = "🚀 " + texts.challenge;
        document.getElementById('start-challenge-btn').textContent = texts.start_challenge;

        document.querySelector('.todo-column .h2').textContent = texts.up_next;
        
        // Settings Sync
        if (document.getElementById('cloud-sync-title')) {
            document.getElementById('cloud-sync-title').textContent = texts.database_sync || "Cloud Sync";
            document.getElementById('sync-mode-label').textContent = texts.sync_mode + ":";
            document.getElementById('web-upload-btn').textContent = texts.upload;
            document.getElementById('web-download-btn').textContent = texts.download;
        }

        // Onboarding
        document.getElementById('welcome-title').textContent = texts.welcome_title;
        document.getElementById('welcome-desc').textContent = texts.welcome_desc;
        document.getElementById('start-onboarding-btn').textContent = texts.welcome_btn;

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
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
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

        document.getElementById('do-signup-btn').addEventListener('click', async () => {
            const btn = document.getElementById('do-signup-btn');
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const err = document.getElementById('login-error');
            if (!email || !password) {
                err.textContent = "Please enter email and password";
                err.classList.remove('hidden');
                return;
            }
            btn.textContent = "Creating Account..."; btn.disabled = true;
            try { 
                await auth.signUp(email, password);
                alert("Account created successfully! Please check your email to confirm your account before logging in.");
                btn.textContent = "Create New Account";
            } catch (e) { 
                err.textContent = e.message; 
                err.classList.remove('hidden'); 
            } finally { 
                btn.disabled = false; 
            }
        });

        document.getElementById('toggle-password').addEventListener('click', () => {
            const input = document.getElementById('login-password');
            input.type = input.type === 'password' ? 'text' : 'password';
        });

        document.getElementById('logout-btn').addEventListener('click', () => auth.signOut());
        const mobileLogout = document.getElementById('mobile-logout-btn');
        if (mobileLogout) mobileLogout.addEventListener('click', () => auth.signOut());

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

        const pomodoroSubSelector = document.getElementById('active-subject-selector');
        if (pomodoroSubSelector) {
            pomodoroSubSelector.addEventListener('change', (e) => {
                const subId = parseInt(e.target.value);
                const suggestion = db.getSmartSuggestion(subId);
                document.getElementById('smart-suggestion').innerHTML = `💡 Suggestion: ${suggestion}`;
            });
        }

        // --- Lo-Fi Music ---
        const musicPlayer = document.getElementById('bg-music-player');
        const lofiToggle = document.getElementById('lofi-toggle');
        const musicSelect = document.getElementById('lofi-music-select');

        const updateMusic = () => {
            const track = musicSelect.value;
            musicPlayer.src = `assets/sounds/${track}`;
            if (lofiToggle.checked) musicPlayer.play().catch(e => console.log("Music play blocked by browser. Interaction needed."));
            else musicPlayer.pause();
        };

        lofiToggle.addEventListener('change', updateMusic);
        musicSelect.addEventListener('change', updateMusic);

        // --- Timer ---
        document.getElementById('timer-start').addEventListener('click', () => this.toggleTimer());
        document.getElementById('timer-reset').addEventListener('click', () => this.resetTimer());
        document.getElementById('manual-sync-btn').addEventListener('click', () => this.onLogin(auth.user));
        
        document.getElementById('start-challenge-btn').addEventListener('click', () => {
            this.switchTab('pomodoro');
            document.getElementById('challenge-indicator').classList.remove('hidden');
        });

        // --- Onboarding ---
        this.selectedTemplate = null;
        document.getElementById('start-onboarding-btn').addEventListener('click', async () => {
            const displayName = document.getElementById('user-display-name').value.trim();
            if (displayName) {
                db.data.user_profile.display_name = displayName;
                db.save();
                await db.pushToCloud("user_profile", db.data.user_profile);
            }

            if (this.selectedTemplate) {
                const btn = document.getElementById('start-onboarding-btn');
                btn.textContent = "Applying..."; btn.disabled = true;
                await db.applyTemplate(this.selectedTemplate);
                this.closeModal('welcome-modal');
                this.onLogin(auth.user); // Refresh name in sidebar
                this.refreshAll();
            }
        });

        document.getElementById('skip-onboarding-btn').addEventListener('click', async () => {
            const displayName = document.getElementById('user-display-name').value.trim();
            if (displayName) {
                db.data.user_profile.display_name = displayName;
                db.save();
                await db.pushToCloud("user_profile", db.data.user_profile);
            }
            this.closeModal('welcome-modal');
            this.onLogin(auth.user); // Refresh name in sidebar
            this.showModal('add-semester-modal');
        });

        this.renderTemplates();

        // --- Sync Mode & Buttons ---
        const syncSelect = document.getElementById('sync-mode-select');
        if (syncSelect) {
            syncSelect.addEventListener('change', (e) => {
                db.data.settings.sync_mode = e.target.value;
                db.save();
            });
        }

        document.getElementById('lang-select').addEventListener('change', (e) => {
            db.data.settings.lang = e.target.value;
            db.save();
            this.applyLanguage(e.target.value);
        });

        document.getElementById('theme-select').addEventListener('change', (e) => {
            db.data.settings.theme = e.target.value;
            db.save();
            this.loadSettings();
        });

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

        const resetBtn = document.getElementById('reset-data-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', async () => {
                if (confirm("Are you sure? This will delete all your study data locally and from the cloud!")) {
                    resetBtn.textContent = "Resetting...";
                    resetBtn.disabled = true;
                    // Wipe cloud
                    const uid = auth.user.id;
                    await auth.client.from("study_sessions").delete().eq("user_id", uid);
                    await auth.client.from("chapters").delete().eq("user_id", uid);
                    await auth.client.from("subjects").delete().eq("user_id", uid);
                    await auth.client.from("semesters").delete().eq("user_id", uid);
                    // Clear local and reload
                    db.reset();
                }
            });
        }
    }

    renderTemplates() {
        const container = document.getElementById('template-list');
        if (!container) return;
        container.innerHTML = '';
        TEMPLATES.forEach((t, i) => {
            const div = document.createElement('div');
            div.className = 'list-item';
            div.innerHTML = `<div><strong>${t.name}</strong><br><small class="mute">${t.subjects.length} Subjects</small></div>`;
            div.onclick = () => {
                document.querySelectorAll('#template-list .list-item').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                this.selectedTemplate = t;
                document.getElementById('start-onboarding-btn').disabled = false;
            };
            container.appendChild(div);
        });
    }

    switchTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
        this.currentTab = tabId;
        
        // Scroll to top on switch
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const content = document.getElementById('content');
        if (content) content.scrollTop = 0;

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
        if (tabId === 'leaderboard') this.refreshLeaderboard();
        if (tabId === 'analytics') this.refreshAnalytics();
    }

    async refreshLeaderboard() {
        const body = document.getElementById('leaderboard-body');
        body.innerHTML = '<tr><td colspan="4" style="padding: 20px;">Loading champions...</td></tr>';
        
        const data = await db.getLeaderboard();
        body.innerHTML = '';
        
        if (!data || data.length === 0) {
            body.innerHTML = '<tr><td colspan="4" style="padding: 20px;">No sessions this week yet. Be the first!</td></tr>';
            return;
        }

        data.forEach((row, i) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = "1px solid var(--border)";
            const isMe = row.user_id === auth.user.id;
            if (isMe) tr.style.background = "rgba(99,102,241,0.05)";

            const medal = i === 0 ? "🥇" : (i === 1 ? "🥈" : (i === 2 ? "🥉" : i + 1));
            tr.innerHTML = `
                <td style="padding: 15px;">${medal}</td>
                <td style="text-align: left; font-weight: bold;">${row.display_name || 'Anonymous'} ${isMe ? '(You)' : ''}</td>
                <td><span class="banner" style="padding: 2px 8px; border-radius: 4px; font-size: 12px; background: rgba(99,102,241,0.1); color: var(--primary);">Level ${row.level}</span></td>
                <td><strong>${row.sessions_count}</strong></td>
            `;
            body.appendChild(tr);
        });
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

        // Daily Challenge Logic
        const today = new Date().toISOString().split('T')[0];
        const todaySessions = db.data.study_sessions.filter(s => s.timestamp && s.timestamp.startsWith(today)).length;
        const dailyGoal = 3;
        const goalPerc = Math.min((todaySessions / dailyGoal) * 100, 100);
        document.getElementById('daily-goal-val').textContent = `${todaySessions}/${dailyGoal}`;
        document.getElementById('daily-goal-bar').style.width = `${goalPerc}%`;
        if (goalPerc === 100) document.getElementById('daily-goal-val').innerHTML += " ✅";

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
        const currentVal = selector.value;
        selector.innerHTML = '<option value="">Select Subject</option>';
        db.data.subjects.forEach(s => {
            const opt = document.createElement('option'); opt.value = s.id; opt.textContent = s.name;
            selector.appendChild(opt);
        });
        selector.value = currentVal;

        // Sessions Today Label Fix
        const today = new Date().toISOString().split('T')[0];
        const todaySessions = db.data.study_sessions.filter(s => s.timestamp && s.timestamp.startsWith(today)).length;
        const sessionsLabel = document.getElementById('sessions-today-label');
        if (sessionsLabel) sessionsLabel.textContent = `Sessions Today: ${todaySessions}`;
        
        this.updateTimerDisplay();
        this.updateMiniChallenge();
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
        this.pauseTimer(); 
        alert("Session Complete! +50 XP");
        
        const sel = document.getElementById('active-subject-selector');
        const subId = parseInt(sel.value);
        
        if (subId) { 
            await db.logSession(subId, 25); 
            // Update local profile for immediate feedback
            db.data.user_profile.xp += 50;
            db.save();
        }
        
        this.resetTimer(); 
        this.refreshAll();
        if (subId) this.updateMiniChallenge(subId);
    }

    updateMiniChallenge() {
        const card = document.getElementById('mini-challenge-card');
        const text = document.getElementById('mini-challenge-text');
        
        if (db.data.subjects.length === 0) {
            text.innerHTML = "Add some subjects in the Planner to start your first challenge! 📚";
            return;
        }

        // Calculate total minutes per subject
        const stats = {};
        db.data.subjects.forEach(s => stats[s.id] = 0);
        db.data.study_sessions.forEach(s => {
            if (stats[s.subject_id] !== undefined) stats[s.subject_id] += (s.duration_minutes || 0);
        });

        // Find subject with minimum study time
        let minId = null;
        let minTime = Infinity;
        
        for (let subId in stats) {
            if (stats[subId] < minTime) {
                minTime = stats[subId];
                minId = parseInt(subId);
            }
        }

        const weakestSub = db.data.subjects.find(s => s.id === minId);
        if (weakestSub) {
            text.innerHTML = `⚖️ <b>Balance Challenge:</b> Study <b>${weakestSub.name}</b> next! You only have ${minTime}m recorded. <br>Goal: Complete 1 session to balance your schedule.`;
        }
    }

    initCharts() {
        const ctx = document.getElementById('time-dist-chart').getContext('2d');
        if (!ctx) return;
        this.timeChart = new Chart(ctx, { type: 'doughnut', data: { labels: [], datasets: [{ data: [], backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444'] }] }, options: { responsive: true } });
    }

    refreshAnalytics() {
        const analyticsContent = document.querySelector('#analytics .analytics-grid');
        const existingEmpty = document.getElementById('analytics-empty-state');
        
        if (!db.data.study_sessions || db.data.study_sessions.length === 0) {
            if (analyticsContent) analyticsContent.classList.add('hidden');
            if (!existingEmpty) {
                const empty = document.createElement('div');
                empty.id = 'analytics-empty-state';
                empty.className = 'card';
                empty.style.textAlign = 'center';
                empty.style.padding = '50px';
                empty.innerHTML = `
                    <div style="font-size: 50px; margin-bottom: 20px;">📊</div>
                    <h2>No Analytics Data Yet</h2>
                    <p class="mute">Complete your first study challenge to see your progress charts here.</p>
                    <button class="primary-btn" style="margin-top: 20px;" onclick="app.switchTab('pomodoro')">Start Your First Challenge 🚀</button>
                `;
                document.getElementById('analytics').appendChild(empty);
            } else {
                existingEmpty.classList.remove('hidden');
            }
            return;
        }

        // Data exists, hide empty state and show grid
        if (analyticsContent) analyticsContent.classList.remove('hidden');
        if (existingEmpty) existingEmpty.classList.add('hidden');

        const dist = {};
        let totalMinutes = 0;
        
        db.data.study_sessions.forEach(s => {
            const sub = db.data.subjects.find(sub => sub.id === s.subject_id);
            const name = sub ? sub.name : "Other";
            dist[name] = (dist[name] || 0) + (s.duration_minutes || 0);
            totalMinutes += (s.duration_minutes || 0);
        });

        // Update Summary Cards
        document.getElementById('total-time-val').textContent = `${totalMinutes}m`;
        
        const sortedSubs = Object.entries(dist).sort((a, b) => b[1] - a[1]);
        document.getElementById('top-subject-val').textContent = sortedSubs.length > 0 ? sortedSubs[0][0] : "None";
        
        const focusLevels = ["Novice", "Learner", "Dedicated", "Scholar", "Master"];
        const levelIdx = Math.min(Math.floor(totalMinutes / 500), 4);
        document.getElementById('focus-level-val').textContent = focusLevels[levelIdx];

        // Update Breakdown List
        const breakdownList = document.getElementById('subject-breakdown-list');
        breakdownList.innerHTML = '';
        sortedSubs.forEach(([name, mins]) => {
            const perc = totalMinutes > 0 ? Math.round((mins / totalMinutes) * 100) : 0;
            const item = document.createElement('div');
            item.className = 'list-item';
            item.style.cursor = 'default';
            item.innerHTML = `
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <strong>${name}</strong>
                        <span>${mins} mins (${perc}%)</span>
                    </div>
                    <div class="progress-bar-container" style="height: 6px;">
                        <div class="progress-bar" style="width: ${perc}%"></div>
                    </div>
                </div>
            `;
            breakdownList.appendChild(item);
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
