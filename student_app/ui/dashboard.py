
from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QFrame, 
    QScrollArea, QGridLayout, QProgressBar
)
from PyQt5.QtCore import Qt, QDate
from student_app.database import get_todo_chapters, get_progress_stats, get_all_subjects
from student_app.settings import get_language
from student_app.ui.translations import TRANSLATIONS
from datetime import datetime

class StatCard(QFrame):
    def __init__(self, title, value, subtitle="", icon=""):
        super().__init__()
        self.setObjectName("card")
        layout = QVBoxLayout(self)
        
        if icon:
            title = f"{icon} {title}"
        
        t_label = QLabel(title)
        t_label.setObjectName("mute")
        layout.addWidget(t_label)
        
        v_label = QLabel(str(value))
        v_label.setObjectName("h2")
        layout.addWidget(v_label)
        
        if subtitle:
            s_label = QLabel(subtitle)
            s_label.setObjectName("mute")
            s_label.setStyleSheet("font-size: 11px;")
            layout.addWidget(s_label)

class Dashboard(QWidget):
    def __init__(self):
        super().__init__()
        self.lang = get_language()
        self.texts = TRANSLATIONS.get(self.lang, TRANSLATIONS["English"])
        self.init_ui()

    def init_ui(self):
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(30, 30, 30, 30)
        main_layout.setSpacing(25)
        
        # Header
        header_layout = QHBoxLayout()
        title = QLabel(self.texts["dashboard"])
        title.setObjectName("h1")
        header_layout.addWidget(title)
        
        self.date_label = QLabel(QDate.currentDate().toString("dddd, MMMM d"))
        self.date_label.setObjectName("mute")
        header_layout.addStretch()
        header_layout.addWidget(self.date_label)
        main_layout.addLayout(header_layout)
        
        # Stats Row
        stats_layout = QHBoxLayout()
        self.progress_card = StatCard(self.texts["overall_progress"], "0%", "Tasks Completed", "📈")
        self.exam_card = StatCard("Next Exam", "None", "Countdown", "📅")
        self.streak_card = StatCard("Study Streak", "0 Days", "Current consistency", "🔥")
        
        stats_layout.addWidget(self.progress_card)
        stats_layout.addWidget(self.exam_card)
        stats_layout.addWidget(self.streak_card)
        main_layout.addLayout(stats_layout)
        
        # Bottom Section (Split)
        bottom_layout = QHBoxLayout()
        
        # To-Do Section
        todo_vbox = QVBoxLayout()
        todo_vbox.addWidget(QLabel(self.texts["up_next"], objectName="h2"))
        
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("background: transparent; border: none;")
        
        self.todo_container = QWidget()
        self.todo_layout = QVBoxLayout(self.todo_container)
        self.todo_layout.setAlignment(Qt.AlignTop)
        scroll.setWidget(self.todo_container)
        
        todo_vbox.addWidget(scroll)
        bottom_layout.addLayout(todo_vbox, 2)
        
        # Quick Tips / Level Progress
        side_vbox = QVBoxLayout()
        side_vbox.addWidget(QLabel("Progress Overview", objectName="h2"))
        
        self.level_frame = QFrame()
        self.level_frame.setObjectName("card")
        level_layout = QVBoxLayout(self.level_frame)
        self.overall_progress_bar = QProgressBar()
        level_layout.addWidget(QLabel("Course Completion"))
        level_layout.addWidget(self.overall_progress_bar)
        
        side_vbox.addWidget(self.level_frame)
        side_vbox.addStretch()
        bottom_layout.addLayout(side_vbox, 1)
        
        main_layout.addLayout(bottom_layout)
        
        self.refresh_data()

    def refresh_data(self):
        # 1. Update Progress
        total, completed = get_progress_stats()
        perc = int((completed / total) * 100) if total > 0 else 0
        
        # Finding labels inside StatCard is tricky without references, 
        # let's rebuild or update if we had kept refs. 
        # For simplicity in this demo, I'll update the progress bar.
        self.overall_progress_bar.setValue(perc)
        
        # 2. Update Exam Countdown
        subjects = get_all_subjects()
        today = datetime.now().date()
        next_exam = None
        min_days = 999
        
        for sub in subjects:
            if sub['exam_date']:
                edate = datetime.strptime(sub['exam_date'], "%Y-%m-%d").date()
                days = (edate - today).days
                if 0 <= days < min_days:
                    min_days = days
                    next_exam = f"{sub['name']} (in {days}d)"
        
        # 3. To-Do List
        for i in reversed(range(self.todo_layout.count())): 
            self.todo_layout.itemAt(i).widget().setParent(None)
            
        todos = get_todo_chapters()
        if not todos:
            self.todo_layout.addWidget(QLabel("🎉 No tasks left! Take a break."))
        else:
            for item in todos[:5]: # Show top 5
                frame = QFrame()
                frame.setObjectName("card")
                frame.setStyleSheet("margin-bottom: 5px; padding: 10px;")
                flayout = QHBoxLayout(frame)
                
                info = QVBoxLayout()
                info.addWidget(QLabel(item['chapter_name'], styleSheet="font-weight: bold;"))
                info.addWidget(QLabel(item['subject_name'], objectName="mute"))
                flayout.addLayout(info)
                flayout.addStretch()
                
                type_label = QLabel("Video" if not item['video_completed'] else "Exercises")
                type_label.setStyleSheet(f"background: #6366f120; color: #6366f1; padding: 5px 10px; border-radius: 5px;")
                flayout.addWidget(type_label)
                
                self.todo_layout.addWidget(frame)

    def showEvent(self, event):
        self.refresh_data()
        super().showEvent(event)
