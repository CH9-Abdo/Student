# Student Study Manager 🎓 (Cloud-Powered & Mobile-Ready)

A professional full-stack application designed to help university students manage their academic life. It allows for tracking subjects, planning study chapters, and maintaining a high-focus study routine with gamified elements, featuring **Full Cloud Synchronization** and a **Responsive Web Interface**.

## 🚀 Key Features

### 1. ☁️ Cloud Synchronization & Multi-Device Support
- **Sync Anywhere:** Your study progress, subjects, and XP are stored in the cloud using **Supabase**.
- **User Accounts:** Secure Login and Signup system to protect your personal study data.
- **Web Version:** Access your studies from any browser (Desktop or Mobile).
- **Flexible Sync Modes:** 
    - **Automatic:** Changes are saved to the cloud instantly.
    - **Manual:** Take full control by using the **Upload** and **Download** buttons in Settings.
- **Mirror Logic:** The "Upload" feature performs a clean mirror of your local database to the cloud, preventing duplicates and ensuring data integrity.

### 2. 📱 Mobile Optimized Web Version
- **Responsive Design:** The web version automatically transforms into a mobile app layout on phones.
- **Bottom Navigation:** Easy thumb-access menu for switching tabs on mobile devices.
- **Touch Friendly:** Large buttons and optimized inputs for a smooth mobile experience.

### 3. 🍅 Configurable Pomodoro Timer & Smart Suggestions
- **Focused Study:** Adjustable work, short break, and long break intervals.
- **Smart Priority:** Automatically suggests the most important task based on upcoming exams.
- **Visual Progress:** Circular timer with real-time XP and Level tracking.
- **Lo-Fi Audio:** Integrated background focus music (Lo-Fi, Rain, Nature).

### 4. 🎮 Gamification & Streak Logic
- **Study Streak:** Real-time tracking of consecutive study days.
- **Earn XP:** Gain XP for every completed study session.
- **Level Up:** Progress through student ranks as you accumulate XP (Level = 1 + XP/500).

### 5. 📊 Advanced Study Analytics
- **Data Visualization:** Modern Pie/Doughnut charts for subject time distribution.
- **Consistency Tracking:** Weekly progress bars and completion stats.

## 🛠️ Technology Stack
- **Desktop:** Python 3 + PyQt5
- **Web:** HTML5, CSS3 (Modern Flexbox/Grid), JavaScript (ES6)
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
   - Follow `supabase_setup_guide.txt` to set up your cloud tables.
   - Run the SQL migration commands provided in the guide to allow ID syncing.
   - Create a `.env` file in the root directory:
     ```env
     SUPABASE_URL="your-project-url"
     SUPABASE_KEY="your-anon-key"
     ```

## ▶️ How to Run

### Desktop Version
```bash
python3 run.py
```

### Web Version
Simply open `webversion/index.html` in your browser. For full cloud functionality, use a local server:
```bash
python3 -m http.server 8000
```
Then visit: `http://localhost:8000/`

## 📂 Project Structure
```
student_app/          # Python Source Code
webversion/           # Web Source (Mobile Responsive)
├── assets/           # Sounds and Icons
├── auth.js           # Supabase Auth Logic
├── db.js             # V6 Sync & Cleanup Engine
└── app.js            # Web UI Logic
index.html            # Main Redirect for GitHub Pages
student_data.db       # Local SQLite Database
CODE_EXPLANATION.txt  # Detailed technical breakdown
README.md             # This guide
```

## 📝 License
This project is open-source and free to use for students worldwide.
By Chenoufi Abderrahmane
