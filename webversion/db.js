// Local Storage & Supabase Sync Engine - V4
const DB_KEY = 'student_pro_v4_storage';

class Database {
    constructor() {
        this.data = this.load();
        this.lastSync = localStorage.getItem('last_sync_v4') || "Never";
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

    // --- Cloud Sync ---
    async syncFromCloud() {
        if (!auth || !auth.user) return false;
        const uid = auth.user.id;
        this.log("Pulling cloud data...");
        
        try {
            // Fetch everything in one go
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

            if (rProf.data) {
                this.data.user_profile = { xp: rProf.data.xp, level: rProf.data.level, total_sessions: rProf.data.total_sessions };
            } else {
                this.log("Creating new cloud profile...");
                const newP = { xp: 0, level: 1, total_sessions: 0, user_id: uid };
                await auth.client.from("user_profile").insert(newP);
                this.data.user_profile = { xp: 0, level: 1, total_sessions: 0 };
            }

            this.lastSync = new Date().toLocaleTimeString();
            localStorage.setItem('last_sync_v4', this.lastSync);
            this.save();
            this.log("Sync Complete.");
            return true;
        } catch (err) {
            this.log(`Sync Error: ${err.message}`);
            return false;
        }
    }

    async pushToCloud(table, payload) {
        if (!auth || !auth.user) return;
        // Check sync mode before pushing if it's an automatic push
        if (this.data.settings.sync_mode === "Manual" && !payload._manual) return;
        
        try {
            const cleanPayload = { ...payload };
            delete cleanPayload._manual; // Remove flag before push
            
            const options = {};
            if (table === "user_profile") options.onConflict = 'user_id';
            
            const { error } = await auth.client.from(table).upsert({ ...cleanPayload, user_id: auth.user.id }, options);
            if (error) this.log(`Push ${table} failed: ${error.message}`);
        } catch (err) {
            this.log(`Critical Push Error: ${err.message}`);
        }
    }

    async pushAllToCloud() {
        if (!auth || !auth.user) return false;
        this.log("Pushing all data to cloud...");
        try {
            const uid = auth.user.id;
            
            // 1. Profile - Use onConflict for user_id
            const profPayload = { ...this.data.user_profile, user_id: uid };
            await auth.client.from("user_profile").upsert(profPayload, { onConflict: 'user_id' });

            // 2. Semesters
            for (const s of this.data.semesters) {
                await this.pushToCloud("semesters", { id: s.id, name: s.name, _manual: true });
            }

            // 3. Subjects
            for (const s of this.data.subjects) {
                await this.pushToCloud("subjects", { 
                    id: s.id, semester_id: s.semester_id, name: s.name, 
                    exam_date: s.exam_date, notes: s.notes, _manual: true 
                });
            }

            // 4. Chapters
            for (const c of this.data.chapters) {
                await this.pushToCloud("chapters", {
                    id: c.id, subject_id: c.subject_id, name: c.name,
                    video_completed: c.video_completed, exercises_completed: c.exercises_completed,
                    is_completed: c.is_completed, _manual: true
                });
            }

            // 5. Sessions
            for (const s of this.data.study_sessions) {
                await this.pushToCloud("study_sessions", { ...s, _manual: true });
            }

            this.log("All data pushed successfully.");
            return true;
        } catch (err) {
            this.log(`Full Push Error: ${err.message}`);
            return false;
        }
    }

    // --- Actions ---
    async addSemester(name) {
        this.log(`Adding semester: ${name}`);
        const { data, error } = await auth.client.from("semesters").insert({ name, user_id: auth.user.id }).select();
        if (data && data[0]) {
            this.data.semesters.push(data[0]);
            this.save();
            return true;
        }
        if (error) alert("Sync Error: " + error.message);
        return false;
    }

    async deleteSemester(id) {
        this.data.semesters = this.data.semesters.filter(s => s.id !== id);
        this.data.subjects = this.data.subjects.filter(s => s.semester_id !== id);
        this.save();
        if (auth && auth.user) {
            await auth.client.from("semesters").delete().eq("id", id);
        }
    }

    async addSubject(semesterId, name, examDate) {
        this.log(`Adding subject: ${name}`);
        const { data, error } = await auth.client.from("subjects").insert({ 
            name, semester_id: semesterId, exam_date: examDate, user_id: auth.user.id 
        }).select();
        if (data && data[0]) {
            this.data.subjects.push(data[0]);
            this.save();
            return true;
        }
        if (error) alert("Sync Error: " + error.message);
        return false;
    }

    async deleteSubject(id) {
        this.data.subjects = this.data.subjects.filter(s => s.id !== id);
        this.data.chapters = this.data.chapters.filter(c => c.subject_id !== id);
        this.save();
        if (auth && auth.user) {
            await auth.client.from("subjects").delete().eq("id", id);
        }
    }

    async addChapter(subjectId, name) {
        const { data } = await auth.client.from("chapters").insert({ 
            name, subject_id: subjectId, user_id: auth.user.id 
        }).select();
        if (data && data[0]) {
            this.data.chapters.push(data[0]);
            this.save();
        }
    }

    async toggleChapterStatus(chapterId, type, status) {
        const c = this.data.chapters.find(chap => chap.id === chapterId);
        if (c) {
            if (type === 'video') c.video_completed = status;
            if (type === 'exercises') c.exercises_completed = status;
            c.is_completed = c.video_completed && c.exercises_completed;
            this.save();
            await this.pushToCloud("chapters", {
                id: c.id,
                video_completed: c.video_completed,
                exercises_completed: c.exercises_completed,
                is_completed: c.is_completed,
                subject_id: c.subject_id
            });
        }
    }

    async logSession(subjectId, duration) {
        const session = { subject_id: subjectId, duration_minutes: duration, user_id: auth.user.id };
        const { data } = await auth.client.from("study_sessions").insert(session).select();
        if (data) this.data.study_sessions.push(data[0]);
        this.save();
    }

    // --- Stats Getters (Mirror Python Logic) ---
    getTodoChapters() {
        return this.data.chapters.filter(c => !c.is_completed).map(c => {
            const sub = this.data.subjects.find(s => s.id === c.subject_id);
            return { ...c, subject_name: sub ? sub.name : "Subject" };
        });
    }

    getProgressStats() {
        const total = this.data.chapters.length * 2;
        const done = this.data.chapters.reduce((acc, c) => acc + (c.video_completed ? 1 : 0) + (c.exercises_completed ? 1 : 0), 0);
        return { total, done };
    }

    getNextExamInfo() {
        const today = new Date();
        const futureExams = this.data.subjects.filter(s => s.exam_date).map(s => {
            const d = new Date(s.exam_date);
            const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
            return { name: s.name, days: diff };
        }).filter(s => s.days >= 0).sort((a, b) => a.days - b.days);
        return futureExams[0] || null;
    }

    getStudyStreak() {
        if (this.data.study_sessions.length === 0) return 0;
        const dates = [...new Set(this.data.study_sessions.map(s => s.timestamp ? s.timestamp.split('T')[0] : new Date().toISOString().split('T')[0]))].sort().reverse();
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (dates[0] !== today && dates[0] !== yesterday) return 0;
        let streak = 1;
        for (let i = 0; i < dates.length - 1; i++) {
            const d1 = new Date(dates[i]);
            const d2 = new Date(dates[i+1]);
            if (Math.abs((d1 - d2) / 86400000) === 1) streak++; else break;
        }
        return streak;
    }

    getSubjectProgress(subId) {
        const chaps = this.data.chapters.filter(c => c.subject_id === subId);
        const total = chaps.length * 2;
        const done = chaps.reduce((acc, c) => acc + (c.video_completed ? 1 : 0) + (c.exercises_completed ? 1 : 0), 0);
        return { total, done };
    }

    reset() { localStorage.clear(); window.location.reload(); }
}

const db = new Database();
