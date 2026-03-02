import sqlite3
import os
from datetime import datetime, timedelta
from student_app.settings import get_db_path, get_sync_mode
from student_app.auth_manager import AuthManager

_auth = AuthManager()

def get_uid():
    user = _auth.get_current_user()
    return user.id if user else None

def get_supabase():
    return _auth.supabase

def get_db_connection():
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('CREATE TABLE IF NOT EXISTS semesters (id BIGINT PRIMARY KEY, name TEXT NOT NULL)')
    c.execute('CREATE TABLE IF NOT EXISTS subjects (id BIGINT PRIMARY KEY, semester_id BIGINT, name TEXT NOT NULL, exam_date DATE, notes TEXT)')
    c.execute('CREATE TABLE IF NOT EXISTS chapters (id BIGINT PRIMARY KEY, subject_id BIGINT, name TEXT NOT NULL, video_completed BOOLEAN DEFAULT 0, exercises_completed BOOLEAN DEFAULT 0, is_completed BOOLEAN DEFAULT 0)')
    c.execute('CREATE TABLE IF NOT EXISTS user_profile (user_id TEXT PRIMARY KEY, xp INTEGER DEFAULT 0, level INTEGER DEFAULT 1, total_sessions INTEGER DEFAULT 0, display_name TEXT)')
    c.execute('CREATE TABLE IF NOT EXISTS study_sessions (id BIGINT PRIMARY KEY, subject_id BIGINT, duration_minutes INTEGER, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)')
    
    # Check if profile exists
    c.execute('SELECT count(*) FROM user_profile')
    if c.fetchone()[0] == 0:
        uid = get_uid() or "local_user"
        c.execute('INSERT INTO user_profile (user_id, xp, level, total_sessions) VALUES (?, 0, 1, 0)', (uid,))
    conn.commit(); conn.close()

def sync_from_cloud():
    """ SIMPLE: Wipe local and load from Cloud """
    uid = get_uid()
    if not uid: return False
    try:
        sb = get_supabase()
        # Fetch all from cloud
        r_sem = sb.table("semesters").select("*").eq("user_id", uid).execute()
        r_sub = sb.table("subjects").select("*").eq("user_id", uid).execute()
        r_cha = sb.table("chapters").select("*").eq("user_id", uid).execute()
        r_pro = sb.table("user_profile").select("*").eq("user_id", uid).maybe_single().execute()
        r_ses = sb.table("study_sessions").select("*").eq("user_id", uid).execute()

        conn = get_db_connection()
        # 1. Wipe local
        conn.execute("DELETE FROM semesters"); conn.execute("DELETE FROM subjects")
        conn.execute("DELETE FROM chapters"); conn.execute("DELETE FROM study_sessions")
        conn.execute("DELETE FROM user_profile")

        # 2. Insert fresh data
        for s in r_sem.data: conn.execute("INSERT INTO semesters (id, name) VALUES (?, ?)", (s['id'], s['name']))
        for s in r_sub.data: conn.execute("INSERT INTO subjects (id, semester_id, name, exam_date, notes) VALUES (?, ?, ?, ?, ?)", (s['id'], s['semester_id'], s['name'], s['exam_date'], s['notes']))
        for c in r_cha.data: conn.execute("INSERT INTO chapters (id, subject_id, name, video_completed, exercises_completed, is_completed) VALUES (?, ?, ?, ?, ?, ?)", (c['id'], c['subject_id'], c['name'], c['video_completed'], c['exercises_completed'], c['is_completed']))
        for s in r_ses.data: conn.execute("INSERT INTO study_sessions (id, subject_id, duration_minutes, timestamp) VALUES (?, ?, ?, ?)", (s['id'], s['subject_id'], s['duration_minutes'], s['timestamp']))
        
        if r_pro.data:
            p = r_pro.data
            conn.execute("INSERT INTO user_profile (user_id, xp, level, total_sessions, display_name) VALUES (?, ?, ?, ?, ?)", 
                         (uid, p['xp'], p['level'], p['total_sessions'], p.get('display_name')))
        
        conn.commit(); conn.close()
        return True
    except Exception as e:
        print(f"Sync Down Error: {e}")
        return False

