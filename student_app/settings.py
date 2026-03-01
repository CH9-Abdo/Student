import json
import os

CONFIG_FILE = "config.json"
DEFAULT_DB_NAME = "student_data.db"

def load_settings():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError:
            pass
    return {"db_path": os.path.abspath(DEFAULT_DB_NAME)}

def save_settings(settings):
    with open(CONFIG_FILE, 'w') as f:
        json.dump(settings, f, indent=4)

def get_db_path():
    settings = load_settings()
    return settings.get("db_path", os.path.abspath(DEFAULT_DB_NAME))

def set_db_path(path):
    settings = load_settings()
    settings["db_path"] = os.path.abspath(path)
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
