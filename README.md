# Student Study Manager 🎓

A comprehensive desktop application designed to help university students manage their academic life. It allows for tracking subjects, planning study chapters, and maintaining a high-focus study routine with gamified elements.

## 🚀 Key Features

### 1. 🍅 Configurable Pomodoro Timer & Smart Suggestions
- **Focused Study:** Adjustable work, short break, and long break intervals (default 25/5/15) via settings.
- **Smart Priority:** Automatically suggests the most important task based on upcoming exams.
- **Task Suggestions:** Specifically tells you whether to focus on **Videos** or **Exercises** for the next incomplete chapter.
- **Lo-Fi Audio:** Integrated background focus music (Lo-Fi/Rain) to improve concentration.

### 2. 🎮 Gamification & Streak Logic
- **Study Streak:** Real-time tracking of consecutive study days to maintain consistency.
- **Earn XP:** Gain 50 XP for every completed study session.
- **Level Up:** Progress through student ranks as you accumulate XP.
- **Audio Feedback:** Celebratory sound effects for starting, finishing, and leveling up.

### 3. 📊 Advanced Study Analytics
- **Visual Data Distribution:** Dedicated Analytics tab with a **Modern Pie Chart** visualizing time spent per subject.
- **Semester Comparison:** Compare total study effort across different semesters with bar charts.
- **Daily Progress:** Track your study consistency over the last 7 days.
- **Weekly Trends:** Visualize your study habits over the past 8 weeks to identify long-term patterns.
- **Reality Check:** Track exactly where your time goes to ensure you aren't neglecting difficult subjects.

### 4. 🌍 Localization, Theme & Notifications
- **Multi-language Support:** Fully localized in **English**, **Arabic** (with RTL support), and **French**.
- **Dark & Light Mode:** Aesthetic theme switching to match your workspace environment.
- **Desktop Notifications:** System-native alerts for timer completion and upcoming deadlines (exams and chapter due dates).

### 5. 📝 Subject Management & Chapter Scheduling
- **Detailed Planning:** Add subjects with exam and test dates.
- **Chapter Due Dates:** Assign specific deadlines to individual chapters for granular tracking.
- **Dedicated Notes:** A built-in notepad for every subject to store formulas, summaries, and key points directly in the database.
- **Chapter Tracking:** Break down every subject into chapters with sub-tasks (Video/Exercises).

## 🛠️ Technology Stack
- **Language:** Python 3
- **GUI Framework:** PyQt5
- **Audio Engine:** Pygame (Cross-platform audio mixer)
- **Database:** SQLite (Built-in persistence)

## 📦 Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd student-study-manager
   ```

2. **Install Dependencies:**
   Ensure you have Python installed. Then install the required libraries:
   ```bash
   pip install PyQt5 pygame
   ```

## ▶️ How to Run

Execute the `run.py` script from the project root:

```bash
python run.py
```

## 📂 Project Structure

```
student_app/
├── database.py       # Database schema and business logic
├── sound_manager.py  # Pygame-powered audio handling
├── main.py           # Application entry and tab navigation
└── ui/
    ├── dashboard.py  # Overview and quick to-dos
    ├── planner.py    # Subject and semester organization
    ├── pomodoro.py   # Timer logic, XP system, and smart suggestions
    ├── analytics.py  # Data visualization and charts
    ├── subject_window.py # Chapter management and notes
    └── styles.py     # Global application styling
run.py                # Main entry point
student_data.db       # Persistent SQLite storage
```

## 📦 Distribution (Create Executable)

To create a standalone executable for easy sharing:

1. Install PyInstaller:
   ```bash
   pip install pyinstaller
   ```

2. Run the build command:
   ```bash
   pyinstaller run.spec
   ```

3. The executable will be created in the `dist/` folder.

## 📝 License
This project is open-source and free to use for students worldwide.
By Chenoufi Abderrahmane
