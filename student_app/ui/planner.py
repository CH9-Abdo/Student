from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QListWidget, QListWidgetItem, 
    QLineEdit, QPushButton, QLabel, QComboBox, QSpinBox, QDoubleSpinBox, 
    QMessageBox, QCheckBox, QGroupBox, QSplitter, QInputDialog, QProgressBar,
    QDateEdit, QTextEdit
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
        self.subject_windows = {} # Keep track of open windows
        self.init_ui()

    def init_ui(self):
        main_layout = QVBoxLayout() # Changed to VBox to hold Top Bar + Splitter
        if self.lang == "Arabic":
            self.setLayoutDirection(Qt.RightToLeft)

        # --- Top Bar: Semesters ---
        top_bar = QHBoxLayout()
        top_bar.addWidget(QLabel(self.texts["current_semester"] + ":"))
        
        self.semester_combo = QComboBox()
        self.semester_combo.currentIndexChanged.connect(self.on_semester_changed)
        top_bar.addWidget(self.semester_combo)
        
        add_sem_btn = QPushButton(self.texts["new_semester"])
        add_sem_btn.clicked.connect(self.handle_add_semester)
        add_sem_btn.setFixedWidth(120)
        top_bar.addWidget(add_sem_btn)
        
        # Delete Semester Button
        del_sem_btn = QPushButton(self.texts["delete"])
        del_sem_btn.setObjectName("dangerButton")
        del_sem_btn.setFixedWidth(80)
        del_sem_btn.clicked.connect(self.handle_delete_semester)
        top_bar.addWidget(del_sem_btn)
        
        main_layout.addLayout(top_bar)

        # --- Content Area (Splitter) ---
        content_layout = QHBoxLayout() # This was the old main_layout

        # --- Left Panel: Subjects ---
        left_panel = QGroupBox(self.texts["planner"])
        left_layout = QVBoxLayout()
        
        # Add Subject Form
        form_layout = QVBoxLayout()
        self.name_input = QLineEdit()
        self.name_input.setPlaceholderText(self.texts["subject_name"])
        
        # Exam Date Input
        self.exam_date_input = QDateEdit()
        self.exam_date_input.setCalendarPopup(True)
        self.exam_date_input.setDate(QDate.currentDate().addDays(30)) # Default to next month
        self.exam_date_input.setDisplayFormat("yyyy-MM-dd")
        
        row_date = QHBoxLayout()
        row_date.addWidget(QLabel(self.texts["exam_date"] + ":"))
        row_date.addWidget(self.exam_date_input)

        add_sub_btn = QPushButton(self.texts["add_subject"])
        add_sub_btn.clicked.connect(self.handle_add_subject)

        form_layout.addWidget(self.name_input)
        form_layout.addLayout(row_date)
        form_layout.addWidget(add_sub_btn)
        
        left_layout.addLayout(form_layout)
        
        # Subjects List
        self.subject_list = QListWidget()
        self.subject_list.itemClicked.connect(self.on_subject_selected)
        left_layout.addWidget(self.subject_list)

        # Delete Button
        del_sub_btn = QPushButton(self.texts["delete_subject"])
        del_sub_btn.setObjectName("dangerButton")
        del_sub_btn.clicked.connect(self.handle_delete_subject)
        left_layout.addWidget(del_sub_btn)

        left_panel.setLayout(left_layout)

        # --- Right Panel: Subject Details & Progress ---
        self.right_panel = QGroupBox(self.texts["subject_overview"])
        right_layout = QVBoxLayout()
        
        self.subject_title_label = QLabel(self.texts["subject_overview"])
        self.subject_title_label.setStyleSheet("font-size: 18px; font-weight: bold;")
        right_layout.addWidget(self.subject_title_label)
        
        self.subject_progress_bar = QProgressBar()
        self.subject_progress_bar.setFixedHeight(25)
        right_layout.addWidget(self.subject_progress_bar)
        
        self.open_subject_btn = QPushButton(self.texts["open_subject"])
        self.open_subject_btn.setObjectName("primaryButton")
        self.open_subject_btn.setFixedHeight(50)
        self.open_subject_btn.clicked.connect(self.handle_open_subject_window)
        right_layout.addWidget(self.open_subject_btn)

        # Chapters Section
        right_layout.addWidget(QLabel(self.texts["chapters"] + ":"))
        self.chapter_list = QListWidget()
        right_layout.addWidget(self.chapter_list)
        
        # Notes Section
        right_layout.addWidget(QLabel(self.texts["notes"] + ":"))
        self.notes_area = QTextEdit()
        right_layout.addWidget(self.notes_area)
        
        self.save_notes_btn = QPushButton(self.texts["save_notes"])
        self.save_notes_btn.clicked.connect(self.handle_save_notes)
        right_layout.addWidget(self.save_notes_btn)
        
        self.right_panel.setLayout(right_layout)
        self.right_panel.setEnabled(False) # Disabled until subject selected

        # Splitter
        splitter = QSplitter(Qt.Horizontal)
        splitter.addWidget(left_panel)
        splitter.addWidget(self.right_panel)
        splitter.setStretchFactor(0, 1)
        splitter.setStretchFactor(1, 1)

        content_layout.addWidget(splitter)
        main_layout.addLayout(content_layout)
        
        self.setLayout(main_layout)
        
        self.refresh_semesters() # Initial load

    def refresh_semesters(self):
        self.semester_combo.blockSignals(True)
        self.semester_combo.clear()
        semesters = get_all_semesters()
        
        for sem in semesters:
            self.semester_combo.addItem(sem['name'], sem['id'])
            
        self.semester_combo.blockSignals(False)
        
        if self.semester_combo.count() > 0:
            self.semester_combo.setCurrentIndex(0)
            self.on_semester_changed(0) # Trigger load
        else:
            self.subject_list.clear()
            self.current_semester_id = None

    def on_semester_changed(self, index):
        self.current_semester_id = self.semester_combo.itemData(index)
        self.refresh_subjects()
        self.right_panel.setEnabled(False)

    def handle_add_semester(self):
        text, ok = QInputDialog.getText(self, 'New Semester', 'Enter Semester Name:')
        if ok and text:
            add_semester(text)
            self.refresh_semesters()
            # Select the new one
            idx = self.semester_combo.count() - 1
            self.semester_combo.setCurrentIndex(idx)

    def handle_delete_semester(self):
        if self.semester_combo.count() == 0:
            return
            
        sem_name = self.semester_combo.currentText()
        sem_id = self.semester_combo.currentData()
        
        ret = QMessageBox.question(self, "Confirm Delete", 
                                 f"Delete semester '{sem_name}'?\n\nWarning: All subjects and chapters in this semester will be deleted!",
                                 QMessageBox.Yes | QMessageBox.No)
        
        if ret == QMessageBox.Yes:
            delete_semester(sem_id)
            self.refresh_semesters()

    def refresh_subjects(self):
        self.subject_list.clear()
        
        # Reset selection and right panel
        self.selected_subject_id = None
        self.right_panel.setEnabled(False)
        self.subject_title_label.setText("Select a subject to see progress")
        self.subject_progress_bar.setValue(0)
        self.chapter_list.clear()
        self.notes_area.clear()
        
        if not self.current_semester_id:
            return

        subjects = get_all_subjects(self.current_semester_id)
        for sub in subjects:
            item = QListWidgetItem(sub['name'])
            item.setData(Qt.UserRole, sub['id'])
            self.subject_list.addItem(item)

    def handle_add_subject(self):
        name = self.name_input.text().strip()
        if not name:
            return
            
        if not self.current_semester_id:
            QMessageBox.warning(self, "Error", "Please select or create a semester first.")
            return
        
        exam_date = self.exam_date_input.date().toString("yyyy-MM-dd")
        
        add_subject(name, self.current_semester_id, exam_date)
        self.name_input.clear()
        self.refresh_subjects()

    def handle_delete_subject(self):
        curr_item = self.subject_list.currentItem()
        if not curr_item:
            return
            
        ret = QMessageBox.question(self, "Confirm Delete", 
                                 "Delete this subject and all its chapters?",
                                 QMessageBox.Yes | QMessageBox.No)
        
        if ret == QMessageBox.Yes:
            sub_id = curr_item.data(Qt.UserRole)
            delete_subject(sub_id)
            self.refresh_subjects()
            self.right_panel.setEnabled(False)
            self.selected_subject_id = None

    def on_subject_selected(self, item):
        self.selected_subject_id = item.data(Qt.UserRole)
        self.selected_subject_name = item.text().split(' (')[0]
        self.right_panel.setEnabled(True)
        self.right_panel.setTitle(f"Overview: {self.selected_subject_name}")
        self.subject_title_label.setText(self.selected_subject_name)
        self.update_subject_progress()
        self.refresh_chapters()
        self.refresh_notes()

    def update_subject_progress(self):
        if self.selected_subject_id is None:
            return
        total, completed = get_subject_progress(self.selected_subject_id)
        if total > 0:
            self.subject_progress_bar.setValue(int((completed / total) * 100))
        else:
            self.subject_progress_bar.setValue(0)

    def handle_open_subject_window(self):
        if self.selected_subject_id is None:
            return
        
        # Check if window already open
        if self.selected_subject_id in self.subject_windows:
            self.subject_windows[self.selected_subject_id].show()
            self.subject_windows[self.selected_subject_id].raise_()
            self.subject_windows[self.selected_subject_id].activateWindow()
        else:
            win = SubjectWindow(self.selected_subject_id, self.selected_subject_name)
            win.data_changed.connect(self.refresh_all_progress)
            win.show()
            self.subject_windows[self.selected_subject_id] = win

    def refresh_chapters(self):
        self.chapter_list.clear()
        if not self.selected_subject_id:
            return
            
        chapters = get_chapters_by_subject(self.selected_subject_id)
        for chap in chapters:
            vid = "✓" if chap['video_completed'] else "✗"
            ex = "✓" if chap['exercises_completed'] else "✗"
            item = QListWidgetItem(f"{chap['name']} - Vid: {vid} | Ex: {ex}")
            self.chapter_list.addItem(item)

    def refresh_notes(self):
        self.notes_area.clear()
        if not self.selected_subject_id:
            return
            
        notes = get_subject_notes(self.selected_subject_id)
        self.notes_area.setText(notes)

    def handle_save_notes(self):
        if not self.selected_subject_id:
            return
            
        notes = self.notes_area.toPlainText()
        update_subject_notes(self.selected_subject_id, notes)
        QMessageBox.information(self, "Success", "Notes saved successfully!")

    def refresh_all_progress(self):
        if self.selected_subject_id:
            self.update_subject_progress()
            self.refresh_chapters()
            self.refresh_notes()
