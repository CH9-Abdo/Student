// Leaderboard Specific Logic
StudentProApp.prototype.refreshLeaderboard = async function() {
    console.log("[App] Leaderboard: Fetching global rankings...");
    const body = get('leaderboard-body');
    if (!body) return;
    body.innerHTML = '<tr><td colspan="4" style="padding:20px; text-align:center; color:var(--text-mute);">Loading...</td></tr>';

    try {
        const data = await db.getLeaderboard();
        body.innerHTML = '';
        if (!data || data.length === 0) {
            body.innerHTML = '<tr><td colspan="4" style="padding:20px; text-align:center; color:var(--text-mute);">No data yet. Be the first!</td></tr>';
            return;
        }

        data.sort((a, b) => (b.xp || 0) - (a.xp || 0)).forEach((u, i) => {
            const tr = document.createElement('tr');
            const isMe = auth.user && u.user_id === auth.user.id;
            if (isMe) tr.style.background = "var(--primary-light)";

            const medals = ['🥇', '🥈', '🥉'];
            const rankDisplay = i < 3 ? medals[i] : `${i + 1}`;

            tr.innerHTML = `
                <td style="padding:14px; font-weight:bold; text-align:center;">${rankDisplay}</td>
                <td style="text-align:left; padding:14px; font-weight:500;">${u.display_name || 'Student'} ${isMe ? '<span class="badge">Me</span>' : ''}</td>
                <td style="padding:14px; text-align:center;">Level ${u.level || 1}</td>
                <td style="padding:14px; text-align:center; font-weight:600; color:var(--primary);">${u.total_sessions || 0}</td>
            `;
            body.appendChild(tr);
        });
    } catch (e) {
        console.error("[App] Leaderboard: Failed to load.", e);
        body.innerHTML = '<tr><td colspan="4" style="padding:20px; text-align:center; color:var(--danger);">Error loading leaderboard.</td></tr>';
    }
};
