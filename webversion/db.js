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
        
        // If offline, mark data as dirty for later sync
        if (!navigator.onLine && auth && auth.user) {
            localStorage.setItem('studentpro_pending_sync', 'true');
        }
    }
    
    // Track deletions while offline
    trackDeletion(table, id) {
        if (!navigator.onLine && auth && auth.user) {
            let deletions = JSON.parse(localStorage.getItem('studentpro_pending_deletions') || '[]');
            deletions.push({ table, id, timestamp: Date.now() });
            localStorage.setItem('studentpro_pending_deletions', JSON.stringify(deletions));
            console.log(`[Offline] Tracked deletion: ${table} id=${id}`);
        }
    }
    
    async applyPendingDeletions() {
        if (!auth || !auth.user || !navigator.onLine) return;
        if (!auth.client) {
            console.log('[Sync] Supabase client not ready yet, skipping deletions');
            return;
        }
        
        const deletions = JSON.parse(localStorage.getItem('studentpro_pending_deletions') || '[]');
        if (deletions.length === 0) return;
        
        console.log(`[Sync] Applying ${deletions.length} pending deletions...`);
        
        const failedDeletions = [];
        
        for (const del of deletions) {
            try {
                await auth.client.from(del.table).delete().eq('id', del.id);
                console.log(`[Sync] Deleted ${del.table} id=${del.id}`);
            } catch (e) {
                console.error(`[Sync] Failed to delete ${del.table} id=${del.id}:`, e);
                failedDeletions.push(del);
            }
        }
        
        // Only keep failed deletions for retry, remove successful ones
        if (failedDeletions.length > 0) {
            localStorage.setItem('studentpro_pending_deletions', JSON.stringify(failedDeletions));
            console.log(`[Sync] Kept ${failedDeletions.length} failed deletions for retry`);
        } else {
            localStorage.removeItem('studentpro_pending_deletions');
            console.log('[Sync] All pending deletions applied successfully');
        }
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
        if (!auth.client) {
            console.log('[Sync] Supabase client not ready yet');
            return false;
        }
        if (!navigator.onLine) {
            console.log('[Offline] Cannot sync, no internet connection');
            return false;
        }
        
        // First: Apply any pending deletions
        await this.applyPendingDeletions();
        
        // Check if we have pending changes flagged
        const hasPendingSync = localStorage.getItem('studentpro_pending_sync') === 'true';
        const queue = this.loadOfflineQueue();
        
        // If we have the flag, upload all current data (full sync)
        if (hasPendingSync) {
            console.log('[Sync] Full sync: Uploading all local data...');
            localStorage.removeItem('studentpro_pending_sync');
            
            try {
                // Upload all data
                if (this.data.user_profile) {
                    await this.pushToCloud('user_profile', this.data.user_profile);
                }
                for (const s of this.data.semesters) {
                    await this.pushToCloud('semesters', s);
                }
                for (const s of this.data.subjects) {
                    await this.pushToCloud('subjects', s);
                }
                for (const c of this.data.chapters) {
                    await this.pushToCloud('chapters', c);
                }
                for (const s of this.data.study_sessions) {
                    await this.pushToCloud('study_sessions', s);
                }
                console.log('[Sync] Full upload complete!');
                return true;
            } catch (e) {
                console.error('[Sync] Full upload failed:', e);
                return false;
            }
        }
        
        // Otherwise, use queue-based sync
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
        if (!auth.client) {
            console.log('[Sync] Supabase client not ready, queueing for later');
            return this.queueForSync(table, data);
        }
        
        // Check if online, if not queue for later
        if (!navigator.onLine) {
            return this.queueForSync(table, data);
        }
        
        try {
            // For local records (newly created offline), we should insert them
            // For cloud-synced records, we should upsert
            // Check if the ID looks like a local timestamp ID
            const isLocalId = data.id > 1700000000000 || !data.id;
            
            let payload, options = {};
            
            if (isLocalId) {
                // Local record: remove ID so cloud generates proper one
                const { id, ...dataWithoutId } = data;
                payload = { ...dataWithoutId, user_id: auth.user.id };
            } else {
                // Cloud-synced record: keep ID for upsert
                payload = { ...data, user_id: auth.user.id };
            }
            
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
        if (!auth.client) {
            console.warn('syncFromCloud: Supabase client not ready');
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
        const chapterIds = this.data.chapters.filter(c => subjectIds.includes(c.subject_id)).map(c => c.id);
        
        this.data.semesters.splice(idx, 1);
        this.data.subjects = this.data.subjects.filter(s => s.semester_id !== semesterId);
        this.data.chapters = this.data.chapters.filter(c => !subjectIds.includes(c.subject_id));
        this.save();
        
        // Track deletions for offline sync
        this.trackDeletion('semesters', semesterId);
        subjectIds.forEach(id => this.trackDeletion('subjects', id));
        chapterIds.forEach(id => this.trackDeletion('chapters', id));
        
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
            const localId = Date.now();
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
            const localId = Date.now();
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
        
        // Get chapters to delete
        const chapterIds = this.data.chapters.filter(c => c.subject_id === subjectId).map(c => c.id);
        
        // Delete local
        this.data.subjects.splice(idx, 1);
        // Also delete related chapters
        this.data.chapters = this.data.chapters.filter(c => c.subject_id !== subjectId);
        this.save();
        
        // Track deletions for offline sync
        this.trackDeletion('subjects', subjectId);
        chapterIds.forEach(id => this.trackDeletion('chapters', id));
        
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
