# Student Study Manager 🎓
**A Professional Full-Stack Study Companion (Python + Web + Cloud Sync)**

Student Study Manager is a powerful, cross-platform productivity tool designed to help university and high school students organize their academic life. It combines a high-performance Python desktop application with a modern, mobile-responsive web version, all synchronized via Supabase.

---

## ✨ Key Features

### 1. 🖥️ Desktop Application (Python & PyQt5)
- **Advanced UI:** Beautiful, modern interface with Light/Dark mode support.
- **Study Planner:** Manage semesters, subjects, and chapters with ease.
- **Smart Progress:** Track chapter completion (Video vs. Exercises).
- **Pomodoro Timer:** Built-in focus timer with XP and Leveling system.
- **Study Suggestions:** Tells you exactly what to study next.

### 2. 📱 Mobile-Ready Web Version
- **Responsive Design:** Optimized for smartphones and tablets.
- **Bottom Navigation:** App-like experience on mobile browsers.
- **Mirror Sync:** Instant access to your study data anywhere in the world.

### 3. ☁️ Cloud Power (Supabase)
- **Real-time Sync:** seamless transition between Desktop and Web.
- **Leaderboard:** Compete with other students in the weekly study challenge.
- **Security:** Protected user data with Row Level Security (RLS).

---

## 🛠️ Tech Stack
- **Frontend:** Python (PyQt5), HTML5, Vanilla CSS3, JavaScript.
- **Backend/Database:** SQLite (Local), Supabase (Cloud SQL).
- **Audio:** Pygame (Desktop), Web Audio API (Web).

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10 or higher.
- A Supabase project (URL and Anon Key).

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/Student.git
   cd Student
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # OR
   .\venv\Scripts\activate   # Windows
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Setup your environment variables in a `.env` file:
   ```env
   SUPABASE_URL="your_project_url"
   SUPABASE_KEY="your_anon_key"
   ```

### Running the App
- **Desktop:** `python run.py`
- **Web:** Open `webversion/index.html` in any browser or host it on GitHub Pages.

---

## 🏆 Weekly Study Challenge (Leaderboard)
To enable the leaderboard, you must run the SQL commands found in `docs/supabase_codes.sql` inside your Supabase SQL Editor. This will create the necessary views and permissions.

---

## 📦 Building for Windows (.exe)
We have made it easy to bundle the Python application into a single executable file.

### Steps:
1. Open PowerShell/CMD on a **Windows** machine.
2. Install PyInstaller: `pip install pyinstaller`.
3. Run the provided build script:
   ```powershell
   .\scripts\build_windows.bat
   ```
4. Your standalone app will be located in the `dist/` folder named **StudentPro.exe**.

*Note: Ensure your `.env` file is placed in the same folder as the .exe for cloud features to work.*

---

## 📂 Project Structure
- `student_app/`: Main Python logic and UI components.
- `webversion/`: The official web/mobile sync version.
- `docs/`: Documentation, setup guides, and SQL codes.
- `scripts/`: Useful automation and build scripts.
- `templates.txt`: Comprehensive study programs (BAC, ASD, etc.).

---

## 📝 License & Author
Developed by **Chenoufi Abderrahmane**.  
Open-source and free to use for students worldwide.
