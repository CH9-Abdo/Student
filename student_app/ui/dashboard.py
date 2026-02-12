from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QProgressBar, QLabel, QListWidget, 
    QListWidgetItem, QHBoxLayout, QPushButton, QScrollArea, QFrame
)
from PyQt5.QtCore import Qt
from student_app.database import get_todo_chapters, get_progress_stats
from student_app.settings import get_language
from student_app.ui.translations import TRANSLATIONS

class Dashboard(QWidget):
    def __init__(self):
        super().__init__()
        self.lang = get_language()
        self.texts = TRANSLATIONS.get(self.lang, TRANSLATIONS["English"])
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout()
        if self.lang == "Arabic":
            layout.setAlignment(Qt.AlignRight)
            self.setLayoutDirection(Qt.RightToLeft)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(15)
        
        # Header
        header = QLabel(self.texts["dashboard"])
        header.setObjectName("headerLabel")
        layout.addWidget(header)

        # Progress Section
        prog_layout = QVBoxLayout()
        self.stats_label = QLabel(f"{self.texts['overall_progress']}: 0/0 {self.texts['tasks_completed']}")
        self.stats_label.setStyleSheet("font-size: 16px; font-weight: bold; color: #495057;")
        
        self.progress_bar = QProgressBar()
        self.progress_bar.setValue(0)
        self.progress_bar.setFixedHeight(25)
        
        prog_layout.addWidget(self.stats_label)
        prog_layout.addWidget(self.progress_bar)
        
        progress_group = QFrame()
        progress_group.setLayout(prog_layout)
        progress_group.setStyleSheet("""
            QFrame {
                background: #ffffff; 
                border: 1px solid #dee2e6; 
                border-radius: 12px; 
                padding: 20px;
            }
        """)
        layout.addWidget(progress_group)

        # To-Do Section Header
        layout.addSpacing(10)
        todo_header_layout = QHBoxLayout()
        todo_title = QLabel(self.texts["up_next"])
        todo_title.setStyleSheet("font-size: 20px; font-weight: bold; color: #2c3e50;")
        
        refresh_btn = QPushButton(self.texts["refresh"])
        refresh_btn.setFixedWidth(100)
        refresh_btn.clicked.connect(self.refresh_data)
        
        todo_header_layout.addWidget(todo_title)
        todo_header_layout.addStretch()
        todo_header_layout.addWidget(refresh_btn)
        layout.addLayout(todo_header_layout)
        
        # Scroll Area for Grouped Todos
        self.scroll = QScrollArea()
        self.scroll.setWidgetResizable(True)
        self.scroll.setStyleSheet("border: none; background: transparent;")
        
        self.todo_container = QWidget()
        self.todo_main_layout = QVBoxLayout(self.todo_container)
        self.todo_main_layout.setAlignment(Qt.AlignTop)
        self.todo_main_layout.setSpacing(15)
        
        self.scroll.setWidget(self.todo_container)
        layout.addWidget(self.scroll)

        self.setLayout(layout)
        self.refresh_data()

    def refresh_data(self):
        # Update Stats & Progress
        total, completed = get_progress_stats()
        percentage = int((completed / total * 100)) if total > 0 else 0
        
        self.stats_label.setText(f"{self.texts['overall_progress']}: {completed}/{total} {self.texts['tasks_completed']}")
        self.progress_bar.setValue(percentage)

        # Update To-Do List Grouped by Subject
        # Clear current list
        for i in reversed(range(self.todo_main_layout.count())): 
            widget = self.todo_main_layout.itemAt(i).widget()
            if widget:
                widget.setParent(None)

        todos = get_todo_chapters()
        
        if not todos:
            empty_label = QLabel("🎉 All caught up! No pending tasks.")
            empty_label.setStyleSheet("font-size: 16px; color: #6c757d; font-style: italic;")
            empty_label.setAlignment(Qt.AlignCenter)
            self.todo_main_layout.addWidget(empty_label)
        else:
            # Group by subject
            grouped_todos = {}
            for item in todos:
                subj = item['subject_name']
                if subj not in grouped_todos:
                    grouped_todos[subj] = []
                grouped_todos[subj].append(item)
            
            for subject, chapters in grouped_todos.items():
                subject_group = QFrame()
                subject_group.setStyleSheet("""
                    QFrame {
                        background: #f8f9fa;
                        border: 1px solid #e9ecef;
                        border-radius: 10px;
                    }
                """)
                group_layout = QVBoxLayout(subject_group)
                
                sub_header = QLabel(subject)
                sub_header.setStyleSheet("font-weight: bold; color: #28a745; font-size: 15px; border: none;")
                group_layout.addWidget(sub_header)
                
                for chap in chapters:
                    tasks = []
                    if not chap['video_completed']: tasks.append("Video")
                    if not chap['exercises_completed']: tasks.append("Exercises")
                    
                    chap_label = QLabel(f"• {chap['chapter_name']} - Pending: {', '.join(tasks)}")
                    chap_label.setStyleSheet("color: #495057; border: none; padding-left: 10px;")
                    group_layout.addWidget(chap_label)
                
                self.todo_main_layout.addWidget(subject_group)
    
    def showEvent(self, event):
        self.refresh_data()
        super().showEvent(event)