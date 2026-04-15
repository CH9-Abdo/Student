// StudentPro - Sync Module
// Extends Database.prototype

Database.prototype.loadOfflineQueue = function() {
    const saved = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return saved ? JSON.parse(saved) : [];
};

Database.prototype.saveOfflineQueue = function() {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.offlineQueue));
};

Database.prototype.queueForSync = function(table, data) {
    // Deduplicate: remove any existing entry for this table/id combo
    this.offlineQueue = this.offlineQueue.filter(item => 
        !(item.table === table && item.data.id === data.id)
    );
    
    // Add to offline queue
    this.offlineQueue.push({
        table,
        data,
        timestamp: Date.now()
    });
    this.saveOfflineQueue();
    console.log(`[Offline] Queued update for ${table}:`, data);
    return true; 
};

Database.prototype.syncPendingChanges = async function() {
    if (!auth || !auth.user || !navigator.onLine) return false;
    if (auth.user.id === 'offline-user') return false;
    if (!auth.client) return false;

    // Apply any pending deletions first
    await this.applyPendingDeletions();

    // Use the in-memory queue so updateLocalId() can rewrite IDs/foreign keys during sync.
    this.offlineQueue = this.loadOfflineQueue();
    if (this.offlineQueue.length === 0) return true;

    console.log(`[Sync] Uploading ${this.offlineQueue.length} pending changes...`);
    let successCount = 0;
    let failedItems = [];

    for (const item of this.offlineQueue) {
        try {
            const result = await this.pushToCloud(item.table, item.data);
            if (result) successCount++;
            else failedItems.push(item);
        } catch (e) {
            console.error(`[Sync] Failed to push ${item.table}:`, e);
            failedItems.push(item);
        }
    }

    // Keep only failed items in queue
    this.offlineQueue = failedItems;
    this.saveOfflineQueue();

    if (successCount > 0) {
        console.log(`[Sync] Successfully uploaded ${successCount} changes`);
        this.lastSync = new Date().toLocaleTimeString();
        localStorage.setItem('last_sync_v7', this.lastSync);
    }
    return failedItems.length === 0;
};

Database.prototype.pushToCloud = async function(table, data) {
    if (!auth || !auth.user || auth.user.id === 'offline-user') return false;

    // If offline or client not ready, queue it
    if (!navigator.onLine || !auth.client) {
        return this.queueForSync(table, data);
    }

    if (table === 'chapters' && data.resources) {
        console.log(`[Sync] Pushing resources to Supabase for chapter ${data.id}:`, data.resources);
    }

    try {
        const isLocalId = (typeof data.id === 'number' && data.id > 1700000000000) || !data.id;
        let result;

        if (table === 'user_profile') {
            const { id, ...profileData } = data;
            result = await auth.client.from('user_profile').upsert({ ...profileData, user_id: auth.user.id }, { onConflict: 'user_id' });
        } else if (isLocalId) {
            // New local record
            const { id, ...insertData } = data;
            result = await auth.client.from(table).insert({ ...insertData, user_id: auth.user.id }).select();

            if (!result.error && result.data && result.data.length > 0) {
                // Update local ID with the one from the cloud
                this.updateLocalId(table, data.id, result.data[0].id);
            }
        } else {
            // Existing cloud record - use update to avoid identity column issues with upsert
            // Strip the ID from the update data to avoid "cannot update identity column" errors
            const { id: _, user_id: __, ...updateData } = data;
            result = await auth.client.from(table).update(updateData).eq('id', data.id);
        }

        if (result.error) {
            console.warn(`[Sync] Push failed for ${table}:`, result.error.message);
            // If update failed (e.g. record deleted on cloud), we could try to re-insert 
            // but we'd need to strip the ID first.
            if (result.error.code === 'PGRST116' || result.status === 404) {
                console.log(`[Sync] Record not found on cloud for ${table}, re-inserting...`);
                const { id, ...reInsertData } = data;
                const retry = await auth.client.from(table).insert({ ...reInsertData, user_id: auth.user.id }).select();
                if (!retry.error && retry.data && retry.data.length > 0) {
                    this.updateLocalId(table, data.id, retry.data[0].id);
                    return true;
                }
            }
        }

        return !result.error;
    } catch (e) { 
        console.error(`[Sync] Critical Push Error (${table}):`, e); 
        return false; 
    }
};

