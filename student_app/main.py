import sys
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QStackedWidget, QPushButton, QLabel, QFrame, QSpacerItem, QSizePolicy
)
from PyQt5.QtCore import Qt, QPropertyAnimation, QEasingCurve, QRect
from PyQt5.QtGui import QIcon
from student_app.database import init_db
from student_app.ui.styles import get_stylesheet
from student_app.ui.dashboard import Dashboard
from student_app.ui.planner import StudyPlanner
from student_app.ui.pomodoro import PomodoroTimer
from student_app.ui.analytics import Analytics
from student_app.ui.settings import SettingsTab
from student_app.sound_manager import create_app_sounds
from student_app.settings import get_language, get_theme
from student_app.ui.translations import TRANSLATIONS

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.lang = get_language()
        self.theme = get_theme()
        self.texts = TRANSLATIONS.get(self.lang, TRANSLATIONS["English"])
        
        self.setWindowTitle("Student Study Manager By Chenoufi Abderrahmane")
        self.resize(1100, 750)
        
        self.setup_ui()

    def setup_ui(self):
        central_widget = QWidget()
        central_widget.setObjectName("mainContainer")
        self.setCentralWidget(central_widget)
        
        self.main_layout = QHBoxLayout(central_widget)
        self.main_layout.setContentsMargins(0, 0, 0, 0)
        self.main_layout.setSpacing(0)
        
        if self.lang == "Arabic":
             self.main_layout.setDirection(QHBoxLayout.RightToLeft)

        # --- Sidebar ---
        self.sidebar = QFrame()
        self.sidebar.setObjectName("sidebar")
        self.sidebar.setFixedWidth(240)
        sidebar_layout = QVBoxLayout(self.sidebar)
        sidebar_layout.setContentsMargins(10, 20, 10, 20)
        
        # Logo / Title
        logo = QLabel("🎓 StudentPro")
        logo.setStyleSheet("font-size: 22px; font-weight: 800; color: #6366f1; margin-bottom: 20px; padding: 10px;")
        sidebar_layout.addWidget(logo)
        
        # Navigation Buttons
        self.nav_buttons = []
        nav_items = [
            (self.texts["dashboard"], "dashboard"),
            (self.texts["planner"], "planner"),
            (self.texts["pomodoro"], "pomodoro"),
            (self.texts["analytics"], "analytics"),
            (self.texts["settings"], "settings")
        ]
        
        for i, (text, name) in enumerate(nav_items):
            btn = QPushButton(text)
            btn.setObjectName("navButton")
            btn.setCheckable(True)
            btn.clicked.connect(lambda checked, idx=i: self.switch_tab(idx))
            sidebar_layout.addWidget(btn)
            self.nav_buttons.append(btn)
            
        sidebar_layout.addStretch()
        
        # Footer
        footer = QLabel("v2.0 Beta")
        footer.setObjectName("mute")
        footer.setAlignment(Qt.AlignCenter)
        sidebar_layout.addWidget(footer)
        
        self.main_layout.addWidget(self.sidebar)
        
        # --- Content Area ---
        self.content_stack = QStackedWidget()
        
        self.dashboard_tab = Dashboard()
        self.planner_tab = StudyPlanner()
        self.pomodoro_tab = PomodoroTimer()
        self.analytics_tab = Analytics()
        self.settings_tab = SettingsTab()
        
        self.content_stack.addWidget(self.dashboard_tab)
        self.content_stack.addWidget(self.planner_tab)
        self.content_stack.addWidget(self.pomodoro_tab)
        self.content_stack.addWidget(self.analytics_tab)
        self.content_stack.addWidget(self.settings_tab)
        
        self.main_layout.addWidget(self.content_stack)
        
        # Initial Selection
        self.switch_tab(0)

    def switch_tab(self, index):
        self.content_stack.setCurrentIndex(index)
        
        # Update Button Styles
        for i, btn in enumerate(self.nav_buttons):
            btn.setProperty("active", i == index)
            btn.style().unpolish(btn)
            btn.style().polish(btn)
            btn.setChecked(i == index)
            
        # Refresh Logic
        if index == 0: self.dashboard_tab.refresh_data()
        elif index == 1: self.planner_tab.refresh_subjects()
        elif index == 2: 
            self.pomodoro_tab.refresh_subjects()
            self.pomodoro_tab.refresh_profile()
        elif index == 3: self.analytics_tab.refresh_data()

def main():
    init_db()
    create_app_sounds()
    
    app = QApplication(sys.argv)
    
    theme = get_theme()
    app.setStyleSheet(get_stylesheet(theme))
    
    window = MainWindow()
    window.show()
    sys.exit(app.exec_())

if __name__ == "__main__":
    main()