def push_to_cloud():
    """ SIMPLE: Wipe cloud and upload local """
    uid = get_uid()
    if not uid: return False
    try:
        sb = get_supabase()
        conn = get_db_connection()

        # 1. Wipe cloud
        sb.table("study_sessions").delete().eq("user_id", uid).execute()
        sb.table("chapters").delete().eq("user_id", uid).execute()
        sb.table("subjects").delete().eq("user_id", uid).execute()
        sb.table("semesters").delete().eq("user_id", uid).execute()

        # 2. Upload Profile
        p = conn.execute("SELECT * FROM user_profile LIMIT 1").fetchone()
        if p:
            sb.table("user_profile").upsert({
                "user_id": uid, "xp": p['xp'], "level": p['level'], 
                "total_sessions": p['total_sessions'], "display_name": p['display_name']
            }, on_conflict='user_id').execute()

        # 3. Upload Tree (Sem -> Sub -> Chap)
        sems = conn.execute("SELECT * FROM semesters").fetchall()
        for s in sems:
            r_s = sb.table("semesters").insert({"name": s['name'], "user_id": uid}).execute()
            if r_s.data:
                new_sid = r_s.data[0]['id']
                subs = conn.execute("SELECT * FROM subjects WHERE semester_id = ?", (s['id'],)).fetchall()
                for sub in subs:
                    r_sub = sb.table("subjects").insert({"name": sub['name'], "semester_id": new_sid, "exam_date": sub['exam_date'], "notes": sub['notes'], "user_id": uid}).execute()
                    if r_sub.data:
                        new_subid = r_sub.data[0]['id']
                        chaps = conn.execute("SELECT * FROM chapters WHERE subject_id = ?", (sub['id'],)).fetchall()
                        for c in chaps:
                            sb.table("chapters").insert({"name": c['name'], "subject_id": new_subid, "video_completed": bool(c['video_completed']), "exercises_completed": bool(c['exercises_completed']), "is_completed": bool(c['is_completed']), "user_id": uid}).execute()
        
        conn.close()
        return True
    except Exception as e:
        print(f"Sync Up Error: {e}")
        return False

# Basic Database Getters
def get_all_semesters():
    conn = get_db_connection(); rows = conn.execute("SELECT * FROM semesters").fetchall(); conn.close(); return rows

def get_all_subjects(sem_id=None):
    conn = get_db_connection()
    if sem_id: rows = conn.execute("SELECT * FROM subjects WHERE semester_id = ?", (sem_id,)).fetchall()
    else: rows = conn.execute("SELECT * FROM subjects").fetchall()
    conn.close(); return rows

def get_chapters_by_subject(sub_id):
    conn = get_db_connection(); rows = conn.execute("SELECT * FROM chapters WHERE subject_id = ?", (sub_id,)).fetchall(); conn.close(); return rows

def get_user_profile():
    conn = get_db_connection(); row = conn.execute("SELECT * FROM user_profile LIMIT 1").fetchone(); conn.close(); return row

