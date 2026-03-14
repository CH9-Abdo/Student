// StudentPro - Minimal Cloud Sync Engine (V7 Simple) - Core Module
const DB_KEY = 'student_pro_v7_storage';
const OFFLINE_QUEUE_KEY = 'student_pro_offline_queue';

class Database {
    constructor() {
        console.log('[DB] Initializing Database...');
        this.data = this.load();
        this.lastSync = localStorage.getItem('last_sync_v7') || "Never";
        this.offlineQueue = this.loadOfflineQueue();
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
