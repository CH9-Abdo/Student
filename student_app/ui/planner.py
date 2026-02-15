from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QListWidget, QListWidgetItem, 
    QLineEdit, QPushButton, QLabel, QComboBox, QGroupBox, 
    QSplitter, QProgressBar, QDateEdit, QTextEdit, QScrollArea, QFrame
)
from PyQt5.QtCore import Qt, QDate
from student_app.database import (
    add_subject, get_all_subjects, delete_subject, 
    add_chapter, get_chapters_by_subject, toggle_chapter_status, delete_chapter,
    add_semester, get_all_semesters, delete_semester, get_subject_progress,
    get_subject_notes, update_subject_notes
)
from student_app.ui.subject_window import SubjectWindow
from student_app.settings import get_language
from student_app.ui.translations import TRANSLATIONS

class StudyPlanner(QWidget):
    def __init__(self):
        super().__init__()
        self.lang = get_language()
        self.texts = TRANSLATIONS.get(self.lang, TRANSLATIONS["English"])
        self.selected_subject_id = None
        self.current_semester_id = None
        self.subject_windows = {}
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(30, 30, 30, 30)
        layout.setSpacing(20)

        # Header
        header_layout = QHBoxLayout()
        header_layout.addWidget(QLabel(self.texts["planner"], objectName="h1"))
        header_layout.addStretch()
        
        self.sem_combo = QComboBox()
        self.sem_combo.setFixedWidth(200)
        self.sem_combo.currentIndexChanged.connect(self.on_semester_changed)
        header_layout.addWidget(self.sem_combo)
        
        add_sem_btn = QPushButton("+")
        add_sem_btn.setFixedWidth(40)
        add_sem_btn.clicked.connect(self.handle_add_semester)
        header_layout.addWidget(add_sem_btn)
        layout.addLayout(header_layout)

        # Main Splitter
        splitter = QSplitter(Qt.Horizontal)
        
        # Left Panel: Subject List
        left_widget = QWidget()
        left_layout = QVBoxLayout(left_widget)
        
        # Add Subject Area
        add_sub_card = QFrame()
        add_sub_card.setObjectName("card")
        add_sub_layout = QVBoxLayout(add_sub_card)
        
        self.name_input = QLineEdit()
        self.name_input.setPlaceholderText(self.texts["subject_name"])
        add_sub_layout.addWidget(self.name_input)
        
        date_row = QHBoxLayout()
        self.date_input = QDateEdit(QDate.currentDate().addDays(30))
        self.date_input.setCalendarPopup(True)
        date_row.addWidget(QLabel(self.texts["exam_date"]))
        date_row.addWidget(self.date_input)
        add_sub_layout.addLayout(date_row)
        
        add_btn = QPushButton(self.texts["add_subject"])
        add_btn.clicked.connect(self.handle_add_subject)
        add_sub_layout.addWidget(add_btn)
        
        left_layout.addWidget(add_sub_card)
        
        self.subject_list = QListWidget()
        self.subject_list.itemClicked.connect(self.on_subject_selected)
        left_layout.addWidget(self.subject_list)
        
        del_btn = QPushButton(self.texts["delete_subject"])
        del_btn.setObjectName("dangerButton")
        del_btn.clicked.connect(self.handle_delete_subject)
        left_layout.addWidget(del_btn)
        
        splitter.addWidget(left_widget)
        
        # Right Panel: Details
        self.right_panel = QWidget()
        right_layout = QVBoxLayout(self.right_panel)
        
        self.detail_card = QFrame()
        self.detail_card.setObjectName("card")
        detail_layout = QVBoxLayout(self.detail_card)
        
        self.title_label = QLabel(self.texts["subject_overview"], objectName="h2")
        detail_layout.addWidget(self.title_label)
        
        self.progress_bar = QProgressBar()
        detail_layout.addWidget(self.progress_bar)
        
        open_btn = QPushButton(self.texts["open_subject"], objectName="primaryButton")
        open_btn.clicked.connect(self.handle_open_subject_window)
        detail_layout.addWidget(open_btn)
        
        right_layout.addWidget(self.detail_card)
        
        # Chapters and Notes in Tabs or Scroll
        tabs_area = QScrollArea()
        tabs_area.setWidgetResizable(True)
        tabs_area.setStyleSheet("background: transparent; border: none;")
        
        tabs_widget = QWidget()
        tabs_layout = QVBoxLayout(tabs_widget)
        
        tabs_layout.addWidget(QLabel(self.texts["chapters"], objectName="h2"))
        self.chapter_list = QListWidget()
        tabs_layout.addWidget(self.chapter_list)
        
        tabs_layout.addWidget(QLabel(self.texts["notes"], objectName="h2"))
        self.notes_area = QTextEdit()
        tabs_layout.addWidget(self.notes_area)
        
        save_notes_btn = QPushButton(self.texts["save_notes"])
        save_notes_btn.clicked.connect(self.handle_save_notes)
        tabs_layout.addWidget(save_notes_btn)
        
        tabs_area.setWidget(tabs_widget)
        right_layout.addWidget(tabs_area)
        
        splitter.addWidget(self.right_panel)
        splitter.setStretchFactor(0, 1)
        splitter.setStretchFactor(1, 2)
        
        layout.addWidget(splitter)
        
        self.refresh_semesters()

    def refresh_semesters(self):
        self.sem_combo.blockSignals(True)
        self.sem_combo.clear()
        sems = get_all_semesters()
        for s in sems:
            self.sem_combo.addItem(s['name'], s['id'])
        self.sem_combo.blockSignals(False)
        
        if self.sem_combo.count() > 0:
            self.on_semester_changed(0)

    def on_semester_changed(self, index):
        self.current_semester_id = self.sem_combo.itemData(index)
        self.refresh_subjects()
        self.right_panel.setEnabled(False)

    def refresh_subjects(self):
        self.subject_list.clear()
        if not self.current_semester_id: return
        
        subjects = get_all_subjects(self.current_semester_id)
        for s in subjects:
            item = QListWidgetItem(s['name'])
            item.setData(Qt.UserRole, s['id'])
            self.subject_list.addItem(item)

    def on_subject_selected(self, item):
        self.selected_subject_id = item.data(Qt.UserRole)
        self.selected_name = item.text()
        self.right_panel.setEnabled(True)
        self.title_label.setText(self.selected_name)
        self.update_progress()
        self.refresh_chapters()
        self.refresh_notes()

    def update_progress(self):
        total, completed = get_subject_progress(self.selected_subject_id)
        perc = int((completed / total) * 100) if total > 0 else 0
        self.progress_bar.setValue(perc)

    def handle_add_subject(self):
        name = self.name_input.text().strip()
        if name and self.current_semester_id:
            date_str = self.date_input.date().toString("yyyy-MM-dd")
            add_subject(name, self.current_semester_id, date_str)
            self.name_input.clear()
            self.refresh_subjects()

    def handle_delete_subject(self):
        if self.selected_subject_id:
            delete_subject(self.selected_subject_id)
            self.selected_subject_id = None
            self.refresh_subjects()
            self.right_panel.setEnabled(False)

    def refresh_chapters(self):
        self.chapter_list.clear()
        chaps = get_chapters_by_subject(self.selected_subject_id)
        for c in chaps:
            vid = "🎥" if c['video_completed'] else "◯"
            ex = "✍️" if c['exercises_completed'] else "◯"
            self.chapter_list.addItem(f"{c['name']}  {vid} {ex}")

    def refresh_notes(self):
        self.notes_area.setText(get_subject_notes(self.selected_subject_id))

    def handle_save_notes(self):
        if self.selected_subject_id:
            update_subject_notes(self.selected_subject_id, self.notes_area.toPlainText())

    def handle_add_semester(self):
        # Using simple input dialog for now
        from PyQt5.QtWidgets import QInputDialog
        text, ok = QInputDialog.getText(self, "New Semester", "Name:")
        if ok and text:
            add_semester(text)
            self.refresh_semesters()

    def handle_open_subject_window(self):
        if not self.selected_subject_id: return
        if self.selected_subject_id in self.subject_windows:
            self.subject_windows[self.selected_subject_id].show()
        else:
            win = SubjectWindow(self.selected_subject_id, self.selected_name)
            win.data_changed.connect(self.on_subject_selected) # Re-trigger refresh
            self.subject_windows[self.selected_subject_id] = win
            win.show()