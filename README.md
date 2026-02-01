# Student Study Manager 🎓

A comprehensive desktop application designed to help university students manage their academic life. It allows for tracking subjects, planning study chapters, calculating GPA, and maintaining a high-focus study routine with gamified elements.

## 🚀 Key Features

### 1. 🍅 Pomodoro Timer & Smart Suggestions
- **Focused Study:** Standard 25/5/15 Pomodoro intervals to maintain peak productivity.
- **Smart Priority:** Automatically suggests the most important task based on:
  1. **Upcoming Exams:** Prioritizes subjects with deadlines in the next 7 days.
  2. **Coefficients:** Prioritizes high-weight subjects.
- **Task Suggestions:** Specifically tells you whether to focus on **Videos** or **Exercises** for the next incomplete chapter.
- **Lo-Fi Audio:** Integrated background focus music (Lo-Fi/Rain) to improve concentration.

### 2. 🎮 Gamification (XP & Leveling)
- **Earn XP:** Gain 50 XP for every completed study session.
- **Level Up:** Progress through student ranks as you accumulate XP.
- **Challenges:** Daily goals like "Focus on [High Coef Subject] for 2 sessions" to keep you engaged.
- **Audio Feedback:** Celebratory sound effects for starting, finishing, and leveling up.

### 3. 📊 Study Analytics
- **Visual Data:** A dedicated Analytics tab with a **Pie Chart** visualizing time spent per subject.
- **Reality Check:** Track exactly where your time goes to ensure you aren't neglecting difficult subjects.

### 4. 📝 Subject Management & Notes
- **Detailed Planning:** Add subjects with module types, coefficients, and exam dates.
- **Dedicated Notes:** A built-in notepad for every subject to store formulas, summaries, and key points directly in the database.
- **Chapter Tracking:** Break down every subject into chapters with sub-tasks (Video/Exercises).

### 5. 🧮 Grade Calculator
- **Automated GPA:** Calculate your semester average and total earned credits instantly.
- **Module Weights:** Handles multiple grading systems (TD/TP/Exam combinations).

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
    ├── calculator.py # GPA and grade calculations
    ├── pomodoro.py   # Timer logic, XP system, and smart suggestions
    ├── analytics.py  # Data visualization and charts
    ├── subject_window.py # Chapter management and notes
    └── styles.py     # Global application styling
run.py                # Main entry point
student_data.db       # Persistent SQLite storage
```

## 📝 License
This project is open-source and free to use.