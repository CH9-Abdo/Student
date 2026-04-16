// StudentPro - Actions Module
// Extends Database.prototype

// --- SEMESTERS ---
Database.prototype.addSemester = async function(name) {
    console.log(`[DB] addSemester: name="${name}"`);
    const localId = this.generateLocalId('semester');
    const newSem = { 
        id: localId, 
        name, 
        user_id: auth.user?.id || 'offline-user' 
    };
    
    this.data.semesters.push(newSem);
    this.save();
    
    await this.pushToCloud('semesters', newSem);
    // pushToCloud() can update the ID in-place (newSem is the same object stored in this.data).
    return newSem.id || localId;
};

Database.prototype.deleteSemester = async function(semesterId) {
    console.log(`[DB] deleteSemester: id=${semesterId}`);
    const idx = this.data.semesters.findIndex(s => s.id === semesterId);
    if (idx === -1) return;
    
    const subjectIds = this.data.subjects.filter(s => s.semester_id === semesterId).map(s => s.id);
    const chapterIds = this.data.chapters.filter(c => subjectIds.includes(c.subject_id)).map(c => c.id);
    
    this.data.semesters.splice(idx, 1);
    this.data.subjects = this.data.subjects.filter(s => s.semester_id !== semesterId);
    this.data.chapters = this.data.chapters.filter(c => !subjectIds.includes(c.subject_id));
    this.save();
    
    this.trackDeletion('semesters', semesterId);
    subjectIds.forEach(id => this.trackDeletion('subjects', id));
    chapterIds.forEach(id => this.trackDeletion('chapters', id));
    
    if (navigator.onLine && auth.user && auth.user.id !== 'offline-user') {
        try {
            await auth.client.from("semesters").delete().eq("id", semesterId);
            await auth.client.from("subjects").delete().eq("semester_id", semesterId);
            for (const subId of subjectIds) {
                await auth.client.from("chapters").delete().eq("subject_id", subId);
            }
        } catch (e) {}
    }
};

// --- SUBJECTS ---
Database.prototype.addSubject = async function(semesterId, name, examDate, hasExercises = true) {
    console.log(`[DB] addSubject: semesterId=${semesterId}, name="${name}"`);
    const examDateValue = examDate && examDate.trim() ? examDate : null;
    const localId = this.generateLocalId('subject');
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
    
    await this.pushToCloud('subjects', newSub);
    return newSub.id || localId;
};

Database.prototype.deleteSubject = async function(subjectId) {
    console.log(`[DB] deleteSubject: id=${subjectId}`);
    const idx = this.data.subjects.findIndex(s => s.id === subjectId);
    if (idx === -1) return;
    
    const chapterIds = this.data.chapters.filter(c => c.subject_id === subjectId).map(c => c.id);
    
    this.data.subjects.splice(idx, 1);
    this.data.chapters = this.data.chapters.filter(c => c.subject_id !== subjectId);
    this.save();
    
    this.trackDeletion('subjects', subjectId);
    chapterIds.forEach(id => this.trackDeletion('chapters', id));
    
    if (navigator.onLine && auth.user && auth.user.id !== 'offline-user') {
        try {
            await auth.client.from("subjects").delete().eq("id", subjectId);
            await auth.client.from("chapters").delete().eq("subject_id", subjectId);
        } catch (e) {}
    }
};

Database.prototype.updateSubjectExamDate = async function(subjectId, examDate) {
    console.log(`[DB] updateSubjectExamDate: id=${subjectId}, date=${examDate}`);
    const idx = this.data.subjects.findIndex(s => s.id === subjectId);
    if (idx === -1) return;
    this.data.subjects[idx].exam_date = examDate;
    this.save();

    await this.pushToCloud('subjects', this.data.subjects[idx]);
};

