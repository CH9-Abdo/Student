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

    queueForSync(table, data) {
        // Deduplicate: remove any existing entry for this table/id combo
        this.offlineQueue = this.offlineQueue.filter(item => 
            !(item.table === table && item.data.id === data.id)
        );
        
        // Add to offline queue
        this.offlineQueue.push({
            table,
            data,
            timestamp: Date.now()
        });
        this.saveOfflineQueue();
        console.log(`[Offline] Queued update for ${table}:`, data);
        return true; 
    }

    async syncPendingChanges() {
        if (!auth || !auth.user || !navigator.onLine) return false;
        if (auth.user.id === 'offline-user') return false;
        if (!auth.client) return false;

        // Apply any pending deletions first
        await this.applyPendingDeletions();

        const queue = this.loadOfflineQueue();
        if (queue.length === 0) return true;

        console.log(`[Sync] Uploading ${queue.length} pending changes...`);
        let successCount = 0;
        let failedItems = [];

        for (const item of queue) {
            try {
                const result = await this.pushToCloud(item.table, item.data);
                if (result) successCount++;
                else failedItems.push(item);
            } catch (e) {
                console.error(`[Sync] Failed to push ${item.table}:`, e);
                failedItems.push(item);
            }
        }

        // Keep only failed items in queue
        this.offlineQueue = failedItems;
        this.saveOfflineQueue();

        if (successCount > 0) console.log(`[Sync] Successfully uploaded ${successCount} changes`);
        return failedItems.length === 0;
    }

    async pushToCloud(table, data) {
        if (!auth || !auth.user || auth.user.id === 'offline-user') return false;

        // If offline or client not ready, queue it
        if (!navigator.onLine || !auth.client) {
            return this.queueForSync(table, data);
        }

        try {
            const isLocalId = (typeof data.id === 'number' && data.id > 1700000000000) || !data.id;
            let result;

            if (table === 'user_profile') {
                const { id, ...profileData } = data;
                result = await auth.client.from('user_profile').upsert({ ...profileData, user_id: auth.user.id }, { onConflict: 'user_id' });
            } else if (isLocalId) {
                // New local record
                const { id, ...insertData } = data;
                result = await auth.client.from(table).insert({ ...insertData, user_id: auth.user.id }).select();

                if (!result.error && result.data && result.data.length > 0) {
                    // Update local ID with the one from the cloud
                    this.updateLocalId(table, data.id, result.data[0].id);
                }
            } else {
                // Existing cloud record - use update to avoid identity column issues with upsert
                // Strip the ID from the update data to avoid "cannot update identity column" errors
                const { id: _, user_id: __, ...updateData } = data;
                result = await auth.client.from(table).update(updateData).eq('id', data.id);
            }

            if (result.error) {
                console.warn(`[Sync] Push failed for ${table}:`, result.error.message);
                // If update failed (e.g. record deleted on cloud), we could try to re-insert 
                // but we'd need to strip the ID first.
                if (result.error.code === 'PGRST116' || result.status === 404) {
                    console.log(`[Sync] Record not found on cloud for ${table}, re-inserting...`);
                    const { id, ...reInsertData } = data;
                    const retry = await auth.client.from(table).insert({ ...reInsertData, user_id: auth.user.id }).select();
                    if (!retry.error && retry.data && retry.data.length > 0) {
                        this.updateLocalId(table, data.id, retry.data[0].id);
                        return true;
                    }
                }
            }

            return !result.error;
        } catch (e) { 
            console.error(`[Sync] Critical Push Error (${table}):`, e); 
            return false; 
        }
    }

    updateLocalId(table, oldId, newId) {
        console.log(`[DB] Updating local ID: ${table} ${oldId} -> ${newId}`);
        const list = this.data[table];
        if (!list) return;

        const item = list.find(i => i.id === oldId);
        if (item) {
            item.id = newId;

            // Update any foreign keys pointing to this ID in local data
            if (table === 'semesters') {
                this.data.subjects.forEach(s => { if (s.semester_id === oldId) s.semester_id = newId; });
            } else if (table === 'subjects') {
                this.data.chapters.forEach(c => { if (c.subject_id === oldId) c.subject_id = newId; });
                this.data.study_sessions.forEach(s => { if (s.subject_id === oldId) s.subject_id = newId; });
            }

            // ALSO update the offline queue to ensure pending items use the correct new ID
            this.offlineQueue.forEach(qItem => {
                // If the item itself changed its ID
                if (qItem.table === table && qItem.data.id === oldId) {
                    qItem.data.id = newId;
                }
                // If the item has a foreign key to the changed ID
                if (table === 'semesters' && qItem.table === 'subjects' && qItem.data.semester_id === oldId) {
                    qItem.data.semester_id = newId;
                }
                if (table === 'subjects' && (qItem.table === 'chapters' || qItem.table === 'study_sessions') && qItem.data.subject_id === oldId) {
                    qItem.data.subject_id = newId;
                }
            });
            this.saveOfflineQueue();

            this.save();
        }
    }
    // --- SIMPLE SYNC ---
    async syncFromCloud() {
        if (!auth || !auth.user || auth.user.id === 'offline-user') {
            console.warn('syncFromCloud: No cloud user session');
            return false;
        }
        if (!auth.client) {
            console.warn('syncFromCloud: Supabase client not ready');
            return false;
        }
        if (!navigator.onLine) {
            console.warn('syncFromCloud: Offline, skipping download');
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
        if (!auth || !auth.user || auth.user.id === 'offline-user') return false;
        if (!navigator.onLine) return false;
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
        console.log(`[DB] addSemester: name="${name}"`);
        const localId = Date.now();
        const newSem = { 
            id: localId, 
            name, 
            user_id: auth.user?.id || 'offline-user' 
        };
        
        this.data.semesters.push(newSem);
        this.save();
        
        // Try to push to cloud (will queue if offline)
        await this.pushToCloud('semesters', newSem);
        
        return localId;
    }

    async deleteSemester(semesterId) {
        console.log(`[DB] deleteSemester: id=${semesterId}`);
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
        if (navigator.onLine && auth.user && auth.user.id !== 'offline-user') {
            try {
                await auth.client.from("semesters").delete().eq("id", semesterId);
                await auth.client.from("subjects").delete().eq("semester_id", semesterId);
                // Delete chapters for those subjects
                for (const subId of subjectIds) {
                    await auth.client.from("chapters").delete().eq("subject_id", subId);
                }
            } catch (e) {}
        }
    }

    async addSubject(semesterId, name, examDate, hasExercises = true) {
        console.log(`[DB] addSubject: semesterId=${semesterId}, name="${name}"`);
        const examDateValue = examDate && examDate.trim() ? examDate : null;
        const localId = Date.now();
        const newSub = {
            id: localId,
            name,
            semester_id: semesterId,
            exam_date: examDateValue,
            has_exercises: hasExercises,
            user_id: auth.user?.id || 'offline-user',
            notes: ''
        };

        this.data.subjects.push(newSub);
        this.save();
        
        // Push to cloud (queues if offline)
        await this.pushToCloud('subjects', newSub);
        
        return localId;
    }

    async deleteSubject(subjectId) {
        console.log(`[DB] deleteSubject: id=${subjectId}`);
        const idx = this.data.subjects.findIndex(s => s.id === subjectId);
        if (idx === -1) return;
        
        // Get chapters to delete
        const chapterIds = this.data.chapters.filter(c => c.subject_id === subjectId).map(c => c.id);
        
        // Delete local
        this.data.subjects.splice(idx, 1);
        this.data.chapters = this.data.chapters.filter(c => c.subject_id !== subjectId);
        this.save();
        
        // Track deletions for offline sync
        this.trackDeletion('subjects', subjectId);
        chapterIds.forEach(id => this.trackDeletion('chapters', id));
        
        // If online, try to delete now
        if (navigator.onLine && auth.user && auth.user.id !== 'offline-user') {
            try {
                await auth.client.from("subjects").delete().eq("id", subjectId);
                await auth.client.from("chapters").delete().eq("subject_id", subjectId);
            } catch (e) {}
        }
    }

    async updateSubjectExamDate(subjectId, examDate) {
        console.log(`[DB] updateSubjectExamDate: id=${subjectId}, date=${examDate}`);
        const idx = this.data.subjects.findIndex(s => s.id === subjectId);
        if (idx === -1) return;
        this.data.subjects[idx].exam_date = examDate;
        this.save();

        // Push to cloud (queues if offline)
        await this.pushToCloud('subjects', this.data.subjects[idx]);
    }

    async updateSubjectName(subjectId, newName) {
        console.log(`[DB] updateSubjectName: id=${subjectId}, name=${newName}`);
        const idx = this.data.subjects.findIndex(s => s.id === subjectId);
        if (idx === -1) return;
        this.data.subjects[idx].name = newName;
        this.save();

        // Push to cloud (queues if offline)
        await this.pushToCloud('subjects', this.data.subjects[idx]);
    }

    async addChapter(subjectId, name, youtubeUrl = null) {
        console.log(`[DB] addChapter: subjectId=${subjectId}, name="${name}"`);
        const localId = Date.now();
        const newChap = {
            id: localId,
            subject_id: subjectId,
            name,
            youtube_url: youtubeUrl,
            video_completed: false,
            exercises_completed: false,
            is_completed: false,
            user_id: auth.user?.id || 'offline-user'
        };

        this.data.chapters.push(newChap);
        this.save();
        
        // Push to cloud (queues if offline)
        await this.pushToCloud('chapters', newChap);
        
        return localId;
    }

    async updateChapterYouTube(chapterId, youtubeUrl) {
        const idx = this.data.chapters.findIndex(c => c.id === chapterId);
        if (idx === -1) return false;
        
        this.data.chapters[idx].youtube_url = youtubeUrl;
        this.save();
        
        await this.pushToCloud('chapters', this.data.chapters[idx]);
        return true;
    }

    async toggleChapterStatus(chapterId, type, status) {
        const idx = this.data.chapters.findIndex(c => c.id === chapterId);
        if (idx === -1) return;
        
        const c = this.data.chapters[idx];
        const sub = this.data.subjects.find(s => s.id === c.subject_id);
        const subHasEx = sub ? (sub.has_exercises !== false) : true;

        if (type === 'video') c.video_completed = status;
        else c.exercises_completed = status;
        
        c.is_completed = subHasEx ? !!(c.video_completed && c.exercises_completed) : !!c.video_completed;
        this.save();

        await this.pushToCloud('chapters', c);
    }

    async updateProfile(updates) {
        if (!this.data.user_profile) return;
        
        Object.assign(this.data.user_profile, updates);
        
        // Basic Level Up Logic
        const xp = this.data.user_profile.xp || 0;
        const newLevel = Math.floor(xp / 1000) + 1;
        if (newLevel > (this.data.user_profile.level || 1)) {
            this.data.user_profile.level = newLevel;
            console.log(`[DB] Level Up! New Level: ${newLevel}`);
            // You could trigger a celebration event here
        }
        
        this.save();
        await this.pushToCloud('user_profile', this.data.user_profile);
    }

    async logSession(subjectId, duration) {
        console.log(`[DB] logSession: subjectId=${subjectId}, duration=${duration}`);
        const localId = Date.now();
        const newSession = {
            id: localId,
            subject_id: subjectId,
            duration_minutes: duration,
            timestamp: new Date().toISOString(),
            user_id: auth.user?.id || 'offline-user'
        };

        this.data.study_sessions.push(newSession);
        this.save();
        
        await this.pushToCloud('study_sessions', newSession);
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
    
    getProgressStats() { 
        let total = 0;
        let done = 0;
        
        for (const c of this.data.chapters) {
            const sub = this.data.subjects.find(s => s.id === c.subject_id);
            const subHasEx = sub ? (sub.has_exercises !== false) : true;
            
            total += subHasEx ? 2 : 1;
            done += (c.video_completed ? 1 : 0);
            if (subHasEx) done += (c.exercises_completed ? 1 : 0);
        }
        return { total, done }; 
    }

    getNextExamInfo() { const today = new Date(); const futureExams = this.data.subjects.filter(s => s.exam_date).map(s => { const d = new Date(s.exam_date); return { name: s.name, days: Math.ceil((d - today) / (1000 * 60 * 60 * 24)) }; }).filter(s => s.days >= 0).sort((a, b) => a.days - b.days); return futureExams[0] || null; }
    getStudyStreak() { if (this.data.study_sessions.length === 0) return 0; return 1; /* Simple placeholder streak */ }
    
    getSubjectProgress(subId) { 
        const sub = this.data.subjects.find(s => s.id === subId);
        const subHasEx = sub ? (sub.has_exercises !== false) : true;
        const chaps = this.data.chapters.filter(c => c.subject_id === subId);
        
        const total = chaps.length * (subHasEx ? 2 : 1);
        const done = chaps.reduce((acc, c) => {
            let count = (c.video_completed ? 1 : 0);
            if (subHasEx) count += (c.exercises_completed ? 1 : 0);
            return acc + count;
        }, 0);
        
        return { total, done }; 
    }
    
    getSmartSuggestion(subId) {
        const texts = TRANSLATIONS[auth.user?.user_metadata?.language || 'English'] || TRANSLATIONS['English'];
        if (!subId) return texts.smart_suggestion;
        const chaps = this.data.chapters.filter(c => c.subject_id === subId);
        for (let c of chaps) {
            if (!c.video_completed) return `📖 ${texts.course}: <b>${c.name}</b>`;
            if (!c.exercises_completed) return `✍️ ${texts.exercises}: <b>${c.name}</b>`;
        }
        return "🎉 All chapters completed for this subject!";
    }

    async getLeaderboard() { 
        if (!navigator.onLine || !auth.user || auth.user.id === 'offline-user') return [];
        try {
            const { data } = await auth.client.from("weekly_leaderboard").select("*"); 
            const rankings = data || [];
            
            // Inject my current local data into the rankings to show instant progress
            const meIdx = rankings.findIndex(u => u.user_id === auth.user.id);
            
            // Calculate my sessions from the last 7 days locally
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
            
            const myWeeklySessions = this.data.study_sessions.filter(s => {
                try {
                    const sessionDate = new Date(s.timestamp);
                    const isRecent = sessionDate > sevenDaysAgo;
                    return isRecent;
                } catch(e) {
                    return false;
                }
            }).length;

            console.log(`[DB] Leaderboard Local Calc: Found ${myWeeklySessions} sessions in last 7 days`);

            if (meIdx !== -1) {
                // Update my existing record in the list
                rankings[meIdx].total_sessions = myWeeklySessions;
                rankings[meIdx].xp = this.data.user_profile.xp;
                rankings[meIdx].level = this.data.user_profile.level;
                rankings[meIdx].display_name = this.data.user_profile.display_name;
            } else {
                // Add me if I'm not in the cloud leaderboard yet
                rankings.push({
                    user_id: auth.user.id,
                    display_name: this.data.user_profile.display_name || "Me",
                    xp: this.data.user_profile.xp,
                    level: this.data.user_profile.level,
                    total_sessions: myWeeklySessions
                });
            }

            return rankings.sort((a, b) => (b.xp || 0) - (a.xp || 0));
        } catch (e) {
            console.error("[DB] Leaderboard fetch error:", e);
            return [];
        }
    }
    reset() { localStorage.clear(); window.location.reload(); }
}

const db = new Database();
