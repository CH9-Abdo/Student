STYLESHEET = """
QMainWindow {
    background-color: #f0f2f5;
}

QWidget {
    color: #212529;
    font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif;
    font-size: 14px;
}

QTabWidget::pane {
    border: 1px solid #dee2e6;
    background: #ffffff;
    border-radius: 8px;
}

QTabBar::tab {
    background: #e9ecef;
    border: 1px solid #dee2e6;
    padding: 10px 25px;
    margin-right: 4px;
    border-top-left-radius: 6px;
    border-top-right-radius: 6px;
    color: #495057;
}

QTabBar::tab:selected {
    background: #ffffff;
    color: #000000;
    border-bottom-color: #ffffff;
    font-weight: bold;
}

QGroupBox {
    border: 1px solid #ced4da;
    border-radius: 8px;
    margin-top: 25px;
    font-weight: bold;
    background-color: #ffffff;
}

QGroupBox::title {
    subcontrol-origin: margin;
    left: 15px;
    padding: 0 5px;
    color: #28a745;
}

QLineEdit, QComboBox, QDoubleSpinBox, QSpinBox, QListWidget, QTextEdit {
    background-color: #ffffff;
    border: 1px solid #ced4da;
    border-radius: 6px;
    padding: 8px;
    color: #212529;
}

QLineEdit:focus, QComboBox:focus, QDoubleSpinBox:focus, QListWidget:focus {
    border: 1px solid #28a745;
    outline: none;
}

QPushButton {
    background-color: #28a745;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    font-weight: bold;
}

QPushButton:hover {
    background-color: #218838;
}

QPushButton:pressed {
    background-color: #1e7e34;
}

QPushButton#primaryButton {
    background-color: #007bff;
}

QPushButton#primaryButton:hover {
    background-color: #0069d9;
}

QPushButton#dangerButton {
    background-color: #dc3545;
}

QPushButton#dangerButton:hover {
    background-color: #c82333;
}

QTableWidget {
    background-color: #ffffff;
    gridline-color: #dee2e6;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    selection-background-color: #e8f5e9;
    selection-color: #212529;
}

QProgressBar {
    border: 1px solid #ced4da;
    border-radius: 10px;
    text-align: center;
    background-color: #e9ecef;
    color: #212529;
    font-weight: bold;
}

QProgressBar::chunk {
    background-color: #28a745;
    border-radius: 9px;
}

QLabel#headerLabel {
    font-size: 22px;
    font-weight: bold;
    color: #28a745;
    margin-bottom: 15px;
}
"""

DARK_STYLESHEET = """
QMainWindow {
    background-color: #1a1a1b;
}

QWidget {
    color: #e1e1e1;
    background-color: transparent;
    font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
}

QTabWidget::pane {
    border: 1px solid #333333;
    background: #272729;
    border-radius: 8px;
}

QTabBar::tab {
    background: #1a1a1b;
    border: 1px solid #333333;
    padding: 10px 25px;
    margin-right: 4px;
    border-top-left-radius: 6px;
    border-top-right-radius: 6px;
    color: #a0a0a0;
}

QTabBar::tab:selected {
    background: #272729;
    color: #ffffff;
    border-bottom-color: #272729;
    font-weight: bold;
}

QGroupBox {
    border: 1px solid #444444;
    border-radius: 8px;
    margin-top: 25px;
    font-weight: bold;
    background-color: #272729;
}

QGroupBox::title {
    subcontrol-origin: margin;
    left: 15px;
    padding: 0 5px;
    color: #4ade80;
}

QLineEdit, QComboBox, QDoubleSpinBox, QSpinBox, QListWidget, QTextEdit, QScrollArea {
    background-color: #333335;
    border: 1px solid #444444;
    border-radius: 6px;
    padding: 8px;
    color: #e1e1e1;
}

QScrollArea {
    border: none;
}

QLineEdit:focus, QComboBox:focus, QDoubleSpinBox:focus, QListWidget:focus {
    border: 1px solid #4ade80;
    outline: none;
}

QPushButton {
    background-color: #22c55e;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    font-weight: bold;
}

QPushButton:hover {
    background-color: #16a34a;
}

QPushButton#primaryButton {
    background-color: #3b82f6;
}

QPushButton#dangerButton {
    background-color: #ef4444;
}

QProgressBar {
    border: 1px solid #444444;
    border-radius: 10px;
    text-align: center;
    background-color: #333335;
    color: #ffffff;
    font-weight: bold;
}

QProgressBar::chunk {
    background-color: #22c55e;
    border-radius: 9px;
}

QLabel#headerLabel {
    font-size: 22px;
    font-weight: bold;
    color: #4ade80;
    margin-bottom: 15px;
}

QFrame#challengeBanner {
    background-color: #1e3a8a !important;
    border: 1px solid #3b82f6 !important;
}

QComboBox QAbstractItemView {
    background-color: #333335;
    color: #e1e1e1;
    selection-background-color: #22c55e;
}
"""