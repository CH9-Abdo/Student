// StudentPro - Actions Module
// Extends Database.prototype

// --- SEMESTERS ---
Database.prototype.addSemester = async function(name) {
    console.log(`[DB] addSemester: name="${name}"`);
    const localId = Date.now();
    const newSem = { 
        id: localId, 
        name, 
        user_id: auth.user?.id || 'offline-user' 
    };
    
    this.data.semesters.push(newSem);
    this.save();
    
    await this.pushToCloud('semesters', newSem);
    return localId;
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
    
    await this.pushToCloud('subjects', newSub);
    return localId;
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
Database.prototype.addChapter = async function(subjectId, name, youtubeUrl = null) {
    console.log(`[DB] addChapter: subjectId=${subjectId}, name="${name}", youtubeUrl="${youtubeUrl}"`);
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
    
    await this.pushToCloud('chapters', newChap);
    return localId;
};

Database.prototype.updateChapterYouTube = async function(chapterId, youtubeUrl) {
    console.log(`[DB] updateChapterYouTube: id=${chapterId}, url=${youtubeUrl}`);
    const idx = this.data.chapters.findIndex(c => c.id === chapterId);
    if (idx === -1) return false;
    
    this.data.chapters[idx].youtube_url = youtubeUrl;
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

    if (type === 'video') c.video_completed = status;
    else c.exercises_completed = status;
    
    c.is_completed = subHasEx ? !!(c.video_completed && c.exercises_completed) : !!c.video_completed;
    this.save();

    await this.pushToCloud('chapters', c);
};

Database.prototype.updateProfile = async function(updates) {
    console.log('[DB] updateProfile:', updates);
    if (!this.data.user_profile) return;
    
    Object.assign(this.data.user_profile, updates);
    
    // Basic Level Up Logic
    const xp = this.data.user_profile.xp || 0;
    const xpPerLevel = (typeof this.getXpPerLevel === 'function') ? this.getXpPerLevel() : 1000;
    const newLevel = Math.floor(xp / xpPerLevel) + 1;
    if (newLevel > (this.data.user_profile.level || 1)) {
        this.data.user_profile.level = newLevel;
        console.log(`[DB] Level Up! New Level: ${newLevel}`);
    }
    
    this.save();
    await this.pushToCloud('user_profile', this.data.user_profile);
};

Database.prototype.logSession = async function(subjectId, duration) {
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
};

Database.prototype.applyTemplate = async function(template) {
    console.log('[DB] applyTemplate:', template.name);
    const semId = await this.addSemester(template.name);
    if (!semId) return false;
    for (let sub of template.subjects) {
        const subId = await this.addSubject(semId, sub.name, null);
        if (!subId) continue;
        for (let chap of sub.chapters) await this.addChapter(subId, chap);
    }
    return true;
};
