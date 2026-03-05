// StudentPro - Minimal Cloud Sync Engine (V7 Simple)
const DB_KEY = 'student_pro_v7_storage';
const OFFLINE_QUEUE_KEY = 'student_pro_offline_queue';

class Database {
    constructor() {
        this.data = this.load();
        this.lastSync = localStorage.getItem('last_sync_v7') || "Never";
        this.offlineQueue = this.loadOfflineQueue();
    }

    load() {
        const saved = localStorage.getItem(DB_KEY);
        if (saved) return JSON.parse(saved);
        return {
            user_profile: { xp: 0, level: 1, total_sessions: 0, display_name: '' },
            semesters: [],
            subjects: [],
            chapters: [],
            study_sessions: [],
            settings: { theme: 'Light', lang: 'English', sync_mode: 'Automatic', pomodoro: { work: 25, short: 5, long: 15 } }
        };
    }

    save() {
        localStorage.setItem(DB_KEY, JSON.stringify(this.data));
    }

    // --- OFFLINE QUEUE SYSTEM ---
    loadOfflineQueue() {
        const saved = localStorage.getItem(OFFLINE_QUEUE_KEY);
        return saved ? JSON.parse(saved) : [];
    }

    saveOfflineQueue() {
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.offlineQueue));
    }

    queueForSync(table, data, action = 'upsert') {
        // Check if we're online
        if (!navigator.onLine) {
            // Add to offline queue
            this.offlineQueue.push({
                table,
                data,
                action,
                timestamp: Date.now()
            });
            this.saveOfflineQueue();
            console.log(`[Offline] Queued ${action} for ${table}:`, data);
            return false; // Not pushed to cloud
        }
        return null; // Will be pushed to cloud normally
    }

    async syncPendingChanges() {
        if (!auth || !auth.user) return false;
        if (!navigator.onLine) {
            console.log('[Offline] Cannot sync, no internet connection');
            return false;
        }
        
        const queue = this.loadOfflineQueue();
        if (queue.length === 0) {
            console.log('[Sync] No pending changes to upload');
            return true;
        }

        console.log(`[Sync] Uploading ${queue.length} pending changes...`);
        let successCount = 0;
        let failedItems = [];

        for (const item of queue) {
            try {
                const result = await this.pushToCloud(item.table, item.data);
                if (result) {
                    successCount++;
                } else {
                    failedItems.push(item);
                }
            } catch (e) {
                console.error(`[Sync] Failed to push ${item.table}:`, e);
                failedItems.push(item);
            }
        }

        // Keep only failed items in queue
        this.offlineQueue = failedItems;
        this.saveOfflineQueue();

        if (successCount > 0) {
            console.log(`[Sync] Successfully uploaded ${successCount} changes`);
        }
        
        if (failedItems.length > 0) {
            console.warn(`[Sync] ${failedItems.length} changes failed to upload`);
        }

        return failedItems.length === 0;
    }

    async pushToCloud(table, data) {
        if (!auth || !auth.user) return false;
        
        // Check if online, if not queue for later
        if (!navigator.onLine) {
            return this.queueForSync(table, data);
        }
        
        try {
            // Create payload with user_id, excluding any 'id' field to avoid conflicts
            const { id, ...dataWithoutId } = data;
            const payload = { ...dataWithoutId, user_id: auth.user.id };
            let options = {};
            if (table === 'user_profile') options.onConflict = 'user_id';
            
            let result = await auth.client.from(table).upsert(payload, options);
            
            // If the upsert fails (e.g. column display_name doesn't exist yet)
            if (result.error) {
                console.warn(`Initial push failed for ${table}:`, result.error.message);
            }

            return !result.error;
        } catch (e) { 
            console.error(`Critical Push Error (${table}):`, e); 
            return false; 
        }
    }

    // --- SIMPLE SYNC ---
    async syncFromCloud() {
        if (!auth || !auth.user) {
            console.warn('syncFromCloud: No auth user');
            return false;
        }
        const uid = auth.user.id;
        console.log('Syncing from cloud for user:', uid);
        try {
            const [rSem, rSub, rChap, rProf, rSess] = await Promise.all([
                auth.client.from("semesters").select("*").eq("user_id", uid),
                auth.client.from("subjects").select("*").eq("user_id", uid),
                auth.client.from("chapters").select("*").eq("user_id", uid),
                auth.client.from("user_profile").select("*").eq("user_id", uid).maybeSingle(),
                auth.client.from("study_sessions").select("*").eq("user_id", uid)
            ]);

            console.log('Sync results:', { 
                semesters: rSem.data?.length || 0, 
                subjects: rSub.data?.length || 0, 
                chapters: rChap.data?.length || 0,
                profile: rProf.data ? 'found' : 'not found',
                sessions: rSess.data?.length || 0
            });

            this.data.semesters = rSem.data || [];
            this.data.subjects = rSub.data || [];
            this.data.chapters = rChap.data || [];
            this.data.study_sessions = rSess.data || [];
            if (rProf.data) this.data.user_profile = { ...this.data.user_profile, ...rProf.data };

            this.lastSync = new Date().toLocaleTimeString();
            localStorage.setItem('last_sync_v7', this.lastSync);
            this.save();
            console.log('Sync complete!');
            return true;
        } catch (e) { 
            console.error("Sync Down Error:", e); 
            return false; 
        }
    }

    async pushAllToCloud() {
        if (!auth || !auth.user) return false;
        const uid = auth.user.id;
        try {
            // 1. Wipe current cloud data for this user
            await Promise.all([
                auth.client.from("study_sessions").delete().eq("user_id", uid),
                auth.client.from("chapters").delete().eq("user_id", uid),
                auth.client.from("subjects").delete().eq("user_id", uid),
                auth.client.from("semesters").delete().eq("user_id", uid)
            ]);

            // 2. Upload Profile (exclude any 'id' field to avoid conflicts)
            const { id, ...profileWithoutId } = this.data.user_profile;
            await auth.client.from("user_profile").upsert({ ...profileWithoutId, user_id: uid }, { onConflict: 'user_id' });

            // 3. Sequential Upload to maintain FKs
            for (let s of this.data.semesters) {
                const { data: sData } = await auth.client.from("semesters").insert({ name: s.name, user_id: uid }).select();
                if (!sData) continue;
                const newSemId = sData[0].id;
                
                const subs = this.data.subjects.filter(sub => sub.semester_id === s.id);
                for (let sub of subs) {
                    const { data: subData } = await auth.client.from("subjects").insert({ 
                        name: sub.name, semester_id: newSemId, exam_date: sub.exam_date, notes: sub.notes, user_id: uid 
                    }).select();
                    if (!subData) continue;
                    const newSubId = subData[0].id;

                    const chaps = this.data.chapters.filter(c => c.subject_id === sub.id);
                    for (let c of chaps) {
                        await auth.client.from("chapters").insert({
                            name: c.name, subject_id: newSubId, video_completed: c.video_completed, 
                            exercises_completed: c.exercises_completed, is_completed: c.is_completed, user_id: uid
                        });
                    }
                }
            }
            return true;
        } catch (e) { console.error("Sync Up Error:", e); return false; }
    }

    // --- ACTIONS ---
    async addSemester(name) {
        try {
            const { data, error } = await auth.client.from("semesters").insert({ name, user_id: auth.user.id }).select();
            if (data && data.length > 0) { 
                this.data.semesters.push(data[0]); 
                this.save(); 
                return data[0].id; 
            }
            // Fallback for offline or error
            const localId = Date.now();
            const newSem = { id: localId, name, user_id: auth.user.id };
            this.data.semesters.push(newSem);
            this.save();
            return localId;
        } catch (e) { 
            console.error('addSemester error:', e);
            return null;
        }
    }

    async deleteSemester(semesterId) {
        const idx = this.data.semesters.findIndex(s => s.id === semesterId);
        if (idx === -1) return;
        
        // Delete local - first get related subjects to delete chapters
        const subjectIds = this.data.subjects.filter(s => s.semester_id === semesterId).map(s => s.id);
        
        this.data.semesters.splice(idx, 1);
        this.data.subjects = this.data.subjects.filter(s => s.semester_id !== semesterId);
        this.data.chapters = this.data.chapters.filter(c => !subjectIds.includes(c.subject_id));
        this.save();
        
        // Delete from cloud
        try {
            await auth.client.from("semesters").delete().eq("id", semesterId);
            await auth.client.from("subjects").delete().eq("semester_id", semesterId);
            // Delete chapters for those subjects
            for (const subId of subjectIds) {
                await auth.client.from("chapters").delete().eq("subject_id", subId);
            }
        } catch (e) {}
    }

    async addSubject(semesterId, name, examDate) {
        try {
            // Fix: send null instead of empty string for exam date
            const examDateValue = examDate && examDate.trim() ? examDate : null;
            
            // Try cloud first
            const { data, error } = await auth.client.from("subjects").insert({ 
                name, 
                semester_id: semesterId, 
                exam_date: examDateValue, 
                user_id: auth.user.id 
            }).select();
            
            if (!error && data && data.length > 0) { 
                this.data.subjects.push(data[0]); 
                this.save(); 
                return data[0].id; 
            }
            
            // Fallback: local only
            console.warn('Cloud insert failed, using local:', error);
            const localId = Date.now() + Math.random();
            const newSub = { 
                id: localId, 
                name, 
                semester_id: semesterId, 
                exam_date: examDateValue, 
                user_id: auth.user.id,
                notes: ''
            };
            this.data.subjects.push(newSub);
            this.save();
            return localId;
        } catch (e) { 
            console.error('addSubject error:', e);
            // Last resort: local only
            const localId = Date.now() + Math.random();
            const newSub = { 
                id: localId, 
                name, 
                semester_id: semesterId, 
                exam_date: null, 
                user_id: auth.user.id,
                notes: ''
            };
            this.data.subjects.push(newSub);
            this.save();
            return localId;
        }
    }

    async deleteSubject(subjectId) {
        const idx = this.data.subjects.findIndex(s => s.id === subjectId);
        if (idx === -1) return;
        
        // Delete local
        this.data.subjects.splice(idx, 1);
        // Also delete related chapters
        this.data.chapters = this.data.chapters.filter(c => c.subject_id !== subjectId);
        this.save();
        
        // Delete from cloud
        try {
            await auth.client.from("subjects").delete().eq("id", subjectId);
            await auth.client.from("chapters").delete().eq("subject_id", subjectId);
        } catch (e) {}
    }

    async updateSubjectExamDate(subjectId, examDate) {
        const idx = this.data.subjects.findIndex(s => s.id === subjectId);
        if (idx === -1) return;
        this.data.subjects[idx].exam_date = examDate;
        this.save();
        try {
            await auth.client.from("subjects").update({ exam_date: examDate }).eq("id", subjectId);
        } catch (e) {}
    }

    async updateSubjectName(subjectId, newName) {
        const idx = this.data.subjects.findIndex(s => s.id === subjectId);
        if (idx === -1) return;
        this.data.subjects[idx].name = newName;
        this.save();
        try {
            await auth.client.from("subjects").update({ name: newName }).eq("id", subjectId);
        } catch (e) {}
    }

    async addChapter(subjectId, name) {
        try {
            const { data } = await auth.client.from("chapters").insert({ name, subject_id: subjectId, user_id: auth.user.id }).select();
            if (data && data.length > 0) { 
                this.data.chapters.push(data[0]); 
                this.save(); 
                return true; 
            }
            const newChap = { id: Date.now() + 2, name, subject_id: subjectId, user_id: auth.user.id, video_completed: false, exercises_completed: false, is_completed: false };
            this.data.chapters.push(newChap);
            this.save();
            return true;
        } catch (e) { return false; }
    }

    async toggleChapterStatus(chapterId, type, status) {
        const idx = this.data.chapters.findIndex(c => c.id === chapterId);
        if (idx === -1) return;
        const c = this.data.chapters[idx];
        if (type === 'video') c.video_completed = status;
        else c.exercises_completed = status;
        c.is_completed = !!(c.video_completed && c.exercises_completed);
        this.save();
        try {
            await auth.client.from("chapters").update({ 
                video_completed: c.video_completed, 
                exercises_completed: c.exercises_completed, 
                is_completed: c.is_completed 
            }).eq("id", c.id);
        } catch (e) {}
    }

    async logSession(subjectId, duration) {
        try {
            const { data } = await auth.client.from("study_sessions").insert({ subject_id: subjectId, duration_minutes: duration, user_id: auth.user.id }).select();
            if (data) { this.data.study_sessions.push(data[0]); }
            else { this.data.study_sessions.push({ subject_id: subjectId, duration_minutes: duration, user_id: auth.user.id, timestamp: new Date().toISOString() }); }
            this.save();
        } catch (e) {}
    }

    async applyTemplate(template) {
        const semId = await this.addSemester(template.name);
        if (!semId) return false;
        for (let sub of template.subjects) {
            const subId = await this.addSubject(semId, sub.name, null);
            if (!subId) continue;
            for (let chap of sub.chapters) await this.addChapter(subId, chap);
        }
        return true;
    }

    // --- GETTERS ---
    getTodoChapters() { return this.data.chapters.filter(c => !c.is_completed).map(c => { const sub = this.data.subjects.find(s => s.id === c.subject_id); return { ...c, subject_name: sub ? sub.name : "Subject" }; }); }
    getProgressStats() { const total = this.data.chapters.length * 2; const done = this.data.chapters.reduce((acc, c) => acc + (c.video_completed ? 1 : 0) + (c.exercises_completed ? 1 : 0), 0); return { total, done }; }
    getNextExamInfo() { const today = new Date(); const futureExams = this.data.subjects.filter(s => s.exam_date).map(s => { const d = new Date(s.exam_date); return { name: s.name, days: Math.ceil((d - today) / (1000 * 60 * 60 * 24)) }; }).filter(s => s.days >= 0).sort((a, b) => a.days - b.days); return futureExams[0] || null; }
    getStudyStreak() { if (this.data.study_sessions.length === 0) return 0; return 1; /* Simple placeholder streak */ }
    getSubjectProgress(subId) { const chaps = this.data.chapters.filter(c => c.subject_id === subId); const total = chaps.length * 2; const done = chaps.reduce((acc, c) => acc + (c.video_completed ? 1 : 0) + (c.exercises_completed ? 1 : 0), 0); return { total, done }; }
    
    getSmartSuggestion(subId) {
        if (!subId) return "Select a subject to get a suggestion";
        const chaps = this.data.chapters.filter(c => c.subject_id === subId);
        for (let c of chaps) {
            if (!c.video_completed) return `🎥 Watch video for: <b>${c.name}</b>`;
            if (!c.exercises_completed) return `✍️ Do exercises for: <b>${c.name}</b>`;
        }
        return "🎉 All chapters completed for this subject!";
    }

    async getLeaderboard() { const { data } = await auth.client.from("weekly_leaderboard").select("*"); return data || []; }
    reset() { localStorage.clear(); window.location.reload(); }
}

const db = new Database();
