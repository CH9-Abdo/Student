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

Database.prototype.getAdvancedRecommendation = function(now = new Date()) {
    const subjects = this.data?.subjects || [];
    const chapters = this.data?.chapters || [];
    const sessions = this.data?.study_sessions || [];
    if (subjects.length === 0) return null;

    const nowMs = now.getTime();
    const MS_PER_DAY = 86400000;
    const clamp01 = n => Math.max(0, Math.min(1, n));

    const best = subjects
        .map(sub => {
            const subChaps = chapters.filter(c => c.subject_id === sub.id);
            const hasEx = sub.has_exercises !== false;

            const totalTasks = subChaps.length * (hasEx ? 2 : 1);
            let doneTasks = 0;
            let nextTask = null; // { type: 'course'|'exercises', chapterName }

            for (const c of subChaps) {
                if (c.video_completed) doneTasks += 1;
                else if (!nextTask) nextTask = { type: 'course', chapterName: c.name };

                if (hasEx) {
                    if (c.exercises_completed) doneTasks += 1;
                    else if (c.video_completed && !nextTask) nextTask = { type: 'exercises', chapterName: c.name };
                }
            }

            const completion = totalTasks > 0 ? (doneTasks / totalTasks) : 0;

            let daysToExam = null;
            if (sub.exam_date) {
                const exam = new Date(sub.exam_date);
                if (Number.isFinite(exam.getTime())) {
                    const days = Math.ceil((exam.getTime() - nowMs) / MS_PER_DAY);
                    if (days >= 0) daysToExam = days;
                }
            }

            let lastSessionMs = null;
            for (const s of sessions) {
                if (s.subject_id !== sub.id) continue;
                const ts = s.timestamp || s.created_at;
                if (!ts) continue;
                const d = new Date(ts);
                const t = d.getTime();
                if (!Number.isFinite(t)) continue;
                if (lastSessionMs === null || t > lastSessionMs) lastSessionMs = t;
            }
            const daysSinceLastStudy = lastSessionMs === null ? null : Math.floor((nowMs - lastSessionMs) / MS_PER_DAY);

            // Scoring:
            // - Exams soon are highest priority (0..14 days window).
            // - Lower completion and longer time since last study increase priority.
            const examScore = daysToExam === null ? 0 : clamp01((14 - Math.min(daysToExam, 14)) / 14);
            const progressScore = totalTasks === 0 ? 0 : (1 - completion);
            const recencyScore = daysSinceLastStudy === null ? 1 : clamp01(daysSinceLastStudy / 7);

            let score = (0.55 * examScore) + (0.25 * progressScore) + (0.20 * recencyScore);
            if (daysToExam !== null && daysToExam <= 3) score += 0.25; // hard push for very near exams
            if (totalTasks === 0) score *= 0.25; // no chapters: de-prioritize

            return {
                subjectId: sub.id,
                subjectName: sub.name,
                daysToExam,
                completion,
                totalTasks,
                doneTasks,
                daysSinceLastStudy,
                nextTask,
                score
            };
        })
        .sort((a, b) => b.score - a.score)[0];

    if (!best) return null;

    // Translatable reason for UI
    let reasonKey = null;
    let reasonVars = null;
    if (best.daysToExam !== null) {
        if (best.daysToExam === 0) reasonKey = 'rec_reason_exam_today';
        else { reasonKey = 'rec_reason_exam_in_days'; reasonVars = { days: best.daysToExam }; }
    } else if (best.daysSinceLastStudy === null) {
        reasonKey = 'rec_reason_not_studied_yet';
    } else if (best.daysSinceLastStudy > 0) {
        reasonKey = 'rec_reason_last_studied_days_ago';
        reasonVars = { days: best.daysSinceLastStudy };
    } else {
        reasonKey = 'rec_reason_keep_momentum';
    }

    return { ...best, reasonKey, reasonVars };
};

Database.prototype.getLeaderboard = async function() { 
    if (!navigator.onLine || !auth.user || auth.user.id === 'offline-user') return [];
    try {
        const { data } = await auth.client.from("weekly_leaderboard").select("*"); 
        const rankings = (data || []).map(r => {
            // Normalize common column name variants from different leaderboard views.
            const normalized = { ...r };
            const sessionsVal =
                normalized.total_sessions ??
                normalized.sessions ??
                normalized.weekly_sessions ??
                normalized.session_count ??
                normalized.sessions_count ??
                null;
            if (sessionsVal !== null && sessionsVal !== undefined) {
                normalized.total_sessions = Number(sessionsVal) || 0;
            }
            if (normalized.level !== null && normalized.level !== undefined) {
                normalized.level = Number(normalized.level) || 1;
            }
            if (normalized.xp !== null && normalized.xp !== undefined) {
                normalized.xp = Number(normalized.xp) || 0;
            }
            return normalized;
        });
        
        // Inject my current local data into the rankings to show instant progress
        const meIdx = rankings.findIndex(u => u.user_id === auth.user.id);
        
        // Calculate my sessions from the last 7 days locally
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        
        const myWeeklySessions = this.data.study_sessions.filter(s => {
            try {
                const sessionDate = new Date(s.timestamp || s.created_at || 0);
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
