# Student Study Manager 🎓

**A Professional Full-Stack Study Companion (Python + Web + Android + Cloud Sync)**

Student Study Manager is a powerful, cross-platform productivity tool designed to help university and high school students organize their academic life. It combines a high-performance Python desktop application with a modern, offline-ready mobile web app, all synchronized via Supabase.

---

## ✨ Key Features

### 1. 🖥️ Desktop Application (Python & PyQt5)

- **Advanced UI:** Beautiful, modern interface with Light/Dark mode support.
- **Study Planner:** Manage semesters, subjects, and chapters with ease.
- **Smart Progress:** Track chapter completion (Course vs. Exercises).
- **Pomodoro Timer:** Built-in focus timer with XP and Leveling system.
- **Study Suggestions:** Tells you exactly what to study next.

### 2. 📱 Mobile-Optimized & 100% Offline (Capacitor)

- **Native Experience:** Responsive bottom navigation bar and mobile-friendly layouts.
- **Modular CSS Architecture:** Organized styles for easier maintenance and faster updates.
- **100% Offline-First:** Every script, font, and icon is bundled locally. Works perfectly in Airplane Mode.
- **Work Offline Button:** Access the app without a cloud account for local-only study.
- **Native Integration:** Custom Status Bar and Splash Screen for a professional look.
- **Smart Templates:** Instantly create semesters from templates with specialization support (BAC Sciences, BAC Math, etc.).

### 3. ☁️ Cloud Power (Supabase)

- **Hybrid Sync:** Seamless transition between Desktop and Web/Android.
- **Weekly Challenge:** Compete with other students globally.
- **Security:** Protected user data with Row Level Security (RLS).

---

## 🛠️ Tech Stack

- **Frontend:** Python (PyQt5), HTML5, Vanilla CSS3, JavaScript.
- **Mobile Wrapper:** [Capacitor.js](https://capacitorjs.com/).
- **Backend:** Supabase (PostgreSQL + Auth).
- **Offline Storage:** LocalStorage + Capacitor Preferences.

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Node.js (for mobile build)
- Supabase account

### Installation

1. Clone the repository:
   
   ```bash
   git clone https://github.com/yourusername/Student.git
   cd Student
   ```
2. Setup Python environment:
   
   ```bash
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
3. Install Web/Mobile dependencies:
   
   ```bash
   npm install
   ```

### Running the App

- **Desktop:** `python run.py`
- **Web:** Open `webversion/index.html` (Use a local server for icons/fonts to load correctly in browsers like Firefox).
  
  

---

## 📦 Building the Android APK

The mobile version is optimized for building with Capacitor.

1. **Sync the project:**
   
   ```bash
   # IMPORTANT: Run this every time you change web files
   npx cap sync
   ```
2. **Open in Android Studio:**
   
   ```bash
   npx cap open android
   ```
3. **Build APK:** Inside Android Studio, go to `Build > Build Bundle(s) / APK(s) > Build APK(s)`.

*The resulting APK is 100% offline-ready, loading all libraries (Supabase, Chart.js, etc.) from local storage.*

---

## 🏆 Weekly Study Challenge

To enable the leaderboard, run the SQL commands found in `docs/supabase_codes.sql` inside your Supabase SQL Editor.

---

## 📂 Project Structure

- `student_app/`: Main Python logic and UI components.
- `webversion/`: The official mobile-responsive version.
  - `css/`: Modular stylesheets (`main.css`, `planner.css`, etc.).
  - `assets/vendor/`: Localized copies of all external libraries for offline use.
- `docs/`: Documentation, setup guides, and SQL codes.
- `scripts/`: Automation and build scripts.

---

## 📝 License & Author

Developed by **Chenoufi Abderrahmane**.  
Open-source and free to use for students worldwide.
