from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QFrame, 
    QScrollArea, QGridLayout, QComboBox
)
from PyQt5.QtGui import QPainter, QColor, QBrush, QFont, QPen
from PyQt5.QtCore import Qt, QRectF
from student_app.database import get_detailed_stats, get_all_semesters, get_semester_comparison_stats
from student_app.settings import get_theme, get_language
from student_app.ui.styles import PALETTE
from student_app.ui.translations import TRANSLATIONS

class AnalyticsCard(QFrame):
    def __init__(self, title):
        super().__init__()
        self.setObjectName("card")
        self.layout = QVBoxLayout(self)
        self.label = QLabel(title, objectName="h2")
        self.layout.addWidget(self.label)
        self.setMinimumHeight(350)

    def set_title(self, title):
        self.label.setText(title)

class ModernPieChart(QWidget):
    def __init__(self, theme="Light"):
        super().__init__()
        self.data = []
        self.theme = theme
        self.colors = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

    def set_data(self, data):
        self.data = data
        self.update()

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        
        total = sum([v for _, v in self.data])
        if not self.data or total == 0:
            painter.drawText(self.rect(), Qt.AlignCenter, "No data available")
            return
            
        size = min(self.width(), self.height()) - 100
        rect = QRectF((self.width()-size)/2, (self.height()-size)/2, size, size)
        
        start_angle = 90 * 16
        for i, (label, val) in enumerate(self.data):
            if val == 0: continue
            span_angle = int(-(val / total) * 360 * 16)
            painter.setBrush(QBrush(QColor(self.colors[i % len(self.colors)])))
            painter.setPen(QPen(Qt.white if self.theme == "Light" else QColor("#1e293b"), 2))
            painter.drawPie(rect, start_angle, span_angle)
            start_angle += span_angle

class ModernBarChart(QWidget):
    def __init__(self, theme="Light"):
        super().__init__()
        self.data = []
        self.theme = theme
        self.colors = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

    def set_data(self, data):
        self.data = data
        self.update()

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        
        if not self.data:
            painter.drawText(self.rect(), Qt.AlignCenter, "No data available")
            return

        margin_x = 50
        margin_y = 60
        width = self.width() - 2 * margin_x
        height = self.height() - 2 * margin_y
        
        max_val = max([v for _, v in self.data]) if self.data else 0
        if max_val == 0: max_val = 1
        
        bar_count = len(self.data)
        bar_width = (width / bar_count) * 0.6
        spacing = (width / bar_count) * 0.4
        
        p = PALETTE["light"] if self.theme == "Light" else PALETTE["dark"]
        text_color = QColor(p['text'])
        
        for i, (label, val) in enumerate(self.data):
            bar_height = (val / max_val) * height
            x = margin_x + i * (bar_width + spacing) + spacing / 2
            y = self.height() - margin_y - bar_height
            
            # Draw Bar
            painter.setBrush(QBrush(QColor(self.colors[i % len(self.colors)])))
            painter.setPen(Qt.NoPen)
            painter.drawRoundedRect(QRectF(x, y, bar_width, bar_height), 8, 8)
            
            # Draw Value
            painter.setPen(QPen(text_color))
            painter.setFont(QFont('Segoe UI', 9, QFont.Bold))
            painter.drawText(QRectF(x, y - 30, bar_width, 25), Qt.AlignCenter, f"{val}m")
            
            # Draw Label
            painter.setFont(QFont('Segoe UI', 9))
            label_rect = QRectF(x - spacing/2, self.height() - margin_y + 10, bar_width + spacing, 40)
            painter.drawText(label_rect, Qt.AlignHCenter | Qt.AlignTop | Qt.TextWordWrap, label)

