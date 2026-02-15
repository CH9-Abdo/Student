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
    get_all_subjects
)
from student_app.settings import get_language
from student_app.ui.translations import TRANSLATIONS

class ChapterWidget(QFrame):
    status_changed = pyqtSignal()

    def __init__(self, chapter):
        super().__init__()
        self.chapter_id = chapter['id']
        self.setFrameShape(QFrame.StyledPanel)
        self.init_ui(chapter)

    def init_ui(self, chapter):
        layout = QHBoxLayout()
        
        self.name_label = QLabel(chapter['name'])
        self.name_label.setStyleSheet("font-weight: bold; font-size: 14px;")
        layout.addWidget(self.name_label, 2)
        
        self.video_check = QCheckBox("Course")
        self.video_check.setChecked(bool(chapter['video_completed']))
        self.video_check.stateChanged.connect(self.on_video_toggled)
        layout.addWidget(self.video_check, 1)
        
        self.exercises_check = QCheckBox("Exercises")
        self.exercises_check.setChecked(bool(chapter['exercises_completed']))
        self.exercises_check.stateChanged.connect(self.on_exercises_toggled)
        layout.addWidget(self.exercises_check, 1)
        
        self.delete_btn = QPushButton("×")
        self.delete_btn.setFixedSize(30, 30)
        self.delete_btn.setObjectName("dangerButton")
        self.delete_btn.clicked.connect(self.on_delete)
        layout.addWidget(self.delete_btn)
        
        self.setLayout(layout)

    def on_video_toggled(self, state):
        status = 1 if state == Qt.Checked else 0
        toggle_video_status(self.chapter_id, status)
        self.status_changed.emit()

    def on_exercises_toggled(self, state):
        status = 1 if state == Qt.Checked else 0
        toggle_exercises_status(self.chapter_id, status)
        self.status_changed.emit()

    def on_delete(self):
        delete_chapter(self.chapter_id)
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
        add_chap_layout = QHBoxLayout()
        self.chapter_input = QLineEdit()
        self.chapter_input.setPlaceholderText(self.texts.get("add_chapter", "Add Chapter") + "...")
        self.chapter_input.returnPressed.connect(self.handle_add_chapter)
        
        add_btn = QPushButton(self.texts.get("add_chapter", "Add Chapter"))
        add_btn.clicked.connect(self.handle_add_chapter)
        
        add_chap_layout.addWidget(self.chapter_input)
        add_chap_layout.addWidget(add_btn)
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
        if subject:
            if subject['exam_date']:
                self.exam_date_edit.setDate(QDate.fromString(subject['exam_date'], "yyyy-MM-dd"))
            if subject['test_date']:
                self.test_date_edit.setDate(QDate.fromString(subject['test_date'], "yyyy-MM-dd"))

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
            chap_widget = ChapterWidget(chap)
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
        # Optional: Show a small "Saved" tooltip or message?
        self.sender().setText(self.texts.get("success", "Success"))
        QTimer.singleShot(2000, lambda: self.sender().setText(self.texts.get("save_notes", "Save Notes"))) # Reset text after 2s

    def handle_save_dates(self):
        exam_date = self.exam_date_edit.date().toString("yyyy-MM-dd")
        test_date = self.test_date_edit.date().toString("yyyy-MM-dd")
        update_subject_dates(self.subject_id, exam_date, test_date)
        
        self.save_dates_btn.setText(self.texts.get("success", "Success"))
        QTimer.singleShot(2000, lambda: self.save_dates_btn.setText(self.texts.get("save", "Save")))
        self.data_changed.emit()

    def handle_add_chapter(self):
        name = self.chapter_input.text().strip()
        if name:
            add_chapter(self.subject_id, name)
            self.chapter_input.clear()
            self.refresh_data()
