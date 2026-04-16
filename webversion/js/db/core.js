// StudentPro - Minimal Cloud Sync Engine (V7 Simple) - Core Module
const DB_KEY = 'student_pro_v7_storage';
const OFFLINE_QUEUE_KEY = 'student_pro_offline_queue';
const LEVEL_MILESTONES = [5, 10, 20, 30, 50, 75, 100];
const DEFAULT_DB_DATA = {
    user_profile: { xp: 0, level: 1, total_sessions: 0, display_name: '' },
    semesters: [],
    subjects: [],
    chapters: [],
    study_sessions: [],
    progression: {
        reward_events: {
            chapter_completion: {},
            daily_goal: {},
            streak_bonus: {}
        }
    },
    settings: {
        theme: 'Light',
        lang: 'Arabic',
        sync_mode: 'Automatic',
        pomodoro: { work: 25, short: 5, long: 15 },
        reminders: { daily_enabled: true, daily_hour: 18 }
    }
};

class Database {
    constructor() {
        console.log('[DB] Initializing Database...');
        this.data = this.load();
        this.lastSync = localStorage.getItem('last_sync_v7') || "Never";
        this.offlineQueue = this.loadOfflineQueue();
        this.repairDuplicateIds();
        this.normalizeProgressionData({ saveIfChanged: true });
    }

    getXpRequiredForLevel(level = 1) {
        const safeLevel = Math.max(1, Number(level) || 1);
        return 600 + ((safeLevel - 1) * 140);
    }

    getXpPerLevel(level = this.data?.user_profile?.level || 1) {
        // Compatibility wrapper for existing callers.
        return this.getXpRequiredForLevel(level);
    }

    getXpFloorForLevel(level = 1) {
        const safeLevel = Math.max(1, Number(level) || 1);
        const completedLevels = safeLevel - 1;
        if (completedLevels <= 0) return 0;
        return Math.round((completedLevels * (1200 + ((completedLevels - 1) * 140))) / 2);
    }

    getLevelFromXp(totalXp = 0) {
        const safeXp = Math.max(0, Number(totalXp) || 0);
        let level = 1;
        while (safeXp >= this.getXpFloorForLevel(level + 1)) level += 1;
        return level;
    }

