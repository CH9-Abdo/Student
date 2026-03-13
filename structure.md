# StudentPro Web Version Structure

This document explains the role of every file and directory in the `webversion` folder.

## ?“‚ Root Files

- **`index.html`**: The main entry point of the application. It defines the UI structure (modals, tabs, layout) and loads all CSS and JS files.
- **`manifest.json`**: Progressive Web App (PWA) configuration. Allows the app to be installed on mobile/desktop and defines icons and theme colors.
- **`sw.js`**: Service Worker script. Handles offline caching of assets (HTML, CSS, JS) so the app works without internet.

## ?“‚ `js/` - Application Logic

- **`app.js`**: The main controller. Handles tab switching, modal management, language application, and global event listeners.
- **`auth.js`**: Authentication manager. Connects to Supabase Auth, handles Login/Signup, session persistence, and offline guest mode.
- **`config.js`**: Security and environment configuration. Contains the Supabase URL and API keys.
- **`analytics.js`**: Logic for the Analytics tab. Calculates progress percentages and renders study history charts.
- **`dashboard.js`**: Logic for the Home/Dashboard tab. Handles greetings, summary stats, and quick-access items.
- **`planner.js`**: Logic for the Study Planner. Manages semester selection, subject cards, and exam countdowns.
- **`pomodoro.js`**: Logic for the Pomodoro Timer. Handles the countdown, SVG progress ring, and session completion rewards (+50 XP).
- **`leaderboard.js`**: Logic for global rankings. Fetches data from the cloud and merges it with live local progress.
- **`templates.js`**: Contains pre-defined study structures (e.g., Computer Science years) for the onboarding process.
- **`translations.js`**: Multi-language support. Contains all text strings for English, Arabic, and French.
- **`utils.js`**: Small helper functions (e.g., the `get()` alias for `document.getElementById`).

## ?“‚ `js/db/` - Modular Database Engine

- **`core.js`**: Base `Database` class. Handles `localStorage` loading/saving and offline deletion tracking.
- **`actions.js`**: All CRUD operations. Functions to add/delete/update semesters, subjects, chapters, and sessions.
- **`getters.js`**: Data retrieval logic. Computes stats like study streaks, todo lists, and leaderboard rankings.
- **`sync.js`**: Cloud synchronization. Handles the incremental offline queue, ID bridging, and Supabase communication.
- **`init.js`**: Initialization script. Creates the global `db` instance used by the rest of the app.

## ?“‚ `css/` - Styling

- **`main.css`**: Core variables, layout, typography, and theme definitions (Light/Dark).
- **`auth.css`**: Styles specifically for the login and signup screens.
- **`dashboard.css`**: Layout for the home screen and statistic cards.
- **`planner.css`**: Styles for subject cards, progress rings, and the subject manager modal.
- **`pomodoro.css`**: Styles for the timer, focus modes, and the circular progress animation.
- **`responsive.css`**: Media queries ensuring the app looks good on Mobile, Tablet, and Desktop.

## ?“‚ `assets/` - Static Files

- **`sounds/`**: Audio files for timer starts, breaks, and session completion alerts.
- **`vendor/`**: Third-party libraries including `supabase.js`, `chart.js`, and `FontAwesome` (icons).
- **`webfonts/`**: Font files used by the FontAwesome icon library.
