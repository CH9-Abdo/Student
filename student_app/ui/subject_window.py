from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QListWidget, QListWidgetItem, 
    QLineEdit, QPushButton, QLabel, QCheckBox, QGroupBox, QProgressBar,
    QMainWindow, QScrollArea, QFrame, QTextEdit, QTabWidget, QDateEdit
)
from PyQt5.QtCore import Qt, pyqtSignal, QTimer, QDate
from student_app.database import (
    add_chapter, get_chapters_by_subject, toggle_video_status, 
    toggle_exercises_status, delete_chapter, get_subject_progress,
    update_subject_notes, get_subject_notes, update_subject_dates,
    get_all_subjects, update_chapter_due_date, update_chapter_youtube
)
from student_app.settings import get_language
from student_app.ui.translations import TRANSLATIONS

class ChapterWidget(QFrame):
    status_changed = pyqtSignal()

    def __init__(self, chapter, has_exercises=True):
        super().__init__()
        self.chapter_id = chapter['id']
        self.has_exercises = has_exercises
        self.setFrameShape(QFrame.StyledPanel)
        self.init_ui(chapter)

    def init_ui(self, chapter):
        layout = QHBoxLayout()
        
        self.name_label = QLabel(chapter['name'])
        self.name_label.setStyleSheet("font-weight: bold; font-size: 14px;")
        layout.addWidget(self.name_label, 2)

        self.due_date_edit = QDateEdit()
        self.due_date_edit.setCalendarPopup(True)
        # Handle due_date potential missing column gracefully
        try:
            if 'due_date' in chapter.keys() and chapter['due_date']:
                self.due_date_edit.setDate(QDate.fromString(chapter['due_date'], "yyyy-MM-dd"))
            else:
                self.due_date_edit.setDate(QDate.currentDate())
        except: 
            self.due_date_edit.setDate(QDate.currentDate())
            
        self.due_date_edit.dateChanged.connect(self.on_due_date_changed)
        layout.addWidget(self.due_date_edit, 1)
        
        from .translations import TRANSLATIONS
        lang = "English" # Should get current lang
        try:
            from .settings import get_current_lang
            lang = get_current_lang()
        except: pass
        texts = TRANSLATIONS.get(lang, TRANSLATIONS["English"])
        
        # Handle both dict and sqlite3.Row
        # chapters table: id(0), subject_id(1), name(2), video_completed(3), exercises_completed(4), is_completed(5), due_date(6), cloud_id(7), youtube_url(8)
        video_completed = 0
        exercises_completed = 0
        if isinstance(chapter, dict):
            video_completed = chapter.get('video_completed', 0)
            exercises_completed = chapter.get('exercises_completed', 0)
        else:
            # sqlite3.Row - video_completed is column index 3, exercises_completed is index 4
            video_completed = chapter[3] if len(chapter) > 3 else 0
            exercises_completed = chapter[4] if len(chapter) > 4 else 0
        
        self.video_check = QCheckBox(texts.get("course", "Course"))
        self.video_check.setChecked(bool(video_completed))
        self.video_check.stateChanged.connect(self.on_video_toggled)
        layout.addWidget(self.video_check, 1)
        
        if self.has_exercises:
            self.exercises_check = QCheckBox(texts.get("exercises", "Exercises"))
            self.exercises_check.setChecked(bool(exercises_completed))
            self.exercises_check.stateChanged.connect(self.on_exercises_toggled)
            layout.addWidget(self.exercises_check, 1)
        
        self.delete_btn = QPushButton("×")
        self.delete_btn.setFixedSize(30, 30)
        self.delete_btn.setObjectName("dangerButton")
        self.delete_btn.clicked.connect(self.on_delete)
        layout.addWidget(self.delete_btn)
        
        # YouTube edit button
        yt_url = None
        if isinstance(chapter, dict):
            yt_url = chapter.get('youtube_url')
        else:
            # sqlite3.Row - youtube_url is column index 8
            yt_url = chapter[8] if len(chapter) > 8 else None
        yt_icon = "📺" if yt_url else "📺"
        self.yt_btn = QPushButton(yt_icon)
        self.yt_btn.setFixedSize(30, 30)
        self.yt_btn.setToolTip("Edit YouTube URL")
        self.yt_btn.clicked.connect(self.on_edit_youtube)
        layout.addWidget(self.yt_btn)
        
        self.setLayout(layout)

    def on_video_toggled(self, state):
        status = 1 if state == Qt.Checked else 0
        toggle_video_status(self.chapter_id, status)
        self.status_changed.emit()

    def on_exercises_toggled(self, state):
        status = 1 if state == Qt.Checked else 0
        toggle_exercises_status(self.chapter_id, status)
        self.status_changed.emit()

    def on_due_date_changed(self, date):
        update_chapter_due_date(self.chapter_id, date.toString("yyyy-MM-dd"))
        self.status_changed.emit()

    def on_delete(self):
        delete_chapter(self.chapter_id)
        self.status_changed.emit()
    
    def on_edit_youtube(self):
        # Get current URL from chapter data
        from student_app.database import get_db_connection
        conn = get_db_connection()
        row = conn.execute("SELECT youtube_url FROM chapters WHERE id = ?", (self.chapter_id,)).fetchone()
        conn.close()
        current_url = row[0] if row and row[0] else ""
        
        # Simple dialog for URL
        from PyQt5.QtWidgets import QInputDialog, QLineEdit
        new_url, ok = QInputDialog.getText(self, "YouTube URL", "Enter YouTube URL:", QLineEdit.Normal, current_url)
        if ok and new_url is not None:
            url = new_url.strip() if new_url.strip() else None
            update_chapter_youtube(self.chapter_id, url)
            self.status_changed.emit()

