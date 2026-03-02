-- ==========================================
-- SUPABASE SETUP CODES FOR STUDENTPRO
-- Run these commands in the SQL Editor
-- ==========================================

-- 1. Enable RLS and add Display Name to user_profile
ALTER TABLE IF EXISTS user_profile ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 2. Create the Weekly Leaderboard View
-- This view automatically calculates study sessions for the current week
CREATE OR REPLACE VIEW weekly_leaderboard AS
SELECT 
    up.display_name,
    up.level,
    count(ss.id) as sessions_count,
    up.user_id
FROM user_profile up
LEFT JOIN study_sessions ss ON up.user_id = ss.user_id
-- Filter sessions from the start of the current week
WHERE ss.timestamp >= date_trunc('week', now()) OR ss.timestamp IS NULL
GROUP BY up.user_id, up.display_name, up.level
ORDER BY sessions_count DESC
LIMIT 10;

-- 3. Grant public access to the Leaderboard (Important!)
-- This allows users to see the ranking without seeing each other's private data
ALTER VIEW weekly_leaderboard OWNER TO postgres;
GRANT SELECT ON weekly_leaderboard TO anon, authenticated;

-- 4. Ensure RLS Policies allow users to update their own profile
-- (Run this if you have trouble saving your name)
CREATE POLICY "Users can update their own profile" 
ON user_profile FOR UPDATE 
USING (auth.uid() = user_id);
