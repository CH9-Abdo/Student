# Student Study Manager 🎓 (Cloud-Powered)

A comprehensive desktop application designed to help university students manage their academic life. It allows for tracking subjects, planning study chapters, and maintaining a high-focus study routine with gamified elements, now featuring **Cloud Synchronization**.

## 🚀 Key Features

### 1. ☁️ Cloud Synchronization & Multi-Device Support (New!)

- **Sync Anywhere:** Your study progress, subjects, and XP are now stored in the cloud using **Supabase**.
- **User Accounts:** Secure Login and Signup system to protect your personal study data.
- **Offline Fallback:** If you're not logged in, the app automatically switches to a local **SQLite** database.
- **Real-time Updates:** Changes made on one device are instantly available on others.

### 2. 🍅 Configurable Pomodoro Timer & Smart Suggestions

- **Focused Study:** Adjustable work, short break, and long break intervals (default 25/5/15).
- **Smart Priority:** Automatically suggests the most important task based on upcoming exams.
- **Task Suggestions:** Specifically tells you whether to focus on **Videos** or **Exercises** for the next incomplete chapter.
- **Lo-Fi Audio:** Integrated background focus music (Lo-Fi/Rain) to improve concentration.

### 3. 🎮 Gamification & Streak Logic

- **Study Streak:** Real-time tracking of consecutive study days to maintain consistency.
- **Earn XP:** Gain 50 XP for every completed study session.
- **Level Up:** Progress through student ranks as you accumulate XP.
- **Audio Feedback:** Celebratory sound effects for starting, finishing, and leveling up.

### 4. 📊 Advanced Study Analytics

- **Visual Data Distribution:** Modern Pie Charts visualizing time spent per subject.
- **Semester Comparison:** Compare total study effort across different semesters with bar charts.
- **Daily Progress:** Track your study consistency over the last 7 days.

### 5. 🌍 Localization, Theme & Notifications

- **Multi-language Support:** Fully localized in **English**, **Arabic** (with RTL support), and **French**.
- **Dark & Light Mode:** Aesthetic theme switching to match your workspace environment.
- **Desktop Notifications:** System-native alerts for timer completion and upcoming deadlines.

## 🛠️ Technology Stack

- **Language:** Python 3
- **GUI Framework:** PyQt5
- **Cloud Backend:** Supabase (PostgreSQL + Auth)
- **Audio Engine:** Pygame (Cross-platform audio mixer)
- **Database:** SQLite (Local fallback)

## 📦 Installation & Setup

1. **Clone the repository:**
   
   ```bash
   git clone <repository-url>
   cd student-study-manager
   ```

2. **Create a Virtual Environment (Recommended):**
   
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Linux/macOS
   # venv\Scripts\activate   # On Windows
   ```

3. **Install Dependencies:**
   
   ```bash
   pip install PyQt5 pygame supabase python-dotenv
   ```

4. **Configure Supabase Cloud (Mandatory for Sync):**
   
   - Create a project on [Supabase.com](https://supabase.com).
   - Follow the instructions in `supabase_setup_guide.txt` to create your tables.
   - Create a file named `.env` in the root directory and add your credentials:
     
     ```env
     SUPABASE_URL="your-project-url"
     SUPABASE_KEY="your-anon-key"
     ```

## ▶️ How to Run

Ensure your virtual environment is active, then run:

```bash
export PYTHONPATH=$PYTHONPATH:.  # On Linux/macOS
python3 student_app/main.py
```

## 📂 New Project Structure

```
student_app/
├── auth_manager.py   # Cloud Authentication logic (Supabase)
├── database.py       # Dual-mode data logic (SQLite + Supabase)
├── sound_manager.py  # Audio handling
├── main.py           # App entry point with Login Check
└── ui/
    ├── login.py      # New Login & Signup interface
    ├── dashboard.py  # Overview and quick to-dos
    ├── planner.py    # Subject and semester organization
    └── ...
.env                  # API Credentials (Private)
supabase_setup_guide.txt # Step-by-step SQL setup guide
student_data.db       # Local SQLite storage
```

## 📝 License

This project is open-source and free to use for students worldwide.
By Chenoufi Abderrahmane
