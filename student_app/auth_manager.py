import os
import json
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

class AuthManager:
    SESSION_FILE = ".session.json"

    def __init__(self):
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
        except: pass

    def _load_session(self):
        if os.path.exists(self.SESSION_FILE):
            try:
                with open(self.SESSION_FILE, "r") as f:
                    data = json.load(f)
                    # Attempt to resume session
                    response = self.supabase.auth.set_session(data["access_token"], data["refresh_token"])
                    self.user = response.user
            except:
                # If session is invalid, delete the file
                if os.path.exists(self.SESSION_FILE):
                    os.remove(self.SESSION_FILE)

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
            self.user = None
            return True
        except:
            return False

    def get_current_user(self):
        return self.user
