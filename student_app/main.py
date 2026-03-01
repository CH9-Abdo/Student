import sys
import os
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QStackedWidget, QPushButton, QLabel, QFrame, QSpacerItem, QSizePolicy,
    QSystemTrayIcon
)
from PyQt5.QtCore import Qt, QPropertyAnimation, QEasingCurve, QRect
from PyQt5.QtGui import QIcon
from student_app.database import init_db, get_upcoming_deadlines, sync_from_cloud
from student_app.ui.styles import get_stylesheet
from student_app.ui.dashboard import Dashboard
from student_app.ui.planner import StudyPlanner
from student_app.ui.pomodoro import PomodoroTimer
from student_app.ui.analytics import Analytics
from student_app.ui.settings import SettingsTab
from student_app.ui.login import LoginWindow
from student_app.auth_manager import AuthManager
from student_app.sound_manager import create_app_sounds
from student_app.settings import get_language, get_theme
from student_app.ui.translations import TRANSLATIONS

class MainWindow(QMainWindow):
    def __init__(self, user=None):
        super().__init__()
        self.user = user # Supabase User Object
        self.lang = get_language()
        self.theme = get_theme()
        self.texts = TRANSLATIONS.get(self.lang, TRANSLATIONS["English"])
        
        # Performance: Sync from cloud once at startup
        if self.user:
            sync_from_cloud()
        
        self.setWindowTitle("Student Study Manager By Chenoufi Abderrahmane")
        self.resize(1100, 750)
        
        self.setup_ui()
        self.setup_tray()

    def setup_tray(self):
        self.tray_icon = QSystemTrayIcon(self)
        icon_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "130manstudent2_100617.ico")
        if os.path.exists(icon_path):
            self.tray_icon.setIcon(QIcon(icon_path))
        else:
            # Fallback to some generic icon if not found
            self.tray_icon.setIcon(self.style().standardIcon(QSizePolicy.Policy(0))) 
        
        self.tray_icon.show()
        
        # Check for upcoming deadlines on startup
        from PyQt5.QtCore import QTimer
        QTimer.singleShot(2000, self.check_deadlines)

    def check_deadlines(self):
        deadlines = get_upcoming_deadlines()
        if deadlines:
            msg = "\n".join(deadlines[:3]) # Show top 3
            if len(deadlines) > 3:
                msg += f"\n...and {len(deadlines)-3} more."
            self.notify("Upcoming Deadlines", msg)

    def notify(self, title, message):
        self.tray_icon.showMessage(title, message, QSystemTrayIcon.Information, 5000)

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
        logo_container = QVBoxLayout()
        logo = QLabel("🎓 StudentPro")
        logo.setStyleSheet("font-size: 22px; font-weight: 800; color: #6366f1; padding: 10px 10px 0 10px;")
        logo_container.addWidget(logo)
        
        if self.user:
            user_label = QLabel(f"👤 {self.user.email}")
            user_label.setStyleSheet("font-size: 11px; color: #64748b; padding-left: 15px; margin-bottom: 5px;")
            logo_container.addWidget(user_label)
            
            # Last Sync Label
            from datetime import datetime
            now = datetime.now().strftime("%H:%M")
            self.sync_label = QLabel(f"🔄 Last sync: {now}")
            self.sync_label.setStyleSheet("font-size: 10px; color: #94a3b8; padding-left: 15px; margin-bottom: 20px;")
            logo_container.addWidget(self.sync_label)
        
        sidebar_layout.addLayout(logo_container)
        
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
        
        # Logout Button
        logout_btn = QPushButton("Logout")
        logout_btn.setObjectName("navButton")
        logout_btn.clicked.connect(self.handle_logout)
        sidebar_layout.addWidget(logout_btn)

        # Footer
        footer = QLabel("v2.0 Beta By Chenoufi")
        footer.setObjectName("mute")
        footer.setAlignment(Qt.AlignCenter)
        sidebar_layout.addWidget(footer)
        
        self.main_layout.addWidget(self.sidebar)
        
        # --- Content Area ---
        self.content_stack = QStackedWidget()
        
        self.dashboard_tab = Dashboard()
        self.planner_tab = StudyPlanner()
        self.pomodoro_tab = PomodoroTimer(notify_callback=self.notify)
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

    def handle_logout(self):
        AuthManager().sign_out()
        python = sys.executable
        os.execl(python, python, *sys.argv)

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
        elif index == 1: 
            self.planner_tab.refresh_subjects()
            self.planner_tab.refresh_next_exam()
        elif index == 2: 
            self.pomodoro_tab.refresh_subjects()
            self.pomodoro_tab.refresh_profile()
            self.pomodoro_tab.refresh_settings()
        elif index == 3: self.analytics_tab.refresh_data()

def main():
    init_db()
    create_app_sounds()
    
    app = QApplication(sys.argv)
    
    theme = get_theme()
    app.setStyleSheet(get_stylesheet(theme))
    
    # Check Auth
    auth = AuthManager()
    user = auth.get_current_user()
    
    def start_main_app(user_obj):
        window = MainWindow(user=user_obj)
        window.show()
        # Close login window if it exists
        if 'login_win' in globals():
            login_win.close()
        # Keep a reference to prevent GC
        app.main_window = window

    if user:
        start_main_app(user)
    else:
        global login_win
        login_win = LoginWindow()
        login_win.login_successful.connect(start_main_app)
        login_win.show()
        
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()