import sys
from PyQt5.QtWidgets import QApplication, QMainWindow, QTabWidget, QWidget, QVBoxLayout
from PyQt5.QtGui import QIcon
from student_app.database import init_db
from student_app.ui.styles import STYLESHEET
from student_app.ui.dashboard import Dashboard
from student_app.ui.planner import StudyPlanner
from student_app.ui.calculator import GradeCalculator
from student_app.ui.pomodoro import PomodoroTimer
from student_app.ui.analytics import Analytics
from student_app.ui.settings import SettingsTab
from student_app.sound_manager import create_app_sounds

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Student Study Manager by Chenoufi Abderrahman")
        self.resize(1000, 700)
        
        self.tabs = QTabWidget()
        self.setCentralWidget(self.tabs)
        
        # Initialize Tabs
        self.dashboard_tab = Dashboard()
        self.planner_tab = StudyPlanner()
        self.calculator_tab = GradeCalculator()
        self.pomodoro_tab = PomodoroTimer()
        self.analytics_tab = Analytics()
        self.settings_tab = SettingsTab()
        
        self.tabs.addTab(self.dashboard_tab, "Dashboard")
        self.tabs.addTab(self.planner_tab, "Study Planner")
        self.tabs.addTab(self.calculator_tab, "Grade Calculator")
        self.tabs.addTab(self.pomodoro_tab, "Pomodoro Timer")
        self.tabs.addTab(self.analytics_tab, "Analytics")
        self.tabs.addTab(self.settings_tab, "Settings")
        
        # Connect tab change to refresh
        self.tabs.currentChanged.connect(self.on_tab_change)

    def on_tab_change(self, index):
        if index == 0:
            self.dashboard_tab.refresh_data()
        elif index == 1:
            self.planner_tab.refresh_subjects()
        elif index == 2:
            self.calculator_tab.load_data()
        elif index == 3:
            self.pomodoro_tab.refresh_subjects()
            self.pomodoro_tab.refresh_profile()
        elif index == 4:
            self.analytics_tab.refresh_data()
        elif index == 5:
            # Settings tab - maybe refresh path display if changed externally?
            pass

def main():
    # Initialize Database
    init_db()
    
    # Initialize Sounds
    create_app_sounds()
    
    app = QApplication(sys.argv)
    app.setStyleSheet(STYLESHEET)
    
    window = MainWindow()
    window.show()
    
    sys.exit(app.exec_())

if __name__ == "__main__":
    main()
