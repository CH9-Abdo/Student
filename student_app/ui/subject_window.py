from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QListWidget, QListWidgetItem, 
    QLineEdit, QPushButton, QLabel, QCheckBox, QGroupBox, QProgressBar,
    QMainWindow, QScrollArea, QFrame, QTextEdit, QTabWidget
)
from PyQt5.QtCore import Qt, pyqtSignal, QTimer
from student_app.database import (
    add_chapter, get_chapters_by_subject, toggle_video_status, 
    toggle_exercises_status, delete_chapter, get_subject_progress,
    update_subject_notes, get_subject_notes
)

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
        self.setWindowTitle(f"Subject: {subject_name}")
        self.resize(600, 500)
        self.init_ui()

    def init_ui(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)

        # Header with Subject Name and Progress
        header_layout = QVBoxLayout()
        title_label = QLabel(self.subject_name)
        title_label.setStyleSheet("font-size: 24px; font-weight: bold; color: #2c3e50;")
        header_layout.addWidget(title_label)
        
        self.progress_bar = QProgressBar()
        self.progress_bar.setFixedHeight(20)
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
        self.chapter_input.setPlaceholderText("New Chapter Name...")
        self.chapter_input.returnPressed.connect(self.handle_add_chapter)
        
        add_btn = QPushButton("Add Chapter")
        add_btn.clicked.connect(self.handle_add_chapter)
        
        add_chap_layout.addWidget(self.chapter_input)
        add_chap_layout.addWidget(add_btn)
        chap_layout.addLayout(add_chap_layout)

        # Chapters List (Scroll Area)
        self.scroll = QScrollArea()
        self.scroll.setWidgetResizable(True)
        self.chapter_container = QWidget()
        self.chapter_layout = QVBoxLayout(self.chapter_container)
        self.chapter_layout.setAlignment(Qt.AlignTop)
        self.scroll.setWidget(self.chapter_container)
        chap_layout.addWidget(self.scroll)
        
        self.tabs.addTab(chapters_tab, "Chapters")

        # --- Tab 2: Notes ---
        notes_tab = QWidget()
        notes_layout = QVBoxLayout(notes_tab)
        
        self.notes_edit = QTextEdit()
        self.notes_edit.setPlaceholderText("Write your notes, formulas, or reminders here...")
        notes_layout.addWidget(self.notes_edit)
        
        save_notes_btn = QPushButton("Save Notes")
        save_notes_btn.clicked.connect(self.handle_save_notes)
        notes_layout.addWidget(save_notes_btn)
        
        self.tabs.addTab(notes_tab, "Notes")
        
        main_layout.addWidget(self.tabs)

        self.refresh_data()

    def refresh_data(self):
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
        self.sender().setText("Saved!")
        QTimer.singleShot(2000, lambda: self.sender().setText("Save Notes")) # Reset text after 2s

    def handle_add_chapter(self):
        name = self.chapter_input.text().strip()
        if name:
            add_chapter(self.subject_id, name)
            self.chapter_input.clear()
            self.refresh_data()
