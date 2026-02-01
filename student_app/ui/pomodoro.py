from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton, 
    QComboBox, QProgressBar, QFrame, QMessageBox, QGroupBox, QCheckBox
)
from PyQt5.QtCore import QTimer, Qt, QDate
from datetime import datetime, timedelta
from student_app.database import (
    get_all_subjects, get_next_task, get_user_profile, 
    add_xp, log_study_session
)
from student_app.sound_manager import play_sound, toggle_lofi

class PomodoroTimer(QWidget):
    def __init__(self):
        super().__init__()
        # Settings
        self.work_time = 25 * 60
        self.short_break = 5 * 60
        self.long_break = 15 * 60
        
        # State
        self.time_left = self.work_time
        self.is_running = False
        self.mode = "WORK" # WORK, SHORT_BREAK, LONG_BREAK
        self.sessions_completed = 0
        self.timer = QTimer()
        self.timer.timeout.connect(self.update_timer)
        
        self.init_ui()
        self.refresh_subjects()
        self.refresh_profile()

    def init_ui(self):
        layout = QVBoxLayout()
        layout.setContentsMargins(30, 30, 30, 30)
        layout.setSpacing(15)

        # --- Profile Header (XP & Level) ---
        profile_layout = QHBoxLayout()
        self.level_label = QLabel("Level 1 Student")
        self.level_label.setStyleSheet("font-weight: bold; font-size: 16px; color: #6f42c1;")
        
        self.xp_bar = QProgressBar()
        self.xp_bar.setRange(0, 500)
        self.xp_bar.setValue(0)
        self.xp_bar.setFormat("XP: %v/500")
        self.xp_bar.setStyleSheet("QProgressBar::chunk { background-color: #d63384; }")
        
        profile_layout.addWidget(self.level_label)
        profile_layout.addWidget(self.xp_bar)
        layout.addLayout(profile_layout)

        # --- Challenge Section ---
        self.challenge_banner = QFrame()
        self.challenge_banner.setObjectName("challengeBanner")
        self.challenge_banner.setStyleSheet("""
            #challengeBanner {
                background-color: #e3f2fd;
                border: 1px solid #90caf9;
                border-radius: 10px;
                padding: 15px;
            }
        """)
        chal_layout = QVBoxLayout(self.challenge_banner)
        self.challenge_label = QLabel("🎯 Challenge: Loading...")
        self.challenge_label.setStyleSheet("font-size: 16px; font-weight: bold; color: #1565c0;")
        self.challenge_status = QLabel("Progress: 0/2 Sessions")
        chal_layout.addWidget(self.challenge_label)
        chal_layout.addWidget(self.challenge_status)
        layout.addWidget(self.challenge_banner)

        # --- Subject Selection ---
        sel_layout = QHBoxLayout()
        sel_layout.addWidget(QLabel("Focus Subject:"))
        self.subject_combo = QComboBox()
        self.subject_combo.setStyleSheet("padding: 5px; font-size: 14px;")
        self.subject_combo.currentIndexChanged.connect(self.update_suggestion)
        sel_layout.addWidget(self.subject_combo, 1)
        layout.addLayout(sel_layout)

        # --- Smart Suggestion ---
        self.suggestion_frame = QFrame()
        self.suggestion_frame.setStyleSheet("background-color: #fff3cd; border: 1px solid #ffeeba; border-radius: 5px; padding: 10px;")
        sug_layout = QHBoxLayout(self.suggestion_frame)
        sug_layout.setContentsMargins(10, 5, 10, 5)
        
        self.suggestion_label = QLabel("💡 Suggestion: Select a subject")
        self.suggestion_label.setStyleSheet("color: #856404; font-weight: bold;")
        sug_layout.addWidget(self.suggestion_label)
        layout.addWidget(self.suggestion_frame)

        # --- Timer Display ---
        self.timer_label = QLabel("25:00")
        self.timer_label.setAlignment(Qt.AlignCenter)
        self.timer_label.setStyleSheet("font-size: 80px; font-weight: bold; color: #2c3e50;")
        layout.addWidget(self.timer_label)
        
        self.status_label = QLabel("Ready to Work?")
        self.status_label.setAlignment(Qt.AlignCenter)
        self.status_label.setStyleSheet("font-size: 18px; color: #7f8c8d;")
        layout.addWidget(self.status_label)

        # --- Controls ---
        btn_layout = QHBoxLayout()
        
        self.start_btn = QPushButton("Start Focus")
        self.start_btn.setMinimumHeight(50)
        self.start_btn.setStyleSheet("font-size: 16px; background-color: #2ecc71; color: white; border-radius: 5px;")
        self.start_btn.clicked.connect(self.toggle_timer)
        
        self.reset_btn = QPushButton("Reset")
        self.reset_btn.setMinimumHeight(50)
        self.reset_btn.setStyleSheet("font-size: 16px; background-color: #95a5a6; color: white; border-radius: 5px;")
        self.reset_btn.clicked.connect(self.reset_timer)
        
        btn_layout.addWidget(self.start_btn)
        btn_layout.addWidget(self.reset_btn)
        layout.addLayout(btn_layout)

        # --- Audio & Stats ---
        extra_layout = QHBoxLayout()
        
        self.lofi_check = QCheckBox("🎵 Lo-Fi Music")
        self.lofi_check.stateChanged.connect(self.toggle_music)
        extra_layout.addWidget(self.lofi_check)
        
        extra_layout.addStretch()
        
        self.stats_text = QLabel("Sessions Today: 0")
        extra_layout.addWidget(self.stats_text)
        
        layout.addLayout(extra_layout)
        
        layout.addStretch()
        self.setLayout(layout)

    def refresh_profile(self):
        profile = get_user_profile()
        if profile:
            self.level_label.setText(f"Level {profile['level']} Student")
            # XP bar (Mod 500)
            current_xp = profile['xp'] % 500
            self.xp_bar.setValue(current_xp)

    def refresh_subjects(self):
        self.subject_combo.blockSignals(True)
        self.subject_combo.clear()
        subjects = get_all_subjects() # Returns list of Row objects or dicts
        
        # Sort Logic:
        # 1. Urgent Exam (within 7 days)
        # 2. Upcoming Exam (future)
        # 3. No Exam (High Coef first)
        
        subjects_list = [dict(s) for s in subjects]
        today = datetime.now().date()
        
        def sort_key(s):
            exam_date_str = s.get('exam_date')
            coef = s['coefficient']
            
            if exam_date_str:
                exam_date = datetime.strptime(exam_date_str, "%Y-%m-%d").date()
                days_until = (exam_date - today).days
                
                if 0 <= days_until <= 7:
                    return (0, days_until) # Urgent: Priority 0
                elif days_until > 7:
                    return (1, days_until) # Upcoming: Priority 1
                else:
                    return (2, -coef) # Past exam: Priority 2 (fallback to coef)
            
            return (2, -coef) # No exam: Priority 2 (fallback to coef)

        subjects_list.sort(key=sort_key)
        
        self.high_priority_subject = None
        
        for i, sub in enumerate(subjects_list):
            name = sub['name']
            coef = sub['coefficient']
            exam_str = sub.get('exam_date')
            
            label = f"{name} (Coef: {coef})"
            
            if exam_str:
                exam_date = datetime.strptime(exam_str, "%Y-%m-%d").date()
                days_until = (exam_date - today).days
                if 0 <= days_until <= 3:
                     label += f" 🚨 EXAM IN {days_until} DAYS!"
                elif 0 <= days_until <= 7:
                     label += f" ⚠️ Exam in {days_until} days"
            
            if i == 0: 
                label += " 🔥 Top Priority"
                self.high_priority_subject = name
            
            self.subject_combo.addItem(label, sub['id'])
        
        self.subject_combo.blockSignals(False)

        if self.high_priority_subject:
            self.challenge_label.setText(f"🎯 Challenge: Complete 2 sessions of {self.high_priority_subject}")
        else:
            self.challenge_label.setText("🎯 Challenge: Add subjects to see challenges!")
            
        # Trigger initial suggestion update
        self.update_suggestion()

    def update_suggestion(self):
        if self.subject_combo.count() == 0:
            self.suggestion_label.setText("💡 Suggestion: Add subjects in the Planner tab first!")
            return

        subject_id = self.subject_combo.currentData()
        task = get_next_task(subject_id)
        
        if task:
            task_type = task['type'] # Video or Exercises
            chap_name = task['chapter_name']
            icon = "🎥" if task_type == "Video" else "✍️"
            self.suggestion_label.setText(f"💡 Suggestion: {icon} Watch '{chap_name}' {task_type}" if task_type == "Video" else f"💡 Suggestion: {icon} Do '{chap_name}' {task_type}")
        else:
            self.suggestion_label.setText("💡 Suggestion: All caught up! Review or add new chapters.")

    def toggle_timer(self):
        if self.is_running:
            self.timer.stop()
            self.start_btn.setText("Resume")
            self.start_btn.setStyleSheet("font-size: 16px; background-color: #2ecc71; color: white; border-radius: 5px;")
            self.is_running = False
            # Pause music if enabled
            if self.lofi_check.isChecked():
                toggle_lofi(False)
        else:
            self.timer.start(1000)
            self.start_btn.setText("Pause")
            self.start_btn.setStyleSheet("font-size: 16px; background-color: #e67e22; color: white; border-radius: 5px;")
            self.is_running = True
            play_sound("start.wav")
            # Start music if enabled
            if self.lofi_check.isChecked():
                toggle_lofi(True)

    def toggle_music(self, state):
        if self.is_running:
            toggle_lofi(state == Qt.Checked)

    def reset_timer(self):
        self.timer.stop()
        self.is_running = False
        self.mode = "WORK"
        self.time_left = self.work_time
        self.update_display()
        self.start_btn.setText("Start Focus")
        self.start_btn.setStyleSheet("font-size: 16px; background-color: #2ecc71; color: white; border-radius: 5px;")
        self.status_label.setText("Ready to Work?")
        toggle_lofi(False)

    def update_timer(self):
        if self.time_left > 0:
            self.time_left -= 1
            self.update_display()
        else:
            self.timer.stop()
            self.is_running = False
            self.handle_timer_complete()

    def update_display(self):
        minutes = self.time_left // 60
        seconds = self.time_left % 60
        self.timer_label.setText(f"{minutes:02d}:{seconds:02d}")

    def handle_timer_complete(self):
        if self.mode == "WORK":
            self.sessions_completed += 1
            self.stats_text.setText(f"Sessions Today: {self.sessions_completed}")
            play_sound("complete.wav")
            toggle_lofi(False)
            
            # --- Log Session for Analytics ---
            subject_id = self.subject_combo.currentData()
            if subject_id:
                log_study_session(subject_id, 25) # Log 25 minutes
            
            # --- Award XP ---
            leveled_up, new_level = add_xp(50, session_increment=1)
            self.refresh_profile()
            
            if leveled_up:
                play_sound("levelup.wav")
                QMessageBox.information(self, "Level Up!", f"🎉 Congratulations! You reached Level {new_level}!")
            
            # Check Challenge
            current_sub_text = self.subject_combo.currentText()
            if self.high_priority_subject and self.high_priority_subject in current_sub_text:
                if self.sessions_completed >= 2:
                     self.challenge_status.setText(f"Progress: {self.sessions_completed}/2 Sessions (Completed!)")
                     play_sound("tada.wav")
                else:
                     self.challenge_status.setText(f"Progress: {self.sessions_completed}/2 Sessions")

            # Switch to break
            if self.sessions_completed % 4 == 0:
                self.mode = "LONG_BREAK"
                self.time_left = self.long_break
                self.status_label.setText("Long Break! Go for a walk.")
            else:
                self.mode = "SHORT_BREAK"
                self.time_left = self.short_break
                self.status_label.setText("Short Break. Relax.")
                
            self.start_btn.setText("Start Break")
            
        else:
            # Break over
            play_sound("break.wav")
            self.mode = "WORK"
            self.time_left = self.work_time
            self.status_label.setText("Back to Work!")
            self.start_btn.setText("Start Focus")
            
        self.update_display()
