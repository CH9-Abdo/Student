
STYLESHEET = """
QMainWindow {
    background-color: #f0f2f5;
}

QWidget {
    color: #212529;
    font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
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

QLineEdit, QComboBox, QDoubleSpinBox, QSpinBox, QListWidget {
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

QTableWidget::item {
    padding: 8px;
}

QHeaderView::section {
    background-color: #f8f9fa;
    padding: 8px;
    border: 1px solid #dee2e6;
    font-weight: bold;
    color: #495057;
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

QCheckBox {
    spacing: 8px;
}

QCheckBox::indicator {
    width: 20px;
    height: 20px;
}

QLabel#headerLabel {
    font-size: 22px;
    font-weight: bold;
    color: #28a745;
    margin-bottom: 15px;
}
"""
