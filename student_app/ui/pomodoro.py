
from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton, 
    QComboBox, QProgressBar, QFrame, QMessageBox, QCheckBox
)
from PyQt5.QtCore import QTimer, Qt, QRectF, QPointF
from PyQt5.QtGui import QPainter, QColor, QPen, QFont
from datetime import datetime
from student_app.database import (
    get_all_subjects, get_next_task, get_user_profile, 
    add_xp, log_study_session
)
from student_app.sound_manager import play_sound, toggle_lofi
from student_app.settings import get_language, get_pomodoro_settings
from student_app.ui.translations import TRANSLATIONS

class CircularTimer(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setMinimumSize(300, 300)
        self.progress = 0 # 0 to 1
        self.time_text = "25:00"
        self.mode_color = QColor("#6366f1")

    def set_progress(self, progress, text):
        self.progress = progress
        self.time_text = text
        self.update()

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        
        width = self.width()
        height = self.height()
        side = min(width, height) - 40
        rect = QRectF((width - side) / 2, (height - side) / 2, side, side)
        
        # Background Circle
        pen = QPen(QColor("#e2e8f0"), 12)
        if self.mode_color.lightness() < 100: # Simple dark check
             pen.setColor(QColor("#334155"))
        painter.setPen(pen)
        painter.drawEllipse(rect)
        
        # Progress Arc
        pen.setColor(self.mode_color)
        pen.setCapStyle(Qt.RoundCap)
        painter.setPen(pen)
        painter.drawArc(rect, 90 * 16, int(-self.progress * 360 * 16))
        
        # Text
        painter.setPen(self.mode_color)
        painter.setFont(QFont("Inter", 48, QFont.Bold))
        painter.drawText(rect, Qt.AlignCenter, self.time_text)

class PomodoroTimer(QWidget):
    def __init__(self, notify_callback=None):
        super().__init__()
        self.notify_callback = notify_callback
        self.lang = get_language()
        self.texts = TRANSLATIONS.get(self.lang, TRANSLATIONS["English"])
        
        # Load Pomodoro Settings
        p_settings = get_pomodoro_settings()
        self.work_time = p_settings["work"] * 60
        self.short_break = p_settings["short_break"] * 60
        self.long_break = p_settings["long_break"] * 60
        
        self.time_left = self.work_time
        self.is_running = False
        self.mode = "WORK"
        self.sessions_completed = 0
        
        self.timer = QTimer()
        self.timer.timeout.connect(self.update_timer)
        
        self.init_ui()
        self.refresh_subjects()
        self.refresh_profile()

    def refresh_settings(self):
        if not self.is_running:
            p_settings = get_pomodoro_settings()
            self.work_time = p_settings["work"] * 60
            self.short_break = p_settings["short_break"] * 60
            self.long_break = p_settings["long_break"] * 60
            if self.mode == "WORK": self.time_left = self.work_time
            elif self.mode == "SHORT_BREAK": self.time_left = self.short_break
            else: self.time_left = self.long_break
            self.update_display()

    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(40, 40, 40, 40)
        layout.setAlignment(Qt.AlignCenter)
        
        # Header Stats
        header = QHBoxLayout()
        self.level_label = QLabel("Level 1 Student", objectName="h2")
        self.xp_bar = QProgressBar()
        self.xp_bar.setRange(0, 500)
        self.xp_bar.setFixedWidth(200)
        
        header.addWidget(self.level_label)
        header.addStretch()
        header.addWidget(self.xp_bar)
        layout.addLayout(header)
        
        # Subject Selector
        sel_frame = QFrame()
        sel_frame.setObjectName("card")
        sel_layout = QHBoxLayout(sel_frame)
        sel_layout.addWidget(QLabel(self.texts["focus_subject"]))
        self.subject_combo = QComboBox()
        self.subject_combo.currentIndexChanged.connect(self.update_suggestion)
        sel_layout.addWidget(self.subject_combo, 1)
        layout.addWidget(sel_frame)
        
        # Suggestion
        self.suggestion_label = QLabel("💡 Select a subject to start", objectName="mute")
        self.suggestion_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(self.suggestion_label)
        
        # Circular Timer
        self.circular_timer = CircularTimer()
        layout.addWidget(self.circular_timer)
        
        # Controls
        controls = QHBoxLayout()
        self.start_btn = QPushButton(self.texts["start_focus"])
        self.start_btn.clicked.connect(self.toggle_timer)
        self.start_btn.setFixedWidth(180)
        
        self.reset_btn = QPushButton(self.texts["reset"])
        self.reset_btn.setObjectName("secondaryButton")
        self.reset_btn.clicked.connect(self.reset_timer)
        
        controls.addStretch()
        controls.addWidget(self.start_btn)
        controls.addWidget(self.reset_btn)
        controls.addStretch()
        layout.addLayout(controls)
        
        # Extra
        extra = QHBoxLayout()
        self.lofi_check = QCheckBox("🎵 " + self.texts["lofi"])
        self.lofi_check.stateChanged.connect(lambda s: toggle_lofi(s == Qt.Checked))
        extra.addWidget(self.lofi_check)
        
        self.sessions_label = QLabel(f"{self.texts['sessions_today']}: 0", objectName="mute")
        extra.addStretch()
        extra.addWidget(self.sessions_label)
        layout.addLayout(extra)

    def update_timer(self):
        if self.time_left > 0:
            self.time_left -= 1
            self.update_display()
        else:
            self.handle_complete()

    def update_display(self):
        mins = self.time_left // 60
        secs = self.time_left % 60
        text = f"{mins:02d}:{secs:02d}"
        
        total = self.work_time if self.mode == "WORK" else (self.short_break if self.mode == "SHORT_BREAK" else self.long_break)
        progress = 1 - (self.time_left / total)
        self.circular_timer.set_progress(progress, text)

    def toggle_timer(self):
        if self.is_running:
            self.timer.stop()
            self.start_btn.setText(self.texts["resume"])
            self.is_running = False
            toggle_lofi(False)
        else:
            self.timer.start(1000)
            self.start_btn.setText(self.texts["pause"])
            self.is_running = True
            play_sound("start.wav")
            if self.lofi_check.isChecked(): toggle_lofi(True)

    def reset_timer(self):
        self.timer.stop()
        self.is_running = False
        self.time_left = self.work_time
        self.mode = "WORK"
        self.update_display()
        self.start_btn.setText(self.texts["start_focus"])
        toggle_lofi(False)

    def handle_complete(self):
        self.timer.stop()
        self.is_running = False
        
        if self.mode == "WORK":
            self.sessions_completed += 1
            self.sessions_label.setText(f"{self.texts['sessions_today']}: {self.sessions_completed}")
            play_sound("complete.wav")
            
            if self.notify_callback:
                self.notify_callback("Pomodoro", "Work session finished! Time for a break.")
            
            sub_id = self.subject_combo.currentData()
            if sub_id: log_study_session(sub_id, 25)
            
            leveled_up, new_level = add_xp(50, 1)
            self.refresh_profile()
            
            if self.sessions_completed % 4 == 0:
                self.mode = "LONG_BREAK"; self.time_left = self.long_break
            else:
                self.mode = "SHORT_BREAK"; self.time_left = self.short_break
        else:
            self.mode = "WORK"; self.time_left = self.work_time
            play_sound("break.wav")
            if self.notify_callback:
                self.notify_callback("Pomodoro", "Break finished! Time to focus.")

        self.update_display()
        self.start_btn.setText(self.texts["start_focus"])

    def refresh_profile(self):
        p = get_user_profile()
        self.level_label.setText(f"Level {p['level']} Student")
        self.xp_bar.setValue(p['xp'] % 500)

    def refresh_subjects(self):
        self.subject_combo.blockSignals(True)
        self.subject_combo.clear()
        for s in get_all_subjects():
            self.subject_combo.addItem(s['name'], s['id'])
        self.subject_combo.blockSignals(False)
        self.update_suggestion()

    def update_suggestion(self):
        sub_id = self.subject_combo.currentData()
        if not sub_id: return
        task = get_next_task(sub_id)
        if task:
            self.suggestion_label.setText(f"💡 Suggestion: Focus on {task['type']} - {task['chapter_name']}")
        else:
            self.suggestion_label.setText("💡 All caught up for this subject!")
