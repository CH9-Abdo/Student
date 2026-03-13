import os
import json
from supabase import create_client, Client
from dotenv import load_dotenv

import sys

def get_resource_path(relative_path):
    """ Get absolute path to resource, works for dev and for PyInstaller """
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

load_dotenv(get_resource_path(".env"))

class OfflineUser:
    def __init__(self, id="local_user", email="offline@studentpro.local"):
        self.id = id
        self.email = email

from student_app.settings import get_app_data_dir

class AuthManager:
    def __init__(self):
        self.SESSION_FILE = os.path.join(get_app_data_dir(), ".session.json")
        self.OFFLINE_MARKER = os.path.join(get_app_data_dir(), ".offline")
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        self.supabase: Client = create_client(url, key)
        self.user = None
        self._load_session()

    def _save_session(self, session):
        try:
            with open(self.SESSION_FILE, "w") as f:
                # We save the access token and refresh token
                json.dump({
                    "access_token": session.access_token,
                    "refresh_token": session.refresh_token
                }, f)
            if os.path.exists(self.OFFLINE_MARKER):
                os.remove(self.OFFLINE_MARKER)
        except: pass

    def _load_session(self):
        if os.path.exists(self.OFFLINE_MARKER):
            self.user = OfflineUser()
            return

        if os.path.exists(self.SESSION_FILE):
            try:
                with open(self.SESSION_FILE, "r") as f:
                    data = json.load(f)
                    # Attempt to resume session
                    response = self.supabase.auth.set_session(data["access_token"], data["refresh_token"])
                    self.user = response.user
            except Exception as e:
                print(f"[Auth] Session resume failed: {e}")
                # If offline or invalid, we don't necessarily delete it if it's just a connection error
                # But for now, let's keep it simple.
                pass

    def work_offline(self):
        self.user = OfflineUser()
        try:
            with open(self.OFFLINE_MARKER, "w") as f:
                f.write("1")
        except: pass
        return self.user

    def sign_up(self, email, password):
        try:
            response = self.supabase.auth.sign_up({"email": email, "password": password})
            self.user = response.user
            if response.session:
                self._save_session(response.session)
            return True, "Success! Check your email for verification."
        except Exception as e:
            return False, str(e)

    def sign_in(self, email, password):
        try:
            response = self.supabase.auth.sign_in_with_password({"email": email, "password": password})
            self.user = response.user
            if response.session:
                self._save_session(response.session)
            return True, self.user
        except Exception as e:
            return False, str(e)

    def sign_out(self):
        try:
            self.supabase.auth.sign_out()
            if os.path.exists(self.SESSION_FILE):
                os.remove(self.SESSION_FILE)
            if os.path.exists(self.OFFLINE_MARKER):
                os.remove(self.OFFLINE_MARKER)
            self.user = None
            return True
        except:
            return False

    def get_current_user(self):
        return self.user