    getLevelProgress(totalXp = 0) {
        const safeXp = Math.max(0, Number(totalXp) || 0);
        const level = this.getLevelFromXp(safeXp);
        const currentLevelStartXp = this.getXpFloorForLevel(level);
        const xpForNextLevel = this.getXpRequiredForLevel(level);
        const nextLevelStartXp = currentLevelStartXp + xpForNextLevel;
        const xpIntoLevel = safeXp - currentLevelStartXp;
        const progressPct = xpForNextLevel > 0
            ? Math.max(0, Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100)))
            : 100;

        return {
            level,
            currentLevelStartXp,
            nextLevelStartXp,
            xpIntoLevel,
            xpForNextLevel,
            xpNeeded: Math.max(0, nextLevelStartXp - safeXp),
            progressPct
        };
    }

    getLevelTitleKey(level = 1) {
        const safeLevel = Math.max(1, Number(level) || 1);
        if (safeLevel >= 75) return 'level_title_mythic';
        if (safeLevel >= 55) return 'level_title_legend';
        if (safeLevel >= 40) return 'level_title_elite';
        if (safeLevel >= 30) return 'level_title_master';
        if (safeLevel >= 20) return 'level_title_strategist';
        if (safeLevel >= 15) return 'level_title_scholar';
        if (safeLevel >= 10) return 'level_title_disciplined';
        if (safeLevel >= 5) return 'level_title_focused';
        return 'level_title_apprentice';
    }

    getLevelTitle(level = 1, lang = null) {
        const selectedLang = lang || window.app?.selectedLang || this.data?.settings?.lang || 'English';
        const T = TRANSLATIONS?.[selectedLang] || TRANSLATIONS?.English || {};
        const titleKey = this.getLevelTitleKey(level);
        const fallbackTitles = {
            level_title_apprentice: 'Apprentice',
            level_title_focused: 'Focused',
            level_title_disciplined: 'Disciplined',
            level_title_scholar: 'Scholar',
            level_title_strategist: 'Strategist',
            level_title_master: 'Master',
            level_title_elite: 'Elite',
            level_title_legend: 'Legend',
            level_title_mythic: 'Mythic'
        };
        return T[titleKey] || fallbackTitles[titleKey] || fallbackTitles.level_title_apprentice;
    }

    getLevelMilestones() {
        return LEVEL_MILESTONES.slice();
    }

    getMilestonesCrossed(previousLevel = 1, newLevel = 1) {
        const before = Math.max(1, Number(previousLevel) || 1);
        const after = Math.max(before, Number(newLevel) || before);
        return this.getLevelMilestones().filter(level => level > before && level <= after);
    }

    ensureProgressionData() {
        if (!this.data || typeof this.data !== 'object') this.data = {};

        if (!this.data.progression || typeof this.data.progression !== 'object') {
            this.data.progression = {};
        }
        if (!this.data.progression.reward_events || typeof this.data.progression.reward_events !== 'object') {
            this.data.progression.reward_events = {};
        }

        ['chapter_completion', 'daily_goal', 'streak_bonus'].forEach(bucket => {
            if (!this.data.progression.reward_events[bucket] || typeof this.data.progression.reward_events[bucket] !== 'object') {
                this.data.progression.reward_events[bucket] = {};
            }
        });

        return this.data.progression;
    }

    normalizeProgressionData({ saveIfChanged = false } = {}) {
        let changed = false;

        const before = JSON.stringify(this.data?.progression || null);
        this.ensureProgressionData();
        if (JSON.stringify(this.data.progression) !== before) changed = true;

        if (this.data?.user_profile) {
            const safeXp = Math.max(0, Number(this.data.user_profile.xp || 0));
            const sessionCount = Array.isArray(this.data.study_sessions) ? this.data.study_sessions.length : 0;
            const safeSessions = Math.max(0, Number(this.data.user_profile.total_sessions || 0), sessionCount);
            const computedLevel = this.getLevelFromXp(safeXp);

            if (safeXp !== this.data.user_profile.xp) {
                this.data.user_profile.xp = safeXp;
                changed = true;
            }
            if (safeSessions !== this.data.user_profile.total_sessions) {
                this.data.user_profile.total_sessions = safeSessions;
                changed = true;
            }
            if (computedLevel !== (Number(this.data.user_profile.level || 1) || 1)) {
                this.data.user_profile.level = computedLevel;
                changed = true;
            }
        }

        if (changed && saveIfChanged) this.save();
        return changed;
    }

    getRewardToastMessage(reason, amount, meta = {}, lang = null) {
        const selectedLang = lang || window.app?.selectedLang || this.data?.settings?.lang || 'English';
        const T = TRANSLATIONS?.[selectedLang] || TRANSLATIONS?.English || {};
        const xp = Math.max(0, Number(amount || 0));

        const templateByReason = {
            chapter_completion: T.reward_toast_chapter_completion || 'Chapter completed! +{xp} XP',
            course_only_completion: T.reward_toast_course_only_completion || 'Lesson completed! +{xp} XP',
            daily_goal: T.reward_toast_daily_goal || 'Daily goal reached! +{xp} XP',
            study_streak: T.reward_toast_streak_bonus || '{streak}-day streak bonus! +{xp} XP'
        };

        return this.fillTemplate(templateByReason[reason] || (T.reward_toast_generic || '+{xp} XP earned'), {
            xp,
            streak: meta?.streak || 0
        });
    }

    notifyRewardGranted(reason, amount, meta = {}) {
        if (typeof showToast !== 'function') return;
        if (!reason || reason === 'pomodoro_focus') return;

        showToast(
            this.getRewardToastMessage(reason, amount, meta),
            reason === 'daily_goal' || reason === 'study_streak' ? 'success' : 'info',
            3200
        );
    }

    makeRewardEventKey(bucket, rawKey) {
        const userId = auth?.user?.id || 'offline-user';
        return `${userId}:${bucket}:${String(rawKey)}`;
    }

    getRewardBucket(bucket) {
        const progression = this.ensureProgressionData();
        if (!progression.reward_events[bucket] || typeof progression.reward_events[bucket] !== 'object') {
            progression.reward_events[bucket] = {};
        }
        return progression.reward_events[bucket];
    }

    hasRewardEvent(bucket, rawKey) {
        const bucketData = this.getRewardBucket(bucket);
        return Boolean(bucketData[this.makeRewardEventKey(bucket, rawKey)]);
    }

    recordRewardEvent(bucket, rawKey, eventData = {}) {
        const bucketData = this.getRewardBucket(bucket);
        const eventKey = this.makeRewardEventKey(bucket, rawKey);
        bucketData[eventKey] = {
            at: new Date().toISOString(),
            ...eventData
        };
        this.save();
        return eventKey;
    }

    getRewardXpForDate(dateKey) {
        if (!dateKey) return 0;
        const rewardEvents = this.ensureProgressionData().reward_events || {};
        let total = 0;

        Object.values(rewardEvents).forEach(bucket => {
            Object.values(bucket || {}).forEach(event => {
                if (event?.dateKey !== dateKey) return;
                total += Math.max(0, Number(event?.amount || 0));
            });
        });

        return total;
    }

    fillTemplate(template, values = {}) {
        return String(template || '').replace(/\{(\w+)\}/g, (_, key) => (
            values[key] !== undefined ? String(values[key]) : ''
        ));
    }

    notifyLevelProgression(previousLevel, newLevel) {
        if (typeof showToast !== 'function') return;
        if (!Number.isFinite(newLevel) || newLevel <= previousLevel) return;

        const lang = window.app?.selectedLang || this.data?.settings?.lang || 'English';
        const T = TRANSLATIONS?.[lang] || TRANSLATIONS?.English || {};
        const title = this.getLevelTitle(newLevel, lang);

        showToast(
            this.fillTemplate(T.toast_level_up || 'Level {level} • {title}', {
                level: newLevel,
                title
            }),
            'success',
            3500
        );

        const milestones = this.getMilestonesCrossed(previousLevel, newLevel);
        if (milestones.length === 0) return;

        const milestoneLevel = milestones[milestones.length - 1];
        showToast(
            this.fillTemplate(T.toast_level_milestone || 'Milestone reached: Level {level} • {title}', {
                level: milestoneLevel,
                title: this.getLevelTitle(milestoneLevel, lang)
            }),
            'info',
            5000
        );
    }

    load() {
        console.log('[DB] Loading local data...');
        const saved = localStorage.getItem(DB_KEY);
        if (!saved) return JSON.parse(JSON.stringify(DEFAULT_DB_DATA));

        const parsed = JSON.parse(saved);
        return {
            ...DEFAULT_DB_DATA,
            ...parsed,
            user_profile: {
                ...DEFAULT_DB_DATA.user_profile,
                ...(parsed?.user_profile || {})
            },
            progression: {
                ...DEFAULT_DB_DATA.progression,
                ...(parsed?.progression || {}),
                reward_events: {
                    ...DEFAULT_DB_DATA.progression.reward_events,
                    ...(parsed?.progression?.reward_events || {}),
                    chapter_completion: {
                        ...DEFAULT_DB_DATA.progression.reward_events.chapter_completion,
                        ...(parsed?.progression?.reward_events?.chapter_completion || {})
                    },
                    daily_goal: {
                        ...DEFAULT_DB_DATA.progression.reward_events.daily_goal,
                        ...(parsed?.progression?.reward_events?.daily_goal || {})
                    },
                    streak_bonus: {
                        ...DEFAULT_DB_DATA.progression.reward_events.streak_bonus,
                        ...(parsed?.progression?.reward_events?.streak_bonus || {})
                    }
                }
            },
            settings: {
                ...DEFAULT_DB_DATA.settings,
                ...(parsed?.settings || {}),
                pomodoro: {
                    ...DEFAULT_DB_DATA.settings.pomodoro,
                    ...(parsed?.settings?.pomodoro || {})
                },
                reminders: {
                    ...DEFAULT_DB_DATA.settings.reminders,
                    ...(parsed?.settings?.reminders || {})
                }
            }
        };
    }

    save() {
        // console.log('[DB] Saving local data...'); // Too noisy for every save
        localStorage.setItem(DB_KEY, JSON.stringify(this.data));
    }

    generateLocalId(entity = 'record') {
        const nowBased = Date.now() * 1000;
        const lastId = Number(localStorage.getItem('studentpro_last_local_id') || '0');
        const nextId = Math.max(nowBased, lastId + 1);
        localStorage.setItem('studentpro_last_local_id', String(nextId));
        return nextId;
    }

    repairDuplicateIds() {
        let repaired = 0;

        const repairTable = (table, entity, matcher, describe) => {
            const seen = new Map();
            (this.data[table] || []).forEach(record => {
                if (!record || record.id == null) return;

                if (!seen.has(record.id)) {
                    seen.set(record.id, record);
                    return;
                }

                const oldId = record.id;
                const newId = this.generateLocalId(entity);
                record.id = newId;
                repaired += 1;

                console.warn(
                    `[DB] Duplicate ${table.slice(0, -1)} id detected and repaired: old=${oldId}, new=${newId}, ${describe(record)}`
                );

                this.offlineQueue.forEach(item => {
                    if (
                        item?.table === table &&
                        item.data?.id === oldId &&
                        matcher(item.data, record)
                    ) {
                        item.data.id = newId;
                    }
                });
            });
        };

        repairTable(
            'semesters',
            'semester-repair',
            (queueData, record) => queueData?.name === record.name,
            record => `semester="${record.name}"`
        );

        repairTable(
            'subjects',
            'subject-repair',
            (queueData, record) => queueData?.semester_id === record.semester_id && queueData?.name === record.name,
            record => `semester_id=${record.semester_id}, subject="${record.name}"`
        );

        repairTable(
            'chapters',
            'chapter-repair',
            (queueData, record) => queueData?.subject_id === record.subject_id && queueData?.name === record.name,
            record => `subject_id=${record.subject_id}, chapter="${record.name}"`
        );

        repairTable(
            'study_sessions',
            'study-session-repair',
            (queueData, record) => queueData?.subject_id === record.subject_id && queueData?.timestamp === record.timestamp,
            record => `subject_id=${record.subject_id}, timestamp="${record.timestamp || record.created_at || 'unknown'}"`
        );

        if (repaired > 0) {
            console.warn(`[DB] Repaired ${repaired} duplicate local id(s).`);
            this.saveOfflineQueue?.();
            this.save();
        }
    }

    warnIfDuplicateIdsRemain() {
        const collectDuplicates = items => {
            const counts = new Map();
            (items || []).forEach(item => {
                if (!item || item.id == null) return;
                counts.set(item.id, (counts.get(item.id) || 0) + 1);
            });
            return [...counts.entries()].filter(([, count]) => count > 1).map(([id, count]) => ({ id, count }));
        };

        const duplicates = {
            semesters: collectDuplicates(this.data.semesters),
            subjects: collectDuplicates(this.data.subjects),
            chapters: collectDuplicates(this.data.chapters),
            study_sessions: collectDuplicates(this.data.study_sessions)
        };

        Object.entries(duplicates).forEach(([table, dupeIds]) => {
            if (dupeIds.length > 0) {
                console.warn(`[DB] Duplicate ids still present in ${table}:`, dupeIds);
            }
        });
    }

    getPendingSyncCount() {
        const breakdown = this.getPendingSyncBreakdown();
        return breakdown.total;
    }

    getPendingSyncBreakdown() {
        const pendingDeletions = JSON.parse(localStorage.getItem('studentpro_pending_deletions') || '[]');
        const uploads = this.offlineQueue?.length || 0;
        const deletions = pendingDeletions.length;
        return {
            uploads,
            deletions,
            total: uploads + deletions
        };
    }

    // Track deletions while offline
    trackDeletion(table, id) {
        if (!navigator.onLine && auth && auth.user) {
            console.log(`[DB] Tracking deletion while offline: table=${table}, id=${id}`);
            let deletions = JSON.parse(localStorage.getItem('studentpro_pending_deletions') || '[]');
            deletions.push({ table, id, timestamp: Date.now() });
            localStorage.setItem('studentpro_pending_deletions', JSON.stringify(deletions));
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

    reset() { 
        console.log('[DB] Resetting database...');
        localStorage.clear(); 
        window.location.reload(); 
    }
}
