from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLineEdit, QPushButton, 
    QLabel, QFrame, QMessageBox, QSpacerItem, QSizePolicy
)
from PyQt5.QtCore import Qt, pyqtSignal
from student_app.auth_manager import AuthManager

class LoginWindow(QWidget):
    login_successful = pyqtSignal(object) # Signal sending the user object

    def __init__(self):
        super().__init__()
        self.auth = AuthManager()
        self.setup_ui()

    def setup_ui(self):
        self.setWindowTitle("Login - StudentPro Sync")
        self.setFixedSize(400, 500)
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(40, 40, 40, 40)
        layout.setSpacing(15)

        # Header
        logo_label = QLabel("🎓")
        logo_label.setAlignment(Qt.AlignCenter)
        logo_label.setStyleSheet("font-size: 48px;")
        layout.addWidget(logo_label)

        title = QLabel("StudentPro Sync")
        title.setAlignment(Qt.AlignCenter)
        title.setStyleSheet("font-size: 24px; font-weight: bold; color: #6366f1;")
        layout.addWidget(title)

        subtitle = QLabel("Sync your studies across devices")
        subtitle.setAlignment(Qt.AlignCenter)
        subtitle.setStyleSheet("color: #64748b; margin-bottom: 20px;")
        layout.addWidget(subtitle)

        # Inputs
        self.email_input = QLineEdit()
        self.email_input.setPlaceholderText("Email Address")
        self.email_input.setStyleSheet("padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;")
        layout.addWidget(self.email_input)

        self.password_input = QLineEdit()
        self.password_input.setPlaceholderText("Password")
        self.password_input.setEchoMode(QLineEdit.Password)
        self.password_input.setStyleSheet("padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;")
        layout.addWidget(self.password_input)

        # Buttons
        self.login_btn = QPushButton("Login")
        self.login_btn.setStyleSheet("""
            QPushButton {
                background-color: #6366f1; color: white; padding: 12px; 
                border-radius: 8px; font-weight: bold;
            }
            QPushButton:hover { background-color: #4f46e5; }
        """)
        self.login_btn.clicked.connect(self.handle_login)
        layout.addWidget(self.login_btn)

        self.signup_btn = QPushButton("Create New Account")
        self.signup_btn.setStyleSheet("color: #6366f1; background: transparent; border: none;")
        self.signup_btn.clicked.connect(self.handle_signup)
        layout.addWidget(self.signup_btn)

        layout.addStretch()

    def handle_login(self):
        email = self.email_input.text()
        password = self.password_input.text()
        
        if not email or not password:
            QMessageBox.warning(self, "Error", "Please fill all fields")
            return

        success, result = self.auth.sign_in(email, password)
        if success:
            self.login_successful.emit(result)
        else:
            QMessageBox.critical(self, "Login Failed", result)

    def handle_signup(self):
        email = self.email_input.text()
        password = self.password_input.text()
        
        if not email or not password:
            QMessageBox.warning(self, "Error", "Please fill all fields")
            return

        success, msg = self.auth.sign_up(email, password)
        if success:
            QMessageBox.information(self, "Success", msg)
        else:
            QMessageBox.critical(self, "Signup Failed", msg)
