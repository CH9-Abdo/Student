// Supabase Configuration - Official Web Sync
const SUPABASE_URL = "https://laknjjfkoebbuajfmjmy.supabase.co";
const SUPABASE_KEY = "sb_publishable_xdgVL2vsAZMV733n84RLFA_ocA19RMk";

class AuthManager {
    constructor() {
        this.log("Initializing Supabase...");
        this.client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        this.user = null;
        this.checkSession();
    }

    log(msg) {
        console.log(`[Auth] ${msg}`);
        const debug = document.getElementById('debug-log');
        if (debug) debug.innerHTML += `<div>${msg}</div>`;
    }

    async checkSession() {
        try {
            const { data: { session }, error } = await this.client.auth.getSession();
            if (session) {
                this.log(`Logged in: ${session.user.email}`);
                this.user = session.user;
                this.onAuthSuccess(this.user);
            } else {
                this.log("No session. Showing login.");
                this.showLogin();
            }
        } catch (err) {
            this.log(`Session error: ${err.message}`);
            this.showLogin();
        }
    }

    async signIn(email, password) {
        this.log("Attempting sign in...");
        const { data, error } = await this.client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        this.user = data.user;
        this.log("Sign in successful.");
        this.onAuthSuccess(this.user);
        return data;
    }

    async signUp(email, password) {
        this.log("Creating new account...");
        const { data, error } = await this.client.auth.signUp({ email, password });
        if (error) throw error;
        return data;
    }

    async signOut() {
        this.log("Signing out...");
        await this.client.auth.signOut();
        this.user = null;
        window.location.reload();
    }

    showLogin() {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app').classList.add('hidden');
    }

    onAuthSuccess(user) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        
        // Wait for main App to be ready
        let attempts = 0;
        const checkApp = setInterval(() => {
            attempts++;
            if (window.app && window.app.onLogin) {
                window.app.onLogin(user);
                clearInterval(checkApp);
            } else if (attempts > 20) {
                this.log("Error: App initialization timed out.");
                clearInterval(checkApp);
            }
        }, 100);
    }
}

const auth = new AuthManager();