class SubjectWindow(QMainWindow):
    data_changed = pyqtSignal()

    def __init__(self, subject_id, subject_name):
        super().__init__()
        self.subject_id = subject_id
        self.subject_name = subject_name
        self.lang = get_language()
        self.texts = TRANSLATIONS.get(self.lang, TRANSLATIONS["English"])
        self.setWindowTitle(f"{self.texts.get('subject_overview', 'Subject Overview')}: {subject_name}")
        self.resize(700, 600)
        self.init_ui()

    def init_ui(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(20, 20, 20, 20)
        main_layout.setSpacing(15)

        # Header with Subject Name and Progress
        header_layout = QVBoxLayout()
        title_label = QLabel(self.subject_name)
        title_label.setObjectName("h1")
        header_layout.addWidget(title_label)
        
        # Exam & Test Date Row
        date_layout = QHBoxLayout()
        
        # Exam Date
        exam_vbox = QVBoxLayout()
        exam_vbox.addWidget(QLabel(self.texts.get("exam_date", "Exam Date")))
        self.exam_date_edit = QDateEdit()
        self.exam_date_edit.setCalendarPopup(True)
        self.exam_date_edit.setDate(QDate.currentDate())
        exam_vbox.addWidget(self.exam_date_edit)
        date_layout.addLayout(exam_vbox)
        
        # Test Date
        test_vbox = QVBoxLayout()
        test_vbox.addWidget(QLabel(self.texts.get("test_date", "Test Date")))
        self.test_date_edit = QDateEdit()
        self.test_date_edit.setCalendarPopup(True)
        self.test_date_edit.setDate(QDate.currentDate())
        test_vbox.addWidget(self.test_date_edit)
        date_layout.addLayout(test_vbox)
        
        self.save_dates_btn = QPushButton(self.texts.get("save", "Save"))
        self.save_dates_btn.clicked.connect(self.handle_save_dates)
        date_layout.addWidget(self.save_dates_btn, alignment=Qt.AlignBottom)
        
        header_layout.addLayout(date_layout)
        
        self.progress_bar = QProgressBar()
        self.progress_bar.setFixedHeight(12)
        header_layout.addWidget(self.progress_bar)
        
        main_layout.addLayout(header_layout)

        # Tabs
        self.tabs = QTabWidget()
        
        # --- Tab 1: Chapters ---
        chapters_tab = QWidget()
        chap_layout = QVBoxLayout(chapters_tab)

        # Add Chapter Form
        add_chap_layout = QVBoxLayout()
        input_row = QHBoxLayout()
        self.chapter_input = QLineEdit()
        self.chapter_input.setPlaceholderText(self.texts.get("add_chapter", "Add Chapter") + "...")
        self.chapter_input.returnPressed.connect(self.handle_add_chapter)
        
        self.chapter_due_date_input = QDateEdit()
        self.chapter_due_date_input.setCalendarPopup(True)
        self.chapter_due_date_input.setDate(QDate.currentDate())
        
        add_btn = QPushButton(self.texts.get("add_chapter", "Add Chapter"))
        add_btn.clicked.connect(self.handle_add_chapter)
        
        input_row.addWidget(self.chapter_input)
        input_row.addWidget(self.chapter_due_date_input)
        input_row.addWidget(add_btn)
        add_chap_layout.addLayout(input_row)
        
        # YouTube URL row
        yt_row = QHBoxLayout()
        self.chapter_youtube_input = QLineEdit()
        self.chapter_youtube_input.setPlaceholderText("YouTube URL (optional)")
        yt_row.addWidget(self.chapter_youtube_input)
        yt_row.addStretch()
        add_chap_layout.addLayout(yt_row)
        
        chap_layout.addLayout(add_chap_layout)

        # Chapters List (Scroll Area)
        self.scroll = QScrollArea()
        self.scroll.setWidgetResizable(True)
        self.scroll.setFrameShape(QFrame.NoFrame)
        self.chapter_container = QWidget()
        self.chapter_layout = QVBoxLayout(self.chapter_container)
        self.chapter_layout.setAlignment(Qt.AlignTop)
        self.scroll.setWidget(self.chapter_container)
        chap_layout.addWidget(self.scroll)
        
        self.tabs.addTab(chapters_tab, self.texts.get("chapters", "Chapters"))

        # --- Tab 2: Notes ---
        notes_tab = QWidget()
        notes_layout = QVBoxLayout(notes_tab)
        
        self.notes_edit = QTextEdit()
        self.notes_edit.setPlaceholderText(self.texts.get("notes", "Notes") + "...")
        notes_layout.addWidget(self.notes_edit)
        
        save_notes_btn = QPushButton(self.texts.get("save_notes", "Save Notes"))
        save_notes_btn.clicked.connect(self.handle_save_notes)
        notes_layout.addWidget(save_notes_btn)
        
        self.tabs.addTab(notes_tab, self.texts.get("notes", "Notes"))
        
        main_layout.addWidget(self.tabs)

        self.refresh_data()

    def refresh_data(self):
        # Refresh Dates
        all_subjects = get_all_subjects()
        subject = next((s for s in all_subjects if s['id'] == self.subject_id), None)
        has_exercises = True
        
        if subject:
            if subject['exam_date']:
                self.exam_date_edit.setDate(QDate.fromString(subject['exam_date'], "yyyy-MM-dd"))
            if subject['test_date']:
                self.test_date_edit.setDate(QDate.fromString(subject['test_date'], "yyyy-MM-dd"))
            # Check for has_exercises column safely
            try: has_exercises = bool(subject['has_exercises'])
            except: pass

        # Refresh Progress
        total, completed = get_subject_progress(self.subject_id)
        if total > 0:
            self.progress_bar.setValue(int((completed / total) * 100))
        else:
            self.progress_bar.setValue(0)
            
        # Refresh Chapters
        # Clear current list
        for i in reversed(range(self.chapter_layout.count())): 
            self.chapter_layout.itemAt(i).widget().setParent(None)
            
        chapters = get_chapters_by_subject(self.subject_id)
        for chap in chapters:
            chap_widget = ChapterWidget(chap, has_exercises)
            chap_widget.status_changed.connect(self.refresh_data)
            self.chapter_layout.addWidget(chap_widget)
            
        # Refresh Notes (only if first load or explicitly requested, but simple is fine)
        saved_notes = get_subject_notes(self.subject_id)
        if self.notes_edit.toPlainText() != saved_notes:
             # Prevent overwriting user work if they are typing, but mostly this is called on init
             if not self.notes_edit.hasFocus():
                 self.notes_edit.setPlainText(saved_notes)
        
        self.data_changed.emit()

    def handle_save_notes(self):
        notes = self.notes_edit.toPlainText()
        update_subject_notes(self.subject_id, notes)
        
        btn = self.sender()
        if btn and hasattr(btn, "setText"):
            btn.setText(self.texts.get("success", "Success"))
            QTimer.singleShot(2000, lambda: btn.setText(self.texts.get("save_notes", "Save Notes")))
        
        self.data_changed.emit()

    def handle_save_dates(self):
        exam_date = self.exam_date_edit.date().toString("yyyy-MM-dd")
        test_date = self.test_date_edit.date().toString("yyyy-MM-dd")
        update_subject_dates(self.subject_id, exam_date, test_date)
        
        self.save_dates_btn.setText(self.texts.get("success", "Success"))
        QTimer.singleShot(2000, lambda: self.save_dates_btn.setText(self.texts.get("save", "Save")))
        self.data_changed.emit()

    def handle_add_chapter(self):
        name = self.chapter_input.text().strip()
        youtube_url = self.chapter_youtube_input.text().strip() or None
        if name:
            add_chapter(self.subject_id, name, youtube_url)
            self.chapter_input.clear()
            self.chapter_youtube_input.clear()
            self.refresh_data()
