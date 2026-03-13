import sqlite3
import os
from datetime import datetime, timedelta
from student_app.settings import get_db_path, get_sync_mode
from student_app.auth_manager import AuthManager

_auth = AuthManager()

def get_uid():
    user = _auth.get_current_user()
    return user.id if user else None

def is_offline_mode():
    uid = get_uid()
    return uid == "local_user" or uid is None

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
    
    # Fix user_profile if 'id' is INTEGER (old version)
    try:
        c.execute("PRAGMA table_info(user_profile)")
        cols = c.fetchall()
        id_col = next((col for col in cols if col[1] == 'id'), None)
        if id_col and id_col[2].upper() == 'INTEGER':
             print("[DB] user_profile.id is INTEGER, rebuilding table to TEXT...")
             c.execute("DROP TABLE user_profile")
    except Exception as e:
        print(f"[DB] Check user_profile error: {e}")

    # Use standard INTEGER for SQLite (BIGINT is an alias anyway)
    c.execute('CREATE TABLE IF NOT EXISTS semesters (id INTEGER PRIMARY KEY, name TEXT NOT NULL, cloud_id BIGINT)')
    c.execute('CREATE TABLE IF NOT EXISTS subjects (id INTEGER PRIMARY KEY, semester_id INTEGER, name TEXT NOT NULL, exam_date DATE, notes TEXT, has_exercises BOOLEAN DEFAULT 1, cloud_id BIGINT)')
    c.execute('CREATE TABLE IF NOT EXISTS chapters (id INTEGER PRIMARY KEY, subject_id INTEGER, name TEXT NOT NULL, video_completed BOOLEAN DEFAULT 0, exercises_completed BOOLEAN DEFAULT 0, is_completed BOOLEAN DEFAULT 0, due_date DATE, cloud_id BIGINT, youtube_url TEXT)')
    c.execute('CREATE TABLE IF NOT EXISTS user_profile (id TEXT PRIMARY KEY, xp INTEGER DEFAULT 0, level INTEGER DEFAULT 1, total_sessions INTEGER DEFAULT 0, display_name TEXT)')
    c.execute('CREATE TABLE IF NOT EXISTS study_sessions (id INTEGER PRIMARY KEY, subject_id INTEGER, duration_minutes INTEGER, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, cloud_id BIGINT)')
    
    # Migration: Add cloud_id if missing
    for table in ['semesters', 'subjects', 'chapters', 'study_sessions']:
        try: c.execute(f'ALTER TABLE {table} ADD COLUMN cloud_id BIGINT')
        except: pass
    
    # Migration: Add youtube_url to chapters if missing
    try: c.execute('ALTER TABLE chapters ADD COLUMN youtube_url TEXT')
    except: pass
    
    # Migration: Add has_exercises if missing
    try: c.execute('ALTER TABLE subjects ADD COLUMN has_exercises BOOLEAN DEFAULT 1')
    except: pass
    
    c.execute('SELECT count(*) FROM user_profile')
    if c.fetchone()[0] == 0:
        uid = get_uid() or "local_user"
        c.execute('INSERT INTO user_profile (id, xp, level, total_sessions) VALUES (?, 0, 1, 0)', (uid,))
    conn.commit(); conn.close()

import traceback