class Analytics(QWidget):
    def __init__(self):
        super().__init__()
        self.theme = get_theme()
        self.lang = get_language()
        self.texts = TRANSLATIONS.get(self.lang, TRANSLATIONS["English"])
        self.init_ui()

    def init_ui(self):
        self.main_layout = QVBoxLayout(self)
        self.main_layout.setContentsMargins(30, 30, 30, 30)
        self.main_layout.setSpacing(25)
        
        # Header
        header = QHBoxLayout()
        self.title_label = QLabel(self.texts.get("analytics_explorer", "Analytics Explorer"), objectName="h1")
        header.addWidget(self.title_label)
        header.addStretch()
        
        self.sem_selector = QComboBox()
        self.sem_selector.setFixedWidth(200)
        self.sem_selector.currentIndexChanged.connect(self.refresh_data)
        header.addWidget(self.sem_selector)
        self.main_layout.addLayout(header)
        
        # Scroll Area for Content
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.NoFrame)
        scroll.setStyleSheet("background: transparent;")
        
        scroll_content = QWidget()
        scroll_content.setStyleSheet("background: transparent;")
        self.content_layout = QVBoxLayout(scroll_content)
        self.content_layout.setContentsMargins(0, 0, 0, 0)
        self.content_layout.setSpacing(25)
        
        # Grid for Top Charts
        grid = QGridLayout()
        grid.setSpacing(25)
        
        self.pie_card = AnalyticsCard(self.texts.get("session_distribution", "Session Distribution"))
        self.pie_chart = ModernPieChart(self.theme)
        self.pie_card.layout.addWidget(self.pie_chart)
        grid.addWidget(self.pie_card, 0, 0)
        
        self.time_card = AnalyticsCard(self.texts.get("time_per_subject", "Time Spent per Subject"))
        self.time_list = QVBoxLayout()
        self.time_list.setSpacing(10)
        self.time_card.layout.addLayout(self.time_list)
        self.time_card.layout.addStretch()
        grid.addWidget(self.time_card, 0, 1)
        
        self.content_layout.addLayout(grid)
        
        # Semester Comparison Chart (New)
        self.compare_card = AnalyticsCard(self.texts.get("semester_comparison", "Semester Comparison (Minutes)"))
        self.compare_chart = ModernBarChart(self.theme)
        self.compare_card.layout.addWidget(self.compare_chart)
        self.content_layout.addWidget(self.compare_card)
        
        scroll.setWidget(scroll_content)
        self.main_layout.addWidget(scroll)

    def refresh_data(self):
        # Update text if language changed
        self.lang = get_language()
        self.texts = TRANSLATIONS.get(self.lang, TRANSLATIONS["English"])
        self.title_label.setText(self.texts.get("analytics_explorer", "Analytics Explorer"))
        self.pie_card.set_title(self.texts.get("session_distribution", "Session Distribution"))
        self.time_card.set_title(self.texts.get("time_per_subject", "Time Spent per Subject"))
        self.compare_card.set_title(self.texts.get("semester_comparison", "Semester Comparison (Minutes)"))
        
        sem_id = self.sem_selector.currentData()
        if sem_id is None: return
        
        # Individual Semester Stats
        stats = get_detailed_stats(sem_id)
        
        # Update Pie
        pie_data = [(s['name'], s['session_count']) for s in stats]
        self.pie_chart.set_data(pie_data)
        
        # Update List
        for i in reversed(range(self.time_list.count())): 
            item = self.time_list.itemAt(i)
            if item.widget():
                item.widget().setParent(None)
            
        for s in stats[:5]:
            row = QHBoxLayout()
            row.addWidget(QLabel(s['name']))
            row.addStretch()
            row.addWidget(QLabel(f"{s['total_minutes']} mins", styleSheet="font-weight: bold; color: #6366f1;"))
            w = QWidget()
            w.setLayout(row)
            self.time_list.addWidget(w)
            
        # Comparison Stats
        comp_stats = get_semester_comparison_stats()
        comp_data = [(s['name'], s['total_minutes']) for s in comp_stats]
        self.compare_chart.set_data(comp_data)

    def showEvent(self, event):
        self.refresh_semesters()
        super().showEvent(event)

    def refresh_semesters(self):
        self.sem_selector.blockSignals(True)
        self.sem_selector.clear()
        for s in get_all_semesters():
            self.sem_selector.addItem(s['name'], s['id'])
        self.sem_selector.blockSignals(False)
        self.refresh_data()