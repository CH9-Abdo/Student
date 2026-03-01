# Student Study Manager 🎓 (Cloud-Powered)

A comprehensive application designed to help university students manage their academic life. It allows for tracking subjects, planning study chapters, and maintaining a high-focus study routine with gamified elements, featuring **Full Cloud Synchronization**.

## 🚀 Key Features

### 1. ☁️ Cloud Synchronization & Multi-Device Support

- **Sync Anywhere:** Your study progress, subjects, and XP are stored in the cloud using **Supabase**.
- **User Accounts:** Secure Login and Signup system to protect your personal study data.
- **Web Version:** Access your studies from any browser via the integrated **Web Version**.
- **Flexible Sync Modes:** 
    - **Automatic:** Changes are saved to the cloud instantly.
    - **Manual:** Take full control by using the **Upload** and **Download** buttons in Settings.

### 2. 🍅 Configurable Pomodoro Timer & Smart Suggestions

- **Focused Study:** Adjustable work, short break, and long break intervals.
- **Smart Priority:** Automatically suggests the most important task based on upcoming exams.
- **Task Suggestions:** Specifically tells you whether to focus on **Videos** or **Exercises**.
- **Lo-Fi Audio:** Integrated background focus music (Lo-Fi, Rain, Nature).

### 3. 🎮 Gamification & Streak Logic

- **Study Streak:** Real-time tracking of consecutive study days.
- **Earn XP:** Gain XP for every completed study session.
- **Level Up:** Progress through student ranks as you accumulate XP.

### 4. 📊 Advanced Study Analytics

- **Visual Data Distribution:** Modern Pie/Doughnut Charts visualizing time spent per subject.
- **Progress Tracking:** Monitor course completion and exam countdowns.

### 5. 🌍 Localization & Theme

- **Multi-language Support:** Fully localized in **English**, **Arabic** (with RTL support), and **French**.
- **Dark & Light Mode:** Aesthetic theme switching for all environments.

## 🛠️ Technology Stack

- **Desktop:** Python 3 + PyQt5
- **Web:** HTML5, CSS3, JavaScript (ES6)
- **Cloud Backend:** Supabase (PostgreSQL + Auth)
- **Audio Engine:** Pygame (Desktop) / Web Audio API
- **Database:** SQLite (Desktop Local Cache)

## 📦 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd student-study-manager
   ```

2. **Python Environment Setup:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install PyQt5 pygame supabase python-dotenv
   ```

3. **Supabase Configuration:**
   - Follow `supabase_setup_guide.txt` to set up your database.
   - Configure your `.env` file with `SUPABASE_URL` and `SUPABASE_KEY`.

## ▶️ How to Run

### Desktop Version
```bash
python3 run.py
```

### Web Version
Simply open `webversion/index.html` in your browser or run a local server:
```bash
python3 -m http.server 8000
```

## 📂 Project Structure

```
student_app/          # Python Desktop Source
webversion/           # Web Version Source (HTML/CSS/JS)
├── assets/           # Shared Sound Assets
├── auth.js           # Web Auth Logic
├── db.js             # Web Sync Engine
└── app.js            # Web UI Controller
run.py                # Desktop Entry Point
README.md             # This guide
```

## 📝 License
This project is open-source and free to use for students worldwide.
By Chenoufi Abderrahmane
