import json
import os
import sys

def get_app_root():
    """ Get absolute path to resource, works for dev and for PyInstaller """
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS
    return os.getcwd()

CONFIG_FILE = "config.json"
DEFAULT_DB_NAME = "student_data.db"

def load_settings():
    config_path = os.path.join(os.getcwd(), CONFIG_FILE)
    if os.path.exists(config_path):
        try:
            with open(CONFIG_FILE, 'r') as f:
                settings = json.load(f)
                # If path doesn't exist or is invalid, reset to default
                db_p = settings.get("db_path", DEFAULT_DB_NAME)
                if not os.path.isabs(db_p):
                    db_p = os.path.abspath(db_p)
                return settings
        except json.JSONDecodeError:
            pass
            with open(CONFIG_FILE, 'r') as f:
                settings = json.load(f)
                # If path doesn't exist or is invalid, reset to default
                db_p = settings.get("db_path", DEFAULT_DB_NAME)
                if not os.path.isabs(db_p):
                    db_p = os.path.abspath(db_p)
                return settings
        except json.JSONDecodeError:
            pass
    return {"db_path": os.path.abspath(DEFAULT_DB_NAME)}

def save_settings(settings):
    # Keep paths relative in config if possible for portability
    if "db_path" in settings and settings["db_path"].startswith(os.getcwd()):
        settings["db_path"] = os.path.relpath(settings["db_path"], os.getcwd())
    with open(CONFIG_FILE, 'w') as f:
        json.dump(settings, f, indent=4)

def get_db_path():
    settings = load_settings()
    path = settings.get("db_path", DEFAULT_DB_NAME)
    if not os.path.isabs(path):
        path = os.path.abspath(path)
    return path

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