Database.prototype.updateSubjectName = async function(subjectId, newName) {
    console.log(`[DB] updateSubjectName: id=${subjectId}, name=${newName}`);
    const idx = this.data.subjects.findIndex(s => s.id === subjectId);
    if (idx === -1) return;
    this.data.subjects[idx].name = newName;
    this.save();

    await this.pushToCloud('subjects', this.data.subjects[idx]);
};

// --- CHAPTERS ---
Database.prototype.addChapter = async function(subjectId, name, youtubeUrl = null, resources = []) {
    console.log(`[DB] addChapter: subjectId=${subjectId}, name="${name}", youtubeUrl="${youtubeUrl}"`);
    const localId = this.generateLocalId('chapter');
    const newChap = {
        id: localId,
        subject_id: subjectId,
        name,
        youtube_url: youtubeUrl,
        resources: resources || [],
        video_completed: false,
        exercises_completed: false,
        is_completed: false,
        user_id: auth.user?.id || 'offline-user'
    };

    this.data.chapters.push(newChap);
    this.save();
    
    await this.pushToCloud('chapters', newChap);
    return newChap.id || localId;
};

Database.prototype.updateChapterYouTube = async function(chapterId, youtubeUrl) {
    console.log(`[DB] updateChapterYouTube: id=${chapterId}, url=${youtubeUrl}`);
    const idx = this.data.chapters.findIndex(c => c.id === chapterId);
    if (idx === -1) return false;
    
    this.data.chapters[idx].youtube_url = youtubeUrl;
    
    // Also sync to resources if not already there
    if (youtubeUrl) {
        if (!this.data.chapters[idx].resources) this.data.chapters[idx].resources = [];
        const hasVid = this.data.chapters[idx].resources.some(r => r.type === 'video');
        if (!hasVid) {
            this.data.chapters[idx].resources.push({ type: 'video', url: youtubeUrl, label: 'Video Lesson' });
        } else {
            const vidIdx = this.data.chapters[idx].resources.findIndex(r => r.type === 'video');
            this.data.chapters[idx].resources[vidIdx].url = youtubeUrl;
        }
    }

    this.save();
    
    await this.pushToCloud('chapters', this.data.chapters[idx]);
    return true;
};

Database.prototype.updateChapterResources = async function(chapterId, resources) {
    console.log(`[DB] updateChapterResources: id=${chapterId}`, resources);
    const idx = this.data.chapters.findIndex(c => c.id === chapterId);
    if (idx === -1) {
        console.error(`[DB] updateChapterResources: Chapter ${chapterId} not found!`);
        return false;
    }
    
    this.data.chapters[idx].resources = resources;
    
    // Keep youtube_url in sync for backward compatibility
    const vid = resources.find(r => r.type === 'video');
    this.data.chapters[idx].youtube_url = vid ? vid.url : null;

    console.log(`[DB] Local data updated for chapter ${chapterId}. Total resources: ${resources.length}`);
    this.save();
    await this.pushToCloud('chapters', this.data.chapters[idx]);
    return true;
};

Database.prototype.toggleChapterStatus = async function(chapterId, type, status) {
    console.log(`[DB] toggleChapterStatus: id=${chapterId}, type=${type}, status=${status}`);
    const idx = this.data.chapters.findIndex(c => c.id === chapterId);
    if (idx === -1) return;
    
    const c = this.data.chapters[idx];
    const sub = this.data.subjects.find(s => s.id === c.subject_id);
    const subHasEx = sub ? (sub.has_exercises !== false) : true;
    const wasCompleted = !!c.is_completed;

    if (type === 'video') c.video_completed = status;
    else c.exercises_completed = status;
    
    c.is_completed = subHasEx ? !!(c.video_completed && c.exercises_completed) : !!c.video_completed;
    this.save();

    await this.pushToCloud('chapters', c);

    if (status && !wasCompleted && c.is_completed) {
        const now = new Date();
        const rewardAmount = subHasEx ? 20 : 10;
        await this.claimXpReward(
            'chapter_completion',
            String(chapterId),
            rewardAmount,
            subHasEx ? 'chapter_completion' : 'course_only_completion',
            {
                chapterId,
                subjectId: c.subject_id,
                dateKey: typeof this.getDateKey === 'function' ? this.getDateKey(now) : null
            }
        );
    }
};

