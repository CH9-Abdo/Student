from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QFrame, 
    QScrollArea, QGridLayout, QComboBox
)
from PyQt5.QtGui import QPainter, QColor, QBrush, QFont, QPen
from PyQt5.QtCore import Qt, QRectF
from student_app.database import get_detailed_stats, get_all_semesters, get_semester_comparison_stats

class ChartCard(QFrame):
    def __init__(self, title):
        super().__init__()
        self.setStyleSheet("""
            QFrame {
                background: white;
                border-radius: 15px;
                border: 1px solid #e0e0e0;
            }
        """)
        self.layout = QVBoxLayout(self)
        self.title_label = QLabel(title)
        self.title_label.setStyleSheet("font-size: 16px; font-weight: bold; color: #2c3e50; border: none;")
        self.layout.addWidget(self.title_label)
        self.setMinimumHeight(350)

class ModernBarChart(QWidget):
    def __init__(self):
        super().__init__()
        self.data = [] # (label, value)
        self.colors = ["#4e73df", "#1cc88a", "#36b9cc", "#f6c23e", "#e74a3b", "#858796"]

    def set_data(self, data):
        self.data = data
        self.update()

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        
        if not self.data:
            painter.setPen(QColor("#858796"))
            painter.drawText(self.rect(), Qt.AlignCenter, "No data to display")
            return
            
        padding = 50
        w = self.width() - 2 * padding
        h = self.height() - 2 * padding
        
        max_val = max([v for _, v in self.data]) if self.data else 1
        if max_val <= 0: max_val = 1
        
        bar_count = len(self.data)
        bar_width = (w / bar_count * 0.7) if bar_count > 0 else w
        spacing = (w / bar_count * 0.3) if bar_count > 0 else 0
        
        for i, (label, val) in enumerate(self.data):
            bar_h = (val / max_val) * (h - 30)
            x = padding + i * (bar_width + spacing)
            y = self.height() - padding - bar_h
            
            # Draw Bar
            color = QColor(self.colors[i % len(self.colors)])
            painter.setBrush(QBrush(color))
            painter.setPen(Qt.NoPen)
            painter.drawRoundedRect(QRectF(x, y, bar_width, bar_h), 5, 5)
            
            # Draw Label
            painter.setPen(QColor("#5a5c69"))
            painter.setFont(QFont("Segoe UI", 8))
            display_label = label[:12] + ".." if len(label) > 12 else label
            painter.drawText(QRectF(x - spacing/2, self.height() - padding + 5, bar_width + spacing, 25), Qt.AlignCenter, display_label)
            
            # Draw Value
            painter.drawText(QRectF(x, y - 20, bar_width, 20), Qt.AlignCenter, f"{int(val)}")

class ModernPieChart(QWidget):
    def __init__(self):
        super().__init__()
        self.data = []
        self.colors = ["#4e73df", "#1cc88a", "#36b9cc", "#f6c23e", "#e74a3b", "#858796"]

    def set_data(self, data):
        self.data = data
        self.update()

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        
        total = sum([v for _, v in self.data])
        if not self.data or total == 0:
            painter.setPen(QColor("#858796"))
            painter.drawText(self.rect(), Qt.AlignCenter, "No sessions recorded")
            return
            
        size = min(self.width(), self.height()) - 100
        rect = QRectF((self.width()-size)/2, (self.height()-size)/2, size, size)
        
        start_angle = 90 * 16
        for i, (label, val) in enumerate(self.data):
            if val == 0: continue
            span_angle = int(-(val / total) * 360 * 16)
            color = QColor(self.colors[i % len(self.colors)])
            painter.setBrush(QBrush(color))
            painter.setPen(QPen(Qt.white, 2))
            painter.drawPie(rect, start_angle, span_angle)
            
            # Mini Legend on the chart area side
            painter.setPen(Qt.NoPen)
            painter.drawRect(10, 10 + i*20, 10, 10)
            painter.setPen(QColor("#5a5c69"))
            painter.drawText(25, 20 + i*20, f"{label} ({val})")
            
            start_angle += span_angle

class SummaryCard(QFrame):
    def __init__(self, title, value, color):
        super().__init__()
        self.setStyleSheet(f"""
            QFrame {{
                background: white;
                border-left: 5px solid {color};
                border-radius: 8px;
                padding: 15px;
                border-top: 1px solid #e0e0e0;
                border-right: 1px solid #e0e0e0;
                border-bottom: 1px solid #e0e0e0;
            }}
        """)
        layout = QVBoxLayout(self)
        t = QLabel(title.upper())
        t.setStyleSheet("font-size: 11px; font-weight: bold; color: #4e73df; border: none;")
        v = QLabel(str(value))
        v.setStyleSheet("font-size: 20px; font-weight: bold; color: #2c3e50; border: none;")
        layout.addWidget(t)
        layout.addWidget(v)
        self.value_label = v

