from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QProgressBar, QLabel, QListWidget, 
    QListWidgetItem, QHBoxLayout, QPushButton
)
from PyQt5.QtCore import Qt
from student_app.database import get_todo_chapters, get_progress_stats

class Dashboard(QWidget):
    def __init__(self):
        super().__init__()
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout()
        
        # Header
        header = QLabel("Study Dashboard")
        header.setObjectName("headerLabel")
        layout.addWidget(header)

        # Progress Section
        prog_layout = QVBoxLayout()
        self.stats_label = QLabel("Progress: 0/0 Chapters Completed")
        self.progress_bar = QProgressBar()
        self.progress_bar.setValue(0)
        self.progress_bar.setFixedHeight(30)
        
        prog_layout.addWidget(self.stats_label)
        prog_layout.addWidget(self.progress_bar)
        
        progress_group = QWidget()
        progress_group.setLayout(prog_layout)
        progress_group.setStyleSheet("background: #ffffff; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px;")
        layout.addWidget(progress_group)

        # To-Do Section
        layout.addSpacing(20)
        todo_header = QLabel("Up Next (To-Do List)")
        todo_header.setStyleSheet("font-size: 18px; font-weight: bold; color: #212529;")
        layout.addWidget(todo_header)
        
        self.todo_list = QListWidget()
        layout.addWidget(self.todo_list)
        
        # Refresh Button
        refresh_btn = QPushButton("Refresh Dashboard")
        refresh_btn.clicked.connect(self.refresh_data)
        layout.addWidget(refresh_btn)

        self.setLayout(layout)
        self.refresh_data()

    def refresh_data(self):
        # Update Stats & Progress
        total, completed = get_progress_stats()
        percentage = int((completed / total * 100)) if total > 0 else 0
        
        self.stats_label.setText(f"Overall Progress: {completed}/{total} Chapters Completed")
        self.progress_bar.setValue(percentage)

        # Update To-Do List
        self.todo_list.clear()
        todos = get_todo_chapters()
        
        if not todos:
            self.todo_list.addItem("🎉 No pending chapters! Great job!")
        else:
            for item in todos:
                # item: (id, chapter_name, subject_name, is_completed)
                display_text = f"[{item['subject_name']}] {item['chapter_name']}"
                list_item = QListWidgetItem(display_text)
                self.todo_list.addItem(list_item)
    
    def showEvent(self, event):
        self.refresh_data()
        super().showEvent(event)
