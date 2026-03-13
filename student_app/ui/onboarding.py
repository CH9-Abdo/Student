import os
from PyQt5.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QPushButton, QLabel, 
    QListWidget, QListWidgetItem, QFrame, QLineEdit
)
from PyQt5.QtCore import Qt
from student_app.database import apply_template, get_uid, get_supabase
from student_app.settings import get_language, get_app_root
from student_app.ui.translations import TRANSLATIONS

def parse_templates():
    templates = []
    current_sem = None
    current_sub = None
    
    try:
        path = os.path.join(get_app_root(), "templates.txt")
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
                elif current_sub: 
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
        self.resize(500, 650)
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(15)
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
        
        desc = QLabel(self.texts.get("welcome_desc", "Set your name and choose a template to begin."))
        desc.setWordWrap(True)
        desc.setAlignment(Qt.AlignCenter)
        desc.setObjectName("mute")
        layout.addWidget(desc)

        # Name Setup
        layout.addWidget(QLabel("<b>Your Name:</b>"))
        self.name_input = QLineEdit()
        self.name_input.setPlaceholderText("Enter your name...")
        self.name_input.setStyleSheet("font-size: 16px; padding: 10px;")
        layout.addWidget(self.name_input)
        
        layout.addWidget(QLabel("<b>Choose a Template:</b>"))
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
        
        self.skip_btn = QPushButton("Skip / Custom")
        self.skip_btn.clicked.connect(self.handle_skip)
        btn_layout.addWidget(self.skip_btn)
        
        self.apply_btn = QPushButton(self.texts.get("welcome_btn", "Apply & Start 🚀"))
        self.apply_btn.setObjectName("primaryButton")
        self.apply_btn.clicked.connect(self.handle_apply)
        btn_layout.addWidget(self.apply_btn)
        
        layout.addLayout(btn_layout)

    def on_template_selected(self, item):
        self.selected_template = item.data(Qt.UserRole)

    def handle_skip(self):
        self.save_name()
        self.reject()

    def save_name(self):
        name = self.name_input.text().strip()
        uid = get_uid()
        if name and uid:
            try:
                get_supabase().table("user_profile").upsert({
                    "user_id": uid, "display_name": name
                }, on_conflict='user_id').execute()
            except: pass

    def handle_apply(self):
        self.save_name()
        if self.selected_template:
            self.apply_btn.setText("Applying...")
            self.apply_btn.setEnabled(False)
            apply_template([self.selected_template])
            self.accept()
        else:
            self.accept()
