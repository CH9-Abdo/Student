import json
import os
import sys

def get_app_data_dir():
    """ Get path to persistent app data directory (Local AppData on Windows) """
    if os.name == 'nt':
        app_data = os.getenv('LOCALAPPDATA')
        if not app_data:
            app_data = os.path.expanduser('~\\AppData\\Local')
        path = os.path.join(app_data, 'StudentPro')
    else:
        path = os.path.expanduser('~/.studentpro')
    
    if not os.path.exists(path):
        os.makedirs(path)
    return path

CONFIG_FILE = os.path.join(get_app_data_dir(), "config.json")
DEFAULT_DB_NAME = os.path.join(get_app_data_dir(), "student_data.db")

def get_app_root():
    """ Get absolute path to resource, works for dev and for PyInstaller """
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def load_settings():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                settings = json.load(f)
                return settings
        except (json.JSONDecodeError, IOError):
            pass
    return {"db_path": DEFAULT_DB_NAME}

def save_settings(settings):
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(settings, f, indent=4)
    except IOError as e:
        print(f"Error saving settings: {e}")

def get_db_path():
    settings = load_settings()
    return settings.get("db_path", DEFAULT_DB_NAME)

def set_db_path(path):
    settings = load_settings()
    settings["db_path"] = path # Will be made relative in save_settings if in project root
    save_settings(settings)

def get_language():
    settings = load_settings()
    return settings.get("language", "English")

def set_language(lang):
    settings = load_settings()
    settings["language"] = lang
    save_settings(settings)

def get_theme():
    settings = load_settings()
    return settings.get("theme", "Light")

def set_theme(theme):
    settings = load_settings()
    settings["theme"] = theme
    save_settings(settings)

def get_pomodoro_settings():
    settings = load_settings()
    return {
        "work": settings.get("pomodoro_work", 25),
        "short_break": settings.get("pomodoro_short", 5),
        "long_break": settings.get("pomodoro_long", 15)
    }

def set_pomodoro_settings(work, short, long):
    settings = load_settings()
    settings["pomodoro_work"] = work
    settings["pomodoro_short"] = short
    settings["pomodoro_long"] = long
    save_settings(settings)

def get_sync_mode():
    settings = load_settings()
    return settings.get("sync_mode", "Automatic")

def set_sync_mode(mode):
    settings = load_settings()
    settings["sync_mode"] = mode
    save_settings(settings)
