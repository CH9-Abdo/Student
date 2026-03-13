// StudentPro - Getters Module
// Extends Database.prototype

Database.prototype.getTodoChapters = function() {
    return this.data.chapters.filter(c => !c.is_completed).map(c => {
        const sub = this.data.subjects.find(s => s.id === c.subject_id);
        return { ...c, subject_name: sub ? sub.name : "Subject" };
    });
};

Database.prototype.getProgressStats = function() {
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
};

Database.prototype.getNextExamInfo = function() {
    const today = new Date();
    const futureExams = this.data.subjects.filter(s => s.exam_date).map(s => {
        const d = new Date(s.exam_date);
        return { name: s.name, days: Math.ceil((d - today) / (1000 * 60 * 60 * 24)) };
    }).filter(s => s.days >= 0).sort((a, b) => a.days - b.days);
    return futureExams[0] || null;
};

Database.prototype.getStudyStreak = function() {
    if (this.data.study_sessions.length === 0) return 0;
    return 1; /* Simple placeholder streak */
};

Database.prototype.getSubjectProgress = function(subId) {
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
};

Database.prototype.getSmartSuggestion = function(subId) {
    const texts = TRANSLATIONS[auth.user?.user_metadata?.language || 'English'] || TRANSLATIONS['English'];
    if (!subId) return texts.smart_suggestion;
    const chaps = this.data.chapters.filter(c => c.subject_id === subId);
    for (let c of chaps) {
        if (!c.video_completed) return `📖 ${texts.course}: <b>${c.name}</b>`;
        if (!c.exercises_completed) return `✍️ ${texts.exercises}: <b>${c.name}</b>`;
    }
    return "🎉 All chapters completed for this subject!";
};

Database.prototype.getLeaderboard = async function() { 
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
};
