import sqlite3
import os

DB_NAME = "student_data.db"

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
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
            module_type INTEGER NOT NULL, 
            coefficient REAL NOT NULL,
            credits INTEGER NOT NULL,
            td_score REAL DEFAULT 0,
            tp_score REAL DEFAULT 0,
            exam_score REAL DEFAULT 0,
            FOREIGN KEY (semester_id) REFERENCES semesters (id) ON DELETE CASCADE
        )
    ''')
    
    # Migration: Check if semester_id exists in subjects, if not add it
    try:
        cursor.execute('SELECT semester_id FROM subjects LIMIT 1')
    except sqlite3.OperationalError:
        # Column missing, add it
        cursor.execute('ALTER TABLE subjects ADD COLUMN semester_id INTEGER REFERENCES semesters(id) ON DELETE CASCADE')
    
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
def add_subject(name, module_type, coefficient, credits, semester_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO subjects (name, module_type, coefficient, credits, semester_id) VALUES (?, ?, ?, ?, ?)',
                   (name, module_type, coefficient, credits, semester_id))
    subject_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return subject_id

def get_all_subjects(semester_id=None):
    conn = get_db_connection()
    if semester_id:
        subjects = conn.execute('SELECT * FROM subjects WHERE semester_id = ?', (semester_id,)).fetchall()
    else:
        subjects = conn.execute('SELECT * FROM subjects').fetchall()
    conn.close()
    return subjects

def update_subject_scores(subject_id, td, tp, exam):
    conn = get_db_connection()
    conn.execute('UPDATE subjects SET td_score = ?, tp_score = ?, exam_score = ? WHERE id = ?',
                 (td, tp, exam, subject_id))
    conn.commit()
    conn.close()

def delete_subject(subject_id):
    conn = get_db_connection()
    conn.execute('DELETE FROM subjects WHERE id = ?', (subject_id,))
    conn.commit()
    conn.close()

def add_chapter(subject_id, name):
    conn = get_db_connection()
    conn.execute('INSERT INTO chapters (subject_id, name) VALUES (?, ?)', (subject_id, name))
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
