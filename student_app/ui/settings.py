from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton, QFileDialog, QMessageBox, QGroupBox, QComboBox
)
import os
import shutil
from student_app.settings import get_db_path, set_db_path, get_language, set_language
from student_app.ui.translations import TRANSLATIONS

class SettingsTab(QWidget):
    def __init__(self):
        super().__init__()
        self.lang = get_language()
        self.texts = TRANSLATIONS.get(self.lang, TRANSLATIONS["English"])
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout()
        
        # Language Settings Group
        lang_group = QGroupBox(self.texts["language"])
        lang_layout = QVBoxLayout()
        
        self.lang_combo = QComboBox()
        self.lang_combo.addItems(["English", "Arabic", "French"])
        self.lang_combo.setCurrentText(self.lang)
        self.lang_combo.currentTextChanged.connect(self.change_language)
        lang_layout.addWidget(self.lang_combo)
        lang_group.setLayout(lang_layout)
        layout.addWidget(lang_group)

        # Database Settings Group
        db_group = QGroupBox(self.texts["database_sync"])
        db_layout = QVBoxLayout()
        
        db_layout.addWidget(QLabel(self.texts["current_db"] + ":"))
        self.path_label = QLabel(get_db_path())
        self.path_label.setStyleSheet("font-weight: bold; color: #2980b9; padding: 5px; border: 1px solid #bdc3c7; border-radius: 4px;")
        db_layout.addWidget(self.path_label)
        
        info_label = QLabel(
            "To sync your data across computers, move your database file to a folder synced by Google Drive, Dropbox, or OneDrive.\n" 
            "Then, select that file location below on each computer."
        )
        info_label.setWordWrap(True)
        info_label.setStyleSheet("color: #7f8c8d; font-style: italic;")
        db_layout.addWidget(info_label)
        
        btn_layout = QHBoxLayout()
        
        self.change_btn = QPushButton(self.texts["change_db"])
        self.change_btn.clicked.connect(self.change_db_location)
        btn_layout.addWidget(self.change_btn)
        
        self.move_btn = QPushButton(self.texts["move_db"])
        self.move_btn.clicked.connect(self.move_db_location)
        btn_layout.addWidget(self.move_btn)
        
        db_layout.addLayout(btn_layout)
        db_group.setLayout(db_layout)
        
        layout.addWidget(db_group)
        layout.addStretch()
        
        self.setLayout(layout)

    def change_language(self, lang):
        set_language(lang)
        QMessageBox.information(self, self.texts["success"], self.texts["restart_msg"])

    def change_db_location(self):
        file_path, _ = QFileDialog.getOpenFileName(self, "Select Database File", "", "SQLite Database (*.db);;All Files (*)")
        if file_path:
            set_db_path(file_path)
            self.path_label.setText(file_path)
            QMessageBox.information(self, self.texts["success"], "Database location updated! Please restart the application to ensure all connections are reset.")

    def move_db_location(self):
        current_path = get_db_path()
        if not os.path.exists(current_path):
             QMessageBox.warning(self, self.texts["error"], "Current database file not found.")
             return

        folder_path = QFileDialog.getExistingDirectory(self, "Select New Folder for Database")
        if folder_path:
            new_path = os.path.join(folder_path, "student_data.db")
            
            if os.path.exists(new_path):
                ret = QMessageBox.question(self, "File Exists", "A database file already exists in this folder. Overwrite it?", QMessageBox.Yes | QMessageBox.No)
                if ret == QMessageBox.No:
                    return
            
            try:
                shutil.copy2(current_path, new_path)
                set_db_path(new_path)
                self.path_label.setText(new_path)
                QMessageBox.information(self, self.texts["success"], f"Database moved to {new_path}.\nLocation updated successfully!")
            except Exception as e:
                QMessageBox.critical(self, self.texts["error"], f"Failed to move database: {str(e)}")
