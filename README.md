# Student Study Manager

A comprehensive desktop application designed to help university students manage their academic life. It allows for tracking subjects, planning study chapters, and calculating semester GPAs with ease.

## 🚀 Features

### 1. Dashboard
- **Progress Tracking:** Visual progress bar showing the percentage of completed chapters across all subjects.
- **To-Do List:** Displays a list of pending chapters ("Up Next") to help you focus on what needs to be studied.

### 2. Study Planner
- **Semester Management:** Create and delete semesters to organize your academic years.
- **Subject Management:**
  - Add subjects with specific details:
    - **Name**
    - **Module Type:**
      - **Type A:** TD (40%) + Exam (60%)
      - **Type B:** (TD + TP) / 2 (40%) + Exam (60%)
      - **Type C:** Exam (100%)
    - **Coefficient**
    - **Credits**
  - Delete subjects (cascades to chapters).
- **Chapter Management:**
  - Break down subjects into chapters.
  - Mark chapters as completed or pending.
  - **Delete Chapters:** Remove chapters if plans change.

### 3. Grade Calculator
- **Semester-Based Calculation:** Select a semester to view its subjects.
- **Grade Entry:** Input scores for TD, TP, and Exams based on the module type.
- **Automatic Calculation:** instantly calculates:
  - **Module Averages** (based on the specific weighting rules).
  - **Semester Average (GPA).**
  - **Total Earned Credits** (for modules with average >= 10).
- **Persistence:** Grades are saved to the database automatically.

## 🛠️ Technology Stack
- **Language:** Python 3
- **GUI Framework:** PyQt5
- **Database:** SQLite (Built-in)

## 📦 Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd student-study-manager
   ```

2. **Install Dependencies:**
   Ensure you have Python installed. Then install the required library:
   ```bash
   pip install PyQt5
   ```

## ▶️ How to Run

Execute the `run.py` script from the project root:

```bash
python run.py
```

## 📂 Project Structure

```
student_app/
├── database.py       # Database connection and CRUD operations
├── main.py           # Main application window setup
└── ui/
    ├── dashboard.py  # Dashboard view logic
    ├── planner.py    # Study Planner view logic
    ├── calculator.py # Grade Calculator view logic
    └── styles.py     # CSS-like styling for the application
run.py                # Entry point script
student_data.db       # SQLite database file (auto-generated)
```

## 📝 License
This project is open-source and free to use.
