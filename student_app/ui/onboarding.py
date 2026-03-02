import os
from PyQt5.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QPushButton, QLabel, 
    QListWidget, QListWidgetItem, QFrame
)
from PyQt5.QtCore import Qt
from student_app.database import apply_template
from student_app.settings import get_language
from student_app.ui.translations import TRANSLATIONS

def parse_templates():
    templates = []
    current_sem = None
    current_sub = None
    
    try:
        path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "templates.txt")
        if not os.path.exists(path): return []
        
        with open(path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("'"): continue
                
                if line.startswith("##"):
                    if current_sem:
                        current_sub = {'name': line[2:].strip(), 'chapters': []}
                        current_sem['subjects'].append(current_sub)
                elif line.startswith("#"):
                    current_sem = {'name': line[1:].strip(), 'subjects': []}
                    templates.append(current_sem)
                elif line.startswith("-"):
                    if current_sub:
                        current_sub['chapters'].append(line[1:].strip())
                elif current_sub: # Chapter without dash
                     current_sub['chapters'].append(line)
        return templates
    except Exception as e:
        print(f"Error parsing templates: {e}")
        return []

class OnboardingDialog(QDialog):
    def __init__(self):
        super().__init__()
        self.lang = get_language()
        self.texts = TRANSLATIONS.get(self.lang, TRANSLATIONS["English"])
        self.selected_template = None
        self.templates = parse_templates()
        
        self.setWindowTitle(self.texts.get("welcome_title", "Welcome to StudentPro!"))
        self.resize(500, 600)
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(20)
        layout.setContentsMargins(30, 30, 30, 30)
        
        # Logo / Title
        logo = QLabel("🎓")
        logo.setAlignment(Qt.AlignCenter)
        logo.setStyleSheet("font-size: 60px;")
        layout.addWidget(logo)
        
        title = QLabel(self.texts.get("welcome_title", "Welcome to StudentPro!"))
        title.setObjectName("h1")
        title.setAlignment(Qt.AlignCenter)
        layout.addWidget(title)
        
        desc = QLabel(self.texts.get("welcome_desc", "Your ultimate study companion is ready. Choose a template to start or create your own."))
        desc.setWordWrap(True)
        desc.setAlignment(Qt.AlignCenter)
        desc.setObjectName("mute")
        layout.addWidget(desc)
        
        # Template List
        self.list_widget = QListWidget()
        self.list_widget.itemClicked.connect(self.on_template_selected)
        for t in self.templates:
            item = QListWidgetItem(f"{t['name']} ({len(t['subjects'])} Subjects)")
            item.setData(Qt.UserRole, t)
            self.list_widget.addItem(item)
        layout.addWidget(self.list_widget)
        
        # Buttons
        btn_layout = QHBoxLayout()
        
        self.skip_btn = QPushButton(self.texts.get("cancel", "Create Custom"))
        self.skip_btn.clicked.connect(self.reject)
        btn_layout.addWidget(self.skip_btn)
        
        self.apply_btn = QPushButton(self.texts.get("welcome_btn", "Apply Template 🚀"))
        self.apply_btn.setObjectName("primaryButton")
        self.apply_btn.setEnabled(False)
        self.apply_btn.clicked.connect(self.handle_apply)
        btn_layout.addWidget(self.apply_btn)
        
        layout.addLayout(btn_layout)

    def on_template_selected(self, item):
        self.selected_template = item.data(Qt.UserRole)
        self.apply_btn.setEnabled(True)

    def handle_apply(self):
        if self.selected_template:
            self.apply_btn.setText("Applying...")
            self.apply_btn.setEnabled(False)
            # Database logic
            apply_template([self.selected_template])
            self.accept()
