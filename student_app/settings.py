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