def sync_from_cloud():
    uid = get_uid()
    if not uid or is_offline_mode(): return False
    try:
        sb = get_supabase()
        print(f"[Sync] Downloading data for UID: {uid}")
        r_sem = sb.table("semesters").select("*").eq("user_id", uid).execute()
        r_sub = sb.table("subjects").select("*").eq("user_id", uid).execute()
        r_cha = sb.table("chapters").select("*").eq("user_id", uid).execute()
        r_pro = sb.table("user_profile").select("*").eq("user_id", uid).maybe_single().execute()
        r_ses = sb.table("study_sessions").select("*").eq("user_id", uid).execute()

        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM semesters")
        cursor.execute("DELETE FROM subjects")
        cursor.execute("DELETE FROM chapters")
        cursor.execute("DELETE FROM study_sessions")
        cursor.execute("DELETE FROM user_profile")

        sem_map = {}
        sub_map = {}

        for s in r_sem.data:
            cursor.execute("INSERT INTO semesters (name, cloud_id) VALUES (?, ?)", (str(s['name']), s['id']))
            sem_map[s['id']] = cursor.lastrowid
            
        for s in r_sub.data:
            local_sem_id = sem_map.get(s['semester_id'])
            cursor.execute("INSERT INTO subjects (semester_id, name, exam_date, notes, has_exercises, cloud_id) VALUES (?, ?, ?, ?, ?, ?)", 
                         (local_sem_id, str(s['name']), s['exam_date'], s['notes'], int(s.get('has_exercises', True)), s['id']))
            sub_map[s['id']] = cursor.lastrowid
            
        for c in r_cha.data:
            local_sub_id = sub_map.get(c['subject_id'])
            cursor.execute("INSERT INTO chapters (subject_id, name, video_completed, exercises_completed, is_completed, cloud_id, youtube_url) VALUES (?, ?, ?, ?, ?, ?, ?)", 
                         (local_sub_id, str(c['name']), int(c['video_completed']), int(c['exercises_completed']), int(c['is_completed']), c['id'], c.get('youtube_url')))
        
        for s in r_ses.data:
            local_sub_id = sub_map.get(s['subject_id'])
            cursor.execute("INSERT INTO study_sessions (subject_id, duration_minutes, timestamp, cloud_id) VALUES (?, ?, ?, ?)", 
                         (local_sub_id, int(s['duration_minutes']), s['timestamp'], s['id']))
        
        if r_pro.data:
            cursor.execute("INSERT INTO user_profile (id, xp, level, total_sessions, display_name) VALUES (?, ?, ?, ?, ?)", 
                         (uid, int(r_pro.data['xp']), int(r_pro.data['level']), int(r_pro.data['total_sessions']), r_pro.data.get('display_name')))
        
        conn.commit(); conn.close()
        print("[Sync] Download and local update successful.")
        return True
    except Exception as e:
        print(f"[Sync] Download failed: {e}")
        traceback.print_exc()
        return False

def push_to_cloud():
    uid = get_uid(); sb = get_supabase(); conn = get_db_connection()
    if not uid or is_offline_mode(): return False
    try:
        print("[Sync] Starting Cloud Push (Mirror Mode)...")
        # 1. Clear cloud data for this user
        sb.table("study_sessions").delete().eq("user_id", uid).execute()
        sb.table("chapters").delete().eq("user_id", uid).execute()
        sb.table("subjects").delete().eq("user_id", uid).execute()
        sb.table("semesters").delete().eq("user_id", uid).execute()
        
        # 2. Profile
        p = conn.execute("SELECT * FROM user_profile LIMIT 1").fetchone()
        if p:
            sb.table("user_profile").upsert({
                "user_id": uid, "xp": int(p['xp']), "level": int(p['level']), 
                "total_sessions": int(p['total_sessions']), "display_name": p['display_name']
            }, on_conflict='user_id').execute()

        # 3. Semesters -> Subjects -> Chapters
        cursor = conn.cursor()
        sems = cursor.execute("SELECT * FROM semesters").fetchall()
        for s in sems:
            res_s = sb.table("semesters").insert({"name": s['name'], "user_id": uid}).execute()
            if res_s.data:
                new_sem_id = res_s.data[0]['id']
                cursor.execute("UPDATE semesters SET cloud_id = ? WHERE id = ?", (new_sem_id, s['id']))
                
                subs = cursor.execute("SELECT * FROM subjects WHERE semester_id = ?", (s['id'],)).fetchall()
                for sub in subs:
                    res_sub = sb.table("subjects").insert({
                        "name": sub['name'], "semester_id": new_sem_id, 
                        "exam_date": sub['exam_date'], "notes": sub['notes'], 
                        "has_exercises": bool(sub['has_exercises']), "user_id": uid
                    }).execute()
                    
                    if res_sub.data:
                        new_sub_id = res_sub.data[0]['id']
                        cursor.execute("UPDATE subjects SET cloud_id = ? WHERE id = ?", (new_sub_id, sub['id']))
                        # Upload Chapters for this subject
                        chaps = cursor.execute("SELECT * FROM chapters WHERE subject_id = ?", (sub['id'],)).fetchall()
                        for c in chaps:
                            res_c = sb.table("chapters").insert({
                                "name": c['name'], "subject_id": new_sub_id, 
                                "video_completed": bool(c['video_completed']), 
                                "exercises_completed": bool(c['exercises_completed']), 
                                "is_completed": bool(c['is_completed']), 
                                "user_id": uid,
                                "youtube_url": c['youtube_url']
                            }).execute()
                            if res_c.data:
                                cursor.execute("UPDATE chapters SET cloud_id = ? WHERE id = ?", (res_c.data[0]['id'], c['id']))

        # 4. Sessions
        sessions = cursor.execute("SELECT * FROM study_sessions").fetchall()
        for sess in sessions:
            sub_row = cursor.execute("SELECT cloud_id FROM subjects WHERE id = ?", (sess['subject_id'],)).fetchone()
            if sub_row and sub_row['cloud_id']:
                sb.table("study_sessions").insert({
                    "subject_id": sub_row['cloud_id'], "duration_minutes": int(sess['duration_minutes']),
                    "timestamp": str(sess['timestamp']), "user_id": uid
                }).execute()

        conn.commit()
        print("[Sync] Cloud Push successful.")
        return True
    except Exception as e:
        print(f"[Sync] Push failed: {e}")
        traceback.print_exc()
        return False
    finally:
        conn.close()

