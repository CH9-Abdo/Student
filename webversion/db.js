// Local Storage & Supabase Sync Engine - V6 (Cleanup & Mirror)
const DB_KEY = 'student_pro_v6_storage';

class Database {
    constructor() {
        this.data = this.load();
        this.lastSync = localStorage.getItem('last_sync_v6') || "Never";
    }

    log(msg) {
        console.log(`[DB] ${msg}`);
        const debug = document.getElementById('debug-log');
        if (debug) debug.innerHTML += `<div>${msg}</div>`;
    }

    load() {
        const saved = localStorage.getItem(DB_KEY);
        if (saved) return JSON.parse(saved);
        return {
            user_profile: { xp: 0, level: 1, total_sessions: 0 },
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

    // --- Deduplicate Local Data ---
    cleanLocalDuplicates() {
        this.log("Cleaning up local duplicates...");
        const uniqueChapters = [];
        const seen = new Set();
        
        for (const c of this.data.chapters) {
            const key = `${c.subject_id}-${c.name.toLowerCase().trim()}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueChapters.push(c);
            }
        }
        this.data.chapters = uniqueChapters;
        this.save();
    }

    // --- Cloud Sync ---
    async syncFromCloud() {
        if (!auth || !auth.user) return false;
        const uid = auth.user.id;
        this.log("Downloading data from cloud...");
        
        try {
            const [rSem, rSub, rChap, rProf, rSess] = await Promise.all([
                auth.client.from("semesters").select("*").eq("user_id", uid),
                auth.client.from("subjects").select("*").eq("user_id", uid),
                auth.client.from("chapters").select("*").eq("user_id", uid),
                auth.client.from("user_profile").select("*").eq("user_id", uid).maybeSingle(),
                auth.client.from("study_sessions").select("*").eq("user_id", uid)
            ]);

            if (rSem.data) this.data.semesters = rSem.data;
            if (rSub.data) this.data.subjects = rSub.data;
            if (rChap.data) this.data.chapters = rChap.data;
            if (rSess.data) this.data.study_sessions = rSess.data;
            if (rProf.data) this.data.user_profile = { xp: rProf.data.xp, level: rProf.data.level, total_sessions: rProf.data.total_sessions };

            this.lastSync = new Date().toLocaleTimeString();
            localStorage.setItem('last_sync_v6', this.lastSync);
            this.save();
            this.log("Download Success.");
            return true;
        } catch (err) {
            this.log(`Download Error: ${err.message}`);
            return false;
        }
    }

    async pushAllToCloud() {
        if (!auth || !auth.user) return false;
        const uid = auth.user.id;
        this.log("Starting full cloud mirror...");
        
        // Step 0: Clean local duplicates first
        this.cleanLocalDuplicates();

        try {
            // 1. WIPE CLOUD (Wait for each to finish)
            this.log("Cleaning cloud tables...");
            const e1 = await auth.client.from("study_sessions").delete().eq("user_id", uid);
            const e2 = await auth.client.from("chapters").delete().eq("user_id", uid);
            const e3 = await auth.client.from("subjects").delete().eq("user_id", uid);
            const e4 = await auth.client.from("semesters").delete().eq("user_id", uid);

            if (e1.error || e2.error || e3.error || e4.error) {
                const msg = (e1.error || e2.error || e3.error || e4.error).message;
                this.log(`Wipe Failed: ${msg}`);
                alert("Upload Error: Delete permission denied in Supabase. Check RLS policies.");
                return false;
            }

            // 2. UPLOAD PROFILE
            await auth.client.from("user_profile").upsert({ ...this.data.user_profile, user_id: uid }, { onConflict: 'user_id' });

            // 3. UPLOAD EVERYTHING ELSE (In Order)
            for (let s of this.data.semesters) {
                const { data: semData } = await auth.client.from("semesters").insert({ name: s.name, user_id: uid }).select();
                if (semData) {
                    const newSemId = semData[0].id;
                    const subs = this.data.subjects.filter(sub => sub.semester_id === s.id);
                    for (let sub of subs) {
                        const { data: subData } = await auth.client.from("subjects").insert({
                            semester_id: newSemId, name: sub.name, exam_date: sub.exam_date, notes: sub.notes, user_id: uid
                        }).select();
                        if (subData) {
                            const newSubId = subData[0].id;
                            const chaps = this.data.chapters.filter(c => c.subject_id === sub.id);
                            for (let c of chaps) {
                                await auth.client.from("chapters").insert({
                                    subject_id: newSubId, name: c.name, video_completed: c.video_completed, 
                                    exercises_completed: c.exercises_completed, is_completed: c.is_completed, user_id: uid
                                });
                            }
                        }
                    }
                }
            }
            this.log("Cloud mirror complete!");
            return true;
        } catch (err) {
            this.log(`Mirror Failure: ${err.message}`);
            return false;
        }
    }

    async pushToCloud(table, payload) {
        if (!auth || !auth.user || this.data.settings.sync_mode === "Manual") return;
        try {
            const options = table === "user_profile" ? { onConflict: 'user_id' } : {};
            await auth.client.from(table).upsert({ ...payload, user_id: auth.user.id }, options);
        } catch (err) { this.log(`Auto-push Error: ${err.message}`); }
    }

    // --- Actions ---
    async addSemester(name) {
        const tempId = Date.now();
        this.data.semesters.push({ id: tempId, name });
        this.save();
        const { data } = await auth.client.from("semesters").insert({ name, user_id: auth.user.id }).select();
        if (data) { 
            const idx = this.data.semesters.findIndex(s => s.id === tempId);
            this.data.semesters[idx].id = data[0].id;
            this.save();
        }
        return true;
    }

    async deleteSemester(id) {
        this.data.semesters = this.data.semesters.filter(s => s.id !== id);
        this.save();
        await auth.client.from("semesters").delete().eq("id", id);
    }

    async addSubject(semesterId, name, examDate) {
        const tempId = Date.now();
        this.data.subjects.push({ id: tempId, semester_id: semesterId, name, exam_date: examDate, notes: '' });
        this.save();
        const { data } = await auth.client.from("subjects").insert({ name, semester_id: semesterId, exam_date: examDate, user_id: auth.user.id }).select();
        if (data) {
            const idx = this.data.subjects.findIndex(s => s.id === tempId);
            this.data.subjects[idx].id = data[0].id;
            this.save();
        }
        return true;
    }

    async deleteSubject(id) {
        this.data.subjects = this.data.subjects.filter(s => s.id !== id);
        this.save();
        await auth.client.from("subjects").delete().eq("id", id);
    }

    async addChapter(subjectId, name) {
        const tempId = Date.now();
        this.data.chapters.push({ id: tempId, subject_id: subjectId, name, video_completed: false, exercises_completed: false, is_completed: false });
        this.save();
        const { data } = await auth.client.from("chapters").insert({ name, subject_id: subjectId, user_id: auth.user.id }).select();
        if (data) {
            const idx = this.data.chapters.findIndex(c => c.id === tempId);
            this.data.chapters[idx].id = data[0].id;
            this.save();
        }
    }

    async toggleChapterStatus(chapterId, type, status) {
        const idx = this.data.chapters.findIndex(c => c.id === chapterId);
        if (idx !== -1) {
            const c = this.data.chapters[idx];
            if (type === 'video') c.video_completed = status;
            if (type === 'exercises') c.exercises_completed = status;
            c.is_completed = c.video_completed && c.exercises_completed;
            this.save();
            await this.pushToCloud("chapters", { id: c.id, video_completed: c.video_completed, exercises_completed: c.exercises_completed, is_completed: c.is_completed, subject_id: c.subject_id });
        }
    }

    async logSession(subjectId, duration) {
        const session = { subject_id: subjectId, duration_minutes: duration, user_id: auth.user.id };
        const { data } = await auth.client.from("study_sessions").insert(session).select();
        if (data) this.data.study_sessions.push(data[0]);
        this.save();
    }

    // Getters
    getTodoChapters() { return this.data.chapters.filter(c => !c.is_completed).map(c => { const sub = this.data.subjects.find(s => s.id === c.subject_id); return { ...c, subject_name: sub ? sub.name : "Subject" }; }); }
    getProgressStats() { const total = this.data.chapters.length * 2; const done = this.data.chapters.reduce((acc, c) => acc + (c.video_completed ? 1 : 0) + (c.exercises_completed ? 1 : 0), 0); return { total, done }; }
    getNextExamInfo() { const today = new Date(); const futureExams = this.data.subjects.filter(s => s.exam_date).map(s => { const d = new Date(s.exam_date); const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24)); return { name: s.name, days: diff }; }).filter(s => s.days >= 0).sort((a, b) => a.days - b.days); return futureExams[0] || null; }
    getStudyStreak() { if (this.data.study_sessions.length === 0) return 0; const dates = [...new Set(this.data.study_sessions.map(s => s.timestamp ? s.timestamp.split('T')[0] : new Date().toISOString().split('T')[0]))].sort().reverse(); const today = new Date().toISOString().split('T')[0]; const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]; if (dates[0] !== today && dates[0] !== yesterday) return 0; let streak = 1; for (let i = 0; i < dates.length - 1; i++) { const d1 = new Date(dates[i]); const d2 = new Date(dates[i+1]); if (Math.abs((d1 - d2) / 86400000) === 1) streak++; else break; } return streak; }
    getSubjectProgress(subId) { const chaps = this.data.chapters.filter(c => c.subject_id === subId); const total = chaps.length * 2; const done = chaps.reduce((acc, c) => acc + (c.video_completed ? 1 : 0) + (c.exercises_completed ? 1 : 0), 0); return { total, done }; }
    reset() { localStorage.clear(); window.location.reload(); }
}

const db = new Database();