Database.prototype.claimXpReward = async function(bucket, rewardKey, amount, reason, meta = {}) {
    const safeAmount = Math.max(0, Math.round(Number(amount) || 0));
    if (!safeAmount) {
        return {
            awarded: false,
            duplicate: false,
            amount: 0,
            reason,
            meta
        };
    }

    if (this.hasRewardEvent(bucket, rewardKey)) {
        return {
            awarded: false,
            duplicate: true,
            amount: 0,
            reason,
            meta
        };
    }

    this.recordRewardEvent(bucket, rewardKey, {
        amount: safeAmount,
        reason,
        dateKey: meta?.dateKey || null
    });

    const result = await this.awardXp(reason, safeAmount, meta);
    this.notifyRewardGranted?.(reason, safeAmount, meta);
    return {
        ...result,
        duplicate: false,
        rewardBucket: bucket,
        rewardKey
    };
};

Database.prototype.awardXp = async function(reason, amount, meta = {}) {
    const safeAmount = Math.max(0, Math.round(Number(amount) || 0));
    if (!safeAmount) {
        return {
            awarded: false,
            amount: 0,
            reason,
            meta,
            level: Number(this.data?.user_profile?.level || 1) || 1
        };
    }

    const currentXp = Number(this.data?.user_profile?.xp || 0) || 0;
    const profileResult = await this.updateProfile(
        { xp: currentXp + safeAmount },
        { showLevelToast: true, reason, meta }
    );

    return {
        ...profileResult,
        awarded: true,
        amount: safeAmount,
        reason,
        meta
    };
};

Database.prototype.updateProfile = async function(updates, options = {}) {
    console.log('[DB] updateProfile:', updates);
    if (!this.data.user_profile) return;

    const previousLevel = Number(this.data.user_profile.level || this.getLevelFromXp(this.data.user_profile.xp || 0) || 1) || 1;
    Object.assign(this.data.user_profile, updates);

    this.data.user_profile.xp = Math.max(0, Number(this.data.user_profile.xp || 0));
    this.data.user_profile.total_sessions = Math.max(0, Number(this.data.user_profile.total_sessions || 0));
    const newLevel = this.getLevelFromXp(this.data.user_profile.xp);
    this.data.user_profile.level = newLevel;

    this.save();
    await this.pushToCloud('user_profile', this.data.user_profile);

    if (newLevel > previousLevel) {
        console.log(`[DB] Level Up! New Level: ${newLevel}`);
        if (options.showLevelToast !== false) {
            this.notifyLevelProgression(previousLevel, newLevel);
        }
    }

    return {
        profile: this.data.user_profile,
        previousLevel,
        level: newLevel,
        levelUp: newLevel > previousLevel,
        milestones: this.getMilestonesCrossed(previousLevel, newLevel)
    };
};