def add_xp(amount, session_inc=0):
    conn = get_db_connection(); p = conn.execute("SELECT * FROM user_profile LIMIT 1").fetchone()
    new_xp = p['xp'] + amount; new_level = 1 + (new_xp // 500); new_sess = p['total_sessions'] + session_inc
    conn.execute("UPDATE user_profile SET xp=?, level=?, total_sessions=?", (new_xp, new_level, new_sess)); conn.commit(); conn.close()
    if get_sync_mode() == "Automatic":
        try: get_supabase().table("user_profile").update({"xp": new_xp, "level": new_level, "total_sessions": new_sess}).eq("user_id", get_uid()).execute()
        except: pass
    return (new_level > p['level']), new_level

def log_study_session(sub_id, duration):
    conn = get_db_connection(); conn.execute("INSERT INTO study_sessions (subject_id, duration_minutes) VALUES (?, ?)", (sub_id, duration)); conn.commit(); conn.close()

def get_todo_chapters():
    conn = get_db_connection()
    rows = conn.execute("SELECT c.*, s.name as subject_name FROM chapters c JOIN subjects s ON c.subject_id = s.id WHERE c.is_completed = 0 LIMIT 5").fetchall()
    conn.close(); return rows

def get_progress_stats():
    conn = get_db_connection()
    total = conn.execute("SELECT COUNT(*) FROM chapters").fetchone()[0] * 2
    done = conn.execute("SELECT SUM(video_completed + exercises_completed) FROM chapters").fetchone()[0] or 0
    conn.close(); return total, done

def get_next_exam_info():
    conn = get_db_connection(); row = conn.execute("SELECT name, exam_date FROM subjects WHERE exam_date IS NOT NULL ORDER BY exam_date ASC LIMIT 1").fetchone(); conn.close()
    if not row: return None
    days = (datetime.strptime(row['exam_date'], "%Y-%m-%d").date() - datetime.now().date()).days
    return (row['name'], days) if days >= 0 else None

def get_study_streak(): return 1 # Placeholder

def add_semester(name):
    conn = get_db_connection(); c = conn.cursor(); c.execute("INSERT INTO semesters (id, name) VALUES (?, ?)", (int(datetime.now().timestamp()), name)); conn.commit(); conn.close()

def add_subject(name, sem_id):
    conn = get_db_connection(); c = conn.cursor(); c.execute("INSERT INTO subjects (id, semester_id, name) VALUES (?, ?, ?)", (int(datetime.now().timestamp()), sem_id, name)); conn.commit(); conn.close()

def add_chapter(sub_id, name):
    conn = get_db_connection(); c = conn.cursor(); c.execute("INSERT INTO chapters (id, subject_id, name) VALUES (?, ?, ?)", (int(datetime.now().timestamp()), sub_id, name)); conn.commit(); conn.close()

def delete_semester(sid):
    conn = get_db_connection(); conn.execute("DELETE FROM semesters WHERE id=?", (sid,)); conn.commit(); conn.close()

def delete_subject(sid):
    conn = get_db_connection(); conn.execute("DELETE FROM subjects WHERE id=?", (sid,)); conn.commit(); conn.close()

def apply_template(template_data):
    for sem in template_data:
        add_semester(sem['name'])
        # Get the ID we just created (simplification)
        conn = get_db_connection(); sid = conn.execute("SELECT id FROM semesters WHERE name=? ORDER BY id DESC", (sem['name'],)).fetchone()[0]; conn.close()
        for sub in sem['subjects']:
            add_subject(sub['name'], sid)
            conn = get_db_connection(); subid = conn.execute("SELECT id FROM subjects WHERE name=? ORDER BY id DESC", (sub['name'],)).fetchone()[0]; conn.close()
            for ch in sub['chapters']: add_chapter(subid, ch)

def reset_all_data():
    if os.path.exists(get_db_path()): os.remove(get_db_path())
    init_db()
    uid = get_uid()
    if uid:
        try:
            sb = get_supabase()
            sb.table("study_sessions").delete().eq("user_id", uid).execute()
            sb.table("chapters").delete().eq("user_id", uid).execute()
            sb.table("subjects").delete().eq("user_id", uid).execute()
            sb.table("semesters").delete().eq("user_id", uid).execute()
        except: pass

def get_detailed_stats(sem_id=None): return []
def get_semester_comparison_stats(): return []
def get_daily_stats(): return []
def get_weekly_stats(): return []
def get_next_task(sub_id): return None
def update_subject_notes(sid, n): pass
def toggle_chapter_status(cid, t, s): pass