def get_all_semesters(): conn = get_db_connection(); r = conn.execute("SELECT * FROM semesters").fetchall(); conn.close(); return r
def get_all_subjects(sem_id=None):
    conn = get_db_connection()
    if sem_id: r = conn.execute("SELECT * FROM subjects WHERE semester_id = ?", (sem_id,)).fetchall()
    else: r = conn.execute("SELECT * FROM subjects").fetchall()
    conn.close(); return r
def get_chapters_by_subject(sub_id): conn = get_db_connection(); r = conn.execute("SELECT * FROM chapters WHERE subject_id = ?", (sub_id,)).fetchall(); conn.close(); return r
def get_user_profile(): conn = get_db_connection(); r = conn.execute("SELECT * FROM user_profile LIMIT 1").fetchone(); conn.close(); return r
def add_xp(amount, session_inc=0):
    conn = get_db_connection(); p = conn.execute("SELECT * FROM user_profile LIMIT 1").fetchone()
    nx = p['xp'] + amount; nl = 1 + (nx // 500); ns = p['total_sessions'] + session_inc
    conn.execute("UPDATE user_profile SET xp=?, level=?, total_sessions=?", (nx, nl, ns)); conn.commit(); conn.close()
    if get_sync_mode() == "Automatic" and not is_offline_mode():
        try: get_supabase().table("user_profile").update({"xp": nx, "level": nl, "total_sessions": ns}).eq("user_id", get_uid()).execute()
        except: pass
    return (nl > p['level']), nl

def log_study_session(sub_id, duration):
    conn = get_db_connection(); conn.execute("INSERT INTO study_sessions (id, subject_id, duration_minutes) VALUES (?, ?, ?)", (int(datetime.now().timestamp()), sub_id, duration)); conn.commit(); conn.close()
    if get_sync_mode() == "Automatic" and not is_offline_mode():
        try: get_supabase().table("study_sessions").insert({"subject_id": sub_id, "duration_minutes": duration, "user_id": get_uid()}).execute()
        except: pass

def get_todo_chapters():
    conn = get_db_connection(); r = conn.execute("SELECT c.*, s.name as subject_name FROM chapters c JOIN subjects s ON c.subject_id = s.id WHERE c.is_completed = 0 LIMIT 5").fetchall(); conn.close(); return r
def get_progress_stats():
    conn = get_db_connection(); t = conn.execute("SELECT COUNT(*) FROM chapters").fetchone()[0] * 2; d = conn.execute("SELECT SUM(video_completed + exercises_completed) FROM chapters").fetchone()[0] or 0; conn.close(); return t, d
def get_next_exam_info():
    conn = get_db_connection(); r = conn.execute("SELECT name, exam_date FROM subjects WHERE exam_date IS NOT NULL ORDER BY exam_date ASC LIMIT 1").fetchone(); conn.close()
    if not r: return None
    days = (datetime.strptime(r['exam_date'], "%Y-%m-%d").date() - datetime.now().date()).days
    return (r['name'], days) if days >= 0 else None

def get_study_streak(): return 1
def add_semester(name): conn = get_db_connection(); c = conn.cursor(); c.execute("INSERT INTO semesters (id, name) VALUES (?, ?)", (int(datetime.now().timestamp()), name)); conn.commit(); conn.close()
def add_subject(name, sem_id): conn = get_db_connection(); c = conn.cursor(); c.execute("INSERT INTO subjects (id, semester_id, name) VALUES (?, ?, ?)", (int(datetime.now().timestamp()), sem_id, name)); conn.commit(); conn.close()
def add_chapter(sub_id, name, youtube_url=None): 
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("INSERT INTO chapters (id, subject_id, name, youtube_url) VALUES (?, ?, ?, ?)", 
              (int(datetime.now().timestamp()), sub_id, name, youtube_url))
    conn.commit()
    conn.close()

def update_chapter_youtube(chapter_id, youtube_url):
    conn = get_db_connection()
    conn.execute("UPDATE chapters SET youtube_url = ? WHERE id = ?", (youtube_url, chapter_id))
    conn.commit()
    conn.close()
def delete_semester(sid): conn = get_db_connection(); conn.execute("DELETE FROM semesters WHERE id=?", (sid,)); conn.commit(); conn.close()
def delete_subject(sid): conn = get_db_connection(); conn.execute("DELETE FROM subjects WHERE id=?", (sid,)); conn.commit(); conn.close()
def delete_chapter(cid): conn = get_db_connection(); conn.execute("DELETE FROM chapters WHERE id=?", (cid,)); conn.commit(); conn.close()
def update_subject_notes(sid, n): conn = get_db_connection(); conn.execute("UPDATE subjects SET notes=? WHERE id=?", (n, sid)); conn.commit(); conn.close()
def toggle_video_status(cid, s): conn = get_db_connection(); conn.execute("UPDATE chapters SET video_completed=?, is_completed=(video_completed AND exercises_completed) WHERE id=?", (s, cid)); conn.commit(); conn.close()
def toggle_exercises_status(cid, s): conn = get_db_connection(); conn.execute("UPDATE chapters SET exercises_completed=?, is_completed=(video_completed AND exercises_completed) WHERE id=?", (s, cid)); conn.commit(); conn.close()
def toggle_chapter_status(cid, s): conn = get_db_connection(); conn.execute("UPDATE chapters SET is_completed=? WHERE id=?", (s, cid)); conn.commit(); conn.close()
def get_subject_notes(sub_id):
    conn = get_db_connection(); row = conn.execute("SELECT notes FROM subjects WHERE id=?", (sub_id,)).fetchone(); conn.close(); return row['notes'] if row else ""
def get_subject_progress(sub_id):
    chaps = get_chapters_by_subject(sub_id); total = len(chaps) * 2; done = sum((1 if c['video_completed'] else 0) + (1 if c['exercises_completed'] else 0) for c in chaps); return total, done
def get_next_task(sub_id):
    chaps = get_chapters_by_subject(sub_id)
    for c in sorted(chaps, key=lambda x: x['id']):
        for c in chaps:
            if not c['video_completed']: return {'chapter_id': c['id'], 'chapter_name': c['name'], 'type': 'Course'}
            if not c['exercises_completed']: return {'chapter_id': c['id'], 'chapter_name': c['name'], 'type': 'Exercises'}
def get_upcoming_deadlines(days_limit=3): return []
def get_detailed_stats(sid=None):
    conn = get_db_connection(); r = conn.execute('SELECT s.name, COALESCE(SUM(ss.duration_minutes), 0) as total_minutes, COUNT(ss.id) as session_count FROM subjects s LEFT JOIN study_sessions ss ON s.id = ss.subject_id WHERE s.semester_id = ? OR ? IS NULL GROUP BY s.id, s.name ORDER BY total_minutes DESC', (sid, sid)).fetchall(); conn.close(); return r
def get_semester_comparison_stats(): return []
def get_daily_stats(): return []
def get_weekly_stats(): return []
def update_subject_dates(sid, ed, td): conn = get_db_connection(); conn.execute("UPDATE subjects SET exam_date=? WHERE id=?", (ed, sid)); conn.commit(); conn.close()
def update_chapter_due_date(cid, dd): pass
def apply_template(template_data):
    for sem in template_data:
        add_semester(sem['name'])
        conn = get_db_connection(); sid = conn.execute("SELECT id FROM semesters ORDER BY id DESC LIMIT 1").fetchone()[0]; conn.close()
        for sub in sem['subjects']:
            add_subject(sub['name'], sid)
            conn = get_db_connection(); subid = conn.execute("SELECT id FROM subjects ORDER BY id DESC LIMIT 1").fetchone()[0]; conn.close()
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