Database.prototype.logSession = async function(subjectId, duration) {
    console.log(`[DB] logSession: subjectId=${subjectId}, duration=${duration}`);
    const localId = this.generateLocalId('study_session');
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
    await this.updateProfile({
        total_sessions: (Number(this.data.user_profile.total_sessions || 0) || 0) + 1
    }, { showLevelToast: false });

    const sessionDate = (typeof this.getStudySessionDate === 'function' ? this.getStudySessionDate(newSession) : null) || new Date();
    const dateKey = typeof this.getDateKey === 'function' ? this.getDateKey(sessionDate) : null;
    const rewards = [];

    const dailyStats = typeof this.getDailyStudyStats === 'function'
        ? this.getDailyStudyStats(sessionDate)
        : { goal: 3, sessions: 0 };

    if (dailyStats.sessions >= dailyStats.goal && dateKey) {
        const dailyGoalReward = await this.claimXpReward(
            'daily_goal',
            dateKey,
            30,
            'daily_goal',
            {
                dateKey,
                goal: dailyStats.goal,
                sessions: dailyStats.sessions
            }
        );
        if (dailyGoalReward.awarded) rewards.push(dailyGoalReward);
    }

    if (dailyStats.sessions === 1 && dateKey) {
        const streak = typeof this.getStudyStreak === 'function' ? this.getStudyStreak() : 0;
        const streakBonus = Math.min(Math.max(0, streak - 1) * 15, 90);
        if (streak > 1 && streakBonus > 0) {
            const streakReward = await this.claimXpReward(
                'streak_bonus',
                dateKey,
                streakBonus,
                'study_streak',
                {
                    dateKey,
                    streak
                }
            );
            if (streakReward.awarded) rewards.push(streakReward);
        }
    }

    return {
        id: newSession.id || localId,
        rewards,
        bonusXp: rewards.reduce((total, reward) => total + (Number(reward.amount || 0) || 0), 0),
        dateKey
    };
};

Database.prototype.completeFocusSession = async function({ subjectId, durationMinutes, completedAt = new Date() } = {}) {
    const safeSubjectId = Number(subjectId || 0) || null;
    const safeMinutes = Math.max(1, Math.round(Number(durationMinutes) || 0));

    if (!safeSubjectId || !safeMinutes) {
        return {
            logged: false,
            xpAwarded: 0,
            focusXp: 0,
            bonusXp: 0,
            rewards: [],
            dateKey: typeof this.getDateKey === 'function' ? this.getDateKey(completedAt instanceof Date ? completedAt : new Date()) : null
        };
    }

    const sessionResult = await this.logSession(safeSubjectId, safeMinutes);
    const focusXp = typeof this.getPomodoroXpForMinutes === 'function'
        ? this.getPomodoroXpForMinutes(safeMinutes)
        : (safeMinutes * 2);

    const focusReward = await this.awardXp('pomodoro_focus', focusXp, {
        subjectId: safeSubjectId,
        durationMinutes: safeMinutes,
        dateKey: sessionResult?.dateKey || null
    });

    return {
        logged: true,
        sessionId: sessionResult?.id || null,
        focusXp: Number(focusReward?.amount || 0) || 0,
        bonusXp: Number(sessionResult?.bonusXp || 0) || 0,
        xpAwarded: (Number(focusReward?.amount || 0) || 0) + (Number(sessionResult?.bonusXp || 0) || 0),
        rewards: [focusReward, ...(sessionResult?.rewards || [])].filter(Boolean),
        dateKey: sessionResult?.dateKey || null
    };
};

Database.prototype.applyTemplate = async function(template) {
    console.log('[DB] applyTemplate:', template.name);
    const semId = await this.addSemester(template.name);
    if (!semId) return false;
    for (let sub of template.subjects) {
        const hasEx = sub.has_exercises !== false; // Default to true unless false
        const subId = await this.addSubject(semId, sub.name, null, hasEx);
        if (!subId) continue;
        
        for (let chap of sub.chapters) {
            if (typeof chap === 'string') {
                await this.addChapter(subId, chap);
            } else {
                // Clone resources if they exist, otherwise start empty
                let resources = chap.resources ? JSON.parse(JSON.stringify(chap.resources)) : [];
                let ytUrl = chap.url || null;
                
                // If there's a standalone url but it's not in the resources yet, add it as a video
                if (ytUrl && !resources.some(r => r.type === 'video')) {
                    resources.push({ type: 'video', url: ytUrl, label: 'Video Lesson' });
                } 
                // If there's no standalone url but there is a video in resources, use that as the main ytUrl
                else if (!ytUrl && resources.some(r => r.type === 'video')) {
                    ytUrl = resources.find(r => r.type === 'video').url;
                }

                await this.addChapter(subId, chap.name, ytUrl, resources);
            }
        }
    }
    return true;
};

