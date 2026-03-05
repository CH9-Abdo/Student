// Supabase Configuration - Official Web Sync
const SUPABASE_URL = "https://laknjjfkoebbuajfmjmy.supabase.co";
const SUPABASE_KEY = "sb_publishable_xdgVL2vsAZMV733n84RLFA_ocA19RMk";

class AuthManager {
    constructor() {
        this.log("Initializing Supabase...");
        this.client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        this.user = null;
        this.cachedCredentials = this.loadCachedCredentials();
        this.checkSession();
    }

    log(msg) {
        console.log(`[Auth] ${msg}`);
    }

    // --- OFFLINE CREDENTIALS ---
    loadCachedCredentials() {
        const saved = localStorage.getItem('studentpro_cached_user');
        return saved ? JSON.parse(saved) : null;
    }

    cacheCredentials(email) {
        // Store email for offline login reference (not password!)
        localStorage.setItem('studentpro_cached_email', email);
    }

    async checkSession() {
        // If offline, try cached credentials first
        if (!navigator.onLine) {
            if (this.cachedCredentials) {
                this.log("Offline mode: Using cached credentials");
                this.user = this.cachedCredentials;
                this.onAuthSuccess(this.user);
                return;
            } else {
                this.log("Offline mode: No cached credentials");
                this.showLogin();
                return;
            }
        }

        try {
            const { data: { session }, error } = await this.client.auth.getSession();
            if (session) {
                this.log(`Logged in: ${session.user.email}`);
                this.user = session.user;
                // Cache for offline use
                this.cachedCredentials = session.user;
                localStorage.setItem('studentpro_cached_user', JSON.stringify(session.user));

                // Seamless Reset: Auto-update if we have a pending password from earlier
                const hash = window.location.hash;
                const pendingPass = localStorage.getItem('pending_new_password');
                
                if (hash && hash.includes("type=recovery") && pendingPass) {
                    this.log("Seamless password recovery detected.");
                    try {
                        await this.updatePassword(pendingPass);
                        localStorage.removeItem('pending_new_password');
                        alert("Password updated automatically! Welcome back.");
                    } catch (e) {
                        this.log("Auto-update failed: " + e.message);
                        // Fallback: Show manual update modal if auto-update fails
                        if (window.app && window.app.showModal) window.app.showModal('update-password-modal');
                    }
                } else if (hash && hash.includes("type=recovery")) {
                    // Manual recovery if no pending password found
                    if (window.app && window.app.showModal) window.app.showModal('update-password-modal');
                }

                this.onAuthSuccess(this.user);
            } else {
                this.log("No session. Showing login.");
                this.showLogin();
            }
        } catch (err) {
            this.log(`Session error: ${err.message}`);
            // Try offline fallback
            if (this.cachedCredentials) {
                this.log("Using cached credentials after error");
                this.user = this.cachedCredentials;
                this.onAuthSuccess(this.user);
            } else {
                this.showLogin();
            }
        }
    }

    async signIn(email, password) {
        // Offline check
        if (!navigator.onLine) {
            throw new Error("No internet connection. Please connect to log in.");
        }
        
        this.log("Attempting sign in...");
        const { data, error } = await this.client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        this.user = data.user;
        
        // Cache credentials for offline use
        this.cachedCredentials = data.user;
        localStorage.setItem('studentpro_cached_user', JSON.stringify(data.user));
        this.cacheCredentials(email);
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

    async resetPassword(email) {
        this.log("Requesting password reset...");
        // Use window.location.href to ensure full URL is captured for redirect
        let redirectUrl = window.location.origin + window.location.pathname;
        if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
            this.log("On localhost, using local redirect.");
        } else {
            redirectUrl = "https://ch9-abdo.github.io/Student/webversion/index.html";
        }
        
        const { data, error } = await this.client.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl,
        });
        if (error) throw error;
        return data;
    }

    async updatePassword(newPassword) {
        this.log("Updating password...");
        const { data, error } = await this.client.auth.updateUser({
            password: newPassword
        });
        if (error) throw error;
        return data;
    }

    async verifyOtpForRecovery(email, token, newPassword) {
        this.log("Verifying recovery OTP...");
        const { data, error } = await this.client.auth.verifyOtp({
            email,
            token,
            type: 'recovery'
        });
        if (error) throw error;
        
        // After successful OTP verification, update the password
        return await this.updatePassword(newPassword);
    }

    async signOut() {
        this.log("Signing out...");
        await this.client.auth.signOut();
        this.user = null;
        this.cachedCredentials = null;
        localStorage.removeItem('studentpro_cached_user');
        localStorage.removeItem('studentpro_cached_email');
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
