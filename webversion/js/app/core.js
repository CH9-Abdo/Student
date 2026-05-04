// Main App Controller - StudentPro Web V4
let app;
const DAILY_STUDY_REMINDER_NOTIFICATION_ID = 9127;

class StudentProApp {
    constructor() {
        this.currentTab = 'dashboard';
        this.activeSemesterId = null;
        this.activeSubjectId = null;
        this.activePomodoroChapterId = null;
        this.timer = null;
        this.timeLeft = 25 * 60;
        this.timerRunning = false;
        this.selectedLang = 'Arabic';
        this.isOnline = navigator.onLine;
        this._cloudSyncInFlight = null;
        this.themeMode = 'Auto';
        this._themeMediaQuery = null;
        this._themeMediaQueryHandler = null;

        this.init();
    }
}
