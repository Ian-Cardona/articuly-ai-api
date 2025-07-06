import { SessionManager } from '../models/session_manager.model.ts';

// Global session manager instance
export const sessionManager = new SessionManager();

// Session monitoring utilities
export class SessionMonitor {
  private static instance: SessionMonitor | undefined;
  private sessionManager: SessionManager;

  private constructor() {
    this.sessionManager = sessionManager;
  }

  static getInstance(): SessionMonitor {
    SessionMonitor.instance ??= new SessionMonitor();
    return SessionMonitor.instance;
  }

  // Get session statistics
  getSessionStats() {
    return {
      totalSessions: this.sessionManager.getSessionCount(),
      activeSessions: this.sessionManager.getActiveSessionCount(),
      allSessions: this.sessionManager.getAllSessionInfo(),
    };
  }

  // Get session info for a specific user
  getUserSessionInfo(userId: string) {
    return this.sessionManager.getSessionInfo(userId);
  }

  // Check if user has active session
  hasUserActiveSession(userId: string): boolean {
    return this.sessionManager.hasActiveSession(userId);
  }

  // Get or create session for user
  getOrCreateUserSession(userId: string) {
    return this.sessionManager.getOrCreateSession(userId);
  }

  // Remove user session
  removeUserSession(userId: string): boolean {
    return this.sessionManager.removeSession(userId);
  }

  // Clean up all sessions (useful for server shutdown)
  cleanupAllSessions(): void {
    this.sessionManager.cleanupAllSessions();
  }

  // Get active sessions with duration
  getActiveSessionsWithDuration() {
    return this.sessionManager.getActiveSessions().map(session => {
      const info = session.getSessionInfo();
      return {
        ...info,
        durationInSeconds: info.duration ? Math.round(info.duration / 1000) : 0,
      };
    });
  }

  // Log session statistics
  logSessionStats(): void {
    const stats = this.getSessionStats();
    console.log('=== Session Statistics ===');
    console.log(`Total Sessions: ${stats.totalSessions}`);
    console.log(`Active Sessions: ${stats.activeSessions}`);

    if (stats.activeSessions > 0) {
      console.log('\nActive Sessions:');
      this.getActiveSessionsWithDuration().forEach(session => {
        console.log(`  - User: ${session.userId}`);
        console.log(`    Exercise: "${session.exerciseConfig?.expectedText}"`);
        console.log(`    Duration: ${session.durationInSeconds}s`);
        console.log(`    Next Word Index: ${session.nextWordToConfirmIndex}`);
      });
    }
    console.log('========================\n');
  }
}

// Export singleton instance
export const sessionMonitor = SessionMonitor.getInstance();