class Analytics(QWidget):
    def __init__(self):
        super().__init__()
        self.init_ui()

    def init_ui(self):
        self.main_layout = QVBoxLayout(self)
        self.main_layout.setContentsMargins(0,0,0,0)
        
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("border: none; background-color: #f8f9fc;")
        
        container = QWidget()
        container.setStyleSheet("background-color: #f8f9fc;")
        self.layout = QVBoxLayout(container)
        self.layout.setContentsMargins(25, 25, 25, 25)
        self.layout.setSpacing(25)
        
        # Header Row with Filter
        header_layout = QHBoxLayout()
        header = QLabel("Performance Analytics")
        header.setStyleSheet("font-size: 26px; font-weight: bold; color: #4e73df;")
        
        self.semester_selector = QComboBox()
        self.semester_selector.setFixedWidth(200)
        self.semester_selector.currentIndexChanged.connect(self.on_semester_changed)
        
        header_layout.addWidget(header)
        header_layout.addStretch()
        header_layout.addWidget(QLabel("Filter by Semester:"))
        header_layout.addWidget(self.semester_selector)
        self.layout.addLayout(header_layout)
        
        # Summary Row
        summary_layout = QHBoxLayout()
        self.total_time_card = SummaryCard("Semester Study Time", "0 mins", "#4e73df")
        self.total_sessions_card = SummaryCard("Semester Sessions", "0", "#1cc88a")
        self.avg_session_card = SummaryCard("Avg Session Length", "0 mins", "#36b9cc")
        summary_layout.addWidget(self.total_time_card)
        summary_layout.addWidget(self.total_sessions_card)
        summary_layout.addWidget(self.avg_session_card)
        self.layout.addLayout(summary_layout)
        
        # Charts Grid
        grid = QGridLayout()
        
        self.bar_card = ChartCard("Subject Time Comparison (Minutes)")
        self.bar_chart = ModernBarChart()
        self.bar_card.layout.addWidget(self.bar_chart)
        grid.addWidget(self.bar_card, 0, 0)
        
        self.pie_card = ChartCard("Sessions by Subject")
        self.pie_chart = ModernPieChart()
        self.pie_card.layout.addWidget(self.pie_chart)
        grid.addWidget(self.pie_card, 0, 1)
        
        self.layout.addLayout(grid)
        
        # Global Comparison
        self.global_card = ChartCard("Global Semester Comparison (Total Minutes)")
        self.global_card.setMinimumHeight(300)
        self.global_chart = ModernBarChart()
        self.global_card.layout.addWidget(self.global_chart)
        self.layout.addWidget(self.global_card)
        
        self.layout.addStretch()
        
        scroll.setWidget(container)
        self.main_layout.addWidget(scroll)

    def showEvent(self, event):
        self.refresh_semesters()
        super().showEvent(event)

    def refresh_semesters(self):
        self.semester_selector.blockSignals(True)
        current_id = self.semester_selector.currentData()
        self.semester_selector.clear()
        
        semesters = get_all_semesters()
        for sem in semesters:
            self.semester_selector.addItem(sem['name'], sem['id'])
        
        # Restore selection or pick last
        index = self.semester_selector.findData(current_id)
        if index >= 0:
            self.semester_selector.setCurrentIndex(index)
        elif self.semester_selector.count() > 0:
            self.semester_selector.setCurrentIndex(self.semester_selector.count() - 1)
            
        self.semester_selector.blockSignals(False)
        self.refresh_data()

    def on_semester_changed(self):
        self.refresh_data()

    def refresh_data(self):
        sem_id = self.semester_selector.currentData()
        if sem_id is None: return
        
        stats = get_detailed_stats(sem_id)
        
        # Update Cards
        total_min = sum([s['total_minutes'] for s in stats])
        total_sess = sum([s['session_count'] for s in stats])
        avg_len = round(total_min / total_sess) if total_sess > 0 else 0
        
        self.total_time_card.value_label.setText(f"{total_min} mins")
        self.total_sessions_card.value_label.setText(str(total_sess))
        self.avg_session_card.value_label.setText(f"{avg_len} mins")
        
        # Update Subject Charts
        bar_data = [(s['name'], s['total_minutes']) for s in stats]
        self.bar_chart.set_data(bar_data)
        
        pie_data = [(s['name'], s['session_count']) for s in stats]
        self.pie_chart.set_data(pie_data)
        
        # Update Global Comparison
        global_stats = get_semester_comparison_stats()
        global_data = [(s['name'], s['total_minutes']) for s in global_stats]
        self.global_chart.set_data(global_data)
