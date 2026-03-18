// Leaderboard Specific Logic
StudentProApp.prototype.refreshLeaderboard = async function() {
    const T    = TRANSLATIONS[this.selectedLang] || TRANSLATIONS["English"];
    const podium = get('lb-podium');
    const listBody = get('lb-list-body');
    if (!podium || !listBody) return;

    if (!this.leaderboardScope) this.leaderboardScope = 'daily';

    const scope = this.leaderboardScope;
    console.log(`[App] Leaderboard: Fetching rankings (${scope})...`);

    const subtitle = get('lb-subtitle');
    if (subtitle) subtitle.textContent = T.lb_ranked_by || 'Ranked by sessions, then XP';

    // Segmented control state
    document.querySelectorAll('.lb-seg[data-period]').forEach(btn => {
        const isActive = btn.dataset.period === scope;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    podium.innerHTML = `<div class="lb-loading">${T.lb_loading || 'Loading...'}</div>`;
    listBody.innerHTML = `<div class="lb-loading">${T.lb_loading || 'Loading...'}</div>`;

    if (!navigator.onLine) {
        const msg = `<i class="fas fa-wifi-slash"></i> ${T.no_internet || 'No internet connection'}`;
        podium.innerHTML = `<div class="lb-loading">${msg}</div>`;
        listBody.innerHTML = `<div class="lb-loading">${msg}</div>`;
        return;
    }

    try {
        const data = await db.getLeaderboard(scope);
        listBody.innerHTML = '';
        if (!data || data.length === 0) {
            const msg = T.no_data_yet || 'No data yet. Be the first!';
            podium.innerHTML = `<div class="lb-loading">${msg}</div>`;
            listBody.innerHTML = `<div class="lb-loading">${msg}</div>`;
            return;
        }

        const top3 = data.slice(0, 3);
        const rest = data.slice(3);

        const myId = auth.user ? auth.user.id : 'offline-user';

        const renderPod = (u, rank) => {
            if (!u) {
                return `<div class="lb-pod"><div class="lb-loading">${T.lb_loading || 'Loading...'}</div></div>`;
            }
            const isMe = u.user_id === myId;
            const name = u.display_name || (T.student || 'Student');
            const levelLabel = T.level_label || T.level || 'Level';
            const sessions = Number(u.total_sessions ?? u.sessions ?? 0) || 0;
            const xp = Number(u.xp || 0) || 0;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
            const cls = rank === 1 ? 'gold' : rank === 2 ? 'silver' : 'bronze';
            const meTag = isMe ? ` <span class="lb-chip primary lb-mechip">Me</span>` : '';
            return `
                <div class="lb-pod ${cls} rank-${rank}" data-rank="${rank}">
                    <div class="lb-pod-top">
                        <span class="lb-medal">${medal}</span>
                        <span class="lb-rankpill">#${rank}</span>
                    </div>
                    <div class="lb-name">
                        <span class="lb-name-text" title="${name}">${name}</span>${meTag}
                    </div>
                    <div class="lb-meta">
                        <span class="lb-chip"><strong>${sessions}</strong> ${T.lb_sessions || 'Sessions'}</span>
                        <span class="lb-chip"><strong>${xp}</strong> ${T.xp || 'XP'}</span>
                        <span class="lb-chip"><strong>${u.level || 1}</strong> ${levelLabel}</span>
                    </div>
                </div>
            `;
        };

        const title = T.leaderboard || 'Leaderboard';
        const scopeLabel =
            scope === 'daily' ? (T.lb_daily || 'Daily')
            : scope === 'weekly' ? (T.lb_weekly || 'Weekly')
            : scope === 'monthly' ? (T.lb_monthly || 'Monthly')
            : (T.lb_all_time || 'All Time');

        podium.innerHTML = `
            <div class="lb-podium-title">
                <h3>${title}</h3>
                <span class="mute">${scopeLabel}</span>
            </div>
            <div class="lb-podium-scroll" aria-label="${title} podium">
                <div class="lb-podium-row">
                    ${renderPod(top3[0], 1)}
                    ${renderPod(top3[1], 2)}
                    ${renderPod(top3[2], 3)}
                </div>
            </div>
        `;

        const levelLabel = T.level_label || T.level || 'Level';
        const renderRow = (u, idx) => {
            const isMe = u.user_id === myId;
            const rank = idx + 4;
            const name = u.display_name || (T.student || 'Student');
            const sessions = Number(u.total_sessions ?? u.sessions ?? 0) || 0;
            const xp = Number(u.xp || 0) || 0;
            return `
                <div class="lb-row ${isMe ? 'me' : ''}">
                    <div class="lb-col-rank">${rank}</div>
                    <div class="lb-col-student">
                        ${name}${isMe ? ' <span class="badge">Me</span>' : ''}
                        <span class="lb-sub">${xp} ${T.xp || 'XP'}</span>
                    </div>
                    <div class="lb-col-level">${u.level || 1}</div>
                    <div class="lb-col-sessions">${sessions}</div>
                </div>
            `;
        };

        listBody.innerHTML = rest.length
            ? rest.map(renderRow).join('')
            : `<div class="lb-loading">${T.all_caught_up || 'All caught up! 🎉'}</div>`;
    } catch (e) {
        console.error("[App] Leaderboard: Failed to load.", e);
        const err = T.error_loading || 'Error loading leaderboard.';
        podium.innerHTML = `<div class="lb-loading" style="color:var(--danger);">${err}</div>`;
        listBody.innerHTML = `<div class="lb-loading" style="color:var(--danger);">${err}</div>`;
    }
};
