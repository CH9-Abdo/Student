from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QTableWidget, QTableWidgetItem, 
    QPushButton, QLabel, QHBoxLayout, QMessageBox, QHeaderView, QAbstractItemView, QComboBox
)
from PyQt5.QtCore import Qt
from student_app.database import get_all_subjects, update_subject_scores, get_all_semesters

class GradeCalculator(QWidget):
    def __init__(self):
        super().__init__()
        self.current_semester_id = None
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout()
        
        # Header Row with Semester Selector
        header_layout = QHBoxLayout()
        header = QLabel("Semester Grade Calculator")
        header.setObjectName("headerLabel")
        header_layout.addWidget(header)
        
        header_layout.addStretch()
        
        self.semester_combo = QComboBox()
        self.semester_combo.setFixedWidth(200)
        self.semester_combo.currentIndexChanged.connect(self.on_semester_changed)
        header_layout.addWidget(QLabel("Select Semester:"))
        header_layout.addWidget(self.semester_combo)
        
        layout.addLayout(header_layout)

        # Table
        self.table = QTableWidget()
        self.table.setColumnCount(8)
        self.table.setHorizontalHeaderLabels([
            "ID", "Subject", "Type", "Coeff", "Credits", "TD", "TP", "Exam"
        ])
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        # Hide ID column
        self.table.setColumnHidden(0, True)
        layout.addWidget(self.table)

        # Buttons
        btn_layout = QHBoxLayout()
        self.calc_btn = QPushButton("Calculate & Save")
        self.calc_btn.clicked.connect(self.calculate_gpa)
        self.refresh_btn = QPushButton("Refresh Data")
        self.refresh_btn.clicked.connect(self.load_semesters) # Reload semesters triggers data load
        
        btn_layout.addStretch()
        btn_layout.addWidget(self.refresh_btn)
        btn_layout.addWidget(self.calc_btn)
        layout.addLayout(btn_layout)

        # Results Area
        self.result_label = QLabel("Semester Average: - | Credits Earned: -")
        self.result_label.setStyleSheet("font-size: 16px; font-weight: bold; color: #4CAF50; margin-top: 10px;")
        layout.addWidget(self.result_label)

        self.setLayout(layout)
        self.load_semesters()

    def load_semesters(self):
        self.semester_combo.blockSignals(True)
        self.semester_combo.clear()
        semesters = get_all_semesters()
        
        for sem in semesters:
            self.semester_combo.addItem(sem['name'], sem['id'])
            
        self.semester_combo.blockSignals(False)
        
        if self.semester_combo.count() > 0:
            self.semester_combo.setCurrentIndex(0)
            self.on_semester_changed(0)
        else:
            self.table.setRowCount(0)
            self.current_semester_id = None

    def on_semester_changed(self, index):
        self.current_semester_id = self.semester_combo.itemData(index)
        self.load_data()

    def load_data(self):
        self.table.setRowCount(0)
        if not self.current_semester_id:
            return
            
        subjects = get_all_subjects(self.current_semester_id)
        
        for row_idx, sub in enumerate(subjects):
            self.table.insertRow(row_idx)
            
            # Non-editable info
            self.table.setItem(row_idx, 0, QTableWidgetItem(str(sub['id'])))
            self.table.setItem(row_idx, 1, QTableWidgetItem(sub['name']))
            
            type_str = "A (TD+Exam)" if sub['module_type'] == 0 else "B (TD+TP+Exam)" if sub['module_type'] == 1 else "C (Exam)"
            self.table.setItem(row_idx, 2, QTableWidgetItem(type_str))
            
            self.table.setItem(row_idx, 3, QTableWidgetItem(str(sub['coefficient'])))
            self.table.setItem(row_idx, 4, QTableWidgetItem(str(sub['credits'])))
            
            # Editable scores
            td_item = QTableWidgetItem(str(sub['td_score']))
            tp_item = QTableWidgetItem(str(sub['tp_score']))
            exam_item = QTableWidgetItem(str(sub['exam_score']))
            
            # Disable inputs based on type
            if sub['module_type'] == 2: # Exam only
                td_item.setFlags(Qt.ItemIsEnabled)
                tp_item.setFlags(Qt.ItemIsEnabled)
            elif sub['module_type'] == 0: # TD + Exam
                tp_item.setFlags(Qt.ItemIsEnabled)
            
            self.table.setItem(row_idx, 5, td_item)
            self.table.setItem(row_idx, 6, tp_item)
            self.table.setItem(row_idx, 7, exam_item)

            # Make non-score columns read-only
            for col in range(1, 5):
                item = self.table.item(row_idx, col)
                item.setFlags(Qt.ItemIsEnabled | Qt.ItemIsSelectable)

    def calculate_gpa(self):
        total_weighted_score = 0
        total_coeff = 0
        earned_credits = 0
        
        row_count = self.table.rowCount()
        
        try:
            for row in range(row_count):
                sub_id = int(self.table.item(row, 0).text())
                coeff = float(self.table.item(row, 3).text())
                credits_val = int(self.table.item(row, 4).text())
                m_type_str = self.table.item(row, 2).text()
                
                td = float(self.table.item(row, 5).text())
                tp = float(self.table.item(row, 6).text())
                exam = float(self.table.item(row, 7).text())
                
                # Update DB
                update_subject_scores(sub_id, td, tp, exam)
                
                # Calculate Module Average
                module_avg = 0
                if "Type A" in m_type_str or "A (" in m_type_str:
                    module_avg = (0.4 * td) + (0.6 * exam)
                elif "Type B" in m_type_str or "B (" in m_type_str:
                    module_avg = (0.4 * ((td + tp) / 2)) + (0.6 * exam)
                else: # Type C
                    module_avg = exam
                
                total_weighted_score += module_avg * coeff
                total_coeff += coeff
                
                if module_avg >= 10:
                    earned_credits += credits_val
            
            if total_coeff > 0:
                semester_avg = total_weighted_score / total_coeff
                self.result_label.setText(f"Semester Average: {semester_avg:.2f} | Credits Earned: {earned_credits}")
                QMessageBox.information(self, "Success", "Grades saved and GPA calculated!")
            else:
                self.result_label.setText("Add subjects to calculate GPA")

        except ValueError:
            QMessageBox.warning(self, "Input Error", "Please ensure all grades are valid numbers.")
