// StudentPro - Minimal Cloud Sync Engine (V7 Simple)
const DB_KEY = 'student_pro_v7_storage';

class Database {
    constructor() {
        this.data = this.load();
        this.lastSync = localStorage.getItem('last_sync_v7') || "Never";
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

    // --- SIMPLE SYNC ---
    async syncFromCloud() {
        if (!auth || !auth.user) return false;
        const uid = auth.user.id;
        try {
            const [rSem, rSub, rChap, rProf, rSess] = await Promise.all([
                auth.client.from("semesters").select("*").eq("user_id", uid),
                auth.client.from("subjects").select("*").eq("user_id", uid),
                auth.client.from("chapters").select("*").eq("user_id", uid),
                auth.client.from("user_profile").select("*").eq("user_id", uid).maybeSingle(),
                auth.client.from("study_sessions").select("*").eq("user_id", uid)
            ]);

            this.data.semesters = rSem.data || [];
            this.data.subjects = rSub.data || [];
            this.data.chapters = rChap.data || [];
            this.data.study_sessions = rSess.data || [];
            if (rProf.data) this.data.user_profile = { ...this.data.user_profile, ...rProf.data };

            this.lastSync = new Date().toLocaleTimeString();
            localStorage.setItem('last_sync_v7', this.lastSync);
            this.save();
            return true;
        } catch (e) { console.error("Sync Down Error:", e); return false; }
    }

    async pushAllToCloud() {
        if (!auth || !auth.user) return false;
        const uid = auth.user.id;
        try {
            // 1. Wipe current cloud data for this user
            await auth.client.from("study_sessions").delete().eq("user_id", uid);
            await auth.client.from("chapters").delete().eq("user_id", uid);
            await auth.client.from("subjects").delete().eq("user_id", uid);
            await auth.client.from("semesters").delete().eq("user_id", uid);

            // 2. Upload Profile
            await auth.client.from("user_profile").upsert({ ...this.data.user_profile, user_id: uid }, { onConflict: 'user_id' });

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
        const { data, error } = await auth.client.from("semesters").insert({ name, user_id: auth.user.id }).select();
        if (data) { this.data.semesters.push(data[0]); this.save(); return data[0].id; }
        return null;
    }

    async addSubject(semesterId, name, examDate) {
        const { data } = await auth.client.from("subjects").insert({ name, semester_id: semesterId, exam_date: examDate, user_id: auth.user.id }).select();
        if (data) { this.data.subjects.push(data[0]); this.save(); return data[0].id; }
        return null;
    }

    async addChapter(subjectId, name) {
        const { data } = await auth.client.from("chapters").insert({ name, subject_id: subjectId, user_id: auth.user.id }).select();
        if (data) { this.data.chapters.push(data[0]); this.save(); return true; }
    }

    async toggleChapterStatus(chapterId, type, status) {
        const idx = this.data.chapters.findIndex(c => c.id === chapterId);
        if (idx === -1) return;
        const c = this.data.chapters[idx];
        if (type === 'video') c.video_completed = status;
        else c.exercises_completed = status;
        c.is_completed = c.video_completed && c.exercises_completed;
        this.save();
        await auth.client.from("chapters").update({ video_completed: c.video_completed, exercises_completed: c.exercises_completed, is_completed: c.is_completed }).eq("id", c.id);
    }

    async logSession(subjectId, duration) {
        const { data } = await auth.client.from("study_sessions").insert({ subject_id: subjectId, duration_minutes: duration, user_id: auth.user.id }).select();
        if (data) { this.data.study_sessions.push(data[0]); this.save(); }
    }

    async applyTemplate(template) {
        const semId = await this.addSemester(template.name);
        for (let sub of template.subjects) {
            const subId = await this.addSubject(semId, sub.name, null);
            for (let chap of sub.chapters) await this.addChapter(subId, chap);
        }
    }

    // --- GETTERS ---
    getTodoChapters() { return this.data.chapters.filter(c => !c.is_completed).map(c => { const sub = this.data.subjects.find(s => s.id === c.subject_id); return { ...c, subject_name: sub ? sub.name : "Subject" }; }); }
    getProgressStats() { const total = this.data.chapters.length * 2; const done = this.data.chapters.reduce((acc, c) => acc + (c.video_completed ? 1 : 0) + (c.exercises_completed ? 1 : 0), 0); return { total, done }; }
    getNextExamInfo() { const today = new Date(); const futureExams = this.data.subjects.filter(s => s.exam_date).map(s => { const d = new Date(s.exam_date); return { name: s.name, days: Math.ceil((d - today) / (1000 * 60 * 60 * 24)) }; }).filter(s => s.days >= 0).sort((a, b) => a.days - b.days); return futureExams[0] || null; }
    getStudyStreak() { if (this.data.study_sessions.length === 0) return 0; return 1; /* Simple placeholder streak */ }
    getSubjectProgress(subId) { const chaps = this.data.chapters.filter(c => c.subject_id === subId); const total = chaps.length * 2; const done = chaps.reduce((acc, c) => acc + (c.video_completed ? 1 : 0) + (c.exercises_completed ? 1 : 0), 0); return { total, done }; }
    async getLeaderboard() { const { data } = await auth.client.from("weekly_leaderboard").select("*"); return data || []; }
    reset() { localStorage.clear(); window.location.reload(); }
}

const db = new Database();
