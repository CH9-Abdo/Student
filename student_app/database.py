import sqlite3
import os
from datetime import datetime, timedelta
from student_app.settings import get_db_path
from student_app.auth_manager import AuthManager

# Initialize AuthManager to check session
_auth = AuthManager()

def get_uid():
    user = _auth.get_current_user()
    return user.id if user else None

def get_supabase():
    return _auth.supabase

def get_db_connection():
    db_path = get_db_path()
    db_dir = os.path.dirname(db_path)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('CREATE TABLE IF NOT EXISTS semesters (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, cloud_id BIGINT)')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            semester_id INTEGER,
            name TEXT NOT NULL,
            exam_date DATE,
            test_date DATE,
            notes TEXT,
            cloud_id BIGINT,
            FOREIGN KEY (semester_id) REFERENCES semesters (id) ON DELETE CASCADE
        )
    ''')
    cursor.execute('CREATE TABLE IF NOT EXISTS chapters (id INTEGER PRIMARY KEY AUTOINCREMENT, subject_id INTEGER NOT NULL, name TEXT NOT NULL, video_completed BOOLEAN DEFAULT 0, exercises_completed BOOLEAN DEFAULT 0, is_completed BOOLEAN DEFAULT 0, due_date DATE, cloud_id BIGINT, FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE)')
    cursor.execute('CREATE TABLE IF NOT EXISTS user_profile (id INTEGER PRIMARY KEY AUTOINCREMENT, xp INTEGER DEFAULT 0, level INTEGER DEFAULT 1, total_sessions INTEGER DEFAULT 0)')
    cursor.execute('CREATE TABLE IF NOT EXISTS study_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, subject_id INTEGER, duration_minutes INTEGER, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, cloud_id BIGINT, FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE)')
    
    cursor.execute('SELECT count(*) FROM user_profile')
    if cursor.fetchone()[0] == 0:
        cursor.execute('INSERT INTO user_profile (xp, level, total_sessions) VALUES (0, 1, 0)')
    
    conn.commit()
    conn.close()

def sync_from_cloud():
    uid = get_uid()
    if not uid: return False
    try:
        # 1. Sync Semesters
        res = get_supabase().table("semesters").select("*").eq("user_id", uid).execute()
        conn = get_db_connection()
        for s in res.data:
            conn.execute('INSERT OR REPLACE INTO semesters (id, name, cloud_id) VALUES (?, ?, ?)', (s['id'], s['name'], s['id']))
        # 2. Sync Subjects
        res = get_supabase().table("subjects").select("*").eq("user_id", uid).execute()
        for s in res.data:
            conn.execute('INSERT OR REPLACE INTO subjects (id, semester_id, name, exam_date, test_date, notes, cloud_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                         (s['id'], s['semester_id'], s['name'], s['exam_date'], s['test_date'], s['notes'], s['id']))
        # 3. Sync Chapters
        res = get_supabase().table("chapters").select("*").eq("user_id", uid).execute()
        for c in res.data:
            conn.execute('INSERT OR REPLACE INTO chapters (id, subject_id, name, video_completed, exercises_completed, is_completed, due_date, cloud_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                         (c['id'], c['subject_id'], c['name'], c['video_completed'], c['exercises_completed'], c['is_completed'], c['due_date'], c['id']))
        # 4. Sync Profile
        res = get_supabase().table("user_profile").select("*").eq("user_id", uid).single().execute()
        if res.data:
            conn.execute('UPDATE user_profile SET xp = ?, level = ?, total_sessions = ?', (res.data['xp'], res.data['level'], res.data['total_sessions']))
        conn.commit(); conn.close()
        return True
    except: return False

# --- User Profile ---
def get_user_profile():
    conn = get_db_connection(); p = conn.execute('SELECT * FROM user_profile LIMIT 1').fetchone(); conn.close(); return p

def add_xp(amount, session_increment=0):
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute('SELECT xp, level, total_sessions FROM user_profile LIMIT 1')
    row = cursor.fetchone()
    current_xp = row['xp'] + amount; current_sessions = row['total_sessions'] + session_increment
    new_level = 1 + (current_xp // 500); leveled_up = new_level > row['level']
    cursor.execute('UPDATE user_profile SET xp = ?, level = ?, total_sessions = ?', (current_xp, new_level, current_sessions))
    conn.commit(); conn.close()
    uid = get_uid()
    if uid:
        try: get_supabase().table("user_profile").update({"xp": current_xp, "level": new_level, "total_sessions": current_sessions}).eq("user_id", uid).execute()
        except: pass
    return leveled_up, new_level

def log_study_session(subject_id, duration_minutes):
    conn = get_db_connection(); conn.execute('INSERT INTO study_sessions (subject_id, duration_minutes) VALUES (?, ?)', (subject_id, duration_minutes)); conn.commit(); conn.close()
    uid = get_uid()
    if uid:
        try: get_supabase().table("study_sessions").insert({"subject_id": subject_id, "duration_minutes": duration_minutes, "user_id": uid}).execute()
        except: pass

# --- Semesters ---
def add_semester(name):
    conn = get_db_connection(); c = conn.cursor(); c.execute('INSERT INTO semesters (name) VALUES (?)', (name,)); lid = c.lastrowid; conn.commit(); conn.close()
    uid = get_uid()
    if uid:
        try:
            res = get_supabase().table("semesters").insert({"name": name, "user_id": uid}).execute()
            cid = res.data[0]['id']; conn = get_db_connection(); conn.execute('UPDATE semesters SET id = ?, cloud_id = ? WHERE id = ?', (cid, cid, lid)); conn.commit(); conn.close(); return cid
        except: pass
    return lid

def get_all_semesters():
    conn = get_db_connection(); sems = conn.execute('SELECT * FROM semesters').fetchall(); conn.close(); return sems

def delete_semester(sem_id):
    conn = get_db_connection(); conn.execute('DELETE FROM semesters WHERE id = ?', (sem_id,)); conn.commit(); conn.close()
    uid = get_uid()
    if uid:
        try: get_supabase().table("semesters").delete().eq("id", sem_id).execute()
        except: pass

# --- Subjects ---
def add_subject(name, semester_id, exam_date=None, test_date=None):
    conn = get_db_connection(); c = conn.cursor(); c.execute('INSERT INTO subjects (name, semester_id, exam_date, test_date) VALUES (?, ?, ?, ?)', (name, semester_id, exam_date, test_date)); lid = c.lastrowid; conn.commit(); conn.close()
    uid = get_uid()
    if uid:
        try:
            res = get_supabase().table("subjects").insert({"name": name, "semester_id": semester_id, "exam_date": exam_date, "test_date": test_date, "user_id": uid}).execute()
            cid = res.data[0]['id']; conn = get_db_connection(); conn.execute('UPDATE subjects SET id = ?, cloud_id = ? WHERE id = ?', (cid, cid, lid)); conn.commit(); conn.close(); return cid
        except: pass
    return lid

def get_all_subjects(semester_id=None):
    conn = get_db_connection()
    if semester_id: subs = conn.execute('SELECT * FROM subjects WHERE semester_id = ?', (semester_id,)).fetchall()
    else: subs = conn.execute('SELECT * FROM subjects').fetchall()
    conn.close(); return subs

def update_subject_notes(subject_id, notes):
    conn = get_db_connection(); conn.execute('UPDATE subjects SET notes = ? WHERE id = ?', (notes, subject_id)); conn.commit(); conn.close()
    uid = get_uid(); 
    if uid:
        try: get_supabase().table("subjects").update({"notes": notes}).eq("id", subject_id).execute()
        except: pass

def get_subject_notes(subject_id):
    conn = get_db_connection(); row = conn.execute('SELECT notes FROM subjects WHERE id = ?', (subject_id,)).fetchone(); conn.close(); return row['notes'] if row else ""

def delete_subject(subject_id):
    conn = get_db_connection(); conn.execute('DELETE FROM subjects WHERE id = ?', (subject_id,)); conn.commit(); conn.close()
    uid = get_uid(); 
    if uid:
        try: get_supabase().table("subjects").delete().eq("id", subject_id).execute()
        except: pass

def update_subject_dates(subject_id, exam_date, test_date):
    conn = get_db_connection(); conn.execute('UPDATE subjects SET exam_date = ?, test_date = ? WHERE id = ?', (exam_date, test_date, subject_id)); conn.commit(); conn.close()
    uid = get_uid(); 
    if uid:
        try: get_supabase().table("subjects").update({"exam_date": exam_date, "test_date": test_date}).eq("id", subject_id).execute()
        except: pass

# --- Chapters ---
def add_chapter(subject_id, name, due_date=None):
    conn = get_db_connection(); c = conn.cursor(); c.execute('INSERT INTO chapters (subject_id, name, due_date) VALUES (?, ?, ?)', (subject_id, name, due_date)); lid = c.lastrowid; conn.commit(); conn.close()
    uid = get_uid()
    if uid:
        try:
            res = get_supabase().table("chapters").insert({"subject_id": subject_id, "name": name, "due_date": due_date, "user_id": uid}).execute()
            cid = res.data[0]['id']; conn = get_db_connection(); conn.execute('UPDATE chapters SET id = ?, cloud_id = ? WHERE id = ?', (cid, cid, lid)); conn.commit(); conn.close()
        except: pass

def get_chapters_by_subject(subject_id):
    conn = get_db_connection(); chaps = conn.execute('SELECT * FROM chapters WHERE subject_id = ?', (subject_id,)).fetchall(); conn.close(); return chaps

def toggle_video_status(chapter_id, status):
    conn = get_db_connection(); c = conn.cursor(); c.execute('UPDATE chapters SET video_completed = ? WHERE id = ?', (status, chapter_id))
    c.execute('SELECT exercises_completed FROM chapters WHERE id = ?', (chapter_id,)); ex_done = c.fetchone()[0]; is_done = 1 if status and ex_done else 0
    c.execute('UPDATE chapters SET is_completed = ? WHERE id = ?', (is_done, chapter_id)); conn.commit(); conn.close()
    uid = get_uid(); 
    if uid:
        try: get_supabase().table("chapters").update({"video_completed": status, "is_completed": is_done}).eq("id", chapter_id).execute()
        except: pass

def toggle_exercises_status(chapter_id, status):
    conn = get_db_connection(); c = conn.cursor(); c.execute('UPDATE chapters SET exercises_completed = ? WHERE id = ?', (status, chapter_id))
    c.execute('SELECT video_completed FROM chapters WHERE id = ?', (chapter_id,)); vid_done = c.fetchone()[0]; is_done = 1 if status and vid_done else 0
    c.execute('UPDATE chapters SET is_completed = ? WHERE id = ?', (is_done, chapter_id)); conn.commit(); conn.close()
    uid = get_uid(); 
    if uid:
        try: get_supabase().table("chapters").update({"exercises_completed": status, "is_completed": is_done}).eq("id", chapter_id).execute()
        except: pass

def delete_chapter(chapter_id):
    conn = get_db_connection(); conn.execute('DELETE FROM chapters WHERE id = ?', (chapter_id,)); conn.commit(); conn.close()
    uid = get_uid(); 
    if uid:
        try: get_supabase().table("chapters").delete().eq("id", chapter_id).execute()
        except: pass

def toggle_chapter_status(chapter_id, status):
    conn = get_db_connection(); conn.execute('UPDATE chapters SET is_completed = ? WHERE id = ?', (status, chapter_id)); conn.commit(); conn.close()
    uid = get_uid(); 
    if uid:
        try: get_supabase().table("chapters").update({"is_completed": status}).eq("id", chapter_id).execute()
        except: pass

def update_chapter_due_date(chapter_id, due_date):
    conn = get_db_connection(); conn.execute('UPDATE chapters SET due_date = ? WHERE id = ?', (due_date, chapter_id)); conn.commit(); conn.close()
    uid = get_uid(); 
    if uid:
        try: get_supabase().table("chapters").update({"due_date": due_date}).eq("id", chapter_id).execute()
        except: pass

# --- Stats ---
def get_todo_chapters():
    conn = get_db_connection(); query = 'SELECT c.id, c.name as chapter_name, s.name as subject_name, c.is_completed, c.video_completed, c.exercises_completed FROM chapters c JOIN subjects s ON c.subject_id = s.id WHERE c.is_completed = 0'; todos = conn.execute(query).fetchall(); conn.close(); return todos

def get_subject_progress(subject_id):
    chaps = get_chapters_by_subject(subject_id); total = len(chaps); done = sum((1 if c['video_completed'] else 0) + (1 if c['exercises_completed'] else 0) for c in chaps); return total * 2, done

def get_study_streak():
    conn = get_db_connection(); rows = conn.execute("SELECT DISTINCT date(timestamp) as study_date FROM study_sessions ORDER BY study_date DESC").fetchall(); conn.close()
    dates = [datetime.strptime(row['study_date'], "%Y-%m-%d").date() for row in rows]
    if not dates: return 0
    today = datetime.now().date(); yesterday = today - timedelta(days=1)
    if dates[0] < yesterday and dates[0] != today: return 0
    streak = 1
    for i in range(len(dates) - 1):
        if (dates[i] - dates[i+1]).days == 1: streak += 1
        else: break
    return streak

def get_upcoming_deadlines(days_limit=3):
    today = datetime.now().date(); limit = today + timedelta(days=days_limit); deadlines = []; subs = get_all_subjects()
    for s in subs:
        for k in ['exam_date', 'test_date']:
            if s[k]:
                try:
                    d = datetime.strptime(s[k], "%Y-%m-%d").date()
                    if today <= d <= limit: deadlines.append(f"{'Exam' if k=='exam_date' else 'Test'}: {s['name']} on {s[k]}")
                except: continue
    return deadlines

def get_detailed_stats(semester_id=None):
    conn = get_db_connection(); query = 'SELECT s.name, COALESCE(SUM(ss.duration_minutes), 0) as total_minutes, COUNT(ss.id) as session_count FROM subjects s LEFT JOIN study_sessions ss ON s.id = ss.subject_id WHERE s.semester_id = ? OR ? IS NULL GROUP BY s.id, s.name ORDER BY total_minutes DESC'; stats = conn.execute(query, (semester_id, semester_id)).fetchall(); conn.close(); return stats

def get_progress_stats():
    conn = get_db_connection(); c = conn.cursor(); c.execute('SELECT COUNT(*) FROM chapters'); t = c.fetchone()[0]; c.execute('SELECT SUM(video_completed + exercises_completed) FROM chapters'); d = c.fetchone()[0] or 0; conn.close(); return t * 2, d

def get_next_task(subject_id):
    chaps = get_chapters_by_subject(subject_id)
    for c in sorted(chaps, key=lambda x: x['id']):
        if not c['video_completed']: return {'chapter_id': c['id'], 'chapter_name': c['name'], 'type': 'Video', 'completed': False}
        if not c['exercises_completed']: return {'chapter_id': c['id'], 'chapter_name': c['name'], 'type': 'Exercises', 'completed': False}
    return None

def get_next_exam_info():
    today = datetime.now().date(); subs = get_all_subjects(); next_ex = None; min_d = 999
    for s in subs:
        if s['exam_date']:
            try:
                d = datetime.strptime(s['exam_date'], "%Y-%m-%d").date(); days = (d - today).days
                if 0 <= days < min_d: min_d = days; next_ex = (s['name'], days)
            except: continue
    return next_ex

def reset_all_data():
    conn = get_db_connection(); conn.execute('DELETE FROM study_sessions'); conn.execute('DELETE FROM chapters'); conn.execute('DELETE FROM subjects'); conn.execute('DELETE FROM semesters'); conn.execute('UPDATE user_profile SET xp = 0, level = 1, total_sessions = 0'); conn.commit(); conn.close()
    uid = get_uid()
    if uid:
        try:
            get_supabase().table("study_sessions").delete().eq("user_id", uid).execute()
            get_supabase().table("chapters").delete().eq("user_id", uid).execute()
            get_supabase().table("subjects").delete().eq("user_id", uid).execute()
            get_supabase().table("semesters").delete().eq("user_id", uid).execute()
            get_supabase().table("user_profile").update({"xp": 0, "level": 1, "total_sessions": 0}).eq("user_id", uid).execute()
        except: pass

def get_semester_comparison_stats(): return []
def get_daily_stats(): return []
def get_weekly_stats(): return []
