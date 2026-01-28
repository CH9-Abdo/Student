import sys
from PyQt5.QtWidgets import QApplication, QMainWindow, QTabWidget, QWidget, QVBoxLayout
from PyQt5.QtGui import QIcon
from student_app.database import init_db
from student_app.ui.styles import STYLESHEET
from student_app.ui.dashboard import Dashboard
from student_app.ui.planner import StudyPlanner
from student_app.ui.calculator import GradeCalculator

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Student Study Manager")
        self.resize(1000, 700)
        
        self.tabs = QTabWidget()
        self.setCentralWidget(self.tabs)
        
        # Initialize Tabs
        self.dashboard_tab = Dashboard()
        self.planner_tab = StudyPlanner()
        self.calculator_tab = GradeCalculator()
        
        self.tabs.addTab(self.dashboard_tab, "Dashboard")
        self.tabs.addTab(self.planner_tab, "Study Planner")
        self.tabs.addTab(self.calculator_tab, "Grade Calculator")
        
        # Connect tab change to refresh
        self.tabs.currentChanged.connect(self.on_tab_change)

    def on_tab_change(self, index):
        if index == 0:
            self.dashboard_tab.refresh_data()
        elif index == 1:
            self.planner_tab.refresh_subjects()
        elif index == 2:
            self.calculator_tab.load_data()

def main():
    # Initialize Database
    init_db()
    
    app = QApplication(sys.argv)
    app.setStyleSheet(STYLESHEET)
    
    window = MainWindow()
    window.show()
    
    sys.exit(app.exec_())

if __name__ == "__main__":
    main()
