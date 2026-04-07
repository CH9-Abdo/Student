// StudentPro - Minimal Cloud Sync Engine (V7 Simple) - Core Module
const DB_KEY = 'student_pro_v7_storage';
const OFFLINE_QUEUE_KEY = 'student_pro_offline_queue';

class Database {
    constructor() {
        console.log('[DB] Initializing Database...');
        this.data = this.load();
        this.lastSync = localStorage.getItem('last_sync_v7') || "Never";
        this.offlineQueue = this.loadOfflineQueue();
        this.repairDuplicateIds();
    }

    getXpPerLevel() {
        // Single source of truth for level progression.
        // Keep in sync with updateProfile() logic.
        return 1000;
    }

    load() {
        console.log('[DB] Loading local data...');
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
