class AuthManager {
    constructor() {
        this.supabaseUrl = window.SUPABASE_URL;
        this.supabaseKey = window.SUPABASE_KEY;
        
        if (!this.supabaseUrl || !this.supabaseKey) {
            console.error("[Auth] CRITICAL: Supabase credentials not found in config.js");
            return;
        }

        this.log("Initializing Supabase...");
        this.client = supabase.createClient(this.supabaseUrl, this.supabaseKey);
        this.user = null;
        this.cachedCredentials = this.loadCachedCredentials();
        this.isCapacitor = typeof Capacitor !== 'undefined';
        this.initNetwork();
        this.checkSession();
    }

    async initNetwork() {
        if (this.isCapacitor) {
            try {
                // Use Capacitor global instead of dynamic import for non-bundled environments
                const Network = (typeof Capacitor !== 'undefined' && Capacitor.Plugins) ? Capacitor.Plugins.Network : null;
                if (Network) {
                    Network.addListener('networkStatusChange', status => {
                        this.log(`Network status changed: ${status.connected ? 'Online' : 'Offline'}`);
                        if (window.app) {
                            if (status.connected) window.app.onConnectionRestored();
                            else window.app.showOfflineIndicator();
                        }
                    });
                }
            } catch (e) {
                this.log("Capacitor Network plugin initialization failed: " + e.message);
            }
        }
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

    async workOffline() {
        this.log("Starting offline session...");
        const offlineUser = this.cachedCredentials || {
            id: 'offline-user',
            email: 'offline@studentpro.local',
            user_metadata: { display_name: 'Offline Student' }
        };
        this.user = offlineUser;
        localStorage.setItem('studentpro_cached_user', JSON.stringify(offlineUser));
        this.onAuthSuccess(this.user);
        return offlineUser;
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
                this.log("Offline mode: Auto-entering guest mode");
                this.workOffline();
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

                this.onAuthSuccess(this.user);
            } else {
                this.log("No session. Entering offline mode by default.");
                this.workOffline();
            }
        } catch (err) {
            this.log(`Session error: ${err.message}`);
            this.workOffline();
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
        
        // Hide login screen after success
        document.getElementById('login-screen').classList.add('hidden');
        
        this.onAuthSuccess(this.user);
        return data;
    }

    async signUp(email, password) {
        this.log("Creating new account...");
        const { data, error } = await this.client.auth.signUp({ email, password });
        if (error) throw error;
        
        // If signup is successful and auto-logs in
        if (data.session) {
            this.user = data.user;
            this.cachedCredentials = data.user;
            localStorage.setItem('studentpro_cached_user', JSON.stringify(data.user));
            document.getElementById('login-screen').classList.add('hidden');
            this.onAuthSuccess(this.user);
        }
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
        // Check if actually logged into Supabase
        if (navigator.onLine && this.user && this.user.id !== 'offline-user') {
            try {
                await this.client.auth.signOut();
            } catch (e) { this.log("Sign out error: " + e.message); }
        }
        this.user = null;
        this.cachedCredentials = null;
        localStorage.removeItem('studentpro_cached_user');
        localStorage.removeItem('studentpro_cached_email');
        window.location.reload();
    }

    showLogin(mode = 'login') {
        const screen = document.getElementById('login-screen');
        if (!screen) return;
        
        screen.classList.remove('hidden');
        
        // Toggle tabs based on mode
        if (mode === 'signup') {
            document.getElementById('tab-signup')?.click();
        } else {
            document.getElementById('tab-login')?.click();
        }

        // Help Android Autofill / password managers by prefilling the last used email.
        const cachedEmail = localStorage.getItem('studentpro_cached_email');
        const emailInput = document.getElementById('login-email');
        if (emailInput && cachedEmail && !emailInput.value) {
            emailInput.value = cachedEmail;
        }
    }

    onAuthSuccess(user) {
        // Only hide if login screen was visible
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) loginScreen.classList.add('hidden');
        
        const appShell = document.getElementById('app');
        if (appShell) appShell.classList.remove('hidden');
        
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
