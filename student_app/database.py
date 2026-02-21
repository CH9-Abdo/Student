import sqlite3
import os
from student_app.settings import get_db_path

def get_db_connection():
    db_path = get_db_path()
    # Ensure directory exists if it's a new path
    db_dir = os.path.dirname(db_path)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir)
        
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create Semesters table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS semesters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        )
    ''')

    # Create Subjects table (with semester_id support check)
    # Note: SQLite ALTER TABLE is limited, so we check if column exists for migration
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            semester_id INTEGER,
            name TEXT NOT NULL,
            exam_date DATE,
            test_date DATE,
            FOREIGN KEY (semester_id) REFERENCES semesters (id) ON DELETE CASCADE
        )
    ''')
    
    # Migration: Check if semester_id exists in subjects, if not add it
    try:
        cursor.execute('SELECT semester_id FROM subjects LIMIT 1')
    except sqlite3.OperationalError:
        # Column missing, add it
        cursor.execute('ALTER TABLE subjects ADD COLUMN semester_id INTEGER REFERENCES semesters(id) ON DELETE CASCADE')
        
    # Migration: Check if exam_date exists in subjects, if not add it
    try:
        cursor.execute('SELECT exam_date FROM subjects LIMIT 1')
    except sqlite3.OperationalError:
        cursor.execute('ALTER TABLE subjects ADD COLUMN exam_date DATE')

    # Migration: Check if test_date exists in subjects, if not add it
    try:
        cursor.execute('SELECT test_date FROM subjects LIMIT 1')
    except sqlite3.OperationalError:
        cursor.execute('ALTER TABLE subjects ADD COLUMN test_date DATE')

    # Migration: Check if notes exists in subjects, if not add it
    try:
        cursor.execute('SELECT notes FROM subjects LIMIT 1')
    except sqlite3.OperationalError:
        cursor.execute('ALTER TABLE subjects ADD COLUMN notes TEXT')
    
    # Create Chapters table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chapters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            video_completed BOOLEAN DEFAULT 0,
            exercises_completed BOOLEAN DEFAULT 0,
            is_completed BOOLEAN DEFAULT 0,
            FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE
        )
    ''')
    
    # Migration for chapters table
    try:
        cursor.execute('SELECT video_completed FROM chapters LIMIT 1')
    except sqlite3.OperationalError:
        cursor.execute('ALTER TABLE chapters ADD COLUMN video_completed BOOLEAN DEFAULT 0')
        cursor.execute('ALTER TABLE chapters ADD COLUMN exercises_completed BOOLEAN DEFAULT 0')
    
    try:
        cursor.execute('SELECT due_date FROM chapters LIMIT 1')
    except sqlite3.OperationalError:
        cursor.execute('ALTER TABLE chapters ADD COLUMN due_date DATE')

    # Create User Profile table (Gamification)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_profile (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            xp INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            total_sessions INTEGER DEFAULT 0
        )
    ''')

    # Ensure at least one user profile exists
    cursor.execute('SELECT count(*) FROM user_profile')
    if cursor.fetchone()[0] == 0:
        cursor.execute('INSERT INTO user_profile (xp, level, total_sessions) VALUES (0, 1, 0)')

    # Create Study Sessions Log table (Analytics)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS study_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_id INTEGER,
            duration_minutes INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE
        )
    ''')

    # Data Migration: Ensure at least one semester exists if there are subjects
    cursor.execute('SELECT count(*) FROM semesters')
    sem_count = cursor.fetchone()[0]
    
    if sem_count == 0:
        cursor.execute('INSERT INTO semesters (name) VALUES (?)', ("Semester 1",))
        default_sem_id = cursor.lastrowid
        # Assign all orphaned subjects to this semester
        cursor.execute('UPDATE subjects SET semester_id = ? WHERE semester_id IS NULL', (default_sem_id,))
    
    conn.commit()
    conn.close()

def reset_all_data():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM study_sessions')
    cursor.execute('DELETE FROM chapters')
    cursor.execute('DELETE FROM subjects')
    cursor.execute('DELETE FROM semesters')
    cursor.execute('UPDATE user_profile SET xp = 0, level = 1, total_sessions = 0')
    conn.commit()
    conn.close()

# --- User Profile Functions ---
def get_user_profile():
    conn = get_db_connection()
    profile = conn.execute('SELECT * FROM user_profile LIMIT 1').fetchone()
    conn.close()
    return profile

def add_xp(amount, session_increment=0):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get current stats
    cursor.execute('SELECT xp, level, total_sessions FROM user_profile LIMIT 1')
    row = cursor.fetchone()
    current_xp = row['xp'] + amount
    current_level = row['level']
    current_sessions = row['total_sessions'] + session_increment
    
    # Simple Leveling Logic: Level up every 500 XP
    new_level = 1 + (current_xp // 500)
    
    cursor.execute('UPDATE user_profile SET xp = ?, level = ?, total_sessions = ?', 
                   (current_xp, new_level, current_sessions))
    conn.commit()
    conn.close()
    return new_level > current_level, new_level # Returns (leveled_up, new_level)

def log_study_session(subject_id, duration_minutes):
    conn = get_db_connection()
    conn.execute('INSERT INTO study_sessions (subject_id, duration_minutes) VALUES (?, ?)', 
                 (subject_id, duration_minutes))
    conn.commit()
    conn.close()

def get_detailed_stats(semester_id=None):
    conn = get_db_connection()
    # Get total minutes and session count per subject, filtered by semester
    query = '''
        SELECT 
            s.name, 
            COALESCE(SUM(ss.duration_minutes), 0) as total_minutes,
            COUNT(ss.id) as session_count
        FROM subjects s
        LEFT JOIN study_sessions ss ON s.id = ss.subject_id
        WHERE s.semester_id = ? OR ? IS NULL
        GROUP BY s.id, s.name
        ORDER BY total_minutes DESC
    '''
    stats = conn.execute(query, (semester_id, semester_id)).fetchall()
    conn.close()
    return stats

def get_semester_comparison_stats():
    conn = get_db_connection()
    query = '''
        SELECT 
            sem.name, 
            COALESCE(SUM(ss.duration_minutes), 0) as total_minutes
        FROM semesters sem
        LEFT JOIN subjects s ON sem.id = s.semester_id
        LEFT JOIN study_sessions ss ON s.id = ss.subject_id
        GROUP BY sem.id, sem.name
    '''
    stats = conn.execute(query).fetchall()
    conn.close()
    return stats

def get_daily_stats():
    conn = get_db_connection()
    # Get last 7 days of activity
    query = '''
        SELECT 
            strftime('%Y-%m-%d', timestamp) as day,
            SUM(duration_minutes) as total_minutes
        FROM study_sessions
        WHERE timestamp >= date('now', '-7 days')
        GROUP BY day
        ORDER BY day ASC
    '''
    stats = conn.execute(query).fetchall()
    conn.close()
    return stats

def get_weekly_stats():
    conn = get_db_connection()
    # Get last 8 weeks of activity
    query = '''
        SELECT 
            strftime('%W', timestamp) as week_num,
            strftime('%Y', timestamp) as year,
            SUM(duration_minutes) as total_minutes
        FROM study_sessions
        WHERE timestamp >= date('now', '-8 weeks')
        GROUP BY year, week_num
        ORDER BY year ASC, week_num ASC
    '''
    stats = conn.execute(query).fetchall()
    conn.close()
    
    # Format labels as "Week X"
    formatted_stats = []
    for s in stats:
        formatted_stats.append({
            'label': f"W{s['week_num']}",
            'total_minutes': s['total_minutes']
        })
        
    return formatted_stats

# --- Semester Functions ---
def add_semester(name):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO semesters (name) VALUES (?)', (name,))
    sem_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return sem_id

def get_all_semesters():
    conn = get_db_connection()
    semesters = conn.execute('SELECT * FROM semesters').fetchall()
    conn.close()
    return semesters

def delete_semester(sem_id):
    conn = get_db_connection()
    conn.execute('DELETE FROM semesters WHERE id = ?', (sem_id,)) # Cascade delete handles subjects
    conn.commit()
    conn.close()

# --- Updated Subject Functions ---
def add_subject(name, semester_id, exam_date=None, test_date=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO subjects (name, semester_id, exam_date, test_date) VALUES (?, ?, ?, ?)',
                   (name, semester_id, exam_date, test_date))
    subject_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return subject_id

def update_subject_dates(subject_id, exam_date, test_date):
    conn = get_db_connection()
    conn.execute('UPDATE subjects SET exam_date = ?, test_date = ? WHERE id = ?',
                 (exam_date, test_date, subject_id))
    conn.commit()
    conn.close()

def get_all_subjects(semester_id=None):
    conn = get_db_connection()
    if semester_id:
        subjects = conn.execute('SELECT * FROM subjects WHERE semester_id = ?', (semester_id,)).fetchall()
    else:
        subjects = conn.execute('SELECT * FROM subjects').fetchall()
    conn.close()
    return subjects

def update_subject_notes(subject_id, notes):
    conn = get_db_connection()
    conn.execute('UPDATE subjects SET notes = ? WHERE id = ?', (notes, subject_id))
    conn.commit()
    conn.close()

def get_subject_notes(subject_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT notes FROM subjects WHERE id = ?', (subject_id,))
    result = cursor.fetchone()
    conn.close()
    return result['notes'] if result else ""

def delete_subject(subject_id):
    conn = get_db_connection()
    conn.execute('DELETE FROM subjects WHERE id = ?', (subject_id,))
    conn.commit()
    conn.close()

def add_chapter(subject_id, name, due_date=None):
    conn = get_db_connection()
    conn.execute('INSERT INTO chapters (subject_id, name, due_date) VALUES (?, ?, ?)', (subject_id, name, due_date))
    conn.commit()
    conn.close()

def get_chapters_by_subject(subject_id):
    conn = get_db_connection()
    chapters = conn.execute('SELECT * FROM chapters WHERE subject_id = ?', (subject_id,)).fetchall()
    conn.close()
    return chapters

def toggle_chapter_status(chapter_id, status):
    conn = get_db_connection()
    conn.execute('UPDATE chapters SET is_completed = ? WHERE id = ?', (status, chapter_id))
    conn.commit()
    conn.close()

def toggle_video_status(chapter_id, status):
    conn = get_db_connection()
    conn.execute('UPDATE chapters SET video_completed = ? WHERE id = ?', (status, chapter_id))
    # Automatically complete chapter if both are done
    cursor = conn.cursor()
    cursor.execute('SELECT exercises_completed FROM chapters WHERE id = ?', (chapter_id,))
    ex_done = cursor.fetchone()[0]
    is_done = 1 if status and ex_done else 0
    conn.execute('UPDATE chapters SET is_completed = ? WHERE id = ?', (is_done, chapter_id))
    conn.commit()
    conn.close()

def toggle_exercises_status(chapter_id, status):
    conn = get_db_connection()
    conn.execute('UPDATE chapters SET exercises_completed = ? WHERE id = ?', (status, chapter_id))
    # Automatically complete chapter if both are done
    cursor = conn.cursor()
    cursor.execute('SELECT video_completed FROM chapters WHERE id = ?', (chapter_id,))
    vid_done = cursor.fetchone()[0]
    is_done = 1 if status and vid_done else 0
    conn.execute('UPDATE chapters SET is_completed = ? WHERE id = ?', (is_done, chapter_id))
    conn.commit()
    conn.close()

def delete_chapter(chapter_id):
    conn = get_db_connection()
    conn.execute('DELETE FROM chapters WHERE id = ?', (chapter_id,))
    conn.commit()
    conn.close()

def update_chapter_due_date(chapter_id, due_date):
    conn = get_db_connection()
    conn.execute('UPDATE chapters SET due_date = ? WHERE id = ?', (due_date, chapter_id))
    conn.commit()
    conn.close()

def get_todo_chapters():
    conn = get_db_connection()
    # Join with subjects to get subject name
    query = '''
        SELECT c.id, c.name as chapter_name, s.name as subject_name, c.is_completed, c.video_completed, c.exercises_completed
        FROM chapters c
        JOIN subjects s ON c.subject_id = s.id
        WHERE c.is_completed = 0
    '''
    todos = conn.execute(query).fetchall()
    conn.close()
    return todos

def get_subject_progress(subject_id):
    conn = get_db_connection()
    total = conn.execute('SELECT COUNT(*) FROM chapters WHERE subject_id = ?', (subject_id,)).fetchone()[0]
    # We consider a chapter complete if is_completed = 1 (both video and exercises)
    # Or maybe we count subtasks? User said "progression bar for every subject".
    # Let's count subtasks: each chapter has 2 subtasks.
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM chapters WHERE subject_id = ?', (subject_id,))
    total_chapters = cursor.fetchone()[0]
    
    cursor.execute('SELECT SUM(video_completed + exercises_completed) FROM chapters WHERE subject_id = ?', (subject_id,))
    completed_subtasks = cursor.fetchone()[0] or 0
    
    total_subtasks = total_chapters * 2
    
    conn.close()
    return total_subtasks, completed_subtasks

def get_progress_stats():
    conn = get_db_connection()
    # Total subtasks across all chapters
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM chapters')
    total_chapters = cursor.fetchone()[0]
    total_subtasks = total_chapters * 2
    
    cursor.execute('SELECT SUM(video_completed + exercises_completed) FROM chapters')
    completed_subtasks = cursor.fetchone()[0] or 0
    
    conn.close()
    return total_subtasks, completed_subtasks

def get_next_task(subject_id):
    """
    Returns the next actionable task for a subject.
    Prioritizes the first chapter that isn't complete.
    Within a chapter, prioritizes Video then Exercises.
    """
    conn = get_db_connection()
    # Order by ID to ensure we tackle chapters in order
    chapters = conn.execute('SELECT * FROM chapters WHERE subject_id = ? ORDER BY id ASC', (subject_id,)).fetchall()
    conn.close()
    
    for chap in chapters:
        if not chap['video_completed']:
            return {'chapter_id': chap['id'], 'chapter_name': chap['name'], 'type': 'Video', 'completed': False}
        if not chap['exercises_completed']:
            return {'chapter_id': chap['id'], 'chapter_name': chap['name'], 'type': 'Exercises', 'completed': False}
            
    return None

def get_next_exam_info():
    """
    Returns (subject_name, days_remaining) for the soonest upcoming exam.
    """
    from datetime import datetime
    conn = get_db_connection()
    subjects = conn.execute('SELECT name, exam_date FROM subjects WHERE exam_date IS NOT NULL').fetchall()
    conn.close()
    
    today = datetime.now().date()
    next_exam = None
    min_days = 999
    
    for sub in subjects:
        try:
            edate = datetime.strptime(sub['exam_date'], "%Y-%m-%d").date()
            days = (edate - today).days
            if 0 <= days < min_days:
                min_days = days
                next_exam = (sub['name'], days)
        except (ValueError, TypeError):
            continue
            
    return next_exam

def get_study_streak():
    """
    Calculates the current study streak in days.
    """
    from datetime import datetime, timedelta
    conn = get_db_connection()
    # Get all unique dates where study sessions occurred, sorted descending
    query = "SELECT DISTINCT date(timestamp) as study_date FROM study_sessions ORDER BY study_date DESC"
    rows = conn.execute(query).fetchall()
    conn.close()

    if not rows:
        return 0

    today = datetime.now().date()
    yesterday = today - timedelta(days=1)
    
    dates = [datetime.strptime(row['study_date'], "%Y-%m-%d").date() for row in rows]
    
    # If the latest study wasn't today or yesterday, the streak is broken
    if dates[0] < yesterday:
        return 0
    
    streak = 1
    for i in range(len(dates) - 1):
        if (dates[i] - dates[i+1]).days == 1:
            streak += 1
        else:
            break
            
    return streak

def get_upcoming_deadlines(days_limit=3):
    """
    Returns upcoming exams and chapter due dates within the next X days.
    """
    from datetime import datetime, timedelta
    conn = get_db_connection()
    today = datetime.now().date()
    limit_date = today + timedelta(days=days_limit)
    
    deadlines = []
    
    # Exams
    exams = conn.execute('SELECT name, exam_date FROM subjects WHERE exam_date IS NOT NULL').fetchall()
    for e in exams:
        try:
            d = datetime.strptime(e['exam_date'], "%Y-%m-%d").date()
            if today <= d <= limit_date:
                deadlines.append(f"Exam: {e['name']} on {e['exam_date']}")
        except: continue
        
    # Chapters
    chapters = conn.execute('''
        SELECT c.name as chap_name, s.name as sub_name, c.due_date 
        FROM chapters c 
        JOIN subjects s ON c.subject_id = s.id 
        WHERE c.due_date IS NOT NULL AND c.is_completed = 0
    ''').fetchall()
    for c in chapters:
        try:
            d = datetime.strptime(c['due_date'], "%Y-%m-%d").date()
            if today <= d <= limit_date:
                deadlines.append(f"Chapter: {c['chap_name']} ({c['sub_name']}) due {c['due_date']}")
        except: continue
        
    conn.close()
    return deadlines
