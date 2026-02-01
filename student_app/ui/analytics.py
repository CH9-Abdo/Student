from PyQt5.QtWidgets import QWidget, QVBoxLayout, QLabel, QFrame
from PyQt5.QtGui import QPainter, QColor, QBrush, QFont
from PyQt5.QtCore import Qt, QRectF
from student_app.database import get_study_stats
import random

class PieChart(QWidget):
    def __init__(self, data):
        super().__init__()
        self.data = data # List of (label, value)
        self.setMinimumSize(300, 300)
        self.colors = [
            QColor("#007bff"), QColor("#28a745"), QColor("#dc3545"), 
            QColor("#ffc107"), QColor("#17a2b8"), QColor("#6610f2"),
            QColor("#fd7e14"), QColor("#20c997"), QColor("#e83e8c")
        ]

    def set_data(self, data):
        self.data = data
        self.update()

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        
        rect = self.rect()
        size = min(rect.width(), rect.height()) - 40
        x = (rect.width() - size) / 2
        y = (rect.height() - size) / 2
        
        if not self.data:
            painter.drawText(rect, Qt.AlignCenter, "No Data Available")
            return

        total = sum(value for _, value in self.data)
        if total == 0:
            painter.drawText(rect, Qt.AlignCenter, "No Study Time Logged Yet")
            return
            
        start_angle = 90 * 16 # Start at 12 o'clock
        
        # Draw Pie
        for i, (label, value) in enumerate(self.data):
            span_angle = int(-(value / total) * 360 * 16)
            color = self.colors[i % len(self.colors)]
            
            painter.setBrush(QBrush(color))
            painter.setPen(Qt.NoPen)
            painter.drawPie(QRectF(x, y, size, size), start_angle, span_angle)
            
            start_angle += span_angle
            
        # Draw Legend
        legend_x = 20
        legend_y = rect.height() - (len(self.data) * 25) - 20
        if legend_y < y + size + 20: 
            legend_y = y + size + 20 # Ensure legend doesn't overlap pie
            
        painter.setFont(QFont("Arial", 10))
        for i, (label, value) in enumerate(self.data):
            color = self.colors[i % len(self.colors)]
            percentage = (value / total) * 100
            
            # Draw Color Box
            painter.setBrush(QBrush(color))
            painter.drawRect(legend_x, legend_y + (i * 25), 15, 15)
            
            # Draw Text
            painter.setPen(Qt.black)
            text = f"{label}: {value} mins ({percentage:.1f}%)"
            painter.drawText(legend_x + 25, legend_y + (i * 25) + 12, text)

class Analytics(QWidget):
    def __init__(self):
        super().__init__()
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout()
        layout.setContentsMargins(30, 30, 30, 30)
        
        header = QLabel("Study Analytics")
        header.setStyleSheet("font-size: 24px; font-weight: bold; color: #2c3e50;")
        layout.addWidget(header)
        
        sub_header = QLabel("Time Spent per Subject (Minutes)")
        sub_header.setStyleSheet("font-size: 16px; color: #7f8c8d;")
        layout.addWidget(sub_header)
        
        # Chart Container
        chart_frame = QFrame()
        chart_frame.setStyleSheet("background: white; border-radius: 10px; border: 1px solid #dee2e6;")
        chart_layout = QVBoxLayout(chart_frame)
        
        self.chart = PieChart([])
        chart_layout.addWidget(self.chart)
        
        layout.addWidget(chart_frame)
        self.setLayout(layout)
        
    def refresh_data(self):
        stats = get_study_stats() # Returns [(name, minutes), ...]
        # Convert sqlite Row objects to tuples if needed, though fetchall usually gives tuples or rows
        # get_study_stats returns list of Rows, need to access by index or key
        formatted_data = []
        for row in stats:
            formatted_data.append((row['name'], row['total_minutes']))
            
        self.chart.set_data(formatted_data)