Database.prototype.updateLocalId = function(table, oldId, newId) {
    console.log(`[DB] Updating local ID: ${table} ${oldId} -> ${newId}`);
    const list = this.data[table];
    if (!list) return;

    const item = list.find(i => i.id === oldId);
    if (item) {
        item.id = newId;

        // Update any foreign keys pointing to this ID in local data
        if (table === 'semesters') {
            this.data.subjects.forEach(s => { if (s.semester_id === oldId) s.semester_id = newId; });
        } else if (table === 'subjects') {
            this.data.chapters.forEach(c => { if (c.subject_id === oldId) c.subject_id = newId; });
            this.data.study_sessions.forEach(s => { if (s.subject_id === oldId) s.subject_id = newId; });
        }

        // ALSO update the offline queue to ensure pending items use the correct new ID
        this.offlineQueue.forEach(qItem => {
            // If the item itself changed its ID
            if (qItem.table === table && qItem.data.id === oldId) {
                qItem.data.id = newId;
            }
            // If the item has a foreign key to the changed ID
            if (table === 'semesters' && qItem.table === 'subjects' && qItem.data.semester_id === oldId) {
                qItem.data.semester_id = newId;
            }
            if (table === 'subjects' && (qItem.table === 'chapters' || qItem.table === 'study_sessions') && qItem.data.subject_id === oldId) {
                qItem.data.subject_id = newId;
            }
        });
        this.saveOfflineQueue();

        this.save();
    }
};

Database.prototype.syncFromCloud = async function() {
    if (!auth || !auth.user || auth.user.id === 'offline-user') {
        console.warn('syncFromCloud: No cloud user session');
        return false;
    }
    if (!auth.client) {
        console.warn('syncFromCloud: Supabase client not ready');
        return false;
    }
    if (!navigator.onLine) {
        console.warn('syncFromCloud: Offline');
        return false;
    }

    const uid = auth.user.id;
    console.log(`[Sync] Syncing down for user: ${uid}`);
    
    try {
        const [rSem, rSub, rChap, rProf, rSess] = await Promise.all([
            auth.client.from("semesters").select("*").eq("user_id", uid),
            auth.client.from("subjects").select("*").eq("user_id", uid),
            auth.client.from("chapters").select("*").eq("user_id", uid),
            auth.client.from("user_profile").select("*").eq("user_id", uid).maybeSingle(),
            auth.client.from("study_sessions").select("*").eq("user_id", uid)
        ]);

        console.log('[Sync] Results:', { 
            semesters: rSem.data?.length || 0, 
            subjects: rSub.data?.length || 0, 
            chapters: rChap.data?.length || 0,
            profile: rProf.data ? 'found' : 'not found',
            sessions: rSess.data?.length || 0
        });

        this.data.semesters = rSem.data || [];
        this.data.subjects = rSub.data || [];
        this.data.chapters = rChap.data || [];
        
        // Log a sample chapter's resources to confirm download
        if (this.data.chapters.length > 0) {
            const sampleWithRes = this.data.chapters.find(c => c.resources && c.resources.length > 0);
            if (sampleWithRes) {
                console.log(`[Sync] Sample chapter with resources downloaded: ${sampleWithRes.name}`, sampleWithRes.resources);
            } else {
                console.log(`[Sync] ${this.data.chapters.length} chapters downloaded, but none had resources.`);
            }
        }

        this.data.study_sessions = rSess.data || [];
        if (rProf.data) this.data.user_profile = { ...this.data.user_profile, ...rProf.data };

        this.lastSync = new Date().toLocaleTimeString();
        localStorage.setItem('last_sync_v7', this.lastSync);
        this.save();
        console.log('[Sync] Complete!');
        return true;
    } catch (e) { 
        console.error("[Sync] Download Error:", e); 
        return false; 
    }
};
