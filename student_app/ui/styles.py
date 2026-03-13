
# Modern Design System
PALETTE = {
    "light": {
        "bg": "#f8fafc",
        "sidebar": "#ffffff",
        "card": "#ffffff",
        "text": "#1e293b",
        "text_mute": "#64748b",
        "primary": "#6366f1",
        "primary_hover": "#4f46e5",
        "secondary": "#10b981",
        "accent": "#f59e0b",
        "danger": "#ef4444",
        "border": "#e2e8f0",
        "progress_bg": "#f1f5f9"
    },
    "dark": {
        "bg": "#0f172a",
        "sidebar": "#1e293b",
        "card": "#1e293b",
        "text": "#f8fafc",
        "text_mute": "#94a3b8",
        "primary": "#818cf8",
        "primary_hover": "#6366f1",
        "secondary": "#34d399",
        "accent": "#fbbf24",
        "danger": "#f87171",
        "border": "#334155",
        "progress_bg": "#334155"
    }
}

def get_stylesheet(theme="Light"):
    p = PALETTE["light"] if theme == "Light" else PALETTE["dark"]
    
    return f"""
    QMainWindow, QWidget#mainContainer {{
        background-color: {p['bg']};
    }}

    QWidget {{
        color: {p['text']};
        font-family: 'Segoe UI', 'Roboto', 'DejaVu Sans', 'Noto Color Emoji', 'Helvetica Neue', Arial, sans-serif;
        font-size: 14px;
    }}

    /* Sidebar Styling */
    QFrame#sidebar {{
        background-color: {p['sidebar']};
        border-right: 1px solid {p['border']};
    }}

    QPushButton#navButton {{
        background-color: transparent;
        color: {p['text_mute']};
        text-align: left;
        padding: 12px 20px;
        border-radius: 10px;
        font-weight: 500;
        margin: 4px 10px;
        border: none;
    }}

    QPushButton#navButton:hover {{
        background-color: {p['progress_bg']};
        color: {p['text']};
    }}

    QPushButton#navButton[active="true"] {{
        background-color: {p['primary']}15;
        color: {p['primary']};
        border: 1px solid {p['primary']}30;
    }}

    /* Card Styling */
    QGroupBox, QFrame#card {{
        background-color: {p['card']};
        border: 1px solid {p['border']};
        border-radius: 16px;
        padding: 15px;
    }}
    
    QGroupBox::title {{
        subcontrol-origin: margin;
        left: 20px;
        padding: 0 5px;
        color: {p['primary']};
        font-weight: bold;
    }}

    /* Inputs */
    QLineEdit, QComboBox, QSpinBox, QDoubleSpinBox, QDateEdit, QTextEdit {{
        background-color: {p['card']};
        border: 1px solid {p['border']};
        border-radius: 10px;
        padding: 10px;
        color: {p['text']};
    }}

    QLineEdit:focus, QComboBox:focus {{
        border: 2px solid {p['primary']};
    }}

    /* Buttons */
    QPushButton {{
        background-color: {p['primary']};
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 10px;
        font-weight: 600;
    }}

    QPushButton:hover {{
        background-color: {p['primary_hover']};
    }}

    QPushButton#secondaryButton {{
        background-color: {p['secondary']};
    }}

    QPushButton#dangerButton {{
        background-color: {p['danger']};
    }}

    /* Progress Bar */
    QProgressBar {{
        border: none;
        background-color: {p['progress_bg']};
        border-radius: 8px;
        text-align: center;
        height: 12px;
        font-weight: bold;
    }}

    QProgressBar::chunk {{
        background-color: {p['primary']};
        border-radius: 8px;
    }}

    /* Lists */
    QListWidget {{
        background-color: transparent;
        border: none;
        outline: none;
    }}

    QListWidget::item {{
        background-color: {p['card']};
        border: 1px solid {p['border']};
        border-radius: 12px;
        padding: 12px;
        margin-bottom: 8px;
    }}

    QListWidget::item:selected {{
        border: 2px solid {p['primary']};
        background-color: {p['primary']}05;
        color: {p['text']};
    }}

    QLabel#h1 {{
        font-size: 28px;
        font-weight: 800;
        color: {p['text']};
    }}

    QLabel#h2 {{
        font-size: 20px;
        font-weight: 700;
        color: {p['text']};
    }}

    QLabel#mute {{
        color: {p['text_mute']};
    }}
    """

# Backward compatibility (can be removed later)
STYLESHEET = get_stylesheet("Light")
DARK_STYLESHEET = get_stylesheet("Dark")
