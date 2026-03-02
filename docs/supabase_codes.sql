-- ==========================================
-- SUPABASE SETUP CODES (FIXED & COMPLETE)
-- Run these commands in the SQL Editor
-- ==========================================

-- 1. Fix User Profile (Add display_name)
ALTER TABLE IF EXISTS user_profile ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 2. Create the Weekly Leaderboard View (Fixed Group By)
CREATE OR REPLACE VIEW weekly_leaderboard AS
SELECT 
    up.display_name,
    up.level,
    count(ss.id) as sessions_count,
    up.user_id
FROM user_profile up
LEFT JOIN study_sessions ss ON up.user_id = ss.user_id
WHERE ss.timestamp >= date_trunc('week', now()) OR ss.timestamp IS NULL
GROUP BY up.user_id, up.display_name, up.level
ORDER BY sessions_count DESC;

-- 3. Grant Access to Leaderboard
GRANT SELECT ON weekly_leaderboard TO anon, authenticated;

-- 4. ENABLE RLS & CREATE POLICIES (Fixes "Synchronization Failed")
-- Run this block to allow users to manage their own data
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage own semesters" ON semesters FOR ALL USING (auth.uid() = user_id);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage own subjects" ON subjects FOR ALL USING (auth.uid() = user_id);

ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage own chapters" ON chapters FOR ALL USING (auth.uid() = user_id);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage own sessions" ON study_sessions FOR ALL USING (auth.uid() = user_id);

ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage own profile" ON user_profile FOR ALL USING (auth.uid() = user_id);
