from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QListWidget, QListWidgetItem, 
    QLineEdit, QPushButton, QLabel, QComboBox, QSpinBox, QDoubleSpinBox, 
    QMessageBox, QCheckBox, QGroupBox, QSplitter, QInputDialog
)
from PyQt5.QtCore import Qt
from student_app.database import (
    add_subject, get_all_subjects, delete_subject, 
    add_chapter, get_chapters_by_subject, toggle_chapter_status, delete_chapter,
    add_semester, get_all_semesters, delete_semester
)

class StudyPlanner(QWidget):
    def __init__(self):
        super().__init__()
        self.selected_subject_id = None
        self.current_semester_id = None
        self.init_ui()

    def init_ui(self):
        main_layout = QVBoxLayout() # Changed to VBox to hold Top Bar + Splitter

        # --- Top Bar: Semesters ---
        top_bar = QHBoxLayout()
        top_bar.addWidget(QLabel("Current Semester:"))
        
        self.semester_combo = QComboBox()
        self.semester_combo.currentIndexChanged.connect(self.on_semester_changed)
        top_bar.addWidget(self.semester_combo)
        
        add_sem_btn = QPushButton("+ New Semester")
        add_sem_btn.clicked.connect(self.handle_add_semester)
        add_sem_btn.setFixedWidth(120)
        top_bar.addWidget(add_sem_btn)
        
        # Delete Semester Button
        del_sem_btn = QPushButton("Delete")
        del_sem_btn.setObjectName("dangerButton")
        del_sem_btn.setFixedWidth(80)
        del_sem_btn.clicked.connect(self.handle_delete_semester)
        top_bar.addWidget(del_sem_btn)
        
        main_layout.addLayout(top_bar)

        # --- Content Area (Splitter) ---
        content_layout = QHBoxLayout() # This was the old main_layout

        # --- Left Panel: Subjects ---
        left_panel = QGroupBox("Subjects")
        left_layout = QVBoxLayout()
        
        # Add Subject Form
        form_layout = QVBoxLayout()
        self.name_input = QLineEdit()
        self.name_input.setPlaceholderText("Subject Name")
        
        row1 = QHBoxLayout()
        self.type_input = QComboBox()
        self.type_input.addItems(["Type A (TD+Exam)", "Type B (TD+TP+Exam)", "Type C (Exam)"])
        self.coeff_input = QDoubleSpinBox()
        self.coeff_input.setRange(0, 20)
        self.coeff_input.setPrefix("Coeff: ")
        self.coeff_input.setValue(1)
        
        self.credit_input = QSpinBox()
        self.credit_input.setRange(0, 30)
        self.credit_input.setPrefix("Credits: ")
        self.credit_input.setValue(1)
        
        row1.addWidget(self.type_input)
        
        row2 = QHBoxLayout()
        row2.addWidget(self.coeff_input)
        row2.addWidget(self.credit_input)

        add_sub_btn = QPushButton("Add Subject")
        add_sub_btn.clicked.connect(self.handle_add_subject)

        form_layout.addWidget(self.name_input)
        form_layout.addLayout(row1)
        form_layout.addLayout(row2)
        form_layout.addWidget(add_sub_btn)
        
        left_layout.addLayout(form_layout)
        
        # Subjects List
        self.subject_list = QListWidget()
        self.subject_list.itemClicked.connect(self.on_subject_selected)
        left_layout.addWidget(self.subject_list)

        # Delete Button
        del_sub_btn = QPushButton("Delete Selected Subject")
        del_sub_btn.setObjectName("dangerButton")
        del_sub_btn.clicked.connect(self.handle_delete_subject)
        left_layout.addWidget(del_sub_btn)

        left_panel.setLayout(left_layout)

        # --- Right Panel: Chapters ---
        self.right_panel = QGroupBox("Chapters")
        right_layout = QVBoxLayout()
        
        self.chapter_input = QLineEdit()
        self.chapter_input.setPlaceholderText("New Chapter Name")
        add_chap_btn = QPushButton("Add Chapter")
        add_chap_btn.clicked.connect(self.handle_add_chapter)
        
        chap_form = QHBoxLayout()
        chap_form.addWidget(self.chapter_input)
        chap_form.addWidget(add_chap_btn)
        
        right_layout.addLayout(chap_form)
        
        self.chapter_list = QListWidget()
        self.chapter_list.itemChanged.connect(self.on_chapter_toggled)
        right_layout.addWidget(self.chapter_list)
        
        # Delete Chapter Button
        del_chap_btn = QPushButton("Delete Selected Chapter")
        del_chap_btn.setObjectName("dangerButton") # Style as danger if supported
        del_chap_btn.clicked.connect(self.handle_delete_chapter)
        right_layout.addWidget(del_chap_btn)
        
        self.right_panel.setLayout(right_layout)
        self.right_panel.setEnabled(False) # Disabled until subject selected

        # Splitter
        splitter = QSplitter(Qt.Horizontal)
        splitter.addWidget(left_panel)
        splitter.addWidget(self.right_panel)
        splitter.setStretchFactor(0, 1)
        splitter.setStretchFactor(1, 2)

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
        self.chapter_list.clear()

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
        if not self.current_semester_id:
            return

        subjects = get_all_subjects(self.current_semester_id)
        for sub in subjects:
            item = QListWidgetItem(f"{sub['name']} (C: {sub['coefficient']})")
            item.setData(Qt.UserRole, sub['id'])
            self.subject_list.addItem(item)

    def handle_add_subject(self):
        name = self.name_input.text().strip()
        if not name:
            return
            
        if not self.current_semester_id:
            QMessageBox.warning(self, "Error", "Please select or create a semester first.")
            return
        
        m_type = self.type_input.currentIndex()
        coeff = self.coeff_input.value()
        credits = self.credit_input.value()
        
        add_subject(name, m_type, coeff, credits, self.current_semester_id)
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
            self.chapter_list.clear()
            self.selected_subject_id = None

    def on_subject_selected(self, item):
        self.selected_subject_id = item.data(Qt.UserRole)
        self.right_panel.setEnabled(True)
        self.right_panel.setTitle(f"Chapters for: {item.text().split(' (')[0]}")
        self.refresh_chapters()

    def refresh_chapters(self):
        self.chapter_list.clear()
        if self.selected_subject_id is None:
            return
            
        chapters = get_chapters_by_subject(self.selected_subject_id)
        for chap in chapters:
            item = QListWidgetItem(chap['name'])
            item.setData(Qt.UserRole, chap['id'])
            item.setFlags(item.flags() | Qt.ItemIsUserCheckable)
            state = Qt.Checked if chap['is_completed'] else Qt.Unchecked
            item.setCheckState(state)
            self.chapter_list.addItem(item)

    def handle_add_chapter(self):
        name = self.chapter_input.text().strip()
        if not name or self.selected_subject_id is None:
            return
            
        add_chapter(self.selected_subject_id, name)
        self.chapter_input.clear()
        self.refresh_chapters()

    def on_chapter_toggled(self, item):
        chap_id = item.data(Qt.UserRole)
        status = 1 if item.checkState() == Qt.Checked else 0
        toggle_chapter_status(chap_id, status)

    def handle_delete_chapter(self):
        curr_item = self.chapter_list.currentItem()
        if not curr_item:
            return
            
        ret = QMessageBox.question(self, "Confirm Delete", 
                                 f"Delete chapter '{curr_item.text()}'?",
                                 QMessageBox.Yes | QMessageBox.No)
        
        if ret == QMessageBox.Yes:
            chap_id = curr_item.data(Qt.UserRole)
            delete_chapter(chap_id)
            self.refresh_chapters()
