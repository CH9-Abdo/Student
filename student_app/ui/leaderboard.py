from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QTableWidget, 
    QTableWidgetItem, QHeaderView, QFrame
)
from PyQt5.QtCore import Qt
from student_app.database import get_supabase, get_uid
from student_app.settings import get_language
from student_app.ui.translations import TRANSLATIONS

class LeaderboardTab(QWidget):
    def __init__(self):
        super().__init__()
        self.lang = get_language()
        self.texts = TRANSLATIONS.get(self.lang, TRANSLATIONS["English"])
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(30, 30, 30, 30)
        layout.setSpacing(20)

        # Header
        header = QLabel(self.texts.get("leaderboard", "Weekly Leaderboard 🏆"))
        header.setObjectName("h1")
        layout.addWidget(header)

        # Table Card
        self.table_frame = QFrame()
        self.table_frame.setObjectName("card")
        table_layout = QVBoxLayout(self.table_frame)
        
        self.table = QTableWidget()
        self.table.setColumnCount(4)
        self.table.setHorizontalHeaderLabels(["Rank", "Student", "Level", "Sessions"])
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        self.table.verticalHeader().setVisible(False)
        self.table.setEditTriggers(QTableWidget.NoEditTriggers)
        self.table.setSelectionMode(QTableWidget.NoSelection)
        self.table.setShowGrid(False)
        self.table.setStyleSheet("background: transparent; border: none;")
        
        table_layout.addWidget(self.table)
        layout.addWidget(self.table_frame)

    def refresh_data(self):
        from student_app.database import is_offline_mode
        if is_offline_mode():
            self.table.setRowCount(1)
            self.table.setItem(0, 1, QTableWidgetItem("Leaderboard requires internet connection."))
            return

        try:
            res = get_supabase().table("weekly_leaderboard").select("*").execute()
            data = res.data if res.data else []
            
            self.table.setRowCount(len(data))
            uid = get_uid()

            for i, row in enumerate(data):
                # Rank
                medal = "🥇" if i == 0 else ("🥈" if i == 1 else ("🥉" if i == 2 else str(i+1)))
                self.table.setItem(i, 0, QTableWidgetItem(medal))
                
                # Name
                name = row['display_name'] if row['display_name'] else 'Anonymous'
                is_me = row['user_id'] == uid
                name_text = f"{name} (You)" if is_me else name
                item_name = QTableWidgetItem(name_text)
                if is_me: item_name.setForeground(Qt.blue) # Highlight me
                self.table.setItem(i, 1, item_name)
                
                # Level
                level = row['level'] if row['level'] else 1
                self.table.setItem(i, 2, QTableWidgetItem(f"Level {level}"))
                
                # Sessions
                sessions = row['sessions_count'] if row['sessions_count'] else 0
                self.table.setItem(i, 3, QTableWidgetItem(str(sessions)))

                # Alignment
                for col in range(4):
                    self.table.item(i, col).setTextAlignment(Qt.AlignCenter)

        except Exception as e:
            print(f"Leaderboard Load Error: {e}")

    def showEvent(self, event):
        self.refresh_data()
        super().showEvent(event)